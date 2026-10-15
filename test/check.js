#!/usr/bin/env node
/**
 * 정적 검사 — 징비 (계약서 §8)
 *   node test/check.js [--strict]
 * 파일 구조·전역·금지 토큰·DSL 어휘(맥락별)·ID 대조·날짜 형식·selfTest·결정성을 본다. 실패가 있으면 종료 코드 1.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');
const results = [];
function rec(name, ok, detail) { results.push({ name, ok, detail: detail || '' }); }

/* ---------------------------------------------------------------- 상수 (계약서와 함께 고친다) */
const ORDER = ['00_core', '01_text', '02_cards', '03_enemies', '04_generals', '05_events', '06_map', '07_combat', '08_run',
  '09_input', '10_audio', '10b_art', '11_ui_battle', '12_ui_screens', '13_main'];
const GLOBALS = { '00_core': 'Core', '01_text': 'TXT', '02_cards': 'CARDS', '03_enemies': 'ENEMIES', '04_generals': 'GENERALS', '05_events': 'EVENTS',
  '06_map': 'MAPDATA', '07_combat': 'Combat', '08_run': 'Run', '09_input': 'Input', '10_audio': 'Audio_', '10b_art': 'ART', '11_ui_battle': 'UIBattle',
  '12_ui_screens': 'UIScreens', '13_main': 'Main' };
const LIMIT = { '00_core': 500, '01_text': 1000, '02_cards': 900, '03_enemies': 700, '04_generals': 500, '05_events': 800, '06_map': 400,
  '07_combat': 1400, '08_run': 1000, '09_input': 400, '10_audio': 400, '10b_art': 900, '11_ui_battle': 1500, '12_ui_screens': 1400, '13_main': 300 };
const CARD_IDS = ('bowstring spear_wall retreat_horn war_drum report hwando throw_stone pyeonjeon seungja hide shield_wall iron_wall pike_square volley scout regroup ' +
  'cavalry_charge arrow_rain archer_ambush samsu whip resolve ash_bag cannon_volley jincheonroe discipline pajin cheonja crane_wing turtle_ship retreat_fire ' +
  'panok_turn daejanggun lure fire_arrow rowers twelve_ships flagship rolling_fire manifesto militia red_robe uiryeong_rising jeongam_ambush geumsan_drum ' +
  'monk_soldiers mountain_raid people_stones monk_rally bamboo_spear ambush_fire scorched_earth counter_spy parley nanjung_diary scarecrow scout_boat memorial ' +
  'beacon castle_well desperate_call baesujin mountain_fort hwacha hyeonja repair_parapet ongseong counter_mound gate_sally boiling_water pyongyang_bombard ' +
  'nambyeong_cannon li_cavalry folangji langseon request_troops chen_lin_bombard deng_zilong ming_navy_square pilsa_jeuksaeng not_one_ship sinsang_pilbeol ' +
  'danghangpo_lure hwacha_volley sema die_standing level_ground jeolla_right wall_rally bukgwan_cavalry seven_hundred ichi_bow yeonan_fort edict_advance ' +
  'edict_blame edict_arrest edict_envy jochong dokjeon').split(' ');
const ENEMY_IDS = 'ashigaru_spear ashigaru_gun wa_archer mounted_samurai samurai wa_captain siege_laborer bamboo_bundle nobushi sekibune kobaya atakebune enemy_flagship wajo_garrison rebel_monghak wa_scout konishi wakizaka hosokawa ukita_w1 ukita_w2 ukita_w3 kuroda todo kurushima shimazu_p1 shimazu_p2'.split(' ');
const RELIC_IDS = 'turtle_blueprint jincheonroe_relic hwacha_relic nanjung_relic jingbirok tonga hangwae_gun obangnang seoae_brush chains joryeong_stone hansan_drum jinju_drum haengju_ash jiksan_spear myeongnyang_chain tongjeyeong_flag'.split(' ');
const DEPUTY_IDS = 'gwon yi yi_eokgi kim_simin jeong_munbu jo_heon hwang_jin yi_jeongam'.split(' ');
const COMMON_OPS = 'suspicion ration hp addCard removeCard flag leave cond fx'.split(' ');
const BATTLE_OPS = 'dmg block push pull draw energy status stun buff exhaustHand discard exhaust retrieve mark delay stripBlock'.split(' ');
const RUN_OPS = 'upgrade relic score battle recruit ending offer'.split(' ');
const HOOKS = 'onBattleStart onTurnStart onTurnEnd onCardPlayed onCardDrawn onDamageDealt onDamageTaken onDistanceChange onEnemyDeath onEnemySpawn onWaveStart onHpZero onBattleEnd onActStart onAcquire'.split(' ');
const MODS = ['dmgBonus', 'atkPct', 'costDelta', 'blockKeep'];
const STATUS = 'shaken exposed hunger momentum ambush ironwall stun flinch loaded'.split(' ');
const BUFFS = 'nextAtk atkAdd shotAdd atkPct shotPct evadeFirst hide noAtk noMelee noPushBattle wallPersist chargeAtClose noAdvance passivesOff minHp1'.split(' ');
const COND_KEYS = 'dist distNot hpPct naval siege assault field turn turnLte hasWall tide wave cardTag cardType cardPool cardId cardMarked enemyId enemyTag handCount cardsPlayedThisTurn deckTagCount hasCard hasRelic hasDeputy noDeputy flag leader lane act actGte ration suspicion slotsFree oncePerBattle oncePerTurn'.split(' ');
const INTENT_KINDS = 'atk approach pull block load rally build reinforce raid signal flee incite ops'.split(' ');
const DATE_RE = /^\d{4}\.\d{1,2}(\.\d{1,2})?(~\d{1,2}(\.\d{1,2})?)?$/;
const FORBID = ['window', 'document', 'localStorage', 'requestAnimationFrame', 'AudioContext', 'Math.random', 'Date', 'performance', 'setTimeout'];

