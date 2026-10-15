/* ===== 07_combat.js — 전투 엔진: 상태 생성·DSL 해석·피해 파이프라인·적 턴·미리보기 (DOM·시간·Math.random 없음) ===== */
// 계약서 §4(DSL)·§5(Combat)·§9(훅)가 정본. 아래는 계약서와 다르게 정한 것(§13에 같은 내용을 적었다).
//  - 진형 감소는 「적 턴이 끝난 뒤, 상태 경과 직전」에 한다(적의 공격을 진형으로 받아야 하므로). 철벽·wallPersist·blockKeep 은 이때 본다.
//  - 턴 시작 순서: 턴 상한 → 조류 → 군령 산정 → 보류 버프 → onTurnStart 훅 → 고개(blockPerTurn) → delayed → 뽑기 → 승리 판정.
//    (훅의 「군령 +1」이 군령 재설정에 덮이지 않게 군령을 먼저 정한다.)
//  - 적 진형은 적 턴 시작에 0이 된다(적의 「밀집」은 플레이어 턴 동안 그 적을 지킨다).
//  - 원균 대행(mods.wonGyun)은 부장이 아니라 「주장 패시브」를 끈다(원균이 이순신 자리에 섰다).
//  - 왜 척후의 신호는 enemySignalNext 에 쌓였다가 다음 적 턴에 enemySignal 로 옮겨 그 턴 공격에 더해진다.
//  - 의도 진행(intentIdx++)은 그 적이 행동한 직후에 한다(새로 나온 적이 첫 의도를 건너뛰지 않게).
// TODO(통합): UI 는 Combat.intentPreview(st) 를 상태가 바뀔 때마다 다시 불러야 한다(앞 적의 접근·기세가 반영된 순차 값).
var Combat = (function () { 'use strict';

  var B = Core.BAL;
  var DISTK = ['far', 'near', 'close'];
  var TURN_STATUS = { shaken: 1, exposed: 1, hunger: 1, ironwall: 1, stun: 1 };
  var RUN_OPS = { upgrade: 1, relic: 1, score: 1, battle: 1, recruit: 1, ending: 1, offer: 1 };
  var EPS = 1e-9;

  /* ================================================================ 작은 도우미 */
  function T() { return (typeof TXT !== 'undefined') ? TXT : null; }
  function L(key) {
    var args = Array.prototype.slice.call(arguments, 1), X = T();
    if (X && X.log && typeof X.log[key] === 'function') { try { return X.log[key].apply(null, args); } catch (e) { /* 문장 실패는 로그만 비게 */ } }
    return '';
  }
  function bannerText(key) { var X = T(); return (X && X.banner && X.banner[key]) || ''; }
  function emit(st, kind, p) { if (st.dryRun) return; var o = p || {}; o.kind = kind; Core.bus.emit('fx', o); }
  function log(st, s) {
    if (st.dryRun || !s) return;
    st.log.push(s); if (st.log.length > 80) st.log.splice(0, st.log.length - 80);
    emit(st, 'log', { text: s });
  }
  function inList(v, x) { return Array.isArray(v) ? v.indexOf(x) >= 0 : v === x; }
  function range(o, x) {
    if (o === null || o === undefined) return true;
    if (typeof o === 'number') return x === o;
    if (o.lte != null && x > o.lte) return false;
    if (o.gte != null && x < o.gte) return false;
    if (o.lt != null && x >= o.lt) return false;
    if (o.gt != null && x <= o.gt) return false;
    return true;
  }
  function fl(v) { return Math.floor(v + EPS); }
  function uids(arr) { return arr.map(function (i) { return i.uid; }); }
  function idxByUid(arr, uid) { for (var i = 0; i < arr.length; i++) if (arr[i].uid === uid) return i; return -1; }

  /* ================================================================ 카드 */
  function cardDef(id) { return CARDS.get(id); }
  // 강화 여부를 반영한 실제 값
  function eff(inst) {
    var c = cardDef(inst.id), p = (inst.up && c.plus) ? c.plus : {};
    return {
      card: c, ops: p.ops || c.ops || [], onDraw: p.onDraw || c.onDraw || null,
      cost: (p.cost != null ? p.cost : c.cost), costIf: p.costIf || c.costIf || null,
      exhaust: (p.exhaust != null ? !!p.exhaust : !!c.exhaust), retain: (p.retain != null ? !!p.retain : !!c.retain),
      ration: (p.ration != null ? p.ration : (c.ration || 0))
    };
  }
  function mkInst(st, id, up, generated) {
    return { uid: Core.nextUid(st), id: id, up: !!up, generated: !!generated, marked: false, tmpCost: null };
  }
  function isCharge(card) { return !!(card.tags && card.tags[0] === 'charge'); }
  function opsNeedTarget(ops) {
    for (var i = 0; i < (ops || []).length; i++) {
      var o = ops[i];
      if (!o) continue;
      if (o.op === 'dmg' && !o.all && (!o.who || o.who === 'target')) return true;
      if (o.op === 'status' && o.who === 'target') return true;
      if ((o.op === 'stun' || o.op === 'stripBlock') && (!o.who || o.who === 'target')) return true;
      if (o.op === 'cond' && (opsNeedTarget(o.then) || opsNeedTarget(o.else))) return true;
      if (o.op === 'exhaustHand' && opsNeedTarget(o.perCard)) return true;
    }
    return false;
  }

  /* ================================================================ 적 */
  function alive(st) { var r = []; for (var i = 0; i < st.enemies.length; i++) if (!st.enemies[i].dead) r.push(i); return r; }
  function firstAlive(st) { for (var i = 0; i < st.enemies.length; i++) if (!st.enemies[i].dead) return i; return -1; }
  function resolveTarget(st, ctx) {
    var t = ctx ? ctx.targetIdx : null;
    if (t != null && st.enemies[t] && !st.enemies[t].dead) return t;
    return firstAlive(st);
  }
  function prepEnemy(st, inst) {
    inst.uid = Core.nextUid(st);
    var m = st.mods;
    if (m.bossHp && m.bossHp[inst.id] != null) { inst.hp = inst.maxHp = m.bossHp[inst.id]; }
    if (m.bossHpDelta && m.bossHpDelta[inst.id] != null) { inst.maxHp = Math.max(1, inst.maxHp + m.bossHpDelta[inst.id]); inst.hp = inst.maxHp; }
    if (m.enemyHpPct) { inst.maxHp = Math.max(1, fl(inst.maxHp * (1 + m.enemyHpPct))); inst.hp = inst.maxHp; }
    return inst;
  }
  function curIntent(en) { return en.intents.length ? en.intents[en.intentIdx % en.intents.length] : null; }
  function resolveIntent(st, i) {
    var en = st.enemies[i], it = curIntent(en);
    if (!it) return { kind: 'none', text: '' };
    var r = {}; for (var k in it) r[k] = it[k];
    if (r.kind === 'atk' && r.alt && evalCond(st, r.alt.if, { enemyIdx: i })) {
      r.n = r.alt.n; r.tag = r.alt.tag; if (r.alt.text) r.text = r.alt.text;
    }
    return r;
  }
  function advanceIntent(en) { if (en.intents.length) en.intentIdx = (en.intentIdx + 1) % en.intents.length; }
  // 의도 표식 키: 'load'(장전) · 'fire'(조총 사격) · 'pierce'(관통). UI 는 키로 그림을 고른다.
  function markOf(it) {
    if (!it) return null;
    if (it.kind === 'load') return 'load';
    if (it.kind === 'atk' && it.tag === 'gun') return 'fire';
    if (it.kind === 'atk' && it.pierce) return 'pierce';
    return null;
  }

  /* ================================================================ 상태·버프·mod */
  function pst(st, id) { return st.player.status[id] || 0; }
  function hasBuff(st, id) { var b = st.player.buffs; for (var i = 0; i < b.length; i++) if (b[i].id === id) return true; return false; }
  function buffSum(st, id) { var s = 0, b = st.player.buffs; for (var i = 0; i < b.length; i++) if (b[i].id === id) s += (b[i].n || 0); return s; }
  function buffMax(st, id) { var s = 0, b = st.player.buffs; for (var i = 0; i < b.length; i++) if (b[i].id === id && b[i].n > s) s = b[i].n; return s; }
  function removeBuffs(st, id) { st.player.buffs = st.player.buffs.filter(function (b) { return b.id !== id; }); }
  function srcOff(st, src) { return !!src && (src.kind === 'deputy' || src.kind === 'special') && hasBuff(st, 'passivesOff'); }
  function modActive(st, m, ctx) {
    if (srcOff(st, m.src)) return false;
    if (m.once && m.used) return false;
    if (m.if && !evalCond(st, m.if, ctx || {})) return false;
    return true;
  }
  function modSum(st, mod, ctx) {
    var s = 0; for (var i = 0; i < st.mods_.length; i++) { var m = st.mods_[i]; if (m.mod === mod && modActive(st, m, ctx)) s += m.n; } return s;
  }
  function modMax(st, mod, ctx) {
    var s = 0; for (var i = 0; i < st.mods_.length; i++) { var m = st.mods_[i]; if (m.mod === mod && modActive(st, m, ctx) && m.n > s) s = m.n; } return s;
  }
  function addHandler(st, h, src) {
    st.handlers.push({ hook: h.hook, cond: h.cond ? Core.clone(h.cond) : null, ops: Core.clone(h.ops || []), once: h.once || null,
      src: src, usedBattle: false, usedTurn: false });
  }
  function addMod(st, m, src) {
    st.mods_.push({ mod: m.mod, n: m.n, if: m.if ? Core.clone(m.if) : null, once: m.once || null, src: src, used: false });
  }

  /* ================================================================ 조건 (§3.1) */
  function hpPct(st) { return st.player.maxHp > 0 ? Math.floor(st.player.hp * 100 / st.player.maxHp) : 0; }
  function allPiles(st) {
    var r = st.draw.concat(st.hand, st.discard, st.exhaust);
    if (st.playing) r.push(st.playing);
    return r;
  }
  function countTag(st, tag) {
    var n = 0, a = allPiles(st);
    for (var i = 0; i < a.length; i++) if ((cardDef(a[i].id).tags || []).indexOf(tag) >= 0) n++;
    return n;
  }
  function condKey(st, k, v, ctx) {
    var card = ctx.card || null, inst = ctx.inst || null;
    var en = (ctx.enemyIdx != null && st.enemies[ctx.enemyIdx]) ? st.enemies[ctx.enemyIdx] : null;
    switch (k) {
      case 'dist': return inList(v, st.dist);
      case 'distNot': return Array.isArray(v) ? v.indexOf(st.dist) < 0 : st.dist !== v;
      case 'hpPct': return range(v, hpPct(st));
      case 'naval': case 'siege': case 'assault': case 'field': return (st.type === k) === !!v;
      case 'turn': return inList(v, st.turn);
      case 'turnLte': return st.turn <= v;
      case 'hasWall': return (st.player.wall > 0) === !!v;
      case 'tide': return !!st.tide && st.tide.phase === v;
      case 'wave': return inList(v, st.wave);
      case 'cardTag': return !!card && (card.tags || []).some(function (t) { return inList(v, t); });
      case 'cardType': return !!card && inList(v, card.type);
      case 'cardPool': return !!card && inList(v, card.pool);
      case 'cardId': return !!card && inList(v, card.id);
      case 'cardMarked': return !!inst && (!!inst.marked) === !!v;
      case 'enemyId': return !!en && inList(v, en.id);
      case 'enemyTag': return !!en && en.tags.some(function (t) { return inList(v, t); });
      case 'handCount': return range(v, st.hand.length);
      case 'cardsPlayedThisTurn': return range(v, st.cardsPlayedThisTurn);
      case 'deckTagCount': return range(v, countTag(st, v.tag));
      case 'hasCard': return allPiles(st).some(function (x) { return x.id === v; });
      case 'hasRelic': return st.relics.indexOf(v) >= 0;
      case 'hasDeputy': return st.player.deputies.indexOf(v) >= 0 || st.player.special === v;
      case 'noDeputy': return st.player.deputies.indexOf(v) < 0 && st.player.special !== v;
      case 'flag':
        for (var fk in v) {
          if (!Object.prototype.hasOwnProperty.call(v, fk)) continue;
          var cur = st.flags[fk]; if (cur === undefined || cur === null) cur = false;
          var want = v[fk];
          if (want === false ? !!cur : cur !== want) return false;
        }
        return true;
      case 'leader': return inList(v, st.player.leader);
      case 'act': return inList(v, st.act);
      case 'actGte': return st.act >= v;
      case 'lane': return inList(v, st.flags.lane2);
      case 'ration': return range(v, st.ration);
      case 'suspicion': return range(v, st.suspicion);
      case 'slotsFree': return true;
      case 'oncePerBattle': return !v || !ctx.handler || !ctx.handler.usedBattle;
      case 'oncePerTurn': return !v || !ctx.handler || !ctx.handler.usedTurn;
      default: return false;
    }
  }
  function evalCond(st, c, ctx) {
    if (!c) return true;
    ctx = ctx || {};
    for (var k in c) {
      if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
      if (!condKey(st, k, c[k], ctx)) return false;
    }
    return true;
  }

  /* ================================================================ 훅 */
  function fire(st, hook, ctx) {
    ctx = ctx || {};
    var hs = st.handlers.slice();
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.hook !== hook) continue;
      if (st.phase === 'done' && hook !== 'onBattleEnd') return;
      if (st.handlers.indexOf(h) < 0) continue;             // 도중에 빠진 부장
      if (srcOff(st, h.src)) continue;
      if (h.once === 'battle' && h.usedBattle) continue;
      if (h.once === 'turn' && h.usedTurn) continue;
      if (hook === 'onCardDrawn' && st.drawHooksThisTurn >= B.DRAW_HOOK_CAP) continue;
      var c2 = {}; for (var k in ctx) c2[k] = ctx[k];
      c2.handler = h; c2.fromCard = false; c2.canSuspend = false;
      if (h.cond && !evalCond(st, h.cond, c2)) continue;
      h.usedBattle = true; h.usedTurn = true;
      if (hook === 'onCardDrawn') st.drawHooksThisTurn++;
      runSync(st, h.ops, c2);
    }
  }

  /* ================================================================ 거리 (§5.3) */
  function setDist(st, to, why) {
    to = Core.clamp(to, 0, 2);
    var from = st.dist;
    if (to === from) return false;
    st.dist = to;
    if (why === 'push') st.stats.pushes++;
    emit(st, 'push', { from: from, to: to, why: why || null });
    log(st, L('push', from, to));
    if (to > from && pst(st, 'ambush') > 0) {                 // 매복: 적이 근접 쪽으로 오면 터진다
      var n = pst(st, 'ambush'); st.player.status.ambush = 0;
      log(st, L('ambush', n));
      alive(st).forEach(function (i) { hitEnemy(st, i, n, false, 'none', {}); });
    }
    fire(st, 'onDistanceChange', { from: from, to: to });
    return true;
  }
  function push(st, n) {
    if (st.dist === 0) return;
    if (hasBuff(st, 'noPushBattle') || st.mods.noPush) { log(st, '배수진 — 물러설 곳이 없다.'); return; }
    var al = alive(st);
    for (var i = 0; i < al.length; i++) {
      var en = st.enemies[al[i]];
      if (en.resist > 0) { en.resist--; emit(st, 'resist', { enemyIdx: al[i] }); log(st, L('resist', en.name)); return; }
    }
    if (st.mods.pushMax != null) n = Math.min(n, st.mods.pushMax);
    if (st.tide) n += (st.tide.phase === 'flow') ? B.TIDE.flowPush : B.TIDE.ebbPush;
    if (n <= 0) return;
    setDist(st, st.dist - n, 'push');
  }
  function pull(st, n) { if (n > 0) setDist(st, st.dist + n, 'pull'); }
  function advance(st) {
    if (st.noAdvanceLeft > 0) { st.noAdvanceLeft--; return; }
    if (hasBuff(st, 'noAdvance')) return;
    var rule = 'never', step = 1;
    alive(st).forEach(function (i) {
      var e = st.enemies[i];
      if (e.advance === 'always') { if (rule !== 'always') { rule = 'always'; step = e.step || 1; } else step = Math.max(step, e.step || 1); }
      else if (e.advance === 'stopAtNear' && rule === 'never') rule = 'stopAtNear';
    });
    if (rule === 'never') return;
    if (st.tide && st.tide.phase === 'ebb') step = Math.max(step, B.TIDE.ebbStep);
    var to = (rule === 'always') ? Math.min(2, st.dist + step) : (st.dist < 1 ? 1 : st.dist);
    if (to !== st.dist) {
      setDist(st, to, 'advance');
      emit(st, 'advance', { dist: st.dist });
      log(st, L('advance', st.dist));
    }
  }

  /* ================================================================ 피해: 아군 → 적 (§5.5) */
  function homeMatch(st, ctx) { return !!(ctx && ctx.fromCard && ctx.card && ctx.card.home && ctx.card.home === st.do); }
  function opBase(st, op) {
    var n = op.n || 0, d = DISTK[st.dist];
    if (op.perCardsPlayed) n += op.perCardsPlayed * st.cardsPlayedThisTurn;
    if (op.perHandCard) n += op.perHandCard.n * st.hand.filter(function (h) { return h.id === op.perHandCard.id; }).length;
    if (op.bonusAt && op.bonusAt[d]) n += op.bonusAt[d];
    if (op.bonusIf && op.bonusIf[st.type]) n += op.bonusIf[st.type];
    return n;
  }
  // 한 op 에 한 번만 계산하는 평가산(북·기세·mod). 북(nextAtk)은 카드 공격이 처음 쓸 때 소모된다.
  function flatBonus(st, op, ctx, notes) {
    var tag = op.tag || 'none', add = 0, x;
    x = modSum(st, 'dmgBonus', ctx); if (x) { add += x; notes.push('+' + x); }
    if (ctx.fromCard && hasBuff(st, 'nextAtk')) { x = buffSum(st, 'nextAtk'); removeBuffs(st, 'nextAtk'); add += x; notes.push('북 +' + x); }
    x = buffSum(st, 'atkAdd'); if (x) { add += x; notes.push('+' + x); }
    if (tag === 'shot') { x = buffSum(st, 'shotAdd'); if (x) { add += x; notes.push('사격 +' + x); } }
    x = pst(st, 'momentum'); if (x) { add += x; notes.push('기세 +' + x); }
    return add;
  }
  function pctBonus(st, op, ctx) {
    var p = modSum(st, 'atkPct', ctx) + buffSum(st, 'atkPct');
    if ((op.tag || 'none') === 'shot') p += buffSum(st, 'shotPct');
    return p;
  }
  function hitValue(st, op, ti, ctx, flat, pct, notes) {
    var en = st.enemies[ti], d = st.dist, tag = op.tag || 'none', v = opBase(st, op) + flat;
    if (op.mulAt && op.mulAt[DISTK[d]]) { v *= op.mulAt[DISTK[d]]; if (notes) notes.push(TXT_DIST(d) + ' ×' + op.mulAt[DISTK[d]]); }
    var mul = (B.MULT[tag] || B.MULT.none)[d];
    if (mul !== 1) { v *= mul; if (notes) notes.push(TXT_DIST(d) + ' ×' + mul); }
    if (tag === 'shot' && d === 0 && !op.pierce && en.passive && en.passive.shotPctAtFar) v *= 1 + en.passive.shotPctAtFar;
    if (homeMatch(st, ctx)) { v *= B.HOME_BONUS; if (notes) notes.push(ctx.card.home + ' ×' + B.HOME_BONUS); }
    if (pct) { v *= 1 + pct; if (notes) notes.push((pct > 0 ? '+' : '') + Math.round(pct * 100) + '%'); }
    if (pst(st, 'shaken') > 0) v *= 1 - B.SHAKEN_PCT;
    if ((en.status.exposed || 0) > 0) v *= 1 + B.EXPOSED_PCT;
    return Math.max(1, fl(v));
  }
  function TXT_DIST(d) { var X = T(); return (X && X.dist && X.dist[d]) || DISTK[d]; }
  function killEnemy(st, ti) {
    var en = st.enemies[ti];
    if (en.dead) return;
    en.hp = Math.min(en.hp, 0); en.dead = true;
    st.stats.enemiesKilled++;
    emit(st, 'enemyDeath', { enemyIdx: ti, id: en.id, fled: false });
    log(st, en.tags.indexOf('ship') >= 0 ? L('sunk', en.name) : L('dead', en.name));
    fire(st, 'onEnemyDeath', { enemyIdx: ti, enemy: en });
  }
  function hitEnemy(st, ti, value, pierce, tag, ctx) {
    var en = st.enemies[ti];
    if (!en || en.dead) return 0;
    var rest = value;
    if (!pierce) {
      var b = Math.min(en.block, rest); en.block -= b; rest -= b;
      if (st.enemyWall > 0 && rest > 0) { var w = Math.min(st.enemyWall, rest); st.enemyWall -= w; rest -= w; emit(st, 'enemyWall', { after: st.enemyWall }); }
    }
    en.hp -= rest;
    if (!st.dryRun) st.stats.dmgDealt += rest;
    emit(st, 'hit', { enemyIdx: ti, n: rest, pierce: !!pierce, hpAfter: Math.max(0, en.hp), blockAfter: en.block, dead: en.hp <= 0, tag: tag || 'none' });
    log(st, L('hit', en.name, rest, !!pierce));
    fire(st, 'onDamageDealt', { n: rest, enemyIdx: ti, card: ctx ? ctx.card : null });
    if (en.hp <= 0) killEnemy(st, ti);
    return rest;
  }
  function opDmg(st, op, ctx) {
    var tag = op.tag || 'none';
    if (tag === 'charge') pull(st, 2);                       // 돌격: 먼저 근접으로
    if (st.phase === 'done') return 'dead';
    var targets;
    if (op.all || op.who === 'all') targets = alive(st);
    else if (op.who === 'random') { var a = alive(st); targets = a.length ? [Core.pick(st.rng, a)] : []; }
    else if (op.who === 'spawned') targets = (ctx.enemyIdx != null && st.enemies[ctx.enemyIdx] && !st.enemies[ctx.enemyIdx].dead) ? [ctx.enemyIdx] : [];
    else if (op.who === 'enemy') targets = alive(st).filter(function (i) { return inList(op.enemyId, st.enemies[i].id); });
    else { var t = resolveTarget(st, ctx); targets = t < 0 ? [] : [t]; }
    if (!targets.length) return 'ok';
    var notes = [], flat = flatBonus(st, op, ctx, notes), pct = pctBonus(st, op, ctx), times = op.times || 1, first = null;
    for (var k = 0; k < times; k++) {
      for (var j = 0; j < targets.length; j++) {
        var ti = targets[j];
        if (st.enemies[ti].dead) continue;                     // 죽은 대상의 남은 타수는 버린다
        var v = hitValue(st, op, ti, ctx, flat, pct, first === null ? notes : null);
        if (first === null) first = v;
        hitEnemy(st, ti, v, !!op.pierce, tag, ctx);
        if (st.phase === 'done') return 'dead';
      }
    }
    if (st.__lines && ctx.fromCard) {
      st.__lines.push({ label: '피해' + (op.all ? '(전체)' : '') + (times > 1 ? ' ×' + times : ''), base: opBase(st, op), final: first, note: notes.join(' · ') });
    }
    return 'ok';
  }

  /* ================================================================ 피해: 적 → 아군 (§5.5) */
  function checkHp(st, canSuspend) {
    if (st.player.hp > 0) return 'ok';
    fire(st, 'onHpZero', {});
    if (st.player.hp > 0) return 'ok';
    var deps = st.player.deputies.slice();
    if (st.rescue.disabled || st.rescue.used || st.flags.rescuedUsed || !deps.length) { lose(st); return 'dead'; }
    if (deps.length === 1 || !canSuspend || st.dryRun) { applyRescue(st, deps[0]); return 'ok'; }
    st.phase = 'rescue'; st.rescue.pending = deps;
    return 'suspend';
  }
  function applyRescue(st, id) {
    removeDeputy(st, id, 'rescue');
    st.player.hp = Math.min(st.player.maxHp, B.RESCUE_HP);
    st.rescue.used = true; st.rescue.pending = null;
    st.expect = null;                                         // 구출 뒤로는 의도 대조를 멈춘다
    var name = GENERALS.deputies.byId[id] ? GENERALS.deputies.byId[id].name : id;
    var X = T(), text = (X && X.rescue) ? X.rescue(name) : name;
    emit(st, 'rescue', { deputyId: id, text: text, hpAfter: st.player.hp });
    log(st, text);
  }
  function enemyAttack(st, ei, it) {
    var en = st.enemies[ei], tag = it.tag || 'melee', P = st.player;
    var v = (it.n || 0) + (en.dmgAdd || 0) + (en.status.momentum || 0) + (st.enemySignal || 0);
    v *= (B.MULT['e_' + tag] || B.MULT.e_bow)[st.dist];
    if (tag === 'gun' && st.mods.enemyGunPct) v *= 1 + st.mods.enemyGunPct;
    if ((en.status.shaken || 0) > 0) v *= 1 - B.SHAKEN_PCT;
    if ((en.status.flinch || 0) > 0) { v *= 1 - B.FLINCH_PCT; en.status.flinch--; }
    if (tag === 'gun' || tag === 'bow') { var h = buffMax(st, 'hide'); if (h) v *= 1 - h; }
    if (tag === 'melee' && hasBuff(st, 'noMelee')) v = 0;
    if (v > 0 && hasBuff(st, 'evadeFirst')) { v = 0; removeBuffs(st, 'evadeFirst'); log(st, '붉은 옷이 번뜩였다. 첫 칼을 피했다.'); }
    v = Math.max(0, fl(v));
    var raw = v, through = fl(v * (it.pierce || 0)), rest = v - through;
    var b = Math.min(P.block, rest); P.block -= b; rest -= b;
    var w = 0; if (!it.ignoreWall) { w = Math.min(P.wall, rest); P.wall -= w; rest -= w; }
    var loss = through + rest;
    if (hasBuff(st, 'minHp1')) P.hp = Math.max(Math.min(P.hp, 1), P.hp - loss); else P.hp -= loss;
    if (!st.dryRun) {
      st.stats.dmgTaken += loss;
      if (st.expect) { var e = st.expect[st.expectIdx++]; if (e === loss) st.stats.intentChecks.ok++; else st.stats.intentChecks.bad++; }
    }
    emit(st, 'playerHit', { n: loss, blocked: b + w, hpAfter: P.hp, blockAfter: P.block, wallAfter: P.wall, source: en.name, tag: tag, pierce: !!it.pierce, enemyIdx: ei });
    log(st, (b + w > 0 ? L('blocked', b + w) + ' ' : '') + L('playerHit', loss, en.name));
    fire(st, 'onDamageTaken', { n: loss, enemyIdx: ei });
    return { loss: loss, raw: raw, res: checkHp(st, true) };
  }

  /* ================================================================ 적 행동 */
  function spawn(st, id, waveNo, cap) {
    if (alive(st).length >= B.ENEMY_MAX) return -1;
    if (cap != null && (st.spawned[id] || 0) >= cap) return -1;
    var inst = prepEnemy(st, ENEMIES.makeInst(id, st.act, { wave: waveNo }));
    st.enemies.push(inst);
    var idx = st.enemies.length - 1;
    st.spawned[id] = (st.spawned[id] || 0) + 1;
    emit(st, 'spawn', { enemyIdx: idx, id: id, hp: inst.hp, maxHp: inst.maxHp, wave: waveNo });
    log(st, L('spawn', inst.name));
    fire(st, 'onEnemySpawn', { enemyIdx: idx, enemy: inst });
    return idx;
  }
  function enemyAct(st, i) {
    var en = st.enemies[i];
    if (!en || en.dead) return 'ok';
    var rec = st.__rec || null;
    if ((en.status.hunger || 0) > 0) {
      var hn = en.status.hunger; en.hp -= hn;
      emit(st, 'hit', { enemyIdx: i, n: hn, pierce: true, hpAfter: Math.max(0, en.hp), blockAfter: en.block, dead: en.hp <= 0, tag: 'hunger' });
      log(st, L('starve', en.name, hn));
      if (en.hp <= 0) { killEnemy(st, i); return st.phase === 'done' ? 'dead' : 'ok'; }
    }
    if ((en.status.stun || 0) > 0) {
      log(st, L('stunned', en.name));
      if (rec) rec.push({ enemyIdx: i, kind: 'stun', text: '정지', dmg: null, raw: null, pierce: false, nextDist: st.dist, mark: null });
      advanceIntent(en);
      return 'ok';
    }
    var it = resolveIntent(st, i), kind = it.kind, res = 'ok', dmg = null, raw = null, replaced = false;
    emit(st, 'enemyAct', { enemyIdx: i, intent: it });
    switch (kind) {
      case 'atk':
        if (it.pullFirst) pull(st, it.pullFirst);
        if (st.phase === 'done') return 'dead';
        if ((it.tag || 'melee') === 'melee' && st.dist === 0) { pull(st, 1); kind = 'approach'; log(st, en.name + ' — 접근.'); break; }
        var r = enemyAttack(st, i, it); dmg = r.loss; raw = r.raw; res = r.res;
        if (en.status.loaded) en.status.loaded = 0;
        break;
      case 'approach': pull(st, 1); break;
      case 'pull': pull(st, it.n || 1); break;
      case 'block': en.block += it.n || 0; emit(st, 'enemyBlock', { enemyIdx: i, after: en.block }); break;
      case 'load': en.status.loaded = 1; emit(st, 'load', { enemyIdx: i }); break;
      case 'rally':
        (it.who === 'self' ? [i] : alive(st)).forEach(function (j) {
          var e2 = st.enemies[j]; e2.status.momentum = (e2.status.momentum || 0) + (it.n || 0);
          emit(st, 'status', { who: 'enemy', idx: j, id: 'momentum', n: it.n, after: e2.status.momentum });
        });
        log(st, L('rally', en.name, it.n));
        break;
      case 'build':
        en.buildCount++;
        log(st, L('build', en.name, en.buildCount));
        if (en.buildCount >= 3) {
          en.intents = [{ kind: 'atk', n: 8, tag: 'bow', ignoreWall: true, text: '흙산 사격' }];
          en.intentIdx = 0; replaced = true;
          log(st, L('built'));
        }
        break;
      case 'reinforce':
        for (var s = 0; s < (it.n || 1); s++) spawn(st, it.id, st.wave, it.cap);
        break;
      case 'raid':
        st.ration = Math.max(0, st.ration - (it.n || 0));
        emit(st, 'ration', { n: -(it.n || 0), after: st.ration });
        log(st, L('raid', it.n));
        break;
      case 'signal': st.enemySignalNext += 1; log(st, L('signal')); break;
      case 'flee':
        en.dead = true; en.fled = true;
        emit(st, 'enemyDeath', { enemyIdx: i, id: en.id, fled: true });
        log(st, L('fled', en.name));
        break;
      case 'incite': susp(st, it.n || 1); log(st, L('incite', it.n)); break;
      case 'ops': runSync(st, it.ops || [], { actorIdx: i, enemyIdx: i, fromCard: false }); break;
      default: break;
    }
    if (rec) rec.push({ enemyIdx: i, kind: kind, text: it.text || '', dmg: dmg, raw: raw, pierce: !!it.pierce, nextDist: st.dist, mark: markOf(it) });
    if (!replaced && !en.dead) advanceIntent(en);
    return res === 'dead' ? 'dead' : res;
  }

  /* ================================================================ 턴 */
  function drawCards(st, n) {
    var drawn = [], reshuffled = false;
    for (var k = 0; k < n; k++) {
      if (st.phase === 'done') break;
      if (st.hand.length >= B.HAND_MAX) break;
      if (!st.draw.length) {
        if (!st.discard.length || reshuffled) break;
        st.draw = Core.shuffle(st.rng, st.discard); st.discard = []; reshuffled = true;
      }
      var inst = st.draw.pop();
      st.hand.push(inst); drawn.push(inst.uid);
      onDrawn(st, inst);
    }
    return drawn;
  }
  function onDrawn(st, inst) {
    var E = eff(inst);
    if (!inst.generated) fire(st, 'onCardDrawn', { card: E.card, inst: inst, drawnUid: inst.uid });
    if (st.hand.indexOf(inst) < 0) return;                    // 서애의 붓이 이미 소모했다
    if (E.card.type === 'edict') log(st, L('edictDrawn', E.card));
    if (E.onDraw && E.onDraw.length) runSync(st, E.onDraw, { card: E.card, inst: inst, drawnUid: inst.uid, fromCard: false });
  }
  function startTurn(st) {
    st.phase = 'player';
    st.cardsPlayedThisTurn = 0; st.drawHooksThisTurn = 0;
    st.handlers.forEach(function (h) { h.usedTurn = false; });
    if (st.turn > B.TURN_HARD) { log(st, L('lose')); lose(st); return; }
    if (st.turn > B.TURN_CAP) {                                 // 왜군이 굶는다
      st.stats.turnCapHit = true;
      emit(st, 'turnCap', {}); emit(st, 'banner', { key: 'starve', text: bannerText('starve') });
      log(st, L('turnCap'));
      alive(st).forEach(function (i) {
        var e = st.enemies[i], loss = Math.max(1, fl(e.maxHp * B.TURN_CAP_PENALTY));
        e.hp -= loss;
        emit(st, 'hit', { enemyIdx: i, n: loss, pierce: true, hpAfter: Math.max(0, e.hp), blockAfter: e.block, dead: e.hp <= 0, tag: 'starve' });
        if (e.hp <= 0) killEnemy(st, i);
      });
      if (st.enemyWall > 0) { st.enemyWall = Math.max(0, st.enemyWall - Math.max(1, fl(st.enemyWall0 * 0.1))); emit(st, 'enemyWall', { after: st.enemyWall }); }
      if (st.phase === 'done') return;
    }
    if (st.tide && st.turn >= 2) {
      st.tide.left--;
      if (st.tide.left <= 0) {
        st.tide.phase = st.tide.phase === 'ebb' ? 'flow' : 'ebb'; st.tide.left = B.TIDE.period;
        emit(st, 'tide', { phase: st.tide.phase, left: st.tide.left });
        if (st.tide.phase === 'flow') emit(st, 'banner', { key: 'tide_flow', text: bannerText('tide_flow') });
        log(st, L('tide', st.tide.phase, st.tide.left));
      }
    }
    var P = st.player, eAdd = 0, dAdd = 0, keep = [];
    P.pending.forEach(function (p) {
      if (p.kind === 'energy') eAdd += p.n;
      else if (p.kind === 'draw') dAdd += p.n;
      else if (p.kind === 'buff') P.buffs.push({ id: p.id, n: p.n, turns: p.turns });
      else keep.push(p);
    });
    P.pending = keep;
    P.energy = B.ENERGY + eAdd + ((st.tide && st.tide.phase === 'flow') ? B.TIDE.flowEnergy : 0);
    P.energyMax = P.energy;
    fire(st, 'onTurnStart', { turn: st.turn });
    if (st.phase === 'done') return;
    if (st.mods.blockPerTurn) { P.block += st.mods.blockPerTurn; emit(st, 'block', { n: st.mods.blockPerTurn, wall: false, after: P.block }); }
    if (st.delayed.length) {
      var due = [], wait = [];
      st.delayed.forEach(function (d) { d.turns--; (d.turns <= 0 ? due : wait).push(d); });
      st.delayed = wait;
      for (var i = 0; i < due.length; i++) { runSync(st, due[i].ops, { fromCard: false }); if (st.phase === 'done') return; }
    }
    var drawn = drawCards(st, B.DRAW + dAdd);
    st.stats.distTurns[st.dist]++;
    emit(st, 'turnStart', { turn: st.turn, energy: P.energy, drawn: drawn, handUids: uids(st.hand) });
    log(st, L('turn', st.turn));
    checkWin(st);
  }
  function beginEnemyTurn(st) {
    st.phase = 'enemy';
    st.enemies.forEach(function (e) { if (!e.dead && e.block) { e.block = 0; } });
    st.enemySignal = st.enemySignalNext; st.enemySignalNext = 0;
  }
  function runEnemyActs(st, from, end, noPost) {
    for (var i = from; i < end; i++) {
      if (st.phase === 'done') return;
      var r = enemyAct(st, i);
      if (st.phase === 'done') return;
      if (r === 'suspend') { st.rescue.resume = { at: 'enemyTurn', nextEnemyIdx: i + 1, endIdx: end, rest: null, ctx: null }; return; }
    }
    if (!noPost) enemyPost(st);
  }
  function enemyPost(st) {
    if (st.reinforce) {                                       // 편성 증원
      var R = st.reinforce;
      if (R.startTurn == null || st.turn >= R.startTurn) {
        R.timer++;
        if (R.timer >= R.every) { R.timer = 0; R.enemies.forEach(function (id) { spawn(st, id, st.wave, R.cap); }); }
      }
    }
    advance(st);
    if (st.phase === 'done') return;
    st.enemySignal = 0;
    var P = st.player;                                        // 진형 감소(철벽·서서 죽는다·지구)
    if (!(pst(st, 'ironwall') > 0 || hasBuff(st, 'wallPersist'))) {
      var keepN = modMax(st, 'blockKeep', {});
      if (P.block > keepN) { P.block = keepN; emit(st, 'block', { n: 0, wall: false, after: P.block }); }
    }
    P.buffs = P.buffs.filter(function (b) { if (b.turns == null) return true; b.turns--; return b.turns > 0; });
    decStatus(P.status);
    st.enemies.forEach(function (e) { if (!e.dead) decStatus(e.status); });
    if (checkWin(st) || st.phase === 'done') return;
    st.turn++; st.stats.turns++;
    startTurn(st);
  }
  function decStatus(s) { for (var k in s) { if (TURN_STATUS[k] && s[k] > 0) s[k]--; } }

  /* ================================================================ 승패·파도 */
  function lose(st) {
    if (st.phase === 'done') return;
    st.won = false; st.phase = 'done';
    fire(st, 'onBattleEnd', { won: false });
    emit(st, 'lose', {}); log(st, L('lose'));
  }
  function win(st) {
    st.won = true; st.phase = 'done';
    fire(st, 'onBattleEnd', { won: true });
    emit(st, 'win', {}); log(st, L('win'));
  }
  function checkWin(st) {
    if (st.phase === 'done') return st.won === true;
    for (var guard = 0; guard < 10; guard++) {
      var al = alive(st), w = st.waves ? st.waves[st.wave - 1] : null, hit = al.length === 0;
      if (!hit && w && w.trigger && typeof w.trigger === 'object' && w.trigger.enemyDead) {
        var any = false, all = true;
        st.enemies.forEach(function (e) { if (e.id === w.trigger.enemyDead && e.wave === st.wave) { any = true; if (!e.dead) all = false; } });
        hit = any && all;
      }
      if (!hit) return false;
      if (st.waves && st.wave < st.waves.length) { nextWave(st); if (st.phase === 'done') return st.won === true; continue; }
      if (al.length > 0) return false;
      win(st); return true;
    }
    return false;
  }
  function nextWave(st) {
    var prev = st.waves[st.wave - 1];
    if (!prev.keepOthers) st.enemies.forEach(function (e) { if (!e.dead) { e.dead = true; e.fled = true; } });
    st.wave++; st.stats.wavesCleared++;
    var w = st.waves[st.wave - 1], idxs = [];
    (w.enemies || []).forEach(function (s) {
      var inst = prepEnemy(st, ENEMIES.makeInst(s.id, st.act, { offset: s.offset || 0, name: s.name || null, hp: s.hp != null ? s.hp : null, wave: st.wave }));
      st.enemies.push(inst); idxs.push(st.enemies.length - 1);
      st.spawned[s.id] = (st.spawned[s.id] || 0) + 1;
    });
    if (w.mods) { for (var k in w.mods) st.mods[k] = w.mods[k]; }
    st.rescue.disabled = !!st.mods.rescueDisabled;
    st.reinforce = w.reinforce ? { every: w.reinforce.every, enemies: w.reinforce.enemies.slice(), cap: w.reinforce.cap, startTurn: null, timer: 0 } : null;
    emit(st, 'wave', { idx: st.wave, intro: w.intro || null,
      enemies: idxs.map(function (i) { var e = st.enemies[i]; return { enemyIdx: i, id: e.id, hp: e.hp, maxHp: e.maxHp }; }) });
    log(st, L('wave', st.wave, w.intro));
    if (w.resetDist != null) setDist(st, w.resetDist, 'wave');
    idxs.forEach(function (i) { fire(st, 'onEnemySpawn', { enemyIdx: i, enemy: st.enemies[i] }); });
    if (w.onStart && w.onStart.length) runSync(st, w.onStart, { fromCard: false });
    if (w.extraDraw) { var d = drawCards(st, w.extraDraw); if (d.length) emit(st, 'draw', { uids: d, handUids: uids(st.hand) }); }
    fire(st, 'onWaveStart', { wave: st.wave });
  }

  /* ================================================================ 부장 이탈 */
  function removeOneCopy(st, cardId) {
    if (st.playing && st.playing.id === cardId) { st.playForceExhaust = true; return true; }
    var piles = ['draw', 'discard', 'hand', 'exhaust'];
    for (var p = 0; p < piles.length; p++) {
      var arr = st[piles[p]];
      for (var i = 0; i < arr.length; i++) if (arr[i].id === cardId && !arr[i].generated) { arr.splice(i, 1); return true; }
    }
    return false;
  }
  function removeDeputy(st, id, why) {
    var P = st.player, i = P.deputies.indexOf(id);
    if (i < 0) return false;
    P.deputies.splice(i, 1);
    st.handlers = st.handlers.filter(function (h) { return !(h.src && h.src.kind === 'deputy' && h.src.id === id); });
    st.mods_ = st.mods_.filter(function (m) { return !(m.src && m.src.kind === 'deputy' && m.src.id === id); });
    var dep = GENERALS.deputies.byId[id];
    if (dep && dep.card) removeOneCopy(st, dep.card);
    st.generalsLost.push(id);
    if (why === 'leave') {
      var depName = dep ? dep.name : '부장', X = T();
      emit(st, 'banner', { key: 'leave', text: X && X.fill ? X.fill(bannerText('leave'), { name: depName }) : depName + ' 이탈' });
      log(st, L('leave', depName));
    }
    return true;
  }

  /* ================================================================ op 실행 */
  function susp(st, n) {
    var before = st.suspicion;
    st.suspicion = Core.clamp(st.suspicion + (n || 0), 0, B.SUSP_MAX);
    st.suspicionDelta += st.suspicion - before;
    if (st.suspicion !== before) emit(st, 'suspicion', { n: st.suspicion - before, after: st.suspicion });
  }
  function targetsFor(st, who, ctx, op) {
    switch (who) {
      case 'self': return ['P'];
      case 'all': return alive(st);
      case 'target': { var t = resolveTarget(st, ctx); return t < 0 ? [] : [t]; }
      case 'spawned': return (ctx.enemyIdx != null && st.enemies[ctx.enemyIdx] && !st.enemies[ctx.enemyIdx].dead) ? [ctx.enemyIdx] : [];
      case 'actor': return ctx.actorIdx != null ? [ctx.actorIdx] : ['P'];
      case 'enemy': return alive(st).filter(function (i) { return inList(op.enemyId, st.enemies[i].id); });
      case 'random': { var a = alive(st); return a.length ? [Core.pick(st.rng, a)] : []; }
      default: return ['P'];
    }
  }
  function opStatus(st, op, ctx) {
    var n = op.n || 1;
    targetsFor(st, op.who || 'self', ctx, op).forEach(function (t) {
      if (t === 'P') {
        st.player.status[op.id] = (st.player.status[op.id] || 0) + n;
        emit(st, 'status', { who: 'self', idx: null, id: op.id, n: n, after: st.player.status[op.id] });
        return;
      }
      var en = st.enemies[t];
      if (op.id === 'stun' && en.boss) { log(st, L('stunFail')); return; }
      en.status[op.id] = (en.status[op.id] || 0) + n;
      emit(st, 'status', { who: 'enemy', idx: t, id: op.id, n: n, after: en.status[op.id] });
    });
  }
  function opBlock(st, op, ctx) {
    var n = op.n || 0, base = n, note = '';
    if (n > 0 && homeMatch(st, ctx)) { n = fl(n * B.HOME_BONUS); note = ctx.card.home + ' ×' + B.HOME_BONUS; }
    if (op.ifWallBonus && st.player.wall > 0) n += op.ifWallBonus;
    var P = st.player;
    if (op.wall) { P.wall = Math.max(0, P.wall + n); emit(st, 'block', { n: n, wall: true, after: P.wall }); }
    else { P.block = Math.max(0, P.block + n); emit(st, 'block', { n: n, wall: false, after: P.block }); }
    if (st.__lines && ctx.fromCard) st.__lines.push({ label: op.wall ? '성벽' : '진형', base: base, final: n, note: note });
  }
  function opHp(st, op, ctx) {
    var P = st.player;
    if (op.max) { P.maxHp = Math.max(1, P.maxHp + op.max); P.hp = Math.min(P.hp, P.maxHp); }
    var n = op.n || 0;
    if (op.pct) n += fl(P.maxHp * op.pct);
    if (n > 0) { P.hp = Math.min(P.maxHp, P.hp + n); emit(st, 'heal', { n: n, hpAfter: P.hp }); }
    else if (n < 0) {
      if (hasBuff(st, 'minHp1')) P.hp = Math.max(Math.min(P.hp, 1), P.hp + n); else P.hp += n;
      emit(st, 'playerHit', { n: -n, blocked: 0, hpAfter: P.hp, blockAfter: P.block, wallAfter: P.wall, source: null, tag: 'self', pierce: true, enemyIdx: null });
      return checkHp(st, !!ctx.canSuspend);
    }
    return 'ok';
  }
  function opAddCard(st, op) {
    var n = op.n || 1, where = op.where || 'deck', added = [];
    for (var k = 0; k < n; k++) {
      var id = op.id;
      if (!id) {
        var pool = (op.pool ? CARDS.pool(op.pool) : CARDS.list).filter(function (c) { return c.rarity !== null && (!op.tag || (c.tags || []).indexOf(op.tag) >= 0); });
        var c = Core.pick(st.rng, pool); if (!c) return;
        id = c.id;
      }
      var gen = !!op.generated, inst = mkInst(st, id, !!op.up, gen);
      if (op.free) inst.tmpCost = 0;
      if (where === 'hand') { (st.hand.length < B.HAND_MAX ? st.hand : st.discard).push(inst); added.push(inst.uid); }
      else if (where === 'discard') st.discard.push(inst);
      else {
        st.draw.splice(Core.randInt(st.rng, 0, st.draw.length), 0, inst);
        if (where === 'deck' && !gen) st.deckChanges.push({ op: 'add', id: id, up: !!op.up });
      }
    }
    if (added.length) emit(st, 'draw', { uids: added, handUids: uids(st.hand) });
  }
  function opRemoveCard(st, op) {
    var left = op.all ? 1e9 : (op.n || 1);
    function match(inst) {
      var c = cardDef(inst.id);
      if (op.id && inst.id !== op.id) return false;
      if (op.tag && (c.tags || []).indexOf(op.tag) < 0) return false;
      if (op.pool && c.pool !== op.pool) return false;
      return true;
    }
    ['draw', 'hand', 'discard', 'exhaust'].forEach(function (p) {
      for (var i = st[p].length - 1; i >= 0 && left > 0; i--) {
        if (!match(st[p][i])) continue;
        var x = st[p].splice(i, 1)[0]; left--;
        if (!x.generated) st.deckChanges.push({ op: 'remove', uid: x.uid });
      }
    });
  }
  function applyChoice(st, kind, picked) {
    var moved = [];
    picked.forEach(function (p) {
      if (kind === 'retrieve') {
        var i = idxByUid(st.discard, p.uid);
        if (i < 0 || st.hand.length >= B.HAND_MAX) return;
        st.hand.push(st.discard.splice(i, 1)[0]); moved.push(p.uid);
      } else {
        var j = idxByUid(st.hand, p.uid);
        if (j < 0) return;
        var inst = st.hand.splice(j, 1)[0];
        (kind === 'exhaust' ? st.exhaust : st.discard).push(inst); moved.push(p.uid);
        if (kind === 'exhaust') log(st, L('exhaust', cardDef(inst.id)));
      }
    });
    if (moved.length) emit(st, kind === 'retrieve' ? 'draw' : kind, { uids: moved, handUids: uids(st.hand) });
  }
  function opPick(st, kind, op, ctx, allowChoose) {
    var n = op.n || 1, src = kind === 'retrieve' ? st.discard : st.hand, cands = [];
    src.forEach(function (inst, i) {
      if (op.type && cardDef(inst.id).type !== op.type) return;
      cands.push({ where: kind === 'retrieve' ? 'discard' : 'hand', idx: i, uid: inst.uid, id: inst.id });
    });
    if (!cands.length) return 'ok';
    if (op.choose && allowChoose && !st.dryRun && cands.length > n) {
      st.phase = 'choose';
      st.choice = { kind: kind, n: n, candidates: cands, rest: null, ctx: null };
      return 'suspend';
    }
    var picked;
    if (cands.length <= n) picked = cands;
    else if (op.choose && !op.random) picked = cands.slice(0, n);
    else {
      picked = []; var pool = cands.slice();
      for (var k = 0; k < n && pool.length; k++) { var p = Core.pick(st.rng, pool); pool.splice(pool.indexOf(p), 1); picked.push(p); }
    }
    applyChoice(st, kind, picked);
    return 'ok';
  }
  function execOp(st, op, ctx, allowChoose) {
    var k = op.op, P = st.player;
    if (RUN_OPS[k]) throw new Error('Combat: 판 전용 op ‘' + k + '’를 전투에서 만났다');
    switch (k) {
      case 'dmg': return opDmg(st, op, ctx);
      case 'block': opBlock(st, op, ctx); return 'ok';
      case 'push': push(st, op.n || 1); return st.phase === 'done' ? 'dead' : 'ok';
      case 'pull': pull(st, op.n || 1); return st.phase === 'done' ? 'dead' : 'ok';
      case 'draw':
        if (op.nextTurn) { P.pending.push({ kind: 'draw', n: op.n || 1, id: null, turns: null }); return 'ok'; }
        var d = drawCards(st, op.n || 1);
        if (d.length) emit(st, 'draw', { uids: d, handUids: uids(st.hand) }); else log(st, L('noDraw'));
        return st.phase === 'done' ? 'dead' : 'ok';
      case 'energy':
        if (op.nextTurn) { P.pending.push({ kind: 'energy', n: op.n || 0, id: null, turns: null }); return 'ok'; }
        P.energy = Math.max(0, P.energy + (op.n || 0)); emit(st, 'energy', { after: P.energy }); return 'ok';
      case 'status': opStatus(st, op, ctx); return 'ok';
      case 'stun': opStatus(st, { who: op.who || 'target', id: 'stun', n: op.n || 1 }, ctx); return 'ok';
      case 'buff':
        var bf = { id: op.id, n: op.n != null ? op.n : 1, turns: op.turns != null ? op.turns : null };
        if (op.nextTurn) P.pending.push({ kind: 'buff', n: bf.n, id: bf.id, turns: bf.turns }); else P.buffs.push(bf);
        emit(st, 'buff', { id: bf.id, n: bf.n, turns: bf.turns });
        return 'ok';
      case 'exhaustHand':
        var cards = st.hand.splice(0);
        cards.forEach(function (c) { st.exhaust.push(c); });
        if (cards.length) emit(st, 'exhaust', { uids: uids(cards), handUids: [] });
        for (var i = 0; i < cards.length; i++) { if (runQueue(st, (op.perCard || []).slice(), ctx, false) === 'dead') return 'dead'; }
        return 'ok';
      case 'discard': return opPick(st, 'discard', op, ctx, allowChoose);
      case 'retrieve': return opPick(st, 'retrieve', op, ctx, allowChoose);
      case 'exhaust':
        if (op.which === 'drawn') {
          var u = ctx.drawnUid, j = idxByUid(st.hand, u);
          if (j >= 0) { var x = st.hand.splice(j, 1)[0]; st.exhaust.push(x); emit(st, 'exhaust', { uids: [u], handUids: uids(st.hand) }); log(st, L('exhaust', cardDef(x.id))); }
          return 'ok';
        }
        if (op.which === 'ctxCard') { st.playForceExhaust = true; return 'ok'; }
        return opPick(st, 'exhaust', op, ctx, allowChoose);
      case 'mark': { var mi = ctx.inst || st.playing; if (mi) mi.marked = !!op.set; return 'ok'; }
      case 'delay': st.delayed.push({ turns: op.turns || 1, ops: Core.clone(op.ops || []) }); return 'ok';
      case 'stripBlock':
        targetsFor(st, op.who || 'target', ctx, op).forEach(function (t) {
          if (t === 'P') return; st.enemies[t].block = 0; emit(st, 'enemyBlock', { enemyIdx: t, after: 0 });
        });
        return 'ok';
      case 'suspicion': susp(st, op.n || 0); return 'ok';
      case 'ration': st.ration = Math.max(0, st.ration + (op.n || 0)); emit(st, 'ration', { n: op.n || 0, after: st.ration }); return 'ok';
      case 'hp': return opHp(st, op, ctx);
      case 'addCard': opAddCard(st, op); return 'ok';
      case 'removeCard': opRemoveCard(st, op); return 'ok';
      case 'flag':
        var val = (op.add != null) ? ((Number(st.flags[op.key]) || 0) + op.add) : (op.value === undefined ? true : op.value);
        st.flags[op.key] = val; st.flagsOut[op.key] = val; return 'ok';
      case 'leave': removeDeputy(st, op.id, 'leave'); return 'ok';
      case 'fx':
        var text = op.text || (op.kind === 'banner' ? bannerText(op.key) : '');
        emit(st, op.kind, { key: op.key || null, text: text });
        if (op.kind === 'banner' && text) log(st, '“' + text + '”');
        return 'ok';
      default: throw new Error('Combat: 모르는 op ‘' + k + '’');
    }
  }
  // 대기열 실행기. cond 는 가지를 대기열 앞에 펼친다. choose·구출로 멈추면 남은 대기열을 st 에 적어 둔다.
  function runQueue(st, queue, ctx, allowChoose) {
    while (queue.length) {
      if (st.phase === 'done') return 'dead';
      var op = queue.shift();
      if (!op || typeof op !== 'object') continue;
      if (op.op === 'cond') {
        var br = evalCond(st, op.if, ctx) ? op.then : op.else;
        if (br && br.length) queue = br.slice().concat(queue);
        continue;
      }
      var r = execOp(st, op, ctx, allowChoose && !st.dryRun);
      if (r === 'dead' || st.phase === 'done') return 'dead';
      if (r === 'suspend') {
        var cc = { cardUid: ctx.inst ? ctx.inst.uid : null, cardId: ctx.card ? ctx.card.id : null, targetIdx: ctx.targetIdx != null ? ctx.targetIdx : null };
        if (st.phase === 'choose') { st.choice.rest = queue; st.choice.ctx = cc; }
        else if (st.phase === 'rescue') { st.rescue.resume = { at: 'play', nextEnemyIdx: null, endIdx: null, rest: queue, ctx: cc }; }
        return 'suspend';
      }
    }
    return 'done';
  }
  function runSync(st, ops, ctx) { return runQueue(st, (ops || []).slice(), ctx || {}, false); }
  function rebuildCtx(st, cc) {
    return { fromCard: true, card: cc && cc.cardId ? cardDef(cc.cardId) : null, inst: st.playing, targetIdx: cc ? cc.targetIdx : null, canSuspend: true };
  }

  /* ================================================================ 카드 내기 */
  function costOf(st, inst, E, ctx) {
    if (inst.tmpCost != null) return { cost: inst.tmpCost, deltas: [] };
    var cost = E.cost, deltas = [];
    if (E.costIf && evalCond(st, E.costIf.if, ctx)) cost = E.costIf.cost;
    if (st.mods.costOverride && st.mods.costOverride[inst.id] != null) cost = st.mods.costOverride[inst.id];
    st.mods_.forEach(function (m) { if (m.mod === 'costDelta' && modActive(st, m, ctx)) { cost += m.n; deltas.push(m); } });
    if (isCharge(E.card) && st.mods.chargeCostDelta) cost += st.mods.chargeCostDelta;
    return { cost: Math.max(0, cost), deltas: deltas };
  }
  function rationOf(st, inst, E) {
    if (inst.tmpCost === 0 || !E.ration) return 0;
    return Math.max(0, E.ration - (Number(st.flags.mingDiscount) || 0) + (Number(st.flags.mingCostDelta) || 0));
  }
  function cardInfo(st, handIdx) {
    var inst = st.hand[handIdx];
    if (!inst) return { card: null, inst: null, cost: 0, ration: 0, playable: false, reason: '없는 카드', needsTarget: false };
    var E = eff(inst), ctx = { fromCard: true, card: E.card, inst: inst };
    var c = costOf(st, inst, E, ctx), ration = rationOf(st, inst, E);
    var need = opsNeedTarget(E.ops), reason = '';
    if (st.phase !== 'player') reason = '지금은 낼 수 없다';
    else if (st.player.energy < c.cost) reason = '군령이 모자란다';
    else if (st.ration < ration) reason = '군량이 모자란다';
    else if (isCharge(E.card) && st.dist === 2 && !hasBuff(st, 'chargeAtClose')) reason = '붙어서는 돌격할 수 없다';
    else if (E.card.type === 'atk' && hasBuff(st, 'noAtk')) reason = '숨어 있다 — 공격할 수 없다';
    else if (E.card.type === 'rep' && st.mods.wonGyun) reason = '원균 대행 — 장계를 올리지 않는다';
    else if (need && firstAlive(st) < 0) reason = '대상이 없다';
    return { card: E.card, inst: inst, up: !!inst.up, cost: c.cost, ration: ration, playable: !reason, reason: reason, needsTarget: need, retain: E.retain, exhaust: E.exhaust };
  }
  function needsTarget(st, handIdx) { var inst = st.hand[handIdx]; return !!inst && opsNeedTarget(eff(inst).ops); }
  function legalMoves(st) {
    if (st.phase !== 'player') return [];
    var out = [], al = alive(st);
    for (var i = 0; i < st.hand.length; i++) {
      var info = cardInfo(st, i);
      if (info.playable) out.push({ handIdx: i, targets: info.needsTarget ? al.slice() : null });
    }
    return out;
  }
  function playInternal(st, handIdx, targetIdx, force) {
    var info = cardInfo(st, handIdx);
    if (!info.inst) return { ok: false, reason: '없는 카드' };
    if (!force && !info.playable) return { ok: false, reason: info.reason };
    if (info.needsTarget) { if (targetIdx == null || !st.enemies[targetIdx] || st.enemies[targetIdx].dead) targetIdx = firstAlive(st); }
    else targetIdx = null;
    var inst = st.hand.splice(handIdx, 1)[0], E = eff(inst), ctx0 = { fromCard: true, card: E.card, inst: inst };
    costOf(st, inst, E, ctx0).deltas.forEach(function (m) { if (m.once) m.used = true; });
    st.playing = inst; st.playForceExhaust = false;
    st.player.energy = Math.max(0, st.player.energy - info.cost);
    st.ration = Math.max(0, st.ration - info.ration);
    st.cardsPlayedThisTurn++;
    if (!st.dryRun) {
      st.stats.cardsPlayed[inst.id] = (st.stats.cardsPlayed[inst.id] || 0) + 1;
      if (E.card.type === 'edict') st.stats.edictsPlayed++;
    }
    emit(st, 'play', { uid: inst.uid, cardId: inst.id, handIdx: handIdx, targetIdx: targetIdx, energyAfter: st.player.energy, rationAfter: st.ration,
      to: E.exhaust ? 'exhaust' : 'discard' });
    log(st, L('play', E.card));
    var ctx = { fromCard: true, card: E.card, inst: inst, targetIdx: targetIdx, canSuspend: true };
    var r = runQueue(st, E.ops.slice(), ctx, true);
    if (r === 'suspend' || r === 'dead') return { ok: true, phase: st.phase };
    finishPlay(st, ctx);
    return { ok: true, phase: st.phase };
  }
  function finishPlay(st, ctx) {
    var inst = st.playing;
    st.playing = null;
    if (inst) {
      var E = eff(inst);
      if (st.playForceExhaust || E.exhaust) st.exhaust.push(inst); else st.discard.push(inst);
    }
    st.playForceExhaust = false;
    if (st.phase === 'done') return;
    fire(st, 'onCardPlayed', { card: ctx.card, inst: inst, targetIdx: ctx.targetIdx });
    if (st.phase === 'done') return;
    checkWin(st);
  }
  function play(st, handIdx, targetIdx) {
    if (st.phase !== 'player') return { ok: false, reason: st.phase === 'rescue' ? 'rescue' : 'phase' };
    return playInternal(st, handIdx, targetIdx == null ? null : targetIdx, false);
  }
  function choose(st, idxs) {
    if (st.phase !== 'choose' || !st.choice) return { ok: false, reason: st.phase === 'rescue' ? 'rescue' : 'phase' };
    var ch = st.choice, want = Math.min(ch.n, ch.candidates.length), seen = {}, sel = [];
    (idxs || []).forEach(function (i) { if (i >= 0 && i < ch.candidates.length && !seen[i] && sel.length < want) { seen[i] = true; sel.push(i); } });
    for (var k = 0; sel.length < want && k < ch.candidates.length; k++) if (!seen[k]) { seen[k] = true; sel.push(k); }
    applyChoice(st, ch.kind, sel.map(function (i) { return ch.candidates[i]; }));
    st.choice = null; st.phase = 'player';
    var ctx = rebuildCtx(st, ch.ctx), r = runQueue(st, (ch.rest || []).slice(), ctx, true);
    if (r === 'done') finishPlay(st, ctx);
    return { ok: true, phase: st.phase };
  }
  function chooseRescue(st, deputyId) {
    if (st.phase !== 'rescue') return { ok: false, reason: 'phase' };
    var pend = st.rescue.pending || [];
    if (pend.indexOf(deputyId) < 0) deputyId = pend[0];
    var res = st.rescue.resume;
    st.rescue.resume = null;
    applyRescue(st, deputyId);
    if (!res) { st.phase = 'player'; return { ok: true }; }
    if (res.at === 'play') {
      st.phase = 'player';
      var ctx = rebuildCtx(st, res.ctx), r = runQueue(st, (res.rest || []).slice(), ctx, true);
      if (r === 'done') finishPlay(st, ctx);
    } else {
      st.phase = 'enemy';
      runEnemyActs(st, res.nextEnemyIdx, res.endIdx, false);
    }
    return { ok: true, phase: st.phase };
  }
  function endTurn(st) {
    if (st.phase !== 'player') return { ok: false, reason: st.phase === 'rescue' ? 'rescue' : 'phase' };
    if (!st.dryRun) {
      st.expect = intentPreview(st).filter(function (r) { return r.dmg !== null; }).map(function (r) { return r.dmg; });
      st.expectIdx = 0;
    }
    var keep = [], out = [];
    st.hand.forEach(function (inst) { (eff(inst).retain ? keep : out).push(inst); });
    st.hand = keep;
    out.forEach(function (i) { st.discard.push(i); });
    if (out.length) emit(st, 'discard', { uids: uids(out), handUids: uids(st.hand) });
    fire(st, 'onTurnEnd', {});
    if (st.phase === 'done') return { ok: true, phase: st.phase };
    beginEnemyTurn(st);
    runEnemyActs(st, 0, st.enemies.length, false);
    return { ok: true, phase: st.phase };
  }

  /* ================================================================ 미리 보기 (원본을 바꾸지 않는다) */
  function intentPreview(st) {
    if (st.phase === 'done') return [];
    var c = Core.clone(st);
    c.dryRun = true; c.__rec = []; c.expect = null; c.phase = 'player'; c.choice = null;
    beginEnemyTurn(c);
    runEnemyActs(c, 0, c.enemies.length, true);
    return c.__rec;
  }
  function intentOf(st, i) { var en = st.enemies[i]; if (!en || en.dead) return null; return resolveIntent(st, i); }
  function preview(st, handIdx, targetIdx) {
    var out = { lines: [], perEnemy: st.enemies.map(function () { return null; }), distAfter: st.dist, blockAfter: st.player.block, wallAfter: st.player.wall };
    var inst = st.hand[handIdx];
    if (!inst || st.phase === 'done') return out;
    var info = cardInfo(st, handIdx);
    var c = Core.clone(st);
    c.dryRun = true; c.__lines = []; c.phase = 'player'; c.choice = null;
    c.player.energy = Math.max(c.player.energy, info.cost); c.ration = Math.max(c.ration, info.ration);
    playInternal(c, handIdx, targetIdx == null ? null : targetIdx, true);
    out.lines = c.__lines;
    out.perEnemy = st.enemies.map(function (e, i) { return e.dead ? null : (e.hp - Math.max(0, c.enemies[i].hp)); });
    out.distAfter = c.dist; out.blockAfter = c.player.block; out.wallAfter = c.player.wall;
    out.hpAfter = c.player.hp; out.won = c.phase === 'done' && c.won === true;
    // 이 패를 낸 뒤 다음 적 턴에 실제로 받을 피해(앞 적의 접근·진형 소모까지 반영). UI: 「받을 피해 27 → 12」
    out.incomingAfter = (c.phase === 'player') ? intentPreview(c).reduce(function (a, r) { return a + (r.dmg || 0); }, 0) : 0;
    return out;
  }

  /* ================================================================ 생성·결과 */
  function create(req) {
    Core.assert(req && Array.isArray(req.deck), 'Combat.create: req.deck 이 없다');
    var m = Core.clone(req.mods || {});
    var type = req.type || 'field';
    var st = {
      seed: req.seed, rng: Core.rngNew(req.seed), uidCounter: req.uidCounter || 0,
      act: req.act || 1, nodeId: req.nodeId || null, type: type, terrain: req.terrain || 'none', do: req.do || null,
      encId: req.encId || null, elite: !!req.elite, boss: !!req.boss,
      flags: Core.clone(req.flags || {}), flagsOut: {}, mods: m,
      turn: 1, phase: 'player', won: null, dist: 1, startDist: 1, dryRun: false, tide: null,
      player: { hp: req.hp, maxHp: req.maxHp || req.hp, energy: 0, energyMax: B.ENERGY, block: 0, wall: 0, status: {}, buffs: [], pending: [],
        leader: req.leader || null, deputies: (req.deputies || []).slice(), special: req.special || null },
      ration: req.ration || 0, suspicion: req.suspicion || 0, suspicionDelta: 0,
      draw: [], hand: [], discard: [], exhaust: [], playing: null, playForceExhaust: false,
      enemies: [], enemyWall: 0, enemyWall0: 0, spawned: {}, reinforce: null, enemySignal: 0, enemySignalNext: 0, noAdvanceLeft: 0,
      waves: null, wave: 1, handlers: [], mods_: [], delayed: [],
      cardsPlayedThisTurn: 0, drawHooksThisTurn: 0, choice: null,
      rescue: { used: false, disabled: false, pending: null, resume: null },
      generalsLost: [], deckChanges: [], relics: (req.relics || []).slice(), relicUp: Core.clone(req.relicUp || {}),
      expect: null, expectIdx: 0, log: [],
      stats: { turns: 0, dmgDealt: 0, dmgTaken: 0, cardsPlayed: {}, edictsPlayed: 0, distTurns: [0, 0, 0], pushes: 0,
        intentChecks: { ok: 0, bad: 0 }, enemiesKilled: 0, turnCapHit: false, wavesCleared: 0 },
      tutorial: m.tutorial || null
    };
    // 덱
    st.draw = req.deck.map(function (d) { return { uid: d.uid, id: d.id, up: !!d.up, generated: false, marked: false, tmpCost: null }; });
    Core.shuffle(st.rng, st.draw);
    // 거리·성벽
    var DEF_DIST = { field: 1, siege: 0, assault: 1, naval: 0 };
    st.dist = st.startDist = (m.startDist != null) ? m.startDist : (DEF_DIST.hasOwnProperty(type) ? DEF_DIST[type] : 1);
    st.player.wall = (m.wall != null) ? m.wall : (type === 'siege' ? B.SIEGE_WALL : 0);
    st.enemyWall = st.enemyWall0 = (m.enemyWall != null) ? m.enemyWall : (type === 'assault' ? B.ASSAULT_ENEMY_WALL : 0);
    if (m.startBlock) st.player.block = m.startBlock;
    if (m.momentum) st.player.status.momentum = m.momentum;
    st.noAdvanceLeft = m.noAdvanceTurns || 0;
    if (m.tide) st.tide = { phase: 'ebb', left: B.TIDE.period };
    // 적
    (req.enemies || []).forEach(function (e) {
      var inst = prepEnemy(st, Core.clone(e));
      st.enemies.push(inst);
      st.spawned[inst.id] = (st.spawned[inst.id] || 0) + 1;
    });
    if (req.waves && req.waves.length) {
      st.waves = Core.clone(req.waves);
      var w0 = st.waves[0];
      if (w0.mods) { for (var k in w0.mods) st.mods[k] = w0.mods[k]; }
      if (w0.reinforce) st.reinforce = { every: w0.reinforce.every, enemies: w0.reinforce.enemies.slice(), cap: w0.reinforce.cap, startTurn: null, timer: 0 };
    }
    if (req.reinforce) {
      var R = req.reinforce;
      st.reinforce = { every: m.reinforceEvery || R.every, enemies: R.enemies.slice(), cap: R.cap, startTurn: R.startTurn != null ? R.startTurn : null, timer: 0 };
    }
    st.rescue.disabled = !!st.mods.rescueDisabled;
    // 패시브·기물·편성 훅
    function addPassive(p, src) {
      if (!p) return;
      (p.handlers || []).forEach(function (h) { addHandler(st, h, src); });
      (p.mods || []).forEach(function (mm) { addMod(st, mm, src); });
    }
    if (req.leader && !m.wonGyun && GENERALS.leaders.byId[req.leader]) addPassive(GENERALS.leaders.get(req.leader).passive, { kind: 'leader', id: req.leader });
    st.player.deputies.forEach(function (id) { if (GENERALS.deputies.byId[id]) addPassive(GENERALS.deputies.get(id).passive, { kind: 'deputy', id: id }); });
    if (req.special && GENERALS.deputies.byId[req.special]) addPassive(GENERALS.deputies.get(req.special).passive, { kind: 'special', id: req.special });
    st.relics.forEach(function (id) {
      var r = GENERALS.relics.byId[id]; if (!r) return;
      var hs = (st.relicUp[id] && r.upHandlers) ? r.upHandlers : r.handlers;
      (hs || []).forEach(function (h) { addHandler(st, h, { kind: 'relic', id: id }); });
      (r.mods || []).forEach(function (mm) { addMod(st, mm, { kind: 'relic', id: id }); });
    });
    (req.handlers || []).forEach(function (h) { addHandler(st, h, { kind: 'encounter', id: req.encId || null }); });
    (m.dmgBonus || []).forEach(function (d) { addMod(st, { mod: 'dmgBonus', n: d.n, if: d.if || null }, { kind: 'req', id: 'dmgBonus' }); });
    if (m.wonGyun) addMod(st, { mod: 'atkPct', n: B.WON_GYUN_PCT }, { kind: 'req', id: 'wonGyun' });
    if (m.passivesOff) st.player.buffs.push({ id: 'passivesOff', n: 1, turns: null });
    // 시작
    fire(st, 'onBattleStart', {});
    (m.startHand || []).forEach(function (h) {
      var inst = mkInst(st, h.id, !!h.up, true);
      if (h.free) inst.tmpCost = 0;
      (st.hand.length < B.HAND_MAX ? st.hand : st.discard).push(inst);
    });
    if (m.extraDraw) st.player.pending.push({ kind: 'draw', n: m.extraDraw, id: null, turns: null });
    if (st.phase !== 'done') startTurn(st);
    return st;
  }
  function result(st) {
    var ships = 0;
    st.enemies.forEach(function (e) { if (!e.dead && e.tags.indexOf('ship') >= 0) ships++; });
    var stats = Core.clone(st.stats);
    stats.turns = st.turn; stats.shipsLeft = st.type === 'naval' ? ships : null;
    return {
      won: st.won === true, hp: Math.max(0, st.player.hp), maxHp: st.player.maxHp, ration: st.ration,
      suspicionDelta: st.suspicionDelta, turns: st.turn, flagsOut: Core.clone(st.flagsOut), deckChanges: Core.clone(st.deckChanges),
      generalsLost: st.generalsLost.slice(), rescued: st.rescue.used, stats: stats, log: st.log.slice(-30)
    };
  }
  function applyOps(st, ops, ctx) { return runSync(st, ops, ctx || {}); }

  /* ================================================================ 자가 검사 */
  function botStep(st, r) {
    if (st.phase === 'choose') { var idxs = []; for (var i = 0; i < Math.min(st.choice.n, st.choice.candidates.length); i++) idxs.push(i); return { f: 'choose', a: [idxs] }; }
    if (st.phase === 'rescue') return { f: 'chooseRescue', a: [st.rescue.pending[st.rescue.pending.length - 1]] };
    var mv = legalMoves(st);
    if (!mv.length || Core.rand(r) < 0.12) return { f: 'endTurn', a: [] };
    var m = Core.pick(r, mv);
    return { f: 'play', a: [m.handIdx, m.targets ? Core.pick(r, m.targets) : null] };
  }
  function apply(st, step) { return api[step.f].apply(null, [st].concat(step.a)); }
  function testReq(seed, encId, leader, deps, relics, act, flagMods) {
    var deck = CARDS.startDeck(leader).map(function (id, i) { return { uid: 'u' + (i + 1), id: id, up: i % 4 === 0 }; });
    ['pyeonjeon', 'jochong', 'discipline', 'regroup', 'turtle_ship', 'crane_wing', 'seven_hundred', 'rowers', 'jincheonroe', 'request_troops',
     'archer_ambush', 'scarecrow', 'counter_mound', 'hide', 'edict_advance', 'edict_blame', 'edict_envy', 'twelve_ships', 'pilsa_jeuksaeng']
      .forEach(function (id, i) { deck.push({ uid: 'u' + (100 + i), id: id, up: false }); });
    var b = ENEMIES.build(encId, act || 1, Core.rngNew(seed));
    var mods = b.mods || {}; if (flagMods) for (var k in flagMods) mods[k] = flagMods[k];
    return { seed: seed, uidCounter: 500, act: act || 1, nodeId: 'test', type: b.type, terrain: 'none', do: '경상', encId: encId, elite: b.elite, boss: b.boss,
      enemies: b.enemies, waves: b.waves, reinforce: b.reinforce, handlers: b.handlers, mods: mods,
      deck: deck, relics: relics || [], relicUp: {}, leader: leader, deputies: deps || [], special: null,
      hp: 60, maxHp: 80, ration: 40, suspicion: 2, flags: { mingDiscount: 0 } };
  }
  function selfTest() {
    var errors = [], i;
    function err(s) { errors.push(s); }
    if (typeof CARDS === 'undefined' || typeof ENEMIES === 'undefined' || typeof GENERALS === 'undefined') return { ok: false, errors: ['데이터 전역 없음'] };
    var mute = Core.bus.count('fx');
    var cases = [
      ['p1_b', 'yi', [], [], 1], ['tut_busan', 'gwon', ['yi_jeongam'], ['hwacha_relic'], 1], ['boss_konishi', 'yi', ['gwon', 'jo_heon'], ['jingbirok'], 1],
      ['boss_jinju1', 'gwon', ['kim_simin', 'hwang_jin'], ['jinju_drum', 'seoae_brush'], 2], ['boss_haengju', 'yi', ['gwon', 'hwang_jin'], ['haengju_ash'], 3],
      ['boss_myeongnyang', 'yi', ['yi_eokgi'], ['myeongnyang_chain', 'hansan_drum'], 6], ['boss_noryang', 'gwon', ['yi', 'jeong_munbu'], ['turtle_blueprint'], 7],
      ['boss_jiksan', 'yi', ['jeong_munbu'], ['chains'], 5], ['pyongyang', 'gwon', [], ['jincheonroe_relic'], 3], ['gyeonnaeryang', 'yi', [], [], 2],
      ['p2_land_d', 'gwon', ['jo_heon'], ['obangnang'], 2], ['ulsan', 'yi', ['gwon'], [], 7], ['boss_wakizaka', 'yi', ['yi_eokgi', 'gwon'], [], 2]
    ];
    var wins = 0, loses = 0, turnsTotal = 0;
    for (var s = 1; s <= 20; s++) {
      for (var c = 0; c < cases.length; c++) {
        var cs = cases[c], tag = cs[0] + '#' + s;
        try {
          var st = create(testReq(s * 31 + c, cs[0], cs[1], cs[2], cs[3], cs[4]));
          var r = Core.rngNew('bot' + s + c), steps = 0;
          while (st.phase !== 'done' && steps < 800) {
            if (steps === 25) {                                // 결정성: 복제본과 원본에 같은 수열을 넣는다
              var bcl = Core.clone(st), seq = [];
              for (var q = 0; q < 30 && st.phase !== 'done'; q++) { var stp = botStep(st, r); seq.push(stp); apply(st, stp); }
              for (q = 0; q < seq.length; q++) apply(bcl, seq[q]);
              if (JSON.stringify(st) !== JSON.stringify(bcl)) { err(tag + ': JSON 왕복 뒤 같은 입력이 다른 결과'); break; }
              steps += seq.length; continue;
            }
            var before = JSON.stringify(st);
            if (st.phase === 'player') { intentPreview(st); var mv = legalMoves(st); if (mv.length) preview(st, mv[0].handIdx, mv[0].targets ? mv[0].targets[0] : null); }
            if (JSON.stringify(st) !== before) { err(tag + ': 미리 보기가 원본을 바꿨다'); break; }
            var res = apply(st, botStep(st, r));
            if (res && res.ok === false && st.phase === 'player') { err(tag + ': 합법 수가 거부됨 ' + res.reason); break; }
            steps++;
          }
          if (st.phase !== 'done') err(tag + ': 800수 안에 끝나지 않음(turn ' + st.turn + ')');
          if (st.stats.intentChecks.bad > 0) err(tag + ': 의도≠실제 ' + st.stats.intentChecks.bad + '건');
          if (st.won) wins++; else loses++;
          turnsTotal += st.turn;
          var res2 = result(st);
          if (JSON.stringify(Core.clone(res2)) !== JSON.stringify(res2)) err(tag + ': 결과가 JSON 왕복 불가');
        } catch (e) { err(tag + ': 예외 ' + ((e && e.stack) || e).toString().split('\n').slice(0, 3).join(' | ')); }
        if (errors.length > 12) return { ok: false, errors: errors };
      }
    }
    if (Core.bus.count('fx') !== mute) err('fx 구독 수가 변했다');
    return { ok: errors.length === 0, errors: errors, wins: wins, loses: loses, avgTurns: Math.round(turnsTotal / (wins + loses) * 10) / 10 };
  }

  var api = {
    create: create, cardInfo: cardInfo, needsTarget: needsTarget, legalMoves: legalMoves, play: play, choose: choose,
    endTurn: endTurn, chooseRescue: chooseRescue, preview: preview, intentPreview: intentPreview, intentOf: intentOf,
    result: result, applyOps: applyOps, evalCond: evalCond, eff: eff, alive: alive, selfTest: selfTest
  };
  return api;
})();
