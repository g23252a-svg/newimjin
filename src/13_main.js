/* ===== 13_main.js — 캔버스·축소·세로 회전·씬 전환·루프·설정·디버그 (전역 Main) ===== */
// 계약서 §7.1. 13_main 만 Date·Math.random 을 쓴다(새 판 시드).
var Main = (function () { 'use strict';

  var W = 1280, H = 720;
  var VIEW = { scale: 1, rot: 0 };
  var cv = null, ctx = null, wrap = null;
  var scene = 'title', params = null, last = 0, started = false;
  var errMsg = null, errT = 0;
  var settings = { volume: 0.7, fast: false, shake: true, captions: true, mute: false };
  var curMusic = null;

  function loadSettings() {
    var s = Core.load(Core.SETTINGS_KEY);
    if (s && typeof s === 'object') for (var k in settings) if (Object.prototype.hasOwnProperty.call(s, k)) settings[k] = s[k];
  }
  function setSetting(k, v) {
    settings[k] = v;
    Core.save(Core.SETTINGS_KEY, settings);
    if (k === 'volume') Audio_.setVolume(v);
    if (k === 'mute') Audio_.mute(!!v);
  }
  function newSeed() { return Core.hash(String(Date.now()) + ':' + Math.random() + ':' + api.time); }

  function music(name) {
    if (curMusic === name) return;
    curMusic = name;
    try { Audio_.music(name); } catch (e) { /* 소리는 없어도 된다 */ }
  }
  function musicFor() {
    if (scene === 'battle') return 'battle';
    if (scene === 'run') { var p = Run.current(); if (p && p.kind === 'ending') return 'ending'; }
    return 'map';
  }

  /* ------------------------------------------------------------ 화면 맞춤 (제1부 방식) */
  function resize() {
    if (!cv) return;
    var w = innerWidth, h = innerHeight;
    var rot = (Input.isTouch && h > w) ? 90 : 0;          // 세로로 든 폰이면 캔버스를 눕힌다
    var aw = rot ? h : w, ah = rot ? w : h;
    var sc = Math.min(aw / W, ah / H);
    VIEW.scale = sc; VIEW.rot = rot;
    cv.style.width = (W * sc) + 'px'; cv.style.height = (H * sc) + 'px';
    wrap.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
  }

  /* ------------------------------------------------------------ 씬 */
  function go(s, p) {
    if (scene === 'battle' && s !== 'battle') UIBattle.stop();
    scene = s; params = p || null;
    if (s === 'battle') {
      UIBattle.start(p.req, function (result) {
        try { Run.answer({ result: result }); } catch (e) { report(e); }
        go('run');
      });
    }
    if (s === 'title' && UIScreens.reset) UIScreens.reset();
    music(musicFor());
  }
  // 오류: 자세한 내용은 콘솔과 Main.debug.lastError() 에만 두고, 화면에는 짧은 안내만 띄운다
  function report(e) {
    errMsg = String((e && e.message) || e); errT = 5000;
    if (typeof console !== 'undefined') console.error(e);
  }
  function drawErrorToast(c) {
    var a = Math.max(0, Math.min(1, errT / 400)), w = 470, x = (W - w) / 2, y = H - 66;
    c.save(); c.globalAlpha = a;
    try {
      var gx = UIBattle.gfx;
      gx.panel(c, x, y, w, 50, { r: 25, c1: '#5a1f18', c2: '#33110c', stripe: false });
      ART.icon(c, 'scroll', x + 30, y + 25, 26);
      gx.txt(c, '문제가 생겼습니다. 계속되면 새로고침해 주세요.', x + w / 2 + 14, y + 26, { size: 16, align: 'center', base: 'middle', weight: 'bold', color: '#fff6e6', maxW: w - 80 });
    } catch (e2) {
      c.fillStyle = 'rgba(60,16,12,.9)'; c.fillRect(x, y, w, 50);
      c.fillStyle = '#fff6e6'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('문제가 생겼습니다. 계속되면 새로고침해 주세요.', W / 2, y + 25);
    }
    c.restore();
  }
  function frame(dt) {
    switch (scene) {
      case 'title': UIScreens.title(ctx, dt); break;
      case 'leader': UIScreens.leaderSelect(ctx, dt); break;
      case 'settings': UIScreens.settings(ctx, dt); break;
      case 'deck': UIScreens.deck(ctx, dt, function () { go((params && params.back) || 'run'); }); break;
      case 'battle': UIBattle.update(dt); UIBattle.draw(ctx); break;
      case 'run': default: {
        var G = Run.state(), p = Run.current();
        if (!G || (G.done && !p)) { go('title'); UIScreens.title(ctx, dt); break; }
        if (p && p.kind === 'battle') { go('battle', { req: p.req }); UIBattle.update(dt); UIBattle.draw(ctx); break; }
        UIScreens.draw(ctx, dt, p);
        music(musicFor());
      }
    }
  }
  function loop(now) {
    var dt = Math.min(48, Math.max(0, now - (last || now)));
    last = now;
    stepFrame(dt);
    requestAnimationFrame(loop);
  }
  function stepFrame(dt) {
    api.time += dt;
    Input.begin();
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      frame(dt);
      if (Input.key('KeyM')) setSetting('mute', !settings.mute);
    } catch (e) { report(e); }
    if (errMsg && errT > 0) {
      errT -= dt;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      drawErrorToast(ctx);
    }
    try { Input.end(); } catch (e) { report(e); }
  }

  function start() {
    if (started) return;
    started = true;
    cv = document.getElementById('cv'); ctx = cv.getContext('2d'); wrap = document.getElementById('wrap');
    loadSettings();
    Input.init(cv, wrap, VIEW);
    Core.bus.on('firstInput', function () {
      try { Audio_.init(); Audio_.setVolume(settings.volume); Audio_.mute(!!settings.mute); var m = curMusic; curMusic = null; music(m || musicFor()); } catch (e) { /* 무음 */ }
    });
    resize();
    addEventListener('resize', resize);
    addEventListener('orientationchange', function () { setTimeout(resize, 120); });
    addEventListener('error', function (ev) { report(ev && ev.error ? ev.error : (ev && ev.message) || '알 수 없는 오류'); });
    // 저장된 판이 전투 직전이면 그 전투부터(시드가 같아 같은 전투가 난다)
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------ 디버그 (브라우저 QA) */
  var debug = {
    newRun: function (leader, seed) { Run.newRun(leader || 'yi', seed != null ? seed : newSeed()); go('run'); return Run.current(); },
    answer: function (a) { var r = Run.answer(a); go('run'); return r; },
    state: function () { return Run.state(); },
    goto: function (act, col) { if (!Run.state()) Run.newRun('yi', newSeed()); Run.jump(act, col || 1); go('run'); return Run.current(); },
    winBattle: function () { if (scene === 'battle') UIBattle.debugEnd(true); },
    loseBattle: function () { if (scene === 'battle') UIBattle.debugEnd(false); },
    skipBattle: function () { if (scene === 'battle') UIBattle.debugEnd(true, true); },
    winBattleHold: function () { if (scene === 'battle') UIBattle.debugEnd(true, false, true); },    // 승리 화면에 멈춘다(사진용). 화면을 누르면 넘어간다
    loseBattleHold: function () { if (scene === 'battle') UIBattle.debugEnd(false, false, true); },
    lastError: function () { return errMsg; },
    point: function (x, y) { Input.debugPoint(x, y); },                 // 마우스를 (x,y)에 고정(사진용 hover). 인자 없이 부르면 푼다
    setHp: function (n) { var G = Run.state(); if (G) G.hp = Math.max(1, Math.min(G.maxHp, n)); },
    setSusp: function (n) { var G = Run.state(); if (G) G.suspicion = Math.max(0, Math.min(10, n)); },
    give: function (id) { Run.applyOps([{ op: 'addCard', id: id }], {}); },
    relic: function (id) { Run.applyOps([{ op: 'relic', id: id }], {}); },
    scene: function () { return scene; },
    tick: function (n, dt) { for (var i = 0; i < (n || 1); i++) stepFrame(dt || 16); return scene; }   // 창이 가려져 rAF 가 멈췄을 때 QA 용
  };

  var api = {
    W: W, H: H, VIEW: VIEW, time: 0, settings: settings,
    start: start, go: go, setSetting: setSetting, newSeed: newSeed, resize: resize, report: report,
    get scene() { return scene; }, get params() { return params; },
    debug: debug
  };
  if (typeof window !== 'undefined') {
    window.__J = { Core: Core, TXT: TXT, CARDS: CARDS, ENEMIES: ENEMIES, GENERALS: GENERALS, EVENTS: EVENTS, MAPDATA: MAPDATA,
      Combat: Combat, Run: Run, Input: Input, Audio_: Audio_, UIBattle: UIBattle, UIScreens: UIScreens, Main: api };
  }
  return api;
})();