/* ---------------------------------------------------------------- 1. 파일·순서·줄 수·전역 */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script\s+src="src\/([^"]+)\.js"\s*>\s*<\/script>/g)].map((m) => m[1]);
rec('index.html 스크립트 순서', JSON.stringify(srcs) === JSON.stringify(ORDER), srcs.join(','));
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''").replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}
for (const f of ORDER) {
  const p = path.join(ROOT, 'src', f + '.js');
  if (!fs.existsSync(p)) { rec('파일 ' + f, !strict, '없음'); continue; }
  const code = fs.readFileSync(p, 'utf8'), lines = code.split('\n').length, lim = LIMIT[f];
  rec('줄 수 ' + f, lines <= lim * 1.2, lines + ' / ' + lim + (lines > lim ? ' (상한 초과 — 20% 안)' : ''));
  const body = stripComments(code);
  if (/^0[2-8]_/.test(f)) {
    const hits = FORBID.filter((t) => new RegExp('(^|[^\\w.$])' + t.replace('.', '\\.') + '(?![\\w$])').test(body));
    rec('순수성 ' + f, hits.length === 0, hits.join(','));
  }
  if (/^(09|10|10b|11|12)_/.test(f)) {
    // IIFE 최상위(들여쓰기 2칸 문장)에서 Main 을 읽지 않는다
    const topMain = body.split('\n').filter((l) => /^ {2}(var|[A-Za-z_$][\w$]*\s*=)/.test(l) && /\bMain\./.test(l));
    rec('지연 참조 ' + f, topMain.length === 0, topMain.slice(0, 2).join(' | '));
  }
}
// 파일 하나 = 전역 하나: 빈 vm 에 순서대로 올리며 새로 생긴 전역 이름을 센다
{
  const vm = require('vm'), { makeWindow } = require('./headless.js');
  const w = makeWindow(), c = vm.createContext(w);
  for (const f of ORDER) {
    const p = path.join(ROOT, 'src', f + '.js'); if (!fs.existsSync(p)) continue;
    const before = new Set(Object.keys(c));
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), c, { filename: f }); } catch (e) { rec('전역 ' + f, false, '로드 오류 ' + e.message); continue; }
    const added = Object.keys(c).filter((k) => !before.has(k) && k !== '__J');
    rec('전역 ' + f, added.length === 1 && added[0] === GLOBALS[f], added.join(','));
  }
}
const dist = path.join(ROOT, 'jingbi.html');
if (fs.existsSync(dist)) {
  const raw = fs.readFileSync(dist, 'utf8'), d = stripComments(raw);
  const ext = [/<script\s+src=/i, /<link\s/i, /https?:\/\/(?!localhost)/i, /\bfetch\(/, /XMLHttpRequest/];
  const bad = ext.filter((r) => r.test(d)).map(String);
  rec('빌드본 외부 참조 0', bad.length === 0, bad.join(','));
  // 빌드본이 지금 src 와 같은지: build.py 는 각 src 파일을 그대로(줄끝만 바뀐 채) <script> 안에 넣는다
  const built = raw.replace(/\r\n/g, '\n');
  const stale = ORDER.filter((f) => {
    const p = path.join(ROOT, 'src', f + '.js'); if (!fs.existsSync(p)) return false;
    const code = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/<\/script>/g, '<\\/script>');
    return !built.includes(code);
  });
  rec('빌드본 최신 (jingbi.html = src)', stale.length === 0,
    stale.length ? '옛 내용: ' + stale.join(',') + ' — py -3 build.py --out jingbi.html 을 다시 실행하라' : '');
}

