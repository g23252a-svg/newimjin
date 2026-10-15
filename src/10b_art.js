/* ===== 10b_art.js — 캐릭터·배·아이콘·카드 그림 (전역 ART). 모든 그림은 코드로 그린다 ===== */
// 조선 장수(투구·상모·두정갑·수염), 의병(갓·흰 도포), 군사(전립), 왜군(진가사·카부토·사시모노), 판옥선·거북선·왜선,
// 그리고 한자 대신 쓰는 아이콘과 카드 그림. 만화풍(굵은 외곽선·단색 면)으로 그린다.
// 이순신은 장군기·큰 상모·장검·호심경으로, 권율은 붉은 주립·흰 도포로 한눈에 갈린다. 임금(익선관)·대신(사모)·장사꾼(패랭이),
// 자세 idle·attack·hurt·win(무기를 들고 깡충)·down(쓰러짐: 감은 눈), 일월오봉도 병풍 ART.throne, 해전의 거룻배(enemy o.naval).
var ART = (function () { 'use strict';

  var OUT = '#1d140d';
  var PI = Math.PI;
  var inPortrait = false;                                        // 초상을 그리는 중이면 상모를 원 안으로 늘어뜨린다

  /* ---------------------------------------------------------------- 도우미 */
  function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, function (x) { return x + x; }); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(h, k) { var c = hex(h); return 'rgb(' + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); }).join(',') + ')'; }
  function ol(c, w) { c.lineWidth = w || 2.6; c.strokeStyle = OUT; c.lineJoin = 'round'; c.lineCap = 'round'; }
  function fs(c, fill, w) { c.fillStyle = fill; c.fill(); ol(c, w); c.stroke(); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, PI * 2); }
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = w + 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }

  /* ================================================================ 사람 */
  var SKIN = '#f1c7a0';
  // 모양 키 — helm: tugu(투구)·cheomju(뾰족 투구)·jurip(붉은 주립)·jeollip(전립)·gat(갓)·paraengi(패랭이)·band(머리띠)·ikseon(익선관)·samo(사모)
  //   plume 상모 색 · plumeBig 큰 상모 · tassel 뒤로 늘어진 상모 · feather 'pheasant'(꿩깃)|'peacock'(공작깃)|'tiger'(흰 호수)
  //   banner 뒷손에 든 장군기 · disc 가슴 호심경 · coat 갑옷 위 도포 · long 발끝까지 오는 옷 · badge 'dragon'(용보)|'square'(흉배)
  //   pack 등짐 · belt 띠 색 · smile 늘 웃는 입 · bg 초상 배경 [안, 밖]
  var CHAR = {
    yi:          { armor: '#b5262c', trim: '#e9b949', cape: '#1d3a6e', helm: 'tugu', plume: '#e3262a', plumeBig: true, flap: '#1d3a6e', beard: 'long', beardCol: '#1a120d', brow: 'stern', weapon: 'longsword', banner: '#c8302a', disc: true, bg: ['#4a7ab8', '#132a4e'] },
    gwon:        { armor: '#2a5ca6', trim: '#ecc45c', coat: '#f3efe4', helm: 'jurip', hat: '#a8262a', feather: 'tiger', beard: 'long', beardCol: '#ece6da', brow: 'calm', weapon: 'sword', old: true, bg: ['#7aa86a', '#22402a'] },
    yi_eokgi:    { armor: '#2b8670', trim: '#e3b752', cape: '#173b33', helm: 'tugu', feather: 'pheasant', flap: '#173b33', beard: 'none', brow: 'stern', weapon: 'bow' },
    kim_simin:   { armor: '#5d3d96', trim: '#e0b048', cape: '#2a1f45', helm: 'cheomju', plume: '#f2f0ea', tassel: true, flap: '#2a1f45', beard: 'mustache', beardCol: '#1a120d', brow: 'calm', weapon: 'bow' },
    jeong_munbu: { armor: '#9a5a22', trim: '#ebba63', cape: '#3a2a1a', helm: 'jeollip', plume: '#cf2b2b', beard: 'short', beardCol: '#1a120d', brow: 'stern', weapon: 'spear' },
    jo_heon:     { armor: '#f1efe6', trim: '#6b5b45', robe: true, helm: 'gat', beard: 'long', beardCol: '#2c2622', brow: 'calm', weapon: 'fan' },
    hwang_jin:   { armor: '#454c5c', trim: '#e3a046', cape: '#7a2a1c', helm: 'tugu', plume: '#1b1b1b', tassel: true, flap: '#7a2a1c', beard: 'short', beardCol: '#1a120d', brow: 'stern', weapon: 'sword' },
    yi_jeongam:  { armor: '#3f7c4b', trim: '#e8d7a8', robe: true, helm: 'gat', beard: 'long', beardCol: '#3b342e', brow: 'calm', weapon: 'sword', old: true },
    soldier:     { armor: '#2d4f8f', trim: '#d8b050', helm: 'jeollip', plume: '#cf2b2b', beard: 'none', brow: 'calm', weapon: 'bow' },
    soldier2:    { armor: '#a8352d', trim: '#d8b050', helm: 'jeollip', plume: '#2b2b2b', beard: 'none', brow: 'stern', weapon: 'spear' },
    militia:     { armor: '#e8e2d2', trim: '#8a7a60', robe: true, helm: 'band', bandCol: '#c22a2a', beard: 'none', brow: 'stern', weapon: 'spear' },
    // 조정 사람들 — 임금(붉은 곤룡포·익선관), 대신(단령·사모·홀), 장사꾼(패랭이·등짐)
    king:        { armor: '#c0262c', trim: '#e6c048', robe: true, long: true, helm: 'ikseon', badge: 'dragon', belt: '#efe6cc', beard: 'short', beardCol: '#1a120d', brow: 'calm', weapon: 'none', bg: ['#d8a84a', '#6a1a14'] },
    official:    { armor: '#2f5f8f', trim: '#e6c048', robe: true, long: true, helm: 'samo', badge: 'square', belt: '#3a2a1a', beard: 'long', beardCol: '#2a2420', brow: 'calm', weapon: 'hol' },
    official2:   { armor: '#3a7a5a', trim: '#e6c048', robe: true, long: true, helm: 'samo', badge: 'square', belt: '#3a2a1a', beard: 'short', beardCol: '#2a2420', brow: 'stern', weapon: 'hol' },
    merchant:    { armor: '#d6c296', trim: '#8a6a40', robe: true, long: true, helm: 'paraengi', pack: '#3a6fb0', belt: '#8a5a2e', beard: 'mustache', beardCol: '#2a2018', brow: 'calm', weapon: 'none', smile: true, bg: ['#e0b060', '#7a4a1a'] }
  };
  var NAME_KR = { yi: '이순신', gwon: '권율', yi_eokgi: '이억기', kim_simin: '김시민', jeong_munbu: '정문부', jo_heon: '조헌', hwang_jin: '황진', yi_jeongam: '이정암', king: '임금', official: '대신', official2: '대신', merchant: '장사꾼' };

  function glow(c, x, y, r, col) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.fill(); }
  function stroke2(c, w, col) { ol(c, w + 3.5); c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
  // 상모·깃털 — (x0,y0) 꼭지에서 뒤(-x)로 흩날린다. 쓰러진 자세면 축 늘어진다
  function plume(c, sp, x0, y0, t, pose) {
    var sw = Math.sin(t / 260) * 4, dn = pose === 'down';
    if (sp.feather === 'pheasant') {                             // 꿩 꽁지깃 두 가닥
      [[-50, -34], [-40, -46]].forEach(function (q, i) {
        var ex = q[0] + sw * 0.6, ey = y0 + (dn ? 18 + i * 6 : q[1]), cx = x0 - 8, cy = y0 + (dn ? 0 : q[1] * 0.75);
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, ex, ey); stroke2(c, 3.6, '#c98a3a');
        c.strokeStyle = '#4a2a14'; c.lineWidth = 1.6;
        for (var k = 1; k < 5; k++) { var u = k / 5, px = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * cx + u * u * ex, py = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * cy + u * u * ey; c.beginPath(); c.moveTo(px - 2, py - 2); c.lineTo(px + 2, py + 2); c.stroke(); }
      });
      return;
    }
    if (!sp.plume) return;
    var big = sp.plumeBig, n = big ? 6 : 4, hang = sp.tassel || dn || inPortrait;
    var cx0 = hang ? -12 : big ? -8 + sw : -12 + sw, cy0 = hang ? -8 : big ? -28 : -17, ex0 = hang ? -24 + sw * 0.3 : big ? -28 + sw : -30 + sw, ey0 = hang ? 30 : big ? -30 : -3;
    if (inPortrait && big) { cx0 = -20; cy0 = -4; ex0 = -34; ey0 = 22; }
    c.strokeStyle = OUT; c.lineWidth = big ? 11 : 7.5; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + cx0, y0 + cy0, x0 + ex0, y0 + ey0); c.stroke();
    c.strokeStyle = sp.plume; c.lineWidth = big ? 6.5 : 5;
    for (var i = 0; i < n; i++) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + cx0 - i * 2, y0 + cy0 + i * 2, x0 + ex0 - i * (hang ? -1.5 : big ? 3 : 2), y0 + ey0 + i * (hang ? 1 : big ? 4 : 3)); c.stroke(); }
    if (big) { c.strokeStyle = 'rgba(255,190,150,.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, y0 - 1); c.quadraticCurveTo(x0 + cx0 + 2, y0 + cy0 - 2, x0 + ex0 + 6, y0 + ey0 - 5); c.stroke(); }
  }
  // 모자·투구 — layer 'back'은 머리보다 먼저(뒤), 'front'는 얼굴 다음에 그린다. 챙은 눈썹(hy-11)보다 위에 둔다
  function drawHelm(c, sp, hy, t, pose, layer) {
    var h = sp.helm, back = layer === 'back', trim = sp.trim || '#e0b44a';
    if (h === 'tugu' || h === 'cheomju') {
      if (back) {                                                // 드림(목 가리개) — 머리 뒤 양옆으로 늘어진 천
        [-1, 1].forEach(function (d) {
          poly(c, [d * 18, hy - 14, d * 33, hy - 10, d * 33, hy + 19, d * 16, hy + 17]); fs(c, sp.flap || sp.armor || '#555', 2.2);
          c.fillStyle = trim; for (var k = 0; k < 3; k++) { ell(c, d * 29, hy - 2 + k * 7, 1.7, 1.7); c.fill(); }
        });
        return;
      }
      if (h === 'tugu') {
        c.beginPath(); c.arc(0, hy - 16, 27, PI, 0); c.lineTo(27, hy - 13); c.lineTo(-27, hy - 13); c.closePath(); fs(c, '#2c2e37');
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 2; c.beginPath(); c.arc(0, hy - 16, 20, PI * 1.15, PI * 1.45); c.stroke();
        poly(c, [-6, hy - 40, 6, hy - 40, 2, hy - 53, -2, hy - 53]); fs(c, trim, 2);
        plume(c, sp, 0, hy - 52, t, pose);
      } else {                                                   // 첨주형: 끝이 뾰족한 투구
        c.beginPath(); c.moveTo(-27, hy - 13); c.quadraticCurveTo(-27, hy - 42, 0, hy - 62); c.quadraticCurveTo(27, hy - 42, 27, hy - 13); c.closePath(); fs(c, '#2c2e37');
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-8, hy - 18); c.quadraticCurveTo(-9, hy - 42, 0, hy - 58); c.moveTo(8, hy - 18); c.quadraticCurveTo(9, hy - 42, 0, hy - 58); c.stroke();
        plume(c, sp, 0, hy - 60, t, pose);
        ell(c, 0, hy - 61, 3.5, 3.5); fs(c, trim, 1.6);
      }
      rr(c, -29, hy - 19, 58, 7, 3); fs(c, trim, 2.2);           // 이마 테
      c.fillStyle = shade(trim, -0.35); for (var b = -2; b <= 2; b++) { ell(c, b * 11, hy - 15.5, 1.4, 1.4); c.fill(); }
    } else if (h === 'jeollip') {
      if (back) return;
      ell(c, 0, hy - 21, 40, 9); fs(c, '#1e1b1a', 2.2);
      c.beginPath(); c.ellipse(0, hy - 25, 21, 17, 0, PI, 0); c.closePath(); fs(c, '#262221', 2.2);
      ell(c, 0, hy - 42, 4, 4); fs(c, trim, 1.6);
      var s2 = Math.sin(t / 280) * 3;
      c.strokeStyle = sp.plume || '#cf2b2b'; c.lineWidth = 4;
      for (var j = 0; j < 4; j++) { c.beginPath(); c.moveTo(0, hy - 42); c.quadraticCurveTo(-8 + s2, hy - 50, -18 + s2 - j * 3, hy - 36 + j * 2); c.stroke(); }
    } else if (h === 'gat' || h === 'paraengi') {
      if (back) return;
      if (h === 'gat') {
        c.beginPath(); c.moveTo(-13, hy - 20); c.lineTo(-11, hy - 46); c.quadraticCurveTo(0, hy - 50, 11, hy - 46); c.lineTo(13, hy - 20); c.closePath(); fs(c, 'rgba(24,22,22,.92)', 2.2);
        ell(c, 0, hy - 20, 44, 7.5); c.fillStyle = 'rgba(24,22,22,.82)'; c.fill(); ol(c, 2.2); c.stroke();
      } else {                                                   // 패랭이 — 대나무 갓에 목화송이
        c.beginPath(); c.moveTo(-15, hy - 20); c.lineTo(-10, hy - 40); c.quadraticCurveTo(0, hy - 44, 10, hy - 40); c.lineTo(15, hy - 20); c.closePath(); fs(c, '#c8a868', 2.2);
        ell(c, 0, hy - 20, 36, 6.5); fs(c, '#b8985a', 2.2);
        c.strokeStyle = 'rgba(90,60,20,.45)'; c.lineWidth = 1.2; for (var q = -2; q <= 2; q++) { c.beginPath(); c.moveTo(q * 4.5, hy - 22); c.lineTo(q * 3.5, hy - 40); c.stroke(); }
        [-1, 1].forEach(function (d) { [[0, 0], [5, -3], [3, 4]].forEach(function (p) { ell(c, d * (13 + p[0]), hy - 31 + p[1], 4, 4); fs(c, '#fbfaf4', 1.4); }); });
      }
      c.strokeStyle = 'rgba(30,25,25,.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-18, hy - 18); c.lineTo(-12, hy + 20); c.moveTo(18, hy - 18); c.lineTo(12, hy + 20); c.stroke();
    } else if (h === 'jurip') {                                  // 주립 — 붉은 갓, 흰 호수, 구슬 끈(패영)
      if (back) return;
      var hat = sp.hat || '#a8262a', fw2 = Math.sin(t / 340) * 2;
      [[8, 0], [12, 4]].forEach(function (q) { c.beginPath(); c.moveTo(q[0], hy - 40); c.quadraticCurveTo(q[0] + 12, hy - 62, q[0] + 2 + q[1] + fw2, hy - 84 + q[1]); stroke2(c, 3.2, '#f6f3ea'); });
      c.beginPath(); c.moveTo(-14, hy - 20); c.lineTo(-12, hy - 44); c.quadraticCurveTo(0, hy - 48, 12, hy - 44); c.lineTo(14, hy - 20); c.closePath(); fs(c, hat, 2.2);
      rr(c, -14, hy - 28, 28, 5, 2); c.fillStyle = shade(hat, -0.35); c.fill();
      ell(c, 0, hy - 20, 42, 7.5); fs(c, shade(hat, -0.08), 2.2);
      ell(c, 0, hy - 48, 3.5, 3.5); fs(c, '#e6c048', 1.6);
      c.fillStyle = '#e8a43a'; for (var bd = 0; bd <= 10; bd++) { var u = bd / 10, bx = (1 - u) * (1 - u) * -17 + u * u * 17, by = (1 - u) * (1 - u) * (hy - 14) + 2 * u * (1 - u) * (hy + 70) + u * u * (hy - 14); if (Math.abs(bx) < 22 && by > hy + 4) { ell(c, bx, by, 2.1, 2.1); c.fill(); } }
    } else if (h === 'ikseon') {                                 // 익선관 — 뒤로 솟은 두 날개
      if (back) { [-1, 1].forEach(function (d) { ell(c, d * 16, hy - 37, 8, 11.5, d * 0.55); fs(c, '#463b5e', 2.2); c.strokeStyle = 'rgba(220,210,250,.32)'; c.lineWidth = 1.1; c.beginPath(); for (var g = -1; g <= 1; g++) { c.moveTo(d * 16 + g * 3.2 - 6 * Math.sin(d * 0.55), hy - 37 - 7); c.lineTo(d * 16 + g * 3.2 + 6 * Math.sin(d * 0.55), hy - 37 + 7); } c.stroke(); }); return; }
      c.beginPath(); c.ellipse(0, hy - 23, 16, 21, 0, PI, 0); c.closePath(); fs(c, '#2e2640', 2.2);        // 뒤쪽 높은 부분
      c.beginPath(); c.ellipse(0, hy - 21, 22, 12, 0, PI, 0); c.closePath(); fs(c, '#382e4e', 2.2);        // 앞쪽 낮은 부분
      rr(c, -23, hy - 24, 46, 11, 4); fs(c, '#2e2640', 2.2);
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-18, hy - 20); c.lineTo(18, hy - 20); c.stroke();
    } else if (h === 'samo') {                                   // 사모 — 옆으로 뻗은 날개
      if (back) { [-1, 1].forEach(function (d) { ell(c, d * 30, hy - 28, 13, 5, -d * 0.14); fs(c, '#1e1c22', 2); }); return; }
      c.beginPath(); c.ellipse(0, hy - 24, 17, 16, 0, PI, 0); c.closePath(); fs(c, '#1e1c22', 2.2);
      rr(c, -22, hy - 24, 44, 10, 4); fs(c, '#1e1c22', 2.2);
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, hy - 24, 12, PI * 1.2, PI * 1.5); c.stroke();
    } else if (h === 'band') {
      if (back) return;
      ell(c, 0, hy - 31, 8, 7); fs(c, '#1d1714', 2);             // 상투
      rr(c, -25, hy - 23, 50, 8, 3); fs(c, sp.bandCol || '#c22a2a', 2);
      c.beginPath(); c.moveTo(-23, hy - 19); c.lineTo(-34, hy - 27); c.moveTo(-23, hy - 19); c.lineTo(-35, hy - 13); c.strokeStyle = sp.bandCol || '#c22a2a'; c.lineWidth = 4; c.stroke();
    }
  }
  // 얼굴 — 눈(ey=hy+1.5)·눈썹(hy-11~-5)·볼·입. pose: idle·attack(외침)·win(^^ 웃음)·hurt(> <)·down(감은 눈·처진 눈썹)
  function drawFace(c, sp, hy, pose, foe) {
    var ey = hy + 1.5, hurt = pose === 'hurt', down = pose === 'down', win = pose === 'win' && !foe, att = pose === 'attack';
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = OUT; c.lineWidth = 2.6;
    [-9, 9].forEach(function (x) {
      var d = x < 0 ? 1 : -1;
      if (hurt) { c.beginPath(); c.moveTo(x - 4 * d, ey - 3.5); c.lineTo(x + 3 * d, ey); c.lineTo(x - 4 * d, ey + 3.5); c.stroke(); }
      else if (down) { c.beginPath(); c.arc(x, ey - 1, 4, 0.12 * PI, 0.88 * PI); c.stroke(); }
      else if (win) { c.lineWidth = 3; c.beginPath(); c.arc(x, ey + 2.5, 4.2, 1.12 * PI, 1.88 * PI); c.stroke(); }
      else { ell(c, x, ey, 3.4, 4.5); c.fillStyle = OUT; c.fill(); ell(c, x + 1, ey - 1.6, 1.2, 1.4); c.fillStyle = '#fff'; c.fill(); }
    });
    // 눈썹 [바깥 y, 안쪽 y] (ey 기준)
    var br = foe ? [-12.5, -6.5] : (down || hurt) ? [-7, -11] : win ? [-10.5, -11] : sp.brow === 'stern' ? [-11.5, -6.5] : [-8.5, -9.5];
    if (att && !foe) br = [-12, -6];
    c.strokeStyle = sp.old ? '#e4ded2' : OUT; c.lineWidth = sp.brow === 'stern' && !foe ? 4.2 : 3.4;
    if (sp.old) { c.save(); ol(c, c.lineWidth + 2); c.beginPath(); c.moveTo(-16, ey + br[0]); c.lineTo(-4.5, ey + br[1]); c.moveTo(16, ey + br[0]); c.lineTo(4.5, ey + br[1]); c.stroke(); c.restore(); c.strokeStyle = '#e4ded2'; c.lineWidth = 3.4; }
    c.beginPath(); c.moveTo(-16, ey + br[0]); c.lineTo(-4.5, ey + br[1]); c.moveTo(16, ey + br[0]); c.lineTo(4.5, ey + br[1]); c.stroke();
    c.fillStyle = 'rgba(230,110,90,.3)'; ell(c, -15, ey + 8, 5, 3); c.fill(); ell(c, 15, ey + 8, 5, 3); c.fill();
    c.strokeStyle = OUT; c.lineWidth = 2.2;
    if (foe) { if (hurt) { ell(c, 0, hy + 14, 4, 3.5); c.fillStyle = OUT; c.fill(); } else { c.beginPath(); c.moveTo(-6, hy + 13); c.lineTo(6, hy + 13); c.stroke(); c.fillStyle = '#fff'; rr(c, -5, hy + 11, 10, 3.5, 1); c.fill(); } }
    else if (win) { c.beginPath(); c.moveTo(-7, hy + 11); c.quadraticCurveTo(0, hy + 23, 7, hy + 11); c.closePath(); fs(c, '#6a1c1c', 2); }
    else if (att) { ell(c, 0, hy + 14.5, 4.6, 4); fs(c, '#6a1c1c', 2); }
    else if (hurt) { ell(c, 0, hy + 14, 3.5, 3); c.fillStyle = OUT; c.fill(); }
    else if (down) { c.beginPath(); c.arc(0, hy + 18, 5, 1.2 * PI, 1.8 * PI); c.stroke(); }
    else if (sp.smile) { c.beginPath(); c.arc(0, hy + 8, 6.5, 0.22 * PI, 0.78 * PI); c.stroke(); }
    else { c.beginPath(); c.moveTo(-4, hy + 12.5); c.quadraticCurveTo(0, hy + 14, 4, hy + 12.5); c.stroke(); }
  }
  function drawBeard(c, sp, hy, t) {
    if (!sp.beard || sp.beard === 'none') return;
    var col = sp.beardCol || '#1a120d';
    if (sp.beard === 'long') {
      c.beginPath(); c.moveTo(-10, hy + 16); c.quadraticCurveTo(0, hy + 46 + Math.sin(t / 500) * 1.5, 10, hy + 16); c.quadraticCurveTo(0, hy + 22, -10, hy + 16); fs(c, col, 2);
    }
    c.strokeStyle = col; c.lineWidth = 3.6; c.beginPath(); c.moveTo(-2, hy + 9); c.quadraticCurveTo(-10, hy + 10, -15, hy + 16); c.moveTo(2, hy + 9); c.quadraticCurveTo(10, hy + 10, 15, hy + 16); c.stroke();
    if (sp.beard === 'short') { c.fillStyle = col; ell(c, 0, hy + 22, 6, 4); c.fill(); }
  }
  // 무기 각도(라디안, 0 = 손에서 위로, +는 앞쪽으로 기움)
  var WANG = {
    sword: { idle: 2.8, attack: 1.0, win: 0.08, down: 2.3, hurt: 2.95 },
    longsword: { idle: 0.12, attack: 1.05, win: 0.05, down: 2.2, hurt: 0.32 },
    bow: { idle: 0, attack: 0, win: -0.25, down: 0.55, hurt: 0.15 },
    spear: { idle: 0.08, attack: 1.2, win: 0.3, down: -0.32, hurt: 0.22 },
    fan: { idle: 0.45, attack: 0.25, win: 0, down: 2.7, hurt: 0.7 },
    hol: { idle: 0.05, attack: 0.3, win: 0.05, down: 0.6, hurt: 0.2 }
  };
  function handPos(sp, pose, bob) {
    var w = sp.weapon;
    if (pose === 'win') return w === 'bow' ? [30, -134] : w === 'spear' ? [30, -116] : [32, -128];
    if (pose === 'down') return [24, -58];
    if (w === 'bow') return [30, -88 + bob];
    if (pose === 'attack') return [34, -110 + bob];
    if (w === 'longsword') return [30, -74 + bob];
    if (w === 'hol') return [14, -82 + bob];
    if (!w || w === 'none') return sp.long ? [10, -74 + bob] : [26, -66 + bob];
    return [28, -70 + bob];
  }
  function heldWeapon(c, sp, pose, hx, hy, t) {
    var w = sp.weapon, A = WANG[w]; if (!A) return;
    var att = pose === 'attack';
    c.save(); c.translate(hx, hy); c.rotate(A[pose] != null ? A[pose] : A.idle);
    if (w === 'sword') {
      poly(c, [-2.6, -6, 2.6, -6, 2.8, -52, 0, -60, -2.4, -52]); fs(c, '#dfe4ea', 2);
      rr(c, -7, -7, 14, 5, 2); fs(c, '#c79a35', 2);
      rr(c, -2.6, -3, 5.2, 14, 2); fs(c, '#5a2a1a', 2);
    } else if (w === 'longsword') {                              // 이순신의 장검 — 두 손 손잡이, 긴 칼날
      poly(c, [-3.4, -8, 3.4, -8, 3.2, -90, 0, -101, -2.4, -92]); fs(c, '#e8edf2', 2.2);
      c.strokeStyle = 'rgba(110,130,150,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0.8, -10); c.lineTo(0.8, -90); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-1.6, -16); c.lineTo(-1.6, -40); c.stroke();
      rr(c, -3.2, -5, 6.4, 24, 2.5); fs(c, '#8a1c1c', 2);
      c.strokeStyle = '#e6c048'; c.lineWidth = 1.1; c.beginPath(); for (var z = 0; z < 5; z++) { c.moveTo(-3, -3 + z * 4.4); c.lineTo(3, -0.8 + z * 4.4); } c.stroke();
      ell(c, 0, 20, 3.8, 3); fs(c, '#e6c048', 1.8);
      ell(c, 0, -7, 8, 3.4); fs(c, '#e6c048', 2);
    } else if (w === 'bow') {
      c.beginPath(); c.arc(-30, 0, 34, -1.1, 1.1); c.lineWidth = 5.5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3.2; c.strokeStyle = '#8b4a1c'; c.stroke();
      var sx = Math.cos(1.1) * 34 - 30, sy = Math.sin(1.1) * 34;
      c.strokeStyle = '#f2ead8'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(sx, -sy); c.lineTo(att ? -40 : sx, 0); c.lineTo(sx, sy); c.stroke();
      rr(c, 1, -5, 6, 10, 2); fs(c, '#7a1c1c', 1.6);
      if (att) { c.strokeStyle = '#6b4a2a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-40, 0); c.lineTo(16, 0); c.stroke(); poly(c, [16, -3, 24, 0, 16, 3]); fs(c, '#cfd4da', 1.5); }
    } else if (w === 'spear') {
      c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 46); c.lineTo(0, -102); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 3.5; c.stroke();
      poly(c, [-4, -100, 4, -100, 0, -124]); fs(c, '#dfe4ea', 2);
      c.fillStyle = '#cf2b2b'; ell(c, 0, -96, 6, 4); c.fill();
    } else if (w === 'fan') {
      var fr = att || pose === 'win' ? 26 : 16;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, fr, -PI * 0.85, -PI * 0.15); c.closePath(); fs(c, '#f4ead2', 2);
      c.strokeStyle = 'rgba(80,50,20,.5)'; c.lineWidth = 1; for (var i = 1; i < 5; i++) { var a = -PI * 0.85 + i * PI * 0.14; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * fr, Math.sin(a) * fr); c.stroke(); }
    } else if (w === 'hol') {                                    // 홀 — 대신이 쥐는 상아 패
      rr(c, -3.5, -28, 7, 36, 2.5); fs(c, '#efe6cc', 2);
    }
    c.restore();
  }
  // 장군기 — 뒷손(bx,by)에 쥔 긴 깃대. 무늬·글자 없는 붉은 깃발에 노란 화염각(불꽃 모양 가장자리)
  function banner(c, sp, bx, by, t, pose) {
    var fw = Math.sin(t / 230) * 4, fw2 = Math.sin(t / 230 + 1.4) * 5, top = -218, H = 46, Wd = 48;
    c.save(); c.translate(bx, by + 60); c.rotate(pose === 'down' ? -0.36 : -0.11);
    c.strokeStyle = OUT; c.lineWidth = 6.5; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -232); c.stroke(); c.strokeStyle = '#7a4a22'; c.lineWidth = 3.6; c.stroke();
    c.fillStyle = '#f2c23a';                                     // 화염각: 깃발 바깥쪽과 아래쪽
    for (var k = 0; k < 4; k++) { var yy = top + 3 + k * 11 + fw2 * 0.3; poly(c, [-Wd + 2 + fw2 * 0.2, yy, -Wd - 9 + fw2 * 0.4, yy + 6, -Wd + 2 + fw2 * 0.2, yy + 11]); fs(c, '#f2c23a', 1.8); }
    for (var m = 0; m < 4; m++) { var xx = -5 - m * 11; poly(c, [xx, top + H - 2 + fw * 0.3, xx - 6, top + H + 9 + fw * 0.4, xx - 11, top + H - 2 + fw * 0.3]); fs(c, '#f2c23a', 1.8); }
    c.beginPath(); c.moveTo(0, top); c.quadraticCurveTo(-Wd / 2, top - 4 + fw, -Wd, top + fw2 * 0.3); c.lineTo(-Wd + 2 + fw2 * 0.2, top + H + fw2 * 0.3); c.quadraticCurveTo(-Wd / 2, top + H - 4 + fw, 0, top + H); c.closePath(); fs(c, sp.banner, 2.4);
    c.strokeStyle = 'rgba(255,220,120,.6)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-5, top + 6); c.quadraticCurveTo(-Wd / 2, top + 2 + fw, -Wd + 7, top + 6 + fw2 * 0.3); c.stroke();
    poly(c, [-4, -230, 4, -230, 0, -248]); fs(c, '#e6c048', 2);     // 깃대 꼭지
    ell(c, 0, -228, 6, 4); fs(c, '#c8302a', 1.6);
    c.restore();
  }
  // 조선 사람 (발 아래 x,y 기준, s=1 이면 키 ~165). o: { t, pose:'idle'|'attack'|'hurt'|'win'|'down', facing, phase, alpha, skin, portrait }
  function person(c, id, x, y, s, o) {
    o = o || {};
    var sp = typeof id === 'string' ? (CHAR[id] || CHAR.soldier) : (id || CHAR.soldier), t = o.t || 0, pose = o.pose || 'idle', f = o.facing || 1;
    var win = pose === 'win', down = pose === 'down', skin = o.skin || SKIN, armor = sp.armor || '#8a7a60', trim = sp.trim || '#d8b050';
    var bob = pose === 'idle' ? Math.sin(t / 420 + (o.phase || 0)) * 1.6 : 0, sleeve = sp.coat || armor, robe = sp.robe || sp.long;
    var prevP = inPortrait; inPortrait = !!o.portrait;
    c.save(); c.translate(x, y); c.scale(f * s, s);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    if (!o.portrait) { ell(c, 0, 2, 36, 7); c.fillStyle = 'rgba(0,0,0,.28)'; c.fill(); }
    if (pose === 'hurt') { c.translate(-6, 0); c.rotate(-0.10); }
    else if (pose === 'attack') { c.translate(8, 0); c.rotate(0.07); }
    else if (win) c.translate(0, -Math.abs(Math.sin(t / 170)) * 9);          // 깡충
    else if (down) { c.translate(-3, 5); c.rotate(0.06); }                    // 축 처진 몸
    var bh = win && !sp.banner ? [-32, -128] : down ? [-27, -60] : [-30, -64 + bob], fh = handPos(sp, pose, bob);
    if (sp.banner) banner(c, sp, bh[0], bh[1], t, pose);
    if (sp.pack) { rr(c, -48, -124 + bob, 34, 46, 13); fs(c, sp.pack); c.fillStyle = 'rgba(255,255,255,.7)'; for (var pd = 0; pd < 4; pd++) { ell(c, -40 + (pd % 2) * 16, -112 + Math.floor(pd / 2) * 18 + bob, 2.5, 2.5); c.fill(); } }
    if (sp.cape) { var cw = Math.sin(t / 300) * 4; poly(c, [-20, -100 + bob, -38 + cw, -46, -30 + cw, -10, 12, -14, 16, -100 + bob]); fs(c, sp.cape); }
    if (sp.long) {                                               // 발끝까지 내려오는 옷(곤룡포·단령·도포)
      ell(c, -12, -3, 10, 5); fs(c, '#2a1d14', 2); ell(c, 13, -3, 10, 5); fs(c, '#2a1d14', 2);
      poly(c, [-24, -74 + bob, 24, -74 + bob, 34, -7, 15, -4, 0, -8, -15, -4, -34, -7]); fs(c, armor);
      c.strokeStyle = shade(armor, -0.25); c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -70 + bob); c.lineTo(-10, -10); c.moveTo(10, -70 + bob); c.lineTo(17, -10); c.stroke();
    } else {
      rr(c, -15, -30, 12, 30, 4); fs(c, '#2a1d14'); rr(c, 3, -30, 12, 30, 4); fs(c, '#2a1d14');
      poly(c, [-24, -74 + bob, 24, -74 + bob, sp.robe ? 32 : 29, -18, 0, -15, sp.robe ? -32 : -29, -18]); fs(c, armor);
    }
    if (!robe) {
      c.fillStyle = trim; for (var r = 0; r < 3; r++) for (var k = -2; k <= 2; k++) { ell(c, k * 9 + (r % 2) * 4.5, -62 + r * 14 + bob * 0.5, 1.9, 1.9); c.fill(); }
      c.strokeStyle = shade(armor, -0.35); c.lineWidth = 2; c.beginPath(); c.moveTo(0, -74 + bob); c.lineTo(0, -20); c.stroke();
    } else if (!sp.long) { c.strokeStyle = shade(armor, -0.25); c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -74 + bob); c.lineTo(4, -18); c.stroke(); }
    if (sp.coat) {                                               // 갑옷 위에 걸친 흰 도포 자락
      [-1, 1].forEach(function (d) { poly(c, [d * 14, -72 + bob, d * 25, -72 + bob, d * 35, -12, d * 18, -16]); fs(c, sp.coat, 2.2); });
    }
    limb(c, -20, -96 + bob, bh[0], bh[1], 10, sleeve);         // 뒤팔
    if (sp.banner || win) { ell(c, bh[0], bh[1], 5.5, 5.5); fs(c, skin, 2); }
    rr(c, -25, -106 + bob, 50, 40, 13); fs(c, armor);
    if (!robe) { c.fillStyle = trim; for (var k2 = -1; k2 <= 1; k2++) { ell(c, k2 * 10, -92 + bob, 1.9, 1.9); c.fill(); ell(c, k2 * 10, -82 + bob, 1.9, 1.9); c.fill(); } }
    if (sp.coat) { [-1, 1].forEach(function (d) { poly(c, [d * 10, -106 + bob, d * 26, -100 + bob, d * 26, -72 + bob, d * 14, -72 + bob]); fs(c, sp.coat, 2.2); }); }
    c.strokeStyle = sp.coat ? '#fbfaf4' : trim; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-12, -105 + bob); c.lineTo(0, -88 + bob); c.lineTo(12, -105 + bob); c.stroke();
    rr(c, -26, -74 + bob, 52, 8, 3); fs(c, sp.belt || (robe ? shade(armor, -0.3) : trim), 2);
    if (sp.belt && sp.long) { c.fillStyle = sp.helm === 'ikseon' ? '#4a8a6a' : '#e6c048'; for (var bj = -2; bj <= 2; bj++) { rr(c, bj * 9 - 2.5, -72.5 + bob, 5, 5, 1); c.fill(); } }
    if (sp.coat) { c.strokeStyle = '#c63a2c'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(8, -70 + bob); c.quadraticCurveTo(12, -54, 9, -38); c.moveTo(11, -70 + bob); c.quadraticCurveTo(17, -56, 16, -42); c.stroke(); }
    if (sp.disc) {                                               // 호심경 — 가슴의 금빛 둥근 거울
      ell(c, 0, -82 + bob, 8.5, 8.5); fs(c, '#e6c048', 2.2); ell(c, 0, -82 + bob, 4.6, 4.6); fs(c, '#fff0b8', 1.4);
      c.fillStyle = 'rgba(255,255,255,.8)'; ell(c, -2.6, -85 + bob, 1.6, 1.2); c.fill();
    }
    if (sp.badge === 'dragon') {                                 // 용보 — 가슴의 둥근 금빛 무늬
      ell(c, 0, -86 + bob, 10.5, 10.5); fs(c, '#e6c048', 2); ell(c, 0, -86 + bob, 7, 7); fs(c, '#a8261e', 1.4);
      c.strokeStyle = '#f2d060'; c.lineWidth = 1.8; c.beginPath(); for (var da = 0; da < PI * 3; da += 0.3) c.lineTo(Math.cos(da) * (1 + da * 0.55), -86 + bob + Math.sin(da) * (1 + da * 0.55)); c.stroke();
    } else if (sp.badge === 'square') {                          // 흉배 — 네모난 학 무늬
      rr(c, -10, -97 + bob, 20, 20, 2); fs(c, '#1d2a5a', 2); c.strokeStyle = '#e6c048'; c.lineWidth = 1.4; rr(c, -8, -95 + bob, 16, 16, 1.5); c.stroke();
      ell(c, 0, -86 + bob, 4.5, 3); c.fillStyle = '#f4f2ea'; c.fill(); c.strokeStyle = '#f4f2ea'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(2, -87 + bob); c.quadraticCurveTo(5, -92 + bob, 2, -93 + bob); c.stroke();
    }
    if (sp.pack) { c.strokeStyle = shade(sp.pack, -0.2); c.lineWidth = 4; c.beginPath(); c.moveTo(-22, -104 + bob); c.lineTo(10, -84 + bob); c.stroke(); ell(c, 11, -84 + bob, 4, 3.5); fs(c, sp.pack, 1.6); }
    var hy = -132 + bob;
    c.save(); c.translate(down ? 4 : 0, down ? hy + 8 : hy); if (down) c.rotate(0.18);
    drawHelm(c, sp, 0, t, pose, 'back');
    ell(c, 0, 0, 25, 24); fs(c, skin);
    ell(c, -25, 2, 4, 6); fs(c, skin, 1.8); ell(c, 25, 2, 4, 6); fs(c, skin, 1.8);
    drawFace(c, sp, 0, pose, false);
    drawBeard(c, sp, 0, t);
    drawHelm(c, sp, 0, t, pose, 'front');
    c.restore();
    heldWeapon(c, sp, pose, fh[0], fh[1], t);                  // 앞팔과 무기
    limb(c, 20, -96 + bob, fh[0], fh[1], 10, sleeve);
    ell(c, fh[0], fh[1], 5.5, 5.5); fs(c, skin, 2);
    c.restore();
    inPortrait = prevP;
  }
  // 왜군 무기(옛 방식: 고정 위치)
  function drawWeapon(c, w, pose, side, t) {
    var att = pose === 'attack';
    if (w === 'sword' || w === 'katana') {
      c.save();
      if (att) { c.translate(36, -112); c.rotate(-0.9); } else { c.translate(32, -68); c.rotate(0.35); }
      poly(c, [-2.5, 0, 2.5, 0, w === 'katana' ? 4 : 2.5, 54, 0, 62, w === 'katana' ? -1 : -2.5, 54]); fs(c, '#dfe4ea', 2);
      rr(c, -7, -3, 14, 5, 2); fs(c, '#c79a35', 2);
      rr(c, -2.5, -16, 5, 14, 2); fs(c, w === 'katana' ? '#2a2a33' : '#5a2a1a', 2);
      c.restore();
    } else if (w === 'bow') {
      c.save(); c.translate(att ? 40 : 34, -86);
      c.beginPath(); c.arc(-8, 0, 34, -1.1, 1.1); c.lineWidth = 5.5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3.2; c.strokeStyle = '#8b4a1c'; c.stroke();
      var sx = Math.cos(1.1) * 34 - 8, sy = Math.sin(1.1) * 34;
      c.strokeStyle = '#f2ead8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx, -sy); c.lineTo(att ? -18 : sx - 2, 0); c.lineTo(sx, sy); c.stroke();
      if (att) { c.strokeStyle = '#6b4a2a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-18, 0); c.lineTo(30, 0); c.stroke(); poly(c, [30, -3, 38, 0, 30, 3]); fs(c, '#cfd4da', 1.5); }
      c.restore();
    } else if (w === 'spear' || w === 'yari') {
      c.save(); c.translate(30, -60); c.rotate(att ? 1.15 : 0.08);
      c.strokeStyle = OUT; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 50); c.lineTo(0, -100); c.stroke();
      c.strokeStyle = '#8a5a2a'; c.lineWidth = 3.5; c.stroke();
      poly(c, [-4, -98, 4, -98, 0, -122]); fs(c, '#dfe4ea', 2);
      if (w === 'spear') { c.fillStyle = '#cf2b2b'; ell(c, 0, -94, 6, 4); c.fill(); }
      c.restore();
    } else if (w === 'gun') {
      c.save(); c.translate(18, -84); c.rotate(att ? -0.05 : 0.25);
      rr(c, -6, -4, 58, 7, 2); fs(c, '#4a3020', 2);
      rr(c, 18, -3, 38, 3.5, 1); c.fillStyle = '#9aa0a8'; c.fill();
      if (att) { c.fillStyle = 'rgba(255,220,120,.95)'; ell(c, 62, -1, 9, 5); c.fill(); }
      c.restore();
    } else if (w === 'fan') {
      c.save(); c.translate(30, att ? -112 : -82);
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, att ? 26 : 16, -PI * 0.85, -PI * 0.15); c.closePath(); fs(c, '#f4ead2', 2);
      c.strokeStyle = 'rgba(80,50,20,.5)'; c.lineWidth = 1; for (var i = 1; i < 5; i++) { var a = -PI * 0.85 + i * PI * 0.14; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * (att ? 26 : 16), Math.sin(a) * (att ? 26 : 16)); c.stroke(); }
      c.restore();
    } else if (w === 'gunbai') {
      c.save(); c.translate(32, att ? -110 : -80); c.rotate(att ? -0.5 : 0.2);
      rr(c, -2, 0, 4, 22, 2); fs(c, '#3a2a1a', 1.6); ell(c, 0, -10, 13, 15); fs(c, '#1d1d24', 2); ell(c, 0, -10, 6, 6); c.fillStyle = '#c9a03a'; c.fill();
      c.restore();
    } else if (w === 'shovel') {
      c.save(); c.translate(28, -70); c.rotate(0.3);
      c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 40); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 3; c.stroke();
      poly(c, [-9, 40, 9, 40, 7, 58, -7, 58]); fs(c, '#9aa0a8', 2);
      c.restore();
    } else if (w === 'flag') {
      c.save(); c.translate(26, -60);
      c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 50); c.lineTo(0, -90); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 3; c.stroke();
      var fw = Math.sin(t / 220) * 4;
      c.beginPath(); c.moveTo(0, -88); c.quadraticCurveTo(20, -84 + fw, 38, -88); c.lineTo(38, -62); c.quadraticCurveTo(20, -58 + fw, 0, -62); c.closePath(); fs(c, '#f2ede0', 2);
      c.restore();
    }
  }

  /* ---------------------------------------------------------------- 왜군 */
  var FOE = {
    ashigaru_spear: { armor: '#6b4a2e', helm: 'jingasa', weapon: 'yari' },
    ashigaru_gun:   { armor: '#3f5a3a', helm: 'jingasa', weapon: 'gun' },
    wa_archer:      { armor: '#5a4a6a', helm: 'jingasa', weapon: 'bow' },
    samurai:        { armor: '#a5312a', helm: 'kabuto', crest: 'crescent', mask: true, weapon: 'katana' },
    mounted_samurai:{ armor: '#8a2a2a', helm: 'kabuto', crest: 'horns', mask: true, weapon: 'yari', horse: '#7a4a2a' },
    wa_captain:     { armor: '#2a2a30', helm: 'kabuto', crest: 'horns', mask: true, weapon: 'katana', banner: true },
    nobushi:        { armor: '#6a6458', helm: 'band', bandCol: '#d8d0c0', weapon: 'katana', rag: true },
    siege_laborer:  { armor: '#8a7a5a', helm: 'band', bandCol: '#f2f2f2', weapon: 'shovel' },
    bamboo_bundle:  { armor: '#4a5a3a', helm: 'jingasa', weapon: 'yari', bamboo: true },
    rebel_monghak:  { armor: '#e8e2d2', helm: 'band', bandCol: '#c22a2a', weapon: 'yari', korean: true },
    wa_scout:       { armor: '#5a5a40', helm: 'jingasa', weapon: 'flag', small: true },
    konishi:        { armor: '#5a2a6a', helm: 'kabuto', crest: 'crescent', mask: false, weapon: 'gunbai', banner: true, boss: true, cape: '#2a1030' },
    hosokawa:       { armor: '#1f2a3a', helm: 'kabuto', crest: 'tall', mask: true, weapon: 'katana', banner: true, boss: true, cape: '#5a1a1a' },
    ukita_w1:       { armor: '#7a3a1a', helm: 'kabuto', crest: 'horns', mask: true, weapon: 'katana', banner: true, boss: true },
    ukita_w2:       { armor: '#2a3a5a', helm: 'kabuto', crest: 'crescent', mask: true, weapon: 'yari', banner: true, boss: true },
    ukita_w3:       { armor: '#8a1a1a', helm: 'kabuto', crest: 'tall', mask: true, weapon: 'gunbai', banner: true, boss: true, cape: '#1a1a1a' },
    kuroda:         { armor: '#1a1a1a', helm: 'kabuto', crest: 'ichinotani', mask: true, weapon: 'yari', boss: true, horse: '#3a2a20', cape: '#6a1a1a' }
  };
  function foeHelm(c, sp, hy, t) {
    hy -= sp.helm === 'band' ? 7 : 5;                            // 눈썹이 보이도록 투구를 조금 올린다
    if (sp.helm === 'jingasa') {
      c.beginPath(); c.moveTo(-38, hy - 6); c.quadraticCurveTo(0, hy - 38, 38, hy - 6); c.quadraticCurveTo(0, hy - 14, -38, hy - 6); fs(c, '#24201c');
      ell(c, 0, hy - 18, 6, 4); c.fillStyle = '#b8352a'; c.fill();
    } else if (sp.helm === 'kabuto') {
      // 시코로(목가리개)
      [-1, 1].forEach(function (d) { for (var i = 0; i < 3; i++) { poly(c, [d * (20 + i * 3), hy - 8 + i * 8, d * (34 + i * 3), hy - 4 + i * 8, d * (34 + i * 3), hy + 3 + i * 8, d * (20 + i * 3), hy - 1 + i * 8]); fs(c, shade(sp.armor, -0.2 + i * 0.05), 1.6); } });
      c.beginPath(); c.arc(0, hy - 8, 27, PI, 0); c.closePath(); fs(c, '#1d1e24');
      c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 1.5; for (var k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 8, hy - 34); c.lineTo(k * 9, hy - 9); c.stroke(); }
      [-1, 1].forEach(function (d) { poly(c, [d * 22, hy - 14, d * 34, hy - 22, d * 32, hy - 8]); fs(c, '#c9a03a', 1.8); });
      c.strokeStyle = OUT; c.lineWidth = 6; c.strokeStyle = '#c9a03a';
      if (sp.crest === 'crescent') { c.beginPath(); c.arc(0, hy - 18, 26, PI * 1.15, PI * 1.85); ol(c, 7); c.stroke(); c.strokeStyle = '#e6c048'; c.lineWidth = 4; c.stroke(); }
      else if (sp.crest === 'horns') { [-1, 1].forEach(function (d) { c.beginPath(); c.moveTo(d * 6, hy - 30); c.quadraticCurveTo(d * 22, hy - 44, d * 30, hy - 66); ol(c, 7); c.stroke(); c.strokeStyle = '#e6c048'; c.lineWidth = 4; c.stroke(); }); }
      else if (sp.crest === 'tall') { poly(c, [-5, hy - 32, 5, hy - 32, 3, hy - 72, -3, hy - 72]); fs(c, '#e6c048', 2); }
      else if (sp.crest === 'ichinotani') { poly(c, [-24, hy - 28, 24, hy - 28, 10, hy - 80, -18, hy - 66]); fs(c, '#141418', 2.4); c.strokeStyle = '#c9a03a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, hy - 40); c.lineTo(8, hy - 70); c.stroke(); }
      ell(c, 0, hy - 30, 5, 5); fs(c, '#e6c048', 1.6);
    } else if (sp.helm === 'band') {
      rr(c, -25, hy - 16, 50, 8, 3); fs(c, sp.bandCol || '#eee', 2);
      ell(c, 0, hy - 27, 8, 7); fs(c, '#1d1714', 2);
    }
  }
  function horse(c, col, t, att) {
    var g = Math.sin(t / 160) * (att ? 6 : 1.5);
    [-30, -14, 18, 32].forEach(function (lx, i) { rr(c, lx - 4, -42, 8, 42 + (i % 2 ? g : -g) * 0.3, 3); fs(c, shade(col, -0.25), 2); });
    ell(c, 0, -52, 46, 20); fs(c, col);
    poly(c, [34, -60, 58, -96, 70, -90, 52, -54]); fs(c, col);
    ell(c, 66, -92, 13, 9, -0.4); fs(c, col);
    c.strokeStyle = '#1a1210'; c.lineWidth = 6; c.beginPath(); c.moveTo(38, -70); c.quadraticCurveTo(48, -98, 60, -104); c.stroke();
    c.beginPath(); c.moveTo(-44, -56); c.quadraticCurveTo(-64, -44 + g, -60, -20); c.stroke();
    rr(c, -16, -72, 34, 10, 4); fs(c, '#a82a22', 2);
  }
  function foe(c, en, x, y, s, o) {
    o = o || {};
    var sp = FOE[en.id] || FOE.ashigaru_spear, t = o.t || 0, pose = o.pose || 'idle';
    var ss = s * (sp.small ? 0.82 : 1) * (sp.boss ? 1.18 : 1);
    var bob = pose === 'idle' ? Math.sin(t / 380 + x * 0.01) * 1.6 : 0;
    c.save(); c.translate(x, y); c.scale(-ss, ss);              // 왜군은 왼쪽(조선군)을 본다
    if (o.alpha != null) c.globalAlpha = o.alpha;
    ell(c, 0, 2, sp.horse ? 60 : 36, 8); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
    if (pose === 'attack') c.translate(14, 0);
    if (pose === 'hurt') { c.translate(-8, 0); c.rotate(-0.12); }
    if (en.id === 'siege_laborer') {                            // 쌓는 흙더미
      var hgt = 16 + (en.buildCount || 0) * 14;
      c.beginPath(); c.moveTo(-70, 0); c.quadraticCurveTo(-48, -hgt * 2, -20, 0); c.closePath(); fs(c, '#7a5a34');
    }
    if (sp.horse) { horse(c, sp.horse, t, pose === 'attack'); c.translate(-2, -58); }
    if (sp.banner) {                                             // 사시모노
      c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-14, -60 + bob); c.lineTo(-14, -190 + bob); c.stroke();
      var w2 = Math.sin(t / 240) * 3;
      poly(c, [-14, -188 + bob, 14 + w2, -186 + bob, 14 + w2, -136 + bob, -14, -138 + bob]); fs(c, sp.boss ? '#f4efe2' : '#f0eadc', 2);
      ell(c, 0 + w2 / 2, -162 + bob, 8, 8); c.fillStyle = sp.boss ? '#1d1d24' : '#b8352a'; c.fill();
    }
    if (sp.cape) { poly(c, [-20, -100 + bob, -36, -46, -28, -12, 12, -14, 16, -100 + bob]); fs(c, sp.cape); }
    if (!sp.horse) { rr(c, -15, -30, 12, 30, 4); fs(c, '#231a14'); rr(c, 3, -30, 12, 30, 4); fs(c, '#231a14'); }
    // 쿠사즈리(늘어진 판)
    for (var i = -2; i <= 1; i++) { rr(c, i * 13, -72 + bob, 12, sp.horse ? 30 : 48, 3); fs(c, i % 2 ? sp.armor : shade(sp.armor, -0.18), 2); }
    if (sp.rag) { c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-20, -30); c.lineTo(-14, -24); c.lineTo(-8, -30); c.lineTo(-2, -24); c.stroke(); }
    limb(c, -20, -96 + bob, -30, -64 + bob, 10, shade(sp.armor, -0.1));
    rr(c, -25, -106 + bob, 50, 40, 12); fs(c, sp.armor);
    c.strokeStyle = shade(sp.armor, -0.4); c.lineWidth = 2; for (var r = 0; r < 3; r++) { c.beginPath(); c.moveTo(-22, -98 + r * 10 + bob); c.lineTo(22, -98 + r * 10 + bob); c.stroke(); }
    if (sp.korean) { c.strokeStyle = '#b8352a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, -104 + bob); c.lineTo(0, -88 + bob); c.lineTo(10, -104 + bob); c.stroke(); }
    var hy = -132 + bob;
    ell(c, 0, hy, 24, 23); fs(c, '#efc49a');
    drawFace(c, { brow: 'stern' }, hy, pose, true);
    if (sp.mask) { c.beginPath(); c.moveTo(-17, hy + 4); c.quadraticCurveTo(0, hy + 30, 17, hy + 4); c.lineTo(12, hy + 2); c.quadraticCurveTo(0, hy + 10, -12, hy + 2); c.closePath(); fs(c, '#9a2a22', 2); c.strokeStyle = '#f2f2f2'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-7, hy + 14); c.lineTo(7, hy + 14); c.stroke(); }
    if (en.id === 'konishi') { c.strokeStyle = '#1a120d'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-2, hy + 8); c.quadraticCurveTo(-10, hy + 10, -14, hy + 16); c.moveTo(2, hy + 8); c.quadraticCurveTo(10, hy + 10, 14, hy + 16); c.stroke(); }
    foeHelm(c, sp, hy, t);
    var wpn = sp.weapon;
    drawWeapon(c, wpn, pose, 1, t);
    var hx = pose === 'attack' ? 34 : 28, hyy = pose === 'attack' ? -110 + bob : -70 + bob;
    if (wpn === 'gun' || wpn === 'bow') { hx = 24; hyy = -84 + bob; }
    limb(c, 20, -96 + bob, hx, hyy, 10, shade(sp.armor, -0.05));
    ell(c, hx, hyy, 5.5, 5.5); fs(c, '#efc49a', 2);
    if (sp.bamboo) {                                             // 죽속 — 앞을 가린 대나무 다발
      for (var b = -3; b <= 3; b++) { rr(c, 30 + b * 0, -110 + Math.abs(b) * 3, 9, 112 - Math.abs(b) * 3, 3); }
      for (var b2 = 0; b2 < 6; b2++) { rr(c, 30 + b2 * 8, -108 + (b2 % 2) * 4, 9, 108, 3); fs(c, b2 % 2 ? '#5f7a3a' : '#6f8a46', 2); }
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(28, -80); c.lineTo(80, -80); c.moveTo(28, -40); c.lineTo(80, -40); c.stroke();
    }
    if (en.id === 'siege_laborer') { ell(c, -26, -70, 14, 10); fs(c, '#9a7a4a', 2); }
    c.restore();
  }

  /* ---------------------------------------------------------------- 배 */
  function waveLine(c, x0, x1, y, t, amp) { c.beginPath(); for (var x = x0; x <= x1; x += 8) c.lineTo(x, y + Math.sin(x / 14 + t / 300) * amp); c.stroke(); }
  // 왜선: sekibune·kobaya·atakebune·flagship (+ 보스 깃발)
  function wship(c, en, x, y, s, o) {
    o = o || {};
    var t = o.t || 0, id = en.id, big = id === 'atakebune' || id === 'enemy_flagship' || en.boss, small = id === 'kobaya';
    var L = small ? 70 : (big ? 120 : 92), sw = Math.sin(t / 500 + x * 0.02) * 2.5;
    c.save(); c.translate(x, y + sw); c.scale(-s, s);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    if (o.pose === 'attack') c.translate(16, 0);
    if (o.pose === 'hurt') c.rotate(-0.05);
    // 선체
    c.beginPath(); c.moveTo(-L, -26); c.lineTo(L * 0.86, -26); c.quadraticCurveTo(L + 10, -30, L + 16, -44); c.lineTo(L * 0.9, 0); c.lineTo(-L * 0.8, 0); c.quadraticCurveTo(-L - 6, -10, -L, -26); c.closePath();
    fs(c, big ? '#2a1e18' : '#4a3020');
    c.strokeStyle = big ? '#c9a03a' : '#7a5a34'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-L + 4, -18); c.lineTo(L * 0.86, -18); c.stroke();
    // 노
    c.strokeStyle = OUT; c.lineWidth = 2.5; var oars = small ? 3 : 6;
    for (var i = 0; i < oars; i++) { var ox = -L * 0.6 + i * (L * 1.3 / oars), sa = Math.sin(t / 200 + i) * 4; c.beginPath(); c.moveTo(ox, -8); c.lineTo(ox - 10 + sa, 16); c.stroke(); }
    if (big) {
      // 아타케 — 성 같은 누각
      rr(c, -L * 0.6, -70, L * 1.2, 44, 3); fs(c, id === 'enemy_flagship' || en.boss ? '#1a1a20' : '#2a2a30');
      for (var g = 0; g < 7; g++) { rr(c, -L * 0.55 + g * (L * 1.1 / 7), -60, 8, 8, 1); c.fillStyle = '#c9a03a'; c.fill(); }
      rr(c, -L * 0.3, -102, L * 0.6, 32, 3); fs(c, '#efe8d8');
      poly(c, [-L * 0.4, -102, 0, -122, L * 0.4, -102]); fs(c, '#1d1d24');
    } else {
      rr(c, -L * 0.35, -50, L * 0.7, 24, 3); fs(c, '#6a4a2a');
      poly(c, [-L * 0.42, -50, 0, -62, L * 0.42, -50]); fs(c, '#2a2a30');
    }
    if (!small) {
      var mh = big ? 140 : 112;
      c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -60); c.lineTo(0, -60 - mh); c.stroke(); c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.stroke();
      var sx = big ? 46 : 36, sy0 = -60 - mh + 8, sh = mh * 0.62;
      rr(c, -sx, sy0, sx * 2, sh, 3); fs(c, '#efe6d2');
      c.strokeStyle = 'rgba(40,30,20,.55)'; c.lineWidth = 1.5; for (var k = 1; k < 5; k++) { c.beginPath(); c.moveTo(-sx, sy0 + k * sh / 5); c.lineTo(sx, sy0 + k * sh / 5); c.stroke(); }
      // 가문 문양
      if (id === 'shimazu_p1' || id === 'shimazu_p2') { ell(c, 0, sy0 + sh / 2, 14, 14); ol(c, 3); c.stroke(); c.beginPath(); c.moveTo(-14, sy0 + sh / 2); c.lineTo(14, sy0 + sh / 2); c.moveTo(0, sy0 + sh / 2 - 14); c.lineTo(0, sy0 + sh / 2 + 14); c.stroke(); }
      else { ell(c, 0, sy0 + sh / 2, big ? 13 : 10, big ? 13 : 10); c.fillStyle = en.boss ? '#1d1d24' : '#b8352a'; c.fill(); }
    }
    // 깃발들
    var fw = Math.sin(t / 220) * 3;
    [[-L * 0.8, '#b8352a'], [L * 0.7, '#f2ede0']].forEach(function (fl) {
      c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(fl[0], -26); c.lineTo(fl[0], -96); c.stroke();
      poly(c, [fl[0], -96, fl[0] + 12 + fw, -94, fl[0] + 12 + fw, -60, fl[0], -62]); fs(c, fl[1], 2);
    });
    // 보스 장수가 뱃전에
    if (en.boss) { c.save(); c.translate(L * 0.55, -26); c.scale(0.55, 0.55); c.scale(-1, 1); foe(c, { id: id === 'todo' ? 'hosokawa' : (id === 'kurushima' ? 'ukita_w1' : 'konishi'), boss: true }, 0, 0, 1, { t: t }); c.restore(); }
    else if (!small) { for (var h = 0; h < 3; h++) { ell(c, -L * 0.2 + h * 18, -30, 7, 7); fs(c, '#efc49a', 1.6); c.beginPath(); c.moveTo(-L * 0.2 + h * 18 - 10, -32); c.quadraticCurveTo(-L * 0.2 + h * 18, -44, -L * 0.2 + h * 18 + 10, -32); fs(c, '#24201c', 1.6); } }
    c.restore();
    c.strokeStyle = 'rgba(220,240,255,.45)'; c.lineWidth = 2; waveLine(c, x - L * s - 10, x + L * s + 10, y + 4, t, 2.5);
  }
  // 조선 배: 판옥선·거북선
  function panokseon(c, x, y, s, o) {
    o = o || {}; var t = o.t || 0, sw = Math.sin(t / 520) * 2.5;
    c.save(); c.translate(x, y + sw); c.scale(s, s);
    c.beginPath(); c.moveTo(-150, -34); c.lineTo(140, -34); c.quadraticCurveTo(160, -36, 164, -50); c.lineTo(132, 0); c.lineTo(-136, 0); c.quadraticCurveTo(-158, -14, -150, -34); c.closePath(); fs(c, '#6a4423');
    c.strokeStyle = '#3a2412'; c.lineWidth = 2; for (var k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-146 + k * 4, -34 + k * 8); c.lineTo(136 - k * 6, -34 + k * 8); c.stroke(); }
    c.strokeStyle = OUT; c.lineWidth = 3;
    for (var i = 0; i < 9; i++) { var ox = -120 + i * 30, sa = Math.sin(t / 220 + i) * 5; c.beginPath(); c.moveTo(ox, -6); c.lineTo(ox - 14 + sa, 20); c.stroke(); }
    // 갑판 위 방패(여장)
    rr(c, -140, -64, 274, 30, 3); fs(c, '#8a5a2e');
    for (var j = 0; j < 12; j++) { rr(c, -134 + j * 22.5, -60, 18, 22, 2); fs(c, j % 2 ? '#c63a2c' : '#2b4f8f', 1.8); }
    // 장대(지휘소)
    rr(c, -40, -104, 90, 40, 3); fs(c, '#9a6a3a');
    poly(c, [-56, -104, 5, -128, 66, -104]); fs(c, '#2a2a30');
    // 돛·깃발
    [[-90, 150], [90, 130]].forEach(function (m) {
      c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(m[0], -64); c.lineTo(m[0], -64 - m[1]); c.stroke(); c.strokeStyle = '#6a4a2a'; c.lineWidth = 3; c.stroke();
      rr(c, m[0] - 34, -60 - m[1] + 10, 68, m[1] * 0.58, 3); fs(c, '#d8b48a');
      c.strokeStyle = 'rgba(80,50,20,.4)'; c.lineWidth = 1.5; for (var k2 = 1; k2 < 5; k2++) { c.beginPath(); c.moveTo(m[0] - 34, -50 - m[1] + k2 * m[1] * 0.116 + 10); c.lineTo(m[0] + 34, -50 - m[1] + k2 * m[1] * 0.116 + 10); c.stroke(); }
    });
    var fw = Math.sin(t / 200) * 4;
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(140, -34); c.lineTo(140, -124); c.stroke();
    poly(c, [140, -124, 168 + fw, -120, 168 + fw, -88, 140, -92]); fs(c, '#c63a2c', 2);
    c.restore();
    c.strokeStyle = 'rgba(220,240,255,.45)'; c.lineWidth = 2; waveLine(c, x - 160 * s, x + 170 * s, y + 4, t, 3);
  }
  function turtleShip(c, x, y, s, o) {
    o = o || {}; var t = o.t || 0, sw = Math.sin(t / 520) * 2;
    c.save(); c.translate(x, y + sw); c.scale(s, s);
    c.beginPath(); c.moveTo(-110, -26); c.lineTo(100, -26); c.lineTo(92, 0); c.lineTo(-100, 0); c.closePath(); fs(c, '#6a4423');
    c.strokeStyle = OUT; c.lineWidth = 3; for (var i = 0; i < 7; i++) { var ox = -84 + i * 26; c.beginPath(); c.moveTo(ox, -4); c.lineTo(ox - 12 + Math.sin(t / 200 + i) * 4, 18); c.stroke(); }
    c.beginPath(); c.moveTo(-104, -26); c.quadraticCurveTo(-90, -80, 0, -84); c.quadraticCurveTo(90, -80, 100, -26); c.closePath(); fs(c, '#3a5a3a');
    c.strokeStyle = '#243a24'; c.lineWidth = 2;
    for (var r = 0; r < 3; r++) for (var k = -4; k <= 4; k++) { var hx = k * 20 + (r % 2) * 10, hy2 = -36 - r * 14; if (Math.abs(hx) > 92 - r * 20) continue; c.beginPath(); for (var a = 0; a < 6; a++) c.lineTo(hx + Math.cos(a * PI / 3) * 8, hy2 + Math.sin(a * PI / 3) * 6); c.closePath(); c.stroke(); }
    c.fillStyle = '#d8d8d8'; for (var sp2 = -5; sp2 <= 5; sp2++) { var px = sp2 * 16, py = -78 + Math.abs(sp2) * Math.abs(sp2) * 1.3; poly(c, [px - 3, py, px + 3, py, px, py - 8]); c.fill(); }
    // 용머리
    poly(c, [96, -40, 128, -60, 140, -50, 124, -34, 100, -28]); fs(c, '#c9a03a');
    ell(c, 126, -52, 3, 3); c.fillStyle = OUT; c.fill();
    if (Math.sin(t / 300) > 0.6) { c.fillStyle = 'rgba(160,160,160,.6)'; ell(c, 148, -52, 9, 6); c.fill(); }
    c.restore();
    c.strokeStyle = 'rgba(220,240,255,.45)'; c.lineWidth = 2; waveLine(c, x - 120 * s, x + 140 * s, y + 4, t, 3);
  }
  // 왜성(공성 수비대): 흰 성벽 + 검은 지붕 + 총안에 사수 얼굴
  function castle(c, en, x, y, s, o) {
    o = o || {}; var t = o.t || 0;
    c.save(); c.translate(x, y); c.scale(s, s);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    poly(c, [-62, 0, 62, 0, 52, -70, -52, -70]); fs(c, '#8a8478');
    c.strokeStyle = 'rgba(40,30,20,.35)'; c.lineWidth = 1.5; for (var r = 1; r < 5; r++) { c.beginPath(); c.moveTo(-62 + r * 2, -r * 14); c.lineTo(62 - r * 2, -r * 14); c.stroke(); }
    rr(c, -46, -112, 92, 42, 2); fs(c, '#f1ece0');
    poly(c, [-58, -112, 0, -138, 58, -112]); fs(c, '#24242c');
    [-28, 0, 28].forEach(function (lx, i) {
      rr(c, lx - 9, -100, 18, 16, 2); fs(c, '#2a2420', 1.6);
      var pk = Math.sin(t / 400 + i * 2) > 0.2;
      if (pk) { ell(c, lx, -96, 6, 6); fs(c, '#efc49a', 1.4); c.beginPath(); c.moveTo(lx - 9, -97); c.quadraticCurveTo(lx, -106, lx + 9, -97); fs(c, '#24201c', 1.4); rr(c, lx - 18, -92, 14, 3, 1); c.fillStyle = '#4a3020'; c.fill(); }
    });
    c.restore();
  }
  function isShip(en) { return (en.tags || []).indexOf('ship') >= 0; }
  // 해전에서 배가 아닌 적(정찰병 등)은 작은 거룻배에 태운다 — 뱃전이 다리를 가린다
  function skiff(c, en, cx, base, s, t, o) {
    var by = base + Math.sin(t / 480 + cx * 0.02) * 2.5;
    foe(c, en, cx + 6 * s, by - 8 * s, s * 0.82, { t: t, alpha: o.alpha, pose: o.pose });
    c.save(); c.translate(cx, by); c.scale(-s, s); if (o.alpha != null) c.globalAlpha = o.alpha;
    c.strokeStyle = OUT; c.lineWidth = 3;
    for (var i = 0; i < 3; i++) { var ox = -34 + i * 30, sa = Math.sin(t / 210 + i) * 4; c.beginPath(); c.moveTo(ox, -10); c.lineTo(ox - 12 + sa, 16); c.stroke(); }
    c.beginPath(); c.moveTo(-58, -30); c.lineTo(52, -30); c.quadraticCurveTo(66, -32, 72, -46); c.lineTo(54, 0); c.lineTo(-48, 0); c.quadraticCurveTo(-62, -10, -58, -30); c.closePath(); fs(c, '#5a3a22');
    c.strokeStyle = '#8a6038'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-54, -21); c.lineTo(56, -21); c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(220,240,255,.45)'; c.lineWidth = 2; waveLine(c, cx - 70 * s, cx + 70 * s, by + 4, t, 2.5);
  }
  // 전투 화면의 적 하나 (배·성·사람). o.naval: 해전이면 배가 아닌 적을 거룻배에 태운다
  function enemy(c, en, cx, base, w, t, o) {
    o = o || {}; var s = (w / 130) * 1.0;
    if (isShip(en)) wship(c, en, cx, base, s * (en.boss ? 1.05 : 0.95), { t: t, alpha: o.alpha, pose: o.pose });
    else if (en.id === 'wajo_garrison') castle(c, en, cx, base, s * 1.05, { t: t, alpha: o.alpha });
    else if (o.naval) skiff(c, en, cx, base, s * 0.95, t, o);
    else foe(c, en, cx, base, s * 0.95, { t: t, alpha: o.alpha, pose: o.pose });
    if (o.flash) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 * (o.flashK || 1); c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(cx, base - 70 * s, 60 * s, 80 * s, 0, 0, PI * 2); c.fill(); c.restore(); }
  }
  function enemyHeight(en) { if (isShip(en)) return en.boss ? 230 : 190; if (en.id === 'wajo_garrison') return 150; return (FOE[en.id] && FOE[en.id].horse) ? 210 : (FOE[en.id] && FOE[en.id].boss ? 200 : 175); }

  /* ================================================================ 아이콘 (한자 대신) */
  function icon(c, name, x, y, sz, col) {
    var s = sz / 32;
    c.save(); c.translate(x, y); c.scale(s, s);
    var w = 2.4;
    switch (name) {
      case 'bow': c.beginPath(); c.arc(-6, 0, 15, -1.15, 1.15); ol(c, 5.5); c.stroke(); c.strokeStyle = col || '#9a5a24'; c.lineWidth = 3; c.stroke();
        c.strokeStyle = '#f2ead8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -13.5); c.lineTo(0, 13.5); c.stroke();
        c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 0); c.lineTo(14, 0); c.stroke(); poly(c, [12, -3.5, 17, 0, 12, 3.5]); fs(c, '#d8dde2', 1.5); break;
      case 'arrow': c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, 6); c.lineTo(12, -4); c.stroke(); poly(c, [10, -8, 17, -6, 13, 0]); fs(c, col || '#d8dde2', 1.6); poly(c, [-14, 6, -18, 2, -12, 3]); fs(c, '#c63a2c', 1.4); break;
      case 'gun': c.save(); c.rotate(-0.35); rr(c, -16, -3, 32, 6, 2); fs(c, col || '#5a3a22', 2); rr(c, -4, -2, 22, 3, 1); c.fillStyle = '#b0b6bc'; c.fill(); rr(c, -16, -1, 10, 9, 2); fs(c, '#5a3a22', 2); c.restore(); break;
      case 'cannon': ell(c, -7, 8, 7, 7); fs(c, '#6a4423', 2); rr(c, -14, -6, 28, 11, 5); fs(c, col || '#4a4e56', 2); ell(c, 14, -0.5, 3, 5); c.fillStyle = OUT; c.fill(); break;
      case 'sword': c.save(); c.rotate(-0.78); poly(c, [-2.5, -16, 2.5, -16, 2.5, 8, 0, 12, -2.5, 8]); fs(c, '#e2e6ea', 2); rr(c, -7, 8, 14, 4, 2); fs(c, '#c9a03a', 2); rr(c, -2, 12, 4, 7, 1.5); fs(c, '#5a2a1a', 1.8); c.restore(); break;
      case 'swords': c.save(); c.rotate(-0.78); poly(c, [-2, -16, 2, -16, 2, 8, -2, 8]); fs(c, '#e2e6ea', 2); rr(c, -6, 8, 12, 3.5, 2); fs(c, '#c9a03a', 1.6); c.restore();
        c.save(); c.rotate(0.78); poly(c, [-2, -16, 2, -16, 2, 8, -2, 8]); fs(c, '#e2e6ea', 2); rr(c, -6, 8, 12, 3.5, 2); fs(c, '#c9a03a', 1.6); c.restore(); break;
      case 'spear': c.save(); c.rotate(0.6); c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(0, 16); c.lineTo(0, -10); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 2.5; c.stroke(); poly(c, [-3.5, -9, 3.5, -9, 0, -19]); fs(c, '#e2e6ea', 1.8); ell(c, 0, -7, 4, 2.5); c.fillStyle = '#c63a2c'; c.fill(); c.restore(); break;
      case 'shield': c.beginPath(); c.moveTo(-12, -13); c.lineTo(12, -13); c.lineTo(12, 1); c.quadraticCurveTo(0, 16, -12, 1); c.closePath(); fs(c, col || '#3a6fb0', w); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, 9); c.moveTo(-8, -3); c.lineTo(8, -3); c.stroke(); break;
      case 'wall': rr(c, -15, -6, 30, 18, 2); fs(c, col || '#c8b48a', w); for (var b = 0; b < 4; b++) { rr(c, -15 + b * 8, -12, 6, 7, 1); fs(c, col || '#c8b48a', 1.8); }
        c.strokeStyle = 'rgba(60,40,20,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-15, 3); c.lineTo(15, 3); c.moveTo(-5, -6); c.lineTo(-5, 3); c.moveTo(6, 3); c.lineTo(6, 12); c.stroke(); break;
      case 'fire': c.beginPath(); c.moveTo(0, 15); c.bezierCurveTo(-16, 12, -12, -4, -4, -15); c.bezierCurveTo(-2, -6, 4, -6, 6, -12); c.bezierCurveTo(16, -2, 14, 12, 0, 15); fs(c, col || '#ef6a28', w); c.beginPath(); c.moveTo(0, 13); c.bezierCurveTo(-7, 10, -6, 2, -1, -4); c.bezierCurveTo(1, 2, 7, 2, 6, 8); c.fillStyle = '#ffd25a'; c.fill(); break;
      case 'bomb': ell(c, 0, 3, 12, 12); fs(c, col || '#3a3a40', w); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(4, -8); c.quadraticCurveTo(10, -16, 14, -14); c.stroke(); ell(c, 14, -14, 3, 3); c.fillStyle = '#ffb030'; c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; ell(c, -4, -2, 3, 3); c.fill(); break;
      case 'cart': rr(c, -14, -4, 24, 10, 2); fs(c, '#8a5a2e', 2); ell(c, -8, 9, 5, 5); fs(c, '#5a3a22', 1.8); ell(c, 6, 9, 5, 5); fs(c, '#5a3a22', 1.8);
        for (var q = 0; q < 4; q++) { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-10 + q * 6, -4); c.lineTo(-4 + q * 6, -15); c.stroke(); ell(c, -4 + q * 6, -15, 2, 2); c.fillStyle = '#ef6a28'; c.fill(); } break;
      case 'ship': c.beginPath(); c.moveTo(-15, 2); c.lineTo(15, 2); c.lineTo(10, 10); c.lineTo(-11, 10); c.closePath(); fs(c, col || '#8a5a2e', 2); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -15); c.stroke(); rr(c, -8, -14, 16, 12, 1.5); fs(c, '#efe2c4', 1.8); break;
      case 'turtle': c.beginPath(); c.moveTo(-15, 4); c.quadraticCurveTo(-12, -12, 2, -12); c.quadraticCurveTo(14, -12, 14, 4); c.closePath(); fs(c, '#3a6a3a', 2); poly(c, [12, -4, 18, -9, 19, -3, 14, 2]); fs(c, '#c9a03a', 1.6); rr(c, -15, 3, 30, 6, 2); fs(c, '#6a4423', 2);
        c.fillStyle = '#e0e0e0'; for (var tt = -2; tt <= 2; tt++) { poly(c, [tt * 5 - 1.5, -10, tt * 5 + 1.5, -10, tt * 5, -14]); c.fill(); } break;
      case 'drum': ell(c, 0, -6, 13, 5); fs(c, '#efe2c4', 2); c.beginPath(); c.moveTo(-13, -6); c.lineTo(-13, 7); c.quadraticCurveTo(0, 14, 13, 7); c.lineTo(13, -6); fs(c, col || '#c63a2c', 2); ell(c, 0, -6, 13, 5); fs(c, '#efe2c4', 2);
        c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-14, -16); c.lineTo(-4, -8); c.moveTo(14, -16); c.lineTo(5, -8); c.stroke(); break;
      case 'scroll': rr(c, -11, -12, 22, 24, 2); fs(c, '#f2e8cf', 2); rr(c, -14, -14, 28, 5, 2.5); fs(c, '#8a5a2e', 1.8); rr(c, -14, 10, 28, 5, 2.5); fs(c, '#8a5a2e', 1.8);
        c.strokeStyle = 'rgba(60,40,20,.6)'; c.lineWidth = 1.4; for (var l = 0; l < 3; l++) { c.beginPath(); c.moveTo(-6, -4 + l * 5); c.lineTo(6, -4 + l * 5); c.stroke(); } break;
      case 'edict': rr(c, -11, -12, 22, 24, 2); fs(c, '#f2d870', 2); rr(c, -14, -14, 28, 5, 2.5); fs(c, '#a52a1e', 1.8); rr(c, -14, 10, 28, 5, 2.5); fs(c, '#a52a1e', 1.8); ell(c, 0, 0, 5, 5); fs(c, '#c63a2c', 1.6); break;
      case 'letter': rr(c, -14, -9, 28, 19, 2); fs(c, '#f2e8cf', 2); c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-14, -9); c.lineTo(0, 3); c.lineTo(14, -9); c.stroke(); ell(c, 0, 3, 4, 4); c.fillStyle = '#c63a2c'; c.fill(); break;
      case 'rice': c.beginPath(); c.moveTo(-11, -6); c.quadraticCurveTo(-14, 14, 0, 14); c.quadraticCurveTo(14, 14, 11, -6); c.closePath(); fs(c, col || '#d8b47a', 2); rr(c, -9, -11, 18, 6, 3); fs(c, '#a8844a', 2);
        c.fillStyle = '#fff6dc'; ell(c, -3, 4, 2, 3); c.fill(); ell(c, 3, 6, 2, 3); c.fill(); break;
      case 'heart': c.beginPath(); c.moveTo(0, 13); c.bezierCurveTo(-18, 2, -12, -14, 0, -6); c.bezierCurveTo(12, -14, 18, 2, 0, 13); fs(c, col || '#d8342a', 2); c.fillStyle = 'rgba(255,255,255,.45)'; ell(c, -6, -4, 3, 2); c.fill(); break;
      case 'eye': c.beginPath(); c.moveTo(-15, 0); c.quadraticCurveTo(0, -13, 15, 0); c.quadraticCurveTo(0, 13, -15, 0); fs(c, '#f2e8cf', 2); ell(c, 0, 0, 6, 6); fs(c, col || '#a52a1e', 1.8); ell(c, 0, 0, 2.5, 2.5); c.fillStyle = OUT; c.fill(); break;
      case 'energy': c.beginPath(); for (var k = 0; k < 10; k++) { var a = -PI / 2 + k * PI / 5, r = k % 2 ? 6 : 14; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); fs(c, col || '#f2c440', 2); break;
      case 'boot': c.beginPath(); c.moveTo(-6, -14); c.lineTo(4, -14); c.lineTo(4, 4); c.lineTo(14, 6); c.lineTo(14, 12); c.lineTo(-6, 12); c.closePath(); fs(c, col || '#5a3a22', 2); break;
      case 'advance': c.beginPath(); c.moveTo(-14, -6); c.lineTo(2, -6); c.lineTo(2, -13); c.lineTo(15, 0); c.lineTo(2, 13); c.lineTo(2, 6); c.lineTo(-14, 6); c.closePath(); fs(c, col || '#e0603a', 2); break;
      case 'back': c.beginPath(); c.moveTo(14, -6); c.lineTo(-2, -6); c.lineTo(-2, -13); c.lineTo(-15, 0); c.lineTo(-2, 13); c.lineTo(-2, 6); c.lineTo(14, 6); c.closePath(); fs(c, col || '#4a9ad8', 2); break;
      case 'hourglass': poly(c, [-10, -14, 10, -14, 2, 0, 10, 14, -10, 14, -2, 0]); fs(c, '#efe2c4', 2); poly(c, [-6, 10, 6, 10, 0, 4]); c.fillStyle = '#d8a84a'; c.fill(); rr(c, -12, -16, 24, 4, 2); fs(c, '#8a5a2e', 1.6); rr(c, -12, 12, 24, 4, 2); fs(c, '#8a5a2e', 1.6); break;
      case 'flag': c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 15); c.lineTo(-10, -15); c.stroke(); poly(c, [-10, -15, 14, -11, 8, -4, 14, 3, -10, 1]); fs(c, col || '#c63a2c', 2); break;
      case 'plus': rr(c, -4, -13, 8, 26, 2); fs(c, col || '#4aa84a', 2); rr(c, -13, -4, 26, 8, 2); fs(c, col || '#4aa84a', 2); c.fillStyle = col || '#4aa84a'; c.fillRect(-2.6, -2.6, 5.2, 5.2); break;
      case 'mound': c.beginPath(); c.moveTo(-15, 10); c.quadraticCurveTo(0, -18, 15, 10); c.closePath(); fs(c, '#8a6a3a', 2); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(6, -12); c.lineTo(12, 4); c.stroke(); break;
      case 'run': ell(c, 4, -10, 4.5, 4.5); fs(c, '#efc49a', 1.6); c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(2, -5); c.lineTo(-2, 5); c.lineTo(-10, 12); c.moveTo(-2, 5); c.lineTo(6, 12); c.moveTo(1, -2); c.lineTo(-8, -4); c.moveTo(1, -2); c.lineTo(10, 0); c.stroke(); break;
      case 'zzz':                                                  // 기절: 어지러운 소용돌이와 작은 별
        c.beginPath(); for (var za = 0; za < PI * 4.2; za += 0.25) { var zr = 1 + za * 0.95; c.lineTo(Math.cos(za) * zr, Math.sin(za) * zr * 0.72 + 2); } stroke2(c, 2.4, col || '#9ab8e8');
        [[11, -11, 5], [-12, -9, 3.6]].forEach(function (p) { c.beginPath(); for (var k4 = 0; k4 < 10; k4++) { var a4 = -PI / 2 + k4 * PI / 5, r4 = k4 % 2 ? p[2] * 0.45 : p[2]; c.lineTo(p[0] + Math.cos(a4) * r4, p[1] + Math.sin(a4) * r4); } c.closePath(); fs(c, '#ffd84a', 1.6); }); break;
      case 'skull': ell(c, 0, -2, 12, 11); fs(c, '#efe8d8', 2); rr(c, -6, 6, 12, 7, 2); fs(c, '#efe8d8', 1.8); ell(c, -4.5, -2, 3, 3.5); c.fillStyle = OUT; c.fill(); ell(c, 4.5, -2, 3, 3.5); c.fill(); break;
      case 'crown':                                                // (옛 이름) 서양 왕관 대신 익선관을 그린다
      case 'ikseon':                                               // 익선관 — 임금의 모자, 뒤로 솟은 두 날개
        [-1, 1].forEach(function (d) { ell(c, d * 8.5, -8, 6.5, 8.5, d * 0.36); fs(c, '#5a4a78', 2); c.strokeStyle = 'rgba(230,220,255,.35)'; c.lineWidth = 1.2; ell(c, d * 8.5, -8.5, 3.4, 5, d * 0.36); c.stroke(); });
        c.beginPath(); c.ellipse(0, 4, 10.5, 15, 0, PI, 0); c.closePath(); fs(c, col || '#3d3352', 2);
        c.beginPath(); c.ellipse(0, 6, 14, 8, 0, PI, 0); c.closePath(); fs(c, '#4a3e62', 2);
        rr(c, -15, 4, 30, 9, 3.5); fs(c, col || '#3d3352', 2);
        c.strokeStyle = '#e6c048'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 7); c.lineTo(12, 7); c.stroke(); break;
      case 'palace':                                               // 처마 끝이 들린 기와지붕과 붉은 기둥
        rr(c, -15, 10, 30, 4, 1); fs(c, '#a8a090', 1.8);
        rr(c, -11, -1, 22, 12, 1); fs(c, '#efe4c8', 1.8); rr(c, -11, -1, 4, 12, 1); fs(c, '#c63a2c', 1.6); rr(c, 7, -1, 4, 12, 1); fs(c, '#c63a2c', 1.6); rr(c, -3, 3, 6, 8, 1); fs(c, '#6a3a1a', 1.4);
        rr(c, -13, -3, 26, 3, 1); fs(c, '#2f8a7a', 1.4);
        c.beginPath(); c.moveTo(-18, -8); c.quadraticCurveTo(-13, -3, -8, -3); c.lineTo(8, -3); c.quadraticCurveTo(13, -3, 18, -8); c.lineTo(10, -14); c.lineTo(-10, -14); c.closePath(); fs(c, col || '#34343e', 2);
        rr(c, -11, -16, 22, 3, 1.5); fs(c, '#4a4a56', 1.6); break;
      case 'tent': poly(c, [-15, 12, 0, -14, 15, 12]); fs(c, col || '#d8c08a', 2); poly(c, [-3, 12, 0, 2, 3, 12]); c.fillStyle = OUT; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, -18); c.stroke(); break;
      case 'campfire': c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-12, 12); c.lineTo(10, 6); c.moveTo(12, 12); c.lineTo(-10, 6); c.stroke(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 2.5; c.stroke(); c.save(); c.translate(0, -2); c.scale(0.7, 0.7); icon(c, 'fire', 0, 0, 32); c.restore(); break;
      case 'coin': ell(c, 0, 0, 13, 13); fs(c, col || '#e6c048', 2); rr(c, -4, -4, 8, 8, 1); c.fillStyle = OUT; c.fill(); break;
      case 'pouch':                                                // 엽전 주머니(복주머니) — 장터
        c.beginPath(); c.moveTo(-6, -6); c.quadraticCurveTo(-17, -2, -15, 7); c.quadraticCurveTo(-13, 15, 0, 15); c.quadraticCurveTo(13, 15, 15, 7); c.quadraticCurveTo(17, -2, 6, -6); c.closePath(); fs(c, col || '#2f5fa8', 2.2);
        c.beginPath(); c.moveTo(-6, -6); c.quadraticCurveTo(-11, -9, -9, -13); c.quadraticCurveTo(-5, -11, -3, -14); c.quadraticCurveTo(0, -11, 3, -14); c.quadraticCurveTo(5, -11, 9, -13); c.quadraticCurveTo(11, -9, 6, -6); c.closePath(); fs(c, col || '#2f5fa8', 2);
        c.fillStyle = 'rgba(255,255,255,.22)'; ell(c, -8, 3, 2.6, 5, 0.3); c.fill();
        rr(c, -8, -8, 16, 4, 2); fs(c, '#c63a2c', 1.6);
        c.strokeStyle = OUT; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-1, -6); c.lineTo(-3, 2); c.moveTo(1, -6); c.lineTo(3, 2); c.stroke(); c.strokeStyle = '#c63a2c'; c.lineWidth = 1.6; c.stroke();
        ell(c, 0, 7, 5.5, 5.5); fs(c, '#e6c048', 1.8); rr(c, -1.8, 5.2, 3.6, 3.6, 0.5); c.fillStyle = OUT; c.fill(); break;
      case 'lantern':                                              // 청사초롱 — 위는 푸르고 아래는 붉은 비단 등
        c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -17); c.lineTo(0, -12); c.stroke();
        rr(c, -10, -11, 20, 22, 6); fs(c, '#c63a2c', 2); c.save(); rr(c, -10, -11, 20, 22, 6); c.clip(); c.fillStyle = col || '#2f5fa8'; c.fillRect(-10, -11, 20, 8); c.restore(); rr(c, -10, -11, 20, 22, 6); ol(c, 2); c.stroke();
        rr(c, -7, -14, 14, 3.5, 1); fs(c, '#e6c048', 1.4); rr(c, -7, 10.5, 14, 3.5, 1); fs(c, '#e6c048', 1.4);
        c.fillStyle = 'rgba(255,230,150,.5)'; ell(c, -3, 2, 2.5, 5); c.fill(); break;
      case 'anchor': c.strokeStyle = OUT; c.lineWidth = 4.5; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 12); c.moveTo(-12, 4); c.quadraticCurveTo(0, 18, 12, 4); c.moveTo(-7, -4); c.lineTo(7, -4); c.stroke(); c.strokeStyle = col || '#3a6fb0'; c.lineWidth = 2.5; c.stroke(); ell(c, 0, -13, 4, 4); fs(c, col || '#3a6fb0', 2); break;
      case 'star': c.beginPath(); for (var k3 = 0; k3 < 10; k3++) { var a3 = -PI / 2 + k3 * PI / 5, r3 = k3 % 2 ? 6.5 : 15; c.lineTo(Math.cos(a3) * r3, Math.sin(a3) * r3); } c.closePath(); fs(c, col || '#a85ad8', 2); break;
      case 'helm': c.beginPath(); c.arc(0, 2, 13, PI, 0); c.closePath(); fs(c, '#2a2a32', 2); c.beginPath(); c.moveTo(-4, -9); c.quadraticCurveTo(-12, -16, -15, -22); c.moveTo(4, -9); c.quadraticCurveTo(12, -16, 15, -22); ol(c, 4.5); c.stroke(); c.strokeStyle = '#e6c048'; c.lineWidth = 2.5; c.stroke(); rr(c, -15, 1, 30, 4, 2); fs(c, col || '#c63a2c', 1.6); break;
      case 'horse': ell(c, -2, 2, 12, 7); fs(c, col || '#8a5a2e', 2); poly(c, [7, -2, 13, -13, 17, -11, 11, 2]); fs(c, col || '#8a5a2e', 2); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-10, 8); c.lineTo(-11, 14); c.moveTo(-3, 9); c.lineTo(-3, 15); c.moveTo(4, 8); c.lineTo(5, 14); c.stroke(); break;
      case 'people': [[-7, '#c63a2c'], [7, '#3a6fb0'], [0, '#e8e2d2']].forEach(function (p) { ell(c, p[0], -5, 5, 5); fs(c, '#efc49a', 1.6); c.beginPath(); c.moveTo(p[0] - 7, 12); c.quadraticCurveTo(p[0], -2, p[0] + 7, 12); fs(c, p[1], 1.8); }); break;
      case 'fan': c.beginPath(); c.moveTo(0, 12); c.arc(0, 12, 22, -PI * 0.8, -PI * 0.2); c.closePath(); fs(c, col || '#f2e8cf', 2); break;
      case 'well': rr(c, -12, -2, 24, 14, 2); fs(c, '#9a9488', 2); c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-10, -2); c.lineTo(-10, -14); c.lineTo(10, -14); c.lineTo(10, -2); c.stroke(); ell(c, 0, -2, 10, 3); c.fillStyle = '#3a6fb0'; c.fill(); break;
      case 'wave': c.strokeStyle = OUT; c.lineWidth = 4.5; for (var wv = 0; wv < 2; wv++) { c.beginPath(); for (var xx = -15; xx <= 15; xx += 3) c.lineTo(xx, -3 + wv * 9 + Math.sin(xx / 4) * 3); c.stroke(); } c.strokeStyle = col || '#4a9ad8'; c.lineWidth = 2.5; for (var wv2 = 0; wv2 < 2; wv2++) { c.beginPath(); for (var x2 = -15; x2 <= 15; x2 += 3) c.lineTo(x2, -3 + wv2 * 9 + Math.sin(x2 / 4) * 3); c.stroke(); } break;
      case 'chain': [-7, 7].forEach(function (cx2) { ell(c, cx2, 0, 8, 5); ol(c, 5); c.stroke(); c.strokeStyle = col || '#9aa0a8'; c.lineWidth = 3; c.stroke(); }); break;
      case 'horn': c.beginPath(); c.moveTo(-14, -3); c.quadraticCurveTo(4, -6, 14, -12); c.lineTo(14, 10); c.quadraticCurveTo(4, 4, -14, 3); c.closePath(); fs(c, col || '#c9a03a', 2); break;
      case 'smoke': c.fillStyle = col || 'rgba(200,200,200,.9)'; [[-6, 4, 7], [4, -2, 8], [10, 6, 6]].forEach(function (p) { ell(c, p[0], p[1], p[2], p[2]); c.fill(); }); break;
      case 'mask': c.beginPath(); c.moveTo(-12, -10); c.quadraticCurveTo(0, -14, 12, -10); c.quadraticCurveTo(12, 12, 0, 14); c.quadraticCurveTo(-12, 12, -12, -10); fs(c, col || '#efe8d8', 2); ell(c, -5, -3, 3, 2); c.fillStyle = OUT; c.fill(); ell(c, 5, -3, 3, 2); c.fill(); break;
      case 'hand': c.beginPath(); c.moveTo(-12, 4); c.lineTo(-4, -6); c.lineTo(6, -6); c.lineTo(14, 2); c.lineTo(6, 10); c.lineTo(-6, 10); c.closePath(); fs(c, '#efc49a', 2); break;
      case 'mountain': poly(c, [-16, 12, -4, -10, 2, -2, 8, -12, 16, 12]); fs(c, col || '#6a7a5a', 2); poly(c, [-7, -4, -4, -10, -1, -4]); c.fillStyle = '#fff'; c.fill(); break;
      case 'ming': rr(c, -10, -14, 3, 28, 1); fs(c, '#6a4a2a', 1.5); poly(c, [-7, -14, 15, -14, 15, 4, -7, 4]); fs(c, col || '#e6c048', 2); c.strokeStyle = '#c63a2c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-7, -14); c.lineTo(15, -14); c.moveTo(-7, 4); c.lineTo(15, 4); c.stroke(); break;
      default: ell(c, 0, 0, 12, 12); fs(c, col || '#888', 2);
    }
    c.restore();
  }

  /* ================================================================ 카드 그림 */
  var ART_BY_ID = {
    bowstring: ['bow'], pyeonjeon: ['bow', 'arrow'], arrow_rain: ['arrow', 'arrow', 'arrow'], archer_ambush: ['bow', 'mountain'], ichi_bow: ['bow', 'mountain'], fire_arrow: ['arrow', 'fire'], ambush_fire: ['bow', 'mountain'], volley: ['bow', 'bow', 'bow'],
    seungja: ['gun'], cheonja: ['cannon'], hyeonja: ['cannon', 'wall'], daejanggun: ['cannon', 'arrow'], cannon_volley: ['cannon', 'cannon', 'fire'], rolling_fire: ['cannon', 'bow'], nambyeong_cannon: ['cannon', 'ming'],
    folangji: ['cannon', 'ming'], pyongyang_bombard: ['cannon', 'fire', 'ming'], chen_lin_bombard: ['cannon', 'ship', 'ming'], jochong: ['gun', 'smoke'],
    hwando: ['sword'], whip: ['sword', 'horse'], gate_sally: ['sword', 'wall'], pajin: ['swords', 'shield'], spear_wall: ['spear', 'shield'], pike_square: ['spear', 'spear', 'shield'],
    langseon: ['spear', 'ming'], bamboo_spear: ['spear', 'people'], shield_wall: ['shield'], iron_wall: ['shield', 'chain'], flagship: ['ship', 'shield'], panok_turn: ['ship', 'back'],
    level_ground: ['shield', 'flag'], not_one_ship: ['ship', 'heart'], ming_navy_square: ['ship', 'shield', 'ming'], mountain_fort: ['wall', 'mountain'], repair_parapet: ['wall', 'plus'],
    ongseong: ['wall', 'wall'], yeonan_fort: ['wall', 'flag'], wall_rally: ['wall', 'drum'], counter_mound: ['mound', 'back'], die_standing: ['wall', 'swords'],
    hwacha: ['cart'], hwacha_volley: ['cart', 'cart', 'fire'], jincheonroe: ['bomb'], turtle_ship: ['turtle'], crane_wing: ['ship', 'ship', 'ship'], retreat_fire: ['ship', 'arrow', 'back'],
    lure: ['ship', 'back'], danghangpo_lure: ['ship', 'back', 'fire'], cavalry_charge: ['horse', 'advance'], li_cavalry: ['horse', 'ming'], bukgwan_cavalry: ['horse', 'mountain'], deng_zilong: ['horse', 'ship', 'ming'],
    war_drum: ['drum'], geumsan_drum: ['drum', 'people'], resolve: ['drum', 'fire'], desperate_call: ['letter', 'fire'], dokjeon: ['drum', 'flag'],
    report: ['letter'], memorial: ['scroll', 'letter'], nanjung_diary: ['scroll'], request_troops: ['letter', 'ming'], manifesto: ['scroll', 'people'], beacon: ['fire', 'mountain'],
    edict_advance: ['edict', 'advance'], edict_blame: ['edict'], edict_arrest: ['edict', 'chain'], edict_envy: ['edict', 'eye'],
    militia: ['people'], monk_soldiers: ['people', 'shield'], monk_rally: ['people', 'heart'], people_stones: ['people', 'mound'], throw_stone: ['mound'], red_robe: ['people', 'fire'],
    uiryeong_rising: ['people', 'flag'], jeongam_ambush: ['people', 'wave'], mountain_raid: ['people', 'mountain'], seven_hundred: ['people', 'swords'],
    retreat_horn: ['horn', 'back'], scout: ['eye'], scout_boat: ['ship', 'eye'], counter_spy: ['mask'], parley: ['hand'], sema: ['horse', 'rice'], scarecrow: ['people', 'drum'],
    discipline: ['flag', 'scroll'], regroup: ['flag', 'back'], sinsang_pilbeol: ['scroll', 'sword'], castle_well: ['well'], scorched_earth: ['fire', 'rice'], baesujin: ['wave', 'swords'],
    rowers: ['ship', 'energy'], twelve_ships: ['ship', 'ship'], pilsa_jeuksaeng: ['sword', 'heart'], jeolla_right: ['ship', 'bow'], hide: ['wall', 'shield'], boiling_water: ['fire', 'wall'],
    samsu: ['gun', 'bow', 'spear'], ash_bag: ['smoke'], level: ['shield']
  };
  var TYPE_BG = { atk: ['#f4b48e', '#c9583e'], def: ['#a8d0e8', '#3f7cb0'], tac: ['#d4c2ec', '#7a5ab0'], rep: ['#f2dfa0', '#c79a35'], edict: ['#4a3a34', '#1a1412'] };
  function cardArt(c, card, x, y, w, h, t) {
    var bg = TYPE_BG[card.type] || TYPE_BG.tac;
    c.save();
    rr(c, x, y, w, h, 5); c.clip();
    var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    c.fillStyle = g; c.fillRect(x, y, w, h);
    glow(c, x + w / 2, y + h * 0.55, Math.max(w, h) * 0.55, 'rgba(255,255,255,.38)');   // 은은한 빛(방사형 빛줄기는 쓰지 않는다)
    var tag0 = (card.tags || [])[0];
    var list = ART_BY_ID[card.id] || (card.type === 'edict' ? ['edict'] : card.type === 'rep' ? ['letter'] : tag0 === 'shot' ? ['bow'] : tag0 === 'melee' ? ['sword'] : tag0 === 'charge' ? ['horse'] : tag0 === 'fire' ? ['fire'] : card.type === 'def' ? ['shield'] : ['scroll']);
    var n = list.length, big = Math.min(w, h) * (n === 1 ? 0.78 : (n === 2 ? 0.62 : 0.52));
    list.forEach(function (nm, k) {
      var ox = n === 1 ? 0 : (k - (n - 1) / 2) * (w * 0.3), oy = n === 3 && k === 1 ? -h * 0.12 : (n > 1 ? h * 0.04 : 0);
      icon(c, nm, x + w / 2 + ox, y + h / 2 + oy, k === 0 ? big : big * 0.82);
    });
    c.restore();
  }

  /* ================================================================ 초상(원 안 얼굴) */
  // 머리가 원을 채우고 투구 윗부분이 잘리지 않게: 머리 중심을 원 중심보다 조금 아래(0.14r)에, 배율 r/46
  function portrait(c, id, x, y, r, o) {
    o = o || {};
    var sp = typeof id === 'string' ? CHAR[id] : id, bg = (sp && sp.bg) || [], k = r / 46;
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, PI * 2);
    var g = c.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r);
    g.addColorStop(0, o.bg1 || bg[0] || '#5a7aa8'); g.addColorStop(1, o.bg2 || bg[1] || '#22304a');
    c.fillStyle = g; c.fill();
    c.save(); c.clip();
    person(c, id, x, y + r * 0.14 + 132 * k, k, { t: o.t || 0, pose: o.pose || 'idle', portrait: true });
    c.restore();
    c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.lineWidth = Math.max(2.5, r * 0.08); c.strokeStyle = o.ring || '#e6c048'; c.stroke();
    if (o.dead) { c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.fill(); }
    c.restore();
  }

  /* ================================================================ 일월오봉도 (어좌 뒤 병풍) */
  // (x,y) = 왼쪽 위 모서리, w×h. 왼쪽에 흰 달, 오른쪽에 붉은 해, 푸른 다섯 봉우리, 폭포 둘, 양끝 붉은 소나무, 아래 물결.
  // 해·달 둘레는 은은한 빛만 둔다(방사형 빛줄기 금지). t 는 물결을 움직이는 시간(ms)
  function throne(c, x, y, w, h, t) {
    t = t || 0;
    var fw = Math.max(4, Math.min(w, h) * 0.04), ix = x + fw, iy = y + fw, iw = w - fw * 2, ih = h - fw * 2;
    var U = Math.min(iw * 0.25, ih), lw = Math.max(1.2, U * 0.012), base = iy + ih * 0.8;
    c.save();
    rr(c, x, y, w, h, fw * 0.8); fs(c, '#5a1c16', 2.5);
    c.strokeStyle = '#e6c048'; c.lineWidth = Math.max(1.2, fw * 0.22); rr(c, x + fw * 0.45, y + fw * 0.45, w - fw * 0.9, h - fw * 0.9, fw * 0.5); c.stroke();
    c.save(); c.beginPath(); c.rect(ix, iy, iw, ih); c.clip();
    var g = c.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, '#22446a'); g.addColorStop(0.7, '#6a8ea6'); g.addColorStop(1, '#8aa6b4');
    c.fillStyle = g; c.fillRect(ix, iy, iw, ih);
    var mr = Math.max(5, U * 0.09), my = iy + ih * 0.19;
    glow(c, ix + iw * 0.25, my, mr * 2.6, 'rgba(255,255,235,.35)'); ell(c, ix + iw * 0.25, my, mr, mr); fs(c, '#f6f2e4', lw * 1.6);
    glow(c, ix + iw * 0.75, my, mr * 2.6, 'rgba(255,110,70,.4)'); ell(c, ix + iw * 0.75, my, mr, mr); fs(c, '#d8302a', lw * 1.6);
    [[0.12, 0.44, 0.1], [0.88, 0.44, 0.1], [0.3, 0.27, 0.11], [0.7, 0.27, 0.11], [0.5, 0.08, 0.13]].forEach(function (p) {
      var cx = ix + iw * p[0], top = iy + ih * p[1], hh = base - top, hw = iw * p[2];
      for (var L = 0; L < 3; L++) {                              // 둥글고 높은 봉우리, 안쪽으로 갈수록 밝은 겹
        var tp = top + hh * L * 0.16, w2 = hw * (1 - L * 0.3), h2 = base - tp;
        c.beginPath(); c.moveTo(cx - w2, base + 2); c.bezierCurveTo(cx - w2, base - h2 * 0.62, cx - w2 * 0.6, tp, cx, tp); c.bezierCurveTo(cx + w2 * 0.6, tp, cx + w2, base - h2 * 0.62, cx + w2, base + 2); c.closePath();
        c.fillStyle = ['#1f5a52', '#2f7d68', '#58a487'][L]; c.fill(); ol(c, lw * (L ? 1 : 1.8)); c.stroke();
      }
    });
    [0.4, 0.6].forEach(function (q) {                          // 폭포 두 줄기
      var fx = ix + iw * q; c.strokeStyle = 'rgba(244,250,255,.92)'; c.lineWidth = lw * 2.4;
      c.beginPath(); c.moveTo(fx, iy + ih * 0.5); c.lineTo(fx, base); c.moveTo(fx + lw * 3.4, iy + ih * 0.56); c.lineTo(fx + lw * 3.4, base); c.stroke();
    });
    c.fillStyle = '#1d5a78'; c.fillRect(ix, base, iw, iy + ih - base);
    for (var r = 0; r < 3; r++) {                                // 물결: 굽이치는 흰 물마루
      var wy = base + (iy + ih - base) * (0.2 + r * 0.3), amp = U * 0.035, per = U * 0.36, ph = t / 900 + r * 1.7;
      c.beginPath(); for (var xx = ix - 4; xx <= ix + iw + 4; xx += 3) c.lineTo(xx, wy + Math.sin((xx - ix) / per * PI * 2 + ph) * amp);
      c.strokeStyle = r % 2 ? '#a8d4dc' : '#eef8f6'; c.lineWidth = lw * 1.8; c.stroke();
      var off = (((0.25 - ph / (PI * 2)) % 1) + 1) % 1 * per; c.fillStyle = '#f4fbfa';
      for (var crx = ix + off; crx < ix + iw; crx += per) { ell(c, crx, wy - amp, lw * 2.4, lw * 1.7); c.fill(); }
    }
    [[0.035, 1], [0.965, -1]].forEach(function (q) {            // 붉은 줄기 소나무
      var tx = ix + iw * q[0], d = q[1], y0 = iy + ih + 4, y1 = iy + ih * 0.34;
      c.beginPath(); c.moveTo(tx, y0); c.quadraticCurveTo(tx + d * U * 0.14, (y0 + y1) / 2, tx + d * U * 0.04, y1); stroke2(c, Math.max(2, U * 0.045), '#a8452a');
      [[0.32, 0.18, 0.08], [0.47, 0.25, 0.14], [0.63, 0.2, 0.1]].forEach(function (b) {     // 솔잎 덩이: 납작한 구름 모양
        var bx = tx + d * U * (0.08 + b[2]), by = iy + ih * b[0], bw = U * b[1];
        c.beginPath(); c.moveTo(tx + d * U * 0.06, by + U * 0.02); c.lineTo(bx, by); stroke2(c, Math.max(1.5, U * 0.02), '#a8452a');
        c.beginPath(); c.ellipse(bx - bw * 0.45, by + U * 0.01, bw * 0.5, U * 0.055, 0, PI, 0); c.ellipse(bx, by - U * 0.015, bw * 0.55, U * 0.07, 0, PI, 0); c.ellipse(bx + bw * 0.45, by + U * 0.01, bw * 0.5, U * 0.055, 0, PI, 0); c.closePath();
        fs(c, '#24563a', lw * 1.4); c.strokeStyle = '#4f9060'; c.lineWidth = lw * 1.2; c.beginPath(); c.arc(bx, by + U * 0.04, bw * 0.45, PI * 1.2, PI * 1.8); c.stroke();
      });
    });
    c.strokeStyle = 'rgba(40,20,10,.3)'; c.lineWidth = lw; for (var p4 = 1; p4 < 4; p4++) { c.beginPath(); c.moveTo(ix + iw * p4 / 4, iy); c.lineTo(ix + iw * p4 / 4, iy + ih); c.stroke(); }   // 병풍 접힘
    c.restore();
    c.restore();
  }

  /* ================================================================ 이펙트 */
  function burst(c, x, y, r, col, k) {
    c.save(); c.globalAlpha = Math.max(0, 1 - k);
    c.fillStyle = col || '#ffd25a';
    for (var i = 0; i < 9; i++) { var a = i * PI * 2 / 9 + k * 2, rr2 = r * (0.4 + k * 1.2); c.beginPath(); c.arc(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2, Math.max(0.5, r * 0.18 * (1 - k)), 0, PI * 2); c.fill(); }
    c.restore();
  }
  function slash(c, x, y, r, k, col) {
    c.save(); c.globalAlpha = Math.max(0, 1 - k); c.strokeStyle = col || '#fff'; c.lineWidth = 6 * (1 - k) + 1;
    c.beginPath(); c.arc(x, y, r, -PI * 0.9 + k, -PI * 0.1 + k); c.stroke(); c.restore();
  }

  return { CHAR: CHAR, FOE: FOE, NAME_KR: NAME_KR, person: person, foe: foe, wship: wship, panokseon: panokseon, turtleShip: turtleShip, castle: castle,
    enemy: enemy, enemyHeight: enemyHeight, isShip: isShip, icon: icon, cardArt: cardArt, portrait: portrait, throne: throne, burst: burst, slash: slash, shade: shade, rr: rr };
})();
