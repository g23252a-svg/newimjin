/* ===== 10_audio.js — WebAudio 합성 효과음 25종 + 계면조 음악 3곡(지도·전투·결말). 외부 파일 0 ===== */
// TODO(통합): Main.start 는 bus 'firstInput' 에서 Audio_.init() 을 부르고(여기서도 구독해 두었다 — 두 번 불러도 무해), 씬마다 Audio_.music('map'|'battle'|'ending'|null) 을 부른다(§7.1). init 전에 부른 music 은 기억했다가 init 때 시작한다.
// TODO(통합): Main.setSetting('volume'|'mute') → Audio_.setVolume(v) / Audio_.mute(b). init 때 Main.settings 가 있으면 volume·mute 를 먼저 읽는다.
// TODO(통합): UI 단추는 UIScreens/UIBattle 이 Audio_.sfx('button') 을, 두루마리 펼침은 sfx('scroll') 을 직접 부른다. 전투 소리는 전부 bus 'fx' 로 여기서 매핑한다(§5.9 전부). sfx('move', {dir:-1|1}) 두 번째 인자는 선택.
// TODO(통합): fx enemyDeath 의 격침/백병 구분은 ENEMIES.get(id).tags 의 'ship' 으로 한다. ENEMIES 가 없으면 melee.
// TODO(통합): 헤드리스(AudioContext 없음)에서는 init 이 조용히 비활성, 모든 호출이 no-op 이며 타이머도 만들지 않는다. selfTest 는 ctx 없이 돈다.
var Audio_ = (function () { 'use strict';

  var CFG = { MASTER: 0.8, SFX_GAIN: 1.0, MUSIC_GAIN: 0.55, LOOKAHEAD: 0.45, TICK_MS: 100, THROTTLE: 0.03, NOISE_SEC: 2, HUSH: 0.45, FADE: 0.15 };
  // 계면조 5음: 황종 E♭ · 태주 F · 중려 A♭ · 임종 B♭ · 남려 C. 3옥타브(E♭3)부터 세 옥타브, 도수 0~14
  var SCALE = [155.56, 174.61, 207.65, 233.08, 261.63];
  var FINALS = [0, 3, 5, 8, 10, 13];   // 마침음: 황종·임종(각 옥타브)
  var PHRASE = 24;                     // 악구 = 12박 장단 두 바퀴
  var SFX_NAMES = ['card', 'shot', 'melee', 'gun', 'fire', 'sink', 'drum', 'horn', 'banner', 'suspicion', 'scroll', 'button', 'move',
    'win', 'lose', 'load', 'tide', 'hwacha', 'turtle', 'parley', 'hit', 'block', 'draw', 'rescue', 'spawn'];

  var ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, noiseOff = 0;
  var volume = 0.7, muted = false, lastAt = {}, hushUntil = 0;
  var song = null, want = null, timer = null, step = 0, nextT = 0, phraseCache = {};

  function degFreq(d) { d = Math.max(0, Math.min(14, d | 0)); return SCALE[d % 5] * Math.pow(2, Math.floor(d / 5)); }

  /* ---------------------------------------------------------------- 합성 원소 */
  // 엔벌로프: 0 → vol(atk) → (hold 비율만큼 유지) → 거의 0(dur)
  function env(g, t, vol, atk, dur, hold) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    if (hold) g.gain.setValueAtTime(vol, t + atk + Math.max(0, dur - atk) * hold);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  }
  // 오실레이터 음. o = {f, dur, type, vol, at, abs, glide(끝 배율), bend(시작 배율), atk, hold, lp, vib(Hz), bus}
  function tone(o) {
    if (!ctx) return;
    var t = (o.abs ? 0 : ctx.currentTime) + (o.at || 0), dur = o.dur || 0.2;
    var atk = o.atk != null ? o.atk : Math.min(0.01, dur * 0.2);
    var osc = ctx.createOscillator(), g = ctx.createGain(), node = osc, f;
    osc.type = o.type || 'sine';
    if (o.bend) { osc.frequency.setValueAtTime(o.f * o.bend, t); osc.frequency.exponentialRampToValueAtTime(o.f, t + Math.min(0.09, dur * 0.4)); }
    else osc.frequency.setValueAtTime(o.f, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f * o.glide), t + dur);
    if (o.vib) {
      var l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib; lg.gain.value = o.f * 0.014;
      l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1);
    }
    if (o.lp) { f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    env(g, t, o.vol || 0.2, atk, dur, o.hold || 0);
    node.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  // 노이즈. o = {dur, vol, at, abs, lp, lpTo(dur 동안 lp → lpTo), hp, atk, hold, bus}
  function noise(o) {
    if (!ctx) return;
    var t = (o.abs ? 0 : ctx.currentTime) + (o.at || 0), dur = o.dur || 0.1;
    var s = ctx.createBufferSource(), node = s, f;
    s.buffer = noiseBuf; s.loop = true;
    if (o.lp) {
      f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t);
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
      node.connect(f); node = f;
    }
    if (o.hp) { f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; node.connect(f); node = f; }
    var g = ctx.createGain();
    env(g, t, o.vol || 0.2, o.atk != null ? o.atk : 0.005, dur, o.hold || 0);
    node.connect(g); g.connect(o.bus || sfxBus);
    noiseOff = (noiseOff + 0.173) % (CFG.NOISE_SEC - 0.5);   // 매번 다른 자리에서 읽어 같은 소리가 반복되지 않게
    s.start(t, noiseOff); s.stop(t + dur + 0.05);
  }
  function makeNoise() {
    var n = Math.floor(ctx.sampleRate * CFG.NOISE_SEC), buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0), r = Core.rngNew('jingbi:noise');
    for (var i = 0; i < n; i++) d[i] = Core.rand(r) * 2 - 1;
    return buf;
  }

  /* ---------------------------------------------------------------- 효과음 25종 */
  var SFX = {
    card: function () { noise({ dur: 0.07, vol: 0.12, hp: 2500, lp: 7000 }); noise({ dur: 0.05, vol: 0.06, at: 0.05, hp: 3500 }); },                       // 종이 스침
    draw: function () { noise({ dur: 0.04, vol: 0.09, hp: 3000 }); tone({ f: 1900, dur: 0.03, vol: 0.05 }); },                                              // 패 한 장 집기
    button: function () { tone({ f: 640, dur: 0.05, type: 'square', vol: 0.07 }); tone({ f: 960, dur: 0.05, type: 'square', vol: 0.04, at: 0.03 }); },      // 단추
    scroll: function () { noise({ dur: 0.38, vol: 0.14, lp: 700, lpTo: 3200, atk: 0.04 }); noise({ dur: 0.08, vol: 0.08, at: 0.34, hp: 2000 }); },           // 두루마리 펼침
    shot: function () { noise({ dur: 0.11, vol: 0.28, lp: 2600 }); tone({ f: 1400, dur: 0.14, vol: 0.06, glide: 0.35 }); },                                 // 활·총통: 짧은 노이즈 버스트
    melee: function () {                                                                                                                                      // 쇠 부딪침
      noise({ dur: 0.09, vol: 0.22, hp: 3000 }); tone({ f: 1100, dur: 0.07, type: 'square', vol: 0.09, glide: 0.7 }); tone({ f: 2600, dur: 0.18, vol: 0.05, at: 0.02 });
    },
    gun: function () {                                                                                                                                        // 조총: 탁 터짐 + 잔향
      noise({ dur: 0.05, vol: 0.6, lp: 1800 }); tone({ f: 90, dur: 0.3, type: 'sawtooth', vol: 0.22, glide: 0.3 }); noise({ dur: 0.55, vol: 0.12, at: 0.05, lp: 900, lpTo: 300 });
    },
    fire: function () { tone({ f: 58, dur: 0.45, vol: 0.4, glide: 0.5, atk: 0.005 }); noise({ dur: 0.4, vol: 0.2, lp: 320 }); noise({ dur: 0.1, vol: 0.18, lp: 2000 }); },   // 화포: 낮은 쿵
    hwacha: function () {                                                                                                                                     // 화차: 연발
      for (var i = 0; i < 7; i++) { noise({ dur: 0.06, vol: 0.2, at: i * 0.055, lp: 2200 + i * 250 }); tone({ f: 700 + i * 90, dur: 0.12, vol: 0.05, at: i * 0.055, glide: 0.4 }); }
      noise({ dur: 0.5, vol: 0.08, at: 0.3, lp: 1200, lpTo: 400 });
    },
    turtle: function () {                                                                                                                                     // 거북선: 낮은 울림 + 쇠 덮개
      tone({ f: 62, dur: 0.7, type: 'sawtooth', vol: 0.22, lp: 400, atk: 0.05, hold: 0.5 }); tone({ f: 160, dur: 0.45, type: 'sawtooth', vol: 0.12, glide: 0.55, lp: 900, at: 0.08 });
      noise({ dur: 0.25, vol: 0.12, at: 0.05, lp: 1500 }); noise({ dur: 0.08, vol: 0.2, at: 0.45, hp: 2500 });
    },
    sink: function () {                                                                                                                                       // 격침: 하강 글리산도 + 물
      tone({ f: 420, dur: 0.9, type: 'triangle', vol: 0.18, glide: 0.18 }); tone({ f: 630, dur: 0.6, vol: 0.07, glide: 0.2, at: 0.05 }); noise({ dur: 0.9, vol: 0.12, lp: 600, lpTo: 200, atk: 0.1 });
    },
    drum: function () { noise({ dur: 0.2, vol: 0.4, lp: 320 }); tone({ f: 85, dur: 0.22, vol: 0.35, glide: 0.5 }); },                                        // 북
    horn: function () {                                                                                                                                       // 나팔
      tone({ f: 311.1, dur: 0.55, type: 'sawtooth', vol: 0.12, lp: 1600, atk: 0.06, hold: 0.5, vib: 6 }); tone({ f: 466.2, dur: 0.5, type: 'sawtooth', vol: 0.06, lp: 1600, atk: 0.06, hold: 0.5, at: 0.02 });
    },
    banner: function () {                                                                                                                                     // 징
      noise({ dur: 0.06, vol: 0.25, lp: 1200 }); tone({ f: 196, dur: 1.8, vol: 0.22, hold: 0.2 }); tone({ f: 294, dur: 1.5, vol: 0.09, hold: 0.2 }); tone({ f: 392.5, dur: 1.2, vol: 0.05 });
    },
    suspicion: function () { for (var i = 0; i < 5; i++) tone({ f: 104, dur: 0.1, type: 'triangle', vol: 0.18 - i * 0.02, at: i * 0.09 }); tone({ f: 52, dur: 0.6, vol: 0.1 }); },   // 낮은 떨림
    move: function (o) {                                                                                                                                      // 거리 이동: 미끄러짐(원거리쪽이면 올라감)
      var up = !!(o && o.dir < 0);
      tone({ f: up ? 300 : 520, dur: 0.22, vol: 0.08, glide: up ? 1.7 : 0.58 }); noise({ dur: 0.2, vol: 0.07, lp: up ? 900 : 1800, lpTo: up ? 1800 : 900 });
    },
    win: function () {                                                                                                                                        // 승리: 상승 3음(황·중·임)
      [311.1, 415.3, 466.2].forEach(function (f, i) { tone({ f: f, dur: 0.35 + i * 0.25, type: 'triangle', vol: 0.16, at: i * 0.17, hold: 0.3 }); });
      tone({ f: 622.3, dur: 1.1, vol: 0.08, at: 0.5 }); SFX.drum();
    },
    lose: function () {                                                                                                                                       // 패배: 하강
      [233.1, 207.7, 155.6].forEach(function (f, i) { tone({ f: f, dur: 0.6 + i * 0.4, vol: 0.18, at: i * 0.3, hold: 0.4 }); });
      noise({ dur: 1.4, vol: 0.06, lp: 400, atk: 0.3 });
    },
    load: function () {                                                                                                                                       // 장전: 철컥
      noise({ dur: 0.02, vol: 0.2, hp: 2000 }); tone({ f: 1300, dur: 0.02, type: 'square', vol: 0.08 }); noise({ dur: 0.03, vol: 0.16, at: 0.09, hp: 1200 }); tone({ f: 800, dur: 0.03, type: 'square', vol: 0.07, at: 0.09 });
    },
    tide: function () { noise({ dur: 1.3, vol: 0.1, lp: 500, lpTo: 1100, atk: 0.3, hold: 0.4 }); noise({ dur: 0.9, vol: 0.06, at: 0.5, lp: 900, lpTo: 350, atk: 0.2 }); },   // 조류: 물 소리
    parley: function () { tone({ f: 523.3, dur: 0.7, vol: 0.12, hold: 0.1 }); tone({ f: 392, dur: 0.9, vol: 0.1, at: 0.22, hold: 0.1 }); tone({ f: 1046.5, dur: 0.4, vol: 0.03, at: 0.22 }); },   // 회담: 방울 두 음
    hit: function () { noise({ dur: 0.14, vol: 0.26, lp: 2200 }); tone({ f: 160, dur: 0.14, type: 'square', vol: 0.14, glide: 0.4 }); },                      // 피격
    block: function () { tone({ f: 190, dur: 0.14, type: 'triangle', vol: 0.16 }); tone({ f: 1250, dur: 0.05, type: 'square', vol: 0.04 }); noise({ dur: 0.08, vol: 0.12, lp: 800 }); },   // 방어: 방패 울림
    rescue: function () {                                                                                                                                     // 구출: 북 + 나팔 상승
      SFX.drum(); tone({ f: 233.1, dur: 0.5, type: 'sawtooth', vol: 0.1, lp: 1500, at: 0.15, glide: 1.335, atk: 0.05, hold: 0.5 });
      tone({ f: 311.1, dur: 0.6, type: 'sawtooth', vol: 0.1, lp: 1500, at: 0.5, atk: 0.04, hold: 0.5, vib: 5 });
    },
    spawn: function () {                                                                                                                                      // 증원: 북 두 타 + 낮은 나팔
      [0, 0.16].forEach(function (at) { noise({ dur: 0.15, vol: 0.28, at: at, lp: 380 }); tone({ f: 80, dur: 0.18, vol: 0.24, glide: 0.5, at: at }); });
      tone({ f: 207.7, dur: 0.4, type: 'triangle', vol: 0.08, at: 0.3, lp: 1200 });
    }
  };

  /* ---------------------------------------------------------------- 음악 3곡: 시드 선율 + 장단 루프 */
  // drum: 12박 장단. 0 쉼 · 1 쿵(궁편) · 2 덩(궁+채) · 3 덕(채편) · 4 더러러(채 굴림). drumAlt 는 홀수 바퀴에 번갈아.
  // density [박머리, 박 사이] 음 생길 확률 · lens [박머리, 박 사이] 길이 후보(걸음) · range 도수 · start 첫 도수 · bendP 추성(아래서 미끄러져 오름) 확률
  var SONGS = {
    map: { stepSec: 0.285, drum: [2, 0, 3, 1, 4, 0, 1, 0, 3, 1, 4, 0], drumAlt: null, drumVol: 0.16, bass: null, gong: 0, phrases: 8,          // 굿거리
      lead: { type: 'triangle', vol: 0.11, atk: 0.06, vib: 5.5, lp: 2400, oct: 0.22 }, density: [0.55, 0.22], lens: [[2, 3, 3, 6], [1]], range: [3, 11], start: 6, bendP: 0.3 },
    battle: { stepSec: 0.135, drum: [2, 0, 0, 2, 0, 0, 3, 1, 0, 3, 1, 0], drumAlt: [2, 0, 3, 1, 0, 3, 1, 3, 0, 2, 0, 0], drumVol: 0.34, bass: 77.8, gong: 0, phrases: 6,   // 자진모리, 북 강조
      lead: { type: 'sawtooth', vol: 0.085, atk: 0.012, vib: 0, lp: 1500, oct: 0 }, density: [0.8, 0.42], lens: [[1, 2, 3], [1, 1, 2]], range: [5, 14], start: 8, bendP: 0.12 },
    ending: { stepSec: 0.5, drum: [2, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 0], drumAlt: null, drumVol: 0.13, bass: null, gong: 2, phrases: 8,          // 느린 굿거리, 두 바퀴마다 징
      lead: { type: 'sine', vol: 0.14, atk: 0.12, vib: 4.5, lp: 3000, oct: 0.3 }, density: [0.8, 0.1], lens: [[3, 3, 6, 6], [2]], range: [0, 9], start: 3, bendP: 0.4 }
  };
  Object.keys(SONGS).forEach(function (k) { SONGS[k].name = k; });

  var STEPS = [{ w: 0.5, v: -3 }, { w: 1, v: -2 }, { w: 3, v: -1 }, { w: 1.5, v: 0 }, { w: 3, v: 1 }, { w: 1, v: 2 }, { w: 0.5, v: 3 }];
  function nearestFinal(d) { var best = d, bd = 99; FINALS.forEach(function (x) { if (Math.abs(x - d) < bd) { bd = Math.abs(x - d); best = x; } }); return best; }
  // 악구 k(곡마다 phrases 개를 돌려 쓴다) → [null | {d, len, bend}] × PHRASE. 같은 (곡, k) 는 언제나 같은 선율
  function genPhrase(name, k) {
    var S = SONGS[name], r = Core.rngNew(Core.hash('jingbi:' + name + ':' + (k % S.phrases)));
    var out = [], d = S.start, busy = 0, last = null;
    for (var i = 0; i < PHRASE; i++) {
      if (busy > 0) { busy--; out.push(null); continue; }
      var head = i % 3 === 0;
      if (i === 0 || Core.rand(r) < S.density[head ? 0 : 1]) {
        d = Core.clamp(d + Core.weighted(r, STEPS), S.range[0], S.range[1]);
        var len = Math.min(Core.pick(r, S.lens[head ? 0 : 1]), PHRASE - i);
        last = { d: d, len: len, bend: Core.rand(r) < S.bendP };
        out.push(last); busy = len - 1;
      } else out.push(null);
    }
    if (last) last.d = Core.clamp(nearestFinal(last.d), S.range[0], S.range[1]);   // 마침음은 황종·임종
    return out;
  }
  function drumHit(kind, t, vol) {
    var A = { at: t, abs: true, bus: musicBus };
    if (kind === 1 || kind === 2) { tone(Object.assign({ f: 72, dur: 0.26, vol: vol, glide: 0.55 }, A)); noise(Object.assign({ dur: 0.12, vol: vol * 0.7, lp: 300 }, A)); }
    if (kind === 2 || kind === 3) { noise(Object.assign({ dur: 0.05, vol: vol * 0.55, hp: 1800 }, A)); tone(Object.assign({ f: 420, dur: 0.04, type: 'triangle', vol: vol * 0.35 }, A)); }
    if (kind === 4) for (var i = 0; i < 3; i++) noise({ dur: 0.035, vol: vol * 0.3, hp: 2000, at: t + i * 0.045, abs: true, bus: musicBus });
  }
  function gong(t) {
    [98, 147.5, 196.5].forEach(function (f, j) { tone({ f: f, dur: 2.6 - j * 0.5, vol: 0.12 / (j + 1), hold: 0.15, at: t, abs: true, bus: musicBus }); });
    noise({ dur: 0.05, vol: 0.12, lp: 1000, at: t, abs: true, bus: musicBus });
  }
  function scheduleStep(i, t) {
    var S = song, k = i % 12, pat = (S.drumAlt && Math.floor(i / 12) % 2 === 1) ? S.drumAlt : S.drum;
    if (pat[k]) drumHit(pat[k], t, S.drumVol);
    if (S.gong && i % (12 * S.gong) === 0) gong(t);
    if (S.bass && k === 0) tone({ f: S.bass, dur: S.stepSec * 12, type: 'square', vol: 0.05, lp: 300, atk: 0.1, hold: 0.8, at: t, abs: true, bus: musicBus });
    var ph = Math.floor(i / PHRASE), key = S.name + ':' + (ph % S.phrases);
    var phrase = phraseCache[key] || (phraseCache[key] = genPhrase(S.name, ph));
    var n = phrase[i % PHRASE];
    if (!n) return;
    var f = degFreq(n.d), L = S.lead, dur = n.len * S.stepSec * 0.95;
    tone({ f: f, dur: dur, type: L.type, vol: L.vol, atk: L.atk, hold: 0.6, vib: L.vib, lp: L.lp, bend: n.bend ? 0.93 : 0, at: t, abs: true, bus: musicBus });
    if (L.oct) tone({ f: f * 2.003, dur: dur * 0.8, vol: L.vol * L.oct, atk: L.atk, hold: 0.5, at: t, abs: true, bus: musicBus });   // 대금 배음
  }
  function tick() {
    if (!ctx || !song) return;
    var now = ctx.currentTime;
    if (nextT < now - 1) nextT = now;   // 탭이 잠들었다 깨면 밀린 걸음은 버린다
    while (nextT < now + CFG.LOOKAHEAD) { scheduleStep(step, nextT); step++; nextT += song.stepSec; }
  }
  function stopMusic() { if (timer) { clearInterval(timer); timer = null; } song = null; }
  function startMusic(delay) {
    stopMusic();
    if (!ctx || !want || !SONGS[want]) return;
    song = SONGS[want]; step = 0; nextT = ctx.currentTime + (delay || 0.05);
    tick(); timer = setInterval(tick, CFG.TICK_MS);
  }

  /* ---------------------------------------------------------------- fx → sfx 매핑 (순수 함수) */
  var TAG_SFX = { shot: 'shot', melee: 'melee', charge: 'melee', fire: 'fire', none: 'hit', gun: 'gun', bow: 'shot' };
  var CARD_SFX = { hwacha: 'hwacha', hwacha_volley: 'hwacha', turtle_ship: 'turtle', parley: 'parley', war_drum: 'drum', geumsan_drum: 'drum', retreat_horn: 'horn',
    report: 'scroll', memorial: 'scroll', nanjung_diary: 'scroll', manifesto: 'scroll', desperate_call: 'scroll' };
  var ACT_SFX = { load: ['load'], approach: ['move', { dir: 1 }], pull: ['move', { dir: 1 }], rally: ['horn'], signal: ['horn'], build: ['block'], block: ['block'],
    raid: ['card'], flee: ['move', { dir: -1 }], incite: ['suspicion'] };
  var STATUS_SFX = { momentum: 'drum', stun: 'parley', ironwall: 'block', ambush: 'draw' };
  function isShip(id) { try { return typeof ENEMIES !== 'undefined' && ENEMIES.get(id).tags.indexOf('ship') >= 0; } catch (e) { return false; } }
  // p = bus 'fx' payload → [sfxName, opt?] | null
  function fxToSfx(p) {
    if (!p || !p.kind) return null;
    switch (p.kind) {
      case 'turnStart': case 'draw': return ['draw'];
      case 'play': return [CARD_SFX[p.cardId] || 'card'];
      case 'discard': case 'exhaust': return (p.uids && p.uids.length) ? ['card'] : null;
      case 'hit': return [TAG_SFX[p.tag] || 'hit'];
      case 'playerHit': return (p.tag === 'gun' || p.tag === 'bow') ? [TAG_SFX[p.tag]] : [p.n > 0 ? 'hit' : 'block'];
      case 'block': case 'enemyBlock': case 'enemyWall': case 'resist': return ['block'];
      case 'push': return ['move', { dir: p.to < p.from ? -1 : 1 }];
      case 'advance': return ['move', { dir: 1 }];
      case 'status': return STATUS_SFX[p.id] ? [STATUS_SFX[p.id]] : null;
      case 'enemyAct': return ACT_SFX[(p.intent && p.intent.kind) || ''] || null;   // atk 는 playerHit 가 울린다
      case 'enemyDeath': return p.fled ? ['move', { dir: -1 }] : [isShip(p.id) ? 'sink' : 'melee'];
      case 'spawn': return ['spawn'];
      case 'wave': case 'turnCap': return ['drum'];
      case 'banner': return ['banner'];
      case 'tide': return ['tide'];
      case 'load': return ['load'];
      case 'suspicion': return [p.n > 0 ? 'suspicion' : 'scroll'];
      case 'rescue': return ['rescue'];
      case 'stun': return ['parley'];
      case 'heal': return ['parley'];
      case 'win': return ['win'];
      case 'lose': return ['lose'];
    }
    return null;   // buff · energy · ration · log · 그 밖은 소리 없음
  }
  function onFx(p) {
    if (!ctx) return;
    var m = fxToSfx(p); if (!m) return;
    var now = ctx.currentTime;
    if (p.kind === 'hit' && now < hushUntil) return;   // 화차·거북선 소리가 울리는 동안 낱개 타격음은 덮는다
    if (m[0] === 'hwacha' || m[0] === 'turtle') hushUntil = now + CFG.HUSH;
    sfx(m[0], m[1]);
  }

  /* ---------------------------------------------------------------- API */
  function applyGain() {
    if (!master) return;
    var v = muted ? 0 : CFG.MASTER * volume * volume, now = ctx.currentTime;
    master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(v, now, 0.03);
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = (typeof window !== 'undefined' && window) ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
      sfxBus.gain.value = CFG.SFX_GAIN; musicBus.gain.value = CFG.MUSIC_GAIN;
      sfxBus.connect(master); musicBus.connect(master); master.connect(ctx.destination);
      noiseBuf = makeNoise();
      if (typeof Main !== 'undefined' && Main && Main.settings) {   // Main 은 함수 안에서만(지연 참조)
        if (typeof Main.settings.volume === 'number') volume = Core.clamp(Main.settings.volume, 0, 1);
        muted = !!Main.settings.mute;
      }
      applyGain();
      if (ctx.state === 'suspended') ctx.resume();
      startMusic();
    } catch (e) { ctx = null; master = null; return false; }
    return true;
  }
  function sfx(name, opt) {
    if (!ctx || muted) return false;
    var fn = SFX[name]; if (!fn) return false;
    var now = ctx.currentTime;
    if (lastAt[name] != null && now - lastAt[name] < CFG.THROTTLE) return false;   // 같은 틱의 겹친 소리(전체 공격 등)는 한 번만
    lastAt[name] = now;
    try { fn(opt || null); } catch (e) { console.error('[Audio_] sfx ' + name + ': ' + ((e && e.stack) || e)); }
    return true;
  }
  function music(name) {
    name = name || null;
    if (name && !SONGS[name]) { console.error('[Audio_] 없는 곡: ' + name); name = null; }
    if (name === want && (song || !ctx || !name)) return;
    want = name;
    if (!ctx) return;
    var delay = 0.05;
    if (song) {   // 짧게 잦아들고 새 곡
      var g = musicBus.gain, now = ctx.currentTime;
      g.cancelScheduledValues(now); g.setValueAtTime(CFG.MUSIC_GAIN, now);
      g.linearRampToValueAtTime(0.0001, now + CFG.FADE); g.setValueAtTime(CFG.MUSIC_GAIN, now + CFG.FADE + 0.1);
      delay = CFG.FADE + 0.12;
    }
    startMusic(delay);
  }
  function setVolume(v) { volume = Core.clamp(Number(v) || 0, 0, 1); applyGain(); }
  function mute(b) { muted = !!b; applyGain(); }

  function selfTest() {
    var errors = [];
    function check(c, m) { if (!c) errors.push(m); }
    try {
      SFX_NAMES.forEach(function (n) { check(typeof SFX[n] === 'function', 'sfx 없음: ' + n); });
      check(SFX_NAMES.length === 25 && Object.keys(SFX).length === 25, 'sfx 수가 25가 아님: ' + Object.keys(SFX).length);
      Object.keys(SONGS).forEach(function (k) {
        var S = SONGS[k];
        check(S.drum.length === 12 && (!S.drumAlt || S.drumAlt.length === 12), k + ': 장단이 12박이 아님');
        check(S.stepSec > 0 && S.phrases > 0 && S.range[0] <= S.start && S.start <= S.range[1], k + ': 설정값');
        var a = genPhrase(k, 0), b = genPhrase(k, 0), c = genPhrase(k, 1);
        check(JSON.stringify(a) === JSON.stringify(b), k + ': 선율 생성이 결정적이지 않음');
        check(JSON.stringify(a) !== JSON.stringify(c), k + ': 악구 0 과 1 이 같음');
        check(a.length === PHRASE, k + ': 악구 길이 ' + a.length);
        var ok = true, cnt = 0, last = null;
        a.forEach(function (n) { if (n) { cnt++; last = n; if (n.d < S.range[0] || n.d > S.range[1] || n.len < 1) ok = false; } });
        check(ok && cnt >= 3, k + ': 음역·길이 밖이거나 음이 너무 적음(' + cnt + ')');
        check(last && FINALS.indexOf(last.d) >= 0, k + ': 마침음이 황종·임종이 아님');
        for (var ph = 0; ph < S.phrases; ph++) check(genPhrase(k, ph).length === PHRASE, k + ': 악구 ' + ph);
      });
      check(Math.abs(degFreq(0) - 155.56) < 0.01 && Math.abs(degFreq(5) - 311.12) < 0.01 && Math.abs(degFreq(14) - 1046.52) < 0.01, 'degFreq 옥타브');
      var ship = typeof ENEMIES !== 'undefined' ? 'sink' : 'melee';
      var samples = [
        [{ kind: 'hit', tag: 'shot' }, 'shot'], [{ kind: 'hit', tag: 'fire' }, 'fire'], [{ kind: 'hit', tag: 'none' }, 'hit'],
        [{ kind: 'playerHit', n: 0, tag: 'melee' }, 'block'], [{ kind: 'playerHit', n: 5, tag: 'melee' }, 'hit'], [{ kind: 'playerHit', n: 5, tag: 'gun' }, 'gun'],
        [{ kind: 'enemyDeath', id: 'sekibune' }, ship], [{ kind: 'enemyDeath', id: 'samurai' }, 'melee'], [{ kind: 'enemyDeath', id: 'wa_scout', fled: true }, 'move'],
        [{ kind: 'push', from: 1, to: 0 }, 'move'], [{ kind: 'wave' }, 'drum'], [{ kind: 'banner', key: 'crane' }, 'banner'], [{ kind: 'tide', phase: 'flow' }, 'tide'],
        [{ kind: 'play', cardId: 'hwacha' }, 'hwacha'], [{ kind: 'play', cardId: 'turtle_ship' }, 'turtle'], [{ kind: 'play', cardId: 'bowstring' }, 'card'],
        [{ kind: 'enemyAct', intent: { kind: 'load' } }, 'load'], [{ kind: 'enemyAct', intent: { kind: 'atk' } }, null], [{ kind: 'spawn' }, 'spawn'],
        [{ kind: 'suspicion', n: 1 }, 'suspicion'], [{ kind: 'suspicion', n: -1 }, 'scroll'], [{ kind: 'rescue' }, 'rescue'], [{ kind: 'stun' }, 'parley'],
        [{ kind: 'win' }, 'win'], [{ kind: 'lose' }, 'lose'], [{ kind: 'log' }, null], [{ kind: 'buff' }, null], [null, null]
      ];
      samples.forEach(function (s) {
        var m = fxToSfx(s[0]), got = m ? m[0] : null;
        check(got === s[1], 'fx 매핑: ' + JSON.stringify(s[0]) + ' → ' + got + ' (기대 ' + s[1] + ')');
        check(!m || SFX_NAMES.indexOf(m[0]) >= 0, 'fx 매핑이 없는 sfx 를 가리킴: ' + got);
      });
      [TAG_SFX, CARD_SFX, STATUS_SFX].forEach(function (T) { Object.keys(T).forEach(function (k) { check(SFX_NAMES.indexOf(T[k]) >= 0, '표에 없는 sfx: ' + T[k]); }); });
      Object.keys(ACT_SFX).forEach(function (k) { check(SFX_NAMES.indexOf(ACT_SFX[k][0]) >= 0, 'ACT_SFX 없는 sfx: ' + k); });
      if (!ctx) { check(sfx('card') === false, 'ctx 없이 sfx 가 true'); music('map'); check(want === 'map' && !timer, 'ctx 없이 타이머가 생김'); music(null); }
    } catch (e) { errors.push('예외: ' + ((e && e.stack) || e)); }
    return { ok: errors.length === 0, errors: errors };
  }

  if (typeof Core !== 'undefined' && Core.bus) { Core.bus.on('fx', onFx); Core.bus.on('firstInput', function () { init(); }); }

  var api = {
    init: init, sfx: sfx, music: music, setVolume: setVolume, mute: mute,
    isOn: function () { return !!ctx; },
    state: function () { return { on: !!ctx, music: want, volume: volume, muted: muted }; },
    SFX_NAMES: SFX_NAMES.slice(), fxToSfx: fxToSfx, genPhrase: genPhrase, selfTest: selfTest
  };
  return api;
})();
