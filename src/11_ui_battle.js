/* ===== 11_ui_battle.js — 전투 화면·손패·거리 눈금·의도·연출 큐 + 공용 그리기 도구(gfx) (전역 UIBattle) ===== */
// 계약서 §7.3. 상태 전이는 Combat 이 즉시 하고, 화면은 Core.bus 'fx' 이벤트를 큐로 받아 「이후 값」으로 따라간다.
// 큐가 비면 화면 값(V)을 실제 상태(st)와 맞춘다. 카드 조작은 큐가 비고 phase 가 'player' 일 때만 받는다.
// 그림은 ART(10b_art)가 그린다: 장수·왜군 캐릭터, 배, 아이콘, 카드 그림. 화면에는 한자를 쓰지 않는다(clean 이 괄호 속 한자를 걷어 낸다).
// 공용 그리기 도구 UIBattle.gfx 는 12_ui_screens 가 함께 쓴다.
var UIBattle = (function () { 'use strict';

  var W = 1280, H = 720, B = Core.BAL;
  var FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR","Nanum Gothic","Segoe UI",sans-serif';
  var SERIF = '"Nanum Myeongjo","Batang","AppleMyungjo","Noto Serif KR","Malgun Gothic",serif';
  var C = {
    bg: '#14110e', ink: '#1b1712', paper: '#f3e9d2', red: '#c8352a', redL: '#ff7a5c', gold: '#e6b84a', goldL: '#ffe08a',
    text: '#fff6e6', dim: '#c9bba0', dim2: '#7d7262', blue: '#6cc0ff', green: '#7ee07a', panel: 'rgba(14,30,38,.92)',
    // 단청 오방색: 짙은 청록·군청 나무 바탕, 초록·빨강·흰·파랑 띠. 빨강은 위험·적·턴 종료에만 쓴다
    teal: '#2e7d6f', navy: '#1f3b73', wood1: '#1f4250', wood2: '#0f2129', white: '#f3eee0',
    dcGreen: '#2f9a78', dcRed: '#c8352a', dcWhite: '#f3eee0', dcBlue: '#2a5aa8'
  };
  var TYPE_KR = { atk: '공격', def: '방어', tac: '계책', rep: '장계', edict: '어명' };
  var TYPE_COL = { atk: '#d8503a', def: '#3d86cc', tac: '#8a5fd0', rep: '#d6a22e', edict: '#8a1c1c' };
  var PILE_NAME = { draw: '뽑을 카드', discard: '버린 카드', exhaust: '소모한 카드' };

  /* ================================================================ 공용 그리기 도구 */
  function X() { return (typeof TXT !== 'undefined') ? TXT : {}; }
  function ui(k, d) { var u = X().ui; return (u && u[k]) || d; }
  // 화면에 그리는 글의 마지막 안전망: 한자(호환·확장 B·가나 포함)를 걷어 내고, 「」『』는 ‘’로, 〔〕는 지우고,
  // 영어 꼬리표 괄호 '(shot)' '(gun·bow)'를 지운 뒤 남은 빈 괄호·떠도는 문장부호를 정리한다
  var CJK = '⺀-⿟々-〇〡-〩぀-ヿ㐀-䶿一-鿿豈-﫿', SUR = '[\uD840-\uD87F][\uDC00-\uDFFF]';
  var RE_CJK = new RegExp('[' + CJK + ']|' + SUR), RE_CJK_RUN = new RegExp('(?:[' + CJK + ']|' + SUR + ')+', 'g');
  var RE_CJK_PAREN = new RegExp('\\s*[(（][^()（）]*(?:[' + CJK + ']|' + SUR + ')[^()（）]*[)）]', 'g');
  var RE_CJK_QUOTE = new RegExp('[「『]\\s*(?:[' + CJK + '\\s·]|' + SUR + ')+\\s*[」』]', 'g');
  var RE_EN_PAREN = /\s*[(（]\s*[A-Za-z][A-Za-z_\s·,\/&\-]*[)）]/g, RE_FAST = new RegExp('[(（「」『』〔〕' + CJK + '\uD840-\uD87F]');
  var cleanCache = Object.create(null), cleanN = 0;
  function tidy(s) {
    return s.replace(/‘\s*’|“\s*”|\(\s*\)|（\s*）|「\s*」/g, '').replace(/^[ \t]*[—\-·,.:;][ \t]*/, '').replace(/[ \t]*[—·,:;][ \t]*$/, '')
      .replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([.,!?)’”])/g, '$1').replace(/([(‘“])[ \t]+/g, '$1').replace(/([.,])[ \t]*\1+/g, '$1').replace(/^[ \t]+|[ \t]+$/g, '');
  }
  function clean(s) {
    s = String(s == null ? '' : s);
    if (!RE_FAST.test(s)) return s;
    var hit = cleanCache[s]; if (hit !== undefined) return hit;
    var o = s, cut = false;
    if (RE_CJK.test(o)) { o = o.replace(RE_CJK_PAREN, '').replace(RE_CJK_QUOTE, '').replace(RE_CJK_RUN, ''); cut = true; }
    var o2 = o.replace(RE_EN_PAREN, ''); if (o2 !== o) { o = o2; cut = true; }
    if (/[〔〕]/.test(o)) { o = o.replace(/[〔〕]/g, ''); cut = true; }
    o = o.replace(/[「『]/g, '‘').replace(/[」』]/g, '’');
    if (cut) o = tidy(o);
    if (++cleanN > 4000) { cleanCache = Object.create(null); cleanN = 0; }
    cleanCache[s] = o;
    return o;
  }
  function F(px, w, serif) { return (w ? w + ' ' : '') + Math.round(px * 10) / 10 + 'px ' + (serif ? SERIF : FONT); }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function txt(c, s, x, y, o) {
    o = o || {};
    s = clean(s);
    c.font = F(o.size || 16, o.weight, o.serif); c.fillStyle = o.color || C.text;
    c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    if (o.shadow) { c.shadowColor = 'rgba(0,0,0,.85)'; c.shadowBlur = o.shadow; }
    if (o.stroke) { c.lineWidth = o.stroke; c.strokeStyle = o.strokeColor || 'rgba(0,0,0,.85)'; c.lineJoin = 'round'; o.maxW ? c.strokeText(s, x, y, o.maxW) : c.strokeText(s, x, y); }
    if (o.maxW) c.fillText(s, x, y, o.maxW); else c.fillText(s, x, y);
    c.shadowBlur = 0;
  }
  function wrap(c, s, maxW) {
    var out = [];
    clean(s).split('\n').forEach(function (par) {
      var words = par.split(' '), line = '';
      words.forEach(function (w) {
        var tryL = line ? line + ' ' + w : w;
        if (c.measureText(tryL).width <= maxW) { line = tryL; return; }
        if (line) out.push(line);
        line = '';
        if (c.measureText(w).width <= maxW) { line = w; return; }
        for (var i = 0; i < w.length; i++) {
          if (c.measureText(line + w[i]).width > maxW && line) { out.push(line); line = ''; }
          line += w[i];
        }
      });
      out.push(line);
    });
    return out;
  }
  function para(c, s, x, y, maxW, o) {
    o = o || {}; c.font = F(o.size || 16, o.weight, o.serif);
    var lines = wrap(c, s, maxW), lh = o.lh || (o.size || 16) * 1.55;
    if (o.max) lines = lines.slice(0, o.max);
    lines.forEach(function (l, i) { txt(c, l, x, y + i * lh, o); });
    return lines.length * lh;
  }
  function paper(c, x, y, w, h, o) {
    o = o || {};
    c.save();
    rr(c, x, y, w, h, o.r != null ? o.r : 10);
    var g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, o.c1 || '#fbf3e0'); g.addColorStop(1, o.c2 || '#eedfbd');
    c.fillStyle = g; c.fill();
    if (o.border !== false) { c.lineWidth = o.lw || 3; c.strokeStyle = o.border || '#6b4a2a'; c.stroke(); }
    c.restore();
  }
  // 단청 띠: 초록·빨강·흰·파랑 가는 줄을 위 가장자리 안쪽에 겹쳐 긋고, 초록 줄에 흰 마름모 무늬를 둔다
  function dancheong(c, x, y, w, k) {
    k = k || 1;
    var rows = [[C.dcGreen, 3.2], [C.dcRed, 2.2], [C.dcWhite, 1.4], [C.dcBlue, 2.4]], yy = y;
    rows.forEach(function (r) { c.fillStyle = r[0]; c.fillRect(x, yy, w, r[1] * k); yy += r[1] * k; });
    c.fillStyle = 'rgba(243,238,224,.85)';
    for (var dx = x + 9 * k; dx < x + w - 4 * k; dx += 18 * k) { c.beginPath(); c.moveTo(dx, y); c.lineTo(dx + 2.2 * k, y + 1.6 * k); c.lineTo(dx, y + 3.2 * k); c.lineTo(dx - 2.2 * k, y + 1.6 * k); c.closePath(); c.fill(); }
  }
  function panel(c, x, y, w, h, o) {          // 게임 창: 짙은 청록 나무 + 금테 + 위쪽 단청 띠 (o.stripe:false 로 끈다. 높이 44 미만은 기본으로 끈다)
    o = o || {};
    var r = o.r != null ? o.r : 14;
    c.save();
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
    rr(c, x, y, w, h, r);
    var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, o.c1 || C.wood1); g.addColorStop(1, o.c2 || C.wood2);
    c.fillStyle = g; c.fill();
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    if (o.stripe === true || (o.stripe !== false && h >= 44 && w >= 80)) {
      c.save(); rr(c, x + 2, y + 2, w - 4, h - 4, Math.max(0, r - 2)); c.clip();
      dancheong(c, x, y + 4, w, h < 70 ? 0.7 : 1);
      c.restore();
    }
    rr(c, x, y, w, h, r); c.lineWidth = 3; c.strokeStyle = o.border || C.gold; c.stroke();
    rr(c, x + 5, y + 5, w - 10, h - 10, Math.max(0, r - 4)); c.lineWidth = 1; c.strokeStyle = 'rgba(255,224,138,.25)'; c.stroke();
    c.restore();
  }
  // 양피지 카드: 금테 + 안쪽 가는 먹선 + 네 귀 금장식 + 위쪽 단청 띠 (예전의 족자 막대·붉은 꼭지는 없앴다)
  function scrollPanel(c, x, y, w, h, o) {
    o = o || {};
    c.save();
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
    rr(c, x, y, w, h, 12);
    var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#fbf4e2'); g.addColorStop(1, '#ecdcb6');
    c.fillStyle = g; c.fill();
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    if (o.stripe !== false) { c.save(); rr(c, x + 2, y + 2, w - 4, h - 4, 10); c.clip(); dancheong(c, x, y + 5, w, 1); c.restore(); }
    rr(c, x, y, w, h, 12); c.lineWidth = 4; c.strokeStyle = '#b8892e'; c.stroke();
    rr(c, x - 1.5, y - 1.5, w + 3, h + 3, 13); c.lineWidth = 1.5; c.strokeStyle = '#4a3216'; c.stroke();
    rr(c, x + 9, y + 18, w - 18, h - 27, 6); c.lineWidth = 1.2; c.strokeStyle = 'rgba(120,80,30,.45)'; c.stroke();
    c.fillStyle = '#d9a640'; c.strokeStyle = '#6a4a1a'; c.lineWidth = 1.2;
    [[x + 9, y + 18, 1, 1], [x + w - 9, y + 18, -1, 1], [x + 9, y + h - 9, 1, -1], [x + w - 9, y + h - 9, -1, -1]].forEach(function (p) {
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] + 16 * p[2], p[1]); c.lineTo(p[0] + 16 * p[2], p[1] + 4 * p[3]); c.lineTo(p[0] + 4 * p[2], p[1] + 4 * p[3]);
      c.lineTo(p[0] + 4 * p[2], p[1] + 16 * p[3]); c.lineTo(p[0], p[1] + 16 * p[3]); c.closePath(); c.fill(); c.stroke();
    });
    c.restore();
  }
  function seal(c, x, y, r, id, o) {        // 예전 인장 자리: 이제는 초상
    o = o || {};
    if (ART.CHAR[id]) ART.portrait(c, id, x, y, r, { t: Main.time, ring: o.ring, dead: o.dead });
    else { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#3a2a20'; c.fill(); c.lineWidth = 3; c.strokeStyle = C.gold; c.stroke(); ART.icon(c, o.icon || 'star', x, y, r * 1.1); }
  }
  function button(c, o) {
    var en = o.enabled !== false, hov = en && Input.hover(o.id);
    c.save();
    var y = o.y + (hov ? -1 : 0);
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 8; c.shadowOffsetY = 4;
    rr(c, o.x, y, o.w, o.h, o.r != null ? o.r : 12);
    var g = c.createLinearGradient(0, y, 0, y + o.h);
    if (!en) { g.addColorStop(0, '#565452'); g.addColorStop(1, '#353332'); }
    else if (o.primary) { g.addColorStop(0, hov ? '#ff6a48' : '#e84a32'); g.addColorStop(1, '#a3241a'); }
    else if (o.green) { g.addColorStop(0, hov ? '#5cc05c' : '#4aa84a'); g.addColorStop(1, '#23602a'); }
    else if (o.teal) { g.addColorStop(0, hov ? '#3fae9c' : '#2f9080'); g.addColorStop(1, '#14504a'); }
    else if (o.blue) { g.addColorStop(0, hov ? '#5aa8f0' : '#3a8ad8'); g.addColorStop(1, '#1f4f8a'); }
    else { g.addColorStop(0, hov ? '#3a6474' : '#2c5060'); g.addColorStop(1, '#14303a'); }
    c.fillStyle = g; c.fill();
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.lineWidth = 2.5; c.strokeStyle = en ? (hov ? C.goldL : 'rgba(255,224,138,.75)') : 'rgba(160,150,135,.4)'; c.stroke();
    c.beginPath(); rr(c, o.x + 4, y + 3, o.w - 8, o.h * 0.42, (o.r != null ? o.r : 12) - 3); c.fillStyle = 'rgba(255,255,255,.10)'; c.fill();
    var ix = 0;
    if (o.icon) { ART.icon(c, o.icon, o.x + 26, y + o.h / 2, Math.min(28, o.h * 0.6)); ix = 18; }
    var ly = o.sub ? y + o.h / 2 - 8 : y + o.h / 2 + 1;
    txt(c, o.label, o.x + o.w / 2 + ix, ly, { size: o.size || 18, weight: 'bold', align: 'center', base: 'middle', color: en ? '#fffaf0' : '#9a9080', maxW: o.w - 16 - ix * 2, stroke: en ? 3 : 0, strokeColor: 'rgba(40,10,5,.6)' });
    if (o.sub) txt(c, o.sub, o.x + o.w / 2 + ix, y + o.h / 2 + 13, { size: 12.5, align: 'center', base: 'middle', color: en ? C.goldL : '#8a8070', maxW: o.w - 14, weight: 'bold' });
    if (o.key && !Input.isTouch) txt(c, o.key, o.x + o.w - 8, y + 11, { size: 10, align: 'right', base: 'middle', color: 'rgba(255,240,200,.6)' });
    c.restore();
    Input.zone({ id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, tap: en && o.tap ? function () { try { Audio_.sfx('button'); } catch (e) { /* 무음 */ } o.tap(); } : null, enabled: en, cursor: en ? 'pointer' : 'not-allowed' });
    return hov;
  }
  function cardCost(card, up) { return (up && card.plus && card.plus.cost != null) ? card.plus.cost : card.cost; }
  function tagName(t) { var T = X(); return clean((T.tag && T.tag[t]) || ''); }
  function typePill(card) {
    var a = TYPE_KR[card.type] || '', b = tagName((card.tags || [])[0]);
    return b && b !== a ? a + '·' + b : a;
  }
  function drawCard(c, card, up, x, y, w, h, o) {
    o = o || {};
    var s = w / 112, col = TYPE_COL[card.type] || TYPE_COL.tac, plus = (up && card.plus) ? card.plus : {};
    c.save();
    if (o.alpha != null) c.globalAlpha = o.alpha;
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 10 * s; c.shadowOffsetY = 5 * s;
    rr(c, x, y, w, h, 10 * s);
    var g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, ART.shade(col, 0.15)); g.addColorStop(1, ART.shade(col, -0.35));
    c.fillStyle = g; c.fill();
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.lineWidth = (up ? 3.2 : 2) * s; c.strokeStyle = up ? C.goldL : '#1d140d'; c.stroke();
    if (o.glow) { rr(c, x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s, 12 * s); c.lineWidth = 3.5 * s; c.strokeStyle = o.glow; c.stroke(); }
    // 그림 칸
    ART.cardArt(c, card, x + 6 * s, y + 27 * s, w - 12 * s, 56 * s, Main.time);
    rr(c, x + 6 * s, y + 27 * s, w - 12 * s, 56 * s, 5 * s); c.lineWidth = 1.6 * s; c.strokeStyle = '#1d140d'; c.stroke();
    // 이름 띠
    txt(c, card.name + (up ? '+' : ''), x + w / 2 + 8 * s, y + 18 * s, { size: 12.5 * s, weight: 'bold', align: 'center', color: up ? C.goldL : '#fff', maxW: w - 36 * s, stroke: 3 * s, strokeColor: 'rgba(20,10,5,.75)' });
    // 비용 보석
    var cost = o.cost != null ? o.cost : cardCost(card, up), base = cardCost(card, up);
    c.beginPath(); c.arc(x + 13 * s, y + 13 * s, 12 * s, 0, Math.PI * 2);
    var cg = c.createRadialGradient(x + 10 * s, y + 9 * s, 2 * s, x + 13 * s, y + 13 * s, 12 * s); cg.addColorStop(0, '#fff2b0'); cg.addColorStop(0.5, '#f2b632'); cg.addColorStop(1, '#a86a10');
    c.fillStyle = cg; c.fill(); c.lineWidth = 2 * s; c.strokeStyle = '#3a2208'; c.stroke();
    txt(c, String(cost), x + 13 * s, y + 14 * s, { size: 15 * s, weight: 'bold', align: 'center', base: 'middle', color: cost < base ? '#c8ffb8' : (cost > base ? '#ffd0c8' : '#fff'), stroke: 3 * s, strokeColor: '#5a3208' });
    // 종류 표: 종류 + 첫 꼬리표(사격·백병·돌격·수군·의병 …) — 장수 패시브가 말하는 꼬리표를 카드에서 읽을 수 있게
    var pill = typePill(card);
    c.font = F(9.5 * s, 'bold');
    var pw = Math.min(w - 14 * s, Math.max(40 * s, c.measureText(pill).width + 14 * s));
    rr(c, x + w / 2 - pw / 2, y + 79 * s, pw, 14 * s, 7 * s); c.fillStyle = '#1d140d'; c.fill();
    txt(c, pill, x + w / 2, y + 86.5 * s, { size: 9.5 * s, weight: 'bold', align: 'center', base: 'middle', color: ART.shade(col, 0.45), maxW: pw - 6 * s });
    // 설명(양피지)
    rr(c, x + 6 * s, y + 95 * s, w - 12 * s, h - 101 * s, 5 * s); c.fillStyle = '#f6ecd4'; c.fill();
    var desc = plus.desc || card.desc || '';
    c.font = F(10 * s, 'bold');
    var lines = wrap(c, desc, w - 18 * s).slice(0, 4);
    var ly0 = y + 95 * s + ((h - 101 * s) - lines.length * 12.2 * s) / 2 + 9 * s;
    lines.forEach(function (l, i) { txt(c, l, x + w / 2, ly0 + i * 12.2 * s, { size: 10 * s, weight: 'bold', color: '#2a1d12', align: 'center' }); });
    var ration = o.ration != null ? o.ration : (plus.ration != null ? plus.ration : card.ration);
    if (ration) { ART.icon(c, 'rice', x + 15 * s, y + h - 12 * s, 14 * s); txt(c, String(ration), x + 24 * s, y + h - 8 * s, { size: 10 * s, weight: 'bold', color: '#7a3a10' }); }
    var ex = plus.exhaust != null ? plus.exhaust : card.exhaust, rt = plus.retain != null ? plus.retain : card.retain;
    if (ex || rt) txt(c, [ex ? '소모' : '', rt ? '보존' : ''].filter(Boolean).join('·'), x + w - 9 * s, y + h - 8 * s, { size: 8.5 * s, weight: 'bold', align: 'right', color: '#7a4a1a' });
    if (card.rarity === 'rare' || card.rarity === 'special') {
      var gx = x + w - 13 * s, gy = y + 13 * s;
      c.beginPath(); c.moveTo(gx, gy - 6 * s); c.lineTo(gx + 6 * s, gy); c.lineTo(gx, gy + 6 * s); c.lineTo(gx - 6 * s, gy); c.closePath();
      c.fillStyle = card.rarity === 'special' ? '#ff6a6a' : '#7fd8ff'; c.fill(); c.lineWidth = 1.5 * s; c.strokeStyle = '#1d140d'; c.stroke();
    }
    if (o.marked) { rr(c, x + w - 46 * s, y + 30 * s, 40 * s, 16 * s, 8 * s); c.fillStyle = '#c8352a'; c.fill(); txt(c, '장전', x + w - 26 * s, y + 38.5 * s, { size: 10 * s, weight: 'bold', align: 'center', base: 'middle' }); }
    if (o.dim) { rr(c, x, y, w, h, 10 * s); c.fillStyle = 'rgba(10,8,6,.5)'; c.fill(); }
    c.restore();
  }
  function cardInfoBox(c, card, up, x, y, w, extra, bottom) {
    var T = X(), desc = '';
    try { desc = T.cardDesc ? T.cardDesc(card, up) : (card.desc || ''); } catch (e) { desc = card.desc || ''; }
    c.font = F(14);
    var lines = wrap(c, desc, w - 28), exL = [], memo = clean(card.memo || '');
    (extra || []).forEach(function (l) {          // 덧줄도 상자 폭에 맞춰 접는다
      c.font = F(14, l.bold ? 'bold' : null);
      wrap(c, l.text, w - 32).forEach(function (s, k) { exL.push({ text: (k ? '  ' : '') + s, color: l.color, bold: l.bold }); });
    });
    var h = 52 + lines.length * 21 + exL.length * 21 + (memo ? 24 : 10);
    if (bottom) y = y - h;
    y = Math.max(4, Math.min(H - h - 4, y));
    panel(c, x, y, w, h, { r: 12 });
    txt(c, card.name + (up ? '+' : ''), x + 16, y + 32, { size: 18, weight: 'bold', color: up ? C.goldL : '#fff', maxW: w * 0.55 });
    var tagL = [], add = function (s) { s = clean(s || ''); if (s && tagL.indexOf(s) < 0) tagL.push(s); };
    add(TYPE_KR[card.type]); add(tagName((card.tags || [])[0])); add((T.pool || {})[card.pool]); if (card.rarity) add((T.rarity || {})[card.rarity]);
    txt(c, tagL.join(' · '), x + w - 16, y + 32, { size: 12, color: C.dim, align: 'right', maxW: w * 0.42 });
    lines.forEach(function (l, i) { txt(c, l, x + 16, y + 58 + i * 21, { size: 14, color: C.text }); });
    exL.forEach(function (l, i) { txt(c, l.text, x + 16, y + 58 + lines.length * 21 + i * 21, { size: 14, color: l.color || C.goldL, weight: l.bold ? 'bold' : null }); });
    if (memo) txt(c, memo, x + 16, y + h - 12, { size: 11.5, color: C.dim, maxW: w - 32 });
    return h;
  }
  function tooltip(c, x, y, title, body, w) {
    w = w || 270; c.font = F(13);
    var lines = body ? wrap(c, body, w - 24) : [], h = 42 + lines.length * 19;
    x = Math.max(6, Math.min(W - w - 6, x)); y = Math.max(6, Math.min(H - h - 6, y));
    panel(c, x, y, w, h, { r: 10 });
    txt(c, title, x + 12, y + 28, { size: 14, weight: 'bold', color: C.goldL, maxW: w - 24 });
    lines.forEach(function (l, i) { txt(c, l, x + 12, y + 48 + i * 19, { size: 13, color: C.text }); });
  }
  function bar(c, x, y, w, h, v, max, col, o) {
    o = o || {};
    rr(c, x, y, w, h, h / 2); c.fillStyle = 'rgba(0,0,0,.6)'; c.fill();
    var f = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
    if (o.ghost != null && o.ghost > 0) {
      var gf = Math.max(0, Math.min(1, (v - o.ghost) / max));
      rr(c, x, y, Math.max(h, w * f), h, h / 2); c.fillStyle = 'rgba(255,214,120,.95)'; c.fill();
      if (gf > 0) { rr(c, x, y, Math.max(h, w * gf), h, h / 2); c.fillStyle = col; c.fill(); }
    } else if (f > 0) {
      rr(c, x, y, Math.max(h, w * f), h, h / 2);
      var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, ART.shade(col, 0.3)); g.addColorStop(1, col);
      c.fillStyle = g; c.fill();
    }
    rr(c, x, y, w, h, h / 2); c.lineWidth = 2; c.strokeStyle = '#1d140d'; c.stroke();
    if (o.label !== false) txt(c, o.label || (Math.max(0, Math.round(v)) + ' / ' + max), x + w / 2, y + h / 2 + 1, { size: Math.max(10, h - 4), align: 'center', base: 'middle', weight: 'bold', stroke: 3 });
  }
  function leaderChar(id) { return id; }   // 호환: 예전에는 성씨 한자를 돌려줬다

  /* ================================================================ 배경 (전투마다 한 번) */
  var bgCache = {};
  function background(type, terrain) {
    var key = type + '|' + terrain;
    if (bgCache[key]) return bgCache[key];
    if (typeof document === 'undefined' || !document.createElement) return null;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d'), r = Core.rngNew(key);
    var naval = type === 'naval', hz = naval ? 300 : 330;
    var sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#6fb0e0'); sky.addColorStop(1, '#d9eef6');
    g.fillStyle = sky; g.fillRect(0, 0, W, hz + 2);
    for (var i = 0; i < 7; i++) {                                   // 구름
      var cx = Core.rand(r) * W, cy = 70 + Core.rand(r) * 120, cs = 30 + Core.rand(r) * 40;
      g.fillStyle = 'rgba(255,255,255,.75)';
      [[0, 0, 1], [cs * 0.8, 6, 0.8], [-cs * 0.8, 8, 0.7], [cs * 0.3, -cs * 0.4, 0.75]].forEach(function (p) { g.beginPath(); g.arc(cx + p[0], cy + p[1], cs * p[2], 0, 7); g.fill(); });
    }
    function ridge(y0, amp, col, seed, step) {
      var rr2 = Core.rngNew(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x < W + step; x += step) g.lineTo(x, y0 - amp * Math.abs(Math.sin(x / 210 + Core.rand(rr2) * 0.7)) - Core.rand(rr2) * amp * 0.25);   // 오른쪽 끝까지 덮는다(빈 틈이 검게 남던 것)
      g.lineTo(W, H); g.closePath(); g.fill();
    }
    if (naval) {
      ridge(hz + 6, terrain === 'strait' ? 110 : 50, '#7d9fb0', key + 'i1', 30);
      var sea = g.createLinearGradient(0, hz, 0, H); sea.addColorStop(0, '#3d86b8'); sea.addColorStop(1, '#174a75');
      g.fillStyle = sea; g.fillRect(0, hz, W, H - hz);
      for (var k = 0; k < 120; k++) { var y = hz + 10 + Core.rand(r) * (H - hz), x = Core.rand(r) * W, l = 16 + Core.rand(r) * 50; g.strokeStyle = 'rgba(220,240,255,' + (0.12 + Core.rand(r) * 0.18) + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke(); }
      if (terrain === 'strait') { g.fillStyle = '#5a6a5a'; g.beginPath(); g.moveTo(0, hz - 40); g.lineTo(150, hz + 30); g.lineTo(0, hz + 120); g.fill(); g.beginPath(); g.moveTo(W, hz - 60); g.lineTo(W - 170, hz + 40); g.lineTo(W, hz + 140); g.fill(); }
    } else {
      ridge(hz - 10, terrain === 'ridge' ? 170 : 90, '#9bb0c4', key + 'm1', 34);
      ridge(hz + 20, terrain === 'ridge' ? 110 : 60, '#6f9a6a', key + 'm2', 28);
      var gr = g.createLinearGradient(0, hz + 40, 0, H); gr.addColorStop(0, '#8db26a'); gr.addColorStop(0.5, '#a89060'); gr.addColorStop(1, '#6a5232');
      g.fillStyle = gr; g.fillRect(0, hz + 40, W, H - hz - 40);
      for (var k2 = 0; k2 < 90; k2++) { var gx2 = Core.rand(r) * W, gy2 = hz + 60 + Core.rand(r) * 120; g.strokeStyle = 'rgba(60,90,40,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx2, gy2); g.lineTo(gx2 - 3, gy2 - 8); g.moveTo(gx2, gy2); g.lineTo(gx2 + 3, gy2 - 7); g.stroke(); }
      if (terrain === 'river') { var rv = g.createLinearGradient(0, hz + 50, 0, hz + 100); rv.addColorStop(0, '#5aa0d0'); rv.addColorStop(1, '#2f6f9e'); g.fillStyle = rv; g.fillRect(0, hz + 52, W, 40); }
      if (type === 'siege' || terrain === 'fort') {                  // 아군 성벽(왼쪽): 윗면(걷는 길)이 장수들의 발 높이. 앞 여장은 사람 뒤에 그린다(parapet)
        var wy = WALL.top;
        g.fillStyle = '#9c917c'; g.fillRect(0, wy - 6, WALL.w + 8, 8);
        g.fillStyle = '#b8ad98'; g.fillRect(0, wy, WALL.w, H - wy);
        g.fillStyle = 'rgba(60,45,30,.25)'; g.fillRect(WALL.w - 10, wy, 10, H - wy);
        g.save(); g.beginPath(); g.rect(0, wy, WALL.w, H - wy); g.clip();
        g.strokeStyle = 'rgba(80,60,40,.45)'; g.lineWidth = 2;
        for (var by = 0; by < 6; by++) for (var bx = 0; bx < WALL.w + 30; bx += 30) g.strokeRect(bx - (by % 2) * 15, wy + 2 + by * 26, 30, 26);
        g.restore();
        [6, WALL.w - 34].forEach(function (fx, k) {
          g.strokeStyle = '#3a2a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(fx, wy); g.lineTo(fx, wy - 150); g.stroke();
          g.fillStyle = k ? '#2b4f8f' : '#c63a2c'; g.beginPath(); g.moveTo(fx, wy - 150); g.lineTo(fx + 40, wy - 146); g.lineTo(fx + 36, wy - 124); g.lineTo(fx, wy - 126); g.closePath(); g.fill();
        });
      }
      if (type === 'assault' || terrain === 'waeseong') {           // 왜성(오른쪽)
        g.fillStyle = '#8a8478'; g.beginPath(); g.moveTo(980, hz + 40); g.lineTo(1280, hz + 40); g.lineTo(1280, hz - 40); g.lineTo(1010, hz - 30); g.fill();
        g.fillStyle = '#f2ece0'; g.fillRect(1040, hz - 110, 200, 74); g.fillStyle = '#26262e'; g.beginPath(); g.moveTo(1020, hz - 108); g.lineTo(1140, hz - 160); g.lineTo(1260, hz - 108); g.fill();
        g.fillStyle = '#f2ece0'; g.fillRect(1090, hz - 190, 100, 40); g.fillStyle = '#26262e'; g.beginPath(); g.moveTo(1076, hz - 188); g.lineTo(1140, hz - 220); g.lineTo(1204, hz - 188); g.fill();
      }
    }
    bgCache[key] = cv;
    return cv;
  }

  /* ================================================================ 배치 */
  var L = {
    lead: { x: 206, y: 404, s: 1.1 }, deps: [{ x: 84, y: 396, s: 0.74 }, { x: 322, y: 396, s: 0.74 }, { x: 34, y: 392, s: 0.68 }],
    frame: { x: 54, y: 412, w: 290, h: 48 },          // 주장 이름표: 초상 + 이름 + 병력 막대 (그 아래 줄에 진형·성벽·상태)
    gauge: { x: 392, y: 300, cw: 98, ch: 62 },
    enemy: { x0: 700, x1: 1262, base: 404 }, log: { y: 470 },
    hand: { x0: 150, x1: 1052, y: 548, w: 112, h: 160 },
    energy: { x: 74, y: 594, r: 42 }, draw: { x: 32, y: 652, w: 84, h: 52 },
    disc: { x: 1170, y: 512, w: 88, h: 52 }, exh: { x: 1170, y: 570, w: 88, h: 52 }, end: { x: 1080, y: 640, w: 180, h: 64 }
  };
  // 수성·산성: 장수들이 성 위(걷는 길)에 서고 앞 여장이 발을 가린다. 해전: 판옥선 갑판 위
  var WALL = { top: 358, w: 380 }, SHIP = { x: 206, y: 396, s: 0.72 };
  var NAVAL_DEPS = [{ x: 146, s: 0.6 }, { x: 278, s: 0.6 }, { x: 112, s: 0.52 }];
  function onWall() { return S.st.type === 'siege' || S.st.terrain === 'fort'; }
  function shipDeck() { return SHIP.y - 64 * SHIP.s; }
  function leadPos() {
    var st = S.st;
    if (st.type === 'naval') return { x: SHIP.x, y: shipDeck(), s: 0.92 };
    if (onWall()) return { x: L.lead.x, y: WALL.top, s: L.lead.s };
    return L.lead;
  }
  function depPos(k) {
    var st = S.st;
    if (st.type === 'naval') { var n = NAVAL_DEPS[k]; return n ? { x: n.x, y: shipDeck() - (k === 2 ? 4 : 0), s: n.s } : null; }
    var d = L.deps[k]; if (!d) return null;
    return onWall() ? { x: d.x, y: WALL.top - (L.lead.y - d.y), s: d.s } : d;
  }
  var S = null;
  function freshView(req) {
    return { hp: req.hp, maxHp: req.maxHp, block: 0, wall: 0, energy: B.ENERGY, energyMax: B.ENERGY, ration: req.ration, susp: req.suspicion,
      dist: 1, distAnim: 1, enemyWall: 0, tide: null, turn: 1, handUids: [], enemies: [], log: [] };
  }
  function start(req, onDone) {
    stop();
    S = { req: req, onDone: onDone, st: null, V: freshView(req), Q: [], wait: 0, ver: 0, cache: {}, sel: -1, target: -1, hover: -1, detail: -1,
      pos: {}, flyers: [], floats: [], banners: [], fxs: [], shake: 0, t: 0, endReq: false, endWait: 0, doneT: 0, finished: false, overlay: null,
      tutorialOff: !(Main.settings.captions), rescueT: 0, chooseSel: [], enemyPos: {}, drag: null, unsub: null, toast: null, speed: 1,
      pose: { kind: 'idle', t: 0 }, atkKind: 'arrow', hoverEnemy: -1, detailIdx: -1, hold: false, tips: [], confetti: null, endPose: false };
    S.unsub = Core.bus.on('fx', function (p) { if (S) S.Q.push(p); });
    S.st = Combat.create(req);
    S.V.dist = S.V.distAnim = S.st.startDist;
    S.V.wall = req.mods && req.mods.wall != null ? req.mods.wall : (req.type === 'siege' ? B.SIEGE_WALL : 0);
    S.st.enemies.forEach(function (e, i) { S.V.enemies[i] = { hp: e.hp, maxHp: e.maxHp, block: 0, dead: false, alpha: 0, flash: 0, pose: 'idle', poseT: 0 }; });
  }
  function stop() { if (S && S.unsub) S.unsub(); S = null; }
  function bump() { S.ver++; S.cache = {}; }
  function act(fn) { var r = fn(); bump(); return r; }

  /* ---------------------------------------------------------------- 연출 큐 */
  var DUR = { hit: 150, playerHit: 260, push: 260, enemyAct: 230, wave: 650, spawn: 200, enemyDeath: 220, turnStart: 260, tide: 380, rescue: 900,
    play: 140, block: 70, heal: 120, win: 300, lose: 300, discard: 60, draw: 50, exhaust: 60, banner: 0 };
  function ensureE(i) {
    var V = S.V, e = S.st.enemies[i];
    if (!V.enemies[i] && e) V.enemies[i] = { hp: e.maxHp, maxHp: e.maxHp, block: 0, dead: false, alpha: 0, flash: 0, pose: 'idle', poseT: 0 };
    return V.enemies[i];
  }
  function enemyCenter(i) { var p = S.enemyPos[i]; return p ? { x: p.x, y: p.y } : { x: 980, y: 300 }; }
  function leadHand() { var lp = leadPos(); return { x: lp.x + 50, y: lp.y - 120 }; }
  function float(x, y, text, col, big) { S.floats.push({ x: x + (Math.random() - 0.5) * 16, y: y, text: text, col: col, t: 0, big: !!big }); }
  // style: 'ally'(청록 — 우리 차례·우리 쪽 일) | 'enemy'(빨강 — 적의 차례·적 파도) | 'gold'(군청 — 사건)
  function banner(text, big, style) { if (text) S.banners.push({ text: text, t: 0, dur: big ? 1700 : 1000, big: !!big, style: style || 'gold' }); }
  function effect(kind, x0, y0, x1, y1, dur, col) { S.fxs.push({ kind: kind, x0: x0, y0: y0, x1: x1, y1: y1, t: 0, dur: dur || 220, col: col || null }); }
  var ATK_BY_ART = { cannon: 'ball', bomb: 'ball', cart: 'rocket', fire: 'fire', gun: 'bullet', sword: 'slash', swords: 'slash', spear: 'slash', horse: 'slash', mound: 'rock', people: 'rock' };
  function atkKindFor(cardId, tag) {
    var c = CARDS.byId[cardId]; if (!c) return 'arrow';
    var t0 = (c.tags || [])[0];
    if (t0 === 'melee' || t0 === 'charge') return 'slash';
    if (t0 === 'fire') return 'ball';
    if (/cannon|cheonja|hyeonja|daejanggun|bombard|folangji|turtle|seungja|chen_lin|rolling/.test(cardId)) return 'ball';
    if (cardId === 'jochong') return 'bullet';
    if (t0 === 'none') return 'rock';
    return 'arrow';
  }
  function applyFx(p) {
    var V = S.V, e, ec, lh, LP = leadPos();
    switch (p.kind) {
      case 'turnStart':
        V.energy = p.energy; V.energyMax = Math.max(p.energy, B.ENERGY); V.turn = p.turn; V.handUids = p.handUids.slice();
        if (S.st.phase !== 'done') banner(p.turn + '턴 · 아군 차례', false, 'ally');
        break;
      case 'draw': case 'discard': case 'exhaust': if (p.handUids) V.handUids = p.handUids.slice(); break;
      case 'play':
        V.energy = p.energyAfter; V.ration = p.rationAfter;
        var pp = S.pos[p.uid], cd = CARDS.byId[p.cardId];
        S.flyers.push({ id: p.cardId, up: findInst(p.uid) ? findInst(p.uid).up : false, x: pp ? pp.x : 600, y: pp ? pp.y : 560, t: 0, to: p.to });
        V.handUids = V.handUids.filter(function (u) { return u !== p.uid; });
        if (cd && cd.type === 'atk') { S.pose = { kind: 'attack', t: 0 }; S.atkKind = atkKindFor(p.cardId); }
        break;
      case 'hit':
        e = ensureE(p.enemyIdx); if (!e) break;
        e.hp = p.hpAfter; e.block = p.blockAfter; e.flash = 1; e.pose = 'hurt'; e.poseT = 0;
        ec = enemyCenter(p.enemyIdx); lh = leadHand();
        if (p.tag !== 'hunger' && p.tag !== 'starve') {
          var k = S.atkKind || 'arrow';
          if (k === 'slash') effect('slash', ec.x, ec.y, ec.x, ec.y, 260);
          else effect(k, lh.x, lh.y, ec.x - 10, ec.y, k === 'ball' ? 260 : 200);
          effect('burst', ec.x, ec.y, ec.x, ec.y, 380, k === 'ball' || k === 'fire' ? '#ff9a3a' : '#fff2a0');
        }
        if (p.n > 0) float(ec.x, ec.y - 60, '-' + p.n, p.tag === 'hunger' || p.tag === 'starve' ? '#ffd27a' : '#ff5a3a', p.n >= 15);
        else float(ec.x, ec.y - 60, '막음', C.blue);
        if (Main.settings.shake && p.n >= 15) S.shake = Math.max(S.shake, 6);
        break;
      case 'playerHit':
        V.hp = p.hpAfter; V.block = p.blockAfter; V.wall = p.wallAfter;
        if (p.n > 0) { S.pose = { kind: 'hurt', t: 0 }; float(LP.x, LP.y - 200, '-' + p.n, '#ff4a3a', p.n >= 12); if (Main.settings.shake) S.shake = Math.min(14, 4 + p.n * 0.5); }
        if (p.blocked > 0) float(LP.x + 70, LP.y - 150, '막음 ' + p.blocked, C.blue);
        if (p.n > 0 || p.blocked > 0) effect(p.tag === 'melee' ? 'slash' : 'burst', LP.x, LP.y - 90, LP.x, LP.y - 90, 300, '#ffb0a0');
        break;
      case 'enemyAct': {
        e = V.enemies[p.enemyIdx]; if (!e) break;
        var it = p.intent || {};
        if (it.kind === 'atk') {
          e.pose = 'attack'; e.poseT = 0;
          ec = enemyCenter(p.enemyIdx);
          if (it.tag === 'gun') { effect('muzzle', ec.x - 60, ec.y - 10, ec.x - 60, ec.y - 10, 300); effect('bullet', ec.x - 60, ec.y - 10, LP.x + 20, LP.y - 110, 180); }
          else if (it.tag === 'bow') effect('arrowL', ec.x - 40, ec.y - 20, LP.x + 20, LP.y - 110, 220);
        } else e.flash = Math.max(e.flash, 0.4);
        break;
      }
      case 'block': if (p.wall) V.wall = p.after; else V.block = p.after; if (p.n > 0) { float(LP.x - 40, LP.y - 160, (p.wall ? '성벽 +' : '진형 +') + p.n, C.blue); effect('shield', LP.x, LP.y - 90, LP.x, LP.y - 90, 360); } break;
      case 'push': V.dist = p.to; break;
      case 'heal': V.hp = p.hpAfter; float(LP.x, LP.y - 200, '+' + p.n, C.green); break;
      case 'energy': V.energy = p.after; break;
      case 'ration': V.ration = p.after; break;
      case 'suspicion': V.susp = p.after; if (p.n > 0) float(860, 60, '의심 +' + p.n, '#ff8a6a'); break;
      case 'enemyDeath': e = ensureE(p.enemyIdx); if (e) { e.dead = true; e.hp = 0; ec = enemyCenter(p.enemyIdx); effect('burst', ec.x, ec.y, ec.x, ec.y, 500, '#ffd25a'); } break;
      case 'spawn': e = ensureE(p.enemyIdx); if (e) { e.hp = p.hp; e.maxHp = p.maxHp; e.alpha = 0; } break;
      case 'wave':
        p.enemies.forEach(function (q) { var ee = ensureE(q.enemyIdx); if (ee) { ee.hp = q.hp; ee.maxHp = q.maxHp; ee.alpha = 0; } });
        banner(p.intro || (p.idx + '번째 파도'), true, 'enemy');
        break;
      case 'banner': banner(p.text, true); break;
      case 'tide': V.tide = { phase: p.phase, left: p.left }; break;
      case 'rescue': V.hp = p.hpAfter; banner(p.text, true, 'ally'); break;
      case 'enemyBlock': e = ensureE(p.enemyIdx); if (e) e.block = p.after; break;
      case 'enemyWall': V.enemyWall = p.after; break;
      case 'resist': ec = enemyCenter(p.enemyIdx); float(ec.x, ec.y - 80, '버텼다!', C.goldL); break;
      case 'log': V.log.push(p.text); if (V.log.length > 40) V.log.shift(); break;
      default: break;
    }
  }
  function syncView() {
    var st = S.st, V = S.V;
    V.hp = st.player.hp; V.maxHp = st.player.maxHp; V.block = st.player.block; V.wall = st.player.wall;
    V.energy = st.player.energy; V.energyMax = Math.max(st.player.energyMax, B.ENERGY); V.ration = st.ration; V.susp = st.suspicion;
    V.dist = st.dist; V.enemyWall = st.enemyWall; V.tide = st.tide ? { phase: st.tide.phase, left: st.tide.left } : null; V.turn = st.turn;
    V.handUids = st.hand.map(function (h) { return h.uid; });
    st.enemies.forEach(function (e, i) { var ve = ensureE(i); ve.hp = Math.max(0, e.hp); ve.maxHp = e.maxHp; ve.block = e.block; if (e.dead) ve.dead = true; });
  }
  function pumpQueue(dt) {
    var fast = Main.settings.fast;
    S.wait -= dt * (fast ? 1000 : S.speed);
    var guard = 0;
    while ((fast || S.wait <= 0) && S.Q.length && guard++ < 400) {
      var p = S.Q.shift();
      applyFx(p);
      S.wait += fast ? 0 : (DUR[p.kind] || 0);
    }
    if (!S.Q.length) { if (S.wait < 0) S.wait = 0; if (S.wait === 0) { syncView(); S.speed = 1; } }
  }
  function idle() { return S && !S.Q.length && S.wait <= 0; }

  /* ---------------------------------------------------------------- 조회(캐시) */
  function findInst(uid) {
    var st = S.st, piles = [st.hand, st.draw, st.discard, st.exhaust];
    for (var p = 0; p < piles.length; p++) for (var i = 0; i < piles[p].length; i++) if (piles[p][i].uid === uid) return piles[p][i];
    if (st.playing && st.playing.uid === uid) return st.playing;
    return null;
  }
  function intents() {
    if (!S.cache.intents) {
      var list = (S.st.phase === 'player') ? Combat.intentPreview(S.st) : [];
      var by = {}, total = 0;
      list.forEach(function (r) { (by[r.enemyIdx] = by[r.enemyIdx] || []).push(r); if (r.dmg) total += r.dmg; });
      S.cache.intents = { by: by, total: total };
    }
    return S.cache.intents;
  }
  function info(i) { var k = 'info' + i; if (!S.cache[k]) S.cache[k] = Combat.cardInfo(S.st, i); return S.cache[k]; }
  function preview(i, t) {
    var k = 'pv' + i + ':' + t;
    if (!S.cache[k]) S.cache[k] = Combat.preview(S.st, i, t < 0 ? null : t);
    return S.cache[k];
  }
  function aliveIdx() { return Combat.alive(S.st); }
  function defaultTarget() {
    var al = aliveIdx();
    if (S.target >= 0 && al.indexOf(S.target) >= 0) return S.target;
    return al.length ? al[0] : -1;
  }

  /* ---------------------------------------------------------------- 조작 */
  function canAct() { return S && S.st.phase === 'player' && idle() && !S.overlay && !S.finished; }
  function toast(t) { S.toast = { text: t, t: 0 }; }
  function tryPlay(i, t) {
    if (!canAct()) return false;
    var inf = info(i);
    if (!inf.playable) { toast(inf.reason || '낼 수 없다'); try { Audio_.sfx('button'); } catch (e) { /* */ } return false; }
    var tgt = inf.needsTarget ? (t != null && t >= 0 ? t : defaultTarget()) : null;
    act(function () { return Combat.play(S.st, i, tgt); });
    S.sel = -1; S.detail = -1;
    return true;
  }
  function selectCard(i) {
    if (!canAct()) return;
    if (S.sel === i) {
      var inf = info(i);
      if (!inf.needsTarget || Input.isTouch) { tryPlay(i, inf.needsTarget ? defaultTarget() : null); return; }
    }
    S.sel = i; S.detail = Input.isTouch ? i : -1;
    var inf2 = info(i);
    if (!inf2.playable) { toast(inf2.reason || '낼 수 없다'); return; }
    if (!Input.isTouch && !inf2.needsTarget) tryPlay(i, null);
  }
  function endTurn() {
    if (!S || S.st.phase !== 'player' || S.overlay || S.finished) return;
    S.sel = -1; S.detail = -1;
    if (!idle()) { S.endReq = true; S.endWait = 0; return; }
    doEndTurn();
  }
  function doEndTurn() {
    if (!Main.settings.fast) banner('적군 차례', false, 'enemy');
    act(function () { return Combat.endTurn(S.st); });
  }
  function keys() {
    if (!S || S.finished) return;
    if (S.overlay) { if (Input.key('Escape') || Input.key('KeyD')) S.overlay = null; return; }
    for (var d = 0; d < 10; d++) {
      if (Input.key('Digit' + ((d + 1) % 10))) {
        var i = d; if (i < S.st.hand.length && canAct()) { if (S.sel === i) tryPlay(i, defaultTarget()); else { S.sel = i; if (!info(i).playable) toast(info(i).reason); } }
      }
    }
    if (Input.key('Tab')) { var al = aliveIdx(); if (al.length) { var k = al.indexOf(S.target); S.target = al[(k + 1) % al.length]; } }
    if (Input.key('Enter') && S.sel >= 0) tryPlay(S.sel, defaultTarget());
    if (Input.key('Escape')) { S.sel = -1; S.detail = -1; }
    if (Input.key('Space') || Input.key('KeyE')) endTurn();
    if (Input.key('KeyD')) S.overlay = { kind: 'piles', tab: 'draw', scroll: 0 };
  }

  /* ---------------------------------------------------------------- 갱신 */
  function update(dt) {
    if (!S) return;
    S.t += dt;
    pumpQueue(dt);
    if (Input.p.justDown && !idle() && !S.finished) S.speed = 3;
    if (S.endReq) { S.endWait += dt; if (idle() || S.endWait > B.FX_WAIT_MAX_MS) { if (!idle()) { while (S.Q.length) applyFx(S.Q.shift()); S.wait = 0; syncView(); } S.endReq = false; doEndTurn(); } }
    var V = S.V;
    V.distAnim += (V.dist - V.distAnim) * Math.min(1, dt / 160);
    V.enemies.forEach(function (e) {
      if (!e) return;
      e.flash = Math.max(0, e.flash - dt / 260);
      e.poseT += dt; if (e.poseT > 320) e.pose = 'idle';
      e.alpha = e.dead ? Math.max(0, e.alpha - dt / 600) : Math.min(1, e.alpha + dt / 300);
    });
    S.pose.t += dt; if (S.pose.t > 360 && S.pose.kind !== 'win' && S.pose.kind !== 'down') S.pose = { kind: 'idle', t: 0 };
    S.floats = S.floats.filter(function (f) { f.t += dt; return f.t < 1100; });
    S.flyers = S.flyers.filter(function (f) { f.t += dt; return f.t < 420; });
    S.fxs = S.fxs.filter(function (f) { f.t += dt; return f.t < f.dur; });
    S.banners = S.banners.filter(function (b) { b.t += dt; return b.t < b.dur; });
    if (S.banners.length > 2) S.banners.splice(0, S.banners.length - 2);
    S.shake = Math.max(0, S.shake - dt / 30);
    if (S.toast) { S.toast.t += dt; if (S.toast.t > 1600) S.toast = null; }
    if (S.st.phase === 'rescue' && idle()) { S.rescueT += dt; if (S.rescueT > B.RESCUE_AUTO_MS) chooseRescue(S.st.rescue.pending[0]); } else S.rescueT = 0;
    if (S.st.phase === 'done' && idle() && !S.finished) {
      if (!S.endPose) { S.endPose = true; S.pose = { kind: S.st.won ? 'win' : 'down', t: 0 }; S.banners = []; if (S.st.won) makeConfetti(); }
      S.doneT += dt;
      if (S.confetti) S.confetti.forEach(function (p) {   // 승리 화면이 떠 있는 동안 계속 내린다
        p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy = Math.min(0.26, p.vy + dt * 0.0001); p.a += p.va * dt;
        if (p.y > H + 20) { p.y = -20 - Math.random() * 60; p.x = Math.random() * W; p.vy = 0.06 + Math.random() * 0.1; }
      });
      if (!S.hold && S.doneT > (Main.settings.fast ? 500 : 1800)) { finish(); return; }
    }
    keys();
  }
  function chooseRescue(id) { if (S.st.phase === 'rescue') act(function () { return Combat.chooseRescue(S.st, id); }); }
  function finish() {
    if (!S || S.finished) return;
    S.finished = true;
    var res = Combat.result(S.st), cb = S.onDone;
    stop();
    if (cb) cb(res);
  }
  // hold: 끝난 상태로만 두고 끝내지 않는다(승리·패배 화면을 찍을 때). 화면을 누르면 그때 끝난다
  function debugEnd(win, skip, hold) {
    if (!S) return;
    var st = S.st;
    if (win) { st.enemies.forEach(function (e) { e.dead = true; e.hp = 0; }); st.won = true; } else { st.player.hp = 0; st.won = false; }
    st.phase = 'done'; S.Q = []; S.wait = 0; syncView();
    if (hold) { S.hold = true; S.doneT = 0; return; }
    finish();
  }
  function makeConfetti() {
    var cols = [C.goldL, C.gold, C.dcGreen, C.dcRed, C.dcWhite, C.dcBlue], out = [];
    for (var i = 0; i < 90; i++) out.push({ x: Math.random() * W, y: -20 - Math.random() * 420, vx: (Math.random() - 0.5) * 0.06, vy: 0.08 + Math.random() * 0.12,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 0.012, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, col: cols[i % cols.length], t: 0 });
    S.confetti = out;
  }

  /* ================================================================ 그리기 */
  function draw(c) {
    if (!S) { c.fillStyle = C.bg; c.fillRect(0, 0, W, H); return; }
    var st = S.st, showResult = st.phase === 'done' && idle();
    S.tips = [];
    c.save();
    if (S.shake > 0) c.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
    var bg = background(st.type, st.terrain);
    if (bg) c.drawImage(bg, 0, 0); else { c.fillStyle = '#5a7a9a'; c.fillRect(0, 0, W, H); }
    if (st.type === 'naval') {
      c.strokeStyle = 'rgba(230,245,255,.22)'; c.lineWidth = 2;
      for (var wv = 0; wv < 8; wv++) { var yy = 330 + wv * 28, ph = S.t / 700 + wv; c.beginPath(); for (var xx = 0; xx <= W; xx += 24) c.lineTo(xx, yy + Math.sin(xx / 60 + ph) * 3); c.stroke(); }
    }
    drawPlayer(c, showResult);
    drawGauge(c);
    drawEnemies(c);
    drawEffects(c);
    c.restore();
    drawTop(c);
    // 손패 받침
    var hg = c.createLinearGradient(0, 486, 0, H); hg.addColorStop(0, 'rgba(10,18,24,0)'); hg.addColorStop(0.25, 'rgba(10,18,24,.72)'); hg.addColorStop(1, 'rgba(6,12,16,.92)');
    c.fillStyle = hg; c.fillRect(0, 486, W, H - 486);
    drawStats(c);
    drawLog(c);
    drawHand(c);
    drawPilesAndButtons(c);
    drawFlyersFloats(c);
    drawTutorial(c);
    drawBanners(c);
    if (S.detailIdx >= 0 && !S.drag) drawDetail(c, S.detailIdx);
    else S.tips.forEach(function (t) { tooltip(c, t[0], t[1], t[2], t[3], t[4]); });
    if (st.phase === 'choose' && idle()) drawChoose(c);
    if (st.phase === 'rescue' && idle()) drawRescue(c);
    if (S.overlay && S.overlay.kind === 'piles') drawPiles(c);
    if (showResult) drawResult(c);
    if (S.toast) {
      var a = S.toast.t < 1200 ? 1 : 1 - (S.toast.t - 1200) / 400;
      c.save(); c.globalAlpha = Math.max(0, a); panel(c, W / 2 - 180, 456, 360, 40, { r: 20, c1: '#8a2018', c2: '#5a120c' });
      txt(c, S.toast.text, W / 2, 477, { size: 16, align: 'center', base: 'middle', weight: 'bold' }); c.restore();
    }
  }
  function nodeInfo() { var n = S.req.nodeId && MAPDATA.nodes.byId[S.req.nodeId]; return n || null; }
  var RELIC_ICON = { turtle_blueprint: 'turtle', jincheonroe_relic: 'bomb', hwacha_relic: 'cart', nanjung_relic: 'scroll', jingbirok: 'scroll', tonga: 'arrow', hangwae_gun: 'gun',
    obangnang: 'coin', seoae_brush: 'letter', chains: 'chain', joryeong_stone: 'mountain', hansan_drum: 'drum', jinju_drum: 'drum', haengju_ash: 'smoke', jiksan_spear: 'spear',
    myeongnyang_chain: 'chain', tongjeyeong_flag: 'flag' };
  function tip(x, y, title, body, w) { S.tips.push([x, y, title, body, w]); }   // 툴팁은 맨 위에 모아 그린다
  function drawTop(c) {
    var V = S.V, st = S.st, T = X();
    var g = c.createLinearGradient(0, 0, 0, 52); g.addColorStop(0, 'rgba(22,32,38,.96)'); g.addColorStop(1, 'rgba(12,20,25,.94)');
    c.fillStyle = g; c.fillRect(0, 0, W, 52);
    c.fillStyle = C.gold; c.fillRect(0, 52, W, 2);
    var n = nodeInfo(), a = MAPDATA.acts[st.act];
    txt(c, (a ? st.act + '막 ' + a.title : '') + (n ? '  ·  ' + n.name : ''), 16, 23, { size: 16, weight: 'bold', color: C.goldL, maxW: 390 });
    if (n && n.date && T.date) txt(c, T.date(n.date), 16, 42, { size: 12, color: C.dim, maxW: 390 });
    // 턴 (병력은 주장 이름표에만 둔다)
    rr(c, 426, 11, 84, 30, 15); c.fillStyle = 'rgba(46,125,111,.55)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,224,138,.6)'; c.stroke();
    ART.icon(c, 'hourglass', 446, 26, 20);
    txt(c, V.turn + '턴', 482, 27, { size: 16, weight: 'bold', align: 'center', base: 'middle', color: '#fff', stroke: 3 });
    ART.icon(c, 'rice', 538, 26, 26); txt(c, String(V.ration), 554, 33, { size: 19, weight: 'bold', color: '#fff', stroke: 3 });
    Input.zone({ id: 'rationTop', x: 522, y: 8, w: 70, h: 36 });
    if (Input.hover('rationTop')) tip(522, 58, '군량 ' + V.ration, '명군 카드를 낼 때와 시장·군영에서 쓴다.');
    var sx = 626;
    ART.icon(c, 'eye', sx, 26, 28);
    txt(c, '의심', sx + 18, 20, { size: 11, weight: 'bold', color: '#ffb0a0' });
    for (var i = 0; i < 10; i++) {
      var x = sx + 18 + i * 14;
      rr(c, x, 25, 11, 16, 3); c.fillStyle = i < V.susp ? (i >= 6 ? '#ff4a3a' : '#e07a3a') : 'rgba(255,255,255,.12)'; c.fill();
      if (B.SUSP_THRESH.indexOf(i + 1) >= 0) { c.fillStyle = '#ffd27a'; c.fillRect(x + 11.5, 22, 2, 22); }
    }
    Input.zone({ id: 'susp', x: sx - 16, y: 6, w: 180, h: 40 });
    var TH = B.SUSP_THRESH;
    if (Input.hover('susp')) tip(sx - 16, 58, '임금의 의심 ' + V.susp + '/' + B.SUSP_MAX, '공을 세울수록 오른다. ' + TH.join('·') + '을 넘으면 어명 카드가 덱에 섞이고, ' + TH[2] + '이면 부장이 옥에 갇힌다. 장계 카드와 조정에서 내린다.');
    var rx = 820, rmax = W - (V.tide ? 204 : 36);
    (st.relics || []).forEach(function (id, k) {
      var r = GENERALS.relics.byId[id]; if (!r) return;
      var x = rx + k * 34; if (x > rmax) return;
      c.beginPath(); c.arc(x + 15, 26, 15, 0, 7); c.fillStyle = r.curse ? '#5a1a14' : '#1f3a46'; c.fill(); c.lineWidth = 2; c.strokeStyle = st.relicUp[id] ? C.goldL : 'rgba(230,184,74,.7)'; c.stroke();
      ART.icon(c, RELIC_ICON[id] || 'star', x + 15, 26, 22);
      Input.zone({ id: 'relic' + k, x: x, y: 11, w: 30, h: 30 });
      if (Input.hover('relic' + k)) tip(x - 120, 56, r.name + (st.relicUp[id] ? ' (강화)' : ''), r.desc);
    });
    if (V.tide) {
      var flow = V.tide.phase === 'flow';
      panel(c, W - 196, 8, 186, 38, { r: 10, c1: flow ? '#2a6a8a' : '#8a3a2a', c2: flow ? '#173a4f' : '#4f1a12', border: C.goldL });
      ART.icon(c, flow ? 'back' : 'advance', W - 176, 27, 22);
      txt(c, (flow ? '순류' : '역류') + ' · ' + V.tide.left + '턴 뒤 ' + (flow ? '역류' : '순류'), W - 92, 28, { size: 14, align: 'center', base: 'middle', weight: 'bold' });
    }
  }
  function drawPlayer(c, hideLead) {
    var st = S.st, P = st.player, t = S.t, naval = st.type === 'naval', lp = leadPos();
    var deps = P.deputies.slice(); if (P.special) deps.push(P.special);
    if (naval) ART.panokseon(c, SHIP.x, SHIP.y, SHIP.s, { t: t });
    for (var k = deps.length - 1; k >= 0; k--) { var d = depPos(k); if (d) ART.person(c, deps[k], d.x, d.y, d.s, { t: t, phase: k + 1 }); }   // 셋째 자리가 맨 뒤
    if (!hideLead) drawHero(c, S.pose.kind);
    else if (onWall()) parapet(c);
    deps.forEach(function (id, k) {
      var d = depPos(k); if (!d) return;
      var hh = 165 * d.s;
      Input.zone({ id: 'dep' + k, x: d.x - 28, y: d.y - hh, w: 56, h: hh });
      var dd = GENERALS.deputies.byId[id];
      if (Input.hover('dep' + k) && dd) tip(d.x + 30, d.y - hh - 30, dd.name + (id === P.special ? ' — 셋째 자리' : ' — 부장'), dd.passiveDesc || '');
    });
    Input.zone({ id: 'leader', x: lp.x - 40, y: lp.y - 190 * lp.s, w: 80, h: 190 * lp.s });
    if (Input.hover('leader') || Input.hover('leadFrame')) leaderTip();
  }
  // 주장: 발밑의 금빛 기운 + 몸 (+ 성 위라면 앞 여장)
  function drawHero(c, pose) {
    var lp = leadPos(), lead = S.st.player.leader || 'yi';
    c.save(); c.translate(lp.x, lp.y + 2); c.scale(1, 0.26);
    var gg = c.createRadialGradient(0, 0, 6, 0, 0, 84); gg.addColorStop(0, 'rgba(255,224,138,.55)'); gg.addColorStop(1, 'rgba(255,224,138,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(0, 0, 84, 0, 7); c.fill(); c.restore();
    ART.person(c, lead, lp.x, lp.y, lp.s, { t: S.t, pose: pose || 'idle' });
    if (onWall()) parapet(c);
  }
  function parapet(c) {          // 성 위 앞 여장(성가퀴): 사람의 다리를 가린다
    var y = WALL.top;
    c.fillStyle = '#a89c86'; c.fillRect(0, y - 4, WALL.w, 10);
    for (var x = 2; x < WALL.w - 10; x += 40) {
      c.fillStyle = '#b8ad98'; c.fillRect(x, y - 30, 28, 34);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x, y - 30, 28, 4);
      c.strokeStyle = 'rgba(70,52,36,.55)'; c.lineWidth = 2; c.strokeRect(x, y - 30, 28, 34);
      c.fillStyle = 'rgba(40,30,20,.5)'; c.fillRect(x + 12, y - 22, 4, 10);       // 총안
    }
  }
  function leaderTip() {
    var P = S.st.player, lg = GENERALS.leaders.byId[P.leader], lp = leadPos();
    if (lg) tip(lp.x + 60, Math.max(70, lp.y - 220), lg.name + ' — 주장', lg.passiveDesc || '');
  }
  // 주장 이름표: 초상 + 이름 + 받을 피해 + 병력 막대. 그 아래 줄에 진형·성벽 배지와 상태 칩
  function drawStats(c) {
    var st = S.st, V = S.V, P = st.player, Fm = L.frame, lead = P.leader || 'yi';
    var lg = GENERALS.leaders.byId[lead], name = lg ? lg.name : ((ART.NAME_KR && ART.NAME_KR[lead]) || '');
    var inc = (st.phase === 'player' && idle()) ? intents().total : 0;
    var hov = S.sel >= 0 ? S.sel : S.hover, incAfter = null;
    if (hov >= 0 && hov < st.hand.length && st.phase === 'player' && idle()) { var pv = preview(hov, info(hov).needsTarget ? defaultTarget() : -1); incAfter = pv.incomingAfter; }
    c.save();
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
    rr(c, Fm.x, Fm.y, Fm.w, Fm.h, Fm.h / 2);
    var g = c.createLinearGradient(0, Fm.y, 0, Fm.y + Fm.h); g.addColorStop(0, 'rgba(24,52,62,.92)'); g.addColorStop(1, 'rgba(10,22,28,.92)');
    c.fillStyle = g; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,224,138,.8)'; c.stroke();
    c.restore();
    var px = Fm.x + Fm.h / 2, py = Fm.y + Fm.h / 2;
    ART.portrait(c, lead, px, py, Fm.h / 2 - 2, { t: S.t, ring: C.goldL, pose: S.endPose && !st.won ? 'down' : 'idle' });
    var tx = Fm.x + Fm.h + 6;
    txt(c, name, tx, Fm.y + 19, { size: 16, weight: 'bold', color: C.goldL, stroke: 3 });
    c.font = F(16, 'bold'); var nw = c.measureText(clean(name)).width;
    txt(c, '주장', tx + nw + 6, Fm.y + 18, { size: 11, weight: 'bold', color: C.dim });
    if (inc > 0 || incAfter !== null) {
      var better = incAfter !== null && incAfter < inc;
      txt(c, '받을 피해 ' + inc + (incAfter !== null && incAfter !== inc ? ' → ' + incAfter : ''), Fm.x + Fm.w - 14, Fm.y + 19, { size: 13.5, align: 'right', color: better ? C.green : '#ff9a82', weight: 'bold', stroke: 3 });
    }
    bar(c, tx, Fm.y + 25, Fm.x + Fm.w - 14 - tx, 17, V.hp, V.maxHp, V.hp / V.maxHp < 0.3 ? '#d8342a' : '#e04838', { ghost: Math.min(inc, V.hp) });
    Input.zone({ id: 'leadFrame', x: Fm.x, y: Fm.y, w: Fm.w, h: Fm.h });
    var y2 = Fm.y + Fm.h + 18;
    badge(c, Fm.x + 4, y2, 'shield', V.block, '#6cc0ff', 'bBlock', '진형', '적의 공격을 먼저 받아 낸다. 턴이 끝나면 사라진다.');
    var cx = Fm.x + 74;
    if (V.wall > 0 || st.type === 'siege') { badge(c, cx, y2, 'wall', V.wall, '#f2d898', 'bWall', '성벽', '진형보다 먼저 피해를 받는다. 턴이 지나도 남는다.'); cx += 70; }
    chips(c, cx + 6, y2, P.status, P.buffs, 'p', 4);
  }
  function badge(c, x, y, icon, n, col, id, name, desc) {
    ART.icon(c, icon, x + 12, y, 28);
    txt(c, String(n), x + 30, y + 2, { size: 20, color: n > 0 ? col : C.dim2, weight: 'bold', base: 'middle', stroke: 3 });
    if (id) { Input.zone({ id: id, x: x - 2, y: y - 15, w: 60, h: 30 }); if (Input.hover(id)) tip(x, y + 20, name + ' ' + n, desc, 240); }
  }
  var STATUS_ICON = { shaken: 'wave', exposed: 'eye', hunger: 'rice', momentum: 'fire', ambush: 'mountain', ironwall: 'wall', stun: 'zzz', flinch: 'back', loaded: 'hourglass' };
  var BUFF_ICON = { nextAtk: 'drum', atkAdd: 'swords', shotAdd: 'bow', atkPct: 'fire', shotPct: 'arrow', evadeFirst: 'run', hide: 'wall', noAtk: 'hand', noMelee: 'turtle',
    noPushBattle: 'wave', wallPersist: 'wall', chargeAtClose: 'horse', noAdvance: 'hourglass', passivesOff: 'chain', minHp1: 'heart' };
  // 설명의 자리표를 채운다: {n} {pct}, 그리고 상태 설명에 남은 맨 'n'
  function fillDesc(desc, n) {
    var T = X(), pct = Math.round(Math.abs(Number(n) || 0) * 100) + '%', p = { n: n, pct: pct };
    var s = T.fill ? T.fill(String(desc || ''), p) : String(desc || '').replace(/\{(\w+)\}/g, function (m, k) { return p[k] != null ? p[k] : m; });
    return s.replace(/(^|[^A-Za-z])n(?![A-Za-z])/g, '$1' + n);
  }
  function chips(c, x, y, status, buffs, pre, maxN) {
    var T = X(), list = [], mx = maxN || 8;
    for (var k in status) if (status[k] > 0 && k !== 'loaded') {
      var sd = (T.status && T.status[k]) || { name: k, desc: '' };
      list.push({ id: k, n: status[k], name: sd.name, icon: STATUS_ICON[k] || 'star', desc: fillDesc(sd.desc, status[k]), bad: k === 'shaken' || k === 'exposed' || k === 'hunger' || k === 'stun' || k === 'flinch' });
    }
    (buffs || []).forEach(function (b) {
      var d = (T.buff && T.buff[b.id]) || { name: b.id, desc: '' }, frac = b.n && Math.abs(b.n) < 1;
      var when = b.turns === 1 ? ' (이번 턴)' : (b.turns > 1 && b.turns < 90 ? ' (' + b.turns + '턴)' : '');
      var ds = fillDesc(d.desc, b.n);
      list.push({ id: b.id, n: frac ? Math.round(b.n * 100) + '%' : (b.n > 1 ? b.n : ''), name: d.name, icon: BUFF_ICON[b.id] || 'star', desc: ds + (ds && !/[.!]$/.test(ds) ? '.' : '') + when, buff: true });
    });
    list.slice(0, mx).forEach(function (s, i) {
      var cx = x + i * 34;
      c.beginPath(); c.arc(cx + 14, y, 14, 0, 7); c.fillStyle = s.bad ? 'rgba(120,30,20,.92)' : (s.buff ? 'rgba(30,100,80,.92)' : 'rgba(31,59,115,.92)'); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,224,138,.7)'; c.stroke();
      ART.icon(c, s.icon, cx + 14, y, 20);
      if (s.n !== '' && s.n != null) txt(c, String(s.n), cx + 26, y + 11, { size: 11, align: 'center', base: 'middle', color: '#fff', weight: 'bold', stroke: 3 });
      Input.zone({ id: pre + 'st' + i, x: cx, y: y - 14, w: 28, h: 28 });
      if (Input.hover(pre + 'st' + i)) tip(cx, y + 18, s.name + (s.n !== '' && s.n != null ? ' ' + s.n : ''), s.desc || '');
    });
    if (list.length > mx) txt(c, '+' + (list.length - mx), x + mx * 34 + 2, y + 5, { size: 13, weight: 'bold', color: C.goldL, stroke: 3 });
  }
  // 거리 눈금: 세 칸 + 현재 칸 위의 적 투구 표시 + 아래에 배율 칩(활 / 왜군 조총 / 왜검). 칩 글자색: 우리에게 좋으면 초록, 나쁘면 주황
  function drawGauge(c) {
    var V = S.V, G2 = L.gauge, T = X(), names = T.dist || ['원거리', '중거리', '근접'];
    var order = [2, 1, 0], icons = { 0: 'bow', 1: 'spear', 2: 'sword' };
    panel(c, G2.x - 10, G2.y - 28, G2.cw * 3 + 20, G2.ch + 68, { r: 14, c1: 'rgba(28,62,74,.86)', c2: 'rgba(12,28,36,.88)', stripe: false });
    txt(c, '거리', G2.x + 2, G2.y - 10, { size: 12.5, color: C.goldL, weight: 'bold' });
    order.forEach(function (d, k) {
      var x = G2.x + k * G2.cw, cur = Math.round(V.dist) === d;
      rr(c, x + 3, G2.y, G2.cw - 6, G2.ch, 10);
      var g = c.createLinearGradient(0, G2.y, 0, G2.y + G2.ch);
      if (cur) { g.addColorStop(0, '#ffd56a'); g.addColorStop(1, '#d88a20'); } else { g.addColorStop(0, '#2f5563'); g.addColorStop(1, '#1a3440'); }
      c.fillStyle = g; c.fill(); c.lineWidth = cur ? 3 : 1.5; c.strokeStyle = cur ? '#fff2c0' : 'rgba(230,184,74,.4)'; c.stroke();
      ART.icon(c, icons[d], x + G2.cw / 2, G2.y + 22, 30);
      txt(c, names[d], x + G2.cw / 2, G2.y + 50, { size: 14, align: 'center', base: 'middle', color: cur ? '#3a1a08' : '#e8e0c8', weight: 'bold' });
    });
    var mx = G2.x + (2 - V.distAnim) * G2.cw + G2.cw / 2;
    ART.icon(c, 'helm', mx, G2.y - 2, 28, '#c63a2c');
    var d = Math.round(V.dist), M = B.MULT, cy = G2.y + G2.ch + 18;
    var chipsL = [
      { icon: 'bow', v: M.shot[d], good: M.shot[d] > 1, bad: M.shot[d] < 1, ours: true },
      { icon: 'gun', v: M.e_gun[d], good: M.e_gun[d] < 1, bad: M.e_gun[d] > 1 },
      { icon: 'sword', v: M.e_melee[d], good: M.e_melee[d] < 1, bad: M.e_melee[d] > 1 }
    ];
    var cw = 92, gap = 5, x0 = G2.x + (G2.cw * 3 - (cw * 3 + gap * 2)) / 2;
    chipsL.forEach(function (ch, k) {
      var x = x0 + k * (cw + gap);
      rr(c, x, cy - 11, cw, 22, 11); c.fillStyle = 'rgba(8,16,20,.7)'; c.fill();
      c.lineWidth = 1.5; c.strokeStyle = ch.ours ? 'rgba(108,192,255,.8)' : 'rgba(255,120,90,.75)'; c.stroke();
      ART.icon(c, ch.icon, x + 15, cy, 18);
      txt(c, ch.v ? '×' + ch.v : '안 닿음', x + 30, cy + 1, { size: 13, base: 'middle', weight: 'bold', color: ch.good ? C.green : (ch.bad ? '#ffae7a' : '#fff'), stroke: 3, maxW: cw - 34 });
    });
    Input.zone({ id: 'gauge', x: G2.x - 10, y: G2.y - 28, w: G2.cw * 3 + 20, h: G2.ch + 68 });
    if (Input.hover('gauge')) tip(G2.x - 10, G2.y + G2.ch + 44, '거리', '적은 매 턴 한 칸씩 다가온다. 밀어내기 카드로 원거리 쪽으로 되돌린다. 아래 칩은 지금 거리의 피해 배율이다: 파란 테두리는 우리 활, 빨간 테두리는 왜군의 조총과 칼.', 340);
  }
  // 적 줄: 칸 너비를 남는 자리에 맞추고, 거리 흔들림(off)을 더해도 거리 눈금(~696)과 화면 오른쪽을 넘지 않게 묶는다
  function enemyLayout() {
    var st = S.st, V = S.V, vis = [];
    st.enemies.forEach(function (e, i) { var ve = V.enemies[i]; if (!ve) return; if (!ve.dead || ve.alpha > 0.02) vis.push(i); });
    var n = vis.length, gap = n <= 4 ? 10 : 4, lo = 704, hi = 1272;
    var w = n ? Math.min(n <= 4 ? 132 : 96, (hi - lo - Math.max(0, n - 1) * gap) / n) : 132;
    var total = n * w + Math.max(0, n - 1) * gap, off = (1 - V.distAnim) * 46;
    var x0 = Math.max(lo, Math.min(hi - total, L.enemy.x0 + (L.enemy.x1 - L.enemy.x0 - total) / 2 + off));
    var out = {};
    vis.forEach(function (i, k) {
      var tx = x0 + k * (w + gap) + w / 2;
      var e = st.enemies[i], hgt = ART.enemyHeight(e) * (w / 130) * (ART.isShip(e) ? 0.62 : 0.95);
      var p = S.enemyPos[i];
      if (!p) p = S.enemyPos[i] = { x: tx + 80, y: L.enemy.base - hgt * 0.45 };
      p.x += (tx - p.x) * 0.18; p.y = L.enemy.base - hgt * 0.45;
      out[i] = { cx: p.x, w: w, hgt: hgt };
    });
    return out;
  }
  var INT_ICON = { approach: 'advance', pull: 'advance', block: 'shield', load: 'hourglass', rally: 'flag', build: 'mound', reinforce: 'plus', raid: 'rice', signal: 'drum', flee: 'run', incite: 'scroll', stun: 'zzz', ops: 'star' };
  var INT_KR = { atk: '공격', approach: '접근', pull: '전진', block: '방어', load: '장전', rally: '기합', build: '토산 쌓기', reinforce: '증원', raid: '약탈', signal: '신호', flee: '달아남', incite: '선동', stun: '정지', ops: '특수 행동' };
  var INT_DESC = { approach: '다가와 거리를 좁힌다.', pull: '다가와 거리를 좁힌다.', block: '진형을 쌓아 피해를 막는다.', load: '조총을 재는 중이다. 다음 턴에 쏜다.', rally: '기세를 올려 공격이 세진다.',
    build: '토산을 쌓는다. 다 쌓으면 성벽을 넘어 쏜다.', reinforce: '왜군이 더 몰려온다.', raid: '군량을 빼앗아 간다.', signal: '다음 적 턴의 공격이 세진다.', flee: '싸움을 버리고 달아나려 한다.',
    incite: '백성을 부추겨 임금의 의심을 키운다.', stun: '이번 턴에는 움직이지 못한다.', ops: '' };
  function drawEnemies(c) {
    var st = S.st, V = S.V, lay = enemyLayout(), ints = (st.phase === 'player' && idle()) ? intents() : null, naval = st.type === 'naval';
    var hov = S.sel >= 0 ? S.sel : S.hover, pv = null, needT = false;
    if (hov >= 0 && hov < st.hand.length && st.phase === 'player' && idle()) { needT = info(hov).needsTarget; pv = preview(hov, needT ? (S.hoverEnemy >= 0 ? S.hoverEnemy : defaultTarget()) : -1); }
    var nextHover = -1;
    Object.keys(lay).forEach(function (k) {
      var i = +k, e = st.enemies[i], ve = V.enemies[i], L2 = lay[k], base = L.enemy.base + (ART.isShip(e) ? 14 : 0);
      if (!ve) return;
      var sink = ve.dead ? (1 - ve.alpha) * 40 : 0;
      c.save(); c.translate(0, sink);
      ART.enemy(c, e, L2.cx, base, ART.isShip(e) ? L2.w * 0.62 : L2.w * 0.95, S.t, { alpha: ve.alpha, flash: ve.flash > 0.3, flashK: ve.flash, pose: ve.pose, naval: naval });
      c.restore();
      if (ve.dead) return;
      var zone = { id: 'enemy' + i, x: L2.cx - L2.w / 2, y: base - L2.hgt - 20, w: L2.w, h: L2.hgt + 60 };
      var targeted = S.sel >= 0 && needT;
      if (Input.hover('enemy' + i)) nextHover = i;
      if (targeted && Input.hover('enemy' + i)) { rr(c, zone.x - 2, zone.y, zone.w + 4, zone.h, 14); c.lineWidth = 3; c.strokeStyle = C.goldL; c.stroke(); }
      else if (S.target === i) { ART.icon(c, 'arrow', L2.cx, base + 70, 18); }
      Input.zone({ id: 'enemy' + i, x: zone.x, y: zone.y, w: zone.w, h: zone.h,
        tap: function () { if (S.sel >= 0 && info(S.sel).needsTarget) tryPlay(S.sel, i); else S.target = i; } });
      var ghost = pv && pv.perEnemy[i] ? pv.perEnemy[i] : 0;
      bar(c, L2.cx - L2.w / 2 + 8, base + 10, L2.w - 16, 16, ve.hp, ve.maxHp, '#d83a2a', { ghost: ghost, label: Math.max(0, ve.hp) + '/' + ve.maxHp });
      if (ghost) txt(c, '-' + ghost, L2.cx + L2.w / 2 - 6, base + 4, { size: 17, align: 'right', color: '#ffd27a', weight: 'bold', stroke: 4 });
      if (ve.block > 0) badge(c, L2.cx - L2.w / 2 - 14, base + 18, 'shield', ve.block, '#6cc0ff');
      txt(c, e.name, L2.cx, base + 44, { size: 13, align: 'center', color: e.boss ? C.goldL : '#fff', weight: 'bold', stroke: 3, maxW: L2.w + 16 });
      chips(c, L2.cx - L2.w / 2 + 2, base + 64, e.status, null, 'e' + i, 4);
      if (ints && ints.by[i]) drawIntent(c, e, ints.by[i], L2.cx, base - L2.hgt - 6);
      if (e.resist > 0) { c.beginPath(); c.arc(L2.cx + L2.w / 2 - 12, base - L2.hgt + 26, 11, 0, 7); c.fillStyle = '#5a4a8a'; c.fill(); ART.icon(c, 'shield', L2.cx + L2.w / 2 - 12, base - L2.hgt + 26, 16, '#c8b8ff'); }
    });
    S.hoverEnemy = nextHover;
    if (V.enemyWall > 0) badge(c, L.enemy.x0 - 10, 130, 'wall', V.enemyWall, '#f2d898', 'bEWall', '적 성벽', '왜성의 성벽. 우리 공격을 먼저 받아 낸다.');
  }
  // 의도 말풍선: 아이콘 + 숫자/글. 관통은 붉은 도장 대신 방패를 꿰뚫는 화살 표시, 뜻은 툴팁에만
  function drawIntent(c, e, recs, cx, y) {
    var r = recs[0], T = X();
    var tag = (e.intents[e.intentIdx] && e.intents[e.intentIdx].tag) || 'melee';
    var gun = r.mark === 'fire' || tag === 'gun';
    var ic = r.kind === 'atk' ? (gun ? 'gun' : (tag === 'bow' ? 'bow' : 'sword')) : (INT_ICON[r.kind] || 'star');
    var label = r.dmg != null ? String(r.dmg) : (r.kind === 'approach' || r.kind === 'pull' ? (T.dist ? T.dist[r.nextDist] : '') : (r.kind === 'load' ? '장전' : (r.kind === 'block' ? '방어' : clean(r.text || '') || INT_KR[r.kind] || '')));
    var w = label ? 78 : 42;
    var bob = Math.sin(S.t / 300 + cx) * 2;
    c.save(); c.translate(0, bob);
    rr(c, cx - w / 2, y - 18, w, 32, 16);
    c.fillStyle = r.kind === 'atk' ? '#b8281e' : 'rgba(20,34,42,.92)'; c.fill();
    c.lineWidth = 2.5; c.strokeStyle = r.kind === 'atk' ? '#ffd0a0' : 'rgba(230,184,74,.7)'; c.stroke();
    ART.icon(c, ic, label ? cx - w / 2 + 18 : cx, y - 2, 24);
    if (label) txt(c, label, cx + 12, y - 1, { size: r.dmg != null ? 19 : 13, align: 'center', base: 'middle', color: '#fff', weight: 'bold', stroke: 3, maxW: w - 34 });
    if (r.pierce) {
      var px = cx + w / 2 - 2, py = y - 16;
      c.beginPath(); c.arc(px, py, 10, 0, 7); c.fillStyle = 'rgba(20,34,42,.95)'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#ffd0a0'; c.stroke();
      ART.icon(c, 'shield', px, py, 14, '#9ab8d0');
      c.strokeStyle = '#ffb04a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(px - 8, py + 7); c.lineTo(px + 7, py - 7); c.stroke();
      c.beginPath(); c.moveTo(px + 7, py - 7); c.lineTo(px + 1, py - 6); c.moveTo(px + 7, py - 7); c.lineTo(px + 6, py - 1); c.stroke();
    }
    c.restore();
    Input.zone({ id: 'int' + e.uid, x: cx - w / 2, y: y - 18, w: w, h: 32 });
    if (Input.hover('int' + e.uid)) {
      var title = clean(r.text || '') || INT_KR[r.kind] || '';
      var body = r.kind === 'atk' ? '지금 진형·거리·숨어라를 모두 셈한 값이다' + (r.raw != null && r.raw !== r.dmg ? '(막기 전 ' + r.raw + ')' : '') + '.' + (r.pierce ? ' 관통: 절반은 진형을 뚫고 들어온다.' : '') : (INT_DESC[r.kind] || '');
      tip(cx - 140, y + 20, title + (r.dmg != null ? ' — 받을 피해 ' + r.dmg : ''), body, 270);
    }
  }
  function drawEffects(c) {
    S.fxs.forEach(function (f) {
      var k = Math.min(1, f.t / f.dur), x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k;
      c.save();
      switch (f.kind) {
        case 'arrow': case 'arrowL':
          for (var a = 0; a < 3; a++) { var ox = a * 14 - 14, oy = a * 8 - 8, arc = -Math.sin(k * Math.PI) * 50; c.save(); c.translate(x + ox, y + oy + arc); c.rotate(Math.atan2(f.y1 - f.y0 - 100 * Math.cos(k * Math.PI), f.x1 - f.x0)); ART.icon(c, 'arrow', 0, 0, 26); c.restore(); }
          break;
        case 'ball': c.fillStyle = '#1d1d22'; c.beginPath(); c.arc(x, y - Math.sin(k * Math.PI) * 70, 8, 0, 7); c.fill(); c.fillStyle = 'rgba(255,160,60,.6)'; c.beginPath(); c.arc(x - 6, y - Math.sin(k * Math.PI) * 70, 5, 0, 7); c.fill(); break;
        case 'fire': case 'rocket': ART.icon(c, 'fire', x, y - Math.sin(k * Math.PI) * 60, 30); break;
        case 'rock': c.fillStyle = '#7a6a5a'; c.beginPath(); c.arc(x, y - Math.sin(k * Math.PI) * 80, 7, 0, 7); c.fill(); break;
        case 'bullet': c.strokeStyle = 'rgba(255,240,180,.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (f.x1 - f.x0) * 0.08, y + (f.y1 - f.y0) * 0.08); c.stroke(); break;
        case 'muzzle': c.globalAlpha = 1 - k; ART.icon(c, 'smoke', f.x0 - k * 20, f.y0 - k * 14, 36 + k * 20); if (k < 0.3) { c.fillStyle = '#ffe080'; c.beginPath(); c.arc(f.x0, f.y0, 10, 0, 7); c.fill(); } break;
        case 'slash': ART.slash(c, f.x0, f.y0, 46, k, '#fff'); ART.slash(c, f.x0 + 6, f.y0 + 8, 40, k * 1.1, '#ffd27a'); break;
        case 'burst': ART.burst(c, f.x0, f.y0, 34, f.col, k); break;
        case 'shield': c.globalAlpha = 1 - k; ART.icon(c, 'shield', f.x0, f.y0 - k * 30, 50 + k * 20, '#6cc0ff'); break;
      }
      c.restore();
    });
  }
  function drawLog(c) {
    var lg = S.V.log, last = lg[lg.length - 1];
    if (!last) return;
    txt(c, last, W / 2 + 40, 510, { size: 14, align: 'center', color: '#fff', weight: 'bold', stroke: 3, maxW: 760 });
  }
  function handLayout() {
    var uids = S.V.handUids, n = uids.length, H2 = L.hand, w = H2.w;
    var span = H2.x1 - H2.x0, sp = n > 1 ? Math.min(w + 8, (span - w) / (n - 1)) : 0;
    var total = (n - 1) * sp + w, x0 = H2.x0 + (span - total) / 2;
    return uids.map(function (u, i) {
      var mid = (n - 1) / 2, off = i - mid;
      return { uid: u, i: i, x: x0 + i * sp, y: H2.y + Math.min(8, off * off * 1.2), a: Math.max(-0.08, Math.min(0.08, off * 0.03)), sp: sp };   // 가장자리 카드가 화면 밖으로 잘리지 않게 처짐·기울기를 묶는다
    });
  }
  function drawHand(c) {
    var st = S.st, lay = handLayout(), H2 = L.hand, live = st.phase === 'player' && idle();
    var hovUid = null;
    lay.forEach(function (p) { if (Input.hover('card' + p.uid)) hovUid = p.uid; });
    S.hover = -1;
    lay.forEach(function (p, k) {
      var inst = findInst(p.uid); if (!inst) return;
      var handIdx = live ? st.hand.indexOf(inst) : -1;
      var sel = live && handIdx >= 0 && handIdx === S.sel, hov = hovUid === p.uid;
      if (hov && live) S.hover = handIdx;
      var ty = p.y - (sel ? 46 : (hov ? 30 : 0)), ta = (sel || hov) ? 0 : p.a;
      var pos = S.pos[p.uid];
      if (!pos) pos = S.pos[p.uid] = { x: L.draw.x, y: L.draw.y, a: 0 };
      pos.x += (p.x - pos.x) * 0.25; pos.y += (ty - pos.y) * 0.25; pos.a += (ta - pos.a) * 0.25;
      p.pos = pos; p.inst = inst; p.handIdx = handIdx; p.sel = sel; p.hov = hov;
      var zw = k === lay.length - 1 ? H2.w : Math.max(24, p.sp);
      Input.zone({ id: 'card' + p.uid, x: p.x, y: H2.y - 30, w: zw, h: H2.h + 40,
        tap: function () { if (handIdx >= 0) selectCard(handIdx); },
        long: function () { if (handIdx >= 0) { S.detail = handIdx; S.sel = handIdx; } },
        drag: function (pt) { if (handIdx >= 0 && canAct()) S.drag = { uid: p.uid, idx: handIdx, x: pt.x, y: pt.y }; },
        up: function (pt) {
          if (S.drag && S.drag.uid === p.uid && pt.y < 470) {
            var t = -1; Object.keys(S.enemyPos).forEach(function (k2) { var ep = S.enemyPos[k2]; if (Math.abs(ep.x - pt.x) < 66 && pt.y > ep.y - 170 && pt.y < ep.y + 130 && !st.enemies[k2].dead) t = +k2; });
            tryPlay(S.drag.idx, t >= 0 ? t : null);
          }
          S.drag = null;
        } });
    });
    var top = null;
    lay.forEach(function (p) {
      if (!p.pos) return;
      if (p.sel || p.hov) { top = p; return; }
      drawHandCard(c, p, live);
    });
    if (top) drawHandCard(c, top, live);
    if (S.drag) {
      var inst = findInst(S.drag.uid);
      if (inst) { var cd = CARDS.get(inst.id); drawCard(c, cd, inst.up, Input.p.x - 56, Input.p.y - 80, 112, 160, { alpha: 0.88, glow: Input.p.y < 470 ? C.goldL : null }); }
    }
    var di = S.detail >= 0 ? S.detail : (S.hover >= 0 && !Input.isTouch ? S.hover : -1);
    S.detailIdx = (di >= 0 && di < st.hand.length && live) ? di : -1;
  }
  function drawHandCard(c, p, live) {
    var cd = CARDS.get(p.inst.id), inf = live && p.handIdx >= 0 ? info(p.handIdx) : null;
    c.save();
    c.translate(p.pos.x + L.hand.w / 2, p.pos.y + L.hand.h / 2); c.rotate(p.pos.a);
    var sc = (p.sel || p.hov) ? 1.1 : 1;
    c.scale(sc, sc);
    drawCard(c, cd, p.inst.up, -L.hand.w / 2, -L.hand.h / 2, L.hand.w, L.hand.h, {
      dim: inf ? !inf.playable : !live, glow: p.sel ? C.goldL : (inf && inf.playable && live ? 'rgba(255,224,138,.55)' : null),
      cost: inf ? inf.cost : null, ration: inf ? inf.ration : null, marked: p.inst.marked });
    c.restore();
  }
  function drawDetail(c, i) {
    var st = S.st, inst = st.hand[i], cd = CARDS.get(inst.id), inf = info(i);
    var t = inf.needsTarget ? (S.hoverEnemy >= 0 ? S.hoverEnemy : defaultTarget()) : -1, pv = preview(i, t), extra = [];
    pv.lines.forEach(function (l) { extra.push({ text: (l.label === '진형' || l.label === '성벽' ? l.label : '피해') + ' ' + l.base + (l.final !== l.base ? ' → ' + l.final : '') + (l.note ? '  (' + l.note + ')' : ''), color: l.final > l.base ? '#ffd27a' : (l.final < l.base ? '#ff9a8a' : C.goldL), bold: true }); });
    var inc = intents().total;
    if (pv.incomingAfter !== inc) extra.push({ text: '받을 피해 ' + inc + ' → ' + pv.incomingAfter, color: pv.incomingAfter < inc ? C.green : '#ff8d76', bold: true });
    if (pv.distAfter !== st.dist) extra.push({ text: '거리 ' + (X().dist || [])[st.dist] + ' → ' + (X().dist || [])[pv.distAfter], color: C.blue, bold: true });
    if (!inf.playable) extra.push({ text: inf.reason, color: '#ff8d76', bold: true });
    // 상자는 고른 카드 옆, 손패 띠 안에 바닥을 맞춰 둔다: 적 병력 막대의 예상 피해와 주장 이름표를 가리지 않는다
    var px = S.pos[inst.uid] ? S.pos[inst.uid].x : 500, bx = px + L.hand.w + 14;
    if (bx > W - 356) bx = px - 364;
    cardInfoBox(c, cd, inst.up, Math.max(6, Math.min(W - 356, bx)), 712, 350, extra, true);
  }
  function drawPilesAndButtons(c) {
    var st = S.st, V = S.V, E = L.energy;
    c.save(); c.beginPath(); c.arc(E.x, E.y, E.r, 0, 7);
    var g = c.createRadialGradient(E.x - 12, E.y - 14, 6, E.x, E.y, E.r); g.addColorStop(0, '#ffe28a'); g.addColorStop(0.55, '#f2a020'); g.addColorStop(1, '#9a4a08');
    c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = '#3a1a04'; c.stroke(); c.restore();
    txt(c, V.energy + '/' + V.energyMax, E.x, E.y + 3, { size: 24, align: 'center', base: 'middle', weight: 'bold', stroke: 4, strokeColor: '#5a2a04' });
    txt(c, '군령', E.x, E.y - 52, { size: 14, align: 'center', color: C.goldL, weight: 'bold', stroke: 3 });
    pile(c, 'pdraw', L.draw, PILE_NAME.draw, st.draw.length, 'draw');
    pile(c, 'pdisc', L.disc, PILE_NAME.discard, st.discard.length, 'discard');
    pile(c, 'pexh', L.exh, PILE_NAME.exhaust, st.exhaust.length, 'exhaust');
    var live = st.phase === 'player' && !S.finished;
    button(c, { id: 'endTurn', x: L.end.x, y: L.end.y, w: L.end.w, h: L.end.h, label: ui('endTurn', '턴 종료'), primary: true, enabled: live && !S.overlay,
      sub: live && idle() && intents().total ? '받을 피해 ' + intents().total : null, key: 'Space', tap: endTurn });
  }
  function pile(c, id, r, label, n, tab) {
    var hov = Input.hover(id);
    panel(c, r.x, r.y, r.w, r.h, { r: 10, c1: hov ? '#2f5a6a' : '#1f4250', c2: '#0f2129', border: hov ? C.goldL : 'rgba(230,184,74,.6)', stripe: false });
    txt(c, String(n), r.x + r.w / 2, r.y + r.h / 2 - 5, { size: 20, align: 'center', base: 'middle', weight: 'bold', color: C.goldL, stroke: 3 });
    txt(c, label, r.x + r.w / 2, r.y + r.h - 8, { size: 11, align: 'center', color: C.dim, weight: 'bold' });
    Input.zone({ id: id, x: r.x, y: r.y, w: r.w, h: r.h, tap: function () { S.overlay = { kind: 'piles', tab: tab, scroll: 0 }; } });
  }
  function drawFlyersFloats(c) {
    S.flyers.forEach(function (f) {
      var k = f.t / 420, tx = f.to === 'exhaust' ? L.exh.x : L.disc.x, ty = f.to === 'exhaust' ? L.exh.y : L.disc.y;
      var x = f.x + (640 - 56 - f.x) * Math.min(1, k * 2.2), y = f.y + (300 - f.y) * Math.min(1, k * 2.2);
      if (k > 0.45) { var k2 = (k - 0.45) / 0.55; x = 584 + (tx - 584) * k2; y = 300 + (ty - 300) * k2; }
      var sc = k < 0.45 ? 1 : 1 - (k - 0.45) * 1.3;
      c.save(); c.globalAlpha = f.to === 'exhaust' && k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      c.translate(x + 56, y + 80); c.scale(sc, sc);
      drawCard(c, CARDS.get(f.id), f.up, -56, -80, 112, 160, {}); c.restore();
    });
    S.floats.forEach(function (f) {
      var k = f.t / 1100, pop = k < 0.12 ? 0.6 + k / 0.12 * 0.6 : (k < 0.2 ? 1.2 - (k - 0.12) / 0.08 * 0.2 : 1);
      c.save(); c.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      c.translate(f.x, f.y - k * 50); c.scale(pop, pop);
      txt(c, f.text, 0, 0, { size: f.big ? 36 : 26, align: 'center', base: 'middle', weight: 'bold', color: f.col, stroke: 5, strokeColor: '#2a0a04' });
      c.restore();
    });
  }
  var BANNER_RGB = { ally: ['26,96,86', '#06302a'], enemy: ['160,30,20', '#4a0a04'], gold: ['28,50,96', '#0a1430'] };
  function drawBanners(c) {
    S.banners.forEach(function (b, k) {
      var a = b.t < 200 ? b.t / 200 : (b.t > b.dur - 300 ? (b.dur - b.t) / 300 : 1);
      var hh = b.big ? 32 : 24, y = 182 + k * 64, sc = b.t < 200 ? 0.8 + 0.2 * (b.t / 200) : 1, pal = BANNER_RGB[b.style] || BANNER_RGB.gold;
      c.save(); c.globalAlpha = Math.max(0, a);
      c.translate(W / 2, y); c.scale(sc, sc);
      var g = c.createLinearGradient(-W / 2, 0, W / 2, 0), rgb = 'rgba(' + pal[0] + ',';
      g.addColorStop(0, rgb + '0)'); g.addColorStop(0.22, rgb + '.92)'); g.addColorStop(0.78, rgb + '.92)'); g.addColorStop(1, rgb + '0)');
      c.fillStyle = g; c.fillRect(-W / 2, -hh, W, hh * 2);
      c.fillStyle = C.goldL; c.fillRect(-W * 0.33, -hh, W * 0.66, 2.5); c.fillRect(-W * 0.33, hh - 2.5, W * 0.66, 2.5);
      if (b.style === 'ally') { c.save(); c.beginPath(); c.rect(-W * 0.33, -hh + 3, W * 0.66, 6); c.clip(); dancheong(c, -W * 0.33, -hh + 3, W * 0.66, 0.6); c.restore(); }
      txt(c, b.text, 0, 3, { size: b.big ? 30 : 24, align: 'center', base: 'middle', weight: 'bold', color: '#fff6d8', stroke: 5, strokeColor: pal[1], maxW: W * 0.8 });
      c.restore();
    });
  }
  function drawTutorial(c) {
    var key = S.st.tutorial, T = X();
    if (!key || S.tutorialOff || !T.tutorial || !T.tutorial[key] || S.st.turn > 3) return;
    var lines = T.tutorial[key], w = 640, x = (W - w) / 2, y = 64, h = 30 + lines.length * 26;
    panel(c, x, y, w, h + 6, { r: 14, c1: '#22465a', c2: '#132a38', border: C.goldL });
    ART.icon(c, 'scroll', x + 30, y + 6 + h / 2, 32);
    lines.forEach(function (l, i) { txt(c, l, x + 58, y + 36 + i * 26, { size: 15.5, color: i ? '#fff' : C.goldL, weight: 'bold', maxW: w - 120 }); });
    button(c, { id: 'tutX', x: x + w - 54, y: y + 14, w: 46, h: 34, label: ui('close', '닫기'), size: 12, tap: function () { S.tutorialOff = true; } });
  }
  function dim(c, a) { c.fillStyle = 'rgba(8,6,4,' + (a || 0.72) + ')'; c.fillRect(0, 0, W, H); Input.zone({ id: 'modalBlock', x: 0, y: 0, w: W, h: H }); }
  function drawChoose(c) {
    var ch = S.st.choice; if (!ch) return;
    dim(c);
    var title = ch.kind === 'retrieve' ? '버린 카드에서 손으로 가져올 카드 ' + ch.n + '장' : (ch.kind === 'exhaust' ? '이번 전투에서 소모할 카드 ' + ch.n + '장' : '버릴 카드 ' + ch.n + '장');
    txt(c, title, W / 2, 120, { size: 26, align: 'center', weight: 'bold', color: C.goldL, stroke: 4 });
    var cf = ui('confirm', '확인'), J0 = X().josa;
    txt(c, '카드를 누른 뒤 ' + (J0 && J0.eulrul ? J0.eulrul(cf) : cf + '을') + ' 누른다', W / 2, 150, { size: 14, align: 'center', weight: 'bold', color: C.dim, stroke: 3 });
    var n = ch.candidates.length, cw = 112, gap = 14, per = Math.min(n, 8), x0 = (W - (per * cw + (per - 1) * gap)) / 2;
    ch.candidates.forEach(function (cd, i) {
      var inst = findInst(cd.uid); if (!inst) return;
      var x = x0 + (i % per) * (cw + gap), y = 170 + Math.floor(i / per) * 180, on = S.chooseSel.indexOf(i) >= 0;
      drawCard(c, CARDS.get(cd.id), inst.up, x, y - (on ? 12 : 0), cw, 160, { glow: on ? C.goldL : null });
      Input.zone({ id: 'ch' + i, x: x, y: y, w: cw, h: 160, tap: function () {
        var k = S.chooseSel.indexOf(i);
        if (k >= 0) S.chooseSel.splice(k, 1); else { S.chooseSel.push(i); if (S.chooseSel.length > ch.n) S.chooseSel.shift(); }
      } });
    });
    var ok = S.chooseSel.length === Math.min(ch.n, n);
    button(c, { id: 'chOk', x: W / 2 - 110, y: 560, w: 220, h: 58, label: ui('confirm', '확인'), green: true, enabled: ok,
      tap: function () { var sel = S.chooseSel.slice(); S.chooseSel = []; act(function () { return Combat.choose(S.st, sel); }); } });
  }
  function drawRescue(c) {
    var pend = S.st.rescue.pending || [];
    dim(c, 0.78);
    txt(c, '병력이 다했다. 누가 대신 서는가', W / 2, 160, { size: 30, align: 'center', weight: 'bold', color: C.goldL, stroke: 4 });
    var first = GENERALS.deputies.byId[pend[0]];
    var J = X().josa, fn = first ? first.name : '';
    if (fn) txt(c, Math.ceil((B.RESCUE_AUTO_MS - S.rescueT) / 1000) + '초 뒤 ' + (J && J.iga ? J.iga(fn) : fn) + ' 나선다', W / 2, 200, { size: 15, align: 'center', color: C.dim, weight: 'bold' });
    pend.forEach(function (id, k) {
      var d = GENERALS.deputies.byId[id], x = W / 2 + (k - (pend.length - 1) / 2) * 280, y = 360;
      ART.portrait(c, id, x, y, 80, { t: S.t });
      txt(c, d ? d.name : id, x, y + 112, { size: 22, align: 'center', weight: 'bold', color: '#fff', stroke: 4 });
      txt(c, '영영 떠난다 · 병력 ' + B.RESCUE_HP + '으로 일어선다', x, y + 140, { size: 13.5, align: 'center', color: C.dim, weight: 'bold' });
      Input.zone({ id: 'rs' + k, x: x - 100, y: y - 100, w: 200, h: 260, tap: function () { chooseRescue(id); } });
    });
  }
  function drawPiles(c) {
    var o = S.overlay, st = S.st;
    dim(c, 0.86);
    var tabs = [['draw', PILE_NAME.draw], ['discard', PILE_NAME.discard], ['exhaust', PILE_NAME.exhaust]];
    tabs.forEach(function (t, k) {
      button(c, { id: 'tab' + t[0], x: 370 + k * 184, y: 36, w: 172, h: 50, label: t[1] + ' ' + st[t[0]].length, teal: o.tab === t[0], tap: function () { o.tab = t[0]; o.scroll = 0; } });
    });
    var list = st[o.tab].slice();
    if (o.tab === 'draw') list.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var cw = 104, chh = 148, gap = 12, per = 9, x0 = (W - (per * cw + (per - 1) * gap)) / 2, rows = Math.ceil(list.length / per);
    var maxScroll = Math.max(0, rows * (chh + gap) - 500);
    o.scroll = Math.max(0, Math.min(maxScroll, o.scroll));
    c.save(); c.beginPath(); c.rect(0, 100, W, 520); c.clip();
    list.forEach(function (inst, i) {
      var x = x0 + (i % per) * (cw + gap), y = 110 + Math.floor(i / per) * (chh + gap) - o.scroll;
      if (y > 640 || y < -chh) return;
      drawCard(c, CARDS.get(inst.id), inst.up, x, y, cw, chh, { marked: inst.marked });
    });
    c.restore();
    if (!list.length) txt(c, '비어 있다', W / 2, 340, { size: 18, align: 'center', color: C.dim });
    Input.zone({ id: 'pileScroll', x: 0, y: 100, w: W, h: 520, wheel: function (d) { o.scroll += d; }, drag: function (p, dx, dy) { o.scroll -= dy; } });
    button(c, { id: 'pileClose', x: W / 2 - 100, y: 636, w: 200, h: 56, label: ui('close', '닫기'), tap: function () { S.overlay = null; }, key: 'Esc' });
  }
  // 전투 끝: 화면을 어둡게 한 뒤 그 자리의 주장만 밝게 다시 그린다(둘째 주장을 겹쳐 그리지 않는다). 이기면 'win', 지면 'down'
  function drawResult(c) {
    var won = S.st.won, k = Math.min(1, S.doneT / 400), lp = leadPos(), req = S.req || {};
    c.save(); c.globalAlpha = k;
    c.fillStyle = 'rgba(4,8,12,.55)'; c.fillRect(0, 0, W, H);
    var gl = c.createRadialGradient(lp.x, lp.y - 90, 10, lp.x, lp.y - 90, 210);
    gl.addColorStop(0, won ? 'rgba(255,224,138,.42)' : 'rgba(120,140,170,.25)'); gl.addColorStop(1, 'rgba(255,224,138,0)');
    c.fillStyle = gl; c.fillRect(lp.x - 220, lp.y - 310, 440, 440);
    c.restore();
    drawHero(c, S.pose.kind === 'win' || S.pose.kind === 'down' ? S.pose.kind : (won ? 'win' : 'down'));
    if (won) {
      c.save();
      (S.confetti || []).forEach(function (p) {
        if (p.y < -10 || p.y > H + 10) return;
        c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.t / 180 + p.a)));
        c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
      });
      for (var i = 0; i < 7; i++) {                     // 주장 둘레의 반짝임
        var a = S.t / 900 + i * 0.9, sx = lp.x + Math.cos(a) * (70 + (i % 3) * 16), sy = lp.y - 100 + Math.sin(a * 1.3) * 80, tw = 0.5 + 0.5 * Math.sin(S.t / 160 + i * 2);
        c.globalAlpha = k * tw; c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(sx, sy, 2.5 + tw * 2.5, 0, 7); c.fill();
      }
      c.restore();
    }
    c.save(); c.globalAlpha = k;
    var sc = 0.7 + 0.3 * Math.min(1, S.doneT / 300), head = won ? (req.boss ? '결전 승리!' : '승리!') : '패배';
    c.translate(W / 2 + 70, 290); c.scale(sc, sc);
    txt(c, head, 0, 0, { size: req.boss && won ? 92 : 110, align: 'center', base: 'middle', color: won ? '#ffe08a' : '#ff8a7a', weight: 'bold', stroke: 10, strokeColor: won ? '#5a3404' : '#3a0804' });
    var sub = won ? (req.boss ? '적장을 꺾었다' : (req.elite ? '정예를 꺾었다' : '적을 물리쳤다')) : '진이 무너졌다';
    rr(c, -150, 62, 300, 46, 23); c.fillStyle = won ? 'rgba(26,96,86,.85)' : 'rgba(80,20,16,.85)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,224,138,.8)'; c.stroke();
    txt(c, sub, 0, 86, { size: 24, align: 'center', base: 'middle', color: '#fff', weight: 'bold', stroke: 4 });
    c.restore();
    if (S.doneT > 600) txt(c, '화면을 누르면 계속', W / 2 + 70, 440, { size: 15, align: 'center', color: 'rgba(255,246,230,' + (0.5 + 0.4 * Math.sin(S.t / 300)) + ')', weight: 'bold', stroke: 3 });
    Input.zone({ id: 'resultTap', x: 0, y: 0, w: W, h: H, tap: function () { if (S.doneT > 500) finish(); } });
  }
  var api = {
    start: start, update: update, draw: draw, stop: stop, debugEnd: debugEnd,
    debugAct: function (fn) { if (S) return act(function () { return fn(S.st); }); },
    get view() { return S ? S.V : null; }, get state() { return S ? S.st : null; },
    gfx: { C: C, FONT: FONT, SERIF: SERIF, F: F, clean: clean, rr: rr, txt: txt, wrap: wrap, para: para, paper: paper, panel: panel, scrollPanel: scrollPanel, seal: seal, button: button,
      drawCard: drawCard, cardInfoBox: cardInfoBox, tooltip: tooltip, bar: bar, leaderChar: leaderChar, TYPE_KR: TYPE_KR, dancheong: dancheong, typePill: typePill, PILE_NAME: PILE_NAME },
    selfTest: selfTest
  };
  // clean() 단위 시험 + 데이터 문자열을 clean 에 통과시켰을 때 빈 글이 되는 것이 없는지 본다
  function selfTest() {
    var errors = [], eq = function (a, b) { var r = clean(a); if (r !== b) errors.push('clean(' + a + ') = ' + r + ' ≠ ' + b); };
    eq('「편전(片箭)」을 냈다.', '‘편전’을 냈다.'); eq('권율 — 權慄', '권율'); eq('해전에서 사격(shot) 카드 피해 +2.', '해전에서 사격 카드 피해 +2.');
    eq('받는 사격(gun·bow) 피해 −70%', '받는 사격 피해 −70%'); eq('〔기물〕 통아', '기물 통아'); eq('「必死則生」', ''); eq('옥사(獄死)', '옥사');
    eq('토산을 쌓는다. (2/3)', '토산을 쌓는다. (2/3)'); eq('쇼군 豐臣秀吉', '쇼군'); eq('「신은 바다를 압니다.」', '‘신은 바다를 압니다.’'); eq('이억기 (강화)', '이억기 (강화)');
    if (typeof CARDS !== 'undefined' && CARDS.list) CARDS.list.forEach(function (cd) { ['name', 'desc'].forEach(function (k) { if (cd[k] && !clean(cd[k])) errors.push('빈 글: 카드 ' + cd.id + '.' + k); }); });
    if (typeof ENEMIES !== 'undefined' && ENEMIES.list) ENEMIES.list.forEach(function (en) { if (en.name && !clean(en.name)) errors.push('빈 글: 적 ' + en.id); });
    return { ok: errors.length === 0, errors: errors };
  }
  return api;
})();
