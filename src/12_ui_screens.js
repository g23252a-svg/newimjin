/* ===== 12_ui_screens.js — 제목·주장 선택·설정·덱 보기 + 판 프롬프트 화면 (전역 UIScreens) ===== */
// 계약서 §7.4. 화면은 Run.current() 프롬프트를 그리고, 고른 것을 Run.answer(a) 로 넘긴다.
// 그리기 도구는 UIBattle.gfx, 캐릭터·배·아이콘·일월오봉도는 ART. 화면에 한자를 쓰지 않는다.
// 화면마다 사람이 선다: 주장(이순신·권율)이 전신으로, 장사꾼·임금·대신·부장이 제자리에. 빛줄기(방사형 살)는 그리지 않는다 — 부드러운 빛·반짝이·꽃가루만.
var UIScreens = (function () { 'use strict';

  var W = 1280, H = 720, B = Core.BAL;
  function g() { return UIBattle.gfx; }
  function X() { return (typeof TXT !== 'undefined') ? TXT : {}; }
  function ui(k, d) { var u = X().ui || {}; return u[k] || d; }
  function iga(s) { var j = X().josa; return j && j.iga ? j.iga(s) : s; }
  function F(px, w) { return g().F(px, w); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function hr(i, k) { var s = Math.sin(i * 127.1 + (k || 0) * 311.7) * 43758.5453; return s - Math.floor(s); }   // 장식용 고정 난수(판 난수와 무관)
  function nameOf(id) { var l = GENERALS.leaders.byId[id] || GENERALS.deputies.byId[id]; return l ? l.name : (ART.NAME_KR[id] || ''); }
  function fast() { return !!(Main.settings && Main.settings.fast); }
  var U = { t: 0, dt: 16, prompt: null, sel: null, picks: [], shop: null, merit: null, scroll: 0, council: null, confirmClear: false, detail: null, saveT: 0, saveInfo: null, par: 0, parT: 0 };
  function reset() { U.prompt = null; U.sel = null; U.picks = []; U.scroll = 0; U.detail = null; U.confirmClear = false; U.saveT = 0; U.t = 0; U.par = 0; U.parT = 0; }
  function onPrompt(p) {
    if (U.prompt === p) return;
    U.prompt = p; U.sel = null; U.picks = []; U.scroll = 0; U.detail = null; U.shop = null; U.council = null; U.t = 0; U.par = 0; U.parT = 0;
    if (p && p.kind === 'merit') { U.merit = { leader: p.defaults.leader, king: p.defaults.king, ming: p.defaults.ming || 0 }; if (p.slots.indexOf('ming') < 0) { U.merit.king += U.merit.ming; U.merit.ming = 0; } }
  }
  function answer(a) {
    try { Audio_.sfx('scroll'); } catch (e) { /* 무음 */ }
    try { Run.answer(a); } catch (e) { Main.report(e); }
  }
  var RELIC_ICON = { turtle_blueprint: 'turtle', jincheonroe_relic: 'bomb', hwacha_relic: 'cart', nanjung_relic: 'scroll', jingbirok: 'scroll', tonga: 'arrow', hangwae_gun: 'gun',
    obangnang: 'pouch', seoae_brush: 'letter', chains: 'chain', joryeong_stone: 'mountain', hansan_drum: 'drum', jinju_drum: 'drum', haengju_ash: 'smoke', jiksan_spear: 'spear',
    myeongnyang_chain: 'chain', tongjeyeong_flag: 'flag' };
  function relicBadge(c, id, x, y, r) {
    var rel = GENERALS.relics.byId[id], G = Run.state();
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = rel && rel.curse ? '#5a1a14' : '#1f3a46'; c.fill();
    c.lineWidth = Math.max(2, r * 0.1); c.strokeStyle = G && G.relicUp[id] ? '#ffe08a' : 'rgba(230,184,74,.85)'; c.stroke();
    ART.icon(c, RELIC_ICON[id] || 'star', x, y, r * 1.45);
  }

  /* ================================================================ 작은 그리기 도구 */
  function glow(c, x, y, r, rgb, a) { var gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
  var PAL = { teal: ['#1f6a72', '#123a42'], gold: ['#c8902a', '#6a4210'], red: ['#a8321f', '#5a160e'], navy: ['#2a4a7a', '#15284a'], green: ['#2f7a4a', '#163e26'] };
  function heading(c, text, y, icon, tone, sz) {          // 머리띠(알약): 기본은 단청 청록, 이기면 금빛, 지면 붉은빛
    var gx = g(), col = PAL[tone || 'teal']; sz = sz || 26;
    c.font = F(sz + 4, 'bold'); var w = Math.max(260, c.measureText(gx.clean(text)).width + (icon ? 110 : 70)), h = Math.round(sz * 2.08);
    gx.panel(c, W / 2 - w / 2, y - h * 0.6, w, h, { r: h / 2, c1: col[0], c2: col[1], border: '#ffe08a', stripe: false });
    if (icon) ART.icon(c, icon, W / 2 - w / 2 + 34, y - h * 0.6 + h / 2, sz * 1.25, icon === 'star' ? '#ffe08a' : undefined);
    gx.txt(c, text, W / 2 + (icon ? 18 : 0), y - h * 0.6 + h / 2 + 1, { size: sz, align: 'center', base: 'middle', weight: 'bold', stroke: 4, strokeColor: 'rgba(8,20,24,.85)' });
  }
  function nameTag(c, text, x, y, o) {                     // 이름표: (x,y) = 위 가운데
    o = o || {}; var gx = g(), sz = o.size || 15;
    c.font = F(sz, 'bold'); var w = c.measureText(gx.clean(text)).width + 26, h = sz + 12;
    gx.panel(c, x - w / 2, y, w, h, { r: h / 2, c1: o.c1 || 'rgba(24,70,78,.96)', c2: o.c2 || 'rgba(10,32,38,.96)', border: o.border || '#e6b84a', stripe: false });
    gx.txt(c, text, x, y + h / 2 + 1, { size: sz, align: 'center', base: 'middle', weight: 'bold', color: o.color || '#ffe08a' });
    return w;
  }
  function ribbon(c, text, x, y, o) {                       // 제목 띠: 가운데 (x,y), 양끝에 접힌 꼬리
    o = o || {}; var gx = g(), sz = o.size || 26, col = PAL[o.tone || 'teal'];
    c.font = F(sz, 'bold'); var w = Math.min(o.maxW || 720, c.measureText(gx.clean(text)).width + 80), h = sz + 22, x0 = x - w / 2, y0 = y - h / 2;
    c.fillStyle = ART.shade(col[1], -0.25);
    [[x0 + 14, -1], [x0 + w - 14, 1]].forEach(function (q) { var e = q[0] + q[1] * 34; c.beginPath(); c.moveTo(q[0], y0 + 8); c.lineTo(e, y0 + 8); c.lineTo(e - q[1] * 10, y0 + h / 2 + 4); c.lineTo(e, y0 + h); c.lineTo(q[0], y0 + h); c.closePath(); c.fill(); });
    gx.panel(c, x0, y0, w, h, { r: 8, c1: col[0], c2: col[1], border: '#ffe08a', stripe: false });
    gx.txt(c, text, x, y + 1, { size: sz, align: 'center', base: 'middle', weight: 'bold', stroke: 4, strokeColor: 'rgba(8,20,24,.85)', maxW: w - 30 });
  }
  function hero(c, id, x, y, s, o) {                        // 바닥 빛 + 전신
    o = o || {};
    c.save(); c.translate(x, y); c.scale(1, 0.28); glow(c, 0, 0, 90 * s, o.rgb || '255,224,138', o.ga != null ? o.ga : 0.35); c.restore();
    ART.person(c, id, x, y, s, { t: o.t || U.t, pose: o.pose || 'idle', facing: o.facing || 1, phase: o.phase || 0, alpha: o.alpha });
  }
  var CONF = ['#ffe08a', '#7ee0c0', '#ff8a7a', '#8ac8ff', '#f3eee0', '#c8a0ff'];
  function confetti(c, t, n, x0, w, y0, h) {
    for (var i = 0; i < n; i++) {
      var y = y0 + ((hr(i, 2) * h + t * (0.025 + hr(i, 1) * 0.045)) % h), x = x0 + hr(i, 3) * w + Math.sin(t / 600 + i) * 14, a = t / 300 + i;
      c.save(); c.translate(x, y); c.rotate(a); c.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(a * 1.3)));
      c.fillStyle = CONF[i % CONF.length]; c.fillRect(-4.5, -2.5, 9, 5); c.restore();
    }
  }
  function sparkle(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); }
  function sparkles(c, t, n, cx, cy, rx, ry) {
    c.save(); c.fillStyle = '#fff6c8';
    for (var i = 0; i < n; i++) { var k = 0.5 + 0.5 * Math.sin(t / 220 + i * 2.1); c.globalAlpha = k; sparkle(c, cx + (hr(i, 9) - 0.5) * 2 * rx, cy + (hr(i, 10) - 0.5) * 2 * ry, 3 + k * 6); }
    c.restore();
  }
  function embers(c, t, n, rgb) {                          // 위로 날리는 불티(결전·패배)
    c.save();
    for (var i = 0; i < n; i++) {
      var y = H + 20 - ((hr(i, 5) * (H + 40) + t * (0.02 + hr(i, 4) * 0.05)) % (H + 40)), x = hr(i, 6) * W + Math.sin(t / 900 + i * 1.7) * 26, r = 1.3 + hr(i, 7) * 2.2;
      c.globalAlpha = 0.3 + 0.55 * hr(i, 8); c.fillStyle = 'rgb(' + (rgb || '255,176,96') + ')'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    c.restore();
  }
  function shortName(s) { return String(s || '').replace(/\s*\([^)]*\)\s*$/, ''); }     // '한성(조정)' → '한성' (종류는 아이콘이 말한다)

  /* ================================================================ 글을 문단씩 드러내기 */
  // 한 글자씩 써 내려가고, 누르면(Enter·Space) 지금 문단을 끝까지, 다시 누르면 다음 문단. 잠시 두면 저절로 다음 문단으로 넘어간다.
  var CPS = 50, HOLD = 1100;
  function fitText(c, pars, w, avail, sizes) {
    var gx = g(), pick = sizes[sizes.length - 1];
    for (var i = 0; i < sizes.length; i++) {
      var s = sizes[i]; c.font = F(s[0], s[2]);
      var h = 0; pars.forEach(function (p) { h += gx.wrap(c, p, w).length * s[1] + s[3]; });
      if (h <= avail || i === sizes.length - 1) { pick = s; pick.h = h; break; }
    }
    return { size: pick[0], lh: pick[1], weight: pick[2], gap: pick[3], h: pick.h };
  }
  function typeText(c, pars, x, y, w, o, max) {
    var gx = g(); c.font = F(o.size, o.weight);
    var yy = y, lens = [], k = Math.floor(U.parT * CPS / 1000), all = fast();
    pars.forEach(function (s, i) {
      var lines = gx.wrap(c, s, w), left = (all || i < U.par) ? 1e9 : (i === U.par ? k : 0);
      lens.push(lines.reduce(function (a, l) { return a + l.length; }, 0));
      lines.forEach(function (l) {
        if (left > 0 && (!max || yy < max)) gx.txt(c, left >= l.length ? l : l.slice(0, left), x, yy, o);
        left -= l.length; yy += o.lh;
      });
      yy += o.gap || 0;
    });
    if (all) U.par = pars.length;
    if (U.par < pars.length) { U.parT += U.dt; if (U.parT >= lens[U.par] * 1000 / CPS + HOLD) { U.par++; U.parT = 0; } }
    return { h: yy - y, lens: lens, done: U.par >= pars.length };
  }
  function revealTap(lens) {
    if (U.par >= lens.length) return false;
    if (U.parT < lens[U.par] * 1000 / CPS) U.parT = lens[U.par] * 1000 / CPS; else { U.par++; U.parT = 0; }
    return true;
  }
  function moreMark(c, x, y) {                               // 아직 남은 글이 있다는 깜빡이는 표
    var a = 0.45 + 0.45 * Math.sin(U.t / 220);
    c.save(); c.globalAlpha = a; c.fillStyle = '#ffe08a'; c.beginPath(); c.moveTo(x - 8, y - 5); c.lineTo(x + 8, y - 5); c.lineTo(x, y + 5); c.closePath(); c.fill(); c.restore();
    g().txt(c, Input.isTouch ? '눌러서 계속' : '눌러서 계속 · Enter', x - 16, y + 1, { size: 12.5, align: 'right', base: 'middle', weight: 'bold', color: 'rgba(255,224,138,' + a + ')' });
  }

  /* ================================================================ 무대 배경 (한 번 그려 둔다) */
  var bgCache = {};
  function cached(key, fn) {
    if (bgCache[key]) return bgCache[key];
    if (typeof document === 'undefined' || !document.createElement) return null;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    fn(cv.getContext('2d'));
    bgCache[key] = cv; return cv;
  }
  function paint(c, key, fn) { var cv = cached(key, fn); if (cv) c.drawImage(cv, 0, 0); else { c.fillStyle = '#1a2a30'; c.fillRect(0, 0, W, H); } }
  function ridge(c, y0, amp, col, seed, step, bottom) {
    var r = Core.rngNew(seed); c.fillStyle = col; c.beginPath(); c.moveTo(0, bottom);
    for (var x = 0; x <= W + step; x += step) c.lineTo(x, y0 - amp * Math.abs(Math.sin(x / 230 + Core.rand(r) * 0.6)));
    c.lineTo(W + step, bottom); c.closePath(); c.fill();
  }
  function cloud(c, x, y, s) { c.fillStyle = 'rgba(255,255,255,.8)'; [[0, 0, 1], [s * 0.9, 5, 0.75], [-s * 0.9, 7, 0.7], [s * 0.3, -s * 0.45, 0.8]].forEach(function (p) { c.beginPath(); c.arc(x + p[0], y + p[1], s * p[2], 0, 7); c.fill(); }); }
  function pine(c, x, y, s, col) {                          // 소나무: 굽은 붉은 줄기 + 납작한 솔잎 덩이 (col 을 주면 실루엣)
    c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
    c.strokeStyle = col || '#7a3a22'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-12, -50, 6, -104); c.stroke();
    c.lineWidth = 4.5; c.beginPath(); c.moveTo(1, -58); c.quadraticCurveTo(16, -64, 30, -74); c.moveTo(-3, -82); c.quadraticCurveTo(-16, -86, -28, -92); c.stroke();
    c.fillStyle = col || '#2c5a3c';
    [[32, -78, 30, 10], [-30, -95, 26, 9], [6, -110, 36, 12], [8, -122, 20, 8]].forEach(function (b) { c.beginPath(); c.ellipse(b[0], b[1], b[2], b[3], 0, 0, 7); c.fill(); });
    if (!col) { c.fillStyle = 'rgba(150,210,150,.35)'; [[32, -82, 22, 4], [6, -115, 26, 5]].forEach(function (b) { c.beginPath(); c.ellipse(b[0], b[1], b[2], b[3], 0, 0, 7); c.fill(); }); }
    c.restore();
  }
  function hut(c, x, y, s, tile, dark) {                    // 초가집(tile=false)·기와집(tile=true). (x,y) = 바닥 가운데
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = dark ? '#2a2630' : '#efe2c4'; c.fillRect(-42, -38, 84, 38);
    c.fillStyle = dark ? '#1c1a22' : '#6a4423'; c.fillRect(-42, -38, 6, 38); c.fillRect(36, -38, 6, 38); c.fillRect(-8, -28, 16, 28); c.fillRect(-44, -41, 88, 4);
    if (!dark) { c.fillStyle = '#d8c8a0'; c.fillRect(-30, -29, 14, 12); c.fillRect(17, -29, 14, 12); }
    c.fillStyle = tile ? (dark ? '#16141c' : '#3a3a46') : (dark ? '#201c24' : '#c9a75c');
    c.beginPath();
    if (tile) { c.moveTo(-68, -46); c.quadraticCurveTo(-54, -38, -46, -48); c.lineTo(-32, -72); c.lineTo(32, -72); c.lineTo(46, -48); c.quadraticCurveTo(54, -38, 68, -46); c.lineTo(54, -36); c.lineTo(-54, -36); }
    else { c.moveTo(-56, -34); c.quadraticCurveTo(-54, -78, 0, -80); c.quadraticCurveTo(54, -78, 56, -34); }
    c.closePath(); c.fill();
    if (!dark) {
      c.strokeStyle = tile ? 'rgba(255,255,255,.2)' : '#a8864a'; c.lineWidth = tile ? 1.5 : 2;
      for (var k = 0; k < 4; k++) { c.beginPath(); if (tile) { c.moveTo(-24 + k * 16, -70); c.lineTo(-36 + k * 24, -38); } else { c.moveTo(-50 + k * 4, -42 - k * 9); c.quadraticCurveTo(0, -48 - k * 10, 50 - k * 4, -42 - k * 9); } c.stroke(); }
    }
    c.restore();
  }
  function tent(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#5a5248'; c.beginPath(); c.moveTo(-52, 0); c.lineTo(0, -64); c.lineTo(52, 0); c.closePath(); c.fill();
    c.fillStyle = '#3a342e'; c.beginPath(); c.moveTo(0, -64); c.lineTo(52, 0); c.lineTo(18, 0); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,180,100,.85)'; c.beginPath(); c.moveTo(-12, 0); c.lineTo(0, -30); c.lineTo(12, 0); c.closePath(); c.fill();
    c.strokeStyle = '#2a1e16'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -64); c.lineTo(0, -80); c.stroke();
    c.fillStyle = '#b8302a'; c.beginPath(); c.moveTo(0, -80); c.lineTo(17, -75); c.lineTo(0, -69); c.closePath(); c.fill();
    c.restore();
  }
  function shorePath(c) { c.beginPath(); c.moveTo(0, 562); c.lineTo(140, 552); c.quadraticCurveTo(250, 556, 300, 572); c.quadraticCurveTo(380, 600, 420, 650); c.lineTo(452, H); c.lineTo(0, H); c.closePath(); }
  function vignette(c, a) { var v = c.createRadialGradient(W / 2, H / 2, 360, W / 2, H / 2, 860); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,12,20,' + a + ')'); c.fillStyle = v; c.fillRect(0, 0, W, H); }
  // kind: land(낮 들판)·sea(낮 바다, 왼쪽 바위 기슭)·village(장터 마을)·camp(밤 군막)·nightsea(밤바다)·palace(궁궐 안)
  function stage(c, kind) { paint(c, 'st_' + kind, function (c2) { drawStage(c2, kind); }); }
  function drawStage(c, kind) {
    if (kind === 'palace') { palaceRoom(c); return; }
    var night = kind === 'camp' || kind === 'nightsea', sea = kind === 'sea' || kind === 'nightsea', hz = sea ? 430 : 452, r = Core.rngNew('stage' + kind);
    var sk = c.createLinearGradient(0, 0, 0, hz);
    if (night) { sk.addColorStop(0, '#070b20'); sk.addColorStop(1, '#2a3462'); } else { sk.addColorStop(0, '#4f98d0'); sk.addColorStop(0.72, '#bfe0ee'); sk.addColorStop(1, '#f4ecd2'); }
    c.fillStyle = sk; c.fillRect(0, 0, W, hz + 40);
    if (night) {
      for (var i = 0; i < 110; i++) { c.fillStyle = 'rgba(255,255,240,' + (0.25 + Core.rand(r) * 0.65) + ')'; c.beginPath(); c.arc(Core.rand(r) * W, Core.rand(r) * hz * 0.85, 0.6 + Core.rand(r) * 1.4, 0, 7); c.fill(); }
      glow(c, 1050, 120, 130, '255,250,220', 0.22); c.fillStyle = '#f6f0d8'; c.beginPath(); c.arc(1050, 120, 32, 0, 7); c.fill();
      c.fillStyle = 'rgba(42,52,98,.95)'; c.beginPath(); c.arc(1064, 112, 28, 0, 7); c.fill();
    } else for (var k = 0; k < 6; k++) cloud(c, Core.rand(r) * W, 60 + Core.rand(r) * 150, 22 + Core.rand(r) * 26);
    ridge(c, hz - 34, 120, night ? '#141a36' : '#9db6c8', kind + 'm1', 36, hz + 40);
    ridge(c, hz - 2, 58, night ? '#0f1428' : '#7f9f8e', kind + 'm2', 28, hz + 40);
    if (sea) {
      var sg = c.createLinearGradient(0, hz, 0, H);
      if (night) { sg.addColorStop(0, '#1c2c4c'); sg.addColorStop(1, '#060a18'); } else { sg.addColorStop(0, '#78b8dc'); sg.addColorStop(1, '#1f5a8c'); }
      c.fillStyle = sg; c.fillRect(0, hz, W, H - hz);
      c.strokeStyle = night ? 'rgba(160,190,255,.22)' : 'rgba(255,255,255,.45)'; c.lineWidth = 2;
      for (var w2 = 0; w2 < 80; w2++) { var wy = hz + 6 + Math.pow(Core.rand(r), 1.5) * (H - hz), wx = Core.rand(r) * W, wl = 8 + (wy - hz) * 0.1; c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + wl / 2, wy - 4, wx + wl, wy); c.stroke(); }
      shorePath(c); var rg = c.createLinearGradient(0, 550, 0, H); rg.addColorStop(0, night ? '#2a2630' : '#857462'); rg.addColorStop(1, night ? '#121016' : '#4a3e34'); c.fillStyle = rg; c.fill();
      c.strokeStyle = night ? '#2e3a2c' : '#6a9a4a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 562); c.lineTo(140, 552); c.quadraticCurveTo(250, 556, 300, 572); c.stroke();
      c.fillStyle = night ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.12)'; [[60, 610, 30], [190, 640, 40], [320, 650, 26]].forEach(function (q) { c.beginPath(); c.ellipse(q[0], q[1], q[2], q[2] * 0.4, -0.2, 0, 7); c.fill(); });
      pine(c, 40, 566, 1.05, night ? '#10141c' : null);
    } else {
      var gg = c.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, night ? '#1a2418' : '#a2c878'); gg.addColorStop(1, night ? '#0c120a' : '#5f8f45');
      c.fillStyle = gg; c.fillRect(0, hz, W, H - hz);
      ridge(c, hz + 62, 38, night ? '#141c12' : '#8ab664', kind + 'h', 44, H);
      if (kind === 'village') { hut(c, 760, 548, 1.0, false); hut(c, 1010, 540, 1.25, true); hut(c, 600, 556, 0.8, false); pine(c, 900, 546, 0.9); pine(c, 1180, 552, 1.1); }
      if (kind === 'camp') { tent(c, 150, 540, 1.2); tent(c, 330, 528, 0.9); tent(c, 960, 530, 0.95); tent(c, 1140, 544, 1.25); }
      if (kind === 'land') { pine(c, 1150, 560, 1.3); pine(c, 1030, 540, 0.9); pine(c, 70, 556, 1.1); }
      c.fillStyle = night ? '#231b15' : '#cdb07c'; c.beginPath(); c.moveTo(0, 618); c.quadraticCurveTo(400, 594, 760, 616); c.quadraticCurveTo(1040, 634, W, 610); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
      c.fillStyle = night ? 'rgba(80,110,60,.3)' : 'rgba(90,140,60,.55)';
      for (var tf = 0; tf < 40; tf++) { var gx0 = Core.rand(r) * W, gy0 = 600 + Core.rand(r) * 110; c.beginPath(); c.moveTo(gx0 - 6, gy0); c.lineTo(gx0 - 2, gy0 - 9); c.lineTo(gx0, gy0 - 2); c.lineTo(gx0 + 3, gy0 - 10); c.lineTo(gx0 + 6, gy0); c.closePath(); c.fill(); }
    }
    if (night) { c.fillStyle = 'rgba(10,16,40,.28)'; c.fillRect(0, 0, W, H); }
    vignette(c, night ? 0.55 : 0.32);
  }
  function palaceRoom(c) {                                   // 궁궐 안: 단청 들보, 붉은 기둥, 창호, 마루, 붉은 자리
    var gx = g(), wg = c.createLinearGradient(0, 0, 0, 450); wg.addColorStop(0, '#3a2620'); wg.addColorStop(1, '#5a3e2c');
    c.fillStyle = wg; c.fillRect(0, 0, W, 450);
    [110, 250, 960, 1100].forEach(function (px) {
      c.fillStyle = 'rgba(244,232,200,.82)'; c.fillRect(px, 150, 120, 250);
      c.strokeStyle = '#5a3a22'; c.lineWidth = 3; c.strokeRect(px, 150, 120, 250); c.lineWidth = 1.6;
      for (var gx2 = 1; gx2 < 4; gx2++) { c.beginPath(); c.moveTo(px + gx2 * 30, 150); c.lineTo(px + gx2 * 30, 400); c.stroke(); }
      for (var gy2 = 1; gy2 < 8; gy2++) { c.beginPath(); c.moveTo(px, 150 + gy2 * 31); c.lineTo(px + 120, 150 + gy2 * 31); c.stroke(); }
    });
    [60, 380, 900, 1220].forEach(function (px) { var pg = c.createLinearGradient(px - 18, 0, px + 18, 0); pg.addColorStop(0, '#7a1a14'); pg.addColorStop(0.4, '#c23a2c'); pg.addColorStop(1, '#6a1410'); c.fillStyle = pg; c.fillRect(px - 18, 96, 36, 360); });
    c.fillStyle = '#1f5a50'; c.fillRect(0, 54, W, 50);
    gx.dancheong(c, 0, 58, W, 1.6); gx.dancheong(c, 0, 92, W, 1);
    for (var m = 0; m < 20; m++) { var mx = 32 + m * 64; c.fillStyle = m % 2 ? '#c8352a' : '#2a5aa8'; c.beginPath(); c.arc(mx, 80, 7, 0, 7); c.fill(); c.fillStyle = '#f3eee0'; c.beginPath(); c.arc(mx, 80, 3, 0, 7); c.fill(); }
    c.fillStyle = '#2a1a12'; c.fillRect(0, 104, W, 6);
    var fg = c.createLinearGradient(0, 450, 0, H); fg.addColorStop(0, '#a8763e'); fg.addColorStop(1, '#5a381c'); c.fillStyle = fg; c.fillRect(0, 450, W, H - 450);
    c.strokeStyle = 'rgba(60,34,14,.45)'; c.lineWidth = 2; for (var pl = 0; pl < 9; pl++) { var py = 450 + pl * pl * 3.4 + pl * 6; c.beginPath(); c.moveTo(0, py); c.lineTo(W, py); c.stroke(); }
    c.fillStyle = '#7a1c18'; c.beginPath(); c.moveTo(560, 450); c.lineTo(720, 450); c.lineTo(840, H); c.lineTo(440, H); c.closePath(); c.fill();
    c.strokeStyle = '#e6b84a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 446, W, 6);
    vignette(c, 0.45);
  }
  function darkBg(c) {
    var grd = c.createRadialGradient(W / 2, H * 0.4, 100, W / 2, H / 2, 900); grd.addColorStop(0, '#24404a'); grd.addColorStop(1, '#081418');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
  }

  /* ================================================================ 지도 판 */
  // 마디 자리: 06_map 의 격자 좌표에 마디마다 고정된 흔들림을 더한다(그릴 때만 — 데이터와 판 진행은 그대로). 판 장식도 같은 자리를 쓴다
  var LAY = {};
  function layoutAct(act) {
    if (LAY[act]) return LAY[act];
    var A = MAPDATA.acts[act], minX = 1e9, maxX = -1e9, out = {};
    A.cols.forEach(function (col) { col.forEach(function (id) { var n = MAPDATA.nodes.byId[id]; minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); }); });
    var ox = Math.round((W - (minX + maxX)) / 2);
    A.cols.forEach(function (col, ci) {
      var wav = Math.sin(ci * 1.3 + act * 2.1);
      col.forEach(function (id) {
        var n = MAPDATA.nodes.byId[id], hs = Core.hash(id) % 9973, h1 = hr(hs, 1) - 0.5, h2 = hr(hs, 2) - 0.5, jy;
        var same = col.filter(function (k) { return !A.lanes || MAPDATA.nodes.byId[k].lane === n.lane; }).length;
        if (A.lanes) jy = (n.lane === 'sea' ? 14 : 0) + Math.sin(ci * 1.1 + (n.lane === 'sea' ? 0 : 2)) * 16 + h2 * 14;
        else if (same === 1) jy = wav * 62 + h2 * 36;
        else jy = wav * 26 + h2 * 22;
        out[id] = { x: Math.round(n.x + ox + h1 * 32), y: Math.round(Math.max(150, Math.min(600, n.y + 12 + jy))), r: (n.kind === 'boss' || n.kind === 'council') ? 36 : 28 };
      });
    });
    var f = MAPDATA.first(act, {}).map(function (id) { return out[id]; }), fx = Math.min.apply(null, f.map(function (q) { return q.x; }));
    var fy = f.reduce(function (s, q) { return s + q.y; }, 0) / f.length;
    out._start = A.lanes ? { x: fx, y: Math.round(fy) + 62 } : { x: Math.max(66, fx - 62), y: Math.round(fy) + 24 };
    return (LAY[act] = out);
  }
  var SEA = { south: 'south', sea: 'lanes', north: 'west', palace: 'none', west: 'west', strait: 'strait', noryang: 'noryang' };
  function board(act) {
    var a = MAPDATA.acts[act] || { bg: 'south' }, type = SEA[a.bg] || 'south', key = 'act' + act;
    return cached('board' + key, function (c) {
      var r = Core.rngNew('board' + key), L = layoutAct(act), pts = [];
      for (var id in L) if (id !== '_start') { var n = MAPDATA.nodes.byId[id]; pts.push({ x: L[id].x, y: L[id].y, r: L[id].r, water: n.type === 'naval' }); }
      var sg = c.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, '#62a8d2'); sg.addColorStop(1, '#2f74a6');
      c.fillStyle = sg; c.fillRect(0, 0, W, H);
      function blob(q, grow) {
        var rr2 = Core.rngNew(q[4]); c.beginPath();
        for (var k = 0; k <= 36; k++) { var t = k / 36 * Math.PI * 2, f = 0.82 + Core.rand(rr2) * 0.28; c.lineTo(q[0] + Math.cos(t) * (q[2] + grow) * f, q[1] + Math.sin(t) * (q[3] + grow) * f); }
        c.closePath();
      }
      function sand(list) { list.forEach(function (q) { blob(q, 14); c.fillStyle = '#e8d7a0'; c.fill(); }); }
      function grass(list) { list.forEach(function (q) { blob(q, 0); var lg = c.createLinearGradient(0, q[1] - q[3], 0, q[1] + q[3]); lg.addColorStop(0, '#a8cf82'); lg.addColorStop(1, '#7aa85a'); c.fillStyle = lg; c.fill(); }); }
      function isLand(x, y) { try { var d = c.getImageData(Math.max(0, Math.min(W - 1, x | 0)), Math.max(0, Math.min(H - 1, y | 0)), 1, 1).data; return d[1] > d[2] + 20; } catch (e) { return true; } }
      var base = [];
      if (type === 'south') base = [[640, act === 1 ? 270 : 230, act === 1 ? 780 : 760, act === 1 ? 350 : 290, key + 'a'], [1180, 650, 120, 60, key + 'b'], [200, 668, 110, 50, key + 'c']];
      else if (type === 'noryang') base = [[470, 190, 620, 290, key + 'a'], [1170, 660, 140, 64, key + 'b'], [230, 672, 120, 46, key + 'c']];
      else if (type === 'west') base = [[780, 360, 640, 430, key + 'a'], [110, 600, 80, 56, key + 'b']];
      else if (type === 'strait') base = [[640, 110, 760, 180, key + 'a'], [640, 700, 760, 160, key + 'b']];
      else if (type === 'lanes') base = [[640, 30, 760, 70, key + 'n'], [640, 680, 820, 250, key + 's']];
      if (type === 'none') { c.fillStyle = '#8fbc6a'; c.fillRect(0, 0, W, H); }
      sand(base); grass(base);
      // 뭍 마디가 물에 빠지면 그 밑에 땅(섬·곶)을, 해전 마디가 뭍에 걸리면 물(포구)을 판다
      var patch = [], bays = [];
      pts.forEach(function (q, i) {
        if (type === 'none') return;
        var wet = !isLand(q.x, q.y) || !isLand(q.x, q.y + q.r) || !isLand(q.x, q.y + q.r + 24) || !isLand(q.x - 30, q.y + q.r + 20) || !isLand(q.x + 30, q.y + q.r + 20);
        if (!q.water && wet) patch.push([q.x, q.y + 12, 64, 54, key + 'p' + i]);
        if (q.water && isLand(q.x, q.y)) bays.push([q.x, q.y + 6, 70, 54, key + 'w' + i]);
      });
      var st = L._start; if (type !== 'none' && !isLand(st.x, st.y)) patch.push([st.x, st.y - 10, 50, 40, key + 'st']);
      sand(patch); grass(base); grass(patch);
      bays.forEach(function (q) { blob(q, 12); c.fillStyle = '#e8d7a0'; c.fill(); blob(q, 0); c.fillStyle = sg; c.fill(); });
      if (type === 'none') {                                   // 강은 모든 마디와 이름표 아래로 흐른다
        var rv = Core.rngNew(key + 'river'), ry = 640 + Core.rand(rv) * 12;
        c.lineCap = 'round'; c.lineJoin = 'round';
        [[34, '#e8d7a0'], [22, '#4f93c4'], [8, 'rgba(255,255,255,.18)']].forEach(function (s2) {
          c.strokeStyle = s2[1]; c.lineWidth = s2[0]; c.beginPath(); c.moveTo(-20, ry);
          for (var xx = 0; xx <= W + 40; xx += 40) c.lineTo(xx, ry + Math.sin(xx / 170 + 1.3) * 18);
          c.stroke();
        });
      }
      function nearNode(x, y, pad) {
        if (Math.abs(x - st.x) < 50 && y > st.y - 110 && y < st.y + 16) return true;
        return pts.some(function (q) { var dx = x - q.x, dy = y - q.y; return dx * dx + dy * dy < (q.r + pad) * (q.r + pad) || (Math.abs(dx) < 78 && dy > 0 && dy < q.r + 40); });
      }
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
      for (var k = 0; k < 90; k++) { var x = Core.rand(r) * W, y = Core.rand(r) * H; if (isLand(x, y) || nearNode(x, y, 10)) continue; c.beginPath(); c.arc(x, y, 8, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      for (var m = 0; m < 30; m++) {                          // 산과 숲: 땅 위에만, 마디·이름표를 비켜서
        var mx = Core.rand(r) * W, my = 80 + Core.rand(r) * (H - 140), s = 0.8 + Core.rand(r) * 0.9;
        if (!isLand(mx - 24 * s, my + 12 * s) || !isLand(mx + 26 * s, my + 12 * s) || !isLand(mx, my - 18 * s) || nearNode(mx, my, 44 + 26 * s)) continue;
        c.save(); c.translate(mx, my); c.scale(s, s);
        c.beginPath(); c.moveTo(-22, 12); c.lineTo(-4, -18); c.lineTo(6, -4); c.lineTo(12, -12); c.lineTo(26, 12); c.closePath(); c.fillStyle = '#6f8f5a'; c.fill();
        c.beginPath(); c.moveTo(-9, -6); c.lineTo(-4, -18); c.lineTo(1, -8); c.closePath(); c.fillStyle = '#f2f2ea'; c.fill();
        c.restore();
      }
      for (var tr = 0; tr < 80; tr++) { var tx = Core.rand(r) * W, ty = 60 + Core.rand(r) * (H - 120), ts = 6 + Core.rand(r) * 4; if (!isLand(tx, ty) || nearNode(tx, ty, 34)) continue; c.fillStyle = 'rgba(60,110,50,.75)'; c.beginPath(); c.arc(tx, ty, ts, 0, 7); c.fill(); }
      vignette(c, 0.45);
    });
  }
  function mapBg(c, act) { var cv = board(act); if (cv) c.drawImage(cv, 0, 0); else { c.fillStyle = '#5a9ac8'; c.fillRect(0, 0, W, H); } }
  function backdrop(c, act) { mapBg(c, act); c.fillStyle = 'rgba(8,16,22,.6)'; c.fillRect(0, 0, W, H); }
  function titleScene() {
    return cached('title', function (c) {
      var r = Core.rngNew('title');
      var sky = c.createLinearGradient(0, 0, 0, 470); sky.addColorStop(0, '#2a2a5a'); sky.addColorStop(0.45, '#c8584a'); sky.addColorStop(1, '#ffc46a');
      c.fillStyle = sky; c.fillRect(0, 0, W, 470);
      c.fillStyle = 'rgba(255,240,200,.95)'; c.beginPath(); c.arc(W / 2, 420, 120, 0, 7); c.fill();
      glow(c, W / 2, 420, 420, '255,214,140', 0.5);
      ridge(c, 440, 110, '#7a4a6a', 't1', 30, 480); ridge(c, 462, 60, '#4a2a4a', 't2', 26, 480);
      var sea = c.createLinearGradient(0, 466, 0, H); sea.addColorStop(0, '#e08a5a'); sea.addColorStop(0.15, '#5a4a7a'); sea.addColorStop(1, '#1a1a3a');
      c.fillStyle = sea; c.fillRect(0, 466, W, H - 466);
      for (var i = 0; i < 140; i++) { var y = 470 + Core.rand(r) * 250, x = Core.rand(r) * W, l = 10 + Core.rand(r) * 50; c.strokeStyle = 'rgba(255,200,150,' + (0.08 + Core.rand(r) * 0.25) + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke(); }
      // 앞쪽 두 곶: 왼쪽 바위에 이순신, 오른쪽 산성 언덕에 권율이 선다
      function cape(p, wall) {
        c.beginPath(); c.moveTo(p[0][0], H); p.forEach(function (q) { c.lineTo(q[0], q[1]); }); c.lineTo(p[p.length - 1][0], H); c.closePath();
        var cg = c.createLinearGradient(0, 560, 0, H); cg.addColorStop(0, '#3a2638'); cg.addColorStop(1, '#140c18'); c.fillStyle = cg; c.fill();
        c.strokeStyle = 'rgba(255,170,110,.55)'; c.lineWidth = 3; c.beginPath(); p.forEach(function (q, k) { if (k) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke();
        if (wall) { c.fillStyle = '#2a1e2a'; c.fillRect(1062, 548, 230, 44); for (var b = 0; b < 8; b++) c.fillRect(1064 + b * 30, 536, 18, 14); c.strokeStyle = 'rgba(255,170,110,.45)'; c.lineWidth = 2; c.strokeRect(1062, 548, 230, 44); }
      }
      cape([[0, 582], [80, 572], [180, 568], [300, 576], [390, 600], [446, 640], [474, H]], false);
      cape([[1280, 598], [1200, 590], [1100, 598], [1030, 626], [992, 672], [978, H]], true);
      pine(c, 46, 578, 1.25, '#1c1220');
    });
  }
  function dimTitle(c, a) { var cv = titleScene(); if (cv) { c.drawImage(cv, 0, 0); c.fillStyle = 'rgba(8,14,20,' + (a || 0.72) + ')'; c.fillRect(0, 0, W, H); } else darkBg(c); }

  /* ================================================================ 판 머리띠 */
  function hud(c, opts) {
    opts = opts || {};
    var G = Run.state(); if (!G) return;
    var gx = g(), T = X();
    var grd = c.createLinearGradient(0, 0, 0, 52); grd.addColorStop(0, 'rgba(22,40,46,.97)'); grd.addColorStop(1, 'rgba(10,22,27,.95)');
    c.fillStyle = grd; c.fillRect(0, 0, W, 52); c.fillStyle = gx.C.gold; c.fillRect(0, 52, W, 2);
    var a = MAPDATA.acts[G.act], nd = G.nodeId ? MAPDATA.nodes.byId[G.nodeId] : null;
    gx.txt(c, G.act + '막 ' + a.title, 16, 24, { size: 17, weight: 'bold', color: gx.C.goldL, maxW: 230 });
    gx.txt(c, nd && nd.date && T.date ? T.date(nd.date) : a.period, 16, 43, { size: 12, color: gx.C.dim, maxW: 230 });
    ART.icon(c, 'heart', 262, 26, 26);
    gx.bar(c, 280, 15, 180, 22, G.hp, G.maxHp, G.hp / G.maxHp < 0.3 ? '#d8342a' : '#e04838');
    ART.icon(c, 'rice', 486, 26, 26); gx.txt(c, String(G.ration), 502, 33, { size: 19, weight: 'bold', stroke: 3 });
    ART.icon(c, 'eye', 566, 26, 28); gx.txt(c, '의심', 584, 20, { size: 11, weight: 'bold', color: '#ffb0a0' });
    for (var i = 0; i < 10; i++) {
      var x = 584 + i * 13; gx.rr(c, x, 25, 10, 16, 3); c.fillStyle = i < G.suspicion ? (i >= 6 ? '#ff4a3a' : '#e07a3a') : 'rgba(255,255,255,.12)'; c.fill();
      if (B.SUSP_THRESH.indexOf(i + 1) >= 0) { c.fillStyle = '#ffd27a'; c.fillRect(x + 10.5, 22, 2, 22); }
    }
    Input.zone({ id: 'hudSusp', x: 552, y: 6, w: 170, h: 40 });
    if (Input.hover('hudSusp')) gx.tooltip(c, 552, 58, '임금의 의심 ' + G.suspicion + '/10', '4·7·10을 처음 넘을 때 어명 카드가 덱에 섞이고, 10이면 부장 하나가 옥에 갇힌다. 조정의 ‘장계 올리기’와 장계 카드가 의심을 내린다.');
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
    var rx0 = 800 + deps.length * 36 + 4, rmax = W - (opts.deck === false ? 24 : 150);
    G.relics.forEach(function (id, k) {
      var x = rx0 + k * 28; if (x > rmax) return;
      relicBadge(c, id, x, 26, 12.5);
      Input.zone({ id: 'hudRel' + k, x: x - 13, y: 12, w: 26, h: 28 });
      var r = GENERALS.relics.byId[id];
      if (Input.hover('hudRel' + k) && r) gx.tooltip(c, Math.min(x - 100, W - 290), 58, r.name, r.desc);
    });
    if (opts.deck !== false) gx.button(c, { id: 'hudDeck', x: W - 132, y: 4, w: 124, h: 44, label: '덱 ' + G.deck.length, icon: 'scroll', size: 15, key: 'D', tap: openDeck });
  }
  function openDeck() { U.scroll = 0; Main.go('deck', { back: 'run' }); }

  /* ================================================================ 제목 */
  function title(c, dt) {
    U.t += dt;
    var gx = g(), T = X(), t = U.t;
    var cv = titleScene(); if (cv) c.drawImage(cv, 0, 0); else darkBg(c);
    for (var sh = 0; sh < 4; sh++) {                       // 멀리 검은 돛(왜선)이 수평선을 건너온다
      var sx = W + 80 - ((t / (40 + sh * 7)) + sh * 300) % (W + 260), sy = 500 + sh * 6;
      ART.wship(c, { id: 'sekibune', tags: ['ship'] }, sx, sy, 0.32 + sh * 0.03, { t: t });
    }
    ART.panokseon(c, 846 + Math.sin(t / 2100) * 20, 694, 0.54, { t: t });
    ART.turtleShip(c, 590 + Math.sin(t / 1800) * 24, 682, 0.78, { t: t });
    hero(c, 'gwon', 1168, 606, 1.32, { t: t, facing: -1, phase: 1, ga: 0.25 });
    nameTag(c, '권율', 1168, 614, { size: 13 });
    hero(c, 'yi', 258, 590, 1.95, { t: t, ga: 0.45 });
    nameTag(c, '이순신', 258, 600, { size: 18 });
    var k = Math.min(1, U.t / 700);
    c.save(); c.globalAlpha = k;
    gx.txt(c, '임진왜란 1592 – 1598', W / 2, 92, { size: 20, align: 'center', weight: 'bold', color: '#ffe8c0', stroke: 4, strokeColor: 'rgba(60,20,10,.8)' });
    c.save(); c.translate(W / 2, 200); var sc = 1 + Math.sin(t / 900) * 0.015; c.scale(sc, sc);
    c.font = F(150, '900'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 18; c.strokeStyle = '#3a1406'; c.strokeText('징비', 0, 0);
    var lg = c.createLinearGradient(0, -70, 0, 70); lg.addColorStop(0, '#fff6c8'); lg.addColorStop(0.5, '#ffc83a'); lg.addColorStop(1, '#e0601a');
    c.fillStyle = lg; c.fillText('징비', 0, 0);
    c.restore();
    gx.txt(c, T.subtitle || '일곱 해의 패', W / 2, 300, { size: 26, align: 'center', weight: 'bold', color: '#fff', stroke: 5, strokeColor: 'rgba(60,20,10,.85)' });
    c.restore();
    if (!U.saveT || U.t - U.saveT > 1000 || U.t < U.saveT) { U.saveInfo = Run.hasSave(); U.saveT = U.t || 1; }
    var save = U.saveInfo, y = 360;
    if (save) {
      var lgd = GENERALS.leaders.byId[save.leader];
      gx.button(c, { id: 'tResume', x: W / 2 - 170, y: y, w: 340, h: 66, label: ui('resume', '이어하기'), green: true, icon: 'flag',
        sub: (lgd ? lgd.name : '') + ' · ' + save.act + '막 · 병력 ' + save.hp + '/' + save.maxHp,
        tap: function () { if (Run.load()) Main.go('run'); } });
      y += 78;
    }
    gx.button(c, { id: 'tNew', x: W / 2 - 170, y: y, w: 340, h: 60, label: ui('newRun', '새 게임'), green: !save, teal: !!save, icon: 'swords', tap: function () { U.t = 0; Main.go('leader'); } });
    gx.button(c, { id: 'tSet', x: W / 2 - 170, y: y + 72, w: 340, h: 50, label: ui('settings', '설정'), icon: 'scroll', tap: function () { Main.go('settings', { back: 'title' }); } });
    gx.rr(c, W / 2 - 290, H - 33, 580, 26, 13); c.fillStyle = 'rgba(10,6,20,.6)'; c.fill();   // 아래 판옥선 위에서도 읽히게
    gx.txt(c, Input.isTouch ? '카드를 톡 하면 고르고, 한 번 더 톡 하면 낸다 · 길게 누르면 설명' : '카드 1~0 · 턴 종료 Space · 덱 보기 D · 소리 M', W / 2, H - 15, { size: 13, align: 'center', color: 'rgba(255,240,220,.85)', weight: 'bold', stroke: 3, strokeColor: 'rgba(10,6,20,.8)' });
    if (Input.key('Enter')) { if (save) { if (Run.load()) Main.go('run'); } else Main.go('leader'); }
  }

  /* ================================================================ 주장 선택 */
  var LEADER_BG = { yi: ['#5aa0d8', '#1d4a7a'], gwon: ['#8ab86a', '#2f5a30'] };
  function leaderSelect(c, dt) {
    U.t += dt;
    var gx = g(), t = U.t;
    dimTitle(c, 0.66);
    gx.txt(c, ui('leaderSelect', '주장을 고르세요'), W / 2, 62, { size: 32, align: 'center', weight: 'bold', color: gx.C.goldL, stroke: 5 });
    var ls = GENERALS.leaders.list;
    ls.forEach(function (l, k) {
      var x = W / 2 + (k - (ls.length - 1) / 2) * 440 - 205, y = 92, w = 410, h = 560, hov = Input.hover('ld' + l.id), yy = y - (hov ? 6 : 0);
      gx.panel(c, x, yy, w, h, { border: hov ? '#ffe08a' : '#e6b84a' });
      c.save(); gx.rr(c, x + 12, yy + 14, w - 24, 250, 10); c.clip();
      var bg = c.createLinearGradient(0, yy, 0, yy + 264), col = LEADER_BG[l.id] || ['#5a5a7a', '#2a2a3a'];
      bg.addColorStop(0, col[0]); bg.addColorStop(1, col[1]); c.fillStyle = bg; c.fillRect(x, yy, w, 270);
      if (l.id === 'yi') {                                   // 판옥선 갑판 위: 뒤에 배 한 척, 발밑에 여장 방패와 마루
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (var wv = 0; wv < 6; wv++) { c.beginPath(); c.moveTo(x + 30 + wv * 64, yy + 186 + (wv % 2) * 8); c.quadraticCurveTo(x + 46 + wv * 64, yy + 180 + (wv % 2) * 8, x + 62 + wv * 64, yy + 186 + (wv % 2) * 8); c.stroke(); }
        ART.panokseon(c, x + w - 92, yy + 192, 0.4, { t: t });
        for (var p = 0; p < 9; p++) { gx.rr(c, x + 6 + p * 46, yy + 204, 38, 26, 3); c.fillStyle = p % 2 ? '#c63a2c' : '#2b4f8f'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1d140d'; c.stroke(); }
        c.fillStyle = '#7a5030'; c.fillRect(x, yy + 228, w, 40); c.strokeStyle = 'rgba(40,20,8,.5)'; c.lineWidth = 2;
        for (var pl = 0; pl < 3; pl++) { c.beginPath(); c.moveTo(x, yy + 238 + pl * 10); c.lineTo(x + w, yy + 238 + pl * 10); c.stroke(); }
      } else { c.fillStyle = '#8a8070'; c.fillRect(x, yy + 200, w, 70); for (var b = 0; b < 8; b++) { c.fillStyle = '#9a9080'; c.fillRect(x + b * 54, yy + 188, 34, 16); } }
      ART.person(c, l.id, x + w / 2 - 10, yy + 254, 0.98, { t: t, pose: hov ? 'attack' : 'idle' });   // 이순신의 깃발 끝이 그림 칸 위로 잘리지 않게
      c.restore();
      gx.txt(c, l.name, x + w / 2, yy + 300, { size: 32, align: 'center', weight: 'bold', color: '#fff', stroke: 5 });
      ART.icon(c, 'heart', x + w / 2 - 84, yy + 330, 24); gx.txt(c, '병력 ' + l.hp, x + w / 2 - 68, yy + 336, { size: 16, weight: 'bold' });
      ART.icon(c, 'eye', x + w / 2 + 30, yy + 330, 24); gx.txt(c, '의심 ' + (l.suspStart || 0), x + w / 2 + 46, yy + 336, { size: 16, weight: 'bold' });
      gx.para(c, l.passiveDesc || '', x + 26, yy + 372, w - 52, { size: 14.5, color: '#ffe8b8', lh: 22, max: 3, weight: 'bold' });
      gx.para(c, l.desc || '', x + 26, yy + 446, w - 52, { size: 13.5, color: gx.C.dim, lh: 20, max: 2 });
      gx.txt(c, '전법: ' + (l.deckColor || ''), x + 26, yy + 506, { size: 13.5, color: '#9fd8ff', weight: 'bold', maxW: w - 52 });
      gx.rr(c, x + w / 2 - 90, yy + 524, 180, 28, 14); c.fillStyle = hov ? 'rgba(74,168,74,.9)' : 'rgba(255,255,255,.08)'; c.fill();
      gx.txt(c, '눌러서 시작', x + w / 2, yy + 539, { size: 14, align: 'center', base: 'middle', color: hov ? '#fff' : 'rgba(255,224,138,.75)', weight: 'bold' });
      Input.zone({ id: 'ld' + l.id, x: x, y: y, w: w, h: h, tap: function () { Run.newRun(l.id, Main.newSeed()); U.t = 0; Main.go('run'); } });
    });
    gx.button(c, { id: 'ldBack', x: 24, y: H - 70, w: 160, h: 50, label: ui('back', '뒤로'), icon: 'back', tap: function () { Main.go('title'); } });
    if (Input.key('Escape')) Main.go('title');
  }

  /* ================================================================ 설정 */
  function settings(c, dt) {
    var gx = g(), S = Main.settings, on = ui('on', '켬'), off = ui('off', '끔');
    dimTitle(c, 0.74);
    gx.panel(c, W / 2 - 340, 46, 680, 630, {});
    gx.txt(c, ui('settings', '설정'), W / 2, 104, { size: 32, align: 'center', weight: 'bold', color: gx.C.goldL, stroke: 4 });
    var y = 136;
    function row(icon, label, val, minus, plus, tap) {
      gx.rr(c, W / 2 - 300, y + 2, 600, 56, 12); c.fillStyle = 'rgba(255,255,255,.05)'; c.fill();
      ART.icon(c, icon, W / 2 - 268, y + 30, 28);
      gx.txt(c, label, W / 2 - 238, y + 37, { size: 20, weight: 'bold' });
      if (tap) gx.button(c, { id: 'set' + label, x: W / 2 + 90, y: y + 6, w: 170, h: 48, label: val, green: val === on, tap: tap });
      else {
        gx.button(c, { id: 'setm' + label, x: W / 2 + 46, y: y + 6, w: 52, h: 48, label: '−', tap: minus });
        gx.txt(c, val, W / 2 + 166, y + 38, { size: 20, align: 'center', weight: 'bold', color: gx.C.goldL });
        gx.button(c, { id: 'setp' + label, x: W / 2 + 234, y: y + 6, w: 52, h: 48, label: '+', tap: plus });
      }
      y += 68;
    }
    row('drum', '음량', Math.round(S.volume * 100) + '%', function () { Main.setSetting('volume', Math.max(0, Math.round((S.volume - 0.1) * 10) / 10)); }, function () { Main.setSetting('volume', Math.min(1, Math.round((S.volume + 0.1) * 10) / 10)); });
    row('horn', '소리', S.mute ? off : on, null, null, function () { Main.setSetting('mute', !S.mute); });
    row('run', '빠르게(연출 생략)', S.fast ? on : off, null, null, function () { Main.setSetting('fast', !S.fast); });
    row('wave', '화면 흔들림', S.shake ? on : off, null, null, function () { Main.setSetting('shake', !S.shake); });
    row('scroll', '1막 도움말', S.captions ? on : off, null, null, function () { Main.setSetting('captions', !S.captions); });
    gx.button(c, { id: 'setClear', x: W / 2 - 170, y: y + 14, w: 340, h: 52, label: U.confirmClear ? '정말 지울까요?' : '저장 지우기', primary: U.confirmClear, icon: 'skull',
      tap: function () { if (U.confirmClear) { Run.clearSave(); U.confirmClear = false; } else U.confirmClear = true; } });
    var back = (Main.params && Main.params.back) || 'title';
    gx.button(c, { id: 'setBack', x: W / 2 - 110, y: H - 112, w: 220, h: 54, label: ui('back', '뒤로'), icon: 'back', tap: function () { U.confirmClear = false; Main.go(back); } });
    if (Input.key('Escape')) Main.go(back);
  }

  /* ================================================================ 덱 보기 */
  function cardGrid(c, list, opts) {
    var gx = g(), cw = opts.cw || 108, ch = opts.ch || 154, gap = opts.gap || 14, per = opts.per || 9, rowH = ch + gap + (opts.priceRow ? 26 : 0);
    var top = opts.top || 110, viewH = opts.viewH || 500, rows = Math.ceil(list.length / per), maxS = Math.max(0, rows * rowH - gap - viewH);
    U.scroll = Math.max(0, Math.min(maxS, U.scroll));
    // 스크롤 영역은 카드보다 먼저 등록한다. 입력은 나중에 등록한 영역이 먼저 받으므로, 뒤에 두면 카드 누름을 가로챈다
    Input.zone({ id: (opts.id || 'grid') + 'Scroll', x: 0, y: top - 14, w: W, h: viewH + 14, wheel: function (d) { U.scroll += d; }, drag: function (p, dx, dy) { U.scroll -= dy; } });
    c.save(); c.beginPath(); c.rect(0, top - 14, W, viewH + 14); c.clip();
    var hovered = null;
    list.forEach(function (it, i) {
      var row = Math.floor(i / per), inRow = Math.min(per, list.length - row * per), x0 = (W - (inRow * cw + (inRow - 1) * gap)) / 2;   // 끝 줄도 가운데
      var x = x0 + (i % per) * (cw + gap), y = top + row * rowH - U.scroll;
      if (y > top + viewH || y < top - ch - 40) return;
      var on = opts.selected && opts.selected.indexOf(i) >= 0, hov = Input.hover((opts.id || 'grid') + i);
      gx.drawCard(c, it.card, it.up, x, y - (on ? 10 : (hov ? 5 : 0)), cw, ch, { glow: on ? gx.C.goldL : (hov ? 'rgba(255,224,138,.6)' : null), dim: it.dim });
      if (on && opts.check) { var kx = x + cw - 18, ky = y - 10 + Math.round(27 * cw / 112) + 14;   // 그림 칸 오른쪽 위(이름 띠의 '+'를 가리지 않게)
        c.beginPath(); c.arc(kx, ky, 13, 0, 7); c.fillStyle = '#3f9a4a'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); c.beginPath(); c.moveTo(kx - 6, ky); c.lineTo(kx - 1, ky + 5); c.lineTo(kx + 7, ky - 5); c.stroke(); }
      if (it.price != null) {
        gx.rr(c, x + cw / 2 - 34, y + ch + 3, 68, 22, 11); c.fillStyle = it.sold ? '#3a3a3a' : (it.affordable ? '#2c6a2a' : '#7a2a1a'); c.fill();
        if (!it.sold) ART.icon(c, 'rice', x + cw / 2 - 20, y + ch + 14, 16);
        gx.txt(c, it.sold ? ui('sold', '판매 완료') : String(it.price), x + cw / 2 + (it.sold ? 0 : 6), y + ch + 15, { size: 13, align: 'center', base: 'middle', weight: 'bold' });
      }
      if (hov) hovered = { it: it, x: x, y: y };
      Input.zone({ id: (opts.id || 'grid') + i, x: x, y: y, w: cw, h: ch, tap: opts.tap ? function () { opts.tap(i); } : null, long: function () { U.detail = it; }, drag: function (p, dx, dy) { U.scroll -= dy; } });
    });
    c.restore();
    if (maxS > 0) {                                           // 아래에 더 있다: 스크롤 막대
      var th = Math.max(40, viewH * viewH / (viewH + maxS)), ty = top + (viewH - th) * U.scroll / maxS;
      gx.rr(c, W - 22, top, 8, viewH, 4); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill();
      gx.rr(c, W - 22, ty, 8, th, 4); c.fillStyle = gx.C.gold; c.fill();
      if (U.scroll < maxS - 4) { var a = 0.5 + 0.4 * Math.sin(U.t / 260); c.save(); c.globalAlpha = a; c.fillStyle = '#ffe08a'; c.beginPath(); c.moveTo(W / 2 - 14, top + viewH + 2); c.lineTo(W / 2 + 14, top + viewH + 2); c.lineTo(W / 2, top + viewH + 14); c.closePath(); c.fill(); c.restore(); }
    }
    var di = hovered && !Input.isTouch ? hovered.it : U.detail;
    if (di && opts.detail !== false) {
      var bx = hovered ? hovered.x + cw + 10 : W / 2 - 175;
      if (hovered && bx + 350 > W) bx = Math.max(10, hovered.x - 360);
      gx.cardInfoBox(c, di.card, di.up, bx, hovered ? Math.min(H - 220, Math.max(60, hovered.y)) : 200, 350, di.extra || []);
    }
    return maxS;
  }
  function deck(c, dt, onClose) {
    var gx = g(), G = Run.state();
    U.t += dt;
    if (G && G.act) backdrop(c, G.act); else dimTitle(c, 0.72);
    var list = Run.deck().slice().sort(function (a, b) { var o = 'atk def tac rep edict'; return o.indexOf(a.card.type) - o.indexOf(b.card.type) || (a.card.name < b.card.name ? -1 : 1); });
    heading(c, '내 덱 ' + list.length + '장', 62, 'scroll');
    var cnt = { atk: 0, def: 0, tac: 0, rep: 0, edict: 0 }; list.forEach(function (d) { cnt[d.card.type]++; });
    var K = gx.TYPE_KR;
    gx.txt(c, [K.atk + ' ' + cnt.atk, K.def + ' ' + cnt.def, K.tac + ' ' + cnt.tac, K.rep + ' ' + cnt.rep, K.edict + ' ' + cnt.edict].join(' · ') + '   |   강화 ' + list.filter(function (d) { return d.up; }).length + '장', W / 2, 108, { size: 14, align: 'center', color: gx.C.dim, weight: 'bold', stroke: 3 });
    cardGrid(c, list, { id: 'dk', top: 132, viewH: 488, cw: 128, ch: 182, per: 8, gap: 16 });
    gx.button(c, { id: 'dkClose', x: W / 2 - 110, y: H - 78, w: 220, h: 56, label: ui('close', '닫기'), key: 'Esc', tap: onClose });
    if (Input.key('Escape') || Input.key('KeyD')) onClose();
  }

  /* ================================================================ 프롬프트 화면 */
  function draw(c, dt, p) {
    onPrompt(p); U.t += dt; U.dt = dt;
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
      default:                                                 // 모르는 화면: 개발 키 대신 한국어 안내 + 계속
        darkBg(c);
        g().txt(c, '잠시 길이 엇갈렸습니다', W / 2, H / 2 - 30, { size: 22, align: 'center', weight: 'bold', color: g().C.goldL });
        g().button(c, { id: 'unkOk', x: W / 2 - 120, y: H / 2 + 10, w: 240, h: 56, label: ui('continue', '계속'), green: true, tap: function () { answer({}); } });
    }
    if (p.kind !== 'ending' && Input.key('KeyD')) openDeck();
  }

  /* ---------------------------------------------------------------- 지도 */
  var KIND_NAME = { fight: '전투', elite: '정예', event: '사건', camp: '군영', shop: '시장', court: '조정', boss: '결전', council: '어전회의' };
  var KIND_COL = { fight: '#d8503a', naval: '#3d86cc', elite: '#8a3fd0', event: '#d8a228', camp: '#3f9a4a', shop: '#2f8aa0', court: '#2f5aa8', boss: '#a01818', council: '#6a2a8a' };
  var KIND_ICON = { fight: 'swords', naval: 'anchor', elite: 'skull', event: 'scroll', camp: 'campfire', shop: 'pouch', court: 'palace', boss: 'helm', council: 'ikseon' };
  function nodeKey(n) { return n.kind === 'fight' && n.type === 'naval' ? 'naval' : n.kind; }
  function kindIcon(k) { var ki = X().kindIcon; return (ki && ki[k]) || KIND_ICON[k] || 'star'; }
  function curvePath(c, A, B) { c.beginPath(); c.moveTo(A.x, A.y); c.bezierCurveTo((A.x + B.x) / 2, A.y, (A.x + B.x) / 2, B.y, B.x, B.y); }
  function road(c, A, B, on) {
    c.save(); c.lineCap = 'round'; curvePath(c, A, B);
    if (on) { c.strokeStyle = 'rgba(70,36,14,.92)'; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#e0b46a'; c.lineWidth = 3.5; c.stroke(); }
    else { c.strokeStyle = 'rgba(60,40,20,.42)'; c.lineWidth = 8; c.stroke(); c.setLineDash([2, 10]); c.strokeStyle = 'rgba(255,246,220,.95)'; c.lineWidth = 4; c.stroke(); }
    c.restore();
  }
  function drawMap(c, p) {
    var gx = g(), G = Run.state(), t = U.t, A = MAPDATA.acts[p.act], L = layoutAct(p.act), lanes = !!A.lanes;
    mapBg(c, p.act);
    var nodes = {};
    p.nodes.forEach(function (n) { var q = L[n.id] || { x: n.x, y: n.y }, o = {}; for (var k in n) o[k] = n[k]; o.x = q.x; o.y = q.y; nodes[n.id] = o; });
    function inPath(id) { return p.path.indexOf(id) >= 0; }
    function sel(ids, ln) { return ids.filter(function (id) { return nodes[id] && (!ln || nodes[id].lane === ln); }); }
    function link(ci, ln) {                                     // 두 열 사이: 한쪽이라도 여럿이면 갈림목 하나를 거친다(엇갈린 실타래 대신)
      var a = sel(A.cols[ci] || [], ln), b = sel(A.cols[ci + 1] || [], ln), J = null;
      if (a.length && b.length && (a.length > 1 || b.length > 1)) {
        var ax = 0, bx = 0, sy = 0; a.forEach(function (id) { ax += nodes[id].x; sy += nodes[id].y; }); b.forEach(function (id) { bx += nodes[id].x; sy += nodes[id].y; });
        J = { x: (ax / a.length + bx / b.length) / 2, y: sy / (a.length + b.length) };
      }
      return { a: a, b: b, J: J };
    }
    for (var ci = 0; ci < A.cols.length - 1; ci++) (lanes ? ['sea', 'land'] : [null]).forEach(function (ln) {
      var lk = link(ci, ln); if (!lk.a.length || !lk.b.length) return;
      var pa = lk.a.some(inPath) && lk.b.some(inPath);
      c.save(); if (lanes && p.lane && ln !== p.lane) c.globalAlpha = 0.35;
      if (!lk.J) road(c, nodes[lk.a[0]], nodes[lk.b[0]], pa);
      else {
        lk.a.forEach(function (id) { road(c, nodes[id], lk.J, pa && inPath(id)); });
        lk.b.forEach(function (id) { road(c, lk.J, nodes[id], pa && inPath(id)); });
        c.beginPath(); c.arc(lk.J.x, lk.J.y, 6, 0, 7); c.fillStyle = pa ? '#e0b46a' : 'rgba(255,246,220,.95)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = 'rgba(60,40,20,.7)'; c.stroke();
      }
      c.restore();
    });
    var cur = G.nodeId ? nodes[G.nodeId] : null, st = L._start;
    c.save(); c.strokeStyle = '#ffe08a'; c.lineWidth = 5; c.lineCap = 'round'; c.setLineDash([10, 8]); c.lineDashOffset = -t / 30;
    p.reachable.forEach(function (id) {
      var n = nodes[id]; if (!n) return;
      var J = cur ? link(cur.col - 1, lanes ? cur.lane : null).J : null, from = cur || { x: st.x, y: st.y - 30 };
      if (J) { curvePath(c, from, J); c.stroke(); curvePath(c, J, n); c.stroke(); } else { curvePath(c, from, n); c.stroke(); }
    });
    c.restore();
    if (lanes) {                                                 // 두 갈래 길 이름
      var seaY = 0, landY = 1e9; for (var id0 in L) if (id0 !== '_start') { var nn = MAPDATA.nodes.byId[id0]; if (nn.lane === 'sea') seaY = Math.max(seaY, L[id0].y); else if (nn.lane === 'land') landY = Math.min(landY, L[id0].y); }
      var my = Math.round((seaY + 52 + landY - 28) / 2);
      [['▲ 바닷길 · 수군', 'sea', my - 20], ['▼ 뭍길 · 의병', 'land', my + 20]].forEach(function (q) {
        c.save(); if (p.lane && p.lane !== q[1]) c.globalAlpha = 0.45;
        nameTag(c, q[0], W / 2, q[2] - 14, { size: 14, c1: q[1] === 'sea' ? 'rgba(30,80,130,.95)' : 'rgba(46,100,50,.95)', c2: q[1] === 'sea' ? 'rgba(14,40,70,.95)' : 'rgba(20,50,24,.95)', color: '#fff6dc' });
        c.restore();
      });
    }
    var hovered = null;
    p.nodes.forEach(function (n0) {
      var n = nodes[n0.id], open = n.state === 'open', done = n.state === 'done' || n.state === 'current', big = n.kind === 'boss' || n.kind === 'council', r = big ? 36 : 28;
      var hov = Input.hover('nd' + n.id), key = nodeKey(n), col = KIND_COL[key] || '#888', dimL = lanes && p.lane && n.lane && n.lane !== p.lane;
      var bounce = open ? Math.abs(Math.sin(t / 320 + n.x)) * -6 : 0;
      c.save(); c.globalAlpha = dimL ? 0.35 : (n.state === 'closed' ? 0.62 : 1);
      if (open) { c.beginPath(); c.arc(n.x, n.y, r + 10 + Math.sin(t / 250) * 3, 0, 7); c.fillStyle = 'rgba(255,224,138,.38)'; c.fill(); }
      c.beginPath(); c.ellipse(n.x, n.y + r * 0.85, r * 0.9, r * 0.28, 0, 0, 7); c.fillStyle = 'rgba(0,0,0,.28)'; c.fill();
      c.beginPath(); c.arc(n.x, n.y + bounce, r, 0, 7);
      var ng = c.createRadialGradient(n.x - r * 0.3, n.y + bounce - r * 0.4, r * 0.2, n.x, n.y + bounce, r);
      ng.addColorStop(0, ART.shade(done ? '#7a6a5a' : col, 0.35)); ng.addColorStop(1, done ? '#4a3e34' : col);
      c.fillStyle = ng; c.fill(); c.lineWidth = 4; c.strokeStyle = hov || U.sel === n.id ? '#ffe08a' : '#1d140d'; c.stroke();
      c.beginPath(); c.arc(n.x, n.y + bounce, r - 5, 0, 7); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke();
      ART.icon(c, kindIcon(key), n.x, n.y + bounce, r * 1.05);
      if (done && n.state !== 'current') { c.beginPath(); c.arc(n.x + r * 0.7, n.y - r * 0.7, 10, 0, 7); c.fillStyle = '#3f9a4a'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(n.x + r * 0.7 - 5, n.y - r * 0.7); c.lineTo(n.x + r * 0.7 - 1, n.y - r * 0.7 + 4); c.lineTo(n.x + r * 0.7 + 6, n.y - r * 0.7 - 4); c.stroke(); }
      c.restore();
      c.save(); c.globalAlpha = dimL ? 0.45 : (n.state === 'closed' ? 0.85 : 1);
      gx.txt(c, shortName(n.name), n.x, n.y + r + 22, { size: 16, align: 'center', weight: 'bold', color: open ? '#fff3c4' : '#fff', stroke: 5, strokeColor: '#1d140d', maxW: 160 });
      c.restore();
      if (hov) hovered = n;
      Input.zone({ id: 'nd' + n.id, x: n.x - r - 8, y: n.y - r - 8, w: r * 2 + 16, h: r * 2 + 34, enabled: true,
        tap: open ? function () {
          if (Input.isTouch && U.sel !== n.id) { U.sel = n.id; return; }
          answer({ nodeId: n.id });
        } : function () { U.sel = n.id; } });
    });
    // 장수 말: 지금 마디 위에 선 주장(처음에는 첫 열 왼쪽 땅에)
    var tk = cur ? { x: cur.x, y: cur.y - 14, s: cur.y > 230 ? 0.55 : 0.46 } : { x: st.x, y: st.y, s: 0.55 };
    hero(c, G.leader, tk.x, tk.y, tk.s, { t: t, ga: 0.5 });
    var top = tk.y - 214 * tk.s, nm = nameOf(G.leader); c.font = F(13, 'bold'); var tw2 = c.measureText(nm).width / 2 + 13;
    function hits(x, y) { return y < 58 || p.nodes.some(function (n0) { var n = nodes[n0.id], r = n.kind === 'boss' || n.kind === 'council' ? 36 : 28; return n !== cur && Math.abs(n.x - x) < tw2 + Math.max(r, 44) && y + 25 > n.y - r && y < n.y + r + 30; }); }
    var tags = [[tk.x, top - 30], [tk.x, tk.y + (cur ? 80 : 6)], [tk.x - 38 - tw2, tk.y - 70 * tk.s]], tg = tags[0];
    for (var ti = 0; ti < tags.length; ti++) if (!hits(tags[ti][0], tags[ti][1])) { tg = tags[ti]; break; }
    nameTag(c, nm, tg[0], tg[1], { size: 13 });
    hud(c);
    gx.button(c, { id: 'mapSave', x: 14, y: H - 54, w: 168, h: 42, label: ui('save', '저장하고 나가기'), size: 14, key: 'S', tap: saveExit });
    if (Input.key('KeyS')) saveExit();
    var info = hovered || (U.sel ? nodes[U.sel] : null);
    if (info) mapInfo(c, info, p.reachable.indexOf(info.id) >= 0);
    else { gx.panel(c, W / 2 - 230, H - 54, 460, 40, { r: 20 }); gx.txt(c, Input.isTouch ? '빛나는 곳을 누르고, 한 번 더 누르면 들어갑니다' : '빛나는 곳을 골라 나아가세요', W / 2, H - 33, { size: 15, align: 'center', base: 'middle', weight: 'bold', color: gx.C.goldL }); }
    for (var k2 = 0; k2 < p.reachable.length && k2 < 9; k2++) if (Input.key('Digit' + (k2 + 1))) answer({ nodeId: p.reachable[k2] });
  }
  function saveExit() { Run.save(); Main.go('title'); }
  function mapInfo(c, n, open) {
    var gx = g(), T = X();
    var w = 560, h = 104, x = (W - w) / 2, y = n.y > 380 ? 62 : H - h - 10, key = nodeKey(n);    // 아래쪽 마디면 위에 띄워 이름표를 가리지 않는다
    gx.panel(c, x, y, w, h, { r: 16 });
    c.beginPath(); c.arc(x + 46, y + h / 2 + 4, 32, 0, 7); c.fillStyle = KIND_COL[key] || '#888'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1d140d'; c.stroke();
    ART.icon(c, kindIcon(key), x + 46, y + h / 2 + 4, 36);
    gx.txt(c, shortName(n.name), x + 92, y + 36, { size: 21, weight: 'bold', color: gx.C.goldL, stroke: 3 });
    var kind = KIND_NAME[n.kind] || '';
    if (n.kind === 'fight' && n.type) kind += ' · ' + ({ field: '야전', siege: '수성', assault: '공성', naval: '해전' }[n.type] || '');
    if (n.terrain && n.terrain !== 'none' && T.terrain && T.terrain[n.terrain]) kind += ' · ' + T.terrain[n.terrain].name;
    var reg = !n.do || n.do === '—' ? '' : (n.do === '남해' || n.do === '서해' ? n.do + ' 바다' : n.do + '도');
    gx.txt(c, kind + (reg ? ' · ' + reg : ''), x + w - 18, y + 34, { size: 13, color: gx.C.dim, align: 'right', weight: 'bold' });
    gx.txt(c, (n.date && T.date ? T.date(n.date) : ''), x + 92, y + 60, { size: 13, color: '#ffd8a0', weight: 'bold' });
    gx.para(c, n.blurb || '', x + 92, y + 85, w - 110, { size: 13.5, color: gx.C.text, max: 1 });
    if (open && Input.isTouch && U.sel === n.id) gx.txt(c, '한 번 더 누르면 들어갑니다', x + w - 18, y + h - 12, { size: 12, align: 'right', color: gx.C.goldL, weight: 'bold' });
  }

  /* ---------------------------------------------------------------- 사건 (비주얼 노벨: 왼쪽에 주장, 오른쪽에 글과 선택지) */
  function storyStage(G, nd) {
    if (nd) return (nd.type === 'naval' || nd.lane === 'sea' || nd.do === '남해' || nd.act >= 6 || /포$/.test(nd.name || '')) ? 'sea' : 'land';   // 포구(…포)와 6·7막 바다 이야기는 바다 배경
    return G && G.act >= 6 ? 'sea' : 'land';
  }
  function choiceBtn(c, id, x, y, w, h, i, ch, tap) {
    var gx = g(), en = ch.enabled, hov = en && Input.hover(id), yy = y - (hov ? 2 : 0);
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
    gx.rr(c, x, yy, w, h, 14); var cg = c.createLinearGradient(0, yy, 0, yy + h);
    if (!en) { cg.addColorStop(0, '#4a4844'); cg.addColorStop(1, '#2c2a28'); } else if (hov) { cg.addColorStop(0, '#3aa08e'); cg.addColorStop(1, '#1a5850'); } else { cg.addColorStop(0, '#2c7a6e'); cg.addColorStop(1, '#14443e'); }
    c.fillStyle = cg; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.lineWidth = hov ? 3 : 2; c.strokeStyle = en ? (hov ? '#ffe08a' : 'rgba(255,224,138,.7)') : 'rgba(160,150,135,.4)'; c.stroke();
    gx.rr(c, x + 4, yy + 3, w - 8, h * 0.4, 11); c.fillStyle = 'rgba(255,255,255,.08)'; c.fill();
    c.restore();
    c.beginPath(); c.arc(x + 32, yy + h / 2, 17, 0, 7); c.fillStyle = en ? '#e6b84a' : '#7a7266'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1d140d'; c.stroke();
    gx.txt(c, String(i + 1), x + 32, yy + h / 2 + 1, { size: 17, align: 'center', base: 'middle', weight: 'bold', color: '#1d140d' });
    gx.txt(c, ch.text, x + 62, yy + h / 2 - 10, { size: 18, base: 'middle', weight: 'bold', color: en ? '#fffaf0' : '#a09888', maxW: w - 80, stroke: en ? 3 : 0, strokeColor: 'rgba(0,20,20,.5)' });
    gx.txt(c, en ? ch.preview : ch.reason, x + 62, yy + h / 2 + 15, { size: 13.5, base: 'middle', color: en ? '#ffe08a' : '#ffb0a0', maxW: w - 80, weight: 'bold' });
    Input.zone({ id: id, x: x, y: y, w: w, h: h, enabled: en, tap: tap });
  }
  function storyFrame(c, who, pose, stg, ph) {                 // 무대 + 왼쪽 인물 + 오른쪽 어두운 대화 창(아래에 붙는다). 창의 자리를 돌려준다
    var gx = g();
    stage(c, stg);
    var feet = stg === 'sea' || stg === 'nightsea' ? 616 : (stg === 'palace' ? 650 : 652);
    if (who === 'king') { ART.throne(c, 24, 196, 330, 210, U.t); c.fillStyle = '#5a2418'; gx.rr(c, 40, 396, 300, 22, 4); c.fill(); }
    var lean = pose === 'down' && ART.CHAR[who] && ART.CHAR[who].banner, hx = lean ? 240 : 200;     // 쓰러진 자세는 깃발이 뒤로 눕는다: 화면 밖으로 나가지 않게
    hero(c, who, hx, feet, lean ? 1.55 : 1.75, { t: U.t, pose: pose });
    nameTag(c, nameOf(who), hx, feet + 10, { size: 16 });
    var h = Math.max(380, Math.min(640, Math.round(ph || 640))), P = { x: 400, y: H - 14 - h, w: 856, h: h };
    gx.panel(c, P.x, P.y, P.w, P.h, { c1: 'rgba(20,48,56,.95)', c2: 'rgba(8,22,28,.97)' });
    return P;
  }
  function drawEvent(c, p) {
    var gx = g(), G = Run.state(), T = X(), nd = p.nodeId ? MAPDATA.nodes.byId[p.nodeId] : null;
    Input.zone({ id: 'evNext', x: 0, y: 54, w: W, h: H - 54, tap: function () { revealTap(lens); } });
    var n = p.choices.length, chH = 64, gap = 10, tw = 764, SZ = [[18, 30, null, 10], [16.5, 27, null, 8], [15, 24, null, 6]];
    var fit = fitText(c, p.text, tw, 640 - 134 - 26 - n * (chH + gap), SZ);
    var P = storyFrame(c, G.leader, 'idle', storyStage(G, nd), 134 + fit.h + 20 + n * (chH + gap) + 10);
    ribbon(c, p.title, P.x + P.w / 2, P.y + 44, { size: 26 });
    var sub = [p.date && T.date ? T.date(p.date) : '', p.place ? shortName(p.place) : ''].filter(Boolean).join(' · ');
    if (sub) gx.txt(c, sub, P.x + P.w / 2, P.y + 92, { size: 14.5, align: 'center', weight: 'bold', color: '#ffd8a0' });
    var cy0 = P.y + P.h - 20 - n * (chH + gap) + gap, tx = P.x + 46, ty = P.y + 134;
    var res = typeText(c, p.text, tx, ty, tw, { size: fit.size, lh: fit.lh, gap: fit.gap, color: '#fff6e6' }), lens = res.lens;
    if (!res.done) moreMark(c, P.x + P.w - 40, cy0 - 18);
    hud(c);
    if (res.done) {
      if (U.sel == null) U.sel = U.t;
      var k = fast() ? 1 : clamp01((U.t - U.sel) / 260);
      p.choices.forEach(function (ch, i) {
        c.save(); c.globalAlpha = clamp01(k * 1.6 - i * 0.25);
        choiceBtn(c, 'ev' + i, P.x + 40, cy0 + i * (chH + gap) + (1 - k) * 16, P.w - 80, chH, i, ch, function () { answer({ choice: i }); });
        c.restore();
      });
    }
    p.choices.forEach(function (ch, i) { if (ch.enabled && Input.key('Digit' + (i + 1))) answer({ choice: i }); });
    if (Input.key('Enter') || Input.key('Space')) revealTap(lens);
  }

  /* ---------------------------------------------------------------- 시장 */
  function bubble(c, text, x, y, o) {                          // 말풍선: (x,y) = 꼬리 끝
    o = o || {}; var gx = g(), sz = o.size || 15; c.font = F(sz, 'bold');
    var w = Math.min(o.maxW || 260, c.measureText(gx.clean(text)).width + 28), lines = gx.wrap(c, text, w - 24), h = lines.length * (sz + 6) + 16, bx = x + (o.dx || -w / 2), by = y - 14 - h;
    c.save(); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
    gx.rr(c, bx, by, w, h, 12); c.fillStyle = '#fffaf0'; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.beginPath(); c.moveTo(x - 9, by + h - 1); c.lineTo(x, y); c.lineTo(x + 9, by + h - 1); c.closePath(); c.fill();
    c.lineWidth = 2; c.strokeStyle = '#1d140d'; gx.rr(c, bx, by, w, h, 12); c.stroke();
    c.fillStyle = '#fffaf0'; c.fillRect(x - 8, by + h - 2, 16, 4);
    c.beginPath(); c.moveTo(x - 9, by + h); c.lineTo(x, y); c.lineTo(x + 9, by + h); c.stroke();
    c.restore();
    lines.forEach(function (l, i) { gx.txt(c, l, bx + w / 2, by + 8 + sz + i * (sz + 6) - 3, { size: sz, align: 'center', weight: 'bold', color: '#2a1c10' }); });
  }
  function stall(c, t) {                                         // 장사꾼의 좌판: 차양과 물건
    var gx = g();
    c.strokeStyle = '#4a3020'; c.lineWidth = 6; c.beginPath(); c.moveTo(34, 646); c.lineTo(34, 410); c.moveTo(282, 646); c.lineTo(282, 410); c.stroke();
    for (var s = 0; s < 8; s++) { c.fillStyle = s % 2 ? '#f3eee0' : '#2f6fa8'; c.beginPath(); c.moveTo(18 + s * 35, 402); c.lineTo(53 + s * 35, 402); c.lineTo(56 + s * 36, 440); c.lineTo(15 + s * 36, 440); c.closePath(); c.fill(); }
    c.fillStyle = '#1d140d'; c.fillRect(14, 398, 292, 5);
    for (var f = 0; f < 8; f++) { c.fillStyle = f % 2 ? '#f3eee0' : '#2f6fa8'; c.beginPath(); c.arc(32 + f * 36, 440, 18, 0, Math.PI); c.fill(); }
    c.fillStyle = '#6a4423'; gx.rr(c, 20, 618, 280, 24, 4); c.fill(); c.fillStyle = '#4a2e18'; c.fillRect(34, 642, 10, 40); c.fillRect(276, 642, 10, 40);
    ART.icon(c, 'pouch', 60, 604, 34); ART.icon(c, 'rice', 104, 606, 30); ART.icon(c, 'scroll', 250, 604, 32); ART.icon(c, 'lantern', 214, 602, 30);
  }
  function drawShop(c, p) {
    var gx = g(), G = Run.state(), t = U.t;
    stage(c, 'village');
    c.fillStyle = 'rgba(8,20,24,.2)'; c.fillRect(0, 54, W, H - 54);
    stall(c, t);
    hero(c, 'merchant', 160, 650, 1.38, { t: t });
    hero(c, G.leader, 1112, 654, 1.32, { t: t, facing: -1, phase: 2 });
    if (U.t < 4200 && U.shop !== 'remove') bubble(c, p.ration < 30 ? '보기만 해도 됩니다!' : '좋은 물건 들어왔소!', 196, 372, { size: 15 });
    hud(c);
    heading(c, ui('shopHead', '시장'), 98, 'pouch');
    gx.txt(c, '군량으로 카드와 물건을 산다. 카드 버리기는 한 번뿐이다.', W / 2, 142, { size: 15, align: 'center', color: '#fff2d8', weight: 'bold', stroke: 4 });
    if (U.shop === 'remove') return shopRemove(c, p);
    var items = p.cards.map(function (it) { return { card: it.card, up: false, price: it.price, sold: it.sold, affordable: it.affordable, dim: it.sold || !it.affordable }; });
    var per = items.length, cw = 116, gap = 22, x0 = (W - (per * cw + (per - 1) * gap)) / 2;
    items.forEach(function (it, i) {
      var x = x0 + i * (cw + gap), y = 160, hov = Input.hover('sc' + i);
      gx.drawCard(c, it.card, false, x, y - (hov ? 6 : 0), cw, 166, { dim: it.dim, glow: hov && !it.dim ? gx.C.goldL : null });
      gx.rr(c, x + cw / 2 - 38, y + 172, 76, 26, 13); c.fillStyle = it.sold ? '#3a3a3a' : (it.affordable ? '#2c6a2a' : '#7a2a1a'); c.fill(); c.lineWidth = 2; c.strokeStyle = '#1d140d'; c.stroke();
      if (!it.sold) ART.icon(c, 'rice', x + cw / 2 - 20, y + 185, 18);
      gx.txt(c, it.sold ? ui('sold', '판매 완료') : String(it.price), x + cw / 2 + (it.sold ? 0 : 8), y + 186, { size: it.sold ? 13 : 15, align: 'center', base: 'middle', weight: 'bold' });
      Input.zone({ id: 'sc' + i, x: x, y: y, w: cw, h: 200, enabled: !it.sold && it.affordable, tap: function () { answer({ buy: 'card', idx: i }); }, long: function () { U.detail = it; } });
      if (hov && !Input.isTouch) gx.cardInfoBox(c, it.card, false, x + cw + 370 > W ? x - 360 : x + cw + 8, 158, 350);
    });
    p.relics.forEach(function (r, i) {
      var w = 312, x = W / 2 - 326 + i * 340, y = 396, h = 116, hov = Input.hover('sr' + i), en = !r.sold && r.affordable;
      gx.panel(c, x, y - (hov && en ? 3 : 0), w, h, { border: hov && en ? '#ffe08a' : '#b8944a' });
      relicBadge(c, r.id, x + 52, y + h / 2 + 4, 34);
      gx.txt(c, r.relic.name, x + 98, y + 40, { size: 17, weight: 'bold', color: gx.C.goldL, maxW: w - 108 });
      gx.para(c, r.relic.desc, x + 98, y + 62, w - 108, { size: 12.5, color: gx.C.text, lh: 18, max: 2 });
      if (!r.sold) ART.icon(c, 'rice', x + w - 64, y + h - 18, 18);
      gx.txt(c, r.sold ? '' : String(r.price), x + w - 16, y + h - 12, { size: 15, align: 'right', weight: 'bold', color: en ? '#9fe08f' : '#ff8d76' });
      if (!en) { gx.rr(c, x, y, w, h, 14); c.fillStyle = 'rgba(10,8,6,.5)'; c.fill(); }
      if (r.sold) { c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(-0.12); gx.rr(c, -80, -22, 160, 44, 8); c.lineWidth = 4; c.strokeStyle = '#ff8a6a'; c.stroke(); gx.txt(c, ui('sold', '판매 완료'), 0, 2, { size: 22, align: 'center', base: 'middle', weight: 'bold', color: '#ff8a6a' }); c.restore(); }
      Input.zone({ id: 'sr' + i, x: x, y: y, w: w, h: h, enabled: en, tap: function () { answer({ buy: 'relic', idx: i }); } });
    });
    gx.button(c, { id: 'shRm', x: W / 2 - 326, y: 540, w: 312, h: 64, label: ui('remove', '카드 버리기'), icon: 'fire', sub: p.removeUsed ? ui('removeDone', '이미 한 장을 버렸다') : '군량 ' + p.removePrice + ' (어명 ' + p.removeEdictPrice + ')',
      enabled: !p.removeUsed && p.ration >= p.removePrice, tap: function () { U.shop = 'remove'; U.scroll = 0; } });
    gx.button(c, { id: 'shLeave', x: W / 2 + 14, y: 540, w: 312, h: 64, label: ui('leave', '나가기'), green: true, key: 'Esc', tap: function () { answer({ leave: true }); } });
    if (Input.key('Escape')) answer({ leave: true });
  }
  function shopRemove(c, p) {
    var gx = g();
    var list = p.deck.map(function (d) { var pr = d.card.type === 'edict' ? p.removeEdictPrice : p.removePrice; return { card: d.card, up: d.up, uid: d.uid, price: pr, affordable: p.ration >= pr, dim: p.ration < pr }; });
    gx.panel(c, 300, 158, 680, 40, { r: 20, stripe: false });
    gx.txt(c, '버릴 카드를 고르세요', W / 2, 179, { size: 18, align: 'center', base: 'middle', weight: 'bold', color: gx.C.goldL });
    cardGrid(c, list, { id: 'rm', top: 214, viewH: 400, priceRow: true, per: 6, tap: function (i) { if (list[i].affordable) { U.shop = null; answer({ remove: list[i].uid }); } } });
    gx.button(c, { id: 'rmBack', x: W / 2 - 110, y: H - 70, w: 220, h: 52, label: ui('back', '뒤로'), icon: 'back', tap: function () { U.shop = null; } });
    if (Input.key('Escape')) U.shop = null;
  }

  /* ---------------------------------------------------------------- 군영 (밤, 모닥불 둘레에 장수들) */
  var CAMP_ICON = { rest: 'campfire', train: 'swords', farm: 'rice' };
  var CAMP_COL = { rest: ['#2f7a5a', '#173e2e'], train: ['#2a5a8a', '#152c4a'], farm: ['#a8842a', '#5a4010'] };
  function optionCard(c, id, x, y, w, h, o, num) {
    var gx = g(), hov = Input.hover(id) && o.enabled, col = o.col || ['#2c5a62', '#14303a'], yy = y - (hov ? 8 : 0);
    c.save();
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    gx.rr(c, x, yy, w, h, 18);
    var cg = c.createLinearGradient(0, yy, 0, yy + h); cg.addColorStop(0, o.enabled ? col[0] : '#5a5650'); cg.addColorStop(1, o.enabled ? col[1] : '#2e2c2a');
    c.fillStyle = cg; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.save(); gx.rr(c, x + 2, yy + 2, w - 4, h - 4, 16); c.clip(); gx.dancheong(c, x, yy + 5, w, 0.9); c.restore();
    c.lineWidth = 4; c.strokeStyle = hov ? '#ffe08a' : '#e6b84a'; c.stroke();
    c.restore();
    var cy = yy + 86;
    c.beginPath(); c.arc(x + w / 2, cy, 56, 0, 7); c.fillStyle = 'rgba(255,255,255,.14)'; c.fill();
    if (o.person) ART.portrait(c, o.person, x + w / 2, cy, 54, { t: U.t }); else ART.icon(c, o.icon, x + w / 2, cy, 80, o.iconCol);
    if (num && !Input.isTouch && o.enabled) { c.beginPath(); c.arc(x + 26, yy + 30, 15, 0, 7); c.fillStyle = '#e6b84a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1d140d'; c.stroke(); gx.txt(c, String(num), x + 26, yy + 31, { size: 15, align: 'center', base: 'middle', weight: 'bold', color: '#1d140d' }); }
    gx.txt(c, o.title, x + w / 2, yy + 178, { size: 25, align: 'center', weight: 'bold', stroke: 4, maxW: w - 30 });
    gx.para(c, o.desc || '', x + w / 2, yy + 210, w - 44, { size: 14, color: '#fff2dc', lh: 21, max: 3, align: 'center' });
    gx.panel(c, x + 20, yy + h - 56, w - 40, 40, { r: 20, c1: 'rgba(0,0,0,.35)', c2: 'rgba(0,0,0,.45)', border: 'rgba(255,224,138,.6)', stripe: false });
    gx.txt(c, o.enabled ? o.preview : o.reason, x + w / 2, yy + h - 36, { size: 15, align: 'center', base: 'middle', weight: 'bold', color: o.enabled ? '#c8ffb0' : '#ffb0a0', maxW: w - 66 });
    Input.zone({ id: id, x: x, y: y, w: w, h: h, enabled: o.enabled, tap: o.tap });
  }
  function campfire(c, x, y, t) {
    c.save(); glow(c, x, y - 20, 260, '255,150,60', 0.42 + Math.sin(t / 130) * 0.04); c.restore();
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + 8, 70, 14, 0, 0, 7); c.fill();
    for (var s = 0; s < 7; s++) { c.fillStyle = '#5a5248'; c.beginPath(); c.ellipse(x - 54 + s * 18, y + 6 + (s % 2) * 3, 11, 7, 0, 0, 7); c.fill(); }
    c.save(); c.translate(x, y - 6); var k = 1 + Math.sin(t / 90) * 0.05 + Math.sin(t / 47) * 0.03; c.scale(k, 1 / k); ART.icon(c, 'campfire', 0, -16, 96); c.restore();
    c.save(); c.fillStyle = '#ffc070';
    for (var i = 0; i < 10; i++) { var ph = ((t / 900 + hr(i, 11)) % 1), sx = x + (hr(i, 12) - 0.5) * 50 + Math.sin(t / 200 + i) * 8 * ph; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(sx, y - 40 - ph * 140, 2.2 * (1 - ph) + 0.6, 0, 7); c.fill(); }
    c.restore();
  }
  function drawCamp(c, p) {
    var gx = g(), G = Run.state(), t = U.t;
    stage(c, 'camp');
    campfire(c, 640, 668, t);
    var deps = G.deputies.slice(); if (G.special) deps.push(G.special);
    var spots = [[792, 700, -1], [380, 706, 1], [900, 706, -1]], crowd = deps.slice(0, 3);   // 빈자리는 군사들이 채운다
    while (crowd.length < 3) crowd.push(['soldier', 'militia', 'soldier2'][crowd.length]);
    crowd.forEach(function (id, k) { var s = spots[k], dep = k < deps.length; hero(c, id, s[0], s[1], dep ? 0.86 : 0.74, { t: t, facing: s[2], phase: k + 1, rgb: '255,170,90', ga: 0.3, alpha: dep ? 1 : 0.92 }); });
    hero(c, G.leader, 510, 704, 0.9, { t: t, rgb: '255,170,90', ga: 0.35 });
    hud(c);
    heading(c, ui('campHead', '군영'), 100, 'tent');
    gx.txt(c, p.enter || '천막이 섰다. 하루를 어떻게 쓸까?', W / 2, 146, { size: 17, align: 'center', weight: 'bold', stroke: 4 });
    p.options.forEach(function (o, i) {
      var w = 296, h = 316, x = W / 2 + (i - 1) * 326 - w / 2, y = 170;
      optionCard(c, 'cp' + o.id, x, y, w, h, { enabled: o.enabled, icon: CAMP_ICON[o.id], col: CAMP_COL[o.id], title: o.text, desc: o.desc, preview: o.preview, reason: o.reason, tap: function () { answer({ pick: o.id }); } }, i + 1);
      if (o.enabled && Input.key('Digit' + (i + 1))) answer({ pick: o.id });
    });
  }

  /* ---------------------------------------------------------------- 조정 (궁궐 안, 왼쪽에 임금, 오른쪽에 주장) */
  var COURT_ICON = { report: 'letter', recruit: 'people', request: 'flag' };
  var COURT_COL = { report: ['#a8842a', '#5a4010'], recruit: ['#2a5a8a', '#152c4a'], request: ['#2f7a5a', '#173e2e'] };
  function courtStage(c, t) {
    var gx = g();
    stage(c, 'palace');
    ART.throne(c, 30, 214, 232, 156, t);
    c.fillStyle = '#5a2418'; gx.rr(c, 36, 364, 220, 20, 4); c.fill(); c.fillStyle = '#7a3a24'; gx.rr(c, 22, 382, 248, 16, 4); c.fill();
    hero(c, 'king', 154, 600, 1.32, { t: t, ga: 0.25 });
    nameTag(c, nameOf('king'), 154, 610, { size: 14 });
    hero(c, Run.state().leader, 1150, 650, 1.28, { t: t, facing: -1, phase: 2 });
  }
  function drawCourt(c, p) {
    var gx = g(), t = U.t;
    courtStage(c, t);
    hud(c);
    heading(c, ui('courtHead', '조정'), 100, 'palace');
    gx.txt(c, p.enter || '궁궐의 문이 열렸다. 무엇을 아뢸까?', W / 2, 146, { size: 17, align: 'center', weight: 'bold', stroke: 4 });
    if (U.sel === 'recruit') return courtRecruit(c, p);
    if (U.sel === 'request') return courtRequest(c, p);
    p.options.forEach(function (o, i) {
      var w = 252, h = 340, x = 676 + (i - 1) * 270 - w / 2, y = 176;
      optionCard(c, 'ct' + o.id, x, y, w, h, { enabled: o.enabled, icon: COURT_ICON[o.id], iconCol: o.id === 'request' ? '#2f6fa8' : null, col: COURT_COL[o.id], title: o.text, desc: o.desc, preview: o.preview, reason: o.reason, tap: function () { pickCourt(p, o.id); } }, i + 1);
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
    gx.txt(c, '누구를 들일까?', 676, 182, { size: 20, align: 'center', weight: 'bold', color: gx.C.goldL, stroke: 4 });
    p.recruits.forEach(function (r, i) {
      var d = r.general, w = 260, h = 350, x = 676 + (i - (p.recruits.length - 1) / 2) * 280 - w / 2, y = 200;
      var cd = d.card ? CARDS.byId[d.card] : null;
      optionCard(c, 'rc' + i, x, y, w, h, { enabled: true, person: d.id, col: ['#2a5a8a', '#152c4a'], title: d.name, desc: d.passiveDesc, preview: cd ? '고유 카드: ‘' + cd.name + '’' : '부장으로 맞는다', tap: function () { answer({ pick: 'recruit', id: d.id }); } });
      if (r.slotFull) gx.txt(c, ui('slotFull', '자리가 찼다. 누구와 바꿀까?'), x + w / 2, y + h + 22, { size: 13, align: 'center', color: gx.C.dim, weight: 'bold', stroke: 3 });
    });
    gx.button(c, { id: 'rcBack', x: W / 2 - 100, y: H - 76, w: 220, h: 52, label: ui('back', '뒤로'), icon: 'back', tap: function () { U.sel = null; } });
  }
  function courtRequest(c, p) {
    var gx = g();
    gx.txt(c, '어느 군사를 청할까? — 군량 ' + B.COURT.requestCost, 676, 182, { size: 20, align: 'center', weight: 'bold', color: gx.C.goldL, stroke: 4 });
    var list = (p.mingCards || []).map(function (cd) { return { card: cd, up: false }; });
    var cw = 136, gap = 34, x0 = 676 - (list.length * cw + (list.length - 1) * gap) / 2;
    list.forEach(function (it, i) {
      var x = x0 + i * (cw + gap), y = 220, hov = Input.hover('rq' + i);
      gx.drawCard(c, it.card, false, x, y - (hov ? 8 : 0), cw, 194, { glow: hov ? gx.C.goldL : null });
      Input.zone({ id: 'rq' + i, x: x, y: y, w: cw, h: 194, tap: function () { answer({ pick: 'request', cardId: it.card.id }); } });
      if (hov && !Input.isTouch) gx.cardInfoBox(c, it.card, false, x + cw + 360 > W ? x - 360 : x + cw + 10, 220, 350);
    });
    gx.button(c, { id: 'rqBack', x: W / 2 - 100, y: H - 76, w: 220, h: 52, label: ui('back', '뒤로'), icon: 'back', tap: function () { U.sel = null; } });
  }

  /* ---------------------------------------------------------------- 보상 */
  function bossOf(encId) {
    var enc = ENEMIES.encounters.byId[encId]; if (!enc) return null;
    var spec = (enc.waves && enc.waves.length) ? enc.waves[0].enemies : enc.enemies;
    var id = spec && spec[0] ? spec[0].id : null; if (!id) return null;
    var tpl = ENEMIES.byId[id]; return tpl ? { id: id, name: tpl.name, tags: tpl.tags, boss: (tpl.tags || []).indexOf('boss') >= 0 || !!enc.boss, buildCount: 0 } : null;
  }
  function drawFoe(c, fo, x, y, s, o) {
    if (ART.isShip(fo)) ART.wship(c, fo, x, y, s * 0.72, o); else if (fo.id === 'wajo_garrison') ART.castle(c, fo, x, y, s * 1.1, o); else ART.foe(c, fo, x, y, s, o);
  }
  function drawReward(c, p) {
    var gx = g(), G = Run.state(), t = U.t, T = X();
    backdrop(c, G.act);
    glow(c, W / 2, 330, 520, '255,214,120', 0.22);
    var fo = p.boss && G.lastBattle ? bossOf(G.lastBattle.encId) : null;
    if (fo) drawFoe(c, fo, 1135, 650, 1.15, { t: t, pose: 'hurt', alpha: 0.85 });
    hero(c, G.leader, 176, 652, 1.5, { t: t, pose: 'win', ga: 0.55 });
    sparkles(c, t, 7, 176, 470, 110, 130);
    confetti(c, t, p.boss ? 46 : 26, 0, W, 54, H - 54);
    hud(c);
    heading(c, p.boss ? '결전 승리!' : (p.elite ? '정예를 꺾었다!' : '승리!'), p.boss ? 104 : 100, 'star', 'gold', p.boss ? 30 : 26);
    var bonus = p.bonusRation || 0, rt = '군량 +' + p.ration, bt = bonus ? (bonus > 0 ? '+' : '−') + Math.abs(bonus) + (p.bonusText ? ' ' + p.bonusText : '') : '';
    c.font = F(20, 'bold'); var w1 = c.measureText(rt).width; c.font = F(15, 'bold'); var w2 = bt ? c.measureText(gx.clean(bt)).width + 30 : 0;
    var rx = W / 2 - (34 + w1 + (bt ? 14 + w2 : 0)) / 2, ry = p.boss ? 160 : 154;
    ART.icon(c, 'rice', rx + 14, ry - 6, 30); gx.txt(c, rt, rx + 34, ry + 1, { size: 20, weight: 'bold', stroke: 3 });
    if (bt) { var bx = rx + 34 + w1 + 14; gx.rr(c, bx, ry - 19, w2, 28, 14); c.fillStyle = bonus > 0 ? 'rgba(46,120,60,.92)' : 'rgba(130,40,28,.92)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,224,138,.7)'; c.stroke(); gx.txt(c, bt, bx + w2 / 2, ry - 4, { size: 15, align: 'center', base: 'middle', weight: 'bold' }); }
    var cy = ry + 52;
    if (p.relic) {                                               // 기물 진열: 결전이면 크게
      var pw = 560, ph = 78, px = W / 2 - pw / 2, py = ry + 18;
      gx.panel(c, px, py, pw, ph, { c1: '#2a5a62', c2: '#123038', border: '#ffe08a' });
      glow(c, px + 50, py + ph / 2 + 3, 50, '255,224,138', 0.4 + Math.sin(t / 300) * 0.1);
      relicBadge(c, p.relic.id, px + 50, py + ph / 2 + 3, 29);
      gx.txt(c, ui('relicGet', '기물을 얻었다') + ' · ' + p.relic.name, px + 94, py + 34, { size: 19, weight: 'bold', color: gx.C.goldL, maxW: pw - 110 });
      gx.txt(c, p.relic.desc, px + 94, py + 59, { size: 13.5, color: gx.C.text, weight: 'bold', maxW: pw - 110 });
      cy = py + ph + 30;
    }
    gx.txt(c, ui('rewardHead', '카드 한 장을 고르거나 건너뛰세요'), W / 2, cy, { size: 16, align: 'center', color: '#fff', weight: 'bold', stroke: 3 });
    var cw = p.relic ? 168 : 180, ch = p.relic ? 240 : 256, gap = 46, n = p.cards.length, x0 = (W - (n * cw + (n - 1) * gap)) / 2, top = cy + 18;
    p.cards.forEach(function (cd, i) {
      var x = x0 + i * (cw + gap), y = top, hov = Input.hover('rw' + i), pop = Math.min(1, Math.max(0, (t - i * 120) / 260));
      c.save(); c.globalAlpha = pop; c.translate(x + cw / 2, y + ch / 2); c.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop);
      gx.drawCard(c, cd, false, -cw / 2, -ch / 2 - (hov ? 12 : 0), cw, ch, { glow: hov ? gx.C.goldL : null });
      c.restore();
      gx.txt(c, [(T.pool || {})[cd.pool], cd.rarity ? (T.rarity || {})[cd.rarity] : ''].filter(Boolean).join(' · '), x + cw / 2, y + ch + 22, { size: 13, align: 'center', color: gx.C.dim, weight: 'bold', stroke: 3 });
      Input.zone({ id: 'rw' + i, x: x, y: y, w: cw, h: ch, tap: function () { if (Input.isTouch && U.sel !== i) { U.sel = i; return; } answer({ cardIdx: i }); } });
      if ((hov && !Input.isTouch) || (Input.isTouch && U.sel === i)) gx.cardInfoBox(c, cd, false, x + cw + 360 > W ? x - 360 : x + cw + 10, top, 350, Input.isTouch ? [{ text: '한 번 더 누르면 넣는다', color: gx.C.goldL }] : []);
      if (Input.key('Digit' + (i + 1))) answer({ cardIdx: i });
    });
    gx.button(c, { id: 'rwSkip', x: W / 2 - 140, y: Math.min(H - 70, top + ch + 40), w: 280, h: 58, label: ui('skip', '건너뛰기'), sub: '군량 +' + p.skipBonus, tap: function () { answer({ cardIdx: null }); } });
  }

  /* ---------------------------------------------------------------- 장계 분배 */
  function meritEffects(m) {
    var M = B.MERIT, out = {};
    var ups = Math.min(M.leaderMaxUp, Math.floor(m.leader / M.leaderPer)), sUp = m.leader >= 10 ? M.leaderSusp10 : (m.leader >= 5 ? M.leaderSusp5 : 0);
    var kS = Math.floor(m.king / M.kingPer), down = Math.min(M.kingMaxDown, kS);
    out.leader = '카드 강화 ' + ups + '장' + (sUp ? ' · 의심 +' + sUp : '');
    out.king = '의심 −' + down + ' · 군량 +' + kS * M.kingRation;
    out.ming = '다음 막 명군 군량 −' + Math.min(M.mingMaxDiscount, Math.floor(m.ming / M.mingPer));
    return out;
  }
  function drawMerit(c, p) {
    var gx = g(), G = Run.state(), T = X(), M = U.merit, t = U.t;
    backdrop(c, G.act);
    hero(c, G.leader, 150, 660, 1.3, { t: t });
    hero(c, 'king', 1150, 660, 1.25, { t: t, facing: -1, ga: 0.25 });
    hud(c);
    var w = 780, x = (W - w) / 2, h = 166 + p.slots.length * 116 + 96, y = Math.max(66, Math.round(54 + (H - 54 - h) / 2));
    gx.panel(c, x, y, w, h, {});
    ribbon(c, (T.ui && T.ui.merit) || '장계 분배', W / 2, y + 44, { size: 26 });
    gx.txt(c, (T.merit && T.merit.head) || '이번 싸움의 공을 누구에게 돌릴까?', W / 2, y + 96, { size: 17, align: 'center', color: '#fff2d8', weight: 'bold' });
    var left = p.total - (M.leader + M.king + (M.ming || 0));
    nameTag(c, '공 ' + p.total + '점 · 남은 공 ' + left, W / 2, y + 112, { size: 15, color: left ? '#ffb0a0' : '#c8ffb0' });
    var eff = meritEffects(M);
    p.slots.forEach(function (s, i) {
      var yy = y + 168 + i * 116, name = (T.merit && T.merit.slots && T.merit.slots[s]) || s;
      gx.rr(c, x + 24, yy - 8, w - 48, 104, 14); c.fillStyle = 'rgba(255,255,255,.05)'; c.fill();
      if (s === 'leader') ART.portrait(c, G.leader, x + 80, yy + 30, 32, { t: t });
      else if (s === 'king') ART.portrait(c, 'king', x + 80, yy + 30, 32, { t: t });
      else { c.beginPath(); c.arc(x + 80, yy + 30, 32, 0, 7); c.fillStyle = '#5a4a2a'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = '#e6c048'; c.stroke(); ART.icon(c, 'ming', x + 80, yy + 30, 36); }
      gx.txt(c, name, x + 80, yy + 86, { size: 16, align: 'center', weight: 'bold', color: gx.C.goldL });
      gx.button(c, { id: 'mm' + s, x: x + 140, y: yy + 6, w: 52, h: 48, label: '−', enabled: M[s] > 0, tap: function () { M[s]--; } });
      for (var k = 0; k < p.total; k++) { gx.rr(c, x + 204 + k * 25, yy + 18, 21, 24, 4); c.fillStyle = k < M[s] ? '#e6b84a' : 'rgba(0,0,0,.35)'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = k < M[s] ? '#fff2b0' : 'rgba(255,224,138,.35)'; c.stroke(); }
      gx.button(c, { id: 'mp' + s, x: x + 460, y: yy + 6, w: 52, h: 48, label: '+', enabled: left > 0, tap: function () { M[s]++; } });
      gx.txt(c, String(M[s]), x + 546, yy + 40, { size: 26, weight: 'bold', color: '#fff' });
      gx.txt(c, eff[s] || '', x + 204, yy + 70, { size: 15, color: '#ffe08a', weight: 'bold' });
      if (T.merit && T.merit.effects && T.merit.effects[s]) gx.txt(c, T.merit.effects[s], x + 204, yy + 90, { size: 12, color: gx.C.dim, maxW: 530 });
    });
    gx.button(c, { id: 'mOk', x: W / 2 - 140, y: y + h - 82, w: 280, h: 60, label: (T.merit && T.merit.confirm) || ui('confirm', '확인'), green: true, enabled: left === 0, icon: 'letter',
      tap: function () { answer({ alloc: { leader: M.leader, king: M.king, ming: M.ming || 0 } }); } });
  }

  /* ---------------------------------------------------------------- 카드·장수 고르기 */
  var PICK_TITLE = { upgrade: '강화할 카드 고르기', train: '훈련 — 강화할 카드 고르기', offer: '덱에 넣을 카드 고르기', remove: '버릴 카드 고르기' };
  var PICK_SUB = { upgrade: '강화할 카드를 {n}장 고르세요', train: '강화할 카드를 {n}장 고르세요', offer: '덱에 넣을 카드를 {n}장 고르세요', remove: '버릴 카드를 {n}장 고르세요' };
  function drawPickCard(c, p) {
    var gx = g(), G = Run.state(), upg = p.reason === 'upgrade' || p.reason === 'train';
    backdrop(c, G.act);
    hud(c);
    heading(c, PICK_TITLE[p.reason] || '카드 고르기', 100, p.reason === 'offer' ? 'plus' : (upg ? 'swords' : 'star'));
    gx.txt(c, (PICK_SUB[p.reason] || '카드를 {n}장 고르세요').replace('{n}', p.n) + (p.canSkip ? ' (건너뛸 수 있습니다)' : '') + (upg ? ' — 고른 카드는 강화된 모습으로 보입니다' : ''), W / 2, 146, { size: 15, align: 'center', color: '#fff2d8', weight: 'bold', stroke: 4 });
    var list = p.candidates.map(function (cd, i) {
      var extra = [], on = U.picks.indexOf(i) >= 0;
      if (upg) { var pl = cd.card.plus || {}; extra.push({ text: '강화하면: ' + (pl.desc || cd.card.desc), color: gx.C.goldL, bold: true }); }
      return { card: cd.card, up: cd.up || (upg && on), extra: extra };
    });
    cardGrid(c, list, { id: 'pk', top: 172, viewH: 430, per: 8, cw: 118, ch: 168, selected: U.picks, check: true,
      tap: function (i) { var k = U.picks.indexOf(i); if (k >= 0) U.picks.splice(k, 1); else { U.picks.push(i); if (U.picks.length > p.n) U.picks.shift(); } } });
    var need = Math.min(p.n, p.candidates.length);
    gx.button(c, { id: 'pkOk', x: W / 2 - (p.canSkip ? 290 : 140), y: H - 84, w: 280, h: 60, label: upg ? '강화하기' : ui('confirm', '확인'), green: true, enabled: U.picks.length === need || (p.canSkip && U.picks.length > 0),
      tap: function () { answer({ picks: U.picks.slice() }); } });
    if (p.canSkip) gx.button(c, { id: 'pkSkip', x: W / 2 + 10, y: H - 84, w: 280, h: 60, label: ui('skip', '건너뛰기'), tap: function () { answer({ picks: [] }); } });
  }
  function drawPickGeneral(c, p) {
    var gx = g(), G = Run.state(), t = U.t;
    backdrop(c, G.act);
    var inc = p.incoming, joining = p.reason === 'optional' && p.candidates[0] && p.candidates[0].general.id === inc.id, icd = inc.card ? CARDS.byId[inc.card] : null;
    glow(c, W / 2, 270, 200, '255,224,138', 0.25);
    hero(c, inc.id, W / 2, 352, 0.94, { t: t, pose: 'win', ga: 0.5 });
    hero(c, G.leader, 146, 660, 1.2, { t: t });
    hud(c);
    heading(c, iga(inc.name) + (joining ? ' 함께 싸우기를 청한다' : ' 왔다 · 부장 자리가 찼다'), 100, 'people');
    gx.para(c, inc.passiveDesc || '', W / 2, 384, 640, { size: 16, align: 'center', weight: 'bold', color: '#ffe8b8', stroke: 3, max: 2 });
    if (icd) gx.txt(c, '들어오는 카드: ‘' + icd.name + '’', W / 2, 410 + Math.min(2, (function () { c.font = F(16, 'bold'); return gx.wrap(c, inc.passiveDesc || '', 640).length; })()) * 20, { size: 14, align: 'center', weight: 'bold', color: '#9fe08f', stroke: 3 });
    if (!joining) {
      gx.txt(c, '누구를 내보낼까?', W / 2, 460, { size: 16, align: 'center', color: gx.C.dim, weight: 'bold', stroke: 3 });
      p.candidates.forEach(function (cd, i) {
        var d = cd.general, x = W / 2 + (i - (p.candidates.length - 1) / 2) * 300 - 135, y = 472, w = 270, h = 154, hov = Input.hover('pg' + i), yy = y - (hov ? 4 : 0), ocd = d.card ? CARDS.byId[d.card] : null;
        gx.panel(c, x, yy, w, h, { border: hov ? '#ffe08a' : '#b8944a' });
        ART.portrait(c, d.id, x + 56, yy + 62, 40, { t: t });
        gx.txt(c, d.name, x + 108, yy + 44, { size: 19, weight: 'bold', color: gx.C.goldL });
        gx.para(c, d.passiveDesc || '', x + 108, yy + 68, w - 120, { size: 12, color: gx.C.text, lh: 17, max: 3 });
        if (ocd) gx.txt(c, '빠지는 카드: ‘' + ocd.name + '’', x + 16, yy + h - 16, { size: 12.5, weight: 'bold', color: '#ff9a80', maxW: w - 30 });
        Input.zone({ id: 'pg' + i, x: x, y: y, w: w, h: h, tap: function () { answer({ id: d.id }); } });
      });
    } else gx.button(c, { id: 'pgYes', x: W / 2 - 140, y: 470, w: 280, h: 62, label: ui('accept', '받아들이기'), green: true, icon: 'people', tap: function () { answer({ id: inc.id }); } });
    gx.button(c, { id: 'pgNo', x: W / 2 - 140, y: H - 76, w: 280, h: 58, label: ui('decline', '거절'), sub: joining ? '' : '지금 부장들을 그대로 둔다', tap: function () { answer({ id: null }); } });
  }

  /* ---------------------------------------------------------------- 두루마리: 막 열기(영화 자막) · 결전 앞(맞대결) · 그 밖(이야기 창) */
  var ACT_STAGE = { 1: 'sea', 2: 'sea', 3: 'land', 4: 'village', 5: 'sea', 6: 'sea', 7: 'nightsea' };
  function actProps(c, act, t) {
    var i;
    if (act === 1 || act === 5) for (i = 0; i < (act === 5 ? 7 : 5); i++) ART.wship(c, { id: i % 3 ? 'sekibune' : 'kobaya', tags: ['ship'] }, 700 + i * 105 - (t * 0.012) % 60 + (i % 2) * 30, 462 + (i % 3) * 22, 0.36 + (i % 3) * 0.08, { t: t + i * 300 });
    if (act === 2) { ART.panokseon(c, 1060, 500, 0.5, { t: t }); ART.turtleShip(c, 760, 548, 0.85, { t: t }); ART.panokseon(c, 560, 474, 0.34, { t: t + 500 }); }
    if (act === 6) { for (i = 0; i < 3; i++) ART.panokseon(c, 560 + i * 150, 500 + i * 22, 0.32 + i * 0.06, { t: t + i * 400 }); [[1010, 446], [1100, 440], [1190, 450], [1055, 486], [1150, 482], [1235, 490]].forEach(function (q, k) { ART.wship(c, { id: 'sekibune', tags: ['ship'] }, q[0], q[1], 0.28 + (q[1] > 470 ? 0.04 : 0), { t: t + k * 200 }); }); }
    if (act === 7) { glow(c, 980, 470, 240, '255,120,50', 0.35); for (i = 0; i < 4; i++) ART.wship(c, { id: 'sekibune', tags: ['ship'] }, 880 + i * 110, 470 + (i % 2) * 26, 0.42, { t: t + i * 260 }); ART.panokseon(c, 600, 520, 0.5, { t: t }); }
    if (act === 3) { c.fillStyle = '#8a8478'; c.fillRect(760, 404, 470, 50); for (i = 0; i < 12; i++) c.fillRect(762 + i * 40, 390, 24, 16); c.fillStyle = '#3a3a46'; c.beginPath(); c.moveTo(930, 404); c.quadraticCurveTo(944, 396, 950, 384); c.lineTo(1050, 384); c.quadraticCurveTo(1056, 396, 1070, 404); c.closePath(); c.fill(); c.fillStyle = '#7a1c18'; c.fillRect(960, 384, 80, 20);
      for (i = 0; i < 5; i++) ART.person(c, i % 2 ? 'militia' : 'soldier', 560 + i * 70, 560 + (i % 2) * 10, 0.55, { t: t, phase: i }); }
    if (act === 4) { ART.person(c, 'official', 640, 576, 0.75, { t: t }); ART.person(c, 'merchant', 760, 582, 0.7, { t: t, phase: 1 }); }
  }
  function drawActIntro(c, p) {
    var gx = g(), G = Run.state(), t = U.t, act = G.act, sc = ACT_STAGE[act] || 'sea';
    stage(c, sc);
    actProps(c, act, t);
    var land = sc === 'land' || sc === 'village';             // 주장이 서는 언덕·바위 곶
    c.fillStyle = land ? '#4a6a3a' : (sc === 'nightsea' ? '#1e1a24' : '#6b5d50'); c.beginPath(); c.moveTo(0, 548); c.quadraticCurveTo(170, 520, 330, 552); c.quadraticCurveTo(390, 570, 420, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.strokeStyle = land ? '#6a9a4a' : (sc === 'nightsea' ? '#2e3a2c' : '#6a9a4a'); c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 548); c.quadraticCurveTo(170, 520, 330, 552); c.stroke();
    hero(c, G.leader, 200, 570, 1.55, { t: t, ga: 0.4 });
    var tg = c.createLinearGradient(0, 64, 0, 340); tg.addColorStop(0, 'rgba(6,10,20,.55)'); tg.addColorStop(1, 'rgba(6,10,20,0)'); c.fillStyle = tg; c.fillRect(0, 64, W, 276);
    c.fillStyle = '#04060a'; c.fillRect(0, 0, W, 64); c.fillRect(0, 596, W, H - 596);   // 불투명: 하늘의 구름이 비치지 않게
    c.fillStyle = 'rgba(230,184,74,.6)'; c.fillRect(0, 64, W, 2); c.fillRect(0, 594, W, 2);
    var k1 = clamp01(t / 500), k2 = clamp01((t - 250) / 500), slide = (1 - k2) * 30;
    c.save(); c.globalAlpha = k1;
    gx.txt(c, '제' + act + '막', W / 2, 150, { size: 28, align: 'center', weight: 'bold', color: '#ffe08a', stroke: 5, strokeColor: 'rgba(20,10,4,.85)' });
    c.restore();
    c.save(); c.globalAlpha = k2;
    gx.txt(c, String(p.title).replace(/^\s*\S*막\s*·\s*/, ''), W / 2, 236 + slide, { size: 68, align: 'center', base: 'middle', weight: 'bold', color: '#fff8e8', stroke: 10, strokeColor: 'rgba(30,14,6,.9)' });
    if (p.memo) gx.txt(c, p.memo, W / 2, 300 + slide, { size: 18, align: 'center', weight: 'bold', color: '#ffd8a0', stroke: 4 });
    c.restore();
    var lines = p.lines || [], n = Math.min(4, lines.length), lh = n > 3 ? 25 : 30, y0 = 596 + (124 - n * lh) / 2 + lh * 0.65;
    for (var i = 0; i < n; i++) {
      var a = fast() ? 1 : clamp01((t - 700 - i * 900) / 400);
      c.save(); c.globalAlpha = a; gx.txt(c, lines[i], 560, y0 + i * lh, { size: n > 3 ? 16 : 17, align: 'center', weight: 'bold', color: '#fff6e6', maxW: 900 }); c.restore();
    }
    var ba = fast() ? 1 : clamp01((t - 700 - (n - 1) * 900) / 500);
    c.save(); c.globalAlpha = Math.max(0.25, ba);
    gx.button(c, { id: 'scOk', x: 1060, y: 628, w: 190, h: 58, label: ui('continue', '계속'), green: true, key: 'Enter', tap: function () { answer({}); } });
    c.restore();
  }
  function fitTitle(c, s, maxW, big, small) { var gx = g(); c.font = F(big, 'bold'); var w = c.measureText(gx.clean(s)).width; return Math.max(small, Math.min(big, Math.floor(big * maxW / Math.max(1, w)))); }
  function drawBossIntro(c, p) {
    var gx = g(), G = Run.state(), T = X(), t = U.t, fo = bossOf(p.encId), ship = fo && ART.isShip(fo);
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#100c18'); bg.addColorStop(0.55, '#2a1a1c'); bg.addColorStop(1, '#3a1e14');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W / 2, 520); c.scale(1, 0.32); glow(c, 0, 0, 760, '255,110,40', 0.42); c.restore();
    ridge(c, 446, 70, '#1a1218', 'boss' + (p.encId || ''), 34, 540);
    for (var sm = 0; sm < 7; sm++) { var sx = ((hr(sm, 13) * W + t * 0.01 * (sm % 2 ? 1 : -1)) % (W + 300)) - 150; c.fillStyle = 'rgba(40,34,40,.45)'; c.beginPath(); c.ellipse(sx, 360 + hr(sm, 14) * 140, 140 + hr(sm, 15) * 90, 34, 0, 0, 7); c.fill(); }
    if (ship) { var sg = c.createLinearGradient(0, 448, 0, H); sg.addColorStop(0, '#2a2030'); sg.addColorStop(1, '#0a0810'); c.fillStyle = sg; c.fillRect(0, 448, W, H - 448); c.strokeStyle = 'rgba(255,150,90,.18)'; c.lineWidth = 2; for (var wv = 0; wv < 40; wv++) { var wx = hr(wv, 16) * W, wy = 458 + hr(wv, 17) * 250; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + 20 + hr(wv, 18) * 30, wy); c.stroke(); } }
    else { c.fillStyle = '#140e10'; c.fillRect(0, 522, W, H - 522); }
    c.fillStyle = '#1e1618'; c.beginPath(); c.moveTo(0, 514); c.quadraticCurveTo(220, 496, 470, 518); c.lineTo(520, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,150,90,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 514); c.quadraticCurveTo(220, 496, 470, 518); c.stroke();
    embers(c, t, 46);
    var slide = fast() ? 1 : clamp01(t / 520), ease = 1 - Math.pow(1 - slide, 3);
    c.save(); c.translate(-(1 - ease) * 360, 0);
    hero(c, G.leader, 290, 508, 1.6, { t: t, pose: 'attack', rgb: '255,180,110', ga: 0.4 });
    nameTag(c, nameOf(G.leader), 290, 518, { size: 16 });
    c.restore();
    if (fo) {
      c.save(); c.translate((1 - ease) * 360, 0);
      c.save(); c.translate(985, 508); c.scale(1, 0.28); glow(c, 0, 0, 170, '255,80,60', 0.35); c.restore();
      drawFoe(c, fo, 985, ship ? 516 : 508, ship ? 1.75 : 1.45, { t: t });
      nameTag(c, fo.name || '', 985, 526, { size: 16, c1: 'rgba(120,30,24,.96)', c2: 'rgba(60,12,10,.96)', color: '#ffd8c8' });
      c.restore();
    }
    var vk = fast() ? 1 : clamp01((t - 380) / 300), vs = 0.6 + 0.4 * vk + Math.sin(t / 260) * 0.03;
    c.save(); c.globalAlpha = vk; glow(c, W / 2, 330, 120, '255,200,120', 0.45); c.translate(W / 2, 330); c.scale(vs, vs); ART.icon(c, 'swords', 0, 0, 110); c.restore();
    c.save(); c.globalAlpha = slide;
    nameTag(c, '결전', W / 2, 36, { size: 15, c1: 'rgba(150,40,28,.96)', c2: 'rgba(80,16,12,.96)', color: '#fff2d8' });
    var tsz = fitTitle(c, p.title, 980, 58, 34);
    gx.txt(c, p.title, W / 2, 112, { size: tsz, align: 'center', base: 'middle', weight: 'bold', color: '#fff2d8', stroke: 8, strokeColor: '#2a0604' });
    var sub = [p.date && T.date ? T.date(p.date) : '', p.memo || ''].filter(Boolean).join(' · ');
    if (sub) gx.txt(c, sub, W / 2, 160, { size: 18, align: 'center', color: '#ffd8a0', weight: 'bold', stroke: 3 });
    c.font = F(17, 'bold'); var ls = []; (p.lines || []).forEach(function (l) { ls = ls.concat(gx.wrap(c, l, 860)); }); ls = ls.slice(0, 4);
    var bh = ls.length * 26 + 22, by = 636 - bh;
    if (ls.length) { gx.panel(c, W / 2 - 460, by, 920, bh, { r: 12, c1: 'rgba(20,14,16,.88)', c2: 'rgba(10,6,8,.92)', border: 'rgba(255,170,110,.6)', stripe: false }); ls.forEach(function (l, i) { gx.txt(c, l, W / 2, by + 30 + i * 26, { size: 17, align: 'center', weight: 'bold', color: '#fff6e6' }); }); }
    gx.button(c, { id: 'scOk', x: W / 2 - 150, y: 648, w: 300, h: 58, label: '전투 시작!', primary: true, icon: 'swords', key: 'Enter', tap: function () { answer({}); } });
    c.restore();
  }
  var SCROLL_WHO = { thresh4: ['king', 'idle'], thresh7: ['king', 'idle'], thresh10: ['king', 'idle'], edict: ['king', 'idle'], edictFull: ['king', 'idle'], prison: [null, 'down'], prison_none: [null, 'down'],
    chilcheon: [null, 'down'], return_tongjesa: ['yi', 'win'], wonGyun: ['yi', 'down'] };
  function drawStory(c, p) {
    var gx = g(), G = Run.state(), T = X(), who = SCROLL_WHO[p.key] || [null, 'idle'], id = who[0] || G.leader, nd = G.nodeId ? MAPDATA.nodes.byId[G.nodeId] : null;
    Input.zone({ id: 'stNext', x: 0, y: 54, w: W, h: H - 54, tap: function () { if (!revealTap(lens) && U.t > 300) answer({}); } });
    var fit = fitText(c, p.lines, 756, 640 - 138 - 104, [[19, 32, null, 12], [17, 28, null, 10], [15.5, 25, null, 8]]);
    var P = storyFrame(c, id, who[1], id === 'king' ? 'palace' : (p.key === 'chilcheon' ? 'nightsea' : storyStage(G, nd)), 138 + fit.h + 104);   // 칠천량은 밤바다
    ribbon(c, p.title, P.x + P.w / 2, P.y + 44, { size: 26, tone: who[1] === 'down' ? 'red' : 'teal' });
    var memo = p.memo ? (/^\d{4}\./.test(p.memo) && T.date ? T.date(p.memo) : p.memo) : '';
    if (memo) gx.txt(c, memo, P.x + P.w / 2, P.y + 92, { size: 14.5, align: 'center', weight: 'bold', color: '#ffd8a0' });
    var tx = P.x + 50, ty = P.y + 138, tw = P.w - 100, by = P.y + P.h - 84;
    var res = typeText(c, p.lines, tx, ty, tw, { size: fit.size, lh: fit.lh, gap: fit.gap, color: '#fff6e6' }), lens = res.lens;
    hud(c, { deck: true });
    if (!res.done) moreMark(c, P.x + P.w - 40, by + 30);
    else gx.button(c, { id: 'scOk', x: P.x + P.w / 2 - 130, y: by, w: 260, h: 58, label: ui('continue', '계속'), green: true, key: 'Enter', tap: function () { answer({}); } });
    if (U.t > 300 && (Input.key('Enter') || Input.key('Space'))) { if (!revealTap(lens)) answer({}); }
  }
  function drawScroll(c, p) {
    if (p.key === 'bossIntro') { drawBossIntro(c, p); if (U.t > 500 && (Input.key('Enter') || Input.key('Space'))) answer({}); return; }
    if (p.key === 'actIntro') { drawActIntro(c, p); Input.zone({ id: 'aiTap', x: 0, y: 0, w: 1040, h: H, tap: function () { if (U.t > 500) answer({}); } }); if (U.t > 500 && (Input.key('Enter') || Input.key('Space'))) answer({}); return; }
    drawStory(c, p);
  }

  /* ---------------------------------------------------------------- 막 결산 */
  function drawActEnd(c, p) {
    var gx = g(), G = Run.state(), T = X(), s = p.summary, t = U.t;
    backdrop(c, G.act);
    glow(c, W / 2, 300, 500, '255,214,120', 0.16);
    confetti(c, t, 30, 0, W, 54, H - 54);
    hero(c, G.leader, 150, 690, 1.3, { t: t, pose: 'win', ga: 0.5 });
    var deps = G.deputies.slice(); if (G.special) deps.push(G.special);
    deps.slice(0, 2).forEach(function (id, k) { hero(c, id, 1112 + k * 98, 690 - k * 8, 0.95, { t: t, pose: 'win', facing: -1, phase: k + 1 }); });
    hud(c);
    heading(c, p.act + '막 ‘' + s.title + '’ 완료!', 100, 'star', 'gold', 28);
    var dates = s.dates || [];
    if (dates.length && T.date) gx.txt(c, T.date(dates[0]) + (dates.length > 1 && dates[dates.length - 1] !== dates[0] ? ' — ' + T.date(dates[dates.length - 1]) : ''), W / 2, 150, { size: 14, align: 'center', color: '#ffd8a0', weight: 'bold', stroke: 3 });
    var cardsGot = s.gained.cards.map(function (id) { return CARDS.byId[id] ? CARDS.byId[id].name : id; });
    var relN = s.gained.relics.map(function (id) { return GENERALS.relics.byId[id] ? GENERALS.relics.byId[id].name : id; });
    c.font = F(13.5, 'bold'); var nRel = relN.length ? Math.min(2, gx.wrap(c, relN.join(' · '), 340).length) : 0, nCard = Math.min(3, gx.wrap(c, cardsGot.length ? '카드: ' + cardsGot.join(' · ') : '—', 340).length);
    var w = 780, x = (W - w) / 2, y = 166, ly = y + 52, rows = Math.max(1, Math.min(6, s.fights.length)), gy = ly + Math.max(28 + rows * 22 + 30, 180);
    var gainH = 28 + (s.gained.relics.length ? 48 : 0) + nRel * 19 + nCard * 20, chH = 28 + Math.max(1, Math.min(5, s.choices.length)) * 21, h = gy - y + Math.max(gainH, chH) + 16;
    gx.panel(c, x, y, w, h, {});
    var lx = x + 36;
    function head(ic, txt0, hx, hy) { ART.icon(c, ic, hx + 12, hy - 6, 24); gx.txt(c, txt0, hx + 32, hy, { size: 17, weight: 'bold', color: gx.C.goldL }); }
    head('swords', ui('fights', '치른 싸움'), lx, ly);
    s.fights.slice(0, 6).forEach(function (f, i) { var nd = MAPDATA.nodes.byId[f.node]; gx.txt(c, shortName(nd ? nd.name : f.enc) + ' — ' + f.turns + '턴', lx + 6, ly + 28 + i * 22, { size: 14.5, color: gx.C.text, weight: 'bold', maxW: 330 }); });
    if (!s.fights.length) gx.txt(c, '싸움 없이 지나왔다', lx + 6, ly + 28, { size: 14.5, color: gx.C.dim, weight: 'bold' });
    head('star', ui('gained', '얻은 것'), lx, gy);
    s.gained.relics.slice(0, 6).forEach(function (id, i) { relicBadge(c, id, lx + 22 + i * 52, gy + 34, 20); });
    var gy2 = gy + (s.gained.relics.length ? 76 : 28);
    if (nRel) gy2 += gx.para(c, relN.join(' · '), lx + 6, gy2, 340, { size: 13.5, color: gx.C.goldL, lh: 19, max: 2, weight: 'bold' });
    if (cardsGot.length || !nRel) gx.para(c, cardsGot.length ? '카드: ' + cardsGot.join(' · ') : '—', lx + 6, gy2, 340, { size: 13.5, color: gx.C.text, lh: 20, max: 3, weight: 'bold' });
    var rx = x + 420;
    head('eye', ui('suspTrace', '의심 기록'), rx, ly);
    var tr = s.suspTrace.length ? s.suspTrace : [s.suspicion], gw = 320, gh = 104, gx0 = rx + 10, gy0 = ly + 18;
    gx.rr(c, gx0, gy0, gw, gh, 8); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill();
    c.strokeStyle = 'rgba(255,224,138,.25)'; c.lineWidth = 1;
    B.SUSP_THRESH.forEach(function (tt) { var yy = gy0 + gh - tt / 10 * gh; c.beginPath(); c.moveTo(gx0, yy); c.lineTo(gx0 + gw, yy); c.stroke(); gx.txt(c, String(tt), gx0 - 6, yy + 4, { size: 10, align: 'right', color: '#ffb0a0', weight: 'bold' }); });
    c.strokeStyle = '#ff8a6a'; c.lineWidth = 3.5; c.beginPath();
    tr.forEach(function (v, i) { var xx = gx0 + (tr.length > 1 ? i / (tr.length - 1) : 0.5) * gw, yy = gy0 + gh - v / 10 * gh; if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); });
    c.stroke();
    gx.txt(c, '지금 의심 ' + s.suspicion + '/10 · 병력 ' + s.hp + '/' + s.maxHp + ' · 군량 ' + s.ration, gx0, gy0 + gh + 24, { size: 14, color: gx.C.text, weight: 'bold', maxW: gw });
    head('flag', ui('choices', '고른 것'), rx, gy);
    s.choices.slice(0, 5).forEach(function (ch, i) { gx.txt(c, ch.title + ' — ' + ch.choice, rx + 6, gy + 28 + i * 21, { size: 13.5, color: gx.C.text, maxW: 330, weight: 'bold' }); });
    if (!s.choices.length) gx.txt(c, '—', rx + 6, gy + 28, { size: 13.5, color: gx.C.dim, weight: 'bold' });
    var cmp = (s.compare || []).slice(-2);
    cmp.forEach(function (l, i) { gx.txt(c, l, W / 2, y + h + 28 + i * 22, { size: 15, align: 'center', color: '#ffe8c0', weight: 'bold', maxW: w + 40, stroke: 3 }); });
    gx.button(c, { id: 'aeOk', x: W / 2 - 130, y: Math.min(H - 76, y + h + 30 + cmp.length * 22 + 8), w: 260, h: 58, label: ui('continue', '계속'), green: true, tap: function () { answer({}); } });
  }

  /* ---------------------------------------------------------------- 어전회의 (일월오봉도 앞의 임금, 양쪽 대신, 앞에 선 통제사) */
  function quoteOf(s) { var m = /“[^”]+”/.exec(s || ''); return m ? m[0] : s; }
  function drawCouncil(c, p) {
    var gx = g(), T = X(), t = U.t, page = p.page, dismissed = page === 3 && p.verdict && p.verdict.dismissed;
    stage(c, 'palace');
    ART.throne(c, 440, 148, 400, 206, t);
    c.fillStyle = '#5a2418'; gx.rr(c, 500, 346, 280, 22, 4); c.fill(); c.fillStyle = '#7a3a24'; gx.rr(c, 470, 364, 340, 18, 4); c.fill();
    hero(c, 'king', 640, 364, 0.98, { t: t, ga: 0.2 });
    [[330, 432, 'official', 1], [214, 444, 'official2', 1], [950, 432, 'official2', -1], [1066, 444, 'official', -1]].forEach(function (o, i) { ART.person(c, o[2], o[0], o[1], 0.84, { t: t, facing: o[3], phase: i }); });
    hero(c, 'yi', dismissed ? 186 : 166, 700, dismissed ? 1.2 : 1.42, { t: t, pose: dismissed ? 'down' : (page === 3 ? 'win' : 'idle') });
    hud(c);
    heading(c, (T.council && T.council.title) || '어전회의', 96, 'ikseon', 'navy');
    var pages = (T.council && T.council.pages) || ['소식', '변호', '판결'];
    for (var d = 0; d < 3; d++) { var dx = W / 2 - 60 + d * 60; c.beginPath(); c.arc(dx, 136, d + 1 === page ? 7 : 5, 0, 7); c.fillStyle = d + 1 === page ? '#ffe08a' : (d + 1 < page ? 'rgba(255,224,138,.6)' : 'rgba(255,255,255,.25)'); c.fill(); if (d + 1 === page) gx.txt(c, pages[d] || '', dx + 14, 137, { size: 12.5, base: 'middle', weight: 'bold', color: '#ffe08a', stroke: 3 }); }
    if (page !== 2) {
      if (page === 3 && p.verdict) {
        var vt = dismissed ? '파직' : '유임', vc = dismissed ? PAL.red : PAL.green;
        gx.panel(c, W / 2 - 170, 398, 340, 70, { r: 35, c1: vc[0], c2: vc[1], border: '#ffe08a', stripe: false });
        ART.icon(c, dismissed ? 'chain' : 'anchor', W / 2 - 120, 433, 40);
        gx.txt(c, vt + '!', W / 2 + 18, 434, { size: 40, align: 'center', base: 'middle', weight: 'bold', stroke: 6, strokeColor: 'rgba(10,6,4,.85)' });
      }
      Input.zone({ id: 'cnTap', x: 0, y: 54, w: W, h: H - 54, tap: function () { if (!revealTap(lens) && U.t > 300) answer({ next: true }); } });
      var bx = 316, by = page === 3 ? 482 : 470, bw = 940, bh = H - 10 - by;
      gx.panel(c, bx, by, bw, bh, { c1: 'rgba(20,48,56,.95)', c2: 'rgba(8,22,28,.97)' });
      nameTag(c, p.title, bx + 40 + (function () { c.font = F(16, 'bold'); return c.measureText(gx.clean(p.title)).width / 2 + 13; })(), by - 14, { size: 16 });
      if (p.memo && T.date) gx.txt(c, T.date(p.memo), bx + bw - 24, by + 34, { size: 13.5, align: 'right', color: '#ffd8a0', weight: 'bold' });
      var fit = fitText(c, p.lines, bw - 80, bh - 100, [[17.5, 29, null, 6], [16, 26, null, 4], [14.5, 23, null, 3]]);
      var res = typeText(c, p.lines, bx + 40, by + 52, bw - 80, { size: fit.size, lh: fit.lh, gap: fit.gap, color: '#fff6e6' }), lens = res.lens;
      if (!res.done) moreMark(c, bx + bw - 30, by + bh - 26);
      else gx.button(c, { id: 'cnNext', x: bx + bw - 214, y: by + bh - 64, w: 196, h: 52, label: ui('next', '다음'), green: true, tap: function () { answer({ next: true }); } });
      if (U.t > 300 && (Input.key('Enter') || Input.key('Space'))) { if (!revealTap(lens)) answer({ next: true }); }
      return;
    }
    bubble(c, quoteOf(p.lines[0]), 702, 214, { size: 16, maxW: 400, dx: -12 });
    var px = 316, py = 456, pw = 940, ph = H - 8 - py;
    gx.panel(c, px, py, pw, ph, { c1: 'rgba(20,48,56,.95)', c2: 'rgba(8,22,28,.97)' });
    if (p.lines[1]) gx.txt(c, p.lines[1], px + pw / 2, py + 30, { size: 14, align: 'center', weight: 'bold', color: gx.C.dim, maxW: pw - 40 });
    gx.txt(c, '전하의 의심', px + 36, py + 60, { size: 17, weight: 'bold', color: gx.C.goldL });
    gx.txt(c, (T.council && T.council.keepIf) || '의심 6 이하면 유임', px + pw - 230, py + 60, { size: 14, align: 'right', color: '#9fe08f', weight: 'bold' });
    gx.txt(c, (T.council && T.council.dismissIf) || '의심 7 이상이면 파직', px + pw - 30, py + 60, { size: 14, align: 'right', color: '#ff9a7a', weight: 'bold' });
    var cw = 52, cx0 = px + 150;
    for (var i = 0; i < 10; i++) {
      var bx2 = cx0 + i * (cw + 6), fill = i < p.suspicion;
      gx.rr(c, bx2, py + 74, cw, 38, 7); c.fillStyle = fill ? (i >= p.dismissAt - 1 ? '#ff4a3a' : '#d8672a') : 'rgba(0,0,0,.35)'; c.fill();
      c.lineWidth = 1.6; c.strokeStyle = fill ? 'rgba(255,240,200,.8)' : 'rgba(255,224,138,.55)'; c.stroke();
      gx.txt(c, String(i + 1), bx2 + cw / 2, py + 94, { size: 12, align: 'center', base: 'middle', weight: 'bold', color: fill ? '#fff' : gx.C.dim });
    }
    c.fillStyle = '#ffe08a'; c.fillRect(cx0 + (p.dismissAt - 1) * (cw + 6) - 5, py + 68, 4, 50);
    gx.txt(c, String(p.suspicion), px + 80, py + 104, { size: 38, align: 'center', weight: 'bold', color: p.suspicion >= p.dismissAt ? '#ff8d76' : '#9fe08f', stroke: 4 });
    if (U.council === 'remove') {
      gx.txt(c, '거둘 장계 카드를 고르세요', px + pw / 2, py + 136, { size: 15, align: 'center', color: gx.C.goldL, weight: 'bold' });
      var list = p.removeCandidates.map(function (r) { return { card: r.card, up: false, uid: r.uid }; });
      var ccw = 74, cch = 104, gap = 12, x0 = px + pw / 2 - (list.length * ccw + (list.length - 1) * gap) / 2;
      list.forEach(function (it, k) {
        var xx = x0 + k * (ccw + gap), hov = Input.hover('cr' + k); gx.drawCard(c, it.card, it.up, xx, py + 146 - (hov ? 4 : 0), ccw, cch, { glow: hov ? gx.C.goldL : null });
        Input.zone({ id: 'cr' + k, x: xx, y: py + 146, w: ccw, h: cch, tap: function () { U.council = null; answer({ defend: 'removeReport', uid: it.uid }); } });
      });
      gx.button(c, { id: 'crBack', x: px + pw - 180, y: py + ph - 58, w: 160, h: 46, label: ui('back', '뒤로'), icon: 'back', tap: function () { U.council = null; } });
      return;
    }
    var DEF_ICON = { ration: 'rice', removeReport: 'letter', brush: 'scroll' };
    p.defenses.forEach(function (d, k) {
      var bw2 = 290, bx3 = px + 20 + k * (bw2 + 15);
      gx.button(c, { id: 'cd' + d.id, x: bx3, y: py + 120, w: bw2, h: 62, label: d.text, icon: DEF_ICON[d.id], size: 15, sub: d.enabled ? (d.effect + ' · 남은 ' + d.left) : d.reason, enabled: d.enabled, teal: true,
        tap: function () { if (d.id === 'removeReport' && p.removeCandidates.length > 1) U.council = 'remove'; else answer({ defend: d.id, uid: p.removeCandidates[0] ? p.removeCandidates[0].uid : null }); } });
    });
    gx.button(c, { id: 'cnVerdict', x: px + pw / 2 - 160, y: py + ph - 60, w: 320, h: 50, label: ui('verdict', '판결 듣기'), primary: true, icon: 'ikseon', tap: function () { answer({ verdict: true }); } });
  }

  /* ---------------------------------------------------------------- 결말 */
  var SCORE_ICON = [[/병력/, 'heart'], [/신임|의심/, 'eye'], [/덱/, 'scroll'], [/마디/, 'flag'], [/결전|승리|기적|생환/, 'star'], [/칠천량|파직|조령|진주/, 'shield']];
  function scoreIcon(label) { for (var i = 0; i < SCORE_ICON.length; i++) if (SCORE_ICON[i][0].test(label)) return SCORE_ICON[i][1]; return 'coin'; }
  function drawEnding(c, p) {
    var gx = g(), G = Run.state(), t = U.t, won = p.id !== 'nanse', leader = p.leader || (G && G.leader) || 'yi';
    stage(c, won ? 'sea' : 'nightsea');
    if (won) { glow(c, 820, 430, 560, '255,190,110', 0.35); confetti(c, t, 40, 0, W, 0, H); }
    else { c.fillStyle = 'rgba(60,10,8,.35)'; c.fillRect(0, 0, W, H); embers(c, t, 40); }
    var deps = (p.deputies || []).slice(); if (p.special) deps.push(p.special);
    var nd = Math.min(3, deps.length), spots = [[344, 648, 0.92], [432, 622, 0.84], [510, 600, 0.76]], px0 = 470 + Math.max(0, nd - 2) * 72;   // 부장들은 주장 오른쪽에 늘어선다(깃발과 겹치지 않게). 셋이면 창을 오른쪽으로 민다
    deps.slice(0, 3).map(function (id, k) { return [id, spots[k]]; }).reverse().forEach(function (q, k) { hero(c, q[0], q[1][0], q[1][1], q[1][2], { t: t, pose: won ? 'win' : 'down', facing: -1, phase: k + 1, ga: 0.2 }); });
    hero(c, leader, won ? 196 : 212, 650, 1.5, { t: t, pose: won ? (p.id === 'silrok' && leader === 'yi' ? 'idle' : 'win') : 'down', ga: 0.5 });
    var k = clamp01(t / 600);
    c.save(); c.globalAlpha = k; c.translate(px0 + (1260 - px0) / 2, 84); var bs = 0.8 + 0.2 * k; c.scale(bs, bs);
    gx.txt(c, won ? '승리' : '패배', 0, 0, { size: 72, align: 'center', base: 'middle', weight: 'bold', color: won ? '#ffe08a' : '#ff8a7a', stroke: 10, strokeColor: won ? '#4a2a04' : '#2a0604' });
    c.restore();
    var x = px0, w = 1260 - x, L = p.lines || [], cmp = (p.compare || []).slice(-2), lw = w - 350, SZ = [[17, 28, null, 6], [15.5, 25, null, 5], [14, 21, null, 4]], ft = fitText(c, L, lw, 500 - 130 - (cmp.length ? 62 : 20), SZ);
    var nParts = Math.min(12, p.score.parts.length), bot = cmp.length ? 30 + cmp.length * 22 + 14 : 20;
    var y = 136, h = Math.max(300, Math.min(500, Math.max(54 + ft.h, 86 + nParts * 24) + bot + 14));
    gx.panel(c, x, y, w, h, { c1: 'rgba(20,48,56,.95)', c2: 'rgba(8,22,28,.97)' });
    ribbon(c, '결말 · ' + p.title, x + w / 2, y + 2, { size: 20, tone: won ? 'gold' : 'red' });
    c.save(); c.globalAlpha = k;
    var cy = y + h - bot + 8, yy = y + 54, lim = cy - 14;
    c.font = F(ft.size); L.forEach(function (l) {             // 넘치면 남은 줄을 그리지 않는다(아래 비교 줄을 덮지 않게)
      gx.wrap(c, l, lw).forEach(function (s0) { if (yy + ft.lh * 0.3 > lim) return; gx.txt(c, s0, x + 30, yy, { size: ft.size, color: '#fff6e6' }); yy += ft.lh; });
      yy += ft.gap;
    });
    var rx = x + w - 290, total = Math.round(p.score.total * (fast() ? 1 : clamp01((t - 600) / 1400)));
    gx.txt(c, ui('score', '점수'), rx, y + 56, { size: 16, weight: 'bold', color: gx.C.dim });
    gx.txt(c, String(total), rx + 260, y + 60, { size: 34, align: 'right', weight: 'bold', color: '#ffe08a', stroke: 4 });
    p.score.parts.slice(0, 12).forEach(function (q, i) {
      var a = fast() ? 1 : clamp01((t - 700 - i * 120) / 300); c.save(); c.globalAlpha *= a;
      ART.icon(c, scoreIcon(q.label), rx + 9, y + 92 + i * 24, 17);
      gx.txt(c, q.label, rx + 24, y + 98 + i * 24, { size: 14, color: gx.C.text, weight: 'bold', maxW: 180 });
      gx.txt(c, (q.n > 0 ? '+' : '') + q.n, rx + 260, y + 98 + i * 24, { size: 14, color: q.n < 0 ? '#ff9a80' : '#c8ffb0', align: 'right', weight: 'bold' });
      c.restore();
    });
    if (cmp.length) { c.strokeStyle = 'rgba(255,224,138,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 24, cy - 8); c.lineTo(x + w - 24, cy - 8); c.stroke(); }
    cmp.forEach(function (l, i) { gx.txt(c, l, x + w / 2, cy + 16 + i * 22, { size: 13.5, align: 'center', color: '#ffe8c0', maxW: w - 50, weight: 'bold' }); });
    c.restore();
    gx.button(c, { id: 'endOk', x: x + w / 2 - 140, y: Math.min(H - 72, y + h + 22), w: 280, h: 56, label: ui('title', '처음 화면'), green: true, icon: 'flag', tap: function () { answer({}); Main.go('title'); } });
  }

  return { draw: draw, title: title, leaderSelect: leaderSelect, settings: settings, deck: deck, reset: reset,
    debugSet: function (k, v) { U[k] = v; } };                 // QA(사진용): 화면 안 상태(shop·sel·council·par…)를 바로 맞춘다
})();
