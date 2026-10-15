/**
 * 화면 연기 검사 — 가짜 캔버스 위에서 제목·주장 선택·설정·지도·모든 프롬프트 화면·전투를 실제로 그려 본다.
 *   node test/headless.js --quiet --run test/ui_smoke.js [--seed 7] [--leader gwon]
 * 콘솔 오류(그리기 중 예외 포함)를 모아 돌려준다. 0이어야 한다.
 */
'use strict';
module.exports = (ctx, win) => {
  const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const seed = Number(arg('seed', 4242)), leader = arg('leader', 'yi'), autowin = argv.indexOf('--win') >= 0;
  const errs = [];
  win.console = Object.assign({}, win.console, { error: (...a) => { errs.push(a.map((x) => String(x && x.stack || x)).join(' ').slice(0, 400)); } });
  let clock = 1000; win.performance.now = () => (clock += 17);
  const { Main, Run, Combat, UIBattle, Core } = ctx;
  const step = (n) => win.__raf.step(n);
  const r = Core.rngNew('ui' + seed);
  Main.start(); step(4);
  Main.go('leader'); step(3); Main.go('settings', { back: 'title' }); step(3); Main.go('title'); step(3);
  Main.debug.newRun(leader, seed); step(3);
  Main.go('deck', { back: 'run' }); step(3); Main.go('run'); step(2);
  const kinds = {}; let guard = 0, battles = 0, battleFrames = 0;
  while (guard++ < 6000) {
    const G = Run.state(); if (!G || G.done) break;
    if (Main.debug.scene() === 'battle') {
      const st = UIBattle.state;
      if (!st) { step(1); continue; }
      if (st.phase === 'player') {
        const mv = Combat.legalMoves(st);
        if (mv.length && Core.rand(r) < 0.75) { const m = Core.pick(r, mv); UIBattle.debugAct((s) => Combat.play(s, m.handIdx, m.targets ? Core.pick(r, m.targets) : null)); }
        else UIBattle.debugAct((s) => Combat.endTurn(s));
      } else if (st.phase === 'choose') UIBattle.debugAct((s) => Combat.choose(s, [0]));
      else if (st.phase === 'rescue') UIBattle.debugAct((s) => Combat.chooseRescue(s, s.rescue.pending[0]));
      step(3); battleFrames += 3;
      if (st.turn > (autowin ? 2 : 10) && st.phase !== 'done') { UIBattle.debugEnd(true); battles++; }
      if (st.phase === 'done') { step(200); battles++; }
      continue;
    }
    const p = Run.current(); if (!p) { step(1); continue; }
    kinds[p.kind] = (kinds[p.kind] || 0) + 1;
    step(3);
    let a = {};
    switch (p.kind) {
      case 'map': a = { nodeId: Core.pick(r, p.reachable) }; break;
      case 'event': a = { choice: p.choices.findIndex((c) => c.enabled) }; break;
      case 'shop': a = (kinds.shop % 3 === 1 && p.cards.some((c) => c.affordable && !c.sold)) ? { buy: 'card', idx: p.cards.findIndex((c) => c.affordable && !c.sold) } : { leave: true }; break;
      case 'camp': a = { pick: p.options.find((o) => o.enabled).id }; break;
      case 'court': { const o = p.options.filter((x) => x.enabled); const k = Core.pick(r, o).id; a = { pick: k, id: p.recruits[0] && p.recruits[0].general.id, cardId: p.mingCards && p.mingCards[0].id }; break; }
      case 'reward': a = { cardIdx: 0 }; break;
      case 'merit': a = { alloc: p.defaults }; break;
      case 'pickCard': a = { picks: [0] }; break;
      case 'pickGeneral': a = { id: p.candidates[0] ? p.candidates[0].general.id : null }; break;
      case 'council': a = p.page === 2 ? (p.defenses[0].enabled && !kinds.cdef ? (kinds.cdef = 1, { defend: 'ration' }) : { verdict: true }) : { next: true }; break;
      default: a = {};
    }
    try { Run.answer(a); } catch (e) { errs.push('answer ' + p.kind + ': ' + e.message); break; }
    step(2);
  }
  // 결말 화면과 제목 복귀까지 그린다
  step(10);
  return { errors: errs.slice(0, 25), errorCount: errs.length, kinds, battles, battleFrames, scene: Main.debug.scene(), ending: Run.state() ? Run.state().ending : null, small: ctx.Input.stats.small };
};