/* ---------------------------------------------------------------- 2. 로드 */
const { loadScripts } = require('./headless.js');
let ctx;
try { ({ ctx } = loadScripts()); rec('헤드리스 로드', true); } catch (e) { rec('헤드리스 로드', false, String(e)); }
const G = (name) => { try { return require('vm').runInContext('typeof ' + name + ' !== "undefined" ? ' + name + ' : null', ctx); } catch (e) { return null; } };
const CARDS = G('CARDS'), ENEMIES = G('ENEMIES'), GENERALS = G('GENERALS'), EVENTS = G('EVENTS'), MAPDATA = G('MAPDATA'), Combat = G('Combat'), Run = G('Run'), Core = G('Core');

/* ---------------------------------------------------------------- 3. DSL 어휘 (맥락별) */
const vocabErr = [];
function walkCond(c, where) { if (!c || typeof c !== 'object') return; for (const k of Object.keys(c)) if (!COND_KEYS.includes(k)) vocabErr.push(where + ': cond 키 ' + k); }
function walkOps(ops, ctxName, where, cardTop) {
  if (ops == null) return;
  if (!Array.isArray(ops)) { vocabErr.push(where + ': ops 가 배열이 아님'); return; }
  const allow = COMMON_OPS.concat(ctxName === 'battle' ? BATTLE_OPS : RUN_OPS);
  for (const o of ops) {
    if (!o || typeof o !== 'object') { vocabErr.push(where + ': op 가 객체가 아님'); continue; }
    if (!allow.includes(o.op)) vocabErr.push(where + ': ' + ctxName + ' 맥락에서 허용 안 된 op ' + o.op);
    if (o.choose && !cardTop && ['discard', 'exhaust', 'retrieve'].includes(o.op)) vocabErr.push(where + ': 전투 고르기(choose)는 카드 ops 안에서만');
    if (o.op === 'status' && !STATUS.includes(o.id)) vocabErr.push(where + ': status id ' + o.id);
    if (o.op === 'buff' && !BUFFS.includes(o.id)) vocabErr.push(where + ': buff id ' + o.id);
    if (o.op === 'cond') { walkCond(o.if, where); walkOps(o.then, ctxName, where, cardTop); walkOps(o.else, ctxName, where, cardTop); }
    if (o.op === 'exhaustHand') walkOps(o.perCard, 'battle', where + '.perCard', false);
    if (o.op === 'delay') walkOps(o.ops, 'battle', where + '.delay', false);
    if (o.op === 'battle') { walkOps(o.onWin, 'run', where + '.onWin', false); walkHandlers(o.handlers, where + '.handlers'); }
  }
}
function walkHandlers(hs, where) {
  if (!hs) return;
  for (const h of hs) { if (!HOOKS.includes(h.hook)) vocabErr.push(where + ': 훅 ' + h.hook); walkCond(h.cond, where); walkOps(h.ops, 'battle', where + '.' + h.hook, false); }
}
function walkMods(ms, where) { for (const m of ms || []) { if (!MODS.includes(m.mod)) vocabErr.push(where + ': mod ' + m.mod); walkCond(m.if, where); } }
if (CARDS && ENEMIES && GENERALS && EVENTS && MAPDATA) {
  for (const c of CARDS.list) {
    walkOps(c.ops, 'battle', 'card ' + c.id, true); walkOps(c.onDraw, 'battle', 'card ' + c.id + '.onDraw', false);
    if (c.plus) { walkOps(c.plus.ops, 'battle', 'card ' + c.id + '+', true); walkOps(c.plus.onDraw, 'battle', 'card ' + c.id + '+.onDraw', false); }
    if (c.costIf) walkCond(c.costIf.if, 'card ' + c.id + '.costIf');
  }
  for (const e of ENEMIES.list) {
    for (const it of e.intents) { if (!INTENT_KINDS.includes(it.kind)) vocabErr.push('enemy ' + e.id + ': 의도 ' + it.kind); if (it.kind === 'ops') walkOps(it.ops, 'battle', 'enemy ' + e.id, false); if (it.alt) walkCond(it.alt.if, 'enemy ' + e.id + '.alt'); }
    walkHandlers(e.handlers, 'enemy ' + e.id);
  }
  for (const enc of ENEMIES.encounters.list) {
    walkHandlers(enc.handlers, 'enc ' + enc.id);
    for (const w of enc.waves || []) walkOps(w.onStart, 'battle', 'enc ' + enc.id + '.wave', false);
    if (enc.reward) walkOps(enc.reward.ops, 'run', 'enc ' + enc.id + '.reward', false);
  }
  for (const g of GENERALS.leaders.list.concat(GENERALS.deputies.list)) { walkHandlers(g.passive && g.passive.handlers, 'gen ' + g.id); walkMods(g.passive && g.passive.mods, 'gen ' + g.id); }
  for (const r of GENERALS.relics.list) {
    walkHandlers(r.handlers, 'relic ' + r.id); walkHandlers(r.upHandlers, 'relic ' + r.id + '+'); walkMods(r.mods, 'relic ' + r.id);
    walkOps(r.onAcquire, 'run', 'relic ' + r.id + '.onAcquire', false); if (r.runMods) walkOps(r.runMods.actStartOps, 'run', 'relic ' + r.id + '.actStart', false);
  }
  for (const ev of EVENTS.list) {
    ev.choices.forEach((ch, i) => { walkOps(ch.ops, 'run', ev.id + '#' + i, false); walkCond(ch.if, ev.id + '#' + i); });
    for (const v of ev.variants || []) { walkCond(v.if, ev.id + '.variant'); (v.patch.choices || []).forEach((ch, i) => { walkOps(ch.ops, 'run', ev.id + '.variant#' + i, false); walkCond(ch.if, ev.id + '.variant#' + i); }); }
  }
  for (const n of MAPDATA.nodes.list) {
    walkOps(n.onWin, 'run', 'node ' + n.id + '.onWin', false);
    if (n.courtOps) for (const k in n.courtOps) walkOps(n.courtOps[k], 'run', 'node ' + n.id + '.courtOps', false);
    for (const v of n.variants || []) walkCond(v.if, 'node ' + n.id + '.variant');
  }
  rec('DSL 어휘(op·훅·cond·mod·status·buff·의도)', vocabErr.length === 0, vocabErr.slice(0, 8).join(' | '));

  /* ---------------------------------------------------------------- 4. ID 대조 */
  const cardIds = CARDS.list.map((c) => c.id);
  rec('카드 99장 ID', cardIds.length === 99 && CARD_IDS.every((id) => cardIds.includes(id)), cardIds.length + '장, 빠짐 ' + CARD_IDS.filter((id) => !cardIds.includes(id)).join(','));
  rec('적 27 ID', ENEMY_IDS.every((id) => ENEMIES.byId[id]) && ENEMIES.list.length === 27, ENEMIES.list.length + '');
  rec('기물 17', RELIC_IDS.every((id) => GENERALS.relics.byId[id]) && GENERALS.relics.list.length === 17, GENERALS.relics.list.length + '');
  rec('부장 8 · 주장 2', DEPUTY_IDS.every((id) => GENERALS.deputies.byId[id]) && GENERALS.leaders.list.length === 2, '');
  const evIds = EVENTS.list.map((e) => e.id);
  rec('사건 29', evIds.length === 29 && evIds.every((id, i) => id === 'E' + (i + 1)) && new Set(EVENTS.list.map((e) => e.key)).size === 29, evIds.length + '');
  const cols = [1, 2, 3, 4, 5, 6, 7].map((a) => MAPDATA.acts[a].cols.length);
  rec('열 49 (7/8/8/6/7/6/7)', JSON.stringify(cols) === '[7,8,8,6,7,6,7]', JSON.stringify(cols));
  const refErr = [];
  for (const n of MAPDATA.nodes.list) {
    for (const enc of [n.enc, n.bossEnc]) if (enc && enc !== 'pool' && !ENEMIES.encounters.byId[enc]) refErr.push(n.id + ' enc ' + enc);
    for (const e of [n.eventId, n.courtEvent]) if (e && !EVENTS.byId[e]) refErr.push(n.id + ' event ' + e);
    for (const d of n.recruits || []) if (!GENERALS.deputies.byId[d]) refErr.push(n.id + ' recruit ' + d);
    if (n.date && !DATE_RE.test(n.date)) refErr.push(n.id + ' 날짜 ' + n.date);
  }
  for (const a of [1, 2, 3, 4, 5, 6, 7]) {
    const cs = MAPDATA.acts[a].cols;
    cs.forEach((col, i) => { if (col.some((id) => ['boss', 'council'].includes(MAPDATA.nodes.byId[id].kind)) && i > 0) { const prev = cs[i - 1].map((id) => MAPDATA.nodes.byId[id].kind); if (!prev.every((k) => k === 'court')) refErr.push(a + '막 결전 앞 열이 조정이 아님'); } });
  }
  const seenRef = (ops, where) => (ops || []).forEach((o) => {
    if (o.op === 'addCard' && o.id && !CARDS.byId[o.id]) refErr.push(where + ' card ' + o.id);
    if (o.op === 'relic' && !GENERALS.relics.byId[o.id]) refErr.push(where + ' relic ' + o.id);
    if ((o.op === 'recruit' || o.op === 'leave') && !GENERALS.deputies.byId[o.id]) refErr.push(where + ' deputy ' + o.id);
    if (o.op === 'battle' && !ENEMIES.encounters.byId[o.enc]) refErr.push(where + ' enc ' + o.enc);
    if (o.op === 'cond') { seenRef(o.then, where); seenRef(o.else, where); }
    if (o.op === 'battle') seenRef(o.onWin, where);
  });
  EVENTS.list.forEach((ev) => { ev.choices.forEach((ch) => seenRef(ch.ops, ev.id)); (ev.variants || []).forEach((v) => (v.patch.choices || []).forEach((ch) => seenRef(ch.ops, ev.id))); });
  for (const c of CARDS.list) { if (c.home && !(c.tags || []).includes('uibyeong')) refErr.push('card ' + c.id + ' home 인데 uibyeong 태그 없음'); }
  for (const pool of Object.values(ENEMIES.pools)) for (const id of pool.normal.concat(pool.elite)) if (!ENEMIES.encounters.byId[id]) refErr.push('pool ' + id);
  rec('참조 ID·날짜·결전 앞 조정·의병 태그', refErr.length === 0, refErr.slice(0, 8).join(' | '));

  /* ---------------------------------------------------------------- 5. 데이터 JSON 왕복 */
  const rt = (o) => JSON.stringify(JSON.parse(JSON.stringify(o))) === JSON.stringify(o);
  rec('데이터 JSON 왕복', [CARDS.list, ENEMIES.list, ENEMIES.encounters.list, EVENTS.list, MAPDATA.nodes.list].every(rt), '');
}

