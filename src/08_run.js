/* ===== 08_run.js — 판 상태기: 마디 진행·보상·장계 분배·의심 문턱·칠천량·어전회의·결말·점수·저장 (DOM 없음) ===== */
// 계약서 §6 이 정본. 구현 방식:
//  - G.queue 에는 화면 프롬프트({kind:'map'|'event'|…})와 내부 작업({kind:'_task', task, args})이 섞여 있다.
//    advance() 가 내부 작업을 차례로 실행하고, 처음 만나는 프롬프트를 G.prompt 로 세운다. 전부 JSON 이라 저장된다.
//  - 앞 답에 따라 뒤 내용이 정해지는 것(장계 분배 → 강화 장수, 전투 결과 → 보상)은 내부 작업이 그때 만든다.
//  - Run.applyOps 는 즉시 효과를 적용하고, 화면이 필요한 op(battle·offer·choose 강화·자리 찬 recruit)는 항목으로 모아 큐 앞에 넣는다.
//  - 전투 요청(req)은 battle 프롬프트가 설 때 만든다(그 순간의 덱·병력으로). 그때 G.rng 를 정확히 한 번 시드로 쓴다.
// TODO(통합): UI 는 Run.current() 의 kind 별 화면을 그리고 Run.answer(a) 로 답한다. battle 이면 UIBattle 이 Combat 을 돌린 뒤 {result}.
var Run = (function () { 'use strict';

  var B = Core.BAL;
  var G = null;
  var pend = null;                 // applyOps 가 모으는 후속 항목(호출 동안만)
  var COMBAT_OPS = { dmg: 1, block: 1, push: 1, pull: 1, draw: 1, energy: 1, status: 1, stun: 1, buff: 1, exhaustHand: 1, discard: 1, exhaust: 1, retrieve: 1, mark: 1, delay: 1, stripBlock: 1 };
  var PROMPT_KINDS = { map: 1, battle: 1, event: 1, shop: 1, camp: 1, court: 1, reward: 1, merit: 1, pickCard: 1, pickGeneral: 1, scroll: 1, actEnd: 1, council: 1, ending: 1 };

  /* ================================================================ 도우미 */
  function T() { return (typeof TXT !== 'undefined') ? TXT : null; }
  function task(name, args) { return { kind: '_task', task: name, args: args || {} }; }
  function front(items) { if (items && items.length) G.queue = items.concat(G.queue); }
  function clamp(v, a, b) { return Core.clamp(v, a, b); }
  function card(id) { return CARDS.get(id); }
  function opsText(ops) { var X = T(); try { return (X && X.opsText) ? X.opsText(ops || []) : ''; } catch (e) { return ''; } }
  function inList(v, x) { return Array.isArray(v) ? v.indexOf(x) >= 0 : v === x; }
  function range(o, x) {
    if (o === null || o === undefined) return true;
    if (typeof o === 'number') return x === o;
    if (o.lte != null && x > o.lte) return false;
    if (o.gte != null && x < o.gte) return false;
    return true;
  }
  function upgradable(c) { var d = card(c.id); return !c.up && d.plus && Object.keys(d.plus).length > 0; }
  function deputyName(id) { var d = GENERALS.deputies.byId[id]; return d ? d.name : id; }
  function actLog() {
    if (!G.actLog[G.act]) G.actLog[G.act] = { fights: [], suspTrace: [G.suspicion], gained: { cards: [], relics: [] }, choices: [], compare: [], dates: [] };
    return G.actLog[G.act];
  }
  function trace() { var l = actLog(); if (l.suspTrace[l.suspTrace.length - 1] !== G.suspicion) l.suspTrace.push(G.suspicion); }

  /* ================================================================ 조건 (판 맥락) */
  function evalCond(c) {
    if (!c) return true;
    for (var k in c) {
      if (!Object.prototype.hasOwnProperty.call(c, k)) continue;
      var v = c[k], ok;
      switch (k) {
        case 'leader': ok = inList(v, G.leader); break;
        case 'lane': ok = inList(v, G.flags.lane2); break;
        case 'act': ok = inList(v, G.act); break;
        case 'actGte': ok = G.act >= v; break;
        case 'ration': ok = range(v, G.ration); break;
        case 'suspicion': ok = range(v, G.suspicion); break;
        case 'hpPct': ok = range(v, Math.floor(G.hp * 100 / G.maxHp)); break;
        case 'slotsFree': ok = (G.deputies.length < B.DEPUTY_SLOTS) === !!v; break;
        case 'hasCard': ok = G.deck.some(function (d) { return d.id === v; }); break;
        case 'hasRelic': ok = G.relics.indexOf(v) >= 0; break;
        case 'hasDeputy': ok = G.deputies.indexOf(v) >= 0 || G.special === v; break;
        case 'noDeputy': ok = G.deputies.indexOf(v) < 0 && G.special !== v; break;
        case 'deckTagCount': ok = range(v, G.deck.filter(function (d) { return (card(d.id).tags || []).indexOf(v.tag) >= 0; }).length); break;
        case 'flag':
          ok = true;
          for (var fk in v) {
            var cur = G.flags[fk]; if (cur === undefined || cur === null) cur = false;
            if (v[fk] === false ? !!cur : cur !== v[fk]) { ok = false; break; }
          }
          break;
        default: ok = false;
      }
      if (!ok) return false;
    }
    return true;
  }

  /* ================================================================ 덱·부장·기물 */
  function addCard(id, up) {
    var c = { uid: Core.nextUid(G), id: id, up: !!up };
    G.deck.push(c);
    actLog().gained.cards.push(id);
    return c;
  }
  function removeUid(uid) { for (var i = 0; i < G.deck.length; i++) if (G.deck[i].uid === uid) { G.deck.splice(i, 1); return true; } return false; }
  function removeOneId(id) { for (var i = G.deck.length - 1; i >= 0; i--) if (G.deck[i].id === id) { G.deck.splice(i, 1); return true; } return false; }
  function ensureDeckMin() {
    var k = 0;
    while (G.deck.length < B.DECK_MIN && k < 40) { addCard(k % 2 === 0 ? 'bowstring' : 'spear_wall', false); k++; }
  }
  function edictCount() { return G.deck.filter(function (d) { return card(d.id).type === 'edict'; }).length; }
  function gainRelic(id, up) {
    if (!GENERALS.relics.byId[id]) return;
    if (up) G.relicUp[id] = true;
    if (G.relics.indexOf(id) >= 0) return;
    G.relics.push(id);
    actLog().gained.relics.push(id);
    var r = GENERALS.relics.get(id);
    if (r.onAcquire && r.onAcquire.length) applyOps(r.onAcquire, {});
  }
  function addDeputy(id) {
    G.deputies.push(id);
    var d = GENERALS.deputies.byId[id];
    if (d && d.card) addCard(d.card, false);
  }
  function leave(id, dead) {
    var i = G.deputies.indexOf(id);
    if (i < 0) return false;
    G.deputies.splice(i, 1);
    var d = GENERALS.deputies.byId[id];
    if (d && d.card) removeOneId(d.card);
    if (dead) { if (G.dead.indexOf(id) < 0) G.dead.push(id); }
    else if (G.away.indexOf(id) < 0) G.away.push(id);
    ensureDeckMin();
    return true;
  }
  function recruit(id, o) {
    o = o || {};
    if (!GENERALS.deputies.byId[id]) return;
    if (id === G.leader || G.deputies.indexOf(id) >= 0 || G.special === id || G.dead.indexOf(id) >= 0) return;
    if (o.special) { G.special = id; var d = GENERALS.deputies.get(id); if (d.card) addCard(d.card, false); return; }
    var ai = G.away.indexOf(id); if (ai >= 0) G.away.splice(ai, 1);
    var full = G.deputies.length >= B.DEPUTY_SLOTS;
    if (!full && !o.optional) { addDeputy(id); return; }
    var item = { kind: 'pickGeneral', reason: full ? 'replace' : 'optional', incoming: GENERALS.deputies.get(id),
      candidates: full ? G.deputies.map(function (x) { return { general: GENERALS.deputies.get(x) }; }) : [{ general: GENERALS.deputies.get(id) }] };
    if (pend) pend.push(item); else front([item]);
  }

  /* ================================================================ op (판 맥락) */
  function applyOps(ops, ctx) {
    ctx = ctx || {};
    var outer = pend === null;
    if (outer) pend = [];
    try {
      var queue = (ops || []).slice();
      while (queue.length) {
        var op = queue.shift();
        if (!op) continue;
        if (COMBAT_OPS[op.op]) throw new Error('Run: 전투 전용 op ‘' + op.op + '’를 판에서 만났다');
        applyOp(op, ctx, queue);
      }
    } finally {
      if (outer) { var items = pend; pend = null; front(items); }
    }
  }
  function applyOp(op, ctx, queue) {
    switch (op.op) {
      case 'suspicion': G.suspicion = clamp(G.suspicion + (op.n || 0), 0, B.SUSP_MAX); trace(); break;
      case 'ration': {
        var n = op.n || 0;
        if (n > 0 && ctx.event) G.relics.forEach(function (id) { var r = GENERALS.relics.get(id); if (r.runMods && r.runMods.eventRationBonus) n += r.runMods.eventRationBonus; });
        G.ration = Math.max(0, G.ration + n); break;
      }
      case 'hp': {
        if (op.max) { G.maxHp = Math.max(1, G.maxHp + op.max); }
        var h = op.n || 0;
        if (op.pct) h += Math.floor(G.maxHp * op.pct + 1e-9);
        G.hp = clamp(G.hp + h, 1, G.maxHp);
        break;
      }
      case 'addCard': {
        for (var k = 0; k < (op.n || 1); k++) {
          var id = op.id;
          if (!id) {
            var pool = (op.pool ? CARDS.pool(op.pool) : CARDS.list).filter(function (c) { return c.rarity !== null; });
            var pc = Core.pick(G.rng, pool); if (!pc) break; id = pc.id;
          }
          addCard(id, !!op.up);
        }
        break;
      }
      case 'removeCard': {
        var left = op.all ? 1e9 : (op.n || 1);
        for (var i = G.deck.length - 1; i >= 0 && left > 0; i--) {
          var c = card(G.deck[i].id);
          if (op.id && c.id !== op.id) continue;
          if (op.tag && (c.tags || []).indexOf(op.tag) < 0) continue;
          if (op.pool && c.pool !== op.pool) continue;
          G.deck.splice(i, 1); left--;
        }
        ensureDeckMin();
        break;
      }
      case 'upgrade': {
        var cands = G.deck.filter(function (d) { return upgradable(d) && (!op.id || d.id === op.id); });
        if (!cands.length) break;
        if (op.choose) { pend.push(pickCardItem('upgrade', op.n || 1, cands, false)); break; }
        for (var u = 0; u < (op.n || 1) && cands.length; u++) {
          var pick = op.id ? cands[0] : Core.pick(G.rng, cands);
          pick.up = true; cands.splice(cands.indexOf(pick), 1);
        }
        break;
      }
      case 'relic':
        if (op.remove) { var ri = G.relics.indexOf(op.id); if (ri >= 0) G.relics.splice(ri, 1); }
        else gainRelic(op.id, !!op.up);
        break;
      case 'flag': {
        var before = G.flags[op.key];
        var val = (op.add != null) ? ((Number(before) || 0) + op.add) : (op.value === undefined ? true : op.value);
        G.flags[op.key] = val;
        if (op.key === 'chilcheon' && val === true && before !== true) pend.push(task('chilcheon'));
        break;
      }
      case 'leave': leave(op.id, !!op.dead); break;
      case 'cond': { var br = evalCond(op.if) ? op.then : op.else; if (br && br.length) { for (var j = br.length - 1; j >= 0; j--) queue.unshift(br[j]); } break; }
      case 'fx': break;
      case 'score': G.scoreAdj += op.n || 0; break;
      case 'battle': pend.push.apply(pend, battleItems({ enc: op.enc, type: op.type || null, terrain: op.terrain || null, hpDelta: op.hpDelta || 0,
        mods: op.mods || null, handlers: op.handlers || null, onWin: op.onWin || null, onLose: op.onLose || 'nanse', reward: op.reward !== false, fromNode: false })); break;
      case 'recruit': recruit(op.id, { optional: !!op.optional, special: !!op.special }); break;
      case 'ending': pend.push(task('ending', { id: op.id })); break;
      case 'offer': {
        var list;
        if (op.ids) list = op.ids.map(function (x) { return card(x); });
        else {
          var src = CARDS.pool(op.pool || 'common').filter(function (c) { return c.rarity !== null; });
          list = []; var bag = src.slice();
          for (var o = 0; o < (op.n || 3) && bag.length; o++) { var pk = Core.pick(G.rng, bag); bag.splice(bag.indexOf(pk), 1); list.push(pk); }
        }
        pend.push({ kind: 'pickCard', reason: 'offer', n: op.pick || 1, canSkip: true,
          candidates: list.map(function (c) { return { uid: null, id: c.id, up: false, card: c }; }) });
        break;
      }
      default: throw new Error('Run: 모르는 op ‘' + op.op + '’');
    }
  }
  function previewOps(ops) { return opsText(ops); }

  /* ================================================================ 보상 */
  function allowedPools(type) {
    var p = ['common', 'tactic'], lane = G.flags.lane2, nd = G.nodeId ? MAPDATA.nodes.byId[G.nodeId] : null;
    if ((G.act === 2 && lane === 'sea') || G.act >= 5 || G.leader === 'yi') p.push('navy');
    if ((G.act === 2 && lane === 'land') || (nd && ['경상', '전라', '충청'].indexOf(nd.do) >= 0)) p.push('uibyeong');
    if (type === 'siege') p.push('siege');
    if (G.act >= 3) p.push('ming');
    return p;
  }
  function rewardCards(n, minRare, type) {
    var R = B.REWARD, pools = allowedPools(type), out = [], leaderCards = GENERALS.leaders.get(G.leader).cards || [];
    var counts = {}; G.deck.forEach(function (d) { counts[d.id] = (counts[d.id] || 0) + 1; });
    function cands(rar) {
      return CARDS.list.filter(function (c) { return pools.indexOf(c.pool) >= 0 && (!rar || c.rarity === rar) && c.rarity !== null && out.indexOf(c.id) < 0; });
    }
    for (var k = 0; k < n; k++) {
      var chosen = null;
      if (k === 0 && Core.rand(G.rng) < R.leaderChance) {
        var lc = leaderCards.filter(function (id) { return out.indexOf(id) < 0; });
        chosen = Core.pick(G.rng, lc);
      }
      if (!chosen) {
        var x = Core.rand(G.rng), rar = x < R.common ? 'common' : (x < R.common + R.rare ? 'rare' : 'special');
        if (minRare && rar === 'common') rar = 'rare';
        var list = cands(rar); if (!list.length) list = cands(null);
        var c = Core.weighted(G.rng, list.map(function (cd) { return { w: (counts[cd.id] || 0) >= 2 ? 1 : 2, v: cd.id }; }));
        chosen = c;
      }
      if (chosen) { out.push(chosen); G.stats.cardsOffered[chosen] = (G.stats.cardsOffered[chosen] || 0) + 1; }
    }
    return out;
  }
  function makeReward(info) {
    var ration, relic = null;
    if (info.boss) ration = B.RATION_BOSS;
    else if (info.elite) ration = B.RATION_ELITE;
    else ration = Core.randInt(G.rng, B.RATION_FIGHT[0], B.RATION_FIGHT[1]);
    if (info.boss && info.reward && info.reward.relic && G.relics.indexOf(info.reward.relic) < 0) relic = info.reward.relic;
    else if (info.elite && !info.boss) {
      var el = GENERALS.relics.list.filter(function (r) { return r.src === 'elite' && G.relics.indexOf(r.id) < 0; });
      var pr = Core.pick(G.rng, el);
      if (pr) relic = pr.id; else ration += B.RATION_NO_RELIC;
    }
    G.ration += ration;
    if (relic) gainRelic(relic, false);
    // 결전 갈래 보상의 군량 op(탄금대 +20, 충주성 −20 등)는 보상을 만들 때 바로 적용한다 — 화면에 보이는 값 = 실제로 받는 값.
    // afterBattle 은 이 군량 op 를 뒤 작업에서 뺀다. 군량 op 는 난수를 쓰지 않으므로 순서가 바뀌어도 결과는 같다.
    var bonus = 0;
    if (info.boss && info.reward && info.reward.ops) info.reward.ops.forEach(function (o) { if (o && o.op === 'ration') bonus += o.n || 0; });
    if (bonus) G.ration = Math.max(0, G.ration + bonus);
    var ids = rewardCards(B.REWARD.cards, !!info.boss, info.type);
    return { kind: 'reward', cards: ids.map(card), cardIds: ids, relic: relic ? GENERALS.relics.get(relic) : null, ration: ration,
      bonusRation: bonus, bonusText: bonus ? bonusWhy(info, bonus) : '',
      skipBonus: B.RATION_SKIP, elite: !!info.elite, boss: !!info.boss };
  }
  function bonusWhy(info, n) {
    var X = T(), R = (X && X.rewardBonus) || {};
    if (info.encId === 'boss_konishi' && R[G.flags.b1 || 'river']) return R[G.flags.b1 || 'river'];
    return n > 0 ? (R.plus || '결전의 전리품') : (R.minus || '결전에 쓴 군량');
  }
  function pickCardItem(reason, n, cands, canSkip) {
    return { kind: 'pickCard', reason: reason, n: n, canSkip: !!canSkip,
      candidates: cands.map(function (d) { return { uid: d.uid, id: d.id, up: !!d.up, card: card(d.id) }; }) };
  }

  /* ================================================================ 전투 */
  function terrainMods(id) { var t = MAPDATA.terrains.byId[id]; return t ? Core.clone(t.mods || {}) : {}; }
  function battleItems(spec) {
    var items = [], nd = MAPDATA.nodes.byId[G.nodeId] || null;
    var encId = spec.enc;
    var enc = ENEMIES.encounters.byId[encId];
    var X = T(), bi = X && X.scroll && X.scroll.bossIntro ? X.scroll.bossIntro[encId] : null;
    var showIntro = enc && (enc.boss || enc.elite || (enc.mods && enc.mods.tutorial));
    if (showIntro && (bi || enc.intro)) {
      items.push({ kind: 'scroll', key: 'bossIntro', encId: encId, title: (bi && bi.title) || (enc.intro && enc.intro.title) || enc.name,
        lines: (bi && bi.lines) ? bi.lines.slice() : (enc.intro && enc.intro.memo ? [enc.intro.memo] : []),
        memo: (bi && bi.memo) || null, date: (bi && bi.date) || (nd ? nd.date : null) });
    }
    items.push({ kind: 'battle', spec: spec, req: null });
    items.push(task('afterBattle', { spec: spec }));
    return items;
  }
  function buildReq(node, spec) {
    spec = spec || {};
    node = node || MAPDATA.nodes.byId[G.nodeId] || { id: null, type: null, terrain: 'none', do: null };
    var encId = spec.enc || node.enc || node.bossEnc;
    var seed = Core.randInt(G.rng, 1, 0x7fffffff);
    var uidCounter = G.uidCounter;
    var b = ENEMIES.build(encId, G.act, G.rng, null);
    var type = spec.type || node.type || b.type;
    var terrain = spec.terrain || node.terrain || 'none';
    var mods = terrainMods(terrain), k, F = G.flags;
    for (k in b.mods) mods[k] = b.mods[k];
    if (spec.mods) for (k in spec.mods) mods[k] = spec.mods[k];
    var reward = b.reward ? Core.clone(b.reward) : { relic: null, ops: [] };
    if (!reward.ops) reward.ops = [];
    var waves = b.waves ? Core.clone(b.waves) : null;
    if (encId === 'boss_konishi') {
      var b1 = F.b1 || 'river';
      if (b1 === 'ridge') { terrain = 'ridge'; var rm = terrainMods('ridge'); for (k in rm) mods[k] = rm[k]; reward.relic = 'joryeong_stone'; }
      else if (b1 === 'fort') { type = 'siege'; terrain = 'fort'; reward.ops.push({ op: 'ration', n: -20 }); }
      else { terrain = 'river'; mods.noPush = true; mods.momentum = B.RIVER_MOMENTUM; mods.chargeCostDelta = -1; reward.ops.push({ op: 'ration', n: 20 }); }
    }
    if (encId === 'boss_myeongnyang') {
      if (F.chilcheon) {
        mods.costOverride = { twelve_ships: 0, pilsa_jeuksaeng: 0 };
        mods.dmgBonus = (mods.dmgBonus || []).concat([{ n: B.MYEONGNYANG.miracleNavyBonus, if: { cardTag: 'navy' } }]);
      } else {
        mods.bossHp = { todo: B.MYEONGNYANG.todoHpNoChilcheon };
        mods.reinforceEvery = B.MYEONGNYANG.reinforceEveryNoChilcheon;
      }
      if (F.b6_scouts) mods.startHand = (mods.startHand || []).concat([{ id: 'scout_boat' }, { id: 'scout_boat' }]);
      if (F.b6_block) mods.startBlock = (mods.startBlock || 0) + F.b6_block;
      if (F.b6_momentum) mods.momentum = (mods.momentum || 0) + F.b6_momentum;
    }
    if (encId === 'boss_noryang') {
      if (F.b7_p2Hp) mods.bossHpDelta = { shimazu_p2: F.b7_p2Hp };
      if (F.b7_mingExtra && waves && waves[1]) {
        var extra = ['chen_lin_bombard', 'deng_zilong', 'ming_navy_square'];
        for (var e = 0; e < F.b7_mingExtra; e++) waves[1].onStart.push({ op: 'addCard', id: extra[e % 3], where: 'hand', free: true, generated: true });
      }
      if (F.dokjeon) mods.startHand = (mods.startHand || []).concat([{ id: 'dokjeon', free: true }]);
    }
    if (encId === 'boss_jiksan' && F.boss5HpPct) mods.enemyHpPct = F.boss5HpPct;
    if (F.wonGyun) mods.wonGyun = true;
    var req = {
      seed: seed, uidCounter: uidCounter, act: G.act, nodeId: node.id || null, type: type, terrain: terrain, do: node.do || null,
      encId: encId, elite: !!(b.elite || node.elite || node.kind === 'elite'), boss: !!b.boss,
      enemies: b.enemies, waves: waves, reinforce: b.reinforce, handlers: (b.handlers || []).concat(spec.handlers || []),
      reward: reward, intro: b.intro, mods: mods,
      deck: G.deck.map(function (d) { return { uid: d.uid, id: d.id, up: !!d.up }; }),
      relics: G.relics.slice(), relicUp: Core.clone(G.relicUp), leader: G.leader, deputies: G.deputies.slice(), special: G.special,
      hp: Math.max(1, G.hp + (spec.hpDelta || 0)), maxHp: G.maxHp, ration: G.ration, suspicion: G.suspicion, flags: Core.clone(G.flags)
    };
    return req;
  }
  function applyResult(res) {
    G.hp = clamp(res.hp, 0, res.maxHp || G.maxHp); G.maxHp = res.maxHp || G.maxHp;
    G.ration = Math.max(0, res.ration);
    G.suspicion = clamp(G.suspicion + (res.suspicionDelta || 0), 0, B.SUSP_MAX);
    (res.deckChanges || []).forEach(function (ch) {
      if (ch.op === 'remove') removeUid(ch.uid);
      else if (ch.op === 'add') addCard(ch.id, !!ch.up);
    });
    (res.generalsLost || []).forEach(function (id) { leave(id, true); });
    if (res.rescued) { G.flags.rescuedUsed = true; G.stats.rescued++; }
    var fo = res.flagsOut || {}; for (var k in fo) G.flags[k] = fo[k];
    var st = res.stats || {};
    G.stats.turns += res.turns || 0;
    G.stats.edictsPlayed += st.edictsPlayed || 0;
    var cp = st.cardsPlayed || {}; for (var c in cp) G.stats.cardsPlayed[c] = (G.stats.cardsPlayed[c] || 0) + cp[c];
    G.stats.pushes += st.pushes || 0;
    if (st.distTurns) for (var d = 0; d < 3; d++) G.stats.distTurns[d] += st.distTurns[d] || 0;
    if (st.intentChecks) { G.stats.intentOk += st.intentChecks.ok || 0; G.stats.intentBad += st.intentChecks.bad || 0; }
    if (st.turnCapHit) G.stats.turnCapHits++;
    ensureDeckMin();
    trace();
  }
  function afterBattle(args) {
    var spec = args.spec, res = G.lastResult, info = G.lastBattle || {};
    G.lastResult = null;
    if (!res || !res.won) {
      if (res && spec.onLose === 'continue') { applyResult(res); G.hp = Math.max(1, G.hp); return; }
      if (res) { G.hp = 0; G.stats.lastBattle = { encId: info.encId, turns: res.turns }; }
      G.queue = [task('ending', { id: 'nanse' })];
      return;
    }
    applyResult(res);
    G.stats.fights++;
    if (info.elite && !info.boss) { G.stats.elites++; G.suspicion = clamp(G.suspicion + B.WIN_SUSP.elite, 0, B.SUSP_MAX); }
    if (info.boss) {
      G.stats.bosses++; G.suspicion = clamp(G.suspicion + B.WIN_SUSP.boss, 0, B.SUSP_MAX);
      G.stats.perBoss[info.encId] = { turns: res.turns, hp: res.hp };
      var X = T();
      if (X && X.compare && X.compare[info.encId]) { try { actLog().compare.push(X.compare[info.encId](res.stats || {})); } catch (e) { /* 문장 실패 무시 */ } }
    }
    trace();
    actLog().fights.push({ node: info.nodeId, enc: info.encId, won: true, turns: res.turns });
    var items = [];
    pend = [];
    try {
      if (spec.fromNode) { var nd = MAPDATA.nodes.byId[info.nodeId]; if (nd && nd.onWin && nd.onWin.length) applyOps(nd.onWin, {}); }
    } finally { items = items.concat(pend); pend = null; }
    var rOps = (info.boss && info.reward && info.reward.ops) || [];
    if (spec.reward !== false) {
      items.push(makeReward({ boss: info.boss, elite: info.elite, reward: info.reward, type: info.type, encId: info.encId }));
      rOps = rOps.filter(function (o) { return !o || o.op !== 'ration'; });   // 군량은 makeReward 가 이미 적용했다
    }
    if (rOps.length) items.push(task('ops', { ops: rOps }));
    if (spec.onWin && spec.onWin.length) items.push(task('ops', { ops: spec.onWin }));
    if (info.boss) items.push(meritItem());
    front(items);
  }

  /* ================================================================ 장계 분배 */
  function meritItem() {
    var slots = ['leader', 'king'];
    if (G.act >= B.MERIT.mingMinAct) slots.push('ming');
    var X = T();
    return { kind: 'merit', slots: slots, total: B.MERIT.total, defaults: Core.clone(B.MERIT.default), texts: X && X.merit ? X.merit : null };
  }
  function applyMerit(alloc) {
    var M = B.MERIT, l = Math.max(0, Math.floor(alloc.leader || 0)), kg = Math.max(0, Math.floor(alloc.king || 0)), mg = Math.max(0, Math.floor(alloc.ming || 0));
    if (G.act < M.mingMinAct) { kg += mg; mg = 0; }
    var sum = l + kg + mg;
    if (sum !== M.total) { l = M.default.leader; kg = M.total - l; mg = 0; }
    var ups = Math.min(M.leaderMaxUp, Math.floor(l / M.leaderPer));
    var sUp = l >= 10 ? M.leaderSusp10 : (l >= 5 ? M.leaderSusp5 : 0);
    var kSteps = Math.floor(kg / M.kingPer), down = Math.min(M.kingMaxDown, kSteps);
    G.suspicion = clamp(G.suspicion + sUp - down, 0, B.SUSP_MAX);
    G.ration += kSteps * M.kingRation;
    if (mg > 0) { G.flags.mingDiscount = Math.min(M.mingMaxDiscount, Math.floor(mg / M.mingPer)); G.flags.mingDiscountAct = G.act + 1; }
    trace();
    var cands = G.deck.filter(upgradable);
    if (ups > 0 && cands.length) front([pickCardItem('upgrade', ups, cands, false)]);
  }

  /* ================================================================ 의심 문턱 (§6.5) */
  function scrollItem(key, extra) {
    var X = T(), s = X && X.scroll ? X.scroll[key] : null;
    if (typeof s === 'function') s = s(extra || {});
    var o = { kind: 'scroll', key: key, title: (s && s.title) || '', lines: (s && s.lines) ? s.lines.slice() : [], memo: (s && s.memo) || null, date: null, encId: null };
    if (extra) {
      for (var k in extra) if (k !== 'name') o[k] = extra[k];
      if (extra.name) {                                            // '{name:iga}' 같은 조사 자리표까지 TXT.fill 로 채운다
        var fillName = function (l) { return X && X.fill ? X.fill(l, { name: extra.name }) : String(l).replace(/\{name(:\w+)?\}/g, extra.name); };
        o.title = fillName(o.title); o.lines = o.lines.map(fillName);
      }
    }
    return o;
  }
  function suspicionCheck() {
    var items = [];
    B.SUSP_THRESH.forEach(function (t) { if (G.suspicion < t) G.thresholds[t] = false; });
    for (var i = 0; i < B.SUSP_THRESH.length; i++) {
      var t = B.SUSP_THRESH[i];
      if (G.thresholds[t] || G.suspicion < t) continue;
      G.thresholds[t] = true;
      if (t === 4) {
        if (edictCount() < B.EDICT_CAP) { addCard('edict_advance', false); items.push(scrollItem('thresh4')); }
        else items.push(scrollItem('edictFull'));
      } else if (t === 7) {
        if (edictCount() < B.EDICT_CAP) { addCard(Core.pick(G.rng, ['edict_blame', 'edict_arrest', 'edict_envy']), false); items.push(scrollItem('thresh7')); }
        else items.push(scrollItem('edictFull'));
      } else {
        items.push(scrollItem('thresh10'));
        if (G.deputies.length) {
          var who = Core.pick(G.rng, G.deputies);
          var nm = deputyName(who);
          leave(who, true);
          items.push(scrollItem('prison', { name: nm }));
        } else {
          G.maxHp = Math.max(1, G.maxHp + B.PRISON_NO_DEPUTY_MAXHP); G.hp = Math.min(G.hp, G.maxHp);
          items.push(scrollItem('prison_none'));
        }
        G.suspicion = B.PRISON_RESET; G.thresholds[10] = false;
      }
    }
    trace();
    front(items);
  }

  /* ================================================================ 마디 */
  function nodeView(id) {
    var n = MAPDATA.nodes.get(id), o = {};
    for (var k in n) o[k] = n[k];
    (n.variants || []).some(function (v) {
      if (!evalCond(v.if)) return false;
      for (var pk in v.patch) { if (v.patch[pk] === null) delete o[pk]; else o[pk] = v.patch[pk]; }
      return true;
    });
    delete o.variants;
    return o;
  }
  function reachable() { return G.nodeId ? MAPDATA.next(G.nodeId, G.flags) : MAPDATA.first(G.act, G.flags); }
  function mapPrompt() {
    var reach = reachable(), a = MAPDATA.acts[G.act], X = T(), ta = X && X.act ? X.act[G.act] : null;
    var ids = [];
    a.cols.forEach(function (col) { col.forEach(function (id) { ids.push(id); }); });
    return {
      kind: 'map', act: G.act,
      actInfo: { act: G.act, no: a.no, name: a.name, title: a.title, period: a.period, bg: a.bg, lanes: !!a.lanes, era: ta ? ta.era : '', intro: ta ? ta.intro : [] },
      nodes: ids.map(function (id) {
        var v = nodeView(id);
        v.state = G.path.indexOf(id) >= 0 ? (id === G.nodeId ? 'current' : 'done') : (reach.indexOf(id) >= 0 ? 'open' : 'closed');
        return v;
      }),
      reachable: reach.slice(), path: G.path.slice(), lane: G.flags.lane2 || null
    };
  }
  function eventPrompt(id) {
    var ev = EVENTS.get(id), title = ev.title, text = ev.text, choices = ev.choices;
    (ev.variants || []).some(function (v) {
      if (!evalCond(v.if)) return false;
      if (v.patch.title) title = v.patch.title;
      if (v.patch.text) text = v.patch.text;
      if (v.patch.choices) choices = v.patch.choices;
      return true;
    });
    var list = [];
    choices.forEach(function (c) {
      var ok = !c.if || evalCond(c.if);
      if (!ok && c.hidden) return;
      list.push({ text: c.text, enabled: ok, reason: ok ? '' : (c.reason || '조건이 맞지 않는다'), preview: c.preview || opsText(c.ops), ops: c.ops || [] });
    });
    if (list.length && !list.some(function (c) { return c.enabled; })) {
      if (typeof console !== 'undefined') console.error('Run: 사건 ' + id + ' 의 선택지가 모두 막혀 첫째를 연다');
      list[0].enabled = true;
    }
    // 머리글용 날짜·장소: 이 마디 자신의 사건일 때만(변형이 적용된 마디 값). 막 끝 사건은 null — 본문이 제 날짜를 말한다.
    var nv = G.nodeId ? nodeView(G.nodeId) : null, own = !!(nv && (nv.eventId === id || nv.courtEvent === id));
    return { kind: 'event', eventId: id, title: title, text: text.slice(), choices: list, nodeId: G.nodeId, memo: ev.memo || null,
      date: own ? (nv.date || null) : null, place: own ? (nv.name || null) : null };
  }
  function enterNode(id) {
    var n = nodeView(id);
    G.nodeId = id; G.col = n.col; G.path.push(id); G.stats.nodes++;
    if (n.lane && G.act === 2 && n.col === 1) G.flags.lane2 = n.lane;
    var l = actLog(); if (n.date) l.dates.push(n.date);
    var items = [];
    switch (n.kind) {
      case 'fight': case 'elite': case 'boss':
        items = battleItems({ enc: n.enc || n.bossEnc, type: n.type || null, terrain: n.terrain || null, fromNode: true, reward: true, onLose: 'nanse', onWin: null });
        items.push(task('suspCheck'));
        break;
      case 'event':
        items = [eventPrompt(n.eventId), task('suspCheck')];
        break;
      case 'court':
        if (n.courtEvent) items.push(eventPrompt(n.courtEvent), task('suspCheck'));
        items.push({ kind: 'court', nodeId: id }, task('suspCheck'));
        break;
      case 'camp': items = [campPrompt()]; break;
      case 'shop': G.shop = makeShop(); items = [{ kind: 'shop' }]; break;
      case 'council': G.council = { page: 1, left: { ration: 1, removeReport: B.COUNCIL.maxRemove, brush: 1 }, verdict: null }; items = [{ kind: 'council' }, task('suspCheck')]; break;
      default: break;
    }
    items.push(task('afterNode'));
    front(items);
  }
  function afterNode() {
    var items = [];
    if (G.act === 5 && G.col === 1) {
      if (G.flags.wonGyun) G.flags.wonGyun = false;
      if (G.away.length) {
        var back = G.away.slice(); G.away = [];
        pend = [];
        try { back.forEach(function (id) { recruit(id, {}); }); } finally { items = items.concat(pend); pend = null; }
        items.unshift(scrollItem('return_tongjesa'));
      }
    }
    trace();
    if (MAPDATA.next(G.nodeId, G.flags).length) { items.push({ kind: 'map' }); front(items); return; }
    if (G.act === 7) { G.queue = items.concat([task('ending', { id: G.flags.dokjeon ? 'silrok' : 'jingbi' })]); return; }
    items.push({ kind: 'actEnd', act: G.act });
    var ee = MAPDATA.acts[G.act].endEvent, evId = null;
    if (ee) evId = (G.flags.lane2 && ee[G.flags.lane2]) || ee.default || null;
    if (evId) items.push(eventPrompt(evId), task('suspCheck'));
    items.push(task('nextAct'));
    front(items);
  }
  function actEndPrompt(act) {
    var l = G.actLog[act] || { fights: [], suspTrace: [], gained: { cards: [], relics: [] }, choices: [], compare: [], dates: [] };
    var a = MAPDATA.acts[act];
    return { kind: 'actEnd', act: act, summary: { no: a.no, title: a.title, period: a.period, dates: l.dates.slice(), fights: l.fights.slice(),
      suspTrace: l.suspTrace.slice(), gained: Core.clone(l.gained), choices: l.choices.slice(), compare: l.compare.slice(),
      hp: G.hp, maxHp: G.maxHp, ration: G.ration, suspicion: G.suspicion } };
  }
  function onActStart() {
    actLog();
    if (G.act >= 2) {
      var famed = false;
      [G.leader].concat(G.deputies, G.special ? [G.special] : []).forEach(function (id) {
        var g = GENERALS.leaders.byId[id] && id === G.leader ? GENERALS.leaders.byId[id] : GENERALS.deputies.byId[id];
        if (g && g.famed) famed = true;
      });
      if (famed) G.suspicion = clamp(G.suspicion + B.FAMED_ACT_SUSP, 0, B.SUSP_MAX);
    }
    G.relics.forEach(function (id) { var r = GENERALS.relics.get(id); if (r.runMods && r.runMods.actStartOps) applyOps(r.runMods.actStartOps, {}); });
    var healed = 0;
    if (G.act >= 2 && B.ACT_HEAL_PCT) { healed = Math.floor((G.maxHp - G.hp) * B.ACT_HEAL_PCT + 1e-9); G.hp = Math.min(G.maxHp, G.hp + healed); }
    if (G.flags.mingDiscountAct !== G.act) G.flags.mingDiscount = 0;
    if (G.flags.mingCostDeltaUntilAct != null && G.act > G.flags.mingCostDeltaUntilAct) G.flags.mingCostDelta = 0;
    trace();
    var X = T(), ta = X && X.act ? X.act[G.act] : null, a = MAPDATA.acts[G.act];
    var intro = ta && ta.intro ? ta.intro.slice() : [];
    if (healed > 0) intro.push('흩어졌던 군사를 수습했다. 병력 +' + healed + '.');
    front([{ kind: 'scroll', key: 'actIntro', title: a.act + '막 · ' + a.title, lines: intro, memo: a.period, date: null, encId: null, healed: healed },
      task('suspCheck')]);
  }
  function nextAct() {
    G.act++; G.nodeId = null; G.col = 0; G.path = [];
    G.stats.actReached = G.act;
    front([task('actStart'), { kind: 'map' }]);
  }
  function chilcheon() {
    G.deck = G.deck.filter(function (d) { return (card(d.id).tags || []).indexOf('navy') < 0; });
    addCard('twelve_ships', false); addCard('pilsa_jeuksaeng', false);
    ensureDeckMin();
    leave('yi_eokgi', true);
    front([scrollItem('chilcheon')]);
  }

  /* ================================================================ 군영·시장·조정 */
  function campPrompt() {
    var X = T(), opts = (EVENTS.camp && EVENTS.camp.options) || [{ id: 'rest', text: '휴식' }, { id: 'train', text: '훈련' }, { id: 'farm', text: '농사' }];
    var heal = Math.floor(G.maxHp * B.CAMP.restPct + 1e-9), canTrain = G.deck.some(upgradable);
    return { kind: 'camp', nodeId: G.nodeId, enter: EVENTS.camp && EVENTS.camp.lines ? EVENTS.camp.lines.enter : '',
      options: opts.map(function (o) {
        var en = true, pv = '';
        if (o.id === 'rest') { en = G.hp < G.maxHp; pv = '병력 +' + Math.min(heal, G.maxHp - G.hp); }
        if (o.id === 'train') { en = canTrain; pv = '카드 1장 강화'; }
        if (o.id === 'farm') { pv = '군량 +' + B.CAMP.farm; }
        return { id: o.id, text: o.text, desc: o.desc || '', enabled: en, reason: en ? '' : (o.id === 'rest' ? '병력이 가득하다' : '강화할 카드가 없다'), preview: pv };
      }) };
  }
  function cardPrice(c) {
    var P = B.SHOP.card, p = c.pool === 'leader' ? P.leader : (P[c.rarity] || P.common);
    return discounted(p);
  }
  function discounted(p) {
    var d = 0; G.relics.forEach(function (id) { var r = GENERALS.relics.get(id); if (r.runMods && r.runMods.shopDiscount) d = Math.max(d, r.runMods.shopDiscount); });
    return Math.floor(p * (1 - d) + 1e-9);
  }
  function makeShop() {
    var ids = rewardCards(B.SHOP.cards, false, null);
    var rel = GENERALS.relics.list.filter(function (r) { return (r.src === 'shop' || r.src === 'elite') && G.relics.indexOf(r.id) < 0; });
    var rs = [];
    for (var i = 0; i < B.SHOP.relics && rel.length; i++) { var r = Core.pick(G.rng, rel); rel.splice(rel.indexOf(r), 1); rs.push(r.id); }
    return { cards: ids.map(function (id) { return { id: id, price: cardPrice(card(id)), sold: false }; }),
      relics: rs.map(function (id, k) { return { id: id, price: discounted(B.SHOP.relic[Math.min(k, B.SHOP.relic.length - 1)]), sold: false }; }),
      removeUsed: false };
  }
  function shopPrompt() {
    var S = G.shop;
    return { kind: 'shop', nodeId: G.nodeId, ration: G.ration,
      cards: S.cards.map(function (c) { return { id: c.id, card: card(c.id), price: c.price, sold: c.sold, affordable: G.ration >= c.price }; }),
      relics: S.relics.map(function (r) { return { id: r.id, relic: GENERALS.relics.get(r.id), price: r.price, sold: r.sold, affordable: G.ration >= r.price }; }),
      removePrice: discounted(B.SHOP.remove), removeEdictPrice: discounted(B.SHOP.removeEdict), removeUsed: S.removeUsed,
      deck: G.deck.map(function (d) { return { uid: d.uid, id: d.id, up: d.up, card: card(d.id) }; }) };
  }
  function recruitCands(nodeId) {
    var n = MAPDATA.nodes.byId[nodeId];
    return ((n && n.recruits) || []).filter(function (id) {
      return GENERALS.deputies.byId[id] && id !== G.leader && G.deputies.indexOf(id) < 0 && G.special !== id && G.away.indexOf(id) < 0 && G.dead.indexOf(id) < 0;
    });
  }
  function courtPrompt(nodeId) {
    var C = EVENTS.court || {}, opts = C.options || [], rc = recruitCands(nodeId);
    var ming = null;
    if (G.act >= B.COURT.requestMinAct) {
      var pool = CARDS.pool('ming').filter(function (c) { return c.rarity !== null; });
      var have = {}; G.deck.forEach(function (d) { have[d.id] = 1; });
      pool.sort(function (a, b) { return (have[a.id] ? 1 : 0) - (have[b.id] ? 1 : 0); });
      var fresh = pool.filter(function (c) { return !have[c.id]; }), bag = (fresh.length >= B.COURT.requestPick ? fresh : pool).slice();
      ming = [];
      var r = Core.rngNew(G.seed + '|court|' + nodeId);          // 조회만으로 판 난수를 쓰지 않게 마디별 고정 시드
      for (var i = 0; i < B.COURT.requestPick && bag.length; i++) { var c = Core.pick(r, bag); bag.splice(bag.indexOf(c), 1); ming.push(c); }
    }
    var full = G.deputies.length >= B.DEPUTY_SLOTS;
    return { kind: 'court', nodeId: nodeId, enter: C.lines ? C.lines.enter : '',
      options: [
        { id: 'report', text: (opts[0] && opts[0].text) || '장계 올리기', desc: (opts[0] && opts[0].desc) || '', enabled: true, reason: '', preview: '의심 ' + (B.COURT.report < 0 ? '−' + (-B.COURT.report) : '+' + B.COURT.report) },
        { id: 'recruit', text: (opts[1] && opts[1].text) || '장수 영입', desc: (opts[1] && opts[1].desc) || '', enabled: rc.length > 0, reason: rc.length ? '' : ((opts[1] && opts[1].reasonNone) || '영입할 장수가 없다'), preview: full ? '자리가 찼다 — 한 사람과 바꾼다' : '부장 영입' },
        { id: 'request', text: (opts[2] && opts[2].text) || '명군 요청', desc: (opts[2] && opts[2].desc) || '',
          enabled: !!ming && G.ration >= B.COURT.requestCost,
          reason: !ming ? ((opts[2] && opts[2].reasonAct) || '명군은 아직 오지 않았다') : (G.ration < B.COURT.requestCost ? ((opts[2] && opts[2].reasonRation) || '군량이 모자란다') : ''),
          preview: '군량 −' + B.COURT.requestCost + ', 명군 카드 1장' }
      ],
      recruits: rc.map(function (id) { return { general: GENERALS.deputies.get(id), slotFull: full }; }),
      mingCards: ming };
  }

  /* ================================================================ 어전회의 (§6.7) */
  function councilPrompt() {
    var C = G.council, X = T(), D = X && X.council ? X.council.defenses : {};
    var reps = G.deck.filter(function (d) { return card(d.id).type === 'rep'; });
    var hasBrush = G.relics.indexOf('seoae_brush') >= 0;
    function def(id, en, reason) {
      var d = D[id] || {};
      return { id: id, text: d.text || id, effect: d.effect || '의심 −1', enabled: en && C.left[id] > 0, reason: en ? (C.left[id] > 0 ? '' : '이미 썼다') : (d.reason || reason), left: C.left[id] };
    }
    var key = C.page === 1 ? 'council1' : (C.page === 2 ? 'council2' : (C.verdict && C.verdict.dismissed ? 'council3_dismiss' : 'council3_keep'));
    var s = scrollItem(key);
    return { kind: 'council', page: C.page, title: s.title, lines: s.lines, memo: s.memo, suspicion: G.suspicion,
      dismissAt: B.COUNCIL.dismissAt,
      defenses: [def('ration', G.ration >= B.COUNCIL.rationCost, '군량이 모자란다'), def('removeReport', reps.length > 0, '장계 카드가 없다'), def('brush', hasBrush, '서애의 붓이 없다')],
      removeCandidates: reps.map(function (d) { return { uid: d.uid, id: d.id, card: card(d.id) }; }),
      verdict: C.verdict };
  }
  function councilAnswer(a) {
    var C = G.council, step = B.COUNCIL.defenseDelta;
    if (C.page === 1) { C.page = 2; front([{ kind: 'council' }]); return; }
    if (C.page === 2) {
      if (a.defend) {
        var id = a.defend;
        if (!(C.left[id] > 0)) throw new Error('Run: 쓸 수 없는 변호 ' + id);
        if (id === 'ration') { if (G.ration < B.COUNCIL.rationCost) throw new Error('Run: 군량 부족'); G.ration -= B.COUNCIL.rationCost; }
        else if (id === 'removeReport') {
          var d = G.deck.filter(function (x) { return x.uid === a.uid && card(x.id).type === 'rep'; })[0]
            || G.deck.filter(function (x) { return card(x.id).type === 'rep'; })[0];
          if (!d) throw new Error('Run: 장계 카드 없음');
          removeUid(d.uid); ensureDeckMin();
        } else if (id === 'brush') { if (G.relics.indexOf('seoae_brush') < 0) throw new Error('Run: 서애의 붓 없음'); }
        C.left[id]--;
        G.suspicion = clamp(G.suspicion + step, 0, B.SUSP_MAX); trace();
        front([{ kind: 'council' }]);
        return;
      }
      if (a.verdict) {
        var items = [];
        if (G.suspicion >= B.SUSP_MAX) { suspicionCheck(); }      // 옥사가 먼저
        var dismissed = G.suspicion >= B.COUNCIL.dismissAt;
        if (dismissed) {
          G.flags.dismissed = true;
          G.suspicion = B.COUNCIL.afterDismiss;
          if (G.leader === 'yi') { G.flags.wonGyun = true; G.suspicion = clamp(G.suspicion + B.WON_GYUN_SUSP, 0, B.SUSP_MAX); items.push(scrollItem('wonGyun')); }
          else if (G.deputies.indexOf('yi') >= 0) leave('yi', false);
        } else G.flags.dismissed = false;
        trace();
        var X = T();
        C.verdict = { dismissed: dismissed, text: X && X.council ? (dismissed ? X.council.dismiss : X.council.keep) : '' };
        C.page = 3;
        front([{ kind: 'council' }].concat(items));
        return;
      }
      throw new Error('Run: 어전회의 답이 잘못됨');
    }
    G.council = null;                                           // page 3 → 끝
  }

  /* ================================================================ 결말·점수 */
  function score() {
    var S = B.SCORE, F = G.flags, parts = [];
    function add(label, n) { if (n) parts.push({ label: label, n: n }); }
    add('지나온 마디', G.stats.nodes * S.node);
    add('정예', G.stats.elites * S.elite);
    add('결전', G.stats.bosses * S.boss);
    add('남은 병력', Math.max(0, G.hp) * S.hpMul);
    add('임금의 신임', (B.SUSP_MAX - G.suspicion) * S.suspMul);
    if (G.deck.length <= S.smallDeck.max) add('가벼운 덱', S.smallDeck.bonus);
    if (F.b1 === 'ridge' && G.stats.perBoss.boss_konishi) add('조령을 지켰다', S.branch.joryeong);
    if (F.jinju1_held) add('진주 1차 사수', S.branch.jinju1);
    if (G.act >= 5 && F.dismissed === false) add('파직을 막았다', S.branch.notDismissed);
    if (G.act >= 5 && !F.chilcheon) add('칠천량을 피했다', S.branch.noChilcheon);
    if (F.chilcheon && G.stats.perBoss.boss_myeongnyang) add('열세 척의 기적', S.branch.miracle);
    if (G.ending === 'jingbi') add('통제사 생환', S.branch.yiAlive);
    add('보정', G.scoreAdj);
    var total = 0; parts.forEach(function (p) { total += p.n; });
    return { total: total, parts: parts };
  }
  function endingItem(id) {
    G.ending = id;
    var X = T(), E = X && X.ending ? X.ending[id] : null, lines = [];
    try { lines = E && typeof E.lines === 'function' ? E.lines(G) : (E && E.lines) || []; } catch (e) { lines = []; }
    var comp = [];
    for (var a = 1; a <= 7; a++) if (G.actLog[a]) comp = comp.concat(G.actLog[a].compare || []);
    var choices = [];
    for (a = 1; a <= 7; a++) if (G.actLog[a]) G.actLog[a].choices.forEach(function (c) { choices.push(c); });
    return { kind: 'ending', id: id, act: G.act, title: (E && E.title) || id, lines: lines, score: score(), compare: comp, choices: choices,
      leader: G.leader, deputies: G.deputies.slice(), special: G.special, dead: G.dead.slice() };
  }

  /* ================================================================ 큐 진행 */
  function runTask(t) {
    var a = t.args || {};
    switch (t.task) {
      case 'enterNode': enterNode(a.nodeId); break;
      case 'afterBattle': afterBattle(a); break;
      case 'suspCheck': suspicionCheck(); break;
      case 'afterNode': afterNode(); break;
      case 'nextAct': nextAct(); break;
      case 'actStart': onActStart(); break;
      case 'chilcheon': chilcheon(); break;
      case 'ops': applyOps(a.ops || [], {}); break;
      case 'ending': G.queue = []; front([endingItem(a.id)]); break;
      default: throw new Error('Run: 모르는 작업 ' + t.task);
    }
  }
  function decorate(it) {
    switch (it.kind) {
      case 'map': return mapPrompt();
      case 'shop': return shopPrompt();
      case 'council': return councilPrompt();
      case 'court': return courtPrompt(it.nodeId);
      case 'actEnd': return actEndPrompt(it.act);
      case 'battle': {
        if (!it.req) it.req = buildReq(MAPDATA.nodes.byId[G.nodeId] || null, it.spec);
        var r = it.req, nd = G.nodeId ? MAPDATA.nodes.byId[G.nodeId] : null;
        G.lastBattle = { encId: r.encId, elite: r.elite, boss: r.boss, reward: r.reward, nodeId: G.nodeId, type: r.type };
        return { kind: 'battle', req: r, spec: it.spec, node: nd ? { id: nd.id, name: nd.name, date: nd.date, do: nd.do } : null,
          onWin: it.spec.onWin || null, onLose: it.spec.onLose || 'nanse', reward: it.spec.reward !== false };
      }
      default: return it;
    }
  }
  function advance() {
    for (var guard = 0; guard < 2000; guard++) {
      if (G.done) { return; }
      var it = G.queue.shift();
      if (!it) it = { kind: 'map' };
      if (it.kind === '_task') { runTask(it); continue; }
      if (!PROMPT_KINDS[it.kind]) throw new Error('Run: 모르는 프롬프트 ' + it.kind);
      G.prompt = decorate(it);
      if (G.prompt.kind === 'map' || G.prompt.kind === 'battle') save();
      return;
    }
    throw new Error('Run: 진행이 고리에 빠졌다');
  }

  /* ================================================================ 답 */
  function answer(a) {
    if (!G) throw new Error('Run: 판이 없다');
    var p = G.prompt;
    if (!p) throw new Error('Run: 프롬프트가 없다');
    a = a || {};
    switch (p.kind) {
      case 'map': {
        if (p.reachable.indexOf(a.nodeId) < 0) throw new Error('Run: 갈 수 없는 마디 ' + a.nodeId);
        front([task('enterNode', { nodeId: a.nodeId })]);
        break;
      }
      case 'battle': {
        if (!a.result || typeof a.result.won !== 'boolean') throw new Error('Run: 전투 결과가 없다');
        G.lastResult = a.result;
        break;
      }
      case 'event': {
        var c = p.choices[a.choice];
        if (!c || !c.enabled) throw new Error('Run: 고를 수 없는 선택지 ' + a.choice);
        actLog().choices.push({ event: p.eventId, title: p.title, choice: c.text, act: G.act });
        applyOps(c.ops, { event: true });
        break;
      }
      case 'shop': {
        var S = G.shop;
        if (a.leave) { G.shop = null; break; }
        if (a.buy === 'card') {
          var sc = S.cards[a.idx]; if (!sc || sc.sold || G.ration < sc.price) throw new Error('Run: 살 수 없는 카드');
          G.ration -= sc.price; sc.sold = true; addCard(sc.id, false); G.stats.cardsPicked[sc.id] = (G.stats.cardsPicked[sc.id] || 0) + 1;
        } else if (a.buy === 'relic') {
          var sr = S.relics[a.idx]; if (!sr || sr.sold || G.ration < sr.price) throw new Error('Run: 살 수 없는 기물');
          G.ration -= sr.price; sr.sold = true; applyOps([{ op: 'relic', id: sr.id }], {});
        } else if (a.remove) {
          if (S.removeUsed) throw new Error('Run: 카드 버리기는 한 번뿐');
          var d = G.deck.filter(function (x) { return x.uid === a.remove; })[0]; if (!d) throw new Error('Run: 없는 카드');
          var price = card(d.id).type === 'edict' ? discounted(B.SHOP.removeEdict) : discounted(B.SHOP.remove);
          if (G.ration < price) throw new Error('Run: 군량 부족');
          G.ration -= price; removeUid(d.uid); S.removeUsed = true; ensureDeckMin();
        } else throw new Error('Run: 시장 답이 잘못됨');
        front([{ kind: 'shop' }]);
        break;
      }
      case 'camp': {
        var opt = p.options.filter(function (o) { return o.id === a.pick; })[0];
        if (!opt || !opt.enabled) throw new Error('Run: 고를 수 없는 군영 선택');
        if (a.pick === 'rest') applyOps([{ op: 'hp', pct: B.CAMP.restPct }], {});
        else if (a.pick === 'farm') G.ration += B.CAMP.farm;
        else if (a.pick === 'train') front([pickCardItem('train', 1, G.deck.filter(upgradable), false)]);
        break;
      }
      case 'court': {
        var nd = MAPDATA.nodes.byId[p.nodeId], co = (nd && nd.courtOps) || {};
        var o2 = p.options.filter(function (o) { return o.id === a.pick; })[0];
        if (!o2 || !o2.enabled) throw new Error('Run: 고를 수 없는 조정 선택');
        if (a.pick === 'report') applyOps([{ op: 'suspicion', n: B.COURT.report }].concat(co.report || []), {});
        else if (a.pick === 'recruit') {
          var id = a.id || (p.recruits[0] && p.recruits[0].general.id);
          if (!p.recruits.some(function (r) { return r.general.id === id; })) throw new Error('Run: 영입 후보가 아님 ' + id);
          applyOps([{ op: 'recruit', id: id }].concat(co.recruit || []), {});
        } else if (a.pick === 'request') {
          var cid = a.cardId || (p.mingCards[0] && p.mingCards[0].id);
          if (!p.mingCards.some(function (c) { return c.id === cid; })) throw new Error('Run: 명군 요청 후보가 아님 ' + cid);
          G.ration -= B.COURT.requestCost; addCard(cid, false);
          if (co.request) applyOps(co.request, {});
        }
        actLog().choices.push({ event: 'court', title: '조정', choice: o2.text, act: G.act });
        break;
      }
      case 'reward': {
        if (a.cardIdx === null || a.cardIdx === undefined) G.ration += B.RATION_SKIP;
        else {
          var rid = p.cardIds[a.cardIdx]; if (!rid) throw new Error('Run: 없는 보상 카드');
          addCard(rid, false); G.stats.cardsPicked[rid] = (G.stats.cardsPicked[rid] || 0) + 1;
        }
        break;
      }
      case 'merit': applyMerit(a.alloc || p.defaults); break;
      case 'pickCard': {
        var picks = (a.picks || []).filter(function (i, k, arr) { return i >= 0 && i < p.candidates.length && arr.indexOf(i) === k; }).slice(0, p.n);
        if (!p.canSkip && picks.length < Math.min(p.n, p.candidates.length)) {
          for (var q = 0; picks.length < Math.min(p.n, p.candidates.length) && q < p.candidates.length; q++) if (picks.indexOf(q) < 0) picks.push(q);
        }
        picks.forEach(function (i) {
          var cd = p.candidates[i];
          if (p.reason === 'offer') { addCard(cd.id, !!cd.up); G.stats.cardsPicked[cd.id] = (G.stats.cardsPicked[cd.id] || 0) + 1; }
          else if (p.reason === 'remove') { removeUid(cd.uid); ensureDeckMin(); }
          else { G.deck.forEach(function (d) { if (d.uid === cd.uid) d.up = true; }); }
        });
        break;
      }
      case 'pickGeneral': {
        var inc = p.incoming ? p.incoming.id : null;
        if (a.id === null || a.id === undefined) break;                  // 사양
        if (p.reason === 'optional' && G.deputies.length < B.DEPUTY_SLOTS) { if (a.id === inc) addDeputy(inc); break; }
        if (G.deputies.indexOf(a.id) < 0) throw new Error('Run: 내보낼 부장이 아님 ' + a.id);
        leave(a.id, false); var ai = G.away.indexOf(a.id); if (ai >= 0) G.away.splice(ai, 1);
        addDeputy(inc);
        break;
      }
      case 'scroll': case 'actEnd': break;
      case 'council': councilAnswer(a); break;
      case 'ending': G.done = true; G.prompt = null; clearSave(); return null;
      default: throw new Error('Run: 모르는 프롬프트 ' + p.kind);
    }
    G.prompt = null;
    advance();
    return G.prompt;
  }

  /* ================================================================ 시작·저장 */
  function newRun(leaderId, seed) {
    Core.assert(GENERALS.leaders.byId[leaderId], 'Run.newRun: 없는 주장 ' + leaderId);
    G = {
      ver: Core.VERSION, seed: seed, rng: Core.rngNew(seed), uidCounter: 0, leader: leaderId, act: 1, nodeId: null, col: 0, path: [],
      hp: B.LEADER_HP[leaderId], maxHp: B.LEADER_HP[leaderId], ration: B.RATION_START, suspicion: B.SUSP_START[leaderId] || 0,
      deck: [], relics: [], relicUp: {}, deputies: [], special: null, away: [], dead: [],
      flags: {}, thresholds: { 4: false, 7: false, 10: false }, scoreAdj: 0,
      stats: { nodes: 0, fights: 0, elites: 0, bosses: 0, turns: 0, cardsOffered: {}, cardsPicked: {}, cardsPlayed: {}, rescued: 0, perBoss: {},
        actReached: 1, edictsPlayed: 0, pushes: 0, distTurns: [0, 0, 0], intentOk: 0, intentBad: 0, turnCapHits: 0, lastBattle: null },
      actLog: {}, prompt: null, queue: [], done: false, ending: null,
      shop: null, council: null, lastBattle: null, lastResult: null
    };
    CARDS.startDeck(leaderId).forEach(function (id) { G.deck.push({ uid: Core.nextUid(G), id: id, up: false }); });
    G.queue = [task('actStart'), { kind: 'map' }];
    advance();
    return G;
  }
  function save() { if (G && !G.done) Core.save(Core.SAVE_KEY, G); }
  function load() {
    var o = Core.load(Core.SAVE_KEY);
    if (!o || o.ver !== Core.VERSION || !o.prompt) { if (o) Core.clear(Core.SAVE_KEY); return false; }
    G = o; return true;
  }
  function hasSave() {
    var o = Core.load(Core.SAVE_KEY);
    if (!o || o.ver !== Core.VERSION || !o.prompt) return null;
    var nd = o.nodeId ? MAPDATA.nodes.byId[o.nodeId] : null;
    return { act: o.act, leader: o.leader, date: nd ? nd.date : null, hp: o.hp, maxHp: o.maxHp };
  }
  function clearSave() { Core.clear(Core.SAVE_KEY); }
  function state() { return G; }
  function current() { return G ? G.prompt : null; }
  function deck() { return G ? G.deck.map(function (d) { return { uid: d.uid, id: d.id, up: d.up, card: card(d.id) }; }) : []; }
  // 디버그: 그 막의 그 열 앞까지 건너뛴다(열 1이면 막 처음)
  function jump(act, col) {
    G.act = act; G.path = []; G.queue = []; G.shop = null; G.council = null;
    G.nodeId = null; G.col = 0;
    if (col > 1) { var ids = MAPDATA.colIds(act, col - 1, act === 2 ? (G.flags.lane2 || 'sea') : null); if (ids.length) { G.nodeId = ids[0]; G.col = col - 1; G.path = [ids[0]]; } }
    if (act === 2 && !G.flags.lane2) G.flags.lane2 = 'sea';
    actLog();
    G.prompt = null; G.queue = [{ kind: 'map' }]; advance();
    return G.prompt;
  }
  function setState(o) { G = o; }

  /* ================================================================ 자가 검사 */
  function autoAnswer(p, r) {
    switch (p.kind) {
      case 'map': return { nodeId: Core.pick(r, p.reachable) };
      case 'event': { var en = []; p.choices.forEach(function (c, i) { if (c.enabled) en.push(i); }); return { choice: Core.pick(r, en) }; }
      case 'shop': return { leave: true };
      case 'camp': { var o = p.options.filter(function (x) { return x.enabled; }); return { pick: Core.pick(r, o).id }; }
      case 'court': { var co = p.options.filter(function (x) { return x.enabled; }); var pk = Core.pick(r, co).id; return { pick: pk, id: p.recruits[0] ? p.recruits[0].general.id : null, cardId: p.mingCards ? p.mingCards[0].id : null }; }
      case 'reward': return { cardIdx: Core.rand(r) < 0.8 ? 0 : null };
      case 'merit': return { alloc: p.slots.length === 3 ? { leader: 4, king: 3, ming: 3 } : { leader: 4, king: 6, ming: 0 } };
      case 'pickCard': return { picks: [0] };
      case 'pickGeneral': return { id: p.candidates[0] ? p.candidates[0].general.id : null };
      case 'council': return p.page === 2 ? (p.defenses[0].enabled ? { defend: 'ration' } : { verdict: true }) : { next: true };
      default: return {};
    }
  }
  function selfTest() {
    var errors = [], kinds = {};
    try {
      for (var s = 1; s <= 6; s++) {
        var leader = s % 2 ? 'yi' : 'gwon';
        newRun(leader, 1000 + s);
        var r = Core.rngNew('rt' + s), n = 0;
        while (G && !G.done && n < 3000) {
          var p = current();
          if (!p) { errors.push('seed ' + s + ': 프롬프트 없음'); break; }
          kinds[p.kind] = (kinds[p.kind] || 0) + 1;
          if (n === 40) {                                         // 직렬화 왕복
            var snap = JSON.stringify(G);
            if (JSON.stringify(JSON.parse(snap)) !== snap) errors.push('seed ' + s + ': G 가 JSON 왕복 불가');
          }
          if (p.kind === 'battle') {                              // 가짜 결과: 대체로 이긴다, 가끔 진다
            var win = Core.rand(r) < 0.97;
            answer({ result: { won: win, hp: Math.max(1, p.req.hp - Core.randInt(r, 0, 12)), maxHp: p.req.maxHp, ration: p.req.ration,
              suspicionDelta: 0, turns: 5, flagsOut: {}, deckChanges: [], generalsLost: [], rescued: false, stats: { turns: 5 } } });
          } else answer(autoAnswer(p, r));
          n++;
          if (G.deck.length < B.DECK_MIN && !G.done) { errors.push('seed ' + s + ': 덱 하한 미달 ' + G.deck.length); break; }
        }
        if (n >= 3000) errors.push('seed ' + s + ': 3000 프롬프트 안에 끝나지 않음 (act ' + G.act + ')');
        if (errors.length > 8) break;
      }
      // 문턱 검사
      newRun('yi', 77);
      G.suspicion = 10; suspicionCheck();
      if (!G.deck.some(function (d) { return d.id === 'edict_advance'; })) errors.push('문턱 4: 진격하라가 없다');
      if (G.suspicion !== B.PRISON_RESET) errors.push('문턱 10: 의심이 7로 돌아가지 않았다');
      // 칠천량
      newRun('yi', 78); addCard('crane_wing'); addCard('turtle_ship'); G.deputies.push('yi_eokgi');
      applyOps([{ op: 'flag', key: 'chilcheon', value: true }], {});
      while (G.queue.length && G.queue[0].kind === '_task') runTask(G.queue.shift());
      if (G.deck.some(function (d) { return (card(d.id).tags || []).indexOf('navy') >= 0 && d.id !== 'twelve_ships'; })) errors.push('칠천량: 수군 카드가 남았다');
      if (G.deck.length < B.DECK_MIN) errors.push('칠천량: 덱 하한');
      if (G.deputies.indexOf('yi_eokgi') >= 0) errors.push('칠천량: 이억기가 남았다');
    } catch (e) { errors.push('예외: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 4).join(' | ')); }
    ['map', 'battle', 'event', 'reward', 'merit', 'scroll', 'actEnd', 'court', 'camp', 'shop', 'council', 'ending'].forEach(function (k) {
      if (!kinds[k]) errors.push('한 번도 나오지 않은 화면: ' + k);
    });
    G = null;
    return { ok: errors.length === 0, errors: errors, kinds: kinds };
  }

  return {
    newRun: newRun, state: state, current: current, answer: answer, save: save, load: load, hasSave: hasSave, clearSave: clearSave,
    deck: deck, score: score, applyOps: applyOps, previewOps: previewOps, buildReq: buildReq, suspicionCheck: suspicionCheck,
    afterNode: afterNode, ensureDeckMin: ensureDeckMin, evalCond: evalCond, jump: jump, setState: setState, nodeView: nodeView, selfTest: selfTest
  };
})();
