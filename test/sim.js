/**
 * 헤드리스 자동 플레이 — 징비 (계약서 §8)
 *   node test/headless.js --quiet --run test/sim.js --seeds 1-100 --leader both --bot greedy [--verbose] [--json]
 * 봇: greedy(보통 플레이어) · far(遠 유지 집착) · random(퍼징) · all
 * 출력: 완주율, 막별 누적 사망률, 전투 평균 턴, 카드 채택·사용률, 어명 사용률, 거리 체류, 분기 도달, 구출, 교착·예외 목록.
 */
'use strict';
module.exports = (ctx, win) => {
  const { Core, CARDS, Combat, Run } = ctx;
  const B = Core.BAL;
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const flag = (k) => argv.indexOf('--' + k) >= 0;
  const [s0, s1] = String(arg('seeds', '1-20')).split('-').map(Number);
  const leaders = arg('leader', 'both') === 'both' ? ['yi', 'gwon'] : [arg('leader', 'yi')];
  const bots = arg('bot', 'greedy') === 'all' ? ['greedy', 'far', 'random'] : [arg('bot', 'greedy')];
  const verbose = flag('verbose');
  const MAXP = B.SIM.maxPrompts, MAXT = B.SIM.maxBattleTurns;

  let consoleErrors = 0;
  const origErr = win.console.error;
  win.console = Object.assign({}, win.console, { error: (...a) => { consoleErrors++; if (verbose) origErr.apply(console, a); } });

  /* ------------------------------------------------------------ 전투 봇 */
  function incoming(st) {
    let s = 0; for (const r of Combat.intentPreview(st)) if (r.dmg) s += r.dmg; return s;
  }
  // 「보통 플레이어」: 이번 패로 준 피해 + 막아 낸 피해(미리 보기의 다음 적 턴 피해 차) + 처치 + 거리 가치. 군령당 효율로 비교.
  function scoreMove(st, m, kind, inc) {
    const info = Combat.cardInfo(st, m.handIdx), c = info.card;
    let best = -1e9, bestT = null;
    const targets = m.targets && m.targets.length ? m.targets : [null];
    for (const t of targets.slice(0, 5)) {
      const p = Combat.preview(st, m.handIdx, t);
      if (p.won) return { v: 1e6, t };
      let dmg = 0, kills = 0, threatKill = 0;
      p.perEnemy.forEach((d, i) => { if (d) { dmg += d; if (d >= st.enemies[i].hp) { kills++; threatKill += 4; } } });
      const avoided = inc - p.incomingAfter;
      const hpCost = Math.max(0, st.player.hp - p.hpAfter);
      let v = dmg + kills * 6 + threatKill + avoided * (st.player.hp < 30 ? 1.4 : 1.0) - hpCost * 1.2;
      const dd = st.dist - p.distAfter;
      v += dd * (kind === 'far' ? 8 : 1.5);
      if (c.type === 'rep') v += st.suspicion >= 3 ? 7 : 1.5;
      if (c.type === 'tac' && v <= 0.5) v += 2.5;
      if (c.type === 'edict' && c.id !== 'edict_advance') v += 4;
      if (info.ration) v -= info.ration * 2;
      v = v / Math.max(0.7, info.cost);
      if (v > best) { best = v; bestT = t; }
    }
    return { v: best, t: bestT };
  }
  function battleBot(st, kind, r, track) {
    let lastTurn = -1, guard = 0;
    while (st.phase !== 'done') {
      if (++guard > 6000 || st.turn > MAXT) return 'deadlock';
      if (st.turn !== lastTurn && st.phase === 'player') {
        lastTurn = st.turn;
        for (const h of st.hand) { track.inHand[h.id] = (track.inHand[h.id] || 0) + 1; }
      }
      if (st.phase === 'choose') { const n = Math.min(st.choice.n, st.choice.candidates.length); Combat.choose(st, Array.from({ length: n }, (_, i) => i)); continue; }
      if (st.phase === 'rescue') { Combat.chooseRescue(st, st.rescue.pending[0]); continue; }
      const mv = Combat.legalMoves(st);
      if (kind === 'random') {
        if (!mv.length || Core.rand(r) < 0.15) { Combat.endTurn(st); continue; }
        const m = Core.pick(r, mv); const res = Combat.play(st, m.handIdx, m.targets ? Core.pick(r, m.targets) : null);
        if (res.ok === false) throw new Error('합법 수 거부: ' + res.reason);
        continue;
      }
      if (!mv.length) { Combat.endTurn(st); continue; }
      const inc = incoming(st);
      let best = null;
      for (const m of mv) { const s = scoreMove(st, m, kind, inc); if (!best || s.v > best.v) best = { v: s.v, m, t: s.t }; }
      if (!best || best.v <= 0.4) { Combat.endTurn(st); continue; }
      const res = Combat.play(st, best.m.handIdx, best.t);
      if (res.ok === false) throw new Error('합법 수 거부: ' + res.reason);
    }
    return 'done';
  }

  /* ------------------------------------------------------------ 판 봇 */
  function deckAvgCost(G) { let s = 0; for (const d of G.deck) s += CARDS.get(d.id).cost; return s / Math.max(1, G.deck.length); }
  function answerPrompt(p, G, kind, r) {
    const rnd = kind === 'random';
    switch (p.kind) {
      case 'map': {
        if (rnd) return { nodeId: Core.pick(r, p.reachable) };
        // 병력이 낮으면 군영, 군량이 많으면 장시, 아니면 전투 우선(보통 플레이어)
        const nodes = p.reachable.map((id) => p.nodes.find((n) => n.id === id));
        if (p.act === 2 && !p.lane && nodes.some((n) => n.lane === 'sea') && nodes.some((n) => n.lane === 'land')) {
          const want = Core.rand(r) < 0.5 ? 'sea' : 'land'; return { nodeId: nodes.find((n) => n.lane === want).id };
        }
        const hpPct = G.hp / G.maxHp;
        const pref = (n) => n.kind === 'camp' ? (hpPct < 0.55 ? 5 : 1) : n.kind === 'shop' ? (G.ration >= 90 ? 4 : 0) : n.kind === 'elite' ? (hpPct > 0.7 ? 3 : -2)
          : n.kind === 'fight' ? 2 : n.kind === 'event' ? 2.5 : 1;
        nodes.sort((a, b) => pref(b) - pref(a) || (Core.rand(r) - 0.5));
        return { nodeId: nodes[0].id };
      }
      case 'event': {
        let en = p.choices.map((c, i) => c.enabled ? i : -1).filter((i) => i >= 0);
        if (!rnd && G.hp / G.maxHp < 0.5) { const safe = en.filter((i) => !(p.choices[i].ops || []).some((o) => o.op === 'battle')); if (safe.length) en = safe; }
        return { choice: Core.pick(r, en) };
      }
      case 'shop': {
        if (!rnd) {
          const i = p.cards.findIndex((c) => !c.sold && c.affordable && G.ration >= c.price + 20 && c.card.rarity !== 'common');
          if (i >= 0) return { buy: 'card', idx: i };
          if (!p.removeUsed && G.ration >= p.removeEdictPrice + 10) { const ed = p.deck.find((d) => d.card.type === 'edict'); if (ed) return { remove: ed.uid }; }
        }
        return { leave: true };
      }
      case 'camp': {
        const ok = p.options.filter((o) => o.enabled).map((o) => o.id);
        if (rnd) return { pick: Core.pick(r, ok) };
        if (G.hp / G.maxHp < 0.6 && ok.includes('rest')) return { pick: 'rest' };
        return { pick: ok.includes('train') ? 'train' : ok[0] };
      }
      case 'court': {
        const ok = p.options.filter((o) => o.enabled).map((o) => o.id);
        let pick = rnd ? Core.pick(r, ok) : (G.suspicion >= 3 ? 'report' : (ok.includes('recruit') ? 'recruit' : 'report'));
        return { pick, id: p.recruits[0] ? p.recruits[0].general.id : null, cardId: p.mingCards ? p.mingCards[0].id : null };
      }
      case 'reward': {
        if (rnd) return { cardIdx: Core.rand(r) < 0.7 ? Core.randInt(r, 0, p.cards.length - 1) : null };
        const rank = (c) => (c.rarity === 'special' ? 3 : c.rarity === 'rare' ? 2 : 1) + (kind === 'far' && (c.tags || []).includes('shot') ? 1 : 0)
          + (c.pool === 'leader' ? 1 : 0) - (c.cost >= 3 ? 0.5 : 0);
        let bi = -1, bv = -1; p.cards.forEach((c, i) => { const v = rank(c); if (v > bv) { bv = v; bi = i; } });
        if (deckAvgCost(G) > 1.6 && p.cards[bi].cost >= 2 && bv < 3) return { cardIdx: null };
        return { cardIdx: bi };
      }
      case 'merit': return { alloc: p.slots.length === 3 ? { leader: 4, king: 3, ming: 3 } : (G.suspicion >= 5 ? { leader: 4, king: 6, ming: 0 } : { leader: 4, king: 6, ming: 0 }) };
      case 'pickCard': return { picks: Array.from({ length: Math.min(p.n, p.candidates.length) }, (_, i) => i) };
      case 'pickGeneral': return { id: p.candidates[0] ? p.candidates[0].general.id : null };
      case 'council': return p.page === 2 ? (p.defenses.find((d) => d.enabled) ? { defend: p.defenses.find((d) => d.enabled).id, uid: p.removeCandidates[0] ? p.removeCandidates[0].uid : null } : { verdict: true }) : { next: true };
      default: return {};
    }
  }

  /* ------------------------------------------------------------ 한 판 */
  const agg = {
    runs: 0, finished: 0, deathByAct: {}, battleTurns: {}, battles: {}, endings: {}, score: 0, exceptions: [], deadlocks: 0,
    offered: {}, picked: {}, inHand: {}, played: {}, edictInHand: 0, edictPlayed: 0, pushes: 0, battleCount: 0, dist: [0, 0, 0],
    branch: { b1: {}, lane2: {}, dismissed: 0, chilcheon: 0, dokjeon: 0, reachedAct5: 0, reachedAct7: 0 }, rescued: 0, turnCap: 0, intentBad: 0, intentOk: 0,
    hpAtActEnd: {}, prompts: 0, enc: {}
  };
  function runOne(seed, leader, kind) {
    const r = Core.rngNew('sim' + seed + leader + kind);
    const track = { inHand: {} };
    let G = Run.newRun(leader, seed * 7919 + (leader === 'yi' ? 1 : 2));
    let n = 0, where = null;
    try {
      while (!G.done && n < MAXP) {
        const p = Run.current();
        if (!p) throw new Error('프롬프트 없음');
        where = { act: G.act, node: G.nodeId, kind: p.kind };
        if (p.kind === 'actEnd') { agg.hpAtActEnd[G.act] = (agg.hpAtActEnd[G.act] || []); agg.hpAtActEnd[G.act].push(G.hp / G.maxHp); }
        if (p.kind === 'battle') {
          const st = Combat.create(p.req);
          const bres = battleBot(st, kind, r, track);
          if (bres === 'deadlock') { agg.deadlocks++; agg.exceptions.length < 20 && agg.exceptions.push({ seed, leader, bot: kind, ...where, enc: p.req.encId, stack: '전투 교착 turn ' + st.turn }); return; }
          const res = Combat.result(st);
          const a = G.act;
          const E = agg.enc[p.req.encId] || (agg.enc[p.req.encId] = { n: 0, loss: 0, deaths: 0, turns: 0, act: a });
          E.n++; E.loss += Math.max(0, p.req.hp - res.hp); E.turns += res.turns; if (!res.won) E.deaths++;
          agg.battleTurns[a] = (agg.battleTurns[a] || 0) + res.turns; agg.battles[a] = (agg.battles[a] || 0) + 1;
          agg.pushes += res.stats.pushes; agg.battleCount++;
          for (let d = 0; d < 3; d++) agg.dist[d] += res.stats.distTurns[d];
          for (const id in res.stats.cardsPlayed) agg.played[id] = (agg.played[id] || 0) + res.stats.cardsPlayed[id];
          agg.edictPlayed += res.stats.edictsPlayed;
          agg.intentBad += res.stats.intentChecks.bad; agg.intentOk += res.stats.intentChecks.ok;
          if (res.stats.turnCapHit) agg.turnCap++;
          if (verbose && !res.won) console.log(`  패 ${leader}/${kind}#${seed} ${a}막 ${p.req.encId} ${res.turns}합`);
          Run.answer({ result: res });
        } else Run.answer(answerPrompt(p, G, kind, r));
        G = Run.state() || G;
        n++;
      }
      agg.prompts += n;
      if (n >= MAXP) { agg.deadlocks++; agg.exceptions.length < 20 && agg.exceptions.push({ seed, leader, bot: kind, ...where, stack: '프롬프트 상한' }); return; }
    } catch (e) {
      agg.exceptions.length < 20 && agg.exceptions.push({ seed, leader, bot: kind, ...where, stack: String(e && e.stack || e).split('\n').slice(0, 4).join(' | ') });
      return;
    }
    agg.runs++;
    const end = G.ending || 'none';
    agg.endings[end] = (agg.endings[end] || 0) + 1;
    if (end === 'nanse') agg.deathByAct[G.act] = (agg.deathByAct[G.act] || 0) + 1; else agg.finished++;
    agg.score += Run.score().total;
    for (const id in G.stats.cardsOffered) agg.offered[id] = (agg.offered[id] || 0) + G.stats.cardsOffered[id];
    for (const id in G.stats.cardsPicked) agg.picked[id] = (agg.picked[id] || 0) + G.stats.cardsPicked[id];
    for (const id in track.inHand) { agg.inHand[id] = (agg.inHand[id] || 0) + track.inHand[id]; if (CARDS.get(id).type === 'edict') agg.edictInHand += track.inHand[id]; }
    const F = G.flags;
    if (F.b1) agg.branch.b1[F.b1] = (agg.branch.b1[F.b1] || 0) + 1;
    if (F.lane2) agg.branch.lane2[F.lane2] = (agg.branch.lane2[F.lane2] || 0) + 1;
    if (G.stats.actReached >= 5) { agg.branch.reachedAct5++; if (F.dismissed) agg.branch.dismissed++; if (F.chilcheon) agg.branch.chilcheon++; }
    if (G.stats.actReached >= 7) agg.branch.reachedAct7++;
    if (F.dokjeon) agg.branch.dokjeon++;
    if (G.stats.rescued) agg.rescued++;
    if (verbose) console.log(`${leader}/${kind}#${seed}: ${end} ${G.act}막 점수 ${Run.score().total} 덱 ${G.deck.length} 의심 ${G.suspicion}`);
  }

  const t0 = Date.now();
  for (let s = s0; s <= s1; s++) for (const l of leaders) for (const b of bots) runOne(s, l, b);
  const pct = (a, b) => b ? Math.round(a * 1000 / b) / 10 : 0;
  const cum = {}; let acc = 0;
  for (let a = 1; a <= 7; a++) { acc += agg.deathByAct[a] || 0; cum[a] = pct(acc, agg.runs); }
  const avgTurns = {}; for (const a in agg.battles) avgTurns[a] = Math.round(agg.battleTurns[a] / agg.battles[a] * 10) / 10;
  const pickRate = Object.keys(agg.offered).map((id) => [id, pct(agg.picked[id] || 0, agg.offered[id]), agg.offered[id]]).sort((a, b) => a[1] - b[1]);
  const useRate = Object.keys(agg.inHand).filter((id) => agg.inHand[id] >= 10).map((id) => [id, pct(agg.played[id] || 0, agg.inHand[id])]).sort((a, b) => a[1] - b[1]);
  const distTot = agg.dist[0] + agg.dist[1] + agg.dist[2];
  const hpEnd = {}; for (const a in agg.hpAtActEnd) hpEnd[a] = Math.round(agg.hpAtActEnd[a].reduce((x, y) => x + y, 0) / agg.hpAtActEnd[a].length * 100);
  return {
    runs: agg.runs, attempted: (s1 - s0 + 1) * leaders.length * bots.length, seconds: Math.round((Date.now() - t0) / 100) / 10,
    finishRate: pct(agg.finished, agg.runs), deathCumByAct: cum, deathsByAct: agg.deathByAct, endings: agg.endings, avgScore: Math.round(agg.score / Math.max(1, agg.runs)),
    avgBattleTurnsByAct: avgTurns, hpPctAtActEnd: hpEnd, pushesPerBattle: Math.round(agg.pushes / Math.max(1, agg.battleCount) * 10) / 10,
    distShare: { far: pct(agg.dist[0], distTot), near: pct(agg.dist[1], distTot), close: pct(agg.dist[2], distTot) },
    edictUseRate: pct(agg.edictPlayed, agg.edictInHand), rescueRate: pct(agg.rescued, agg.runs), turnCapBattles: agg.turnCap,
    intent: { ok: agg.intentOk, bad: agg.intentBad }, deadlocks: agg.deadlocks, consoleErrors,
    branch: agg.branch, pickRateLow: pickRate.slice(0, 12), pickRateHigh: pickRate.slice(-8), useRateLow: useRate.slice(0, 10),
    neverOffered: CARDS.list.filter((c) => c.rarity !== null && !agg.offered[c.id] && ['base', 'deputy', 'event', 'edict', 'token'].indexOf(c.pool) < 0).map((c) => c.id),
    encounters: Object.keys(agg.enc).sort((a, b) => agg.enc[a].act - agg.enc[b].act).map((k) => { const e = agg.enc[k];
      return `${e.act}막 ${k.padEnd(17)} n${String(e.n).padStart(4)} 손실${String(Math.round(e.loss / e.n)).padStart(4)} 사망${String(Math.round(e.deaths * 100 / e.n)).padStart(4)}% 턴${(e.turns / e.n).toFixed(1)}`; }),
    exceptions: agg.exceptions
  };
};