/* ---------------------------------------------------------------- 6. selfTest */
for (const name of ['Core', 'TXT', 'CARDS', 'ENEMIES', 'GENERALS', 'EVENTS', 'MAPDATA', 'Input', 'Combat', 'Run']) {
  const g = G(name);
  if (!g || typeof g.selfTest !== 'function') { rec('selfTest ' + name, !strict, '없음'); continue; }
  let r; try { r = g.selfTest(); } catch (e) { r = { ok: false, errors: [String(e)] }; }
  rec('selfTest ' + name, !!r.ok, (r.errors || []).slice(0, 3).join(' | '));
}

/* ---------------------------------------------------------------- 7. 결정성 (전투·판) */
if (Combat && Run && Core) {
  let ok = true, why = '';
  for (let s = 1; s <= 20 && ok; s++) {
    Run.newRun(s % 2 ? 'yi' : 'gwon', 500 + s);
    let p = Run.current(); let guard = 0;
    while (p.kind !== 'map' && guard++ < 10) { Run.answer({}); p = Run.current(); }
    Run.answer({ nodeId: p.reachable[0] });
    p = Run.current(); guard = 0;
    while (p.kind !== 'battle' && guard++ < 10) { Run.answer(p.kind === 'event' ? { choice: 0 } : {}); p = Run.current(); }
    if (p.kind !== 'battle') continue;
    const st = Combat.create(p.req), r = Core.rngNew('det' + s);
    const step = (x, rr) => {
      if (x.phase === 'choose') return ['choose', [0]];
      if (x.phase === 'rescue') return ['chooseRescue', x.rescue.pending[0]];
      const mv = Combat.legalMoves(x);
      if (!mv.length || Core.rand(rr) < 0.2) return ['endTurn'];
      const m = Core.pick(rr, mv); return ['play', m.handIdx, m.targets ? Core.pick(rr, m.targets) : null];
    };
    for (let k = 0; k < 6 && st.phase !== 'done'; k++) { const a = step(st, r); Combat[a[0]](st, ...a.slice(1)); }
    const a = st, b = Core.clone(st), seq = [];
    for (let k = 0; k < 12 && a.phase !== 'done'; k++) { const m = step(a, r); seq.push(m); Combat[m[0]](a, ...m.slice(1)); }
    seq.forEach((m) => { if (b.phase !== 'done') Combat[m[0]](b, ...m.slice(1)); });
    if (JSON.stringify(a) !== JSON.stringify(b)) { ok = false; why = '전투 시드 ' + s; }
  }
  rec('결정성: 전투 JSON 왕복 → 같은 입력 → 같은 상태', ok, why);
  // 판: 같은 시드와 같은 답 수열 → 같은 G
  const play = (seed) => {
    Run.newRun('yi', seed); const r = Core.rngNew('runDet'); let n = 0;
    while (n++ < 60) {
      const p = Run.current(); if (!p) break;
      if (p.kind === 'battle') { Run.answer({ result: { won: true, hp: p.req.hp - 3, maxHp: p.req.maxHp, ration: p.req.ration, suspicionDelta: 0, turns: 4, flagsOut: {}, deckChanges: [], generalsLost: [], rescued: false, stats: {} } }); continue; }
      const a = p.kind === 'map' ? { nodeId: Core.pick(r, p.reachable) } : p.kind === 'event' ? { choice: p.choices.findIndex((c) => c.enabled) } : p.kind === 'shop' ? { leave: true }
        : p.kind === 'camp' ? { pick: p.options.find((o) => o.enabled).id } : p.kind === 'court' ? { pick: 'report' } : p.kind === 'reward' ? { cardIdx: 0 } : p.kind === 'merit' ? { alloc: p.defaults }
        : p.kind === 'pickCard' ? { picks: [0] } : p.kind === 'pickGeneral' ? { id: null } : p.kind === 'council' ? (p.page === 2 ? { verdict: true } : { next: true }) : {};
      Run.answer(a);
    }
    return JSON.stringify(Run.state());
  };
  rec('결정성: 판 (같은 시드·같은 답 → 같은 G)', play(4321) === play(4321), '');
}

