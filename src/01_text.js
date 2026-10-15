/* ===== 01_text.js — TXT: 모든 문장·날짜 표기·규칙 문구 생성·패망·결말·역사 대조·사료 메모 ===== */
// 문자 규칙: 화면에 나오는 글에는 한자·영어를 쓰지 않는다(한자는 'hanja' 키에만). 대사는 “ ”, 카드·제목·용어는 ‘ ’.
//            조사는 '이(가)' 꼴을 쓰지 않는다 — josa.iga/eunun/eulrul/euro 또는 fill 의 '{name:iga}' 자리표를 쓴다.
// TODO(통합): opsText/cardDesc 안의 ID→이름 변환은 ctx.name(kind,id) 가 있으면 그것을 먼저 쓴다(kind: 'card'|'relic'|'general'|'enc'|'enemy').
//            없으면 뒤 전역(CARDS·GENERALS·ENEMIES)을 함수 본문 안에서 typeof 로 지연 조회하고, 그래도 없으면 아래 NAMES 표를 쓴다.
// TODO(통합): 이름이 들어가는 두루마리(scroll.prison 등)와 banner.leave 는 '{name:iga}' 자리표를 쓴다(조사까지 붙여 채운다).
//            Run/UI 는 TXT.scrollFor(key, {name}) 또는 TXT.fill(str, params) 로 채운다. 자리표를 못 채우면 그대로 남는다(오류 아님).
//            fill 이 아는 자리표: {n} {pct} {name} {text} {dist} — 뒤에 ':iga' ':eunun' ':eulrul' ':euro' 를 붙이면 조사를 붙인다.
// TODO(통합): status/buff 의 desc 는 '{n}'·'{pct}' 자리표를 쓴다. UI 는 TXT.fill(desc, {n: 수치, pct: '70%'}) 로 채운다.
// TODO(통합): compare[enc](stats) 는 §5.8 stats 만 받는다. shipsLeft 가 null 이면 enemiesKilled 로 갈음한다.
// TODO(통합): ending.*.lines(G) 는 G.flags·G.leader·G.act·G.deputies·G.special·G.suspicion·G.stats 만 읽는다. 없는 필드는 건너뛴다.
// TODO(통합): Core 는 이 파일보다 먼저 로드되어야 한다(BAL 수치를 문구에 넣는다). 없으면 로드 시 throw.
var TXT = (function(){ 'use strict';
  if (typeof Core === 'undefined' || !Core.BAL) throw new Error('TXT: Core 가 먼저 로드되어야 한다');
  var B = Core.BAL;
  var api = {};

  /* ---------------------------------------------------------------- 공통 도우미 */
  function sg(n){ n = Number(n) || 0; return n < 0 ? '−' + Math.abs(n) : '+' + n; }
  function pc(x){ return Math.round(Number(x) * 100) + '%'; }
  // 받침 여부. 끝의 따옴표·괄호는 건너뛰고, 숫자는 읽는 소리(영·일·삼·육·칠·팔은 받침)로 본다.
  function hasJong(w){
    var s = String(w).replace(/[\s’”'")\]]+$/, ''), c = s.charCodeAt(s.length - 1), ch = s.charAt(s.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return ((c - 0xAC00) % 28) !== 0;
    if (/[0-9]/.test(ch)) return '013678'.indexOf(ch) >= 0;
    return true;
  }
  function rieul(w){ var s = String(w).replace(/[\s’”'")\]]+$/, ''), c = s.charCodeAt(s.length - 1), ch = s.charAt(s.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 === 8; return '178'.indexOf(ch) >= 0 && ch !== ''; }
  function iga(w){ return w + (hasJong(w) ? '이' : '가'); }
  function eunun(w){ return w + (hasJong(w) ? '은' : '는'); }
  function eulrul(w){ return w + (hasJong(w) ? '을' : '를'); }
  function euro(w){ return w + (hasJong(w) && !rieul(w) ? '으로' : '로'); }
  var JOSA = { iga: iga, eunun: eunun, eulrul: eulrul, euro: euro };
  function fill(s, p){
    if (!p) return s;
    return String(s).replace(/\{(\w+)(?::(\w+))?\}/g, function(m, k, j){ if (p[k] == null) return m; var v = String(p[k]); return j && JOSA[j] ? JOSA[j](v) : v; });
  }
  api.fill = fill; api.josa = JOSA; api.hasJong = hasJong;
  api.FILL_KEYS = ['n', 'pct', 'name', 'text', 'dist'];          // fill 로 채우는 자리표(검사용)

  api.title = '징비'; api.hanja = '懲毖'; api.subtitle = '일곱 해의 패';
  api.dist = ['원거리', '중거리', '근접'];
  api.distName = ['멀리', '가까이', '붙음'];
  var DIST = api.dist;

  /* ---------------------------------------------------------------- 날짜 (오늘날 표기) */
  var STEM = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var BRANCH = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  function ganji(y){ y = Number(y); return STEM[((y - 4) % 10 + 10) % 10] + BRANCH[((y - 4) % 12 + 12) % 12]; }
  // '1592.4.15' → '1592년 4월 15일', '1592.4.17~19' → '1592년 4월 17~19일', '1592.6' → '1592년 6월',
  // '1592.4.30~5.3' → '1592년 4월 30일~5월 3일', '1597.12.22~1.4' → '1597년 12월 22일~1598년 1월 4일', '1592.9~1593.1' → '1592년 9월~1593년 1월'
  function date(str){
    if (str == null || str === '') return '';
    str = String(str).trim();
    var halves = str.split('~');
    var a = halves[0].split('.').map(Number);
    if (a.length === 1 && !isNaN(a[0]) && halves.length === 1) return a[0] + '년';
    if (a.length < 2 || isNaN(a[0]) || isNaN(a[1])) return str;
    var y = a[0], m = a[1], d = a.length > 2 && !isNaN(a[2]) ? a[2] : null;
    var head = y + '년 ' + m + '월' + (d ? ' ' + d + '일' : '');
    if (halves.length < 2 || !halves[1]) return head;
    var b = halves[1].split('.').map(Number);
    if (b.some(isNaN)) return head;
    var y2 = y, m2 = m, d2 = null;
    if (b.length === 1) { if (d == null) { m2 = b[0]; if (m2 < m) y2 = y + 1; } else { d2 = b[0]; } }
    else if (b.length === 2 && b[0] > 31) { y2 = b[0]; m2 = b[1]; }          // '1592.9~1593.1' (연도.월)
    else if (b.length === 2) { m2 = b[0]; d2 = b[1]; if (m2 < m) y2 = y + 1; }
    else { y2 = b[0]; m2 = b[1]; d2 = b[2]; }
    if (y2 === y && m2 === m && d != null && d2 != null) return y + '년 ' + m + '월 ' + d + '~' + d2 + '일';
    if (y2 === y && d == null && d2 == null) return y + '년 ' + m + '~' + m2 + '월';
    var tail = (y2 !== y ? y2 + '년 ' : '') + m2 + '월' + (d2 ? ' ' + d2 + '일' : '');
    return head + '~' + tail;
  }
  api.date = date; api.ganji = ganji;

  /* ---------------------------------------------------------------- 이름 표(뒤 전역이 없을 때만 쓰는 예비) */
  var NAMES = {
    general: { yi: '이순신', gwon: '권율', yi_eokgi: '이억기', kim_simin: '김시민', jeong_munbu: '정문부', jo_heon: '조헌·영규', hwang_jin: '황진', yi_jeongam: '이정암' },
    relic: { turtle_blueprint: '거북선 설계도', jincheonroe_relic: '비격진천뢰', hwacha_relic: '화차', nanjung_relic: '난중일기', jingbirok: '징비록', tonga: '편전 통아',
      hangwae_gun: '항왜의 조총', obangnang: '오방낭', seoae_brush: '서애의 붓', chains: '감옥의 쇠사슬', joryeong_stone: '조령의 돌', hansan_drum: '한산의 북',
      jinju_drum: '진주의 북', haengju_ash: '행주의 재', jiksan_spear: '직산의 창', myeongnyang_chain: '명량의 쇠사슬', tongjeyeong_flag: '통제영의 깃발' },
    enc: { boss_konishi: '고니시 유키나가', boss_wakizaka: '와키자카 야스하루', boss_jinju1: '진주성 1차', boss_haengju: '행주산성', boss_jiksan: '직산', boss_myeongnyang: '울돌목',
      boss_noryang: '노량', dongnae_hold: '동래성', ichi_hold: '이치 고개', geumsan_elite: '금산', gyeongju: '경주', byeokje_elite: '고바야카와 복병', hanseong_pursuit: '한성 추격',
      monghak_elite: '이몽학 반군', yoshira_naval: '부산 출격', suncheon: '순천 왜교성', busan_sea: '부산 앞바다', namwon: '남원성', ulsan: '울산 도산성', sacheon: '사천' },
    enemy: { sekibune: '왜군 중선', kobaya: '왜군 소선', wakizaka: '와키자카 야스하루', kurushima: '구루시마 미치후사', shimazu_p1: '시마즈 요시히로' },
    card: { bowstring: '활시위', spear_wall: '창을 세워라', manifesto: '격문', baesujin: '배수진', ichi_bow: '이치의 활', geumsan_drum: '금산의 북', hwacha: '화차',
      request_troops: '원군 요청', resolve: '결사', jochong: '조총', twelve_ships: '열두 척', pilsa_jeuksaeng: '필사즉생', samsu: '삼수병', people_stones: '백성의 돌',
      parley: '회담', turtle_ship: '거북선', red_robe: '홍의장군', uiryeong_rising: '의령의 봉기', scout_boat: '척후선', ash_bag: '재주머니', militia: '의병', dokjeon: '독전의 북',
      chen_lin_bombard: '진린의 포격', deng_zilong: '등자룡의 돌격', ming_navy_square: '명 수군 방진', sema: '쌀로 말 씻기', li_cavalry: '이여송 기병', folangji: '불랑기',
      nambyeong_cannon: '명군 화포', edict_advance: '진격하라', edict_blame: '문책', edict_arrest: '압송', edict_envy: '조정의 시기', crane_wing: '학익진' }
  };
  api.names = NAMES;
  function nm(kind, id, ctx){
    if (id == null) return '';
    if (ctx && typeof ctx.name === 'function') { var r = ctx.name(kind, id); if (r) return r; }
    try {
      if (kind === 'card' && typeof CARDS !== 'undefined' && CARDS.byId && CARDS.byId[id]) return CARDS.byId[id].name;
      if (kind === 'relic' && typeof GENERALS !== 'undefined' && GENERALS.relics.byId[id]) return GENERALS.relics.byId[id].name;
      if (kind === 'general' && typeof GENERALS !== 'undefined') { var g = GENERALS.deputies.byId[id] || GENERALS.leaders.byId[id]; if (g) return g.name; }
      if (kind === 'enc' && typeof ENEMIES !== 'undefined' && ENEMIES.encounters.byId[id]) return ENEMIES.encounters.byId[id].name;
      if (kind === 'enemy' && typeof ENEMIES !== 'undefined' && ENEMIES.byId && ENEMIES.byId[id]) return ENEMIES.byId[id].name;
    } catch (e) { /* 뒤 전역이 아직 없다 */ }
    if (NAMES[kind] && NAMES[kind][id]) return NAMES[kind][id];
    return String(id);
  }
  function q(s){ return '‘' + s + '’'; }                       // 카드·기물·제목 따옴표

  /* ---------------------------------------------------------------- 분류 표 */
  api.typeName = { atk: '공격', def: '수비', tac: '책략', rep: '장계', edict: '어명' };
  api.type = api.typeName;                                      // 옛 이름(한자 한 글자 표는 없앴다)
  api.pool = { base: '기본', common: '공용', navy: '수군', uibyeong: '의병', tactic: '책략', siege: '수성', ming: '명군', leader: '주장', deputy: '부장', edict: '어명', event: '사건', token: '토큰' };
  api.rarity = { common: '일반', rare: '희귀', special: '특수' };
  api.tag = { shot: '사격', melee: '백병', charge: '돌격', fire: '화공', none: '', pierce: '관통', navy: '수군', uibyeong: '의병', ming: '명군', siege: '수성' };
  api.enemyTag = { ship: '배', gun: '조총', melee: '근접', bow: '활', boss: '장수', elite: '정예', horse: '기마', laborer: '인부', scout: '척후' };
  api.terrain = {
    plain: { name: '평지', desc: '돌격 카드의 비용 −1.' }, ridge: { name: '고개', desc: '원거리에서 시작한다. 적은 두 턴 동안 오르지 못하고, 턴마다 진형 +' + B.RIDGE_BLOCK + '.' },
    river: { name: '강', desc: '배수진. 밀어내기가 듣지 않고 기세 +' + B.RIVER_MOMENTUM + '.' }, fort: { name: '산성', desc: '수성. 아군 성벽 ' + B.SIEGE_WALL + '으로 시작한다.' },
    port: { name: '포구', desc: '원거리에서 시작한다. 조류 없음.' }, strait: { name: '해협', desc: '원거리에서 시작한다. 울돌목에서는 물이 바뀐다.' },
    waeseong: { name: '왜성', desc: '공성. 적 성벽 ' + B.ASSAULT_ENEMY_WALL + ', 적 조총 ' + sg(Math.round(B.WAESEONG_GUN_PCT * 100)) + '%.' }, none: { name: '—', desc: '' }
  };
  api.battleType = { field: '야전', siege: '수성', assault: '공성', naval: '해전' };
  api.kindIcon = { fight: 'swords', naval: 'anchor', elite: 'skull', event: 'scroll', camp: 'campfire', shop: 'pouch', court: 'palace', boss: 'helm', council: 'ikseon' };   // ART.icon 이름
  api.kindName = { fight: '전투', naval: '해전', elite: '정예', event: '사건', camp: '군영', shop: '시장', court: '조정', boss: '결전', council: '어전회의' };
  api.status = {
    shaken: { name: '동요', hanja: '動搖', desc: '공격 −' + pc(B.SHAKEN_PCT) + '. 턴 끝에 1 줄어든다.' },
    exposed: { name: '허점', hanja: '虛點', desc: '받는 피해 +' + pc(B.EXPOSED_PCT) + '. 턴 끝에 1 줄어든다.' },
    hunger: { name: '굶주림', hanja: '飢', desc: '제 차례마다 {n} 피해를 받는다. 턴 끝에 1 줄어든다.' },
    momentum: { name: '기세', hanja: '氣勢', desc: '공격 +{n}. 이번 전투 내내 남는다.' },
    ambush: { name: '매복', hanja: '埋伏', desc: '적이 한 칸 다가올 때 적 전체에 {n} 피해. 한 번 쓰면 사라진다.' },
    ironwall: { name: '철벽', hanja: '鐵壁', desc: '진형이 턴 끝에 사라지지 않는다.' },
    stun: { name: '정지', hanja: '停止', desc: '이번 차례를 그냥 넘긴다. 장수에게는 듣지 않는다.' },
    flinch: { name: '위축', hanja: '萎縮', desc: '다음 공격 −' + pc(B.FLINCH_PCT) + '.' },
    loaded: { name: '장전', hanja: '裝塡', desc: '장전을 마쳤다. 다음 차례에 쏜다.' }
  };
  api.buff = {
    nextAtk: { name: '다음 공격', desc: '다음 한 번의 공격 +{n}' }, atkAdd: { name: '공격', desc: '공격 +{n}' }, shotAdd: { name: '사격', desc: '사격 +{n}' },
    atkPct: { name: '공격 강화', desc: '공격 +{pct}' }, shotPct: { name: '사격 강화', desc: '사격 +{pct}' }, evadeFirst: { name: '회피', desc: '적의 첫 공격을 피한다' },
    hide: { name: '숨어라', desc: '받는 조총·활 피해 −{pct}' }, noAtk: { name: '숨은 몸', desc: '공격 카드를 낼 수 없다' }, noMelee: { name: '거북선 철갑', desc: '왜군의 백병 피해를 받지 않는다' },
    noPushBattle: { name: '배수진', desc: '이번 전투 밀어내기 무효' }, wallPersist: { name: '서서 죽는다', desc: '진형이 턴 끝에 남는다' },
    chargeAtClose: { name: '진격', desc: '돌격 카드를 근접에서도 낼 수 있다' }, noAdvance: { name: '발이 묶임', desc: '적이 전진하지 못한다' },
    passivesOff: { name: '압송', desc: '부장의 패시브가 멈춘다' }, minHp1: { name: '한 척도', desc: '병력이 1 아래로 내려가지 않는다' }
  };
  api.intent = { atk: '{text} {n}', approach: '접근', pull: '전진', block: '밀집', load: '장전', fire: '조총 사격', pierce: '관통', rally: '기합', build: '흙산 쌓기', reinforce: '증원',
    raid: '약탈', signal: '신호', flee: '달아남', incite: '선동', ops: '{text}', stunned: '정지', toDist: '→{dist}' };

  /* ---------------------------------------------------------------- 조건 문구 */
  var FLAG_COND = { dismissed: ['통제사가 파직되었으면', '파직되지 않았으면'], chilcheon: ['칠천량을 겪었으면', '칠천량을 겪지 않았으면'], dokjeon: ['독전의 북을 받았으면', '독전의 북을 거부했으면'],
    jinju1_held: ['진주를 지켰으면', '진주를 잃었으면'], busan_held: ['부산 앞바다를 이겼으면', '부산 앞바다를 이기지 못했으면'], wonGyun: ['원균이 대행 중이면', '원균이 대행 중이 아니면'],
    rescuedUsed: ['부장이 이미 대신 섰으면', '부장이 아직 대신 서지 않았으면'] };
  var B1 = { ridge: '조령 고개', river: '탄금대 강가', fort: '충주성' };
  function condText(c){
    if (!c || typeof c !== 'object') return '';
    var p = [], k;
    function rng(label, o, unit){ unit = unit || ''; if (o == null) return; if (typeof o !== 'object') { p.push(label + ' ' + o + unit + '이면'); return; }
      if (o.gte != null && o.lte != null) p.push(label + ' ' + o.gte + '~' + o.lte + unit + '이면'); else if (o.gte != null) p.push(label + ' ' + o.gte + unit + ' 이상이면'); else if (o.lte != null) p.push(label + ' ' + o.lte + unit + ' 이하면'); }
    function orList(v, f){ return (Array.isArray(v) ? v : [v]).map(f).join('·'); }
    if (c.dist != null) { var dw = orList(c.dist, function(d){ return DIST[d] || d; }); p.push(dw + (hasJong(dw) ? '이면' : '면')); }
    if (c.distNot != null) { var dn = DIST[c.distNot] || c.distNot; p.push(dn + (hasJong(dn) ? '이' : '가') + ' 아니면'); }
    rng('병력', c.hpPct, '%');
    if (c.naval) p.push('해전이면'); if (c.siege) p.push('수성이면'); if (c.assault) p.push('공성이면'); if (c.field) p.push('야전이면');
    if (c.turn != null) p.push(c.turn + '턴째면'); if (c.turnLte != null) p.push(c.turnLte + '턴 안이면');
    if (c.hasWall) p.push('성벽이 서 있으면');
    if (c.tide) p.push(c.tide === 'ebb' ? '역류면' : '순류면'); if (c.wave != null) p.push(c.wave + '번째 파도면');
    if (c.cardTag) p.push(orList(c.cardTag, function(t){ return api.tag[t] || t; }) + ' 카드면'); if (c.cardType) p.push(orList(c.cardType, function(t){ return api.typeName[t] || t; }) + ' 카드면');
    if (c.cardPool) p.push(orList(c.cardPool, function(t){ return api.pool[t] || t; }) + ' 카드면'); if (c.cardId) p.push(orList(c.cardId, function(i){ return q(nm('card', i)); }) + ' 카드면');
    if (c.cardMarked != null) p.push(c.cardMarked ? '장전되어 있으면' : '장전되지 않았으면');
    if (c.enemyId) { var en = orList(c.enemyId, function(i){ return nm('enemy', i); }); p.push(en + (hasJong(en) ? '이면' : '면')); }
    if (c.enemyTag) { var et = api.enemyTag[c.enemyTag] || '그런 적'; p.push('적이 ' + et + (hasJong(et) ? '이면' : '면')); }
    rng('손의 카드', c.handCount, '장'); rng('이번 턴 낸 카드', c.cardsPlayedThisTurn, '장');
    if (c.deckTagCount) { var t = c.deckTagCount; rng('덱의 ' + (api.tag[t.tag] || '') + ' 카드', { gte: t.gte, lte: t.lte }, '장'); }
    if (c.hasCard) p.push('덱에 ' + orList(c.hasCard, function(i){ return q(nm('card', i)); }) + ' 카드가 있으면');
    if (c.hasRelic) p.push(orList(c.hasRelic, function(i){ return q(nm('relic', i)); }) + ' 기물이 있으면');
    if (c.hasDeputy) p.push(iga(orList(c.hasDeputy, function(i){ return nm('general', i); })) + ' 부장이면'); if (c.noDeputy) p.push(iga(orList(c.noDeputy, function(i){ return nm('general', i); })) + ' 없으면');
    if (c.flag) for (k in c.flag) { var v = c.flag[k]; if (FLAG_COND[k]) p.push(FLAG_COND[k][v ? 0 : 1]); else if (k === 'b1') { var bw = B1[v] || '그곳'; p.push('결전이 ' + bw + (hasJong(bw) ? '이면' : '면')); } else p.push('그 일이 있었으면'); }
    if (c.leader) p.push(iga(nm('general', c.leader)) + ' 주장이면'); if (c.lane) p.push(c.lane === 'sea' ? '바닷길이면' : '뭍길이면');
    if (c.act != null) p.push(c.act + '막이면'); if (c.actGte != null) p.push(c.actGte + '막 이후면');
    rng('군량', c.ration); rng('의심', c.suspicion); if (c.slotsFree) p.push('부장 자리가 비었으면');
    if (c.oncePerBattle) p.push('전투당 한 번'); if (c.oncePerTurn) p.push('턴당 한 번');
    // 여러 조건은 '…이고 …이면' 으로 잇는다(마지막 '면' 앞의 '면' 은 '고' 로)
    var last = -1; p.forEach(function(x, i){ if (/면$/.test(x)) last = i; });
    return p.map(function(x, i){ return i < last && /면$/.test(x) ? x.replace(/으면$/, '고').replace(/면$/, '고') : x; }).join(' ');
  }
  api.condText = condText;

  /* ---------------------------------------------------------------- op → 문구 (32종 전부) */
  var WHO = { self: '', target: '적 하나 ', all: '적 전체 ', spawned: '등장한 적 ', actor: '', enemy: '' };
  function ifDist(i){ var d = DIST[i] || ''; return d + (hasJong(d) ? '이면' : '면'); }
  function statusText(id, n){ var s = api.status[id]; var nameS = s ? s.name : id; return id === 'momentum' ? nameS + ' ' + sg(n) : nameS + ' ' + n; }
  function buffText(o){
    var n = o.n, t = o.turns, when = o.nextTurn ? '다음 턴 ' : (t == null ? '이번 전투 ' : (t >= 99 ? '이번 전투 ' : (t === 1 ? '이번 턴 ' : t + '턴 동안 ')));
    switch (o.id) {
      case 'nextAtk': return when + (o.nextTurn ? '첫' : '다음') + ' 공격 ' + sg(n);
      case 'atkAdd': return when + '공격 ' + sg(n);
      case 'shotAdd': return when + '사격 ' + sg(n);
      case 'atkPct': return when + '모든 공격 ' + (n >= 0 ? '+' : '−') + pc(Math.abs(n));
      case 'shotPct': return when + '사격 ' + (n >= 0 ? '+' : '−') + pc(Math.abs(n));
      case 'evadeFirst': return when + '적의 첫 공격을 피한다';
      case 'hide': return when + '받는 조총·활 피해 −' + pc(n == null ? B.HIDE_PCT : n);
      case 'noAtk': return when + '공격 카드를 낼 수 없다';
      case 'noMelee': return when + '왜군의 백병 피해를 받지 않는다';
      case 'noPushBattle': return '이번 전투 밀어내기 무효';
      case 'wallPersist': return (t >= 99 ? '이번 전투 ' : when) + '진형이 턴 끝에 남는다';
      case 'chargeAtClose': return when + '돌격 카드를 근접에서도 낼 수 있다';
      case 'noAdvance': return (t === 1 ? '이번 적 턴 ' : when) + '적이 전진하지 못한다';
      case 'passivesOff': return '이번 전투 부장 패시브 정지';
      case 'minHp1': return when + '병력이 1 아래로 내려가지 않는다';
      default: return when + ((api.buff[o.id] && api.buff[o.id].name) || '효과') + (n != null ? ' ' + sg(n) : '');
    }
  }
  function dmgText(o, ctx){
    var s = [], base = o.n != null ? o.n : 0;
    var head = (o.all || o.who === 'all') ? '적 전체 ' : (o.who === 'spawned' ? '등장한 적 ' : (o.who === 'random' ? '무작위 적 ' : ''));
    if (o.tag === 'charge') head = '근접으로 달려들어 ' + head;
    var num = '' + base;
    if (o.perCardsPlayed) num = (base ? base + ' + ' : '') + '이번 턴 낸 카드 수 ×' + o.perCardsPlayed;
    s.push(head + num + ' 피해' + (o.times > 1 ? ' ×' + o.times : ''));
    if (o.perHandCard) s.push('손의 ' + q(nm('card', o.perHandCard.id, ctx)) + ' 1장당 ' + sg(o.perHandCard.n));
    if (o.pierce) s.push('관통');
    if (o.bonusAt) ['far', 'near', 'close'].forEach(function(k, i){ if (o.bonusAt[k]) s.push(ifDist(i) + ' ' + sg(o.bonusAt[k])); });
    if (o.mulAt) ['far', 'near', 'close'].forEach(function(k, i){ if (o.mulAt[k] != null) s.push(ifDist(i) + ' ×' + o.mulAt[k]); });
    if (o.bonusIf) for (var k in o.bonusIf) if (o.bonusIf[k]) s.push((api.battleType[k] || k) + '이면 ' + sg(o.bonusIf[k]));
    return s.join(', ');
  }
  function flagText(o){
    var k = o.key, v = o.value, a = o.add;
    switch (k) {
      case 'b1': return '결전은 ' + (B1[v] || v) + '에서';
      case 'chilcheon': return v ? '칠천량을 겪는다' : '칠천량을 면한다';
      case 'dokjeon': return v ? '독전의 북을 받는다' : '독전의 북을 거부한다';
      case 'dismissed': return v ? '통제사 파직' : '통제사 유임';
      case 'jinju1_held': return '진주를 지켰다'; case 'busan_held': return '부산 앞바다를 지켰다';
      case 'boss5HpPct': return '5막 결전 적 체력 ' + (v >= 0 ? '+' : '−') + pc(Math.abs(v));
      case 'b6_scouts': return '결전 첫 손에 ' + q(nm('card', 'scout_boat')) + ' 2장'; case 'b6_block': return '결전 시작 진형 ' + sg(v); case 'b6_momentum': return '결전 동안 기세 ' + sg(v);
      case 'b7_p2Hp': return '결전 2단계 적 체력 ' + sg(v); case 'b7_mingExtra': return '결전 명 수군 카드 ' + sg(a != null ? a : v);
      case 'mingCostDelta': return '명군 카드 군량 ' + sg(v); case 'mingCostDeltaUntilAct': return v + '막까지';
      case 'mingDiscount': return '명군 카드 군량 −' + v; case 'lane2': return v === 'sea' ? '바닷길로' : '뭍길로';
      default: return '';                                       // 내부 플래그는 문구로 내보내지 않는다
    }
  }
  function opOne(o, ctx){
    if (!o || typeof o !== 'object') return '';
    var n = o.n != null ? o.n : 1, s;
    switch (o.op) {
      case 'suspicion': return '의심 ' + sg(o.n);
      case 'ration': return '군량 ' + sg(o.n);
      case 'hp': s = []; if (o.n) s.push('병력 ' + sg(o.n)); if (o.pct) s.push('병력 ' + sg(Math.round(o.pct * 100)) + '%'); if (o.max) s.push('최대 병력 ' + sg(o.max)); return s.join(', ') || '병력 +0';
      case 'addCard': s = o.id ? q(nm('card', o.id, ctx)) : ((api.pool[o.pool] || '') + ' 카드');
        if (o.up) s += '(강화)'; s += ' ' + n + '장';
        if (o.where === 'hand') s += '을 손에'; else if (o.where === 'draw') s += '을 뽑을 카드에'; else if (o.where === 'discard') s += '을 버린 카드에'; else s += '을 덱에';
        if (o.free) s += '(군령·군량 0)'; return s;
      case 'removeCard': s = o.id ? q(nm('card', o.id, ctx)) : (o.tag ? (api.tag[o.tag] || '') + ' 카드' : (api.pool[o.pool] || '') + ' 카드');
        return s + (o.all ? ' 전부' : (n > 1 ? ' ' + n + '장' : '')) + ' 제거';
      case 'upgrade': return o.id ? q(nm('card', o.id, ctx)) + ' 강화' : '카드 ' + n + '장 강화' + (o.choose ? '(고른다)' : '');
      case 'relic': s = '기물 ' + q(nm('relic', o.id, ctx)); return o.remove ? s + ' 잃음' : (o.up ? s + ' 강화' : s);
      case 'flag': return flagText(o);
      case 'leave': return nm('general', o.id, ctx) + (o.dead ? ' 전사' : ' 이탈');
      case 'cond': s = '(' + (condText(o.if) || '조건') + ') ' + opsText(o.then, ctx); if (o.else && o.else.length) s += ', (아니면) ' + opsText(o.else, ctx); return s;
      case 'fx': return o.text ? '“' + o.text + '”' : (o.kind === 'banner' && api.banner[o.key] ? '“' + api.banner[o.key] + '”' : '');
      case 'score': return '점수 ' + sg(o.n);
      case 'dmg': return dmgText(o, ctx);
      case 'block': s = (o.wall ? '성벽 진형 ' : '진형 ') + (o.n < 0 ? sg(o.n) : o.n); if (o.ifWallBonus) s += ', 성벽이 있으면 ' + sg(o.ifWallBonus); return s;
      case 'push': return '밀어내기 ' + n;
      case 'pull': return '끌어당기기 ' + n;
      case 'draw': return (o.nextTurn ? '다음 턴 ' + n + '장 더 뽑기' : n + '장 뽑기');
      case 'energy': return (o.nextTurn ? '다음 턴 ' : '') + '군령 ' + sg(o.n);
      case 'status': s = o.who === 'enemy' ? [].concat(o.enemyId || []).map(function(i){ return nm('enemy', i, ctx); }).join('·') + ' ' : (WHO[o.who] != null ? WHO[o.who] : ''); return s + statusText(o.id, n);
      case 'stun': return (WHO[o.who || 'target'] || '') + '정지 ' + n + '(장수 제외)';
      case 'buff': return buffText(o);
      case 'exhaustHand': return '손의 카드 전부 소모, 장당 ' + opsText(o.perCard, ctx);
      case 'discard': s = '손에서 ' + (o.type ? (api.typeName[o.type] || '') + ' 카드 ' : '') + n + '장 버림'; return s + (o.choose ? '(고른다)' : (o.random ? '(무작위)' : ''));
      case 'exhaust': if (o.which === 'drawn') return '뽑은 카드를 소모'; if (o.which === 'ctxCard') return '이 카드를 소모'; return '손의 카드 ' + n + '장 소모' + (o.choose ? '(고른다)' : '');
      case 'retrieve': return '버린 카드에서 ' + n + '장' + (o.choose ? '을 골라' : '을') + ' 손으로';
      case 'mark': return o.set ? '장전 표식을 얻고 버린다' : '장전 표식이 풀린다';
      case 'delay': return (o.turns == null || o.turns === 1 ? '다음 턴 시작에 ' : o.turns + '턴 뒤 ') + opsText(o.ops, ctx);
      case 'stripBlock': return (WHO[o.who || 'target'] || '') + '진형 전부 제거';
      case 'battle': s = '즉시 전투 ' + q(nm('enc', o.enc, ctx)); if (o.hpDelta) s += '(시작 병력 ' + sg(o.hpDelta) + ')'; if (o.reward === false) s += '(보상 없음)';
        if (o.onWin && o.onWin.length) s += ' → 이기면 ' + opsText(o.onWin, ctx); return s;
      case 'recruit': return (o.special ? '특별 부장 ' : '부장 ') + nm('general', o.id, ctx) + ' 영입' + (o.optional ? '(거절할 수 있다)' : '');
      case 'ending': return '결말 ' + q(api.ending[o.id] ? api.ending[o.id].title : '');
      case 'offer': s = o.ids ? o.ids.map(function(i){ return q(nm('card', i, ctx)); }).join('·') : (api.pool[o.pool] || '') + ' 카드 ' + (o.n || 1) + '장';
        return s + ' 중 ' + (o.pick || 1) + '장을 고른다' + (o.cost ? '(군량 −' + o.cost + ')' : '');
      default: return '';
    }
  }
  function opsText(ops, ctx){
    if (!Array.isArray(ops)) return '';
    return ops.map(function(o){ return opOne(o, ctx); }).filter(function(s){ return s; }).join(', ');
  }
  api.opsText = opsText; api.opText = opOne;
  api.OPS = ['suspicion', 'ration', 'hp', 'addCard', 'removeCard', 'upgrade', 'relic', 'flag', 'leave', 'cond', 'fx', 'score',
    'dmg', 'block', 'push', 'pull', 'draw', 'energy', 'status', 'stun', 'buff', 'exhaustHand', 'discard', 'exhaust', 'retrieve', 'mark', 'delay', 'stripBlock',
    'battle', 'recruit', 'ending', 'offer'];

  /* ---------------------------------------------------------------- 카드 설명 */
  function hasDmg(ops){
    if (!Array.isArray(ops)) return false;
    return ops.some(function(o){ if (!o) return false; if (o.op === 'dmg') return true; if (o.op === 'cond') return hasDmg(o.then) || hasDmg(o.else);
      if (o.op === 'delay') return hasDmg(o.ops); if (o.op === 'exhaustHand') return hasDmg(o.perCard); return false; });
  }
  function cardDesc(card, up, ctx){
    if (!card) return '';
    var P = (up && card.plus) || {};
    var desc = (up && P.desc) || card.desc || '';
    var parts = [], tag = card.tags && card.tags[0], ops = P.ops || card.ops || [];
    if (tag && B.MULT[tag] && hasDmg(ops)) {
      var m = B.MULT[tag];
      if (tag === 'charge') parts.push('근접으로 달려들어 ×' + m[0] + (ctx && ctx.dist === 2 && !(ctx.chargeAtClose) ? ' (근접에서는 못 낸다)' : ''));
      else if (m[0] === m[1] && m[1] === m[2]) parts.push('거리 무관 ×' + m[0]);
      else parts.push([0, 1, 2].map(function(i){ var s = DIST[i] + ' ×' + m[i]; return (ctx && ctx.dist === i) ? '▶' + s : s; }).join(' · '));
    }
    if (card.home) parts.push(card.home + '에서 ×' + B.HOME_BONUS + (ctx && ctx.do === card.home ? ' (지금 여기)' : ''));
    var ration = P.ration != null ? P.ration : card.ration;
    if (ration) parts.push('군량 ' + ration);
    var ex = P.exhaust != null ? P.exhaust : card.exhaust, rt = P.retain != null ? P.retain : card.retain;
    if (ex) parts.push('소모'); if (rt) parts.push('보존');
    if (card.owner) parts.push(nm('general', card.owner, ctx) + ' 고유');
    return parts.length ? desc + '\n' + parts.join(' · ') : desc;
  }
  api.cardDesc = cardDesc; api.hasDmg = hasDmg;
  api.applied = function(base, fin, why){ return base === fin ? String(fin) : base + ' → ' + fin + (why ? ' (' + why + ')' : ''); };

  /* ---------------------------------------------------------------- 일곱 막 (no 는 아라비아 숫자) */
  api.act = {
    1: { no: '1', era: '임진', name: '검은 돛', period: '1592년 4월~5월', intro: ['4월 14일, 부산 앞바다가 검은 돛으로 덮였다는 장계가 올라왔다.', '부산진이 하루를 못 버티고, 동래가 그 다음 날 무너졌다.', '저들의 총이 어디까지 오는지, 우리의 활이 어디까지 가는지. 그것부터 배워야 한다.'] },
    2: { no: '2', era: '임진', name: '한산', period: '1592년 5월~10월', intro: ['임금은 북으로 갔고 도성은 불탔다. 그러나 바다와 산에서 조선은 아직 싸운다.', '바다에는 판옥선과 총통이 있고, 뭍에는 제 고을을 지키려는 의병이 있다.', '어느 길을 가든 끝에는 결전이 있다. 한산도의 바다거나, 진주의 성벽이거나.'] },
    3: { no: '3', era: '계사', name: '평양과 행주', period: '1593년 1월~6월', intro: ['압록강을 건너온 명의 군사가 평양 성벽 앞에 섰다.', '명군은 세다. 그러나 군량을 먹고, 벽제관에서 꺾이면 움직이지 않는다.', '행주의 작은 산성에 권율이 올랐다. 아래는 강이요 위는 하늘이다.'] },
    4: { no: '4', era: '갑오', name: '휴전', period: '1593년 10월~1597년 1월', intro: ['총성이 그쳤다. 사신이 오가고, 화친의 글이 오간다.', '칼을 거둔 장수에게 조정은 묻는다. “그 장수가 그리 세다 하니, 누구의 군사인가.”', '싸움이 없는 막이다. 그러나 의심의 눈금은 어전에서 결판이 난다.'] },
    5: { no: '5', era: '정유', name: '다시 검은 돛', period: '1597년 1월~9월', intro: ['화친은 깨졌고 검은 돛이 다시 남해를 덮었다.', '통제사가 바다에 있는지 없는지에 따라 이 막의 첫 마디가 달라진다.', '남원이 떨어지고 적은 북으로 올라온다. 직산에서 길을 막아야 한다.'] },
    6: { no: '6', era: '정유', name: '명량', period: '1597년 8월~9월', intro: ['8월 3일, 통제사가 돌아왔다. 남은 배는 열두 척.', '어란포에서 적의 앞머리가 보였다. 벽파진의 밤은 길었다.', '울돌목. 물은 처음 저들 편이다. 버텨라, 물이 바뀐다.'] },
    7: { no: '7', era: '무술', name: '노량', period: '1597년 12월~1598년 11월', intro: ['울산 도산성의 겨울에 조선과 명의 군사가 묶였다. 적은 성 안에서 버텼다.', '이듬해 8월, 히데요시가 죽었다. 적은 돌아가려 한다.', '통제사는 돌아가는 적을 그냥 보내지 않기로 했다. 노량의 밤이 온다.'] }
  };

  /* ---------------------------------------------------------------- 1막 자막 */
  api.tutorial = {
    far: ['원거리. 저들의 총은 여기까지 오지 못한다. 우리의 활은 간다.', '원거리에서는 활이 한 배 반이다. 적은 매 턴 한 칸 다가온다.'],
    near: ['중거리. 이제 저들도 쏜다. 창을 세워 밀어내라.', '중거리가 기준이다. 창을 세우면 근접의 적을 중거리로 밀어낸다.'],
    close: ['근접. 붙었다. 왜검은 가까울수록 날카롭다.', '근접에서 왜검은 한 배 반이다. 밀어내거나, 받아내거나.'],
    suspicion: ['전하께서 물으셨다. “그 장수가 그리 세다 하니, 누구의 군사인가.”', '의심은 ' + B.SUSP_THRESH[0] + '까지 괜찮다. 그 위로는 어명 카드가 덱에 섞인다.', '장계 카드와 조정 마디가 의심을 내린다.']
  };

  /* ---------------------------------------------------------------- 배너 */
  api.banner = {
    crane: '학익진!', kurushima: '구루시마를 쓰러뜨렸다', rescue: '부장이 대신 섰다', wave: '다음 파도가 온다', arrows: '화살이 떨어져 간다 — 강 위에 배가 보인다',
    tide_flow: '물이 바뀌었다 — 순류', tide_ebb: '물이 바뀌었다 — 역류', edict: '어명이 내려왔다', starve: '왜군이 굶는다', leave: '{name:iga} 떠났다', counterspy: '첩자를 되돌려 보냈다',
    spawn: '증원', resist: '기마 무사가 버텼다', stunFail: '장수는 꾀에 넘어가지 않았다', win: '이겼다', lose: '진이 무너졌다', turnCap: '왜군이 굶는다', turtle: '거북선이 나간다',
    hwacha: '화차', dokjeon: '독전의 북', miracle: '열두 척', prison: '옥사', dismissed: '통제사 파직', loaded: '장전', fired: '조총 사격', wonGyun: '원균이 대행한다', flee: '척후가 달아났다'
  };
  api.rescue = function(name){ return iga(name) + ' 창을 들고 앞으로 나섰다. 북소리가 다시 울렸다.'; };

  /* ---------------------------------------------------------------- 두루마리 (날짜 머리글이 따로 보이므로 첫 줄을 날짜로 시작하지 않는다) */
  var T = B.SUSP_THRESH;
  api.scroll = {
    thresh4: { title: '의심 ' + T[0], lines: ['전하께서 물으셨다. “그 장수가 그리 세다 하니, 누구의 군사인가.”', '대답하는 신하가 없었다. 승지가 붓을 들었다.', '“어명이다. 통제사는 즉시 나가 부산의 적을 치라.”', '어명 카드 ‘진격하라’가 덱에 섞였다.'] },
    thresh7: { title: '의심 ' + T[1], lines: ['전하께서 노하셨다. “장수가 조정의 말을 가벼이 여긴다.”', '신하들이 글을 올렸고, 글은 곧 어명이 되었다.', '어명 카드 한 장이 덱에 섞였다. ‘문책’이거나, ‘압송’이거나, ‘조정의 시기’이거나.', '의심이 ' + T[1] + '에 닿았다. 어전회의에서 파직을 각오하라.'] },
    thresh10: { title: '의심 ' + T[2], lines: ['“그 장수를 잡아 올리라.”', '한 사람이 묶여 한성으로 올라갔다. 돌아오지 않았다.', '조정은 그것으로 만족했다. 의심이 ' + euro(String(B.PRISON_RESET)) + ' 내려간다.'] },
    prison: { title: '옥사', lines: ['{name:iga} 묶여 한성으로 올라갔다.', '감옥에서 매를 맞았고, 돌아오지 않았다.', '그의 패시브와 고유 카드가 덱에서 사라진다.'] },
    prison_none: { title: '옥사', lines: ['잡아 올릴 부장이 없었다. 조정은 대신 군사를 쪼개 갔다.', '최대 병력 ' + sg(B.PRISON_NO_DEPUTY_MAXHP) + '.'] },
    edict: { title: '어명', lines: ['“어명이다. 통제사는 즉시 나가 부산의 적을 치라.”', '어명 카드가 덱에 섞였다. 덱 안의 어명은 ' + B.EDICT_CAP + '장을 넘지 않는다.'] },
    edictFull: { title: '어명', lines: ['어명이 또 내려왔다. 그러나 덱 안의 어명은 이미 ' + B.EDICT_CAP + '장이다.', '더는 섞이지 않는다. 다만 조정의 눈은 그대로다.'] },
    chilcheon: { title: '칠천량', memo: '1597.7.15~16', lines: ['원균이 조정의 독촉에 부산으로 나갔다.', '바다가 비었다. 배도, 사람도, 장계도 없다. 남은 것은 열두 척이라는 숫자뿐이다.', '이억기가 그 바다에서 죽었다. 수군 카드가 덱에서 전부 사라진다.', '‘열두 척’과 ‘필사즉생’이 덱에 들어온다. 그것으로 싸운다.'] },
    return_tongjesa: { title: '통제사 복귀', memo: '1597.8.3', lines: ['백의종군하던 장수에게 다시 임금의 글이 내려왔다.', '“신에게는 아직 열두 척의 배가 있사옵니다.”', '이순신이 돌아왔다. 셋째 자리, 바꿀 수 없다.'] },
    wonGyun: { title: '원균 대행', lines: ['통제사의 자리에 원균이 앉았다.', '공격은 +' + pc(B.WON_GYUN_PCT) + '. 그러나 장계 카드를 낼 수 없고, 의심은 한 칸 오른다.', '5막 첫 마디까지 이 자리다.'] },
    council1: { title: '경상도에서 글이 왔다', memo: '1597.1', lines: ['경상도에서 글이 올라왔다. 왜장 가토가 바다를 건넌다는 요시라의 말이었다.', '통제사는 나가지 않았다. “신은 바다를 압니다. 지금 나가면 열두 척도 남지 않사옵니다.”', '조정은 그것을 항명이라 불렀다.'] },
    council2: { title: '어전', lines: ['전하께서 물으셨다. “통제사가 나가지 않은 까닭이 무엇인가.”', '의심의 눈금이 전각 한가운데 세워졌다. 변호할 것이 있으면 지금이다.', '의심이 ' + (B.COUNCIL.dismissAt - 1) + ' 이하면 유임, ' + B.COUNCIL.dismissAt + ' 이상이면 파직이다.'] },
    council3_keep: { title: '판결 — 유임', lines: ['“통제사는 바다로 돌아가라.”', '의심은 그대로다. 조정의 눈도 그대로다.', '역사를 쓰는 이는 이 대목에서 붓을 멈추고, 다시 쓴다.'] },
    council3_dismiss: { title: '판결 — 파직', memo: '1597.2', lines: ['“통제사를 잡아 올리라.”', '벼슬을 잃고 흰옷으로 군을 따르는 몸이 되었다. 백의종군이다.', '원균이 그 자리에 앉았다. 조정의 독촉이 바다로 향한다.'] },
    bossIntro: {
      boss_konishi: { title: '고니시 유키나가', date: '1592.4.28', memo: '탄금대', lines: ['고니시의 선봉이 충주로 밀려왔다.', '조령의 고개와 탄금대의 강. 어느 쪽이든 오늘 결판이 난다.'] },
      boss_wakizaka: { title: '와키자카 야스하루', date: '1592.7.8', memo: '한산도', lines: ['견내량에 숨은 적을 넓은 바다로 끌어낸다.', '학이 날개를 편다. 원거리에서 학익진을 펴면 적장이 흔들린다.'] },
      boss_jinju1: { title: '진주성 — 호소카와 다다오키', date: '1592.10.5~10', memo: '진주 1차', lines: ['김시민이 성문을 닫았다. 성벽 ' + B.SIEGE_WALL + '.', '허수아비에 옷을 입히고, 밤에도 풍악을 그치지 않았다. 흙산이 오르기 전에 인부를 잡아라.'] },
      boss_haengju: { title: '우키타 히데이에', date: '1593.2.12', memo: '행주', lines: ['“아래는 강이요 위는 하늘이다. 물러설 곳이 없으니 두려울 것도 없다.”', '적은 세 번 밀려온다. 파도가 바뀔 때 손은 그대로, 세 장을 더 쥔다.'] },
      boss_jiksan: { title: '구로다 나가마사', date: '1597.9.7', memo: '직산', lines: ['한성으로 가는 길목, 직산.', '명군 카드 세 장이 첫 손에 든다. 이번 전투에서는 군량을 쓰지 않는다.'] },
      boss_myeongnyang: { title: '구루시마 미치후사 · 도도 다카토라', date: '1597.9.16', memo: '명량', lines: ['울돌목. “죽고자 하면 살고, 살고자 하면 죽는다.”', '물은 처음 저들 편이다. 역류 ' + B.TIDE.period + '턴, 그 뒤 순류 ' + B.TIDE.period + '턴. 버텨라, 물이 바뀐다.'] },
      boss_noryang: { title: '시마즈 요시히로', date: '1598.11.19', memo: '노량', lines: ['히데요시는 죽었고 적은 돌아가려 한다.', '통제사는 돌아가는 적을 그냥 보내지 않는다. 시마즈가 뚫리면 퇴로의 싸움이 이어진다.'] }
    }
  };
  api.scrollFor = function(key, params){
    var s = api.scroll[key] || (api.scroll.bossIntro && api.scroll.bossIntro[key]);
    if (!s) return { title: key, lines: [] };
    return { title: fill(s.title, params), memo: s.memo || null, date: s.date || null, lines: (s.lines || []).map(function(l){ return fill(l, params); }) };
  };

  /* ---------------------------------------------------------------- 패망·결말 */
  api.defeat = {
    1: '도성이 비었다. 임금은 북으로, 백성은 산으로.',
    2: '한산의 바다와 진주의 성벽이 함께 무너졌다. 남해에 조선의 돛은 없었다.',
    3: '평양은 되찾지 못했고 행주의 산성은 비었다. 명군은 압록강 너머로 돌아갔다.',
    4: '화친의 글이 오가는 동안 조선의 군사는 흩어졌다. 전하는 끝내 그 장수를 믿지 않으셨다.',
    5: '남원이 떨어지고 직산이 열렸다. 한성으로 가는 길에 막는 자가 없었다.',
    6: '울돌목에 조선의 배는 없었다.',
    7: '노량의 밤은 끝나지 않았다. 적은 바다를 건너 돌아갔고, 아무도 그것을 막지 못했다.'
  };
  function branchLines(G){
    G = G || {}; var f = G.flags || {}, L = [];
    if (f.b1 === 'ridge') L.push('사관은 이렇게 적었다. 조령에서 길을 막은 것은 옳았다. 신립이 하지 못한 일이다.');
    else if (f.b1 === 'fort') L.push('충주성에 들어 성벽으로 받았다. 고개를 버린 값은 성벽이 치렀다.');
    else if (f.b1) L.push('탄금대에 섰다. 뒤는 강이었고, 밀어낼 곳이 없었다.');
    if (f.lane2 === 'sea') L.push('임진년 여름은 바다에서 보냈다. 옥포에서 한산까지, 돛을 꺾은 것은 총통이었다.');
    else if (f.lane2 === 'land') L.push('임진년 여름은 뭍에서 보냈다. 의령에서 진주까지, 제 고을을 지킨 것은 의병이었다.');
    if (f.jinju1_held) L.push('진주성은 지켜졌다.');
    if (f.dismissed === true) L.push('정유년 이월, 통제사는 묶여 한성으로 올라갔다. 조정은 그를 의심했고, 바다는 그 값을 치렀다.');
    else if (f.dismissed === false) L.push('어전회의는 통제사를 바다로 돌려보냈다. 파직은 없었다.');
    if (f.chilcheon) L.push('칠천량에서 바다가 비었다. 남은 것은 열두 척이라는 숫자뿐이었다.');
    else if (f.dismissed === false || f.busan_held) L.push('칠천량은 없었다. 부산 앞바다에서 돛을 꺾은 것은 통제사의 함대였다.');
    if (f.rescuedUsed) L.push('한 사람이 대신 섰다. 그의 이름은 장계에 오르지 않았다.');
    return L;
  }
  function leaderName(G){ return nm('general', (G && G.leader) || 'yi'); }
  api.ending = {
    silrok: { title: '실록', lines: function(G){
      var L = ['1598년 11월 19일, 노량.', '통제사는 마지막 북을 치다 쓰러졌다. “싸움이 급하다. 나의 죽음을 알리지 마라.”', '등자룡도 그 바다에서 죽었다. 배들은 북소리가 그치지 않은 줄 알고 끝까지 싸웠다.'];
      L = L.concat(branchLines(G));
      L.push('사월에 왔던 배들이 일곱 해 만에 돌아갔다. 류성룡이 붓을 들어 적는다.', '징비 — 지난 잘못을 거울삼아 뒷날을 조심한다.');
      return L; } },
    jingbi: { title: '징비', lines: function(G){
      var L = ['일곱 해가 지났다. 살아남은 자가 붓을 들어 적는다.', '징비 — 지난 잘못을 거울삼아 뒷날을 조심한다.'];
      L = L.concat(branchLines(G));
      L.push('노량에서 통제사는 독전의 북을 받지 않았다. 적은 돌아갔고, 통제사는 살아서 돌아왔다.', '역사를 쓰는 이는 이 대목에서 붓을 멈추고, 다시 쓴다. 그것이 징비다.');
      return L; } },
    nanse: { title: '난세', lines: function(G){
      G = G || {}; var a = G.act || 1, L = [api.defeat[a] || api.defeat[7]];
      L.push((api.act[a] ? a + '막 ' + q(api.act[a].name) + '에서 ' : '') + leaderName(G) + '의 진이 무너졌다.');
      if (G.suspicion != null && G.suspicion >= T[1]) L.push('조정은 끝까지 그를 의심했다. 패한 장수에게 장계는 오지 않는다.');
      L = L.concat(branchLines(G));
      L.push('조선의 패는 처음부터 좋지 않았다. 그래서 다시 섞는다.');
      return L; } }
  };

  /* ---------------------------------------------------------------- 역사 대조 한 줄 */
  function nTurn(s){ return s && s.turns != null ? s.turns : 0; }
  function ships(s){ return s && s.shipsLeft != null ? s.shipsLeft : (s && s.enemiesKilled != null ? s.enemiesKilled : 0); }
  api.compare = {
    boss_konishi: function(s){ return '신립은 탄금대에서 하루를 넘기지 못했다. 그대는 ' + nTurn(s) + '턴을 싸워 고니시를 돌려세웠다.'; },
    boss_wakizaka: function(s){ return '한산에서 와키자카는 열네 척을 거두어 달아났다. 그대 앞에서 남은 배는 ' + ships(s) + '척이었다.'; },
    boss_jinju1: function(s){ return '김시민은 엿새를 버텼다. 그대는 ' + nTurn(s) + '턴을 버텼다.'; },
    boss_haengju: function(s){ return '행주에서 권율은 하루에 밀려오는 적을 전부 물리쳤다. 그대는 ' + (s && s.wavesCleared != null ? s.wavesCleared + 1 : 3) + '번의 파도를 ' + nTurn(s) + '턴에 넘겼다.'; },
    boss_jiksan: function(s){ return '직산에서 구로다는 하루 만에 발을 돌렸다. 그대는 ' + nTurn(s) + '턴 만에 길을 막았다.'; },
    boss_myeongnyang: function(s){ return '명량에서 이순신은 열세 척으로 이겼다. 그대는 ' + (s && s.pushes != null ? s.pushes : 0) + '번 적을 밀어내고 ' + nTurn(s) + '턴을 버텼다.'; },
    boss_noryang: function(s){ return '노량에서 이순신은 마지막 북을 치다 쓰러졌다. 그대는 ' + (s && s.dmgTaken != null ? s.dmgTaken : 0) + '의 피해를 받고도 북을 멈추지 않았다.'; }
  };

  /* ---------------------------------------------------------------- 전투 로그 */
  api.log = {
    play: function(card){ return eulrul(q((card && card.name) || card)) + ' 냈다.'; },
    hit: function(name, n, pierce){ return name + '에게 ' + n + (pierce ? '(관통)' : '') + '.'; },
    enemyAct: function(name, intent){ var t = intent ? (intent.text || (intent.kind && typeof api.intent[intent.kind] === 'string' && api.intent[intent.kind].indexOf('{') < 0 ? api.intent[intent.kind] : '') || '') : '';
      return name + (t ? ': ' + t : '') + (intent && intent.n != null && intent.kind === 'atk' ? ' ' + intent.n : '') + '.'; },
    playerHit: function(n, source){ return (source ? source + '의 ' : '') + '공격. 병력 −' + n + '.'; },
    blocked: function(n){ return '진형이 ' + eulrul(String(n)) + ' 받아냈다.'; },
    dead: function(name){ return iga(name) + ' 쓰러졌다.'; },
    sunk: function(name){ return iga(name) + ' 가라앉았다.'; },
    fled: function(name){ return iga(name) + ' 달아났다.'; },
    push: function(from, to){ return (DIST[from] || from) + '에서 ' + euro(DIST[to] || to) + '.'; },
    advance: function(to){ return '적이 다가온다. ' + (DIST[to] || to) + '.'; },
    turn: function(n){ return n + '턴째.'; },
    starve: function(name, n){ return iga(name) + ' 굶주려 ' + n + '.'; },
    stunFail: function(){ return '장수는 꾀에 넘어가지 않았다.'; },
    stunned: function(name){ return eunun(name) + ' 움직이지 못했다.'; },
    resist: function(name){ return iga(name) + ' 버텼다. 밀리지 않는다.'; },
    spawn: function(name){ return iga(name) + ' 나타났다.'; },
    wave: function(idx, intro){ return intro || (idx + '번째 파도가 온다.'); },
    tide: function(phase, left){ return phase === 'flow' ? '순류. 군령 +' + B.TIDE.flowEnergy + ', 밀어내기 +' + B.TIDE.flowPush + '.' : '역류. 적이 ' + B.TIDE.ebbStep + '칸씩 온다.'; },
    rescue: function(name){ return api.rescue(name); },
    raid: function(n){ return '군량 ' + eulrul(String(n)) + ' 약탈당했다.'; },
    incite: function(n){ return '반군이 선동한다. 의심 +' + n + '.'; },
    signal: function(){ return '척후가 신호를 보냈다. 다음 적 턴 공격 +1.'; },
    build: function(name, count){ return iga(name) + ' 흙산을 쌓는다. (' + count + '/3)'; },
    built: function(){ return '흙산이 완성되었다. 성벽을 넘어 쏜다.'; },
    rally: function(name, n){ return iga(name) + ' 기세를 올렸다. +' + n + '.'; },
    draw: function(n){ return n + '장을 뽑았다.'; },
    noDraw: function(){ return '뽑을 카드가 없다.'; },
    energyOut: function(){ return '군령이 모자란다.'; },
    rationOut: function(){ return '군량이 모자란다. 명군은 움직이지 않는다.'; },
    turnCap: function(){ return '싸움이 길다. 왜군이 굶는다.'; },
    win: function(){ return '이겼다. 북을 거두어라.'; },
    lose: function(){ return '진이 무너졌다.'; },
    exhaust: function(card){ return iga(q((card && card.name) || card)) + ' 이번 전투에서 사라진다.'; },
    edictDrawn: function(card){ return '어명 ' + iga(q((card && card.name) || card)) + ' 손에 들어왔다.'; },
    leave: function(name){ return iga(name) + ' 떠났다. 그의 카드가 덱에서 사라진다.'; },
    ambush: function(n){ return '매복이 터졌다. 적 전체 ' + n + '.'; }
  };

  /* ---------------------------------------------------------------- UI 낱말 */
  api.ui = {
    endTurn: '턴 종료', skip: '건너뛰기', confirm: '확인', cancel: '취소', continue: '계속', next: '다음', close: '닫기', back: '뒤로',
    newRun: '새 게임', resume: '이어하기', settings: '설정', deck: '덱 보기', title: '처음 화면', start: '시작', chooseLeader: '주장 선택', leaderSelect: '주장을 고르세요',
    buy: '구매', leave: '나가기', remove: '카드 버리기', removeDone: '이미 한 장을 버렸다', sold: '판매 완료', price: '군량', shopHead: '시장',
    rest: '휴식', train: '훈련', farm: '농사', campHead: '군영',
    report: '장계 올리기', recruit: '장수 영입', request: '명군 요청', decline: '거절', courtHead: '조정', requestLocked: '명군은 3막부터 요청할 수 있다', slotFull: '자리가 찼다. 누구와 바꿀까?',
    hp: '병력', maxHp: '최대 병력', energy: '군령', ration: '군량', suspicion: '의심', block: '진형', wall: '성벽', score: '점수', turn: '턴', dist: '거리',
    drawPile: '뽑을 카드', discardPile: '버린 카드', exhaustPile: '소모', hand: '손', cost: '군령', upgrade: '강화', upgraded: '강화됨', pick: '선택', picked: '선택함',
    reward: '전리품', rewardHead: '카드 한 장을 고르거나 건너뛰세요', relicGet: '기물을 얻었다', rationGet: '군량을 얻었다', skipBonus: '건너뛰면 군량 +' + B.RATION_SKIP,
    map: '지도', act: '막', node: '마디', enter: '들어가기', select: '선택', date: '날짜', here: '여기', path: '지나온 길',
    volume: '음량', fast: '빠르게', shake: '화면 흔들림', captions: '자막', mute: '음소거', on: '켬', off: '끔', save: '저장하고 나가기', saved: '저장했다', noSave: '이어할 게임이 없다',
    tideEbb: '역류', tideFlow: '순류', tideChange: '물이 바뀐다: {n}턴', rescueChoose: '누가 대신 서는가', rescueAuto: '5초 뒤 첫째가 선다',
    chooseDiscard: '버릴 카드를 고르세요', chooseExhaust: '소모할 카드를 고르세요', chooseRetrieve: '되가져올 카드를 고르세요', chooseUpgrade: '강화할 카드를 고르세요', chooseRemove: '버릴 카드를 고르세요',
    chooseOffer: '덱에 넣을 카드를 고르세요', needTarget: '대상을 고르세요', notPlayable: '낼 수 없다', noEnergy: '군령 부족', noRation: '군량 부족', chargeClose: '근접에서는 돌격할 수 없다',
    noAtkHidden: '숨은 동안 공격 카드를 낼 수 없다', noRepWonGyun: '원균은 장계를 쓰지 않는다',
    intentHead: '의도', actual: '실제', preview: '적용 수치', longPress: '길게 누르면 전문', enemies: '적', leader: '주장', deputy: '부장', special: '특별 부장', relics: '기물',
    actEndHead: '막 결산', fights: '치른 싸움', suspTrace: '의심 기록', gained: '얻은 것', choices: '고른 것', compareHead: '역사와 나란히',
    endingHead: '결말', scoreHead: '점수표', total: '합계', playAgain: '다시 하기', won: '승', lost: '패', turns: '턴', yes: '예', no: '아니요',
    merit: '장계 분배', council: '어전회의', verdict: '판결 듣기', defend: '변호하기', edictCount: '덱 안의 어명', thresholds: '문턱 ' + T.join('·')
  };
  api.leaderPick = { yi: { line: '화포와 원거리. 바다에서 첫 턴 군령이 하나 더 온다. 임금은 처음부터 그를 의심한다.' }, gwon: { line: '성벽과 화차. 턴 끝에 진형 ' + B.GWON_KEEP + '이 남는다. 의심은 0에서 시작한다.' } };

  /* ---------------------------------------------------------------- 장계 분배 · 어전회의 · 군영·조정 */
  var M = B.MERIT;
  api.merit = {
    head: '이번 싸움의 공을 누구에게 돌릴까?',
    slots: { leader: '주장', king: '전하', ming: '명군' },
    effects: {
      leader: M.leaderPer + '점마다 카드 1장 강화(최대 ' + M.leaderMaxUp + '장). ' + 5 + '점 이상이면 의심 +' + M.leaderSusp5 + ', ' + M.total + '점이면 +' + M.leaderSusp10 + '.',
      king: M.kingPer + '점마다 의심 −1(최대 −' + M.kingMaxDown + '), 군량 +' + M.kingRation + '.',
      ming: M.mingPer + '점마다 다음 막 동안 명군 카드 군량 −1(최대 −' + M.mingMaxDiscount + ').'
    },
    total: '공 ' + M.total + '점', confirm: '확인',
    result: function(alloc){
      alloc = alloc || {}; var L = [], l = alloc.leader || 0, k = alloc.king || 0, g = alloc.ming || 0;
      var ups = Math.min(M.leaderMaxUp, Math.floor(l / M.leaderPer)); if (ups) L.push('주장의 공으로 카드 ' + ups + '장을 강화한다.');
      if (l >= M.total) L.push('의심 +' + M.leaderSusp10 + '.'); else if (l >= 5) L.push('의심 +' + M.leaderSusp5 + '.');
      var down = Math.min(M.kingMaxDown, Math.floor(k / M.kingPer)); if (down) L.push('전하께 돌린 공으로 의심 −' + down + ', 군량 +' + (down * M.kingRation) + '.');
      var disc = Math.min(M.mingMaxDiscount, Math.floor(g / M.mingPer)); if (disc) L.push('명군의 공으로 다음 막 명군 카드 군량 −' + disc + '.');
      return L.length ? L : ['공은 나뉘었으나 바뀐 것은 없다.'];
    }
  };
  var C = B.COUNCIL;
  api.council = {
    title: '어전회의', pages: ['소식', '변호', '판결'],
    defenses: {
      ration: { text: '군량 ' + eulrul(String(C.rationCost)) + ' 바친다', effect: '의심 −1', reason: '군량이 모자란다' },
      removeReport: { text: '장계 카드 1장을 덱에서 영구히 뺀다', effect: '의심 −1 (최대 ' + C.maxRemove + '장)', reason: '덱에 장계 카드가 없다' },
      brush: { text: '서애의 붓으로 변호한다', effect: '의심 −1', reason: '서애의 붓이 없다' }
    },
    keepIf: '의심 ' + (C.dismissAt - 1) + ' 이하면 유임', dismissIf: '의심 ' + C.dismissAt + ' 이상이면 파직',
    keep: '통제사는 바다로 돌아갔다.', dismiss: '통제사가 묶여 한성으로 올라갔다.', afterDismiss: '의심은 ' + euro(String(C.afterDismiss)) + ' 내려간다.',
    verdict: function(susp, dismissed){ return (dismissed ? api.council.dismiss : api.council.keep) + ' (의심 ' + susp + ')'; }
  };
  api.camp = {
    rest: { text: '휴식', preview: '최대 병력의 ' + pc(B.CAMP.restPct) + ' 회복' }, train: { text: '훈련', preview: '카드 1장 강화' }, farm: { text: '농사', preview: '군량 +' + B.CAMP.farm }
  };
  api.court = {
    report: { text: '장계 올리기', preview: '의심 ' + sg(B.COURT.report) }, recruit: { text: '장수 영입', preview: '이 막의 장수 후보 중 한 사람을 들인다', none: '영입할 장수가 없다' },
    request: { text: '명군 요청', preview: '군량 −' + B.COURT.requestCost + ', 명군 카드 ' + B.COURT.requestPick + '장 중 1장', locked: '3막부터' },
    shopRemove: '카드 버리기: 덱에서 카드 1장을 뺀다. 군량 ' + B.SHOP.remove + '(어명은 ' + B.SHOP.removeEdict + ')'
  };
  // 결전 보상 화면의 군량 가감 사유(Run 의 reward.bonusText). 키: 1막 결전 지형(b1) 또는 plus/minus
  api.rewardBonus = { river: '탄금대 강가의 전리품', fort: '충주성에서 버티느라 쓴 군량', ridge: '조령 고개의 전리품', plus: '결전의 전리품', minus: '결전에 쓴 군량' };

  /* ---------------------------------------------------------------- 사료 메모 (DESIGN §11, 전부 음력) */
  api.memo = {
    '1592.4.14': '부산진 함락', '1592.4.15': '동래', '1592.4.22': '곽재우 창의', '1592.4.25': '상주', '1592.4.28': '탄금대', '1592.4.30': '선조 파천', '1592.5.3': '한성 함락',
    '1592.5.7': '옥포', '1592.5.18': '임진강', '1592.5.29': '사천(거북선 첫 출전)', '1592.6.2': '당포', '1592.6.5': '당항포', '1592.6.5~6': '용인', '1592.6.7': '율포',
    '1592.6.15': '평양 함락', '1592.7.8': '한산도·이치', '1592.7.10': '금산 1차(고경명)', '1592.7.17': '조승훈 평양', '1592.8.1': '청주 탈환', '1592.8.18': '금산 2차(조헌·영규)',
    '1592.8.28~9.2': '연안성', '1592.9.1': '부산포(정운 전사)', '1592.9.8': '경주 탈환(비격진천뢰)', '1592.10.5~10': '진주 1차(김시민 총상, 며칠 뒤 사망)', '1592.9~1593.1': '북관대첩',
    '1593.1.6~8': '평양 탈환', '1593.1.27': '벽제관', '1593.2.12': '행주', '1593.4.18~20': '한성 수복', '1593.6.21~29': '진주 2차(황진 6.28 전사)', '1593.10': '훈련도감',
    '1594.4': '서생포 회담(사명당·가토)', '1594': '금토패문(담종인)', '1596.7': '이몽학의 난', '1596.8': '김덕령 옥사', '1596.9': '책봉사 파탄', '1597.1': '요시라',
    '1597.2': '이순신 파직·압송', '1597.4.1': '백의종군', '1597.7.15~16': '칠천량(이억기·원균 전사, 배설 12척)', '1597.8.3': '이순신 복직', '1597.8.13~16': '남원(양원 8.16 밤 탈출)',
    '1597.8.16~18': '황석산성', '1597.8.28': '어란포', '1597.9.7': '직산', '1597.9.7~15': '벽파진', '1597.9.16': '명량(구루시마 전사)', '1597.12.22~1.4': '울산성',
    '1598.2': '고금도 본영', '1598.8.18': '히데요시 사망', '1598.9.20~10.7': '순천 왜교성', '1598.10.1': '사천', '1598.11.19': '노량(이순신·등자룡 전사)'
  };
  api.memoAt = function(d){ return api.memo[d] || ''; };
  api.dateLine = function(d){ var m = api.memo[d]; return date(d) + (m ? ' — ' + m : ''); };

  /* ---------------------------------------------------------------- 자가 검사 */
  api.selfTest = function(){
    var errors = [];
    function eq(a, b, what){ if (a !== b) errors.push(what + ': ‘' + a + '’ ≠ ‘' + b + '’'); }
    eq(date('1592.4.14'), '1592년 4월 14일', 'date 1');
    eq(date('1592.4.17~19'), '1592년 4월 17~19일', 'date 2');
    eq(date('1592.6'), '1592년 6월', 'date 3');
    eq(date('1592.10.5~10'), '1592년 10월 5~10일', 'date 4');
    eq(date('1592.4.30~5.3'), '1592년 4월 30일~5월 3일', 'date 5');
    eq(date('1597.12.22~1.4'), '1597년 12월 22일~1598년 1월 4일', 'date 6');
    eq(date('1592.9~1593.1'), '1592년 9월~1593년 1월', 'date 7');
    eq(date('1592.7.10~8.18'), '1592년 7월 10일~8월 18일', 'date 8');
    eq(date('1594'), '1594년', 'date 9');
    eq(date('1592.5~10'), '1592년 5~10월', 'date 10');
    eq(ganji(1592), '임진', 'ganji');
    eq(fill('{name:iga} 왔다', { name: '권율' }), '권율이 왔다', 'fill josa 1');
    eq(fill('{name:iga} 떠났다', { name: '조헌·영규' }), '조헌·영규가 떠났다', 'fill josa 2');
    eq(fill('{name:eulrul} {n}', { name: '‘활시위’', n: 3 }), '‘활시위’를 3', 'fill josa 3');
    eq(fill('{pct} {none}', { pct: '70%' }), '70% {none}', 'fill 빈 자리표');
    eq(euro('원거리'), '원거리로', 'euro 1'); eq(euro('근접'), '근접으로', 'euro 2'); eq(euro('7'), '7로', 'euro 3'); eq(iga('3'), '3이', 'iga 숫자');
    eq(api.ending.nanse.lines({ act: 7, leader: 'yi', flags: {} })[1], '7막 ‘노량’에서 이순신의 진이 무너졌다.', 'nanse 막 번호');
    eq(api.log.play({ name: '활시위' }), '‘활시위’를 냈다.', 'log.play');
    var sample = { suspicion: { n: -1 }, ration: { n: 20 }, hp: { n: 10, max: 8 }, addCard: { id: 'manifesto', where: 'hand' }, removeCard: { tag: 'navy', all: true }, upgrade: { n: 1, choose: true },
      relic: { id: 'hansan_drum', up: true }, flag: { key: 'b1', value: 'ridge' }, leave: { id: 'yi_eokgi', dead: true }, cond: { if: { dist: 0 }, then: [{ op: 'dmg', n: 10, tag: 'none' }], else: [{ op: 'dmg', n: 5, tag: 'none' }] },
      fx: { kind: 'banner', key: 'crane' }, score: { n: -100 }, dmg: { n: 9, all: true, tag: 'shot', mulAt: { far: 2 } }, block: { n: 6, wall: true }, push: { n: 1 }, pull: { n: 2 }, draw: { n: 1, nextTurn: true },
      energy: { n: 1 }, status: { who: 'all', id: 'shaken', n: 1 }, stun: { n: 2 }, buff: { id: 'atkPct', n: 0.5, turns: 1 }, exhaustHand: { perCard: [{ op: 'dmg', n: 6, tag: 'none' }] }, discard: { n: 1, choose: true },
      exhaust: { n: 1, choose: true, which: 'hand' }, retrieve: { n: 1, from: 'discard', choose: true }, mark: { set: true }, delay: { turns: 1, ops: [{ op: 'dmg', n: 16, tag: 'fire', all: true }] }, stripBlock: {},
      battle: { enc: 'dongnae_hold', reward: false, onWin: [{ op: 'addCard', id: 'manifesto' }] }, recruit: { id: 'gwon' }, ending: { id: 'silrok' }, offer: { pool: 'ming', n: 3, pick: 2 } };
    api.OPS.forEach(function(op){
      var o = Object.assign({ op: op }, sample[op] || {});
      var s; try { s = opOne(o); } catch (e) { errors.push('opsText ' + op + ' throw: ' + e.message); return; }
      if (typeof s !== 'string') errors.push('opsText ' + op + ' 가 문자열이 아니다');
      else if (!s && op !== 'fx') errors.push('opsText ' + op + ' 가 빈 문자열');
    });
    if (api.OPS.length !== 32) errors.push('OPS 수 ' + api.OPS.length);
    var cond = opsText([{ op: 'cond', if: { dist: 0 }, then: [{ op: 'dmg', n: 10, tag: 'none' }], else: [{ op: 'dmg', n: 5, tag: 'none' }] }]);
    if (cond.indexOf('(원거리면)') < 0 || cond.indexOf('(아니면)') < 0) errors.push('cond 문구: ' + cond);
    var cd = cardDesc({ id: 'bowstring', name: '활시위', tags: ['shot'], ops: [{ op: 'dmg', n: 6, tag: 'shot' }], desc: '6 피해.', home: '경상', ration: 1, exhaust: true }, false, { dist: 0 });
    ['원거리 ×1.5', '중거리 ×1', '근접 ×0.5', '경상에서 ×1.4', '군량 1', '소모'].forEach(function(k){ if (cd.indexOf(k) < 0) errors.push('cardDesc 누락: ' + k + ' / ' + cd); });
    ['title', 'hanja', 'subtitle', 'act', 'date', 'dist', 'distName', 'tutorial', 'type', 'pool', 'rarity', 'status', 'buff', 'tag', 'intent', 'opsText', 'cardDesc', 'banner', 'scroll', 'rescue',
      'defeat', 'ending', 'compare', 'log', 'ui', 'merit', 'council', 'memo', 'terrain', 'kindIcon'].forEach(function(k){ if (api[k] == null) errors.push('필수 키 없음: ' + k); });
    for (var a = 1; a <= 7; a++) { if (!api.act[a] || !api.act[a].intro || api.act[a].intro.length < 2) errors.push('act ' + a); if (!api.defeat[a]) errors.push('defeat ' + a); }
    ['thresh4', 'thresh7', 'thresh10', 'chilcheon', 'return_tongjesa', 'prison', 'council1', 'council2', 'council3_keep', 'council3_dismiss'].forEach(function(k){ if (!api.scroll[k] || !api.scroll[k].lines) errors.push('scroll ' + k); });
    ['boss_konishi', 'boss_wakizaka', 'boss_jinju1', 'boss_haengju', 'boss_jiksan', 'boss_myeongnyang', 'boss_noryang'].forEach(function(k){
      if (!api.scroll.bossIntro[k]) errors.push('bossIntro ' + k);
      if (typeof api.compare[k] !== 'function' || typeof api.compare[k]({ turns: 7, shipsLeft: 3, wavesCleared: 2, pushes: 4, dmgTaken: 30 }) !== 'string') errors.push('compare ' + k); });
    ['silrok', 'jingbi', 'nanse'].forEach(function(k){ var L = api.ending[k].lines({ act: 6, leader: 'yi', flags: { b1: 'ridge', lane2: 'sea', dismissed: false, chilcheon: true, rescuedUsed: true }, suspicion: 8 });
      if (!Array.isArray(L) || L.length < 3) errors.push('ending ' + k); });
    ['shaken', 'exposed', 'hunger', 'momentum', 'ambush', 'ironwall', 'stun', 'flinch', 'loaded'].forEach(function(k){ if (!api.status[k]) errors.push('status ' + k); });
    ['nextAtk', 'atkAdd', 'shotAdd', 'atkPct', 'shotPct', 'evadeFirst', 'hide', 'noAtk', 'noMelee', 'noPushBattle', 'wallPersist', 'chargeAtClose', 'noAdvance', 'passivesOff', 'minHp1'].forEach(function(k){ if (!api.buff[k]) errors.push('buff ' + k); });
    ['plain', 'ridge', 'river', 'fort', 'port', 'strait', 'waeseong', 'none'].forEach(function(k){ if (!api.terrain[k]) errors.push('terrain ' + k); });
    var dateRe = /^\d{4}(\.\d{1,2}(\.\d{1,2})?)?(~\d{1,2}(\.\d{1,2})?|~\d{4}\.\d{1,2})?$/;
    for (var k in api.memo) if (!dateRe.test(k)) errors.push('memo 날짜 형식: ' + k);
    if (api.rescue('황진') !== '황진이 창을 들고 앞으로 나섰다. 북소리가 다시 울렸다.') errors.push('rescue 문구');
    if (api.scrollFor('prison', { name: '황진' }).lines[0].indexOf('황진') < 0) errors.push('scrollFor fill');
    try { JSON.parse(JSON.stringify(api.memo)); JSON.parse(JSON.stringify(api.scroll)); } catch (e) { errors.push('JSON 왕복: ' + e.message); }
    return { ok: errors.length === 0, errors: errors };
  };

  return api;
})();
