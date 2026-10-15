/* ===== 09_input.js — 즉시 모드 히트존 · 포인터(마우스/터치 통합) · 키 에지 · 회전 좌표 변환 ===== */
// TODO(통합): Main.start()는 루프를 돌리기 전에 Input.init(canvasEl, wrapEl, Main.VIEW)를 한 번 부른다.
//            루프는 Input.begin() → 씬 update → 씬 draw(여기서 Input.zone 등록) → Input.end() 순. end()가 콜백을 부른다.
// TODO(통합): Main은 Core.bus.on('firstInput', function(){ Audio_.init(); })로 오디오를 깨운다. Input은 첫 pointerdown/keydown에서 한 번만 emit 한다.
// TODO(통합): Main.resize가 VIEW.scale/rot 와 #wrap 의 transform(rotate 90deg)을 바꾼다(제1부 resize 방식). Input은 viewRef를 읽기만 한다.
//            toCanvas 는 창 중앙(innerWidth/2, innerHeight/2)을 기준으로 삼으므로 #wrap 은 index.html 처럼 left/top 50% + translate(-50%,-50%) 여야 한다.
// TODO(통합): UIBattle·UIScreens 는 매 프레임 draw 안에서 Input.zone()을 다시 등록한다. drag·up·hover 를 쓰는 영역은 id 필수(없으면 경고 1회, 그 콜백 무시).
//            같은 id 가 여러 개면 나중 등록(위)이 받는다. tap 은 up 지점의 가장 위 영역, up/drag 는 down 영역과 같은 id 의 영역.
// TODO(통합): Input.wheel 과 Input.hover() 는 직전 프레임 end() 의 결과다(한 프레임 지연). 휠은 wheel 콜백이 있는 가장 위 영역이 받고 없으면 Input.wheel 에 남는다.
// TODO(통합): Input.stats.small 은 이번 프레임에 44px(BAL.TAP_MIN) 미만인 tap/long 영역 수다. DESIGN §7.5 「첫 통합에서 44px 측정」에 쓴다.
var Input = (function () { 'use strict';
  /* ------------------------------------------------------------------ 상수 */
  var K = { SLOP: 10, W: 1280, H: 720 };   // SLOP: 톡·길게 판정이 깨지는 이동(캔버스 px). W/H: Main 이 없을 때의 캔버스 크기
  var PREVENT = { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Tab: 1 };

  /* ------------------------------------------------------------------ 상태 */
  // env: init 이 채운다. win 이 없으면(헤드리스·selfTest) cw/ch 를 창 크기로 쓴다.
  var env = { win: null, doc: null, cv: null, wrap: null, view: null, cw: 1280, ch: 720 };
  var clock = function () {
    if (typeof performance !== 'undefined' && performance && performance.now) return performance.now();
    return Date.now();
  };
  var zones = [];            // 이번 프레임에 등록된 영역(등록 순)
  var evq = [];              // 프레임 사이에 쌓인 down/up/cancel
  var cur = { x: 0, y: 0 };  // 이벤트가 갱신하는 최신 위치(캔버스 좌표)
  var ptr = { x: 0, y: 0, down: false, pid: null, touch: false, downX: 0, downY: 0, downT: 0,
    moved: false, longFired: false, downKey: null, lastX: 0, lastY: 0 };
  var fr = { justDown: false, justUp: false, cancel: false, downPos: null, upPos: null, dx: 0, dy: 0, wheel: 0 };
  var wheelBuf = 0;
  var keyBuf = {}, pressed = {}, down = {};
  var hoverId = null, curCursor = '', firstDone = false, warned = {}, pinned = null;   // pinned: QA debugPoint 로 고정한 마우스 위치
  var p = { x: 0, y: 0, down: false, justDown: false, justUp: false, moved: false };

  function warnOnce(key, msg) {
    if (warned[key]) return;
    warned[key] = true;
    if (typeof console !== 'undefined' && console && console.warn) console.warn('[Input] ' + msg);
  }

  /* ------------------------------------------------------------------ 좌표 변환 (제1부 screenToCanvas) */
  function dims() {
    var M = (typeof Main !== 'undefined') ? Main : null;   // 지연 참조(계약 §0.2)
    return { w: (M && M.W) || K.W, h: (M && M.H) || K.H };
  }
  function toCanvas(sx, sy) {
    var d = dims(), v = env.view || { scale: 1, rot: 0 }, s = v.scale || 1;
    var cx0 = (env.win ? env.win.innerWidth : env.cw) / 2, cy0 = (env.win ? env.win.innerHeight : env.ch) / 2;
    if (v.rot === 90) return { x: (sy - cy0) / s + d.w / 2, y: (cx0 - sx) / s + d.h / 2 };
    return { x: (sx - cx0) / s + d.w / 2, y: (sy - cy0) / s + d.h / 2 };
  }

  /* ------------------------------------------------------------------ 원천 이벤트 투입 (DOM 핸들러와 selfTest 가 같은 길을 쓴다) */
  function emitFirst() {
    if (firstDone) return;
    firstDone = true;
    Core.bus.emit('firstInput', {});
  }
  function setTouch() {
    if (api.isTouch) return;
    api.isTouch = true;
    if (env.doc && env.doc.body && env.doc.body.classList) env.doc.body.classList.add('touch');
  }
  function feedDown(cx, cy, touch, pid) {
    if (ptr.pid !== null && pid !== ptr.pid) return false;   // 멀티터치: 첫 손가락만
    ptr.pid = pid; ptr.touch = !!touch;
    if (touch) setTouch();
    var c = toCanvas(cx, cy); cur.x = c.x; cur.y = c.y;
    evq.push({ k: 'down', x: c.x, y: c.y, t: clock() });
    emitFirst();
    return true;
  }
  function feedMove(cx, cy, pid, touch) {
    if (pinned || (ptr.pid !== null && pid !== ptr.pid)) return;
    if (touch !== undefined) ptr.touch = !!touch;
    var c = toCanvas(cx, cy); cur.x = c.x; cur.y = c.y;
  }
  function feedUp(cx, cy, pid) {
    if (ptr.pid === null || pid !== ptr.pid) return;
    ptr.pid = null;
    var c = toCanvas(cx, cy); cur.x = c.x; cur.y = c.y;
    evq.push({ k: 'up', x: c.x, y: c.y, t: clock() });
  }
  function feedCancel() {
    if (ptr.pid === null) return;
    ptr.pid = null;
    evq.push({ k: 'cancel', x: cur.x, y: cur.y, t: clock() });
  }
  function feedWheel(delta) { wheelBuf += delta || 0; }
  function keyCode(e) {
    if (e.code) return e.code;
    var k = e.key || '';
    if (k === ' ' || k === 'Spacebar') return 'Space';
    if (k === 'Esc') return 'Escape';
    if (k.length === 1) return /[0-9]/.test(k) ? 'Digit' + k : /[a-z]/i.test(k) ? 'Key' + k.toUpperCase() : k;
    return k;   // 'Enter' 'Escape' 'Tab' 'ArrowUp' …
  }
  function feedKey(code, isDown, e) {
    if (!code) return;
    if (PREVENT[code] && e && e.preventDefault) e.preventDefault();
    if (isDown) {
      if (!down[code]) keyBuf[code] = true;   // 에지는 눌리는 순간 한 번(repeat 무시)
      down[code] = true;
      emitFirst();
    } else down[code] = false;
  }

  /* ------------------------------------------------------------------ init: DOM 은 여기서만 만진다 */
  function init(canvasEl, wrapEl, viewRef) {
    var win = (typeof window !== 'undefined') ? window : null;
    env.win = win; env.doc = win ? win.document : null;
    env.cv = canvasEl || null; env.wrap = wrapEl || null; env.view = viewRef || { scale: 1, rot: 0 };
    if (!win) return;
    var coarse = false;
    try { coarse = !!(win.matchMedia && win.matchMedia('(pointer: coarse)').matches); } catch (_) { coarse = false; }
    if (coarse) { setTouch(); ptr.touch = true; }
    var NP = { passive: false }, cv = canvasEl || win;
    var pid = function (e) { return e.pointerId !== undefined ? e.pointerId : 'm'; };
    var isT = function (e) { return e.pointerType === 'touch' || e.pointerType === 'pen'; };
    if (win.PointerEvent && canvasEl) {
      canvasEl.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;   // 오른쪽·가운데 단추 무시
        if (feedDown(e.clientX, e.clientY, isT(e), pid(e))) { try { canvasEl.setPointerCapture(e.pointerId); } catch (_) { /* 무해 */ } }
        if (e.cancelable) e.preventDefault();
      }, NP);
      win.addEventListener('pointermove', function (e) { feedMove(e.clientX, e.clientY, pid(e), isT(e)); });
      win.addEventListener('pointerup', function (e) { if (e.button <= 0) feedUp(e.clientX, e.clientY, pid(e)); });
      win.addEventListener('pointercancel', function (e) { if (pid(e) === ptr.pid) feedCancel(); });
    } else {   // 구형: 마우스 + 터치. touchstart 의 preventDefault 가 합성 마우스 이벤트를 막는다
      cv.addEventListener('mousedown', function (e) { if (e.button === 0) { feedDown(e.clientX, e.clientY, false, 'm'); e.preventDefault(); } });
      win.addEventListener('mousemove', function (e) { feedMove(e.clientX, e.clientY, 'm', false); });
      win.addEventListener('mouseup', function (e) { if (e.button === 0) feedUp(e.clientX, e.clientY, 'm'); });
      var each = function (e, fn) { var L = e.changedTouches || []; for (var i = 0; i < L.length; i++) fn(L[i]); };
      cv.addEventListener('touchstart', function (e) { each(e, function (t) { feedDown(t.clientX, t.clientY, true, t.identifier); }); if (e.cancelable) e.preventDefault(); }, NP);
      win.addEventListener('touchmove', function (e) { each(e, function (t) { feedMove(t.clientX, t.clientY, t.identifier, true); }); if (e.cancelable) e.preventDefault(); }, NP);
      win.addEventListener('touchend', function (e) { each(e, function (t) { feedUp(t.clientX, t.clientY, t.identifier); }); });
      win.addEventListener('touchcancel', function (e) { each(e, function (t) { if (t.identifier === ptr.pid) feedCancel(); }); });
    }
    cv.addEventListener('wheel', function (e) {
      var d = e.deltaY || 0;
      if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= 400;   // 줄·쪽 단위를 px 로
      var c = toCanvas(e.clientX, e.clientY); cur.x = c.x; cur.y = c.y;
      feedWheel(d);
      if (e.cancelable) e.preventDefault();
    }, NP);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // 길게 누르기가 메뉴를 띄우지 않게
    win.addEventListener('keydown', function (e) { feedKey(keyCode(e), true, e); });
    win.addEventListener('keyup', function (e) { feedKey(keyCode(e), false, e); });
    win.addEventListener('blur', function () { down = {}; keyBuf = {}; feedCancel(); });
  }

  /* ------------------------------------------------------------------ 히트존 */
  function zone(s) {
    if (!s) return null;
    var z = { id: (s.id !== undefined && s.id !== null) ? String(s.id) : null,
      x: +s.x || 0, y: +s.y || 0, w: +s.w || 0, h: +s.h || 0,
      tap: s.tap || null, long: s.long || null, down: s.down || null, drag: s.drag || null, up: s.up || null,
      wheel: s.wheel || null, cursor: s.cursor || null, enabled: s.enabled !== false };
    if (!z.id && (z.drag || z.up)) {
      warnOnce('noid:' + z.x + ',' + z.y + ',' + z.w + ',' + z.h, 'zone: drag/up 을 쓰는 영역에는 id 가 필요하다 (' + z.x + ',' + z.y + ' ' + z.w + '×' + z.h + ')');
      z.drag = null; z.up = null;
    }
    if ((z.tap || z.long) && z.enabled && (z.w < Core.BAL.TAP_MIN || z.h < Core.BAL.TAP_MIN)) api.stats.small++;
    zones.push(z);
    api.stats.zones++;
    return z;
  }
  function inside(z, x, y) { return x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h; }
  function hitAt(x, y) {   // 가장 위(나중 등록) 영역. enabled:false 도 돌려준다(가리기용) — 호출 쪽이 enabled 를 본다
    for (var i = zones.length - 1; i >= 0; i--) if (inside(zones[i], x, y)) return zones[i];
    return null;
  }
  function byId(id) {
    for (var i = zones.length - 1; i >= 0; i--) if (zones[i].id === id && zones[i].enabled) return zones[i];
    return null;
  }
  function wheelAt(x, y) {   // 휠은 wheel 콜백이 있는 영역만 본다(위 영역이 가리지 않는다)
    for (var i = zones.length - 1; i >= 0; i--) if (zones[i].enabled && zones[i].wheel && inside(zones[i], x, y)) return zones[i];
    return null;
  }

  /* ------------------------------------------------------------------ 프레임 */
  function begin() {
    pressed = keyBuf; keyBuf = {};
    zones = []; api.stats.zones = 0; api.stats.small = 0;
    fr.justDown = false; fr.justUp = false; fr.cancel = false; fr.downPos = null; fr.upPos = null;
    for (var i = 0; i < evq.length; i++) {
      var e = evq[i];
      if (e.k === 'down') {
        ptr.down = true; ptr.downX = e.x; ptr.downY = e.y; ptr.downT = e.t; ptr.lastX = e.x; ptr.lastY = e.y;
        ptr.moved = false; ptr.longFired = false; ptr.downKey = null;
        fr.justDown = true; fr.downPos = { x: e.x, y: e.y };
      } else {
        ptr.down = false; fr.justUp = true; fr.upPos = { x: e.x, y: e.y };
        if (e.k === 'cancel') fr.cancel = true;   // 취소는 up 이되 tap 은 아니다
      }
    }
    evq.length = 0;
    ptr.x = cur.x; ptr.y = cur.y;
    if (fr.justUp && !ptr.down) { ptr.x = fr.upPos.x; ptr.y = fr.upPos.y; }
    fr.dx = ptr.x - ptr.lastX; fr.dy = ptr.y - ptr.lastY; ptr.lastX = ptr.x; ptr.lastY = ptr.y;
    if ((ptr.down || fr.justUp) && !ptr.moved) {
      var mx = ptr.x - ptr.downX, my = ptr.y - ptr.downY;
      if (mx * mx + my * my > K.SLOP * K.SLOP) ptr.moved = true;
    }
    fr.wheel = wheelBuf; wheelBuf = 0;
    p.x = ptr.x; p.y = ptr.y; p.down = ptr.down; p.justDown = fr.justDown; p.justUp = fr.justUp; p.moved = ptr.moved;
  }

  function end() {
    var z, now = clock();
    // 1. down — down 지점의 가장 위 영역. 그 id 가 이번 누름의 주인이 된다
    if (fr.justDown) {
      z = hitAt(fr.downPos.x, fr.downPos.y);
      ptr.downKey = (z && z.enabled) ? z.id : null;
      if (z && z.enabled && z.down) z.down(p);
    }
    // 2. drag — SLOP 을 넘은 뒤 움직인 프레임마다, down 영역과 같은 id 로 다시 등록된 영역에
    if (ptr.downKey && ptr.moved && (fr.dx || fr.dy) && (ptr.down || fr.justUp)) {
      z = byId(ptr.downKey);
      if (z && z.drag) z.drag(p, fr.dx, fr.dy);
    }
    // 3. long — 움직이지 않고 LONG_PRESS_MS. 1회. 그 뒤 tap 은 없다
    if (ptr.down && !ptr.moved && !ptr.longFired && now - ptr.downT >= Core.BAL.LONG_PRESS_MS) {
      ptr.longFired = true;
      z = ptr.downKey ? byId(ptr.downKey) : hitAt(ptr.x, ptr.y);
      if (z && z.enabled && z.long) z.long(p);
    }
    // 4. up → tap
    if (fr.justUp) {
      if (ptr.downKey) { z = byId(ptr.downKey); if (z && z.up) z.up(p); }
      if (!fr.cancel && !ptr.moved && !ptr.longFired) {
        z = hitAt(fr.upPos.x, fr.upPos.y);
        if (z && z.enabled && z.tap) z.tap(p);
      }
      ptr.downKey = null;
    }
    // 5. wheel
    if (fr.wheel) {
      z = wheelAt(ptr.x, ptr.y);
      if (z) { z.wheel(fr.wheel); api.wheel = 0; } else api.wheel = fr.wheel;
    } else api.wheel = 0;
    // 6. hover·커서 (마우스일 때만)
    var hz = ptr.touch ? null : hitAt(ptr.x, ptr.y);
    hoverId = (hz && hz.enabled && hz.id) ? hz.id : null;
    var cursor = 'default';
    if (hz && hz.enabled) cursor = hz.cursor || ((hz.tap || hz.down || hz.drag) ? 'pointer' : 'default');
    if (env.cv && env.cv.style && cursor !== curCursor) { curCursor = cursor; env.cv.style.cursor = cursor; }
  }

  /* ------------------------------------------------------------------ 키 */
  function key(code) { return !!pressed[code]; }
  function keyDown(code) { return !!down[code]; }
  function consumeKey(code) { var h = !!pressed[code]; pressed[code] = false; return h; }
  function hover(zoneId) { return hoverId !== null && hoverId === String(zoneId); }

  function reset() {
    zones = []; evq.length = 0; wheelBuf = 0; keyBuf = {}; pressed = {}; down = {};
    cur.x = cur.y = 0; hoverId = null; api.wheel = 0; pinned = null;
    ptr.x = ptr.y = ptr.downX = ptr.downY = ptr.downT = ptr.lastX = ptr.lastY = 0;
    ptr.down = false; ptr.pid = null; ptr.moved = false; ptr.longFired = false; ptr.downKey = null;
    fr.justDown = fr.justUp = fr.cancel = false; fr.downPos = fr.upPos = null; fr.dx = fr.dy = fr.wheel = 0;
    p.x = p.y = 0; p.down = p.justDown = p.justUp = p.moved = false;
  }

  /* ------------------------------------------------------------------ selfTest: 가짜 이벤트로 tap/long/drag/가림/키/휠/회전 변환 검증 (DOM 불필요) */
  function selfTest() {
    var errors = [], saved = { env: env, clock: clock, firstDone: firstDone, touch: ptr.touch, isTouch: api.isTouch, cursor: curCursor };
    var T = 0, log = [];
    function check(c, m) { if (!c) errors.push(m); }
    function near(a, b) { return Math.abs(a - b) < 1e-6; }
    function frame(t, reg) { T = t; begin(); if (reg) reg(); end(); }
    function Z(id, extra) {
      var o = { id: id, x: 100, y: 100, w: 100, h: 100, tap: function () { log.push('tap:' + id); } };
      for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
      return o;
    }
    clock = function () { return T; };
    env = { win: null, doc: null, cv: { style: {} }, wrap: null, view: { scale: 1, rot: 0 }, cw: 1280, ch: 720 };   // 창 1280×720·배율 1 → 화면 = 캔버스
    reset(); firstDone = false; ptr.touch = false; api.isTouch = false; curCursor = '';
    try {
      // 1. 좌표 변환 — 가로
      var c = toCanvas(100, 200);
      check(near(c.x, 100) && near(c.y, 200), 'toCanvas 가로 배율 1: ' + JSON.stringify(c));
      env.view.scale = 0.5; c = toCanvas(690, 385);
      check(near(c.x, 740) && near(c.y, 410), 'toCanvas 가로 배율 0.5: ' + JSON.stringify(c));
      // 2. 좌표 변환 — 세로 폰 90° (창 360×640, 배율 0.5)
      env.cw = 360; env.ch = 640; env.view = { scale: 0.5, rot: 90 };
      c = toCanvas(180, 320); check(near(c.x, 640) && near(c.y, 360), 'toCanvas 회전 중심: ' + JSON.stringify(c));
      c = toCanvas(360, 640); check(near(c.x, 1280) && near(c.y, 0), 'toCanvas 회전 화면 우하 → 캔버스 우상: ' + JSON.stringify(c));
      c = toCanvas(0, 0); check(near(c.x, 0) && near(c.y, 720), 'toCanvas 회전 화면 좌상 → 캔버스 좌하: ' + JSON.stringify(c));
      env.cw = 1280; env.ch = 720; env.view = { scale: 1, rot: 0 };
      // 3. firstInput 1회
      var nFirst = 0, un = Core.bus.on('firstInput', function () { nFirst++; });
      // 4. tap: down → 다음 프레임 down 콜백 → up → tap 1회, 그 뒤 재발화 없음
      var downN = 0, regA = function () { zone(Z('a', { down: function () { downN++; } })); };
      frame(0, regA);
      check(feedDown(150, 150, false, 'm') === true, 'feedDown 첫 포인터 거부');
      frame(16, regA);
      check(p.justDown && p.down && downN === 1, 'down 콜백/justDown: ' + JSON.stringify(p) + ' downN=' + downN);
      feedUp(152, 151, 'm');
      frame(32, regA);
      check(p.justUp && !p.down && log.join() === 'tap:a', 'tap 판정: ' + log.join() + ' ' + JSON.stringify(p));
      frame(48, regA);
      check(log.length === 1 && !p.justUp && !p.justDown, 'tap 재발화/에지 정리');
      // 5. long: 400ms 뒤 1회, 그 뒤 tap 없음, up 은 온다
      log = []; var upN = 0;
      var regL = function () { zone(Z('l', { long: function () { log.push('long'); }, up: function () { upN++; } })); };
      T = 100; feedDown(150, 150, false, 'm');   // down 시각 100
      frame(100, regL); frame(300, regL); frame(499, regL);
      check(log.length === 0, 'long 이 너무 일찍 발화: ' + log.join());
      frame(500, regL); frame(600, regL);
      check(log.join() === 'long', 'long 1회 발화: ' + log.join());
      feedUp(150, 150, 'm'); frame(616, regL);
      check(log.join() === 'long' && upN === 1, 'long 뒤 tap 억제/up 전달: ' + log.join() + ' upN=' + upN);
      // 6. 움직이면 long·tap 취소
      log = []; feedDown(150, 150, false, 'm'); frame(700, regL);
      feedMove(180, 150, 'm'); frame(716, regL); frame(1200, regL);
      feedUp(180, 150, 'm'); frame(1216, regL);
      check(log.length === 0 && p.moved, '이동 뒤 long/tap 취소 실패: ' + log.join());
      // 7. drag: 프레임마다 dx/dy, 합이 총 이동, up 전달, tap 없음
      log = []; upN = 0; var sx = 0, sy = 0, upAt = null;
      var regD = function () { zone(Z('d', { drag: function (q, dx, dy) { sx += dx; sy += dy; }, up: function (q) { upN++; upAt = { x: q.x, y: q.y }; } })); };
      feedDown(150, 150, false, 'm'); frame(1300, regD);
      feedMove(170, 160, 'm'); frame(1316, regD);
      feedMove(190, 160, 'm'); frame(1332, regD);
      feedUp(200, 170, 'm'); frame(1348, regD);
      check(sx === 50 && sy === 20, 'drag 누적 (50,20) ≠ (' + sx + ',' + sy + ')');
      check(upN === 1 && upAt && upAt.x === 200 && upAt.y === 170 && log.length === 0, 'drag 뒤 up/tap: upN=' + upN + ' ' + JSON.stringify(upAt) + ' ' + log.join());
      // 8. 가림: 위에 enabled:false → 아래 tap 없음. 위가 enabled 면 위만
      log = [];
      var regO1 = function () { zone(Z('under')); zone(Z('cover', { enabled: false })); };
      feedDown(150, 150, false, 'm'); frame(1400, regO1); feedUp(150, 150, 'm'); frame(1416, regO1);
      check(log.length === 0, '비활성 영역이 가리지 못함: ' + log.join());
      var regO2 = function () { zone(Z('under')); zone(Z('over')); };
      feedDown(150, 150, false, 'm'); frame(1500, regO2); feedUp(150, 150, 'm'); frame(1516, regO2);
      check(log.join() === 'tap:over', '위 영역만 받아야 함: ' + log.join());
      // 9. 취소: up 은 오되 tap 은 없다
      log = []; upN = 0;
      feedDown(150, 150, false, 'm'); frame(1600, regD); feedCancel(); frame(1616, regD);
      check(upN === 1 && log.length === 0 && !p.down, 'cancel 처리: upN=' + upN + ' ' + log.join());
      // 10. 멀티터치: 두 번째 손가락 무시, isTouch 켜짐
      check(feedDown(150, 150, true, 1) === true && feedDown(500, 500, true, 2) === false, '두 번째 손가락이 거부되지 않음');
      frame(1700, regA);
      check(ptr.downX === 150 && p.down && api.isTouch === true, '멀티터치 뒤 상태: ' + JSON.stringify(p) + ' isTouch=' + api.isTouch);
      feedUp(500, 500, 2); frame(1716, regA); check(p.down, '다른 손가락의 up 이 첫 손가락을 떼었다');
      feedUp(150, 150, 1); frame(1732, regA); check(!p.down, '첫 손가락 up 실패');
      ptr.touch = false;
      // 11. 키: 에지·상태·consume·preventDefault
      var pd = 0, ev = { code: 'Space', preventDefault: function () { pd++; } };
      feedKey('Space', true, ev); feedKey('Space', true, ev);   // repeat
      feedKey('KeyE', true, { preventDefault: function () { pd += 100; } });
      check(pd === 2, 'Space preventDefault 횟수 ' + pd);
      begin();
      check(key('Space') && keyDown('Space') && key('KeyE'), '키 에지/상태');
      check(consumeKey('Space') === true && !key('Space') && keyDown('Space'), 'consumeKey');
      end(); begin();
      check(!key('KeyE') && keyDown('KeyE'), '다음 프레임 에지 정리');
      feedKey('KeyE', false, {}); feedKey('Space', false, {}); begin();
      check(!keyDown('KeyE') && !keyDown('Space'), 'keyup');
      end();
      check(keyCode({ key: ' ' }) === 'Space' && keyCode({ key: '1' }) === 'Digit1' && keyCode({ key: 'e' }) === 'KeyE' && keyCode({ code: 'Tab' }) === 'Tab', 'keyCode 보정');
      // 12. 휠: 영역이 먹으면 Input.wheel 0, 아니면 남는다
      var got = 0;
      feedMove(150, 150, 'm'); feedWheel(3);
      frame(1800, function () { zone(Z('w', { wheel: function (d) { got += d; } })); zone(Z('top')); });   // 위 영역이 wheel 을 가리지 않는다
      check(got === 3 && api.wheel === 0, '휠 영역 전달: got=' + got + ' wheel=' + api.wheel);
      feedWheel(-2); frame(1816, regA);
      check(api.wheel === -2, '휠 잔여: ' + api.wheel);
      frame(1832, regA); check(api.wheel === 0, '휠 잔여 정리');
      // 13. hover·커서(마우스)
      feedMove(150, 150, 'm'); frame(1900, regA);
      check(hover('a') && env.cv.style.cursor === 'pointer', 'hover/cursor 위: ' + hoverId + ' ' + env.cv.style.cursor);
      feedMove(50, 50, 'm'); frame(1916, regA);
      check(!hover('a') && env.cv.style.cursor === 'default', 'hover/cursor 밖: ' + hoverId + ' ' + env.cv.style.cursor);
      // 14. id 없는 drag/up 은 경고 뒤 무시, 작은 영역 집계
      warned['noid:0,0,20,20'] = true;   // 검사 출력에 경고를 섞지 않는다
      begin(); var zz = zone({ x: 0, y: 0, w: 20, h: 20, tap: function () {}, up: function () {} }); end();
      check(zz.up === null && api.stats.small === 1, 'id 없는 up 무시/작은 영역 집계: ' + api.stats.small);
      check(nFirst === 1, 'firstInput 발화 수 ' + nFirst);
      un();
    } catch (e) {
      errors.push('예외: ' + ((e && e.stack) || e));
    }
    env = saved.env; clock = saved.clock; firstDone = saved.firstDone; curCursor = saved.cursor;
    reset(); ptr.touch = saved.touch; api.isTouch = saved.isTouch;
    return { ok: errors.length === 0, errors: errors };
  }

  /* ------------------------------------------------------------------ api */
  var api = {
    init: init, begin: begin, end: end, zone: zone,
    p: p, key: key, keyDown: keyDown, consumeKey: consumeKey,
    wheel: 0, isTouch: false, toCanvas: toCanvas, hover: hover,
    debugPoint: function (x, y) { pinned = x == null ? null : { x: x, y: y }; if (pinned) { cur.x = x; cur.y = y; ptr.touch = false; } },   // QA: 마우스를 캔버스 (x,y)에 고정(사진용 hover), 인자 없으면 푼다
    stats: { zones: 0, small: 0 },
    selfTest: selfTest
  };
  return api;
})();
