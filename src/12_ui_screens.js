/* ===== 12_ui_screens.js — 제목·주장 선택·설정·덱 보기 + 판 프롬프트 화면 13종 (전역 UIScreens) ===== */
// 계약서 §7.4. 화면은 Run.current() 프롬프트를 그리고, 고른 것을 Run.answer(a) 로 넘긴다.
// 그리기 도구는 UIBattle.gfx, 캐릭터·아이콘은 ART. 화면에 한자를 쓰지 않는다.
var UIScreens = (function () { 'use strict';

  var W = 1280, H = 720, B = Core.BAL;
  function g() { return UIBattle.gfx; }
  function X() { return (typeof TXT !== 'undefined') ? TXT : {}; }
  function ui(k, d) { var u = X().ui || {}; return u[k] || d; }
  var U = { t: 0, prompt: null, sel: null, picks: [], shop: null, merit: null, scroll: 0, council: null, confirmClear: false, detail: null, saveT: 0, saveInfo: null };
  function reset() { U.prompt = null; U.sel = null; U.picks = []; U.scroll = 0; U.detail = null; U.confirmClear = false; U.saveT = 0; U.t = 0; }
  function onPrompt(p) {
    if (U.prompt === p) return;
    U.prompt = p; U.sel = null; U.picks = []; U.scroll = 0; U.detail = null; U.shop = null; U.council = null; U.t = 0;
    if (p && p.kind === 'merit') { U.merit = { leader: p.defaults.leader, king: p.defaults.king, ming: p.defaults.ming || 0 }; if (p.slots.indexOf('ming') < 0) { U.merit.king += U.merit.ming; U.merit.ming = 0; } }
  }
  function answer(a) {
    try { Audio_.sfx('scroll'); } catch (e) { /* 무음 */ }
    try { Run.answer(a); } catch (e) { Main.report(e); }
  }
  var RELIC_ICON = { turtle_blueprint: 'turtle', jincheonroe_relic: 'bomb', hwacha_relic: 'cart', nanjung_relic: 'scroll', jingbirok: 'scroll', tonga: 'arrow', hangwae_gun: 'gun',
    obangnang: 'coin', seoae_brush: 'letter', chains: 'chain', joryeong_stone: 'mountain', hansan_drum: 'drum', jinju_drum: 'drum', haengju_ash: 'smoke', jiksan_spear: 'spear',
    myeongnyang_chain: 'chain', tongjeyeong_flag: 'flag' };
  function relicBadge(c, id, x, y, r) {
    var rel = GENERALS.relics.byId[id], G = Run.state();
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = rel && rel.curse ? '#5a1a14' : '#3a2a1e'; c.fill();
    c.lineWidth = 2.5; c.strokeStyle = G && G.relicUp[id] ? '#ffe08a' : 'rgba(230,184,74,.8)'; c.stroke();
    ART.icon(c, RELIC_ICON[id] || 'star', x, y, r * 1.45);
  }

  /* ================================================================ 배경 */
  var bgCache = {};
  // 지도 판: 바다 위에 초록 땅, 산과 숲. 막마다 바다 자리가 다르다.
  var SEA = { south: 'south', sea: 'lanes', north: 'west', palace: 'none', west: 'west', strait: 'strait', noryang: 'south' };
  function board(key, sea) {
    if (bgCache[key]) return bgCache[key];
    if (typeof document === 'undefined' || !document.createElement) return null;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), r = Core.rngNew('board' + key);
    var sg = c.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, '#62a8d2'); sg.addColorStop(1, '#2f74a6');
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    function blob(cx, cy, rx, ry, seed) {
      var rr2 = Core.rngNew(seed); c.beginPath();
      for (var a = 0; a <= 36; a++) { var t = a / 36 * Math.PI * 2, k = 0.82 + Core.rand(rr2) * 0.28; c.lineTo(cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k); }
      c.closePath();
    }
    function land(cx, cy, rx, ry, seed) {
      blob(cx, cy, rx + 14, ry + 14, seed); c.fillStyle = '#e8d7a0'; c.fill();                 // 모래톱
      blob(cx, cy, rx, ry, seed); var lg = c.createLinearGradient(0, cy - ry, 0, cy + ry); lg.addColorStop(0, '#a8cf82'); lg.addColorStop(1, '#7aa85a'); c.fillStyle = lg; c.fill();
    }
    if (sea === 'south') { land(640, 230, 760, 290, key + 'a'); land(1180, 640, 120, 60, key + 'b'); land(200, 660, 110, 50, key + 'c'); }
    else if (sea === 'west') { land(760, 360, 640, 420, key + 'a'); land(110, 560, 80, 60, key + 'b'); }
    else if (sea === 'strait') { land(640, 150, 760, 210, key + 'a'); land(640, 690, 760, 170, key + 'b'); }
    else if (sea === 'lanes') {                       // 위는 바닷길(섬 몇), 아래는 뭍길
      land(640, 30, 760, 70, key + 'n'); land(640, 660, 820, 250, key + 's');
      [[250, 300], [560, 330], [900, 320], [1080, 250]].forEach(function (q, i) { land(q[0], q[1], 48 + i * 6, 26, key + 'i' + i); });
    }
    else {
      c.fillStyle = '#8fbc6a'; c.fillRect(0, 0, W, H);
      var rv = Core.rngNew(key + 'river'), ry = 130 + Core.rand(rv) * 80;   // 강 하나가 판을 가로지른다
      c.lineCap = 'round'; c.lineJoin = 'round';
      [[34, '#e8d7a0'], [22, '#4f93c4'], [8, 'rgba(255,255,255,.18)']].forEach(function (st) {
        c.strokeStyle = st[1]; c.lineWidth = st[0]; c.beginPath(); c.moveTo(-20, ry);
        for (var xx = 0; xx <= W + 40; xx += 80) c.lineTo(xx, ry + Math.sin(xx / 170 + 1.3) * 60 + xx * 0.32);
        c.stroke();
      });
    }
    // 파도 무늬
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
    function isLand(x, y) { try { var d = c.getImageData(Math.max(0, Math.min(W - 1, x | 0)), Math.max(0, Math.min(H - 1, y | 0)), 1, 1).data; return d[1] > d[2] + 20; } catch (e) { return true; } }
    for (var k = 0; k < 90; k++) { var x = Core.rand(r) * W, y = Core.rand(r) * H; if (isLand(x, y)) continue; c.beginPath(); c.arc(x, y, 8, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    // 산과 숲 (땅 위에만 대충 — 바다 위에 겹쳐도 섬처럼 보인다)
    for (var m = 0; m < 26; m++) {
      var mx = Core.rand(r) * W, my = 80 + Core.rand(r) * (H - 140), s = 0.8 + Core.rand(r) * 0.9;
      if (!isLand(mx - 24 * s, my + 12 * s) || !isLand(mx + 26 * s, my + 12 * s) || !isLand(mx, my - 18 * s)) continue;
      c.save(); c.translate(mx, my); c.scale(s, s);
      c.beginPath(); c.moveTo(-22, 12); c.lineTo(-4, -18); c.lineTo(6, -4); c.lineTo(12, -12); c.lineTo(26, 12); c.closePath(); c.fillStyle = '#6f8f5a'; c.fill();
      c.beginPath(); c.moveTo(-9, -6); c.lineTo(-4, -18); c.lineTo(1, -8); c.closePath(); c.fillStyle = '#f2f2ea'; c.fill();
      c.restore();
    }
    for (var tr = 0; tr < 70; tr++) { var tx = Core.rand(r) * W, ty = 60 + Core.rand(r) * (H - 120); if (!isLand(tx, ty)) continue; c.fillStyle = 'rgba(60,110,50,.75)'; c.beginPath(); c.arc(tx, ty, 6 + Core.rand(r) * 4, 0, 7); c.fill(); }
    var vg = c.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 860); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,30,40,.45)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    bgCache[key] = cv;
    return cv;
  }
  function mapBg(c, act) {
    var a = MAPDATA.acts[act] || { bg: 'south' };
    var cv = board('act' + act, SEA[a.bg] || 'south');
    if (cv) c.drawImage(cv, 0, 0); else { c.fillStyle = '#5a9ac8'; c.fillRect(0, 0, W, H); }
  }
  function darkBg(c) {
    var grd = c.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H / 2, 900); grd.addColorStop(0, '#4a3424'); grd.addColorStop(1, '#140e09');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
  }
  function backdrop(c, act) { mapBg(c, act); c.fillStyle = 'rgba(16,10,6,.58)'; c.fillRect(0, 0, W, H); }
  function titleScene() {
    if (bgCache.title) return bgCache.title;
    if (typeof document === 'undefined' || !document.createElement) return null;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), r = Core.rngNew('title');
    var sky = c.createLinearGradient(0, 0, 0, 470); sky.addColorStop(0, '#2a2a5a'); sky.addColorStop(0.45, '#c8584a'); sky.addColorStop(1, '#ffc46a');
    c.fillStyle = sky; c.fillRect(0, 0, W, 470);
    c.fillStyle = 'rgba(255,240,200,.95)'; c.beginPath(); c.arc(W / 2, 420, 120, 0, 7); c.fill();
    var sun = c.createRadialGradient(W / 2, 420, 60, W / 2, 420, 420); sun.addColorStop(0, 'rgba(255,220,140,.55)'); sun.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = sun; c.fillRect(0, 0, W, 470);
    function ridge(y0, amp, col, seed, step) { var rr2 = Core.rngNew(seed); c.fillStyle = col; c.beginPath(); c.moveTo(0, 480); for (var x = 0; x <= W; x += step) c.lineTo(x, y0 - amp * Math.abs(Math.sin(x / 230 + Core.rand(rr2) * 0.6))); c.lineTo(W, 480); c.closePath(); c.fill(); }
    ridge(440, 110, '#7a4a6a', 't1', 30); ridge(462, 60, '#4a2a4a', 't2', 26);
    var sea = c.createLinearGradient(0, 466, 0, H); sea.addColorStop(0, '#e08a5a'); sea.addColorStop(0.15, '#5a4a7a'); sea.addColorStop(1, '#1a1a3a');
    c.fillStyle = sea; c.fillRect(0, 466, W, H - 466);
    for (var i = 0; i < 140; i++) { var y = 470 + Core.rand(r) * 250, x = Core.rand(r) * W, l = 10 + Core.rand(r) * 50; c.strokeStyle = 'rgba(255,200,150,' + (0.08 + Core.rand(r) * 0.25) + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke(); }
    bgCache.title = cv;
    return cv;
  }

  /* ================================================================ 판 머리띠 */
  function hud(c, opts) {
    opts = opts || {};
    var G = Run.state(); if (!G) return;
    var gx = g(), T = X();
    var grd = c.createLinearGradient(0, 0, 0, 52); grd.addColorStop(0, 'rgba(40,26,16,.96)'); grd.addColorStop(1, 'rgba(24,16,10,.94)');
    c.fillStyle = grd; c.fillRect(0, 0, W, 52); c.fillStyle = gx.C.gold; c.fillRect(0, 52, W, 2);
    var a = MAPDATA.acts[G.act], nd = G.nodeId ? MAPDATA.nodes.byId[G.nodeId] : null;
    gx.txt(c, G.act + '막 ' + a.title, 16, 24, { size: 17, weight: 'bold', color: gx.C.goldL });
    if (nd && nd.date && T.date) gx.txt(c, T.date(nd.date), 16, 43, { size: 12, color: gx.C.dim, maxW: 230 });
    ART.icon(c, 'heart', 262, 26, 26);
    gx.bar(c, 280, 15, 180, 22, G.hp, G.maxHp, G.hp / G.maxHp < 0.3 ? '#d8342a' : '#e04838');
    ART.icon(c, 'rice', 486, 26, 26); gx.txt(c, String(G.ration), 502, 33, { size: 19, weight: 'bold', stroke: 3 });
    ART.icon(c, 'eye', 566, 26, 28); gx.txt(c, '의심', 584, 20, { size: 11, weight: 'bold', color: '#ffb0a0' });
    for (var i = 0; i < 10; i++) {
      var x = 584 + i * 13; gx.rr(c, x, 25, 10, 16, 3); c.fillStyle = i < G.suspicion ? (i >= 6 ? '#ff4a3a' : '#e07a3a') : 'rgba(255,255,255,.12)'; c.fill();
      if (i === 3 || i === 6 || i === 9) { c.fillStyle = '#ffd27a'; c.fillRect(x + 10.5, 22, 2, 22); }
    }
    Input.zone({ id: 'hudSusp', x: 552, y: 6, w: 170, h: 40 });
    if (Input.hover('hudSusp')) gx.tooltip(c, 552, 58, '임금의 의심 ' + G.suspicion + '/10', '4·7·10을 처음 넘을 때 어명 패가 덱에 섞이고, 10이면 부장 하나가 옥에 갇힌다. 조정의 「장계를 올린다」와 장계 패가 의심을 내린다.');
    var deps = G.deputies.slice(); if (G.special) deps.push(G.special);
    ART.portrait(c, G.leader, 760, 26, 21, { t: Main.time });
    Input.zone({ id: 'hudLeader', x: 739, y: 5, w: 42, h: 42 });
    if (Input.hover('hudLeader')) { var lg = GENERALS.leaders.get(G.leader); gx.tooltip(c, 640, 58, lg.name + ' — 주장', lg.passiveDesc); }
    deps.forEach(function (id, k) {
      var d = GENERALS.deputies.byId[id]; if (!d) return;
      ART.portrait(c, id, 800 + k * 36, 26, 16, { t: Main.time, ring: id === G.special ? '#ffe08a' : '#b8944a' });
      Input.zone({ id: 'hudDep' + k, x: 784 + k * 36, y: 10, w: 32, h: 32 });
      if (Input.hover('hudDep' + k)) gx.tooltip(c, 700, 58, d.name + (id === G.special ? ' — 셋째 자리' : ' — 부장'), d.passiveDesc);
    });
    G.relics.forEach(function (id, k) {
      var x = 916 + k * 30; if (x > W - (opts.deck === false ? 40 : 290)) return;
      relicBadge(c, id, x, 26, 13);
      Input.zone({ id: 'hudRel' + k, x: x - 13, y: 13, w: 26, h: 26 });
      var r = GENERALS.relics.byId[id];
      if (Input.hover('hudRel' + k) && r) gx.tooltip(c, Math.min(x - 100, W - 290), 58, r.name, r.desc);
    });
    if (opts.deck !== false) gx.button(c, { id: 'hudDeck', x: W - 132, y: 4, w: 124, h: 44, label: '패 ' + G.deck.length, icon: 'scroll', size: 15, key: 'D', tap: openDeck });
  }
  function openDeck() { U.scroll = 0; Main.go('deck', { back: 'run' }); }

  /* ================================================================ 제목 */
  function title(c, dt) {
    U.t += dt;
    var gx = g(), T = X(), t = U.t;
    var cv = titleScene(); if (cv) c.drawImage(cv, 0, 0); else darkBg(c);
    // 멀리 검은 돛(왜선)이 수평선을 건너온다
    for (var sh = 0; sh < 4; sh++) {
      var sx = W + 80 - ((t / (40 + sh * 7)) + sh * 300) % (W + 260), sy = 500 + sh * 6;
      ART.wship(c, { id: 'sekibune', tags: ['ship'] }, sx, sy, 0.32 + sh * 0.03, { t: t });
    }
    ART.turtleShip(c, 300 + Math.sin(t / 1800) * 30, 640, 0.9, { t: t });
    ART.panokseon(c, 1010 + Math.sin(t / 2100) * 24, 668, 0.7, { t: t });
    ART.person(c, 'yi', 170, 560, 1.75, { t: t });
    ART.person(c, 'gwon', 1120, 560, 1.6, { t: t, facing: -1 });
    var k = Math.min(1, U.t / 700);
    c.save(); c.globalAlpha = k;
    gx.txt(c, '임진왜란 1592 – 1598', W / 2, 92, { size: 20, align: 'center', weight: 'bold', color: '#ffe8c0', stroke: 4, strokeColor: 'rgba(60,20,10,.8)' });
    c.save(); c.translate(W / 2, 200); var sc = 1 + Math.sin(t / 900) * 0.015; c.scale(sc, sc);
    c.font = F(150, '900'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 18; c.strokeStyle = '#3a1406'; c.strokeText('징비', 0, 0);
    var lg = c.createLinearGradient(0, -70, 0, 70); lg.addColorStop(0, '#fff6c8'); lg.addColorStop(0.5, '#ffc83a'); lg.addColorStop(1, '#e0601a');
    c.fillStyle = lg; c.fillText('징비', 0, 0);
    c.restore();
    gx.txt(c, (T.subtitle || '일곱 해의 패') + '  ·  덱빌딩 로그라이크', W / 2, 300, { size: 24, align: 'center', weight: 'bold', color: '#fff', stroke: 5, strokeColor: 'rgba(60,20,10,.85)' });
    c.restore();
    if (!U.saveT || U.t - U.saveT > 1000 || U.t < U.saveT) { U.saveInfo = Run.hasSave(); U.saveT = U.t || 1; }
    var save = U.saveInfo, y = 360;
    if (save) {
      var lgd = GENERALS.leaders.byId[save.leader];
      gx.button(c, { id: 'tResume', x: W / 2 - 170, y: y, w: 340, h: 66, label: ui('resume', '이어하기'), primary: true, icon: 'flag',
        sub: (lgd ? lgd.name : '') + ' · ' + save.act + '막 · 병력 ' + save.hp + '/' + save.maxHp,
        tap: function () { if (Run.load()) Main.go('run'); } });
      y += 78;
    }
    gx.button(c, { id: 'tNew', x: W / 2 - 170, y: y, w: 340, h: 60, label: ui('newRun', '새 판'), primary: !save, blue: !!save, icon: 'swords', tap: function () { U.t = 0; Main.go('leader'); } });
    gx.button(c, { id: 'tSet', x: W / 2 - 170, y: y + 72, w: 340, h: 50, label: ui('settings', '설정'), icon: 'scroll', tap: function () { Main.go('settings', { back: 'title' }); } });
    gx.txt(c, Input.isTouch ? '카드를 톡 하면 고르고, 한 번 더 톡 하면 낸다 · 길게 누르면 설명' : '카드 1~0 · 턴 마침 Space · 패 보기 D · 소리 M', W / 2, H - 16, { size: 13, align: 'center', color: 'rgba(255,240,220,.7)', weight: 'bold' });
    if (Input.key('Enter')) { if (save) { if (Run.load()) Main.go('run'); } else Main.go('leader'); }
  }
  function F(px, w) { return (w ? w + ' ' : '') + px + 'px ' + g().FONT; }

  /* ================================================================ 주장 선택 */
  var LEADER_BG = { yi: ['#3a7ab8', '#173a6a'], gwon: ['#5a8a4a', '#2a4a2a'] };
  function leaderSelect(c, dt) {
    U.t += dt;
    var gx = g(), t = U.t;
    darkBg(c);
    gx.txt(c, ui('leaderSelect', '누구의 패로 싸우는가'), W / 2, 66, { size: 32, align: 'center', weight: 'bold', color: gx.C.goldL, stroke: 4 });
    var ls = GENERALS.leaders.list;
    ls.forEach(function (l, k) {
      var x = W / 2 + (k - (ls.length - 1) / 2) * 440 - 205, y = 96, w = 410, h = 556, hov = Input.hover('ld' + l.id);
      gx.panel(c, x, y - (hov ? 6 : 0), w, h, { border: hov ? '#ffe08a' : '#e6b84a' });
      var yy = y - (hov ? 6 : 0);
      c.save(); gx.rr(c, x + 12, yy + 12, w - 24, 250, 10); c.clip();
      var bg = c.createLinearGradient(0, yy, 0, yy + 260), col = LEADER_BG[l.id] || ['#5a5a7a', '#2a2a3a'];
      bg.addColorStop(0, col[0]); bg.addColorStop(1, col[1]); c.fillStyle = bg; c.fillRect(x, yy, w, 270);
      if (l.id === 'yi') ART.panokseon(c, x + w / 2 + 40, yy + 250, 0.55, { t: t });
      else { c.fillStyle = '#8a8070'; c.fillRect(x, yy + 200, w, 70); for (var b = 0; b < 8; b++) { c.fillStyle = '#9a9080'; c.fillRect(x + b * 54, yy + 188, 34, 16); } }
      ART.person(c, l.id, x + w / 2 - 20, yy + 252, 1.08, { t: t, pose: hov ? 'attack' : 'idle' });
      c.restore();
      gx.txt(c, l.name, x + w / 2, yy + 300, { size: 32, align: 'center', weight: 'bold', color: '#fff', stroke: 5 });
      ART.icon(c, 'heart', x + w / 2 - 84, yy + 330, 24); gx.txt(c, '병력 ' + l.hp, x + w / 2 - 68, yy + 336, { size: 16, weight: 'bold' });
      ART.icon(c, 'eye', x + w / 2 + 30, yy + 330, 24); gx.txt(c, '의심 ' + (l.suspStart || 0), x + w / 2 + 46, yy + 336, { size: 16, weight: 'bold' });
      gx.para(c, l.passiveDesc || '', x + 26, yy + 372, w - 52, { size: 14.5, color: '#ffe8b8', lh: 22, max: 3, weight: 'bold' });
      gx.para(c, l.desc || '', x + 26, yy + 446, w - 52, { size: 13.5, color: gx.C.dim, lh: 20, max: 2 });
      gx.txt(c, '전법: ' + (l.deckColor || ''), x + 26, yy + 506, { size: 13.5, color: '#9fd8ff', weight: 'bold', maxW: w - 52 });
      gx.txt(c, '눌러서 시작', x + w / 2, yy + 538, { size: 14, align: 'center', color: hov ? '#ffe08a' : 'rgba(255,224,138,.6)', weight: 'bold' });
      Input.zone({ id: 'ld' + l.id, x: x, y: y, w: w, h: h, tap: function () { Run.newRun(l.id, Main.newSeed()); U.t = 0; Main.go('run'); } });
    });
    gx.button(c, { id: 'ldBack', x: 24, y: H - 70, w: 160, h: 50, label: ui('back', '돌아간다'), tap: function () { Main.go('title'); } });
    if (Input.key('Escape')) Main.go('title');
  }

  /* ================================================================ 설정 */
  function settings(c, dt) {
    var gx = g(), S = Main.settings;
    darkBg(c);
    gx.panel(c, W / 2 - 330, 50, 660, 620, {});
    gx.txt(c, ui('settings', '설정'), W / 2, 104, { size: 32, align: 'center', weight: 'bold', color: gx.C.goldL, stroke: 4 });
    var y = 140;
    function row(label, val, minus, plus, tap) {
      gx.txt(c, label, W / 2 - 260, y + 32, { size: 20, weight: 'bold' });
      if (tap) gx.button(c, { id: 'set' + label, x: W / 2 + 80, y: y + 4, w: 170, h: 48, label: val, primary: val === '켬', tap: tap });
      else {
        gx.button(c, { id: 'setm' + label, x: W / 2 + 40, y: y + 4, w: 52, h: 48, label: '−', tap: minus });
        gx.txt(c, val, W / 2 + 160, y + 36, { size: 20, align: 'center', weight: 'bold', color: gx.C.goldL });
        gx.button(c, { id: 'setp' + label, x: W / 2 + 228, y: y + 4, w: 52, h: 48, label: '+', tap: plus });
      }
      y += 68;
    }
    row('음량', Math.round(S.volume * 100) + '%', function () { Main.setSetting('volume', Math.max(0, Math.round((S.volume - 0.1) * 10) / 10)); }, function () { Main.setSetting('volume', Math.min(1, Math.round((S.volume + 0.1) * 10) / 10)); });
    row('소리 끄기', S.mute ? '켬' : '끔', null, null, function () { Main.setSetting('mute', !S.mute); });
    row('빠르게(연출 생략)', S.fast ? '켬' : '끔', null, null, function () { Main.setSetting('fast', !S.fast); });
    row('화면 흔들림', S.shake ? '켬' : '끔', null, null, function () { Main.setSetting('shake', !S.shake); });
    row('1막 도움말', S.captions ? '켬' : '끔', null, null, function () { Main.setSetting('captions', !S.captions); });
    gx.button(c, { id: 'setClear', x: W / 2 - 170, y: y + 16, w: 340, h: 52, label: U.confirmClear ? '정말 지운다' : '저장 지우기', primary: U.confirmClear,
      tap: function () { if (U.confirmClear) { Run.clearSave(); U.confirmClear = false; } else U.confirmClear = true; } });
    var back = (Main.params && Main.params.back) || 'title';
    gx.button(c, { id: 'setBack', x: W / 2 - 110, y: H - 112, w: 220, h: 54, label: ui('back', '돌아간다'), tap: function () { U.confirmClear = false; Main.go(back); } });
    if (Input.key('Escape')) Main.go(back);
  }

  /* ================================================================ 덱 보기 */
  function cardGrid(c, list, opts) {
    var gx = g(), cw = opts.cw || 108, ch = opts.ch || 154, gap = opts.gap || 14, per = opts.per || 9;
    var x0 = (W - (per * cw + (per - 1) * gap)) / 2, top = opts.top || 110, viewH = opts.viewH || 500;
    var rows = Math.ceil(list.length / per), maxS = Math.max(0, rows * (ch + gap + (opts.priceRow ? 26 : 0)) - viewH);
    U.scroll = Math.max(0, Math.min(maxS, U.scroll));
    c.save(); c.beginPath(); c.rect(0, top - 14, W, viewH + 14); c.clip();
    var hovered = null;
    list.forEach(function (it, i) {
      var x = x0 + (i % per) * (cw + gap), y = top + Math.floor(i / per) * (ch + gap + (opts.priceRow ? 26 : 0)) - U.scroll;
      if (y > top + viewH || y < top - ch - 40) return;
      var on = opts.selected && opts.selected.indexOf(i) >= 0, hov = Input.hover((opts.id || 'grid') + i);
      gx.drawCard(c, it.card, it.up, x, y - (on ? 10 : (hov ? 5 : 0)), cw, ch, { glow: on ? gx.C.goldL : (hov ? 'rgba(255,224,138,.6)' : null), dim: it.dim });
      if (it.price != null) {
        gx.rr(c, x + cw / 2 - 34, y + ch + 3, 68, 22, 11); c.fillStyle = it.sold ? '#3a3a3a' : (it.affordable ? '#2c6a2a' : '#7a2a1a'); c.fill();
        ART.icon(c, 'rice', x + cw / 2 - 20, y + ch + 14, 16);
        gx.txt(c, it.sold ? ui('sold', '팔렸다') : String(it.price), x + cw / 2 + 6, y + ch + 15, { size: 13, align: 'center', base: 'middle', weight: 'bold' });
      }
      if (hov) hovered = { it: it, x: x, y: y };
      Input.zone({ id: (opts.id || 'grid') + i, x: x, y: y, w: cw, h: ch, tap: opts.tap ? function () { opts.tap(i); } : null, long: function () { U.detail = it; } });
    });
    c.restore();
    Input.zone({ id: (opts.id || 'grid') + 'Scroll', x: 0, y: top - 14, w: W, h: viewH + 14, wheel: function (d) { U.scroll += d; }, drag: function (p, dx, dy) { U.scroll -= dy; } });
    var di = hovered && !Input.isTouch ? hovered.it : U.detail;
    if (di && opts.detail !== false) {
      var bx = hovered ? hovered.x + cw + 10 : W / 2 - 175;
      if (hovered && bx + 350 > W) bx = Math.max(10, hovered.x - 360);
      gx.cardInfoBox(c, di.card, di.up, bx, hovered ? Math.min(H - 220, Math.max(60, hovered.y)) : 200, 350, di.extra || []);
    }
    return maxS;
  }
  function deck(c, dt, onClose) {
    var gx = g();
    darkBg(c);
    var list = Run.deck().slice().sort(function (a, b) { var o = 'atk def tac rep edict'; return o.indexOf(a.card.type) - o.indexOf(b.card.type) || (a.card.name < b.card.name ? -1 : 1); });
    gx.txt(c, '내 패 ' + list.length + '장', W / 2, 58, { size: 28, align: 'center', weight: 'bold', color: gx.C.goldL, stroke: 4 });
    var cnt = { atk: 0, def: 0, tac: 0, rep: 0, edict: 0 }; list.forEach(function (d) { cnt[d.card.type]++; });
    gx.txt(c, '공격 ' + cnt.atk + ' · 방어 ' + cnt.def + ' · 계책 ' + cnt.tac + ' · 장계 ' + cnt.rep + ' · 어명 ' + cnt.edict + '   |   강화 ' + list.filter(function (d) { return d.up; }).length + '장', W / 2, 88, { size: 14, align: 'center', color: gx.C.dim, weight: 'bold' });
    cardGrid(c, list, { id: 'dk', top: 118, viewH: 500 });
    gx.button(c, { id: 'dkClose', x: W / 2 - 110, y: H - 80, w: 220, h: 56, label: ui('close', '닫는다'), key: 'Esc', tap: onClose });
    if (Input.key('Escape') || Input.key('KeyD')) onClose();
  }

  /* ================================================================ 프롬프트 화면 */
  function draw(c, dt, p) {
    onPrompt(p); U.t += dt;
    if (!p) { darkBg(c); return; }
    switch (p.kind) {
      case 'map': drawMap(c, p); break;
      case 'event': drawEvent(c, p); break;
      case 'shop': drawShop(c, p); break;
      case 'camp': drawCamp(c, p); break;
      case 'court': drawCourt(c, p); break;
      case 'reward': drawReward(c, p); break;
      case 'merit': drawMerit(c, p); break;
      case 'pickCard': drawPickCard(c, p); break;
      case 'pickGeneral': drawPickGeneral(c, p); break;
      case 'scroll': drawScroll(c, p); break;
      case 'actEnd': drawActEnd(c, p); break;
      case 'council': drawCouncil(c, p); break;
      case 'ending': drawEnding(c, p); break;
      default: darkBg(c); g().txt(c, p.kind, W / 2, H / 2, { size: 20, align: 'center' });
    }
    if (p.kind !== 'ending' && Input.key('KeyD')) openDeck();
  }
  function heading(c, text, y, icon) {
    var gx = g();
    c.font = F(30, 'bold'); var w = Math.max(260, c.measureText(gx.clean(text)).width + (icon ? 110 : 70));
    gx.panel(c, W / 2 - w / 2, y - 32, w, 54, { r: 27, c1: '#a8321f', c2: '#6a1810', border: '#ffe08a' });
    if (icon) ART.icon(c, icon, W / 2 - w / 2 + 34, y - 5, 32);
    gx.txt(c, text, W / 2 + (icon ? 18 : 0), y - 4, { size: 26, align: 'center', base: 'middle', weight: 'bold', stroke: 4, strokeColor: '#3a0a04' });
  }

  /* ---------------------------------------------------------------- 지도 */
  var KIND_NAME = { fight: '싸움', elite: '정예', event: '사건', camp: '군영', shop: '장시', court: '조정', boss: '결전', council: '어전회의' };
  var KIND_COL = { fight: '#d8503a', naval: '#3d86cc', elite: '#8a3fd0', event: '#d8a228', camp: '#3f9a4a', shop: '#e07a2a', court: '#2f5aa8', boss: '#a01818', council: '#6a2a8a' };
  var KIND_ICON = { fight: 'swords', naval: 'anchor', elite: 'skull', event: 'scroll', camp: 'campfire', shop: 'lantern', court: 'palace', boss: 'helm', council: 'crown' };
  function nodeKey(n) { return n.kind === 'fight' && n.type === 'naval' ? 'naval' : n.kind; }
  function drawMap(c, p) {
    var gx = g(), T = X(), G = Run.state(), t = U.t;
    mapBg(c, p.act);
    var minX = 1e9, maxX = -1e9; p.nodes.forEach(function (n) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); });
    var ox = Math.round((W - (minX + maxX)) / 2), nodes = {};
    var pn = p.nodes.map(function (n) { var o = {}; for (var k in n) o[k] = n[k]; o.x = n.x + ox; o.y = n.y + 12; return o; });
    pn.forEach(function (n) { nodes[n.id] = n; });
    var cols = MAPDATA.acts[p.act].cols;
    for (var ci = 0; ci < cols.length - 1; ci++) {
      cols[ci].forEach(function (a) {
        cols[ci + 1].forEach(function (b) {
          var A = nodes[a], Bn = nodes[b]; if (!A || !Bn) return;
          if (MAPDATA.acts[p.act].lanes && A.lane && Bn.lane && A.lane !== Bn.lane) return;
          var onPath = p.path.indexOf(a) >= 0 && p.path.indexOf(b) >= 0;
          c.save();
          c.strokeStyle = onPath ? '#5a2a10' : 'rgba(250,240,210,.75)'; c.lineWidth = onPath ? 7 : 4; c.setLineDash(onPath ? [] : [2, 10]); c.lineCap = 'round';
          c.beginPath(); c.moveTo(A.x, A.y); c.bezierCurveTo((A.x + Bn.x) / 2, A.y, (A.x + Bn.x) / 2, Bn.y, Bn.x, Bn.y); c.stroke();
          c.restore();
        });
      });
    }
    var cur = G.nodeId ? nodes[G.nodeId] : null;
    if (cur) { c.save(); c.strokeStyle = '#ffe08a'; c.lineWidth = 5; c.setLineDash([10, 8]); c.lineDashOffset = -t / 30; p.reachable.forEach(function (id) { var n = nodes[id]; c.beginPath(); c.moveTo(cur.x, cur.y); c.bezierCurveTo((cur.x + n.x) / 2, cur.y, (cur.x + n.x) / 2, n.y, n.x, n.y); c.stroke(); }); c.restore(); }
    var hovered = null;
    pn.forEach(function (n) {
      var open = n.state === 'open', done = n.state === 'done' || n.state === 'current', big = n.kind === 'boss' || n.kind === 'council', r = big ? 36 : 28;
      var hov = Input.hover('nd' + n.id), key = nodeKey(n), col = KIND_COL[key] || '#888';
      var bounce = open ? Math.abs(Math.sin(t / 320 + n.x)) * -6 : 0;
      c.save(); c.globalAlpha = n.state === 'closed' ? 0.55 : 1;
      if (open) { c.beginPath(); c.arc(n.x, n.y, r + 10 + Math.sin(t / 250) * 3, 0, 7); c.fillStyle = 'rgba(255,224,138,.35)'; c.fill(); }
      c.beginPath(); c.ellipse(n.x, n.y + r * 0.85, r * 0.9, r * 0.28, 0, 0, 7); c.fillStyle = 'rgba(0,0,0,.28)'; c.fill();
      c.beginPath(); c.arc(n.x, n.y + bounce, r, 0, 7);
      var ng = c.createRadialGradient(n.x - r * 0.3, n.y + bounce - r * 0.4, r * 0.2, n.x, n.y + bounce, r);
      ng.addColorStop(0, ART.shade(done ? '#7a6a5a' : col, 0.35)); ng.addColorStop(1, done ? '#4a3e34' : col);
      c.fillStyle = ng; c.fill(); c.lineWidth = 4; c.strokeStyle = hov || U.sel === n.id ? '#ffe08a' : '#1d140d'; c.stroke();
      c.beginPath(); c.arc(n.x, n.y + bounce, r - 5, 0, 7); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke();
      ART.icon(c, KIND_ICON[key] || 'star', n.x, n.y + bounce, r * 1.05);
      if (done && n.state !== 'current') { c.beginPath(); c.arc(n.x + r * 0.7, n.y - r * 0.7, 10, 0, 7); c.fillStyle = '#3f9a4a'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(n.x + r * 0.7 - 5, n.y - r * 0.7); c.lineTo(n.x + r * 0.7 - 1, n.y - r * 0.7 + 4); c.lineTo(n.x + r * 0.7 + 6, n.y - r * 0.7 - 4); c.stroke(); }
      gx.txt(c, n.name, n.x, n.y + r + 20, { size: 14, align: 'center', weight: 'bold', color: '#fff', stroke: 4, strokeColor: '#1d140d', maxW: 150 });
      c.restore();
      if (hov) hovered = n;
      Input.zone({ id: 'nd' + n.id, x: n.x - r - 8, y: n.y - r - 8, w: r * 2 + 16, h: r * 2 + 34, enabled: true,
        tap: open ? function () {
          if (Input.isTouch && U.sel !== n.id) { U.sel = n.id; return; }
          answer({ nodeId: n.id });
        } : function () { U.sel = n.id; } });
    });
    // 장수 말 — 지금 있는 마디 위(처음에는 첫 열 왼쪽)
    var tokX, tokY;
    if (cur) { tokX = cur.x; tokY = cur.y - 58; }
    else { var f = p.reachable.map(function (id) { return nodes[id]; }); tokX = Math.min.apply(null, f.map(function (n) { return n.x; })) - 74; tokY = f.reduce(function (s, n) { return s + n.y; }, 0) / f.length - 6; }
    var tb = Math.sin(t / 300) * 4;
    c.beginPath(); c.moveTo(tokX - 9, tokY + 26 + tb); c.lineTo(tokX + 9, tokY + 26 + tb); c.lineTo(tokX, tokY + 40 + tb); c.closePath(); c.fillStyle = '#ffe08a'; c.fill();
    ART.portrait(c, G.leader, tokX, tokY + tb, 28, { t: t, ring: '#ffe08a' });
    // 막 제목
    var a = MAPDATA.acts[p.act];
    gx.panel(c, 14, 62, 330, 72, { r: 14 });
    c.beginPath(); c.arc(52, 98, 26, 0, 7); c.fillStyle = '#c8352a'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffe08a'; c.stroke();
    gx.txt(c, String(p.act), 52, 99, { size: 26, align: 'center', base: 'middle', weight: 'bold', stroke: 3 });
    gx.txt(c, a.title, 90, 96, { size: 23, weight: 'bold', color: gx.C.goldL, stroke: 3 });
    gx.txt(c, a.period, 90, 120, { size: 13, color: gx.C.dim, weight: 'bold' });
    hud(c);
    gx.button(c, { id: 'mapSave', x: W - 280, y: 4, w: 140, h: 44, label: '저장·나가기', size: 14, key: 'S', tap: saveExit });
    if (Input.key('KeyS')) saveExit();
    var info = hovered || (U.sel ? nodes[U.sel] : null);
    if (info) mapInfo(c, info, p.reachable.indexOf(info.id) >= 0);
    else { gx.panel(c, W / 2 - 220, H - 54, 440, 40, { r: 20 }); gx.txt(c, Input.isTouch ? '빛나는 마디를 누르고, 한 번 더 누르면 들어간다' : '빛나는 마디를 골라 나아간다', W / 2, H - 33, { size: 15, align: 'center', base: 'middle', weight: 'bold', color: gx.C.goldL }); }
    for (var k2 = 0; k2 < p.reachable.length && k2 < 9; k2++) if (Input.key('Digit' + (k2 + 1))) answer({ nodeId: p.reachable[k2] });
  }
  function saveExit() { Run.save(); Main.go('title'); }
  function mapInfo(c, n, open) {
    var gx = g(), T = X();
    var w = 560, h = 104, x = (W - w) / 2, y = H - h - 10, key = nodeKey(n);
    gx.panel(c, x, y, w, h, { r: 16 });
    c.beginPath(); c.arc(x + 46, y + h / 2, 32, 0, 7); c.fillStyle = KIND_COL[key] || '#888'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1d140d'; c.stroke();
    ART.icon(c, KIND_ICON[key] || 'star', x + 46, y + h / 2, 36);
    gx.txt(c, n.name, x + 92, y + 32, { size: 21, weight: 'bold', color: gx.C.goldL, stroke: 3 });
    var kind = KIND_NAME[n.kind] || n.kind;
    if (n.kind === 'fight' && n.type) kind += ' · ' + ({ field: '야전', siege: '수성', assault: '공성', naval: '해전' }[n.type] || '');
    if (n.terrain && n.terrain !== 'none' && T.terrain && T.terrain[n.terrain]) kind += ' · ' + T.terrain[n.terrain].name;
    gx.txt(c, kind + (n.do && n.do !== '—' ? ' · ' + n.do + '도' : ''), x + w - 18, y + 30, { size: 13, color: gx.C.dim, align: 'right', weight: 'bold' });
    gx.txt(c, (n.date && T.date ? T.date(n.date) : ''), x + 92, y + 56, { size: 13, color: '#ffd8a0', weight: 'bold' });
    gx.para(c, n.blurb || '', x + 92, y + 82, w - 110, { size: 13.5, color: gx.C.text, max: 1 });
    if (open && Input.isTouch && U.sel === n.id) gx.txt(c, '한 번 더 누르면 들어간다', x + w - 18, y + h - 12, { size: 12, align: 'right', color: gx.C.goldL, weight: 'bold' });
  }

  /* ---------------------------------------------------------------- 사건 */
  function drawEvent(c, p) {
    var gx = g(), G = Run.state(), T = X();
    backdrop(c, G.act);
    hud(c);
    var w = 860, x = (W - w) / 2, y = 64, h = 646;
    gx.scrollPanel(c, x, y, w, h);
    ART.portrait(c, G.leader, x + 70, y + 84, 44, { t: U.t });
    gx.txt(c, p.title, W / 2 + 30, y + 70, { size: 30, align: 'center', weight: 'bold', color: '#3a1a08' });
    var nd = p.nodeId ? MAPDATA.nodes.byId[p.nodeId] : null;
    if (nd && nd.date && T.date) gx.txt(c, T.date(nd.date) + ' · ' + nd.name, W / 2 + 30, y + 98, { size: 14, align: 'center', color: '#8a5a2e', weight: 'bold' });
    var ty = y + 148;
    p.text.forEach(function (par) { ty += gx.para(c, par, x + 60, ty, w - 120, { size: 16.5, color: '#2a1c10', lh: 27 }) + 8; });
    var by = Math.max(ty + 6, y + h - 36 - p.choices.length * 76);
    p.choices.forEach(function (ch, i) {
      var bx = x + 44, bw = w - 88, bh = 66, yy = by + i * 76, hov = Input.hover('ev' + i) && ch.enabled;
      c.save();
      c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
      gx.rr(c, bx, yy - (hov ? 2 : 0), bw, bh, 12);
      var cg = c.createLinearGradient(0, yy, 0, yy + bh);
      if (!ch.enabled) { cg.addColorStop(0, '#cfc4b0'); cg.addColorStop(1, '#b8ac96'); } else if (hov) { cg.addColorStop(0, '#ffeec8'); cg.addColorStop(1, '#f2d090'); } else { cg.addColorStop(0, '#fff8e8'); cg.addColorStop(1, '#f2e2c0'); }
      c.fillStyle = cg; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
      c.lineWidth = hov ? 3 : 2; c.strokeStyle = ch.enabled ? (hov ? '#c8352a' : '#8a5a2e') : '#9a8a72'; c.stroke();
      c.restore();
      c.beginPath(); c.arc(bx + 30, yy + bh / 2, 17, 0, 7); c.fillStyle = ch.enabled ? '#c8352a' : '#8a7a68'; c.fill();
      gx.txt(c, String(i + 1), bx + 30, yy + bh / 2 + 1, { size: 17, align: 'center', base: 'middle', weight: 'bold' });
      gx.txt(c, ch.text, bx + 60, yy + 27, { size: 18, weight: 'bold', color: ch.enabled ? '#22170d' : '#7a6a58', maxW: bw - 76 });
      gx.txt(c, ch.enabled ? ch.preview : ch.reason, bx + 60, yy + 51, { size: 13.5, color: ch.enabled ? '#a03a14' : '#7a4a3a', maxW: bw - 76, weight: 'bold' });
      Input.zone({ id: 'ev' + i, x: bx, y: yy, w: bw, h: bh, enabled: ch.enabled, tap: function () { answer({ choice: i }); } });
      if (ch.enabled && Input.key('Digit' + (i + 1))) answer({ choice: i });
    });
  }

  /* ---------------------------------------------------------------- 장시 */
  function drawShop(c, p) {
    var gx = g(), G = Run.state();
    backdrop(c, G.act);
    hud(c);
    heading(c, '장시', 98, 'lantern');
    gx.txt(c, '군량으로 패와 물건을 산다. 환향은 한 번뿐이다.', W / 2, 140, { size: 15, align: 'center', color: '#fff2d8', weight: 'bold', stroke: 4 });
    if (U.shop === 'remove') return shopRemove(c, p);
    var items = p.cards.map(function (it) { return { card: it.card, up: false, price: it.price, sold: it.sold, affordable: it.affordable, dim: it.sold || !it.affordable }; });
    var per = items.length, cw = 116, gap = 24, x0 = (W - (per * cw + (per - 1) * gap)) / 2;
    items.forEach(function (it, i) {
      var x = x0 + i * (cw + gap), y = 158, hov = Input.hover('sc' + i);
      gx.drawCard(c, it.card, false, x, y - (hov ? 6 : 0), cw, 166, { dim: it.dim, glow: hov && !it.dim ? gx.C.goldL : null });
      gx.rr(c, x + cw / 2 - 36, y + 172, 72, 26, 13); c.fillStyle = it.sold ? '#3a3a3a' : (it.affordable ? '#2c6a2a' : '#7a2a1a'); c.fill(); c.lineWidth = 2; c.strokeStyle = '#1d140d'; c.stroke();
      ART.icon(c, 'rice', x + cw / 2 - 20, y + 185, 18);
      gx.txt(c, it.sold ? ui('sold', '팔렸다') : String(it.price), x + cw / 2 + 8, y + 186, { size: 15, align: 'center', base: 'middle', weight: 'bold' });
      Input.zone({ id: 'sc' + i, x: x, y: y, w: cw, h: 200, enabled: !it.sold && it.affordable, tap: function () { answer({ buy: 'card', idx: i }); }, long: function () { U.detail = it; } });
      if (hov && !Input.isTouch) gx.cardInfoBox(c, it.card, false, x + cw + 370 > W ? x - 360 : x + cw + 8, 158, 350);
    });
    p.relics.forEach(function (r, i) {
      var x = W / 2 - 320 + i * 340, y = 400, w = 300, h = 118, hov = Input.hover('sr' + i), en = !r.sold && r.affordable;
      gx.panel(c, x, y, w, h, { border: hov && en ? '#ffe08a' : '#b8944a' });
      relicBadge(c, r.id, x + 52, y + h / 2, 34);
      gx.txt(c, r.relic.name, x + 98, y + 34, { size: 17, weight: 'bold', color: gx.C.goldL, maxW: w - 108 });
      gx.para(c, r.relic.desc, x + 98, y + 58, w - 108, { size: 12.5, color: gx.C.text, lh: 18, max: 2 });
      ART.icon(c, 'rice', x + w - 64, y + h - 18, 18);
      gx.txt(c, r.sold ? ui('sold', '팔렸다') : String(r.price), x + w - 16, y + h - 12, { size: 15, align: 'right', weight: 'bold', color: en ? '#9fe08f' : '#ff8d76' });
      Input.zone({ id: 'sr' + i, x: x, y: y, w: w, h: h, enabled: en, tap: function () { answer({ buy: 'relic', idx: i }); } });
    });
    gx.button(c, { id: 'shRm', x: W / 2 - 320, y: 548, w: 310, h: 66, label: ui('remove', '환향') + ' — 패 하나 돌려보내기', icon: 'back', sub: p.removeUsed ? ui('removeDone', '이미 한 장을 돌려보냈다') : '군량 ' + p.removePrice + ' (어명 ' + p.removeEdictPrice + ')',
      enabled: !p.removeUsed && p.ration >= p.removePrice, tap: function () { U.shop = 'remove'; U.scroll = 0; } });
    gx.button(c, { id: 'shLeave', x: W / 2 + 10, y: 548, w: 310, h: 66, label: ui('leave', '떠난다'), primary: true, key: 'Esc', tap: function () { answer({ leave: true }); } });
    if (Input.key('Escape')) answer({ leave: true });
  }
  function shopRemove(c, p) {
    var gx = g();
    var list = p.deck.map(function (d) { var pr = d.card.type === 'edict' ? p.removeEdictPrice : p.removePrice; return { card: d.card, up: d.up, uid: d.uid, price: pr, affordable: p.ration >= pr, dim: p.ration < pr }; });
    gx.txt(c, '돌려보낼 패를 고른다', W / 2, 166, { size: 18, align: 'center', weight: 'bold' });
    cardGrid(c, list, { id: 'rm', top: 190, viewH: 420, priceRow: true, tap: function (i) { if (list[i].affordable) { U.shop = null; answer({ remove: list[i].uid }); } } });
    gx.button(c, { id: 'rmBack', x: W / 2 - 110, y: H - 70, w: 220, h: 52, label: ui('back', '돌아간다'), tap: function () { U.shop = null; } });
    if (Input.key('Escape')) U.shop = null;
  }

  /* ---------------------------------------------------------------- 군영 */
  var CAMP_ICON = { rest: 'campfire', train: 'swords', farm: 'rice' };
  var CAMP_COL = { rest: ['#3f8a4a', '#1f4a2a'], train: ['#a8452a', '#5a1f10'], farm: ['#b8902a', '#6a4a10'] };
  function optionCard(c, id, x, y, w, h, o) {
    var gx = g(), hov = Input.hover(id) && o.enabled, col = o.col || ['#5a4a3a', '#2a2018'];
    c.save();
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    gx.rr(c, x, y - (hov ? 8 : 0), w, h, 18);
    var cg = c.createLinearGradient(0, y, 0, y + h); cg.addColorStop(0, o.enabled ? col[0] : '#6a6258'); cg.addColorStop(1, o.enabled ? col[1] : '#3a342e');
    c.fillStyle = cg; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.lineWidth = 4; c.strokeStyle = hov ? '#ffe08a' : '#e6b84a'; c.stroke();
    c.restore();
    var yy = y - (hov ? 8 : 0);
    c.beginPath(); c.arc(x + w / 2, yy + 92, 60, 0, 7); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill();
    if (o.person) ART.portrait(c, o.person, x + w / 2, yy + 92, 58, { t: U.t }); else ART.icon(c, o.icon, x + w / 2, yy + 92, 84);
    gx.txt(c, o.title, x + w / 2, yy + 190, { size: 26, align: 'center', weight: 'bold', stroke: 4 });
    gx.para(c, o.desc || '', x + 24, yy + 224, w - 48, { size: 14, color: '#fff2dc', lh: 21, max: 3 });
    gx.panel(c, x + 20, yy + h - 58, w - 40, 40, { r: 20, c1: 'rgba(0,0,0,.35)', c2: 'rgba(0,0,0,.45)', border: 'rgba(255,224,138,.6)' });
    gx.txt(c, o.enabled ? o.preview : o.reason, x + w / 2, yy + h - 38, { size: 15, align: 'center', base: 'middle', weight: 'bold', color: o.enabled ? '#c8ffb0' : '#ffb0a0', maxW: w - 50 });
    Input.zone({ id: id, x: x, y: y, w: w, h: h, enabled: o.enabled, tap: o.tap });
  }
  function drawCamp(c, p) {
    var gx = g(), G = Run.state();
    backdrop(c, G.act);
    hud(c);
    heading(c, '군영', 100, 'tent');
    gx.txt(c, p.enter || '천막이 섰다. 하루를 어떻게 쓸 것인가.', W / 2, 146, { size: 17, align: 'center', weight: 'bold', stroke: 4 });
    p.options.forEach(function (o, i) {
      var w = 310, h = 400, x = W / 2 + (i - 1) * 340 - w / 2, y = 180;
      optionCard(c, 'cp' + o.id, x, y, w, h, { enabled: o.enabled, icon: CAMP_ICON[o.id], col: CAMP_COL[o.id], title: o.text, desc: o.desc, preview: o.preview, reason: o.reason, tap: function () { answer({ pick: o.id }); } });
      if (o.enabled && Input.key('Digit' + (i + 1))) answer({ pick: o.id });
    });
  }

  /* ---------------------------------------------------------------- 조정 */
  var COURT_ICON = { report: 'letter', recruit: 'people', request: 'ming' };
  var COURT_COL = { report: ['#b8902a', '#6a4a10'], recruit: ['#3a6ab0', '#1a3060'], request: ['#a8452a', '#5a1f10'] };
  function drawCourt(c, p) {
    var gx = g(), G = Run.state();
    backdrop(c, G.act);
    hud(c);
    heading(c, '조정', 100, 'palace');
    gx.txt(c, p.enter || '궁궐의 문이 열렸다. 전하께 무엇을 아뢸 것인가.', W / 2, 146, { size: 17, align: 'center', weight: 'bold', stroke: 4 });
    if (U.sel === 'recruit') return courtRecruit(c, p);
    if (U.sel === 'request') return courtRequest(c, p);
    p.options.forEach(function (o, i) {
      var w = 310, h = 400, x = W / 2 + (i - 1) * 340 - w / 2, y = 180;
      optionCard(c, 'ct' + o.id, x, y, w, h, { enabled: o.enabled, icon: COURT_ICON[o.id], col: COURT_COL[o.id], title: o.text, desc: o.desc, preview: o.preview, reason: o.reason, tap: function () { pickCourt(p, o.id); } });
      if (o.enabled && Input.key('Digit' + (i + 1))) pickCourt(p, o.id);
    });
  }
  function pickCourt(p, id) {
    if (id === 'report') answer({ pick: 'report' });
    else if (id === 'recruit') { if (p.recruits.length === 1) answer({ pick: 'recruit', id: p.recruits[0].general.id }); else U.sel = 'recruit'; }
    else U.sel = 'request';
  }
  function courtRecruit(c, p) {
    var gx = g();
    gx.txt(c, '누구를 천거하는가', W / 2, 178, { size: 20, align: 'center', weight: 'bold', color: gx.C.goldL });
    p.recruits.forEach(function (r, i) {
      var d = r.general, w = 340, h = 380, x = W / 2 + (i - (p.recruits.length - 1) / 2) * 370 - w / 2, y = 200;
      var cd = d.card ? CARDS.byId[d.card] : null;
      optionCard(c, 'rc' + i, x, y, w, h, { enabled: true, person: d.id, col: ['#3a6ab0', '#1a3060'], title: d.name, desc: d.passiveDesc, preview: cd ? '고유 패: ' + cd.name : '부장으로 맞는다', tap: function () { answer({ pick: 'recruit', id: d.id }); } });
      if (r.slotFull) gx.txt(c, '자리가 찼다 — 한 사람과 바꾼다', x + w / 2, y + h + 22, { size: 13, align: 'center', color: gx.C.dim, weight: 'bold' });
    });
    gx.button(c, { id: 'rcBack', x: W / 2 - 110, y: H - 76, w: 220, h: 52, label: ui('back', '돌아간다'), tap: function () { U.sel = null; } });
  }
  function courtRequest(c, p) {
    var gx = g();
    gx.txt(c, '어느 군사를 청하는가 — 군량 ' + B.COURT.requestCost, W / 2, 178, { size: 20, align: 'center', weight: 'bold', color: gx.C.goldL });
    var list = (p.mingCards || []).map(function (cd) { return { card: cd, up: false }; });
    var cw = 136, gap = 34, x0 = (W - (list.length * cw + (list.length - 1) * gap)) / 2;
    list.forEach(function (it, i) {
      var x = x0 + i * (cw + gap), y = 220, hov = Input.hover('rq' + i);
      gx.drawCard(c, it.card, false, x, y - (hov ? 8 : 0), cw, 194, { glow: hov ? gx.C.goldL : null });
      Input.zone({ id: 'rq' + i, x: x, y: y, w: cw, h: 194, tap: function () { answer({ pick: 'request', cardId: it.card.id }); } });
      if (hov && !Input.isTouch) gx.cardInfoBox(c, it.card, false, x + cw + 360 > W ? x - 360 : x + cw + 10, 220, 350);
    });
    gx.button(c, { id: 'rqBack', x: W / 2 - 110, y: H - 76, w: 220, h: 52, label: ui('back', '돌아간다'), tap: function () { U.sel = null; } });
  }

  /* ---------------------------------------------------------------- 보상 */
  function drawReward(c, p) {
    var gx = g(), G = Run.state(), t = U.t;
    backdrop(c, G.act);
    hud(c);
    // 빛줄기
    c.save(); c.globalAlpha = 0.18; c.translate(W / 2, 300); c.rotate(t / 4000);
    for (var i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillStyle = '#ffe08a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-60, -700); c.lineTo(60, -700); c.closePath(); c.fill(); }
    c.restore();
    heading(c, p.boss ? '결전 승리!' : (p.elite ? '정예를 꺾었다!' : '승리!'), 100, 'star');
    var parts = [];
    ART.icon(c, 'rice', W / 2 - 120, 150, 30); gx.txt(c, '군량 +' + p.ration, W / 2 - 98, 158, { size: 20, weight: 'bold', stroke: 3 });
    if (p.relic) { relicBadge(c, p.relic.id, W / 2 + 40, 150, 18); gx.txt(c, p.relic.name, W / 2 + 64, 158, { size: 18, weight: 'bold', color: gx.C.goldL, stroke: 3 }); gx.txt(c, p.relic.desc, W / 2, 190, { size: 13.5, align: 'center', color: gx.C.dim, maxW: 760, weight: 'bold' }); }
    gx.txt(c, '패 한 장을 덱에 넣는다', W / 2, 222, { size: 16, align: 'center', color: '#fff', weight: 'bold' });
    var cw = 150, ch = 214, gap = 44, n = p.cards.length, x0 = (W - (n * cw + (n - 1) * gap)) / 2;
    p.cards.forEach(function (cd, i) {
      var x = x0 + i * (cw + gap), y = 244, hov = Input.hover('rw' + i), pop = Math.min(1, Math.max(0, (t - i * 120) / 260));
      c.save(); c.globalAlpha = pop; c.translate(x + cw / 2, y + ch / 2); c.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop);
      gx.drawCard(c, cd, false, -cw / 2, -ch / 2 - (hov ? 12 : 0), cw, ch, { glow: hov ? gx.C.goldL : null });
      c.restore();
      var T = X(); gx.txt(c, [(T.pool || {})[cd.pool], cd.rarity ? (T.rarity || {})[cd.rarity] : ''].filter(Boolean).join(' · '), x + cw / 2, y + ch + 24, { size: 13, align: 'center', color: gx.C.dim, weight: 'bold' });
      Input.zone({ id: 'rw' + i, x: x, y: y, w: cw, h: ch, tap: function () { if (Input.isTouch && U.sel !== i) { U.sel = i; return; } answer({ cardIdx: i }); } });
      if ((hov && !Input.isTouch) || (Input.isTouch && U.sel === i)) gx.cardInfoBox(c, cd, false, x + cw + 360 > W ? x - 360 : x + cw + 10, 244, 350, Input.isTouch ? [{ text: '한 번 더 누르면 넣는다', color: gx.C.goldL }] : []);
      if (Input.key('Digit' + (i + 1))) answer({ cardIdx: i });
    });
    gx.button(c, { id: 'rwSkip', x: W / 2 - 140, y: 556, w: 280, h: 62, label: ui('skip', '거른다'), sub: '군량 +' + p.skipBonus, tap: function () { answer({ cardIdx: null }); } });
  }

  /* ---------------------------------------------------------------- 장계 분배 */
  function meritEffects(m) {
    var M = B.MERIT, out = {};
    var ups = Math.min(M.leaderMaxUp, Math.floor(m.leader / M.leaderPer)), sUp = m.leader >= 10 ? M.leaderSusp10 : (m.leader >= 5 ? M.leaderSusp5 : 0);
    var kS = Math.floor(m.king / M.kingPer), down = Math.min(M.kingMaxDown, kS);
    out.leader = '패 강화 ' + ups + '장' + (sUp ? ' · 의심 +' + sUp : '');
    out.king = '의심 −' + down + ' · 군량 +' + kS * M.kingRation;
    out.ming = '다음 막 명군 군량 −' + Math.min(M.mingMaxDiscount, Math.floor(m.ming / M.mingPer));
    return out;
  }
  var MERIT_ICON = { leader: 'sword', king: 'crown', ming: 'ming' };
  function drawMerit(c, p) {
    var gx = g(), G = Run.state(), T = X(), M = U.merit;
    backdrop(c, G.act);
    hud(c);
    var w = 800, x = (W - w) / 2, y = 66, h = 620;
    gx.scrollPanel(c, x, y, w, h);
    gx.txt(c, '장계 — 공을 나눈다', W / 2, y + 62, { size: 30, align: 'center', weight: 'bold', color: '#3a1a08' });
    gx.txt(c, (T.merit && T.merit.head) || '전하께 아뢰옵니다. 이번 싸움의 공은 ___에게 있사옵니다.', W / 2, y + 98, { size: 16, align: 'center', color: '#5a3a1a', weight: 'bold' });
    var left = p.total - (M.leader + M.king + (M.ming || 0));
    gx.txt(c, '공 ' + p.total + '점 · 남은 공 ' + left, W / 2, y + 132, { size: 16, align: 'center', color: left ? '#c8352a' : '#2c7a2a', weight: 'bold' });
    var eff = meritEffects(M);
    p.slots.forEach(function (s, i) {
      var yy = y + 166 + i * 112, name = (T.merit && T.merit.slots && T.merit.slots[s]) || s;
      c.beginPath(); c.arc(x + 82, yy + 30, 30, 0, 7); c.fillStyle = '#5a3a1a'; c.fill(); ART.icon(c, MERIT_ICON[s] || 'star', x + 82, yy + 30, 36);
      gx.txt(c, name, x + 82, yy + 82, { size: 17, align: 'center', weight: 'bold', color: '#3a1a08' });
      gx.button(c, { id: 'mm' + s, x: x + 150, y: yy + 6, w: 52, h: 48, label: '−', enabled: M[s] > 0, tap: function () { M[s]--; } });
      for (var k = 0; k < p.total; k++) { gx.rr(c, x + 214 + k * 24, yy + 18, 20, 24, 4); c.fillStyle = k < M[s] ? '#d8452a' : 'rgba(90,60,30,.18)'; c.fill(); }
      gx.button(c, { id: 'mp' + s, x: x + 460, y: yy + 6, w: 52, h: 48, label: '+', enabled: left > 0, tap: function () { M[s]++; } });
      gx.txt(c, String(M[s]), x + 548, yy + 40, { size: 26, weight: 'bold', color: '#3a1a08' });
      gx.txt(c, eff[s] || '', x + 214, yy + 70, { size: 15, color: '#a03a14', weight: 'bold' });
      if (T.merit && T.merit.effects && T.merit.effects[s]) gx.txt(c, T.merit.effects[s], x + 214, yy + 92, { size: 12, color: '#8a6a4a', maxW: 520 });
    });
    gx.button(c, { id: 'mOk', x: W / 2 - 140, y: y + h - 96, w: 280, h: 60, label: (T.merit && T.merit.confirm) || '장계를 봉한다', primary: true, enabled: left === 0, icon: 'letter',
      tap: function () { answer({ alloc: { leader: M.leader, king: M.king, ming: M.ming || 0 } }); } });
  }

  /* ---------------------------------------------------------------- 카드·장수 고르기 */
  var PICK_TITLE = { upgrade: '강화할 패를 고른다', train: '조련 — 강화할 패를 고른다', offer: '덱에 넣을 패를 고른다', remove: '돌려보낼 패를 고른다' };
  function drawPickCard(c, p) {
    var gx = g(), G = Run.state();
    backdrop(c, G.act);
    hud(c);
    heading(c, PICK_TITLE[p.reason] || '패를 고른다', 100, p.reason === 'offer' ? 'plus' : 'star');
    gx.txt(c, p.n + '장' + (p.canSkip ? ' (거를 수 있다)' : ''), W / 2, 146, { size: 15, align: 'center', color: '#fff2d8', weight: 'bold', stroke: 4 });
    var list = p.candidates.map(function (cd) {
      var extra = []; if (p.reason === 'upgrade' || p.reason === 'train') { var pl = cd.card.plus || {}; extra.push({ text: '강화하면: ' + (pl.desc || cd.card.desc), color: gx.C.goldL, bold: true }); }
      return { card: cd.card, up: cd.up, extra: extra };
    });
    cardGrid(c, list, { id: 'pk', top: 168, viewH: 430, per: 8, cw: 118, ch: 168, selected: U.picks,
      tap: function (i) { var k = U.picks.indexOf(i); if (k >= 0) U.picks.splice(k, 1); else { U.picks.push(i); if (U.picks.length > p.n) U.picks.shift(); } } });
    var need = Math.min(p.n, p.candidates.length);
    gx.button(c, { id: 'pkOk', x: W / 2 - (p.canSkip ? 290 : 140), y: H - 84, w: 280, h: 60, label: ui('confirm', '그리한다'), primary: true, enabled: U.picks.length === need || (p.canSkip && U.picks.length > 0),
      tap: function () { answer({ picks: U.picks.slice() }); } });
    if (p.canSkip) gx.button(c, { id: 'pkSkip', x: W / 2 + 10, y: H - 84, w: 280, h: 60, label: ui('skip', '거른다'), tap: function () { answer({ picks: [] }); } });
  }
  function drawPickGeneral(c, p) {
    var gx = g(), G = Run.state();
    backdrop(c, G.act);
    hud(c);
    var inc = p.incoming, joining = p.reason === 'optional' && p.candidates[0] && p.candidates[0].general.id === inc.id;
    heading(c, inc.name + (joining ? '이(가) 진중에 들기를 청한다' : '이(가) 왔다 — 자리가 찼다'), 100, 'people');
    ART.person(c, inc.id, W / 2, 330, 1.2, { t: U.t, pose: 'win' });
    gx.para(c, inc.passiveDesc || '', W / 2, 366, 640, { size: 16, align: 'center', weight: 'bold', color: '#ffe8b8' });
    if (!joining) {
      gx.txt(c, '누구를 내보내는가', W / 2, 420, { size: 17, align: 'center', color: gx.C.dim, weight: 'bold' });
      p.candidates.forEach(function (cd, i) {
        var d = cd.general, x = W / 2 + (i - (p.candidates.length - 1) / 2) * 300 - 135, y = 440, w = 270, h = 170, hov = Input.hover('pg' + i);
        gx.panel(c, x, y - (hov ? 4 : 0), w, h, { border: hov ? '#ffe08a' : '#b8944a' });
        ART.portrait(c, d.id, x + 58, y + 66, 42, { t: U.t });
        gx.txt(c, d.name, x + 112, y + 50, { size: 19, weight: 'bold', color: gx.C.goldL });
        gx.para(c, d.passiveDesc || '', x + 112, y + 76, w - 124, { size: 12, color: gx.C.text, lh: 17, max: 4 });
        Input.zone({ id: 'pg' + i, x: x, y: y, w: w, h: h, tap: function () { answer({ id: d.id }); } });
      });
    } else gx.button(c, { id: 'pgYes', x: W / 2 - 140, y: 470, w: 280, h: 62, label: '받아들인다', primary: true, tap: function () { answer({ id: inc.id }); } });
    gx.button(c, { id: 'pgNo', x: W / 2 - 140, y: H - 80, w: 280, h: 56, label: ui('decline', '사양한다'), tap: function () { answer({ id: null }); } });
  }

  /* ---------------------------------------------------------------- 두루마리 */
  function bossOf(encId) {
    var enc = ENEMIES.encounters.byId[encId]; if (!enc) return null;
    var spec = (enc.waves && enc.waves.length) ? enc.waves[0].enemies : enc.enemies;
    var id = spec && spec[0] ? spec[0].id : null; if (!id) return null;
    var tpl = ENEMIES.byId[id]; return tpl ? { id: id, tags: tpl.tags, boss: (tpl.tags || []).indexOf('boss') >= 0 || !!enc.boss, buildCount: 0 } : null;
  }
  function drawScroll(c, p) {
    var gx = g(), G = Run.state(), T = X(), boss = p.key === 'bossIntro', intro = p.key === 'actIntro', t = U.t;
    if (boss) {
      var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3a0a08'); bg.addColorStop(0.6, '#7a1a10'); bg.addColorStop(1, '#1a0604');
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.save(); c.globalAlpha = 0.12; c.translate(860, 360); c.rotate(t / 5000);
      for (var i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.fillStyle = '#ffb060'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-50, -800); c.lineTo(50, -800); c.closePath(); c.fill(); }
      c.restore();
      var fo = bossOf(p.encId);
      var slide = Math.min(1, t / 500);
      if (fo) {
        c.save(); c.translate((1 - slide) * 300, 0);
        if (ART.isShip(fo)) ART.wship(c, fo, 900, 600, 1.6, { t: t }); else if (fo.id === 'wajo_garrison') ART.castle(c, fo, 900, 600, 2.2, { t: t }); else ART.foe(c, fo, 900, 640, 2.4, { t: t });
        c.restore();
      }
      c.save(); c.globalAlpha = slide;
      gx.txt(c, '결전', 90, 140, { size: 22, weight: 'bold', color: '#ffb080', stroke: 4 });
      gx.txt(c, p.title, 90, 210, { size: 58, weight: 'bold', color: '#fff2d8', stroke: 8, strokeColor: '#3a0604', maxW: 640 });
      if (p.date && T.date) gx.txt(c, T.date(p.date), 92, 252, { size: 18, color: '#ffd8a0', weight: 'bold', stroke: 3 });
      var ty = 310; p.lines.forEach(function (l) { ty += gx.para(c, l, 92, ty, 560, { size: 18, color: '#fff', lh: 30, weight: 'bold', stroke: 3 }) + 8; });
      c.restore();
      gx.button(c, { id: 'scOk', x: 92, y: H - 120, w: 280, h: 66, label: '전투 시작!', primary: true, icon: 'swords', key: 'Enter', tap: function () { answer({}); } });
    } else {
      backdrop(c, G.act);
      hud(c, { deck: !intro });
      var k2 = Math.min(1, t / 400);
      c.save(); c.globalAlpha = k2;
      var w = 780, x = (W - w) / 2, y = 84, h = 560;
      gx.scrollPanel(c, x, y, w, h);
      if (intro) { c.beginPath(); c.arc(W / 2, y + 70, 36, 0, 7); c.fillStyle = '#c8352a'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#ffe08a'; c.stroke(); gx.txt(c, String(G.act) + '막', W / 2, y + 71, { size: 22, align: 'center', base: 'middle', weight: 'bold', stroke: 3 }); }
      gx.txt(c, intro ? String(p.title).replace(/^\s*\S*막\s*·\s*/, '') : p.title, W / 2, y + (intro ? 140 : 76), { size: intro ? 34 : 30, align: 'center', weight: 'bold', color: '#3a1a08' });
      if (p.memo) gx.txt(c, /^\d{4}\./.test(p.memo) && T.date ? T.date(p.memo) : p.memo, W / 2, y + (intro ? 172 : 108), { size: 15, align: 'center', color: '#8a5a2e', weight: 'bold' });
      var yy = y + (intro ? 216 : 156); p.lines.forEach(function (l) { yy += gx.para(c, l, x + 64, yy, w - 128, { size: 17, color: '#2a1c10', lh: 28 }) + 10; });
      c.restore();
      gx.button(c, { id: 'scOk', x: W / 2 - 130, y: y + h - 94, w: 260, h: 60, label: ui('continue', '계속'), primary: true, key: 'Enter', tap: function () { answer({}); } });
    }
    if (U.t > 300 && (Input.key('Enter') || Input.key('Space'))) answer({});
  }

  /* ---------------------------------------------------------------- 막 결산 */
  function drawActEnd(c, p) {
    var gx = g(), G = Run.state(), T = X(), s = p.summary;
    backdrop(c, G.act);
    hud(c);
    var w = 920, x = (W - w) / 2, y = 64, h = 630;
    gx.scrollPanel(c, x, y, w, h);
    gx.txt(c, p.act + '막 「' + s.title + '」 완료!', W / 2, y + 64, { size: 30, align: 'center', weight: 'bold', color: '#3a1a08' });
    var dates = s.dates || [];
    if (dates.length && T.date) gx.txt(c, T.date(dates[0]) + ' — ' + T.date(dates[dates.length - 1]), W / 2, y + 94, { size: 14, align: 'center', color: '#8a5a2e', weight: 'bold' });
    var lx = x + 64, ly = y + 140;
    ART.icon(c, 'swords', lx + 10, ly - 6, 24); gx.txt(c, '치른 싸움', lx + 30, ly, { size: 17, weight: 'bold', color: '#a8321f' });
    s.fights.slice(0, 7).forEach(function (f, i) { var nd = MAPDATA.nodes.byId[f.node]; gx.txt(c, (nd ? nd.name : f.enc) + ' — ' + f.turns + '합', lx, ly + 28 + i * 22, { size: 14.5, color: '#2a1c10', weight: 'bold' }); });
    ART.icon(c, 'star', lx + 10, ly + 198, 24); gx.txt(c, '얻은 것', lx + 30, ly + 204, { size: 17, weight: 'bold', color: '#a8321f' });
    var gained = s.gained.cards.map(function (id) { return CARDS.byId[id] ? CARDS.byId[id].name : id; }).concat(s.gained.relics.map(function (id) { return '〔' + (GENERALS.relics.byId[id] ? GENERALS.relics.byId[id].name : id) + '〕'; }));
    gx.para(c, gained.join(' · ') || '—', lx, ly + 232, 380, { size: 14, color: '#2a1c10', lh: 21, max: 5, weight: 'bold' });
    var rx = x + 500;
    ART.icon(c, 'eye', rx + 10, ly - 6, 24); gx.txt(c, '임금의 의심', rx + 30, ly, { size: 17, weight: 'bold', color: '#a8321f' });
    var tr = s.suspTrace.length ? s.suspTrace : [s.suspicion], gw = 340, gh = 110, gx0 = rx, gy0 = ly + 20;
    c.strokeStyle = 'rgba(90,60,30,.3)'; c.lineWidth = 1;
    [4, 7, 10].forEach(function (tt) { var yy = gy0 + gh - tt / 10 * gh; c.beginPath(); c.moveTo(gx0, yy); c.lineTo(gx0 + gw, yy); c.stroke(); gx.txt(c, String(tt), gx0 - 6, yy + 4, { size: 10, align: 'right', color: '#a8321f', weight: 'bold' }); });
    c.strokeStyle = '#c8352a'; c.lineWidth = 3.5; c.beginPath();
    tr.forEach(function (v, i) { var xx = gx0 + (tr.length > 1 ? i / (tr.length - 1) : 0.5) * gw, yy = gy0 + gh - v / 10 * gh; if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); });
    c.stroke();
    gx.txt(c, '지금 ' + s.suspicion + '/10 · 병력 ' + s.hp + '/' + s.maxHp + ' · 군량 ' + s.ration, rx, gy0 + gh + 26, { size: 14.5, color: '#2a1c10', weight: 'bold' });
    ART.icon(c, 'flag', rx + 10, ly + 198, 24); gx.txt(c, '고른 길', rx + 30, ly + 204, { size: 17, weight: 'bold', color: '#a8321f' });
    s.choices.slice(0, 5).forEach(function (ch, i) { gx.txt(c, ch.title + ' — ' + ch.choice, rx, ly + 232 + i * 21, { size: 13.5, color: '#2a1c10', maxW: 370, weight: 'bold' }); });
    if (s.compare && s.compare.length) s.compare.forEach(function (l, i) { gx.txt(c, l, W / 2, y + h - 132 + i * 24, { size: 15.5, align: 'center', color: '#7a2a0e', weight: 'bold', maxW: w - 100 }); });
    gx.button(c, { id: 'aeOk', x: W / 2 - 130, y: y + h - 92, w: 260, h: 60, label: ui('continue', '계속'), primary: true, tap: function () { answer({}); } });
  }

  /* ---------------------------------------------------------------- 어전회의 */
  function drawCouncil(c, p) {
    var gx = g(), G = Run.state(), T = X();
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#5a1a1a'); bg.addColorStop(1, '#1a0806');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // 궁궐 지붕 실루엣
    c.fillStyle = '#2a0a08'; c.beginPath(); c.moveTo(0, 260); c.quadraticCurveTo(320, 200, 640, 150); c.quadraticCurveTo(960, 200, W, 260); c.lineTo(W, 300); c.lineTo(0, 300); c.fill();
    hud(c);
    heading(c, (T.council && T.council.title) || '어전회의', 102, 'crown');
    var pages = (T.council && T.council.pages) || ['', '어전', '판결'];
    gx.txt(c, p.page + ' / 3 · ' + (pages[p.page - 1] || ''), W / 2, 146, { size: 15, align: 'center', color: '#ffd0b0', weight: 'bold' });
    var w = 820, x = (W - w) / 2, y = 164;
    if (p.page !== 2) {
      gx.scrollPanel(c, x, y, w, 440);
      gx.txt(c, p.title, W / 2, y + 66, { size: 26, align: 'center', weight: 'bold', color: '#3a1a08' });
      if (p.memo && T.date) gx.txt(c, T.date(p.memo), W / 2, y + 96, { size: 14, align: 'center', color: '#8a5a2e', weight: 'bold' });
      var yy = y + 140; p.lines.forEach(function (l) { yy += gx.para(c, l, x + 60, yy, w - 120, { size: 17, color: '#2a1c10', lh: 28 }) + 8; });
      if (p.page === 3 && p.verdict) gx.txt(c, p.verdict.text || '', W / 2, y + 392, { size: 22, align: 'center', weight: 'bold', color: p.verdict.dismissed ? '#c8352a' : '#2c7a2a' });
      gx.button(c, { id: 'cnNext', x: W / 2 - 130, y: H - 92, w: 260, h: 60, label: ui('next', '다음'), primary: true, tap: function () { answer({ next: true }); } });
      return;
    }
    gx.txt(c, '전하의 의심', W / 2, 200, { size: 19, align: 'center', weight: 'bold' });
    for (var i = 0; i < 10; i++) {
      var bx = W / 2 - 275 + i * 55;
      gx.rr(c, bx, 218, 48, 70, 8); c.fillStyle = i < p.suspicion ? (i >= p.dismissAt - 1 ? '#ff4a3a' : '#c8572a') : 'rgba(255,255,255,.1)'; c.fill();
      c.strokeStyle = '#1d140d'; c.lineWidth = 2; c.stroke();
    }
    c.fillStyle = '#ffe08a'; c.fillRect(W / 2 - 275 + (p.dismissAt - 1) * 55 - 5, 208, 4, 90);
    gx.txt(c, (T.council && T.council.keepIf) || '의심 6 이하면 유임', W / 2 - 210, 324, { size: 15, align: 'center', color: '#9fe08f', weight: 'bold' });
    gx.txt(c, (T.council && T.council.dismissIf) || '의심 7 이상이면 파직', W / 2 + 210, 324, { size: 15, align: 'center', color: '#ff9a7a', weight: 'bold' });
    gx.txt(c, String(p.suspicion), W / 2, 326, { size: 34, align: 'center', weight: 'bold', color: p.suspicion >= p.dismissAt ? '#ff8d76' : '#9fe08f', stroke: 4 });
    if (U.council === 'remove') {
      gx.txt(c, '거둘 장계 패를 고른다', W / 2, 368, { size: 16, align: 'center', color: gx.C.goldL, weight: 'bold' });
      var list = p.removeCandidates.map(function (r) { return { card: r.card, up: false, uid: r.uid }; });
      var cw = 108, gap = 16, x0 = (W - (list.length * cw + (list.length - 1) * gap)) / 2;
      list.forEach(function (it, k) {
        var xx = x0 + k * (cw + gap); gx.drawCard(c, it.card, it.up, xx, 386, cw, 154, {});
        Input.zone({ id: 'cr' + k, x: xx, y: 386, w: cw, h: 154, tap: function () { U.council = null; answer({ defend: 'removeReport', uid: it.uid }); } });
      });
      gx.button(c, { id: 'crBack', x: W / 2 - 110, y: 570, w: 220, h: 52, label: ui('back', '돌아간다'), tap: function () { U.council = null; } });
      return;
    }
    var DEF_ICON = { ration: 'rice', removeReport: 'letter', brush: 'scroll' };
    p.defenses.forEach(function (d, k) {
      var bw = 320, bx = W / 2 + (k - 1) * 340 - bw / 2;
      gx.button(c, { id: 'cd' + d.id, x: bx, y: 372, w: bw, h: 78, label: d.text, icon: DEF_ICON[d.id], sub: d.enabled ? (d.effect + ' · 남은 ' + d.left) : d.reason, enabled: d.enabled, blue: true,
        tap: function () { if (d.id === 'removeReport' && p.removeCandidates.length > 1) U.council = 'remove'; else answer({ defend: d.id, uid: p.removeCandidates[0] ? p.removeCandidates[0].uid : null }); } });
    });
    gx.button(c, { id: 'cnVerdict', x: W / 2 - 160, y: 486, w: 320, h: 66, label: '판결을 기다린다', primary: true, icon: 'crown', tap: function () { answer({ verdict: true }); } });
  }

  /* ---------------------------------------------------------------- 결말 */
  function drawEnding(c, p) {
    var gx = g(), T = X(), G = Run.state(), t = U.t, won = p.id !== 'nanse';
    var bg = c.createLinearGradient(0, 0, 0, H);
    if (won) { bg.addColorStop(0, '#2a4a7a'); bg.addColorStop(1, '#f2b46a'); } else { bg.addColorStop(0, '#1a1418'); bg.addColorStop(1, '#4a1a14'); }
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    ART.person(c, (G && G.leader) || 'yi', 150, 660, 1.6, { t: t, pose: won ? 'win' : 'hurt' });
    var w = 900, x = 300, y = 26, h = 668;
    gx.scrollPanel(c, x, y, w, h);
    var k = Math.min(1, t / 700);
    c.save(); c.globalAlpha = k;
    gx.txt(c, p.title, x + w / 2, y + 68, { size: 34, align: 'center', weight: 'bold', color: won ? '#3a1a08' : '#6a0a04' });
    var yy = y + 110, lw = 500;
    (p.lines || []).slice(0, 12).forEach(function (l) { yy += gx.para(c, l, x + 48, yy, lw, { size: 15, color: '#2a1c10', lh: 24 }) + 4; });
    var rx = x + 590;
    gx.txt(c, '점수 ' + p.score.total, rx, y + 120, { size: 26, weight: 'bold', color: '#c8352a' });
    p.score.parts.slice(0, 14).forEach(function (q, i) {
      gx.txt(c, q.label, rx, y + 152 + i * 22, { size: 14, color: '#2a1c10', weight: 'bold' });
      gx.txt(c, (q.n > 0 ? '+' : '') + q.n, rx + 270, y + 152 + i * 22, { size: 14, color: '#2a1c10', align: 'right', weight: 'bold' });
    });
    var cy = y + h - 150;
    (p.compare || []).slice(-3).forEach(function (l, i) { gx.txt(c, l, x + w / 2, cy + i * 22, { size: 13.5, align: 'center', color: '#7a2a0e', maxW: w - 80, weight: 'bold' }); });
    c.restore();
    gx.button(c, { id: 'endOk', x: x + w / 2 - 140, y: y + h - 86, w: 280, h: 60, label: '처음으로', primary: true, tap: function () { answer({}); Main.go('title'); } });
  }

  return { draw: draw, title: title, leaderSelect: leaderSelect, settings: settings, deck: deck, reset: reset };
})();
