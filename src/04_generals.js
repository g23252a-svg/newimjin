/* ===== 04_generals.js — 주장 2·부장 8·기물 17 (패시브는 훅+DSL, 코드 없음) ===== */
// 계약서 §3.4 스키마·ID·「패시브 → 계약 표현」 표를 그대로 옮겼다. 규칙 수치는 Core.BAL에서 읽는다.
// 핸들러·mod 객체에는 src 를 넣지 않는다 — Combat 이 조립할 때 {kind, id} 를 붙인다(계약 §5.4·§9).
// TODO(통합): Combat(07) — 기물·장수의 handlers/mods 를 st 에 넣을 때 **복사해서** src 를 붙일 것. 이 데이터는 공유 객체다(freeze 하지 않았지만 변형 금지).
// TODO(통합): Combat(07) — relicUp[id] 이고 relic.upHandlers 가 null 이면 handlers 를 쓸 것(강화판이 있는 기물은 한산의 북·진주의 북 둘뿐).
// TODO(통합): Run(08) — 장시 기물 진열은 src==='shop' 만이 아니라 src in {'shop','elite'} 미보유에서 뽑기를 권한다(DESIGN §6.5 「장시·정예」 겸용 기물이 셋).
// TODO(통합): Run(08) — 오방낭 runMods.eventRationBonus 는 사건 ration 양수에만 가산(계약 §4.1). shopDiscount 는 BAL.SHOP.discount 와 같은 값.
// TODO(통합): CARDS(02) — 부장 고유 카드 owner 필드: hwacha→'gwon', crane_wing→'yi' 는 공용 풀 카드이므로 owner 를 두지 않을 수 있다. selfTest 는 owner 가 있을 때만 대조한다.
// TODO(통합): TXT(01) — TXT.rescue(name) 의 name 은 GENERALS.deputies.get(id).name 을 넘긴다. 조헌·영규는 한 부장이다.
var GENERALS = (function(){ 'use strict';
  var BAL = Core.BAL;

  /* ------------------------------------------------------------ 주장 2 */
  var LEADERS = [
    { id:'yi', name:'이순신', hanja:'李舜臣', hp:BAL.LEADER_HP.yi, suspStart:BAL.SUSP_START.yi, famed:true,
      passive:{
        mods:[ { mod:'atkPct', n:BAL.YI.atkPct, if:{ hpPct:{ lte:BAL.YI.hpPct } } } ],
        handlers:[ { hook:'onTurnStart', cond:{ naval:true, turn:1 }, ops:[ { op:'energy', n:1 } ] } ] },
      cards:[ 'pilsa_jeuksaeng', 'not_one_ship', 'sinsang_pilbeol', 'danghangpo_lure' ],
      desc:'전라좌수사. 바다를 아는 장수. 한 척도 헛되이 잃지 않는다.',
      passiveDesc:'필사즉생 — 죽고자 하면 산다. 병력이 ' + BAL.YI.hpPct + '% 이하면 공격 +' + Math.floor(BAL.YI.atkPct * 100) + '%. 해전 첫 턴 군령 +1.',
      deckColor:'화포·원거리 유지·학익진',
      memo:'옥포 1592.5.7 첫 승. 한산도 7.8. 1597년 2월 파직·압송, 4월 1일 백의종군, 8월 3일 복직. 명량 9.16. 노량 1598.11.19.' },
    { id:'gwon', name:'권율', hanja:'權慄', hp:BAL.LEADER_HP.gwon, suspStart:BAL.SUSP_START.gwon, famed:false,
      passive:{
        mods:[ { mod:'blockKeep', n:BAL.GWON_KEEP } ],
        handlers:[] },
      cards:[ 'hwacha_volley', 'sema', 'die_standing', 'level_ground' ],
      desc:'광주 목사에서 도원수까지. 성을 등지고 서서 버티는 장수.',
      passiveDesc:'버티기 — 턴 끝에 진형 ' + BAL.GWON_KEEP + '이 남는다(성벽과 별개).',
      deckColor:'수성·성벽·화차',
      memo:'이치 1592.7.8. 독산성 1592.12. 행주 1593.2.12. 직산 1597.9.7.' }
  ];

  /* ------------------------------------------------------------ 부장 6 + 교차 2 */
  var DEPUTIES = [
    { id:'gwon', name:'권율', hanja:'權慄', famed:false,
      passive:{ mods:[ { mod:'blockKeep', n:BAL.GWON_DEPUTY_KEEP } ], handlers:[] },
      card:'hwacha',
      recruit:'1막 한성 조정에서 영입(이순신이 주장일 때) / 2막 뭍길 ‘이치의 고개’',
      desc:'바다의 장수 곁에 선 뭍의 장수. 행주의 화차가 그의 손에 있다.',
      passiveDesc:'버티기 — 턴 끝에 진형 ' + BAL.GWON_DEPUTY_KEEP + '가 남는다.',
      memo:'이치 1592.7.8. 행주 1593.2.12.' },
    { id:'yi', name:'이순신', hanja:'李舜臣', famed:true,
      passive:{ mods:[], handlers:[ { hook:'onTurnStart', cond:{ naval:true, turn:1 }, ops:[ { op:'energy', n:1 } ] } ] },
      card:'crane_wing',
      recruit:'1막 한성 조정에서 영입(권율이 주장일 때) / 2막 바닷길 ‘거북선 진수’ / 5막 결산 ‘통제사 복귀’',
      desc:'전라좌수사. 뭍의 주장 아래서도 바다는 그의 것이다.',
      passiveDesc:'해전 첫 턴 군령 +1.',
      memo:'옥포 1592.5.7. 한산도 7.8. 1597.2 파직, 8.3 복직. 명량 9.16.' },
    { id:'yi_eokgi', name:'이억기', hanja:'李億祺', famed:false,
      passive:{ mods:[ { mod:'dmgBonus', n:2, if:{ naval:true, cardTag:'shot' } } ], handlers:[] },
      card:'jeolla_right',
      recruit:'2막 바닷길 전라좌수영 조정에서 영입',
      desc:'전라우수사. 좌수영과 나란히 선 또 하나의 수군.',
      passiveDesc:'해전에서 사격 카드 피해 +2.',
      memo:'칠천량 1597.7.15~16 전사.' },
    { id:'kim_simin', name:'김시민', hanja:'金時敏', famed:false,
      passive:{ mods:[], handlers:[ { hook:'onTurnStart', cond:{ siege:true }, ops:[ { op:'block', n:2, wall:true } ] } ] },
      card:'wall_rally',
      recruit:'2막 뭍길 진주 목사영 조정에서 영입',
      desc:'진주 목사. 엿새를 버틴 사람.',
      passiveDesc:'수성 중 턴 시작마다 성벽 진형 +2.',
      memo:'진주 1차 1592.10.5~10. 총상을 입고 며칠 뒤 숨졌다.' },
    { id:'jeong_munbu', name:'정문부', hanja:'鄭文孚', famed:false,
      passive:{ mods:[ { mod:'costDelta', n:-1, if:{ cardTag:'charge' }, once:'battle' } ], handlers:[] },
      card:'bukgwan_cavalry',
      recruit:'2막 뭍길 진주 목사영 조정에서 영입',
      desc:'함경도의 의병장. 북관의 눈 속에서 기병을 일으켰다.',
      passiveDesc:'전투마다 한 번, 돌격 카드 비용 −1.',
      memo:'북관대첩 1592.9~1593.1.' },
    { id:'jo_heon', name:'조헌·영규', hanja:'趙憲·靈圭', famed:false,
      passive:{ mods:[ { mod:'dmgBonus', n:2, if:{ cardTag:'uibyeong' } } ], handlers:[] },
      card:'seven_hundred',
      recruit:'2막 뭍길 ‘금산, 두 번’',
      desc:'충청의 의병장과 승병장. 금산에서 함께 섰다. 한 자리에 두 사람.',
      passiveDesc:'의병 카드 피해·진형 +2.',
      memo:'금산 2차 1592.8.18. 칠백 의병이 모두 쓰러졌다.' },
    { id:'hwang_jin', name:'황진', hanja:'黃進', famed:false,
      passive:{ mods:[], handlers:[ { hook:'onTurnStart', cond:{ siege:true, turn:1 }, ops:[ { op:'energy', n:1 } ] } ] },
      card:'ichi_bow',
      recruit:'2막 뭍길 ‘이치의 고개’ / 3막 행주 진영 조정에서 영입 / 5막 직산 진영 조정에서 영입',
      desc:'이치 고개에서 활을 쏜 사람. 성 위에서는 창을 든다.',
      passiveDesc:'수성 첫 턴 군령 +1.',
      memo:'이치 1592.7.8. 진주 2차 1593.6.28 전사.' },
    { id:'yi_jeongam', name:'이정암', hanja:'李廷馣', famed:false,
      passive:{ mods:[], handlers:[ { hook:'onBattleStart', ops:[ { op:'block', n:3, wall:true } ] } ] },
      card:'yeonan_fort',
      recruit:'1막 한성 조정에서 영입 / 2막 뭍길 연안성 승리 / 5막 직산 진영 조정에서 영입',
      desc:'황해도 연안성을 지킨 사람. 성벽이 곧 그의 무기다.',
      passiveDesc:'전투 시작 시 성벽 진형 3.',
      memo:'연안성 1592.8.28~9.2.' }
  ];

  /* ------------------------------------------------------------ 기물 17 */
  var RELICS = [
    { id:'turtle_blueprint', name:'거북선 설계도', hanja:'龜船', src:'event',
      handlers:[ { hook:'onBattleStart', cond:{ naval:true }, ops:[ { op:'addCard', id:'turtle_ship', where:'hand', generated:true } ] } ],
      desc:'해전 시작 시 손에 ‘거북선’ 1장.',
      memo:'나대용. 사천 1592.5.29 첫 출전.' },
    { id:'jincheonroe_relic', name:'비격진천뢰', hanja:'飛擊震天雷', src:'event',
      handlers:[ { hook:'onBattleStart', cond:{ siege:true }, ops:[ { op:'dmg', n:15, all:true, tag:'fire' } ] } ],
      desc:'수성 전투 시작 시 적 전체에 15 피해.',
      memo:'이장손. 경주 탈환 1592.9.8.' },
    { id:'hwacha_relic', name:'화차', hanja:'火車', src:'elite',
      handlers:[ { hook:'onCardPlayed', cond:{ cardType:'atk', oncePerTurn:true }, ops:[ { op:'dmg', n:4, all:true, tag:'fire' } ] } ],
      desc:'매 턴 첫 공격 카드를 낼 때 적 전체에 4 피해.',
      memo:'변이중. 행주 1593.2.12.' },
    { id:'nanjung_relic', name:'난중일기', hanja:'亂中日記', src:'shop',
      runMods:{ actStartOps:[ { op:'suspicion', n:-1 } ] },
      desc:'막 시작마다 의심 −1.',
      memo:'싸움터에서 날마다 적은 글. 조정에 올리지 않은 말이 더 많다.' },
    { id:'jingbirok', name:'징비록', hanja:'懲毖錄', src:'elite',
      handlers:[ { hook:'onBattleStart', ops:[ { op:'draw', n:1 } ] } ],
      desc:'전투 시작 시 1장 더 뽑는다.',
      memo:'류성룡이 전쟁을 돌아보며 쓴 책. 지난 잘못을 거울삼는다.' },
    { id:'tonga', name:'편전 통아', hanja:'筒兒', src:'elite',
      mods:[ { mod:'dmgBonus', n:2, if:{ cardTag:'pierce' } } ],
      desc:'관통 카드 피해 +2.',
      memo:'통아에 꽂아 쏘는 짧은 화살, 편전. 왜군은 그것이 어디서 날아오는지 몰랐다.' },
    { id:'hangwae_gun', name:'항왜의 조총', hanja:'降倭 鳥銃', src:'event',
      onAcquire:[ { op:'addCard', id:'jochong', n:2 } ],
      desc:'얻을 때 덱에 ‘조총’ 2장.',
      memo:'항왜 사야가, 뒤의 이름은 김충선.' },
    { id:'obangnang', name:'오방낭', hanja:'五方囊', src:'shop',
      runMods:{ shopDiscount:BAL.SHOP.discount, eventRationBonus:5 },
      desc:'시장 값 ' + Math.floor(BAL.SHOP.discount * 100) + '% 할인. 사건에서 얻는 군량 +5.',
      memo:'다섯 방위의 복을 담은 주머니.' },
    { id:'seoae_brush', name:'서애의 붓', hanja:'西厓', src:'event',
      handlers:[ { hook:'onCardDrawn', cond:{ cardType:'edict', oncePerBattle:true }, ops:[ { op:'exhaust', which:'drawn' } ] } ],
      desc:'전투마다 한 번, 어명 카드를 뽑으면 그대로 소모한다. 어전회의에서 의심 −1.',
      memo:'류성룡의 호가 서애다. 그 붓이 임금과 장수 사이에 있었다.' },
    { id:'chains', name:'감옥의 쇠사슬', hanja:'禁錮', src:'event', curse:true,
      onAcquire:[ { op:'suspicion', n:2 } ],
      handlers:[ { hook:'onTurnStart', ops:[ { op:'energy', n:1 } ] } ],
      desc:'저주. 얻을 때 의심 +2. 매 턴 군령 +1.',
      memo:'김덕령이 옥에서 죽었다 1596.8. 공이 큰 장수가 묶였다.' },
    { id:'joryeong_stone', name:'조령의 돌', hanja:'鳥嶺', src:'boss',
      handlers:[ { hook:'onBattleStart', ops:[ { op:'buff', id:'noAdvance', turns:1 } ] } ],
      desc:'전투 첫 턴 적이 전진하지 않는다.',
      memo:'신립이 넘지 않은 고개. 탄금대 1592.4.28.' },
    { id:'hansan_drum', name:'한산의 북', hanja:'閑山', src:'boss',
      handlers:[ { hook:'onTurnStart', cond:{ naval:true, turn:1 }, ops:[ { op:'push', n:1 } ] } ],
      upHandlers:[ { hook:'onTurnStart', cond:{ naval:true, turn:1 }, ops:[ { op:'push', n:2 } ] } ],
      desc:'해전 첫 턴 밀어내기 1. (강화: 2)',
      memo:'한산도 1592.7.8. 부산포 9.1, 정운.' },
    { id:'jinju_drum', name:'진주의 북', hanja:'晉州', src:'boss',
      handlers:[ { hook:'onBattleStart', cond:{ siege:true }, ops:[ { op:'status', who:'all', id:'shaken', n:1 } ] } ],
      upHandlers:[ { hook:'onBattleStart', cond:{ siege:true }, ops:[ { op:'status', who:'all', id:'shaken', n:2 } ] } ],
      desc:'수성 첫 턴 적 전체 동요 1. (강화: 2)',
      memo:'진주 1차 1592.10.5~10. 김시민의 북.' },
    { id:'haengju_ash', name:'행주의 재', hanja:'幸州', src:'boss',
      handlers:[ { hook:'onBattleStart', ops:[ { op:'addCard', id:'ash_bag', where:'hand', generated:true } ] } ],
      desc:'전투 시작 시 손에 ‘재주머니’ 1장.',
      memo:'행주 1593.2.12. 아래는 강이요 위는 하늘이었다.' },
    { id:'jiksan_spear', name:'직산의 창', hanja:'稷山', src:'boss',
      mods:[ { mod:'dmgBonus', n:2, if:{ cardTag:'melee' } } ],
      desc:'백병 카드 피해 +2.',
      memo:'직산 1597.9.7.' },
    { id:'myeongnyang_chain', name:'명량의 쇠사슬', hanja:'鳴梁', src:'boss',
      handlers:[ { hook:'onEnemySpawn', cond:{ naval:true, enemyId:[ 'sekibune', 'kobaya' ] }, ops:[ { op:'status', who:'spawned', id:'shaken', n:1 } ] } ],
      desc:'해전에서 왜군 중선·소선이 나타나면 그 배에 동요 1.',
      memo:'명량 1597.9.16. 울돌목에 쇠사슬을 걸었다는 이야기가 전해 온다.' },
    { id:'tongjeyeong_flag', name:'통제영의 깃발', hanja:'統制營', src:'event',
      mods:[ { mod:'dmgBonus', n:1, if:{ cardTag:'navy' } } ],
      desc:'수군 카드 피해 +1.',
      memo:'5막 부산 앞바다. 수군이 아직 바다에 있다는 표시.' }
  ];

  /* ------------------------------------------------------------ 정규화·색인 */
  function fillRelic(r) {
    return { id:r.id, name:r.name, hanja:r.hanja || null, src:r.src,
      handlers:r.handlers || [], upHandlers:r.upHandlers || null, mods:r.mods || [],
      onAcquire:r.onAcquire || null, runMods:r.runMods || null, curse:!!r.curse,
      desc:r.desc, memo:r.memo };
  }
  function index(list) {
    var byId = {};
    for (var i = 0; i < list.length; i++) byId[list[i].id] = list[i];
    return { list:list, byId:byId, get:function(id){
      if (!Object.prototype.hasOwnProperty.call(byId, id)) throw new Error('GENERALS: 없는 id ' + id);
      return byId[id];
    } };
  }
  var leaders = index(LEADERS);
  var deputies = index(DEPUTIES);
  var relics = index(RELICS.map(fillRelic));

  /* ------------------------------------------------------------ 자가 검사 */
  var HOOKS = ['onBattleStart','onTurnStart','onTurnEnd','onCardPlayed','onCardDrawn','onDamageDealt','onDamageTaken',
    'onDistanceChange','onEnemyDeath','onEnemySpawn','onWaveStart','onHpZero','onBattleEnd','onActStart','onAcquire'];
  var MODS = ['dmgBonus','atkPct','costDelta','blockKeep'];
  var OPS_COMMON = ['suspicion','ration','hp','addCard','removeCard','upgrade','relic','flag','leave','cond','fx','score'];
  var OPS_BATTLE = ['dmg','block','push','pull','draw','energy','status','stun','buff','exhaustHand','discard','exhaust','retrieve','mark','delay','stripBlock'];
  var OPS_RUN = ['battle','recruit','ending','offer'];
  var RUN_ONLY_IN_COMMON = ['upgrade','relic','score'];   // 공통 표에 있으나 전투에서는 throw
  var COND_KEYS = ['dist','distNot','hpPct','naval','siege','assault','field','turn','turnLte','hasWall','tide','wave',
    'cardTag','cardType','cardPool','cardId','cardMarked','enemyId','enemyTag','handCount','cardsPlayedThisTurn','deckTagCount',
    'hasCard','hasRelic','hasDeputy','noDeputy','flag','leader','lane','act','actGte','ration','suspicion','slotsFree','oncePerBattle','oncePerTurn'];
  var STATUS_IDS = ['shaken','exposed','hunger','momentum','ambush','ironwall','stun','flinch','loaded'];
  var BUFF_IDS = ['nextAtk','atkAdd','shotAdd','atkPct','shotPct','evadeFirst','hide','noAtk','noMelee','noPushBattle','wallPersist','chargeAtClose','noAdvance','passivesOff','minHp1'];
  var WHO = ['self','target','all','spawned','actor','enemy'];
  var ENEMY_IDS = ['ashigaru_spear','ashigaru_gun','wa_archer','mounted_samurai','samurai','wa_captain','siege_laborer','bamboo_bundle','nobushi',
    'sekibune','kobaya','atakebune','enemy_flagship','wajo_garrison','rebel_monghak','wa_scout',
    'konishi','wakizaka','hosokawa','ukita_w1','ukita_w2','ukita_w3','kuroda','todo','kurushima','shimazu_p1','shimazu_p2'];
  // 계약 §3.2 카드 ID 99 (CARDS 가 로드되어 있으면 CARDS.byId 를 우선 쓰고 이 목록과도 대조한다)
  var CARD_IDS = ('bowstring spear_wall retreat_horn war_drum report hwando throw_stone pyeonjeon seungja hide shield_wall iron_wall pike_square volley scout regroup ' +
    'cavalry_charge arrow_rain archer_ambush samsu whip resolve ash_bag cannon_volley jincheonroe discipline pajin cheonja crane_wing turtle_ship retreat_fire ' +
    'panok_turn daejanggun lure fire_arrow rowers twelve_ships flagship rolling_fire manifesto militia red_robe uiryeong_rising jeongam_ambush geumsan_drum ' +
    'monk_soldiers mountain_raid people_stones monk_rally bamboo_spear ambush_fire scorched_earth counter_spy parley nanjung_diary scarecrow scout_boat memorial ' +
    'beacon castle_well desperate_call baesujin mountain_fort hwacha hyeonja repair_parapet ongseong counter_mound gate_sally boiling_water pyongyang_bombard ' +
    'nambyeong_cannon li_cavalry folangji langseon request_troops chen_lin_bombard deng_zilong ming_navy_square pilsa_jeuksaeng not_one_ship sinsang_pilbeol ' +
    'danghangpo_lure hwacha_volley sema die_standing level_ground jeolla_right wall_rally bukgwan_cavalry seven_hundred ichi_bow yeonan_fort edict_advance ' +
    'edict_blame edict_arrest edict_envy jochong dokjeon').split(' ');

  function has(arr, v) { return arr.indexOf(v) >= 0; }
  function isStr(s) { return typeof s === 'string' && s.length > 0; }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  function selfTest() {
    var errors = [];
    var cardOk = function(id) {
      if (typeof CARDS !== 'undefined' && CARDS && CARDS.byId) return Object.prototype.hasOwnProperty.call(CARDS.byId, id) && has(CARD_IDS, id);
      return has(CARD_IDS, id);
    };
    var enemyOk = function(id) {
      if (typeof ENEMIES !== 'undefined' && ENEMIES && ENEMIES.byId) return Object.prototype.hasOwnProperty.call(ENEMIES.byId, id);
      return has(ENEMY_IDS, id);
    };
    function err(where, msg) { errors.push(where + ': ' + msg); }
    function checkCond(where, c) {
      if (c === null || c === undefined) return;
      if (typeof c !== 'object' || Array.isArray(c)) { err(where, 'cond 가 객체가 아님'); return; }
      Object.keys(c).forEach(function(k){
        if (!has(COND_KEYS, k)) err(where, '모르는 cond 키 ' + k);
        if (k === 'enemyId') [].concat(c[k]).forEach(function(e){ if (!enemyOk(e)) err(where, '없는 적 id ' + e); });
        if (k === 'hasCard' || k === 'cardId') [].concat(c[k]).forEach(function(e){ if (!cardOk(e)) err(where, '없는 카드 id ' + e); });
      });
    }
    function checkOps(where, ops, ctxKind) {   // ctxKind: 'battle' | 'run'
      if (!Array.isArray(ops)) { err(where, 'ops 가 배열이 아님'); return; }
      ops.forEach(function(o, i){
        var w = where + '.ops[' + i + ']';
        if (!o || typeof o !== 'object' || !isStr(o.op)) { err(w, 'op 객체 아님'); return; }
        var known = has(OPS_COMMON, o.op) || has(OPS_BATTLE, o.op) || has(OPS_RUN, o.op);
        if (!known) err(w, '모르는 op ' + o.op);
        if (ctxKind === 'battle' && (has(OPS_RUN, o.op) || has(RUN_ONLY_IN_COMMON, o.op))) err(w, '전투 맥락에 판 전용 op ' + o.op);
        if (ctxKind === 'run' && has(OPS_BATTLE, o.op)) err(w, '판 맥락에 전투 전용 op ' + o.op);
        if (o.choose === true) err(w, '훅 ops 안의 choose:true 는 금지');
        if (o.op === 'status' && !has(STATUS_IDS, o.id)) err(w, '모르는 status id ' + o.id);
        if (o.op === 'status' && o.who !== undefined && !has(WHO, o.who)) err(w, '모르는 who ' + o.who);
        if (o.op === 'buff' && !has(BUFF_IDS, o.id)) err(w, '모르는 buff id ' + o.id);
        if (o.op === 'addCard' && o.id !== undefined && !cardOk(o.id)) err(w, '없는 카드 id ' + o.id);
        if (o.op === 'dmg' && !isStr(o.tag)) err(w, 'dmg 에 tag 없음');
        if (o.op === 'cond') { checkCond(w + '.if', o.if); checkOps(w + '.then', o.then, ctxKind); if (o.else) checkOps(w + '.else', o.else, ctxKind); }
        if (o.op === 'delay' || o.op === 'exhaustHand') checkOps(w + '.inner', o.ops || o.perCard, ctxKind);
      });
    }
    function checkHandlers(where, hs) {
      if (!Array.isArray(hs)) { err(where, 'handlers 가 배열이 아님'); return; }
      hs.forEach(function(h, i){
        var w = where + '.handlers[' + i + ']';
        if (!has(HOOKS, h.hook)) err(w, '모르는 훅 ' + h.hook);
        if (h.src !== undefined) err(w, 'src 는 Combat 이 붙인다');
        checkCond(w + '.cond', h.cond);
        checkOps(w, h.ops, 'battle');
      });
    }
    function checkMods(where, ms) {
      if (!Array.isArray(ms)) { err(where, 'mods 가 배열이 아님'); return; }
      ms.forEach(function(m, i){
        var w = where + '.mods[' + i + ']';
        if (!has(MODS, m.mod)) err(w, '모르는 mod ' + m.mod);
        if (!isNum(m.n)) err(w, 'n 이 숫자가 아님');
        if (m.once !== undefined && m.once !== 'battle' && m.once !== 'turn') err(w, 'once 값 이상 ' + m.once);
        checkCond(w + '.if', m.if);
      });
    }
    function checkIds(where, list, n) {
      if (list.length !== n) err(where, '개수 ' + list.length + ' (기대 ' + n + ')');
      var seen = {};
      list.forEach(function(o){
        if (!isStr(o.id) || !/^[a-z][a-z0-9_]*$/.test(o.id)) err(where, '잘못된 id ' + o.id);
        if (seen[o.id]) err(where, '중복 id ' + o.id); seen[o.id] = true;
        ['name','desc','memo'].forEach(function(k){ if (!isStr(o[k])) err(where + '.' + o.id, k + ' 비어 있음'); });
      });
    }
    // 주장
    checkIds('leaders', LEADERS, 2);
    LEADERS.forEach(function(L){
      var w = 'leaders.' + L.id;
      if (L.id !== 'yi' && L.id !== 'gwon') err(w, '주장 id 는 yi|gwon');
      if (!isNum(L.hp) || L.hp <= 0) err(w, 'hp 이상');
      if (!isNum(L.suspStart)) err(w, 'suspStart 이상');
      if (typeof L.famed !== 'boolean') err(w, 'famed 는 bool');
      if (!isStr(L.hanja) || !isStr(L.passiveDesc) || !isStr(L.deckColor)) err(w, 'hanja/passiveDesc/deckColor 비어 있음');
      if (!Array.isArray(L.cards) || L.cards.length !== 4) err(w, '고유 카드는 4장');
      else L.cards.forEach(function(c){ if (!cardOk(c)) err(w, '없는 카드 id ' + c); });
      checkHandlers(w + '.passive', L.passive.handlers); checkMods(w + '.passive', L.passive.mods);
    });
    // 부장
    checkIds('deputies', DEPUTIES, 8);
    var DEP_IDS = ['gwon','yi','yi_eokgi','kim_simin','jeong_munbu','jo_heon','hwang_jin','yi_jeongam'];
    DEP_IDS.forEach(function(id){ if (!deputies.byId[id]) err('deputies', '부장 ' + id + ' 없음'); });
    DEPUTIES.forEach(function(D){
      var w = 'deputies.' + D.id;
      if (!isStr(D.hanja) || !isStr(D.passiveDesc) || !isStr(D.recruit)) err(w, 'hanja/passiveDesc/recruit 비어 있음');
      if (typeof D.famed !== 'boolean') err(w, 'famed 는 bool');
      if (!cardOk(D.card)) err(w, '없는 고유 카드 ' + D.card);
      else if (typeof CARDS !== 'undefined' && CARDS && CARDS.byId && CARDS.byId[D.card] && CARDS.byId[D.card].owner !== undefined && CARDS.byId[D.card].owner !== null
               && CARDS.byId[D.card].owner !== D.id) err(w, '고유 카드 owner 불일치 ' + CARDS.byId[D.card].owner);
      checkHandlers(w + '.passive', D.passive.handlers); checkMods(w + '.passive', D.passive.mods);
    });
    // 기물
    var RELIC_IDS = ['turtle_blueprint','jincheonroe_relic','hwacha_relic','nanjung_relic','jingbirok','tonga','hangwae_gun','obangnang','seoae_brush',
      'chains','joryeong_stone','hansan_drum','jinju_drum','haengju_ash','jiksan_spear','myeongnyang_chain','tongjeyeong_flag'];
    checkIds('relics', relics.list, 17);
    RELIC_IDS.forEach(function(id){ if (!relics.byId[id]) err('relics', '기물 ' + id + ' 없음'); });
    relics.list.forEach(function(R){
      var w = 'relics.' + R.id;
      if (!has(['elite','boss','shop','event'], R.src)) err(w, 'src 이상 ' + R.src);
      checkHandlers(w, R.handlers); checkMods(w, R.mods);
      if (R.upHandlers !== null) checkHandlers(w + '.up', R.upHandlers);
      if (R.onAcquire !== null) checkOps(w + '.onAcquire', R.onAcquire, 'run');
      if (R.runMods !== null) {
        Object.keys(R.runMods).forEach(function(k){ if (!has(['shopDiscount','eventRationBonus','actStartOps'], k)) err(w, '모르는 runMods 키 ' + k); });
        if (R.runMods.actStartOps) checkOps(w + '.runMods.actStartOps', R.runMods.actStartOps, 'run');
      }
      var active = R.handlers.length + R.mods.length + (R.onAcquire ? 1 : 0) + (R.runMods ? 1 : 0);
      if (active === 0) err(w, '효과가 하나도 없음');
    });
    if (relics.byId.hansan_drum && (!relics.byId.hansan_drum.upHandlers || relics.byId.hansan_drum.upHandlers[0].ops[0].n !== 2)) err('relics.hansan_drum', '강화판 push 2 아님');
    if (relics.byId.jinju_drum && (!relics.byId.jinju_drum.upHandlers || relics.byId.jinju_drum.upHandlers[0].ops[0].n !== 2)) err('relics.jinju_drum', '강화판 동요 2 아님');
    // get() 예외·JSON 왕복
    try { relics.get('no_such_relic'); err('relics.get', '없는 id 에 throw 하지 않음'); } catch (e) { /* 기대 */ }
    function walk(where, v) {   // undefined·함수 값 금지(계약 §0.3)
      if (v === undefined || typeof v === 'function') { err(where, 'undefined 또는 함수 값'); return; }
      if (v && typeof v === 'object') Object.keys(v).forEach(function(k){ walk(where + '.' + k, v[k]); });
    }
    [['leaders', leaders.list], ['deputies', deputies.list], ['relics', relics.list]].forEach(function(p){
      walk(p[0], p[1]);
      var s = JSON.stringify(p[1]);
      if (JSON.stringify(JSON.parse(s)) !== s) err(p[0], 'JSON 왕복 불일치');
    });
    return { ok: errors.length === 0, errors: errors };
  }

  return { leaders:leaders, deputies:deputies, relics:relics, selfTest:selfTest };
})();
