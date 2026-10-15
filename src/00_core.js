/* ===== 00_core.js — 수치표(BAL)·시드 난수·해시·이벤트 버스·저장·공통 유틸 ===== */
// TODO(통합): 시드는 13_main 의 Main.newSeed() 만 시계·브라우저 난수로 만든다. Core 는 시계·브라우저 난수를 쓰지 않는다.
// TODO(통합): BAL 과 DIST 는 깊이 동결(Object.freeze)되어 있다. 밸런스 조정은 이 파일의 값을 고쳐서만 한다.
//            실행 중 `Core.BAL.X = …` 는 strict 모드에서 TypeError 가 나므로(의도된 것) sim 의 수치 실험도 파일 편집으로.
// TODO(통합): 02~08 은 Core.save/load/clear 를 부르지 않는다(localStorage 는 Run.save/Main 만). Core 안의 참조는 check.js 예외.
// TODO(통합): bus.emit 안에서 구독자가 던진 예외는 console.error 로만 나간다. 통합 QA 때 콘솔을 보고 잡는다.
var Core = (function () { 'use strict';

  var VERSION = '1.0.0';               // 저장 호환 판별
  var SAVE_KEY = 'jingbi_save_v1';
  var SETTINGS_KEY = 'jingbi_settings_v1';
  var DIST = { FAR: 0, NEAR: 1, CLOSE: 2 };   // 원거리 중거리 근접

  /* ------------------------------------------------------------------
   * BAL — 규칙 수치표. 값의 정본은 DESIGN.md, 키 이름은 CONTRACT §2.1.
   * §2.1 에 없는 키는 끝에 모아 두고 출처 절을 주석으로 적었다.
   * ------------------------------------------------------------------ */
  var BAL = {
    // DESIGN §4.1 전투 기본 · §8.2 교착 금지(턴 상한 30, −10%/턴, 강제 종료 100) · CONTRACT §13 동시 적 수 6
    ENERGY: 3, DRAW: 5, HAND_MAX: 10, DECK_MIN: 12, TURN_CAP: 30, TURN_CAP_PENALTY: 0.10, TURN_HARD: 100, ENEMY_MAX: 6,
    // DESIGN §4.9 「부장이 대신 섰다」: 병력 20 으로 생환, 둘이면 5초 뒤 자동
    RESCUE_HP: 20, RESCUE_AUTO_MS: 5000,
    // DESIGN §4.1 병력 · §4.6 시작 의심(이순신 1)
    LEADER_HP: { yi: 80, gwon: 84 }, SUSP_START: { yi: 1, gwon: 0 },
    // DESIGN §4.6 의심 0~10, 문턱 4/7/10, 어명 상한 3, 옥사 뒤 7, 부장 없으면 최대 병력 −10
    SUSP_MAX: 10, SUSP_THRESH: [4, 7, 10], EDICT_CAP: 3, PRISON_RESET: 7, PRISON_NO_DEPUTY_MAXHP: -10,
    // DESIGN §4.7 군량: 시작 50, 일반 10~20, 정예 35, 결전 60, 거르기 +5 · CONTRACT §6.4 정예 기물 없을 때 30
    RATION_START: 50, RATION_FIGHT: [10, 20], RATION_ELITE: 35, RATION_BOSS: 60, RATION_SKIP: 5, RATION_NO_RELIC: 30,
    // DESIGN §4.7 장시: 카드 30/50/50/60, 기물 80·120, 환향 40(어명 90), 오방낭 10%, 진열 카드 5·기물 2
    SHOP: { card: { common: 30, rare: 50, special: 50, leader: 60 }, relic: [80, 120], remove: 40, removeEdict: 90,
            discount: 0.10, cards: 5, relics: 2,
            removePerVisit: 1 },                       // DESIGN §4.7 「방문당 퇴출 1회」
    // DESIGN §4.7 군영: 쉬다 30%, 둔전 +40
    CAMP: { restPct: 0.30, farm: 40 },
    // DESIGN §4.7 조정: 장계 −2, 청병 군량 20 · 명군 3장 중 1
    COURT: { report: -2, requestCost: 20, requestPick: 3,
             requestMinAct: 3 },                       // DESIGN §4.7 「청병(3막 이후)」
    // DESIGN §4.7 보상: 일반 70% 희귀 25% 특수 5%, 주장 고유 15%, 3장
    REWARD: { common: 0.70, rare: 0.25, special: 0.05, leaderChance: 0.15, cards: 3,
              bossMinRarity: 'rare' },                 // DESIGN §4.7 「결전: 희귀 이상 보장」
    // DESIGN §4.8 장계 분배: 공 10, 기본 주장 4·임금 6, 주장 4점당 강화(최대 2), 5점 의심 +1·10점 +2,
    //   임금 3점당 의심 −1(최대 −3)·군량 +5, 명군 5점당 −1(최대 −2)
    MERIT: { total: 10, default: { leader: 4, king: 6, ming: 0 }, leaderPer: 4, leaderMaxUp: 2, leaderSusp5: 1, leaderSusp10: 2,
             kingPer: 3, kingMaxDown: 3, kingRation: 5, mingPer: 5, mingMaxDiscount: 2,
             mingMinAct: 3 },                          // DESIGN §4.8 「명군(3막 이후 열림)」
    // DESIGN §4.2 거리 배율표. 인덱스 = 거리(0원거리 1중거리 2근접). 적 melee 의 원거리는 0 = 불가(접근으로 바뀜). charge 는 이동 후 항상 1.5
    MULT: { shot: [1.5, 1, 0.5], melee: [0.7, 1, 1.2], charge: [1.5, 1.5, 1.5], fire: [1, 1, 1], none: [1, 1, 1],
            e_gun: [0.5, 1, 0.8], e_melee: [0, 1, 1.5], e_bow: [1, 1, 1] },
    // DESIGN §4.10 지역 ×1.4 · §4.5 동요 −25%·허점 +50% · CONTRACT §13 위축 −50% · 숨어라 −70%/−80%(강화)
    HOME_BONUS: 1.4, SHAKEN_PCT: 0.25, EXPOSED_PCT: 0.50, FLINCH_PCT: 0.50, HIDE_PCT: 0.70, HIDE_PLUS_PCT: 0.80,
    // DESIGN §4.6 진격하라 +50% · §5.7 독전 +60% · §5.9 원균 대행 +20%
    EDICT_ATK_PCT: 0.50, DOKJEON_PCT: 0.60, WON_GYUN_PCT: 0.20,
    // DESIGN §6.4 이순신 필사즉생(병력 40% 이하 +40%) · 권율 지구 3 · 권율 부장 2
    YI: { hpPct: 40, atkPct: 0.40 }, GWON_KEEP: 3, GWON_DEPUTY_KEEP: 2,
    // DESIGN §6.2 막 배율: 체력 ×(1 + 0.12×(막−1)), 피해 +[0,0,1,1,2,2,3][막−1]
    ACT_SCALE: { hpPer: 0.08, dmgAdd: [0, 0, 1, 1, 2, 2, 3] },        // 밸런스: 0.12 → 0.08 (시뮬 1차)
    // DESIGN §4.1 수성 성벽 10 · 공성 적 성벽 15 · §6.3 왜성 gun +20% · 고개 진형 +5/2턴 · 강 기세 +3
    SIEGE_WALL: 10, ASSAULT_ENEMY_WALL: 15, WAESEONG_GUN_PCT: 0.20, RIDGE_BLOCK: 5, RIDGE_HOLD: 2, RIVER_MOMENTUM: 3,
    // DESIGN §4.12 조류: 3턴 교대, 역류 전진 2칸·push −1, 순류 군령 +1·push +1
    TIDE: { period: 3, ebbStep: 2, ebbPush: -1, flowEnergy: 1, flowPush: 1 },
    // DESIGN §5.8 B6 명량: 도도 160(칠천량 없으면 180), 증원 3턴(없으면 2턴), 상한 8, 기적 수군 +4
    MYEONGNYANG: { todoHp: 130, todoHpNoChilcheon: 140, reinforceEvery: 3, reinforceEveryNoChilcheon: 3, cap: 8, miracleNavyBonus: 4 },   // 밸런스: 160/180 → 130/150
    // DESIGN §5.8 B7 노량: 1단계 120, 2단계 150, 증원 2턴, 상한 6, push 1칸 상한
    NORYANG: { p1: 100, p2: 120, reinforceEvery: 2, cap: 6, pushMax: 1 },   // 밸런스: 120/150 → 100/120
    // DESIGN §4.13 뽑기 훅 턴당 3회 · §4.2 조총 관통 50%
    DRAW_HOOK_CAP: 3, GUN_PIERCE: 0.5,
    // DESIGN §8.3 점수
    SCORE: { node: 10, elite: 30, boss: 100, hpMul: 2, suspMul: 15, smallDeck: { max: 25, bonus: 100 },
             branch: { joryeong: 150, jinju1: 100, jinju2: 200, notDismissed: 200, noChilcheon: 150, miracle: 300, yiAlive: 250 } },
    // DESIGN §5.9 어전회의: ≥7 파직, 군량 30, 狀 제거 최대 2, 파직 뒤 의심 3
    COUNCIL: { dismissAt: 7, rationCost: 30, maxRemove: 2, afterDismiss: 3,
               defenseDelta: -1 },                     // DESIGN §5.9 변호 수단 하나당 의심 −1
    // DESIGN §7.1 연출 ≤0.25초 · 큐 최대 대기 0.5초 · §7.5 길게 누르기 400ms · 누름 영역 44px
    FX_MS: 250, FX_WAIT_MAX_MS: 500, LONG_PRESS_MS: 400, TAP_MIN: 44,

    // ---- §2.1 에 없는 규칙 수치 (출처 절) ----
    DEPUTY_SLOTS: 2,                                   // DESIGN §6.4 「부장 (자리 2)」. special 은 3번째 자리(별도)
    WIN_SUSP: { elite: 1, boss: 1 },                   // DESIGN §4.6 「결전 승리 +1 · 정예 승리 +1」
    FAMED_ACT_SUSP: 1,                                 // DESIGN §4.6 「막 시작 시 공 큰 장수가 주장·부장이면 +1」
    WON_GYUN_SUSP: 1,                                  // DESIGN §5.9 원균 대행 「의심 +1」 (CONTRACT §6.7)
    SIM: { maxPrompts: 3000, maxBattleTurns: 300 },    // CONTRACT §8 · DESIGN §10.6 교착 판정 안전장치
    ACT_HEAL_PCT: 0.5                                  // 밸런스(CONTRACT §13): 새 막에 들어서면 잃은 병력의 절반을 수습한다
  };

  /* ------------------------------------------------------------------ 유틸 */
  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    }
    return o;
  }
  deepFreeze(BAL);
  deepFreeze(DIST);

  function assert(cond, msg) {
    if (!cond) throw new Error('Core.assert: ' + (msg || '조건 실패'));
  }
  function clamp(v, a, b) {
    if (a > b) { var t = a; a = b; b = t; }
    return v < a ? a : (v > b ? b : v);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clone(o) {
    if (o === undefined) return undefined;
    return JSON.parse(JSON.stringify(o));
  }
  // 숫자 표기: 천 단위 쉼표, 음수는 「−」(U+2212). signed 가 참이면 양수에 「+」.
  function fmtNum(n, signed) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    var neg = n < 0, a = Math.abs(n);
    var s = (Math.floor(a) === a) ? String(a) : String(Math.round(a * 10) / 10);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
    if (neg) return '−' + s;
    if (signed && n > 0) return '+' + s;
    return s;
  }

  /* ------------------------------------------------------------------ 해시 (FNV-1a 32bit) */
  function hash(str) {
    var s = (typeof str === 'string') ? str : String(str);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /* ------------------------------------------------------------------ 시드 난수 (mulberry32) */
  // 상태는 {s:uint32} 하나. JSON 왕복 가능. 같은 시드 → 같은 수열.
  function rngNew(seed) {
    var s;
    if (typeof seed === 'number' && isFinite(seed)) s = Math.floor(seed) >>> 0;
    else s = hash(seed === undefined || seed === null ? '' : String(seed));
    return { s: s };
  }
  function rand(r) {
    r.s = (r.s + 0x6D2B79F5) >>> 0;
    var t = r.s | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(r, a, b) {
    a = Math.floor(a); b = Math.floor(b);
    if (b < a) { var t = a; a = b; b = t; }
    return a + Math.floor(rand(r) * (b - a + 1));
  }
  function pick(r, arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(rand(r) * arr.length)];
  }
  function shuffle(r, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand(r) * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  // items: [{w, v}]. 가중치 합이 0 이하이거나 비어 있으면 null (rng 는 전진하지 않는다).
  function weighted(r, items) {
    if (!items || !items.length) return null;
    var total = 0, i, w;
    for (i = 0; i < items.length; i++) { w = Number(items[i].w) || 0; if (w > 0) total += w; }
    if (total <= 0) return null;
    var x = rand(r) * total, last = null;
    for (i = 0; i < items.length; i++) {
      w = Number(items[i].w) || 0;
      if (w <= 0) continue;
      last = items[i].v;
      x -= w;
      if (x < 0) return items[i].v;
    }
    return last;   // 부동소수 끝자리 보정
  }

  /* ------------------------------------------------------------------ 이벤트 버스 */
  // 동기. 구독자 예외는 잡아서 console.error 로만 내보낸다(상태 전이를 막지 않는다).
  var errSink = null;   // selfTest 가 잠시 바꿔 끼운다
  function reportError(type, e) {
    if (errSink) { errSink(type, e); return; }
    if (typeof console !== 'undefined' && console && console.error) {
      console.error('[Core.bus] "' + type + '" 구독자 예외: ' + ((e && e.stack) || e));
    }
  }
  var subs = {};
  var bus = {
    on: function (type, fn) {
      assert(typeof fn === 'function', 'bus.on: fn 이 함수가 아님 (' + type + ')');
      (subs[type] || (subs[type] = [])).push(fn);
      return function () { bus.off(type, fn); };
    },
    off: function (type, fn) {
      var list = subs[type];
      if (!list) return;
      var i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
      if (!list.length) delete subs[type];
    },
    emit: function (type, payload) {
      var list = subs[type];
      if (!list || !list.length) return 0;
      var copy = list.slice(), n = 0;
      for (var i = 0; i < copy.length; i++) {
        try { copy[i](payload, type); n++; }
        catch (e) { reportError(type, e); }
      }
      return n;
    },
    count: function (type) { return subs[type] ? subs[type].length : 0; },
    clear: function (type) {
      if (type === undefined) subs = {};
      else delete subs[type];
    }
  };

  /* ------------------------------------------------------------------ 저장 (localStorage) */
  function getStorage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage &&
          typeof localStorage.getItem === 'function') return localStorage;
    } catch (e) { /* 접근 자체가 막힌 환경 */ }
    return null;
  }
  function save(key, obj) {
    var st = getStorage();
    if (!st) return false;
    try { st.setItem(key, JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }
  function load(key) {
    var st = getStorage();
    if (!st) return null;
    try {
      var raw = st.getItem(key);
      if (raw === null || raw === undefined || raw === '') return null;
      var v = JSON.parse(raw);
      return (v === undefined) ? null : v;
    } catch (e) { return null; }
  }
  function clear(key) {
    var st = getStorage();
    if (!st) return false;
    try { st.removeItem(key); return true; }
    catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ uid */
  // state.uidCounter 를 1 올려 'u'+n 을 돌려준다. 전투(st)·판(G) 모두 이 방식.
  function nextUid(state) {
    assert(state && typeof state === 'object', 'nextUid: state 가 객체가 아님');
    var n = (typeof state.uidCounter === 'number' && isFinite(state.uidCounter)) ? state.uidCounter : 0;
    n = Math.floor(n) + 1;
    state.uidCounter = n;
    return 'u' + n;
  }

  /* ------------------------------------------------------------------ selfTest */
  function selfTest() {
    var errors = [];
    function check(cond, msg) { if (!cond) errors.push(msg); }
    var i, a, b;

    try {
      // 1. 같은 시드 → 같은 난수열, 범위 [0,1)
      var r1 = rngNew(42), r2 = rngNew(42), same = true, inRange = true;
      for (i = 0; i < 200; i++) {
        a = rand(r1); b = rand(r2);
        if (a !== b) same = false;
        if (!(a >= 0 && a < 1)) inRange = false;
      }
      check(same, 'rand: 같은 시드가 다른 수열을 냈다');
      check(inRange, 'rand: [0,1) 범위를 벗어났다');
      check(rand(rngNew(42)) !== rand(rngNew(43)), 'rand: 다른 시드가 같은 첫 값');
      check(rngNew('징비').s === rngNew('징비').s && rngNew('징비').s === hash('징비'), 'rngNew: 문자열 시드가 hash 와 다름');
      check(rngNew(4294967296 + 5).s === 5, 'rngNew: uint32 접기 실패');
      // JSON 왕복 뒤에도 같은 수열
      var r3 = rngNew('왕복'); rand(r3); rand(r3);
      var r4 = clone(r3);
      check(rand(r3) === rand(r4) && rand(r3) === rand(r4), 'rng: JSON 왕복 뒤 수열이 다름');

      // 2. randInt·pick·shuffle·weighted
      var r5 = rngNew(7), ok = true, seen = {};
      for (i = 0; i < 500; i++) { var v = randInt(r5, 3, 6); seen[v] = true; if (v < 3 || v > 6 || v !== Math.floor(v)) ok = false; }
      check(ok && seen[3] && seen[4] && seen[5] && seen[6], 'randInt: 3..6 포함 범위 실패');
      check(randInt(rngNew(1), 5, 5) === 5, 'randInt: a===b');
      check(randInt(rngNew(1), 6, 3) === randInt(rngNew(1), 3, 6), 'randInt: 뒤집힌 인자');
      check(pick(rngNew(1), []) === null && pick(rngNew(1), null) === null, 'pick: 빈 배열이 null 이 아님');
      check(pick(rngNew(1), ['x']) === 'x', 'pick: 한 원소');
      var base = []; for (i = 0; i < 20; i++) base.push(i);
      var s1 = shuffle(rngNew(99), base.slice()), s2 = shuffle(rngNew(99), base.slice());
      check(JSON.stringify(s1) === JSON.stringify(s2), 'shuffle: 같은 시드가 다른 순열');
      check(JSON.stringify(s1.slice().sort(function (x, y) { return x - y; })) === JSON.stringify(base), 'shuffle: 순열이 아님');
      check(JSON.stringify(s1) !== JSON.stringify(base), 'shuffle: 섞이지 않음');
      var arrRef = [1, 2, 3]; check(shuffle(rngNew(1), arrRef) === arrRef, 'shuffle: 제자리 반환이 아님');
      var r6 = rngNew(5), onlyB = true;
      for (i = 0; i < 100; i++) if (weighted(r6, [{ w: 0, v: 'a' }, { w: 5, v: 'b' }]) !== 'b') onlyB = false;
      check(onlyB, 'weighted: 가중치 0 이 뽑혔다');
      var cnt = { 1: 0, 2: 0 }, r7 = rngNew(11);
      for (i = 0; i < 300; i++) cnt[weighted(r7, [{ w: 1, v: 1 }, { w: 1, v: 2 }])]++;
      check(cnt[1] > 60 && cnt[2] > 60, 'weighted: 균등 가중치 분포 이상 ' + JSON.stringify(cnt));
      check(weighted(rngNew(1), []) === null && weighted(rngNew(1), [{ w: 0, v: 1 }]) === null, 'weighted: 빈/0 가중치가 null 이 아님');

      // 3. hash (FNV-1a 32bit 표준 벡터)
      check(hash('') === 2166136261, 'hash: FNV-1a 빈 문자열');
      check(hash('a') === 0xe40c292c, 'hash: FNV-1a "a"');
      check(hash('foobar') === 0xbf9cf968, 'hash: FNV-1a "foobar"');
      check(hash('징비') === hash('징비') && hash('징비') !== hash('징비록'), 'hash: 한글 안정성');
      check(hash(12345) === hash('12345'), 'hash: 숫자를 문자열로 취급');

      // 4. bus: 순서·구독 해제·예외 격리
      var calls = [], sinkN = 0;
      var un1 = bus.on('_t', function () { throw new Error('boom'); });
      var un2 = bus.on('_t', function (p) { calls.push(p); });
      errSink = function () { sinkN++; };
      var n = bus.emit('_t', 7);
      errSink = null;
      check(calls.length === 1 && calls[0] === 7, 'bus: 앞 구독자의 예외가 뒤 구독자를 막았다');
      check(sinkN === 1 && n === 1, 'bus: 예외 보고/정상 호출 수가 다름');
      un1();
      bus.emit('_t', 8);
      check(calls.length === 2 && calls[1] === 8 && bus.count('_t') === 1, 'bus: 구독 해제 함수 실패');
      un2();
      check(bus.emit('_t', 9) === 0 && calls.length === 2 && bus.count('_t') === 0, 'bus: off 뒤에도 호출됨');
      bus.off('_없음', function () {});   // 없는 구독 해제는 무해
      var selfUn = bus.on('_u', function () { selfUn(); });   // 발화 중 자기 해제
      bus.on('_u', function (p) { calls.push(p); });
      bus.emit('_u', 10);
      check(calls.length === 3 && calls[2] === 10 && bus.count('_u') === 1, 'bus: 발화 중 해제가 뒤 구독자를 건너뛰었다');
      bus.clear('_u');
      check(bus.count('_u') === 0, 'bus: clear(type) 실패');

      // 5. save 왕복 (localStorage 없으면 건너뜀)
      if (getStorage()) {
        var key = 'jingbi_selftest_v1', obj = { ver: VERSION, deck: [{ uid: 'u1', id: 'bowstring', up: false }], n: -3, t: null };
        check(save(key, obj) === true, 'save: 저장 실패');
        var back = load(key);
        check(JSON.stringify(back) === JSON.stringify(obj), 'save/load: 왕복 불일치');
        clear(key);
        check(load(key) === null, 'clear: 지운 뒤 null 이 아님');
        check(load('jingbi_없는키_v1') === null, 'load: 없는 키가 null 이 아님');
      }

      // 6. nextUid · clone · clamp · lerp · fmtNum · deepFreeze
      var st = { uidCounter: 0 };
      check(nextUid(st) === 'u1' && nextUid(st) === 'u2' && st.uidCounter === 2, 'nextUid: 순번');
      var st2 = {}; check(nextUid(st2) === 'u1' && st2.uidCounter === 1, 'nextUid: 카운터 없는 상태');
      var src = { a: [1, { b: 2 }], c: null };
      var cp = clone(src);
      check(JSON.stringify(cp) === JSON.stringify(src) && cp !== src && cp.a !== src.a, 'clone: 깊은 복사 실패');
      check(clamp(5, 0, 3) === 3 && clamp(-1, 0, 3) === 0 && clamp(2, 0, 3) === 2 && clamp(5, 3, 0) === 3, 'clamp');
      check(lerp(0, 10, 0.5) === 5 && lerp(2, 2, 0.3) === 2, 'lerp');
      check(fmtNum(1250) === '1,250' && fmtNum(-3) === '−3' && fmtNum(5, true) === '+5' && fmtNum(0, true) === '0' &&
            fmtNum(1234567) === '1,234,567' && fmtNum(NaN) === '—' && fmtNum(0.25) === '0.3', 'fmtNum: ' +
            [fmtNum(1250), fmtNum(-3), fmtNum(5, true), fmtNum(0, true), fmtNum(0.25)].join('|'));
      var threw = false;
      try { BAL.ENERGY = 99; } catch (e) { threw = true; }
      check(threw && BAL.ENERGY === 3 && Object.isFrozen(BAL.MULT.shot), 'BAL: 동결되지 않음');
      threw = false;
      try { assert(false, 'x'); } catch (e) { threw = /x/.test(e.message); }
      check(threw, 'assert: 던지지 않음');

      // 7. BAL 형태 검사
      check(BAL.SUSP_THRESH.length === 3 && BAL.SUSP_THRESH[2] === BAL.SUSP_MAX, 'BAL.SUSP_THRESH');
      var mk = Object.keys(BAL.MULT), mulOk = true;
      for (i = 0; i < mk.length; i++) if (BAL.MULT[mk[i]].length !== 3) mulOk = false;
      check(mulOk && mk.length === 8, 'BAL.MULT: 행마다 원거리·중거리·근접 3칸이어야 한다');
      var d = BAL.MERIT.default;
      check(d.leader + d.king + d.ming === BAL.MERIT.total, 'BAL.MERIT.default 합이 total 과 다름');
      check(BAL.ACT_SCALE.dmgAdd.length === 7, 'BAL.ACT_SCALE.dmgAdd 는 7막');
      check(BAL.REWARD.common + BAL.REWARD.rare + BAL.REWARD.special === 1, 'BAL.REWARD 확률 합');
      check(BAL.LEADER_HP.yi === 80 && BAL.LEADER_HP.gwon === 84 && BAL.SUSP_START.yi === 1, 'BAL.LEADER_HP/SUSP_START');
      check(BAL.RATION_FIGHT[0] <= BAL.RATION_FIGHT[1] && BAL.SHOP.relic[0] <= BAL.SHOP.relic[1], 'BAL 범위 배열 순서');
      check(JSON.stringify(clone(BAL)) === JSON.stringify(BAL), 'BAL: JSON 왕복');
      check(DIST.FAR === 0 && DIST.NEAR === 1 && DIST.CLOSE === 2, 'DIST');
    } catch (e) {
      errors.push('selfTest 예외: ' + ((e && e.stack) || e));
    } finally {
      errSink = null;
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /* ------------------------------------------------------------------ api */
  var api = {
    VERSION: VERSION, SAVE_KEY: SAVE_KEY, SETTINGS_KEY: SETTINGS_KEY, DIST: DIST, BAL: BAL,
    rngNew: rngNew, rand: rand, randInt: randInt, pick: pick, shuffle: shuffle, weighted: weighted,
    hash: hash, clamp: clamp, lerp: lerp, clone: clone, assert: assert, deepFreeze: deepFreeze,
    bus: bus,
    save: save, load: load, clear: clear,
    nextUid: nextUid, fmtNum: fmtNum,
    selfTest: selfTest
  };
  return api;
})();