/* ---------------------------------------------------------------- 8. 글자 위생 (화면에 나오는 글) */
// 한자·「」『』〔〕·영어 꼬리표 '(shot)'·'이(가)' 꼴 조사·'___' 빈칸·채우지 못한 '{자리표}'·턴을 뜻하는 '합'을 잡는다.
// 데이터 표(TXT·CARDS·ENEMIES·GENERALS·EVENTS·MAPDATA)는 fill 이 아는 자리표({n} {name:iga} …)를 허용하고,
// 생성 문구(opsText·cardDesc·condText·log·결말·두루마리)와 Run 프롬프트·전투 로그는 자리표가 하나라도 남으면 실패다.
const TXTg = G('TXT');
if (TXTg && CARDS && ENEMIES && GENERALS && EVENTS && MAPDATA && Run && Combat && Core) {
  const CJK = /[⺀-⿟々〇〡-〩〸-〻㐀-䶿一-鿿豈-﫿]|[\uD840-\uD87F][\uDC00-\uDFFF]/;
  const RULES = [
    ['한자', (s) => CJK.test(s)],
    ['「」『』〔〕', (s) => /[「」『』〔〕]/.test(s)],
    ['영어 꼬리표', (s) => /\([a-z_·]+\)/.test(s)],
    ["'이(가)' 꼴 조사", (s) => /이\(가\)|을\(를\)|은\(는\)|와\(과\)|\(으\)로/.test(s)],
    ["'___' 빈칸", (s) => /___/.test(s)],
    ["턴을 뜻하는 '합'", (s) => /\d\s*합(?![계류])|(^|[^가-힣])합(을|\.|$|째|\s*안)/.test(s)],
  ];
  const FILL_KEYS = TXTg.FILL_KEYS || ['n', 'pct', 'name', 'text', 'dist'];
  const PH = new RegExp('\\{(' + FILL_KEYS.join('|') + ')(:(iga|eunun|eulrul|euro))?\\}', 'g');
  const SKIP = new Set(['hanja', 'id', 'key', 'op', 'kind', 'hook', 'mod', 'src', 'encId', 'nodeId', 'eventId', 'bossEnc', 'enc', 'uid']);
  const errs = []; let checked = 0;
  function test(s, where, final) {
    if (typeof s !== 'string' || !/[^\x00-\x7F]/.test(s)) {           // 순수 ASCII 는 ID·코드다 — 자리표만 본다
      if (typeof s === 'string' && final && /[{}]/.test(s)) errs.push(where + ': 남은 자리표 “' + s.slice(0, 60) + '”');
      return;
    }
    checked++;
    for (const [name, bad] of RULES) if (bad(s)) { errs.push(where + ' [' + name + ']: “' + s.slice(0, 70) + '”'); return; }
    const rest = final ? s : s.replace(PH, '');
    if (/[{}]/.test(rest)) errs.push(where + ' [' + (final ? '채우지 못한 자리표' : '모르는 자리표') + ']: “' + s.slice(0, 70) + '”');
  }
  function walk(v, where, final, seen) {
    seen = seen || new Set();
    if (v == null || typeof v === 'function') return;
    if (typeof v === 'string') { test(v, where, final); return; }
    if (typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, where + '[' + i + ']', final, seen)); return; }
    for (const k of Object.keys(v)) if (!SKIP.has(k)) walk(v[k], where + '.' + k, final, seen);
  }
  // 1) 데이터 표
  walk(TXTg, 'TXT', false);
  walk(CARDS.list, 'CARDS', false); walk(ENEMIES.list, 'ENEMIES', false); walk(ENEMIES.encounters.list, 'ENEMIES.encounters', false);
  walk(GENERALS.leaders.list, 'GENERALS.leaders', false); walk(GENERALS.deputies.list, 'GENERALS.deputies', false); walk(GENERALS.relics.list, 'GENERALS.relics', false);
  walk(EVENTS.list, 'EVENTS', false); walk(EVENTS.court, 'EVENTS.court', false); walk(EVENTS.camp, 'EVENTS.camp', false);
  walk(MAPDATA.acts, 'MAPDATA.acts', false); walk(MAPDATA.nodes.list, 'MAPDATA.nodes', false); walk(MAPDATA.terrains.list, 'MAPDATA.terrains', false);
  // 2) 생성 문구
  const gen = (where, f) => { try { walk(f(), where, true); } catch (e) { errs.push(where + ': 예외 ' + e.message); } };
  const opsLists = [], conds = [];
  const collect = (ops, where) => (ops || []).forEach((o) => {
    if (!o) return;
    if (o.op === 'cond') { conds.push([o.if, where]); collect(o.then, where); collect(o.else, where); }
    if (o.op === 'delay') collect(o.ops, where); if (o.op === 'exhaustHand') collect(o.perCard, where);
    if (o.op === 'battle') { collect(o.onWin, where); (o.handlers || []).forEach((h) => { conds.push([h.cond, where]); collect(h.ops, where); }); }
  });
  const addOps = (ops, where) => { if (ops && ops.length) { opsLists.push([ops, where]); collect(ops, where); } };
  for (const c of CARDS.list) {
    addOps(c.ops, 'card ' + c.id); addOps(c.onDraw, 'card ' + c.id + '.onDraw'); if (c.plus) addOps(c.plus.ops, 'card ' + c.id + '+');
    if (c.costIf) conds.push([c.costIf.if, 'card ' + c.id + '.costIf']);
    for (const up of [false, true]) for (const dist of [undefined, 0, 1, 2]) gen('cardDesc ' + c.id + (up ? '+' : ''), () => TXTg.cardDesc(c, up, dist === undefined ? undefined : { dist }));
  }
  for (const ev of EVENTS.list) {
    const chs = ev.choices.concat(...(ev.variants || []).map((v) => { conds.push([v.if, ev.id + '.variant']); return v.patch.choices || []; }));
    chs.forEach((ch, i) => { addOps(ch.ops, ev.id + '#' + i); if (ch.if) conds.push([ch.if, ev.id + '#' + i]); });
  }
  for (const r of GENERALS.relics.list) {
    (r.handlers || []).concat(r.upHandlers || []).forEach((h) => { addOps(h.ops, 'relic ' + r.id); conds.push([h.cond, 'relic ' + r.id]); });
    addOps(r.onAcquire, 'relic ' + r.id + '.onAcquire'); if (r.runMods) addOps(r.runMods.actStartOps, 'relic ' + r.id);
  }
  for (const g of GENERALS.leaders.list.concat(GENERALS.deputies.list)) (g.passive.handlers || []).forEach((h) => { addOps(h.ops, 'gen ' + g.id); conds.push([h.cond, 'gen ' + g.id]); });
  for (const n of MAPDATA.nodes.list) {
    addOps(n.onWin, 'node ' + n.id); if (n.courtOps) for (const k in n.courtOps) addOps(n.courtOps[k], 'node ' + n.id);
    (n.variants || []).forEach((v) => conds.push([v.if, 'node ' + n.id]));
    gen('date ' + n.id, () => TXTg.date(n.date));
  }
  for (const enc of ENEMIES.encounters.list) {
    (enc.handlers || []).forEach((h) => { addOps(h.ops, 'enc ' + enc.id); conds.push([h.cond, 'enc ' + enc.id]); });
    (enc.waves || []).forEach((w) => addOps(w.onStart, 'enc ' + enc.id + '.wave'));
    if (enc.reward) addOps(enc.reward.ops, 'enc ' + enc.id + '.reward');
  }
  opsLists.forEach(([ops, where]) => gen('opsText ' + where, () => TXTg.opsText(ops)));
  conds.forEach(([c, where]) => { if (c) gen('condText ' + where, () => TXTg.condText(c)); });
  const someCard = CARDS.byId.bowstring;
  const LOG_ARGS = { play: [someCard], hit: ['왜군 조총병', 7, true], enemyAct: ['왜군 창병', { kind: 'atk', n: 8, text: '찌르기' }], playerHit: [6, '왜장'],
    blocked: [5], dead: ['왜장'], sunk: ['왜군 중선'], fled: ['왜군 척후'], push: [2, 1], advance: [1], turn: [3], starve: ['무사', 2], stunned: ['무사'], resist: ['기마 무사'],
    spawn: ['왜군 중선'], wave: [2], tide: ['flow', 3], rescue: ['황진'], raid: [3], incite: [1], build: ['공성 인부', 2], rally: ['무사', 2], draw: [2],
    exhaust: [someCard], edictDrawn: [CARDS.byId.edict_advance], leave: ['조헌·영규'], ambush: [8] };
  for (const k of Object.keys(TXTg.log)) gen('TXT.log.' + k, () => TXTg.log[k].apply(null, LOG_ARGS[k] || []));
  for (const k of Object.keys(TXTg.compare)) gen('TXT.compare.' + k, () => TXTg.compare[k]({ turns: 7, shipsLeft: 3, wavesCleared: 2, pushes: 4, dmgTaken: 30 }));
  const gs = [{ act: 1, leader: 'yi', flags: {} }, { act: 4, leader: 'gwon', suspicion: 9, flags: { b1: 'ridge', lane2: 'sea', jinju1_held: true, dismissed: true, chilcheon: true, rescuedUsed: true } },
    { act: 7, leader: 'yi', flags: { b1: 'fort', lane2: 'land', dismissed: false, busan_held: true } }, { act: 3, leader: 'gwon', flags: { b1: 'river' } }];
  for (const k of Object.keys(TXTg.ending)) gs.forEach((g, i) => gen('TXT.ending.' + k + '#' + i, () => TXTg.ending[k].lines(g)));
  [{ leader: 4, king: 6 }, { leader: 10 }, { king: 3, ming: 5, leader: 2 }, {}].forEach((a, i) => gen('TXT.merit.result#' + i, () => TXTg.merit.result(a)));
  gen('TXT.council.verdict', () => [TXTg.council.verdict(5, false), TXTg.council.verdict(8, true)]);
  gen('TXT.rescue', () => TXTg.rescue('조헌·영규'));
  for (const k of Object.keys(TXTg.scroll).concat(Object.keys(TXTg.scroll.bossIntro))) if (k !== 'bossIntro') gen('scrollFor ' + k, () => TXTg.scrollFor(k, { name: '이억기' }));
  gen('banner.leave', () => TXTg.fill(TXTg.banner.leave, { name: '조헌·영규' }));
  for (const d of Object.keys(TXTg.memo)) gen('dateLine ' + d, () => TXTg.dateLine(d));
  // 3) Run 프롬프트와 전투 로그·배너 (실제로 화면에 넘어가는 값)
  const fxTexts = []; const off = Core.bus.on('fx', (p) => { if (p && typeof p.text === 'string') fxTexts.push(p.text); });
  try {
    for (const [leader, seed] of [['yi', 31], ['gwon', 5], ['yi', 77]]) {
      Run.newRun(leader, seed); const r = Core.rngNew('hyg' + seed); let n = 0;
      while (n++ < 400) {
        const p = Run.current(); if (!p) break;
        walk(p, 'Run[' + seed + '] ' + p.kind, true);
        if (p.kind === 'battle') {
          if (n < 120) {                                               // 전투 몇 판은 실제로 굴려 로그를 본다
            const st = Combat.create(p.req); let k = 0;
            while (st.phase !== 'done' && k++ < 60) {
              if (st.phase === 'choose') Combat.choose(st, [0]);
              else if (st.phase === 'rescue') Combat.chooseRescue(st, st.rescue.pending[0]);
              else { const mv = Combat.legalMoves(st); if (!mv.length || Core.rand(r) < 0.25) Combat.endTurn(st); else { const m = Core.pick(r, mv); Combat.play(st, m.handIdx, m.targets ? Core.pick(r, m.targets) : null); } }
            }
            walk(st.log, 'Combat log ' + p.req.encId, true);
            walk(st.enemies.map((e) => e.name), 'Combat enemy', true);
          }
          Run.answer({ result: { won: true, hp: Math.max(1, p.req.hp - 3), maxHp: p.req.maxHp, ration: p.req.ration, suspicionDelta: 0, turns: 4, flagsOut: {}, deckChanges: [], generalsLost: [], rescued: false, stats: {} } });
          continue;
        }
        const a = p.kind === 'map' ? { nodeId: Core.pick(r, p.reachable) } : p.kind === 'event' ? { choice: p.choices.findIndex((c) => c.enabled) } : p.kind === 'shop' ? { leave: true }
          : p.kind === 'camp' ? { pick: p.options.find((o) => o.enabled).id } : p.kind === 'court' ? { pick: 'report' } : p.kind === 'reward' ? { cardIdx: 0 } : p.kind === 'merit' ? { alloc: p.defaults }
          : p.kind === 'pickCard' ? { picks: [0] } : p.kind === 'pickGeneral' ? { id: null } : p.kind === 'council' ? (p.page === 2 ? { verdict: true } : { next: true }) : {};
        Run.answer(a);
      }
    }
  } catch (e) { errs.push('Run/Combat 순회 예외: ' + e.message); } finally { if (typeof off === 'function') off(); }
  walk(fxTexts, 'fx 배너', true);
  const uniq = [...new Set(errs)];
  rec('글자 위생 (한자·「」·영어 꼬리표·조사 꼴·빈칸·자리표·합) — 문자열 ' + checked + '개', uniq.length === 0, uniq.length + '건: ' + uniq.slice(0, 8).join(' | '));
}

/* ---------------------------------------------------------------- 출력 */
const fails = results.filter((r) => !r.ok);
for (const r of results) console.log((r.ok ? '  ok  ' : ' FAIL ') + r.name + (r.detail ? '  — ' + r.detail : ''));
console.log('\n' + (results.length - fails.length) + '/' + results.length + ' 통과' + (fails.length ? ', 실패 ' + fails.length : ''));
process.exitCode = fails.length ? 1 : 0;
