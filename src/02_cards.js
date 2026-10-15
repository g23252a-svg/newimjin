/* ===== 02_cards.js — 카드 99장 데이터 (효과는 DSL ops 배열만, 코드 없음) ===== */
var CARDS = (function(){ 'use strict';
// 계약서 §3.2 스키마·ID 목록·「카드 표현 지침(동결)」을 그대로 따른다. 수치의 정본은 DESIGN §6.1.
// 규칙 수치(숨어라 비율·진격하라·독전)는 Core.BAL에서 읽는다. 카드 고유 수치(피해 6, 진형 8)는 여기에 둔다.
// plus 는 강화판에서 바뀌는 필드만. 강화판이 없는 카드(명 수군 토큰 3·어명 4·독전)는 plus:{} (빈 객체 = 바뀌는 것 없음).
// desc 는 규칙 문구만. 거리 배율·지역 보정·군량·소모/보존 문구는 TXT.cardDesc 가 덧붙인다.
// TODO(통합): Run — upgrade 후보(choose·무작위)에서 Object.keys(card.plus).length===0 인 카드(토큰·어명·독전)는 제외해 달라.
// TODO(통합): Combat — 칠백의사(seven_hundred)의 perCard 안 dmg 는 대상이 필요하다. needsTarget 이 perCard 안도 보거나, target 이 없으면 첫 생존 적으로.
// TODO(통합): Combat — 조총(jochong)은 cond.then 안에 dmg 가 있어 장전 턴에도 needsTarget 이 true 가 된다. 허용(대상 고르게)하면 된다.
// TODO(통합): Combat — 어명 4장은 DESIGN §4.6대로 전부 retain:true. 문책·압송·시기는 내면 exhaust(둘 다 참이면 exhaust 우선).
// TODO(통합): TXT — cardDesc(card, up) 는 up 이고 plus.desc 가 있으면 plus.desc 를 쓴다.
// TODO(통합): Run — 통제영의 깃발·열두 척의 'navy' 태그는 pool 'navy' 카드에만 있다(전라우수영은 deputy 풀이라 없음). 의도된 것.

var BAL = Core.BAL;
var list = [], byId = {};
function add(o){ if (o.plus === undefined) o.plus = {}; list.push(o); byId[o.id] = o; return o; }

/* ---------- 기(시작) 1~7 ---------- */
add({id:'bowstring', name:'활시위', hanja:'角弓', pool:'base', type:'atk', cost:1, rarity:'common', tags:['shot'],
  ops:[{op:'dmg', n:6, tag:'shot'}], plus:{ops:[{op:'dmg', n:9, tag:'shot'}], desc:'9 피해.'}, desc:'6 피해.', memo:'각궁. 조총보다 멀리 간다.'});
add({id:'spear_wall', name:'창을 세워라', hanja:'長槍', pool:'base', type:'def', cost:1, rarity:'common', tags:[],
  ops:[{op:'block', n:6}, {op:'cond', if:{dist:2}, then:[{op:'push', n:1}]}],
  plus:{ops:[{op:'block', n:9}, {op:'cond', if:{dist:2}, then:[{op:'push', n:1}]}], desc:'진형 9. 적이 근접이면 중거리로 밀어낸다.'},
  desc:'진형 6. 적이 근접이면 중거리로 밀어낸다.', memo:'장창 방진.'});
add({id:'retreat_horn', name:'퇴각 나팔', pool:'base', type:'tac', cost:1, rarity:'common', tags:[],
  ops:[{op:'push', n:1}, {op:'draw', n:1}], plus:{cost:0}, desc:'밀어내기 1. 1장 뽑는다.', memo:'퇴각 신호.'});
add({id:'war_drum', name:'북을 울려라', hanja:'軍鼓', pool:'base', type:'tac', cost:0, rarity:'common', tags:[],
  ops:[{op:'buff', id:'nextAtk', n:3, turns:1}], plus:{ops:[{op:'buff', id:'nextAtk', n:5, turns:1}], desc:'이번 턴 다음 공격 +5.'},
  desc:'이번 턴 다음 공격 +3.', memo:'진군을 알리는 북.'});
add({id:'report', name:'장계', hanja:'狀啓', pool:'base', type:'rep', cost:1, rarity:'common', tags:[], exhaust:true,
  ops:[{op:'suspicion', n:-1}], plus:{ops:[{op:'suspicion', n:-2}], desc:'의심 −2.'}, desc:'의심 −1.', memo:'이순신의 장계.'});
add({id:'hwando', name:'환도', hanja:'環刀', pool:'base', type:'atk', cost:1, rarity:'common', tags:['melee'],
  ops:[{op:'dmg', n:7, tag:'melee'}], plus:{ops:[{op:'dmg', n:10, tag:'melee'}], desc:'10 피해.'}, desc:'7 피해.', memo:'조선군이 허리에 차는 칼.'});
add({id:'throw_stone', name:'돌을 던져라', pool:'base', type:'atk', cost:0, rarity:'common', tags:['none'],
  ops:[{op:'dmg', n:4, tag:'none'}], plus:{ops:[{op:'dmg', n:6, tag:'none'}], desc:'6 피해.'}, desc:'4 피해.', memo:'백성의 돌.'});

/* ---------- 공(공용) 8~27 ---------- */
add({id:'pyeonjeon', name:'편전', hanja:'片箭', pool:'common', type:'atk', cost:1, rarity:'common', tags:['shot', 'pierce'],
  ops:[{op:'dmg', n:8, tag:'shot', pierce:true}], plus:{ops:[{op:'dmg', n:11, tag:'shot', pierce:true}], desc:'11 피해. 관통.'},
  desc:'8 피해. 관통.', memo:'통아에 꽂아 쏘는 짧은 화살.'});
add({id:'seungja', name:'승자총통', hanja:'勝字銃筒', pool:'common', type:'atk', cost:1, rarity:'common', tags:['shot'],
  ops:[{op:'dmg', n:5, tag:'shot', times:2}], plus:{ops:[{op:'dmg', n:6, tag:'shot', times:2}], desc:'6 피해 ×2.'},
  desc:'5 피해 ×2.', memo:'1570년대의 휴대 총통.'});
add({id:'hide', name:'숨어라', hanja:'城垛', pool:'common', type:'def', cost:0, rarity:'common', tags:[],
  ops:[{op:'buff', id:'hide', n:BAL.HIDE_PCT, turns:1}, {op:'buff', id:'noAtk', turns:1}],
  plus:{ops:[{op:'buff', id:'hide', n:BAL.HIDE_PLUS_PCT, turns:1}, {op:'buff', id:'noAtk', turns:1}, {op:'draw', n:1}],
    desc:'이번 턴 받는 조총·활 피해 −' + Math.round(BAL.HIDE_PLUS_PCT * 100) + '%, 공격 카드를 낼 수 없다. 1장 뽑는다.'},
  desc:'이번 턴 받는 조총·활 피해 −' + Math.round(BAL.HIDE_PCT * 100) + '%, 공격 카드를 낼 수 없다.', memo:'성가퀴 뒤에 몸을 숨긴다.'});
add({id:'shield_wall', name:'방패벽', hanja:'彭排', pool:'common', type:'def', cost:1, rarity:'common', tags:[],
  ops:[{op:'block', n:8}], plus:{ops:[{op:'block', n:11}], desc:'진형 11.'}, desc:'진형 8.', memo:'큰 방패를 든 군사들.'});
add({id:'iron_wall', name:'철벽', hanja:'鐵壁', pool:'common', type:'def', cost:2, rarity:'rare', tags:[],
  ops:[{op:'block', n:10}, {op:'status', who:'self', id:'ironwall', n:1}],
  plus:{ops:[{op:'block', n:14}, {op:'status', who:'self', id:'ironwall', n:1}], desc:'진형 14. 철벽 1.'},
  desc:'진형 10. 철벽 1.', memo:'진형이 턴 끝에 남는다.'});
add({id:'pike_square', name:'장창 방진', hanja:'長槍方陣', pool:'common', type:'def', cost:2, rarity:'rare', tags:[],
  ops:[{op:'block', n:10}, {op:'push', n:1}], plus:{ops:[{op:'block', n:13}, {op:'push', n:1}], desc:'진형 13. 밀어내기 1.'},
  desc:'진형 10. 밀어내기 1.', memo:'긴 창을 겹겹이 세운다.'});
add({id:'volley', name:'일제 사격', pool:'common', type:'atk', cost:2, rarity:'common', tags:['shot'],
  ops:[{op:'dmg', n:7, tag:'shot', all:true}], plus:{ops:[{op:'dmg', n:10, tag:'shot', all:true}], desc:'적 전체 10 피해.'},
  desc:'적 전체 7 피해.', memo:'각궁 일제 사격.'});
add({id:'scout', name:'척후', hanja:'斥候', pool:'common', type:'tac', cost:0, rarity:'common', tags:[], exhaust:true,
  ops:[{op:'draw', n:2}], plus:{exhaust:false}, desc:'2장 뽑는다.', memo:'먼저 나가 적을 살핀다.'});
add({id:'regroup', name:'전열 정비', pool:'common', type:'tac', cost:1, rarity:'rare', tags:[],
  ops:[{op:'retrieve', n:1, from:'discard', choose:true}],
  plus:{ops:[{op:'retrieve', n:2, from:'discard', choose:true}], desc:'버린 카드에서 2장을 골라 손으로.'},
  desc:'버린 카드에서 1장을 골라 손으로.', memo:'흩어진 전열을 다시 세운다.'});
add({id:'cavalry_charge', name:'기병 돌격', pool:'common', type:'atk', cost:2, rarity:'common', tags:['charge'],
  ops:[{op:'dmg', n:12, tag:'charge'}], plus:{ops:[{op:'dmg', n:16, tag:'charge'}], desc:'근접으로 달려들어 16 피해. 근접에서는 낼 수 없다.'},
  desc:'근접으로 달려들어 12 피해. 근접에서는 낼 수 없다.', memo:'신립의 기병.'});
add({id:'arrow_rain', name:'화살비', pool:'common', type:'atk', cost:1, rarity:'common', tags:['shot'],
  ops:[{op:'dmg', n:3, tag:'shot', times:3}], plus:{ops:[{op:'dmg', n:4, tag:'shot', times:3}], desc:'4 피해 ×3.'},
  desc:'3 피해 ×3.', memo:'각궁.'});
add({id:'archer_ambush', name:'궁수 매복', pool:'common', type:'tac', cost:1, rarity:'common', tags:[],
  ops:[{op:'status', who:'self', id:'ambush', n:8}], plus:{ops:[{op:'status', who:'self', id:'ambush', n:12}], desc:'매복 12.'},
  desc:'매복 8.', memo:'적이 근접 쪽으로 한 칸 올 때 적 전체에 피해.'});
add({id:'samsu', name:'삼수병', hanja:'三手兵', pool:'common', type:'atk', cost:2, rarity:'rare', tags:['shot'],
  ops:[{op:'dmg', n:6, tag:'shot'}, {op:'block', n:6}, {op:'draw', n:1}],
  plus:{ops:[{op:'dmg', n:8, tag:'shot'}, {op:'block', n:8}, {op:'draw', n:1}], desc:'8 피해. 진형 8. 1장 뽑는다.'},
  desc:'6 피해. 진형 6. 1장 뽑는다.', memo:'훈련도감(1593)의 포수·사수·살수.'});
add({id:'whip', name:'채찍질', pool:'common', type:'atk', cost:1, rarity:'common', tags:['melee'],
  ops:[{op:'dmg', n:5, tag:'melee'}, {op:'status', who:'target', id:'shaken', n:1}],
  plus:{ops:[{op:'dmg', n:7, tag:'melee'}, {op:'status', who:'target', id:'shaken', n:1}], desc:'7 피해. 적 동요 1.'},
  desc:'5 피해. 적 동요 1.', memo:'장수의 채찍으로 다그친다.'});
add({id:'resolve', name:'결사', hanja:'決死', pool:'common', type:'tac', cost:1, rarity:'common', tags:[], exhaust:true,
  ops:[{op:'status', who:'self', id:'momentum', n:2}], plus:{ops:[{op:'status', who:'self', id:'momentum', n:3}], desc:'기세 +3.'},
  desc:'기세 +2.', memo:'죽기를 각오한다.'});
add({id:'ash_bag', name:'재주머니', pool:'common', type:'tac', cost:0, rarity:'common', tags:[], exhaust:true,
  ops:[{op:'status', who:'all', id:'shaken', n:1}], plus:{ops:[{op:'status', who:'all', id:'shaken', n:2}], desc:'적 전체 동요 2.'},
  desc:'적 전체 동요 1.', memo:'행주의 재.'});
add({id:'cannon_volley', name:'총통 일제 사격', pool:'common', type:'atk', cost:3, rarity:'rare', tags:['shot'],
  ops:[{op:'dmg', n:14, tag:'shot', all:true}], plus:{ops:[{op:'dmg', n:18, tag:'shot', all:true}], desc:'적 전체 18 피해.'},
  desc:'적 전체 14 피해.', memo:'천·지·현·황자총통.'});
add({id:'jincheonroe', name:'비격진천뢰', hanja:'飛擊震天雷', pool:'common', type:'atk', cost:2, rarity:'rare', tags:['fire'], exhaust:true,
  ops:[{op:'delay', turns:1, ops:[{op:'dmg', n:16, tag:'fire', all:true}]}],
  plus:{ops:[{op:'delay', turns:1, ops:[{op:'dmg', n:22, tag:'fire', all:true}]}], desc:'다음 턴 시작에 적 전체 22 피해.'},
  desc:'다음 턴 시작에 적 전체 16 피해.', memo:'이장손. 완구로 쏘아 떨어진 뒤 터진다.'});
add({id:'discipline', name:'군율', hanja:'軍律', pool:'common', type:'tac', cost:1, rarity:'common', tags:[],
  ops:[{op:'discard', n:1, choose:true}, {op:'draw', n:2}],
  plus:{ops:[{op:'discard', n:1, choose:true}, {op:'draw', n:3}], desc:'손의 카드 1장을 버리고 3장 뽑는다.'},
  desc:'손의 카드 1장을 버리고 2장 뽑는다.', memo:'군의 규율을 바로 세운다.'});
add({id:'pajin', name:'진 깨뜨리기', hanja:'破陣', pool:'common', type:'atk', cost:2, rarity:'rare', tags:['melee'],
  ops:[{op:'stripBlock'}, {op:'dmg', n:10, tag:'melee'}],
  plus:{ops:[{op:'stripBlock'}, {op:'dmg', n:14, tag:'melee'}], desc:'적 하나의 진형을 전부 없애고 14 피해.'},
  desc:'적 하나의 진형을 전부 없애고 10 피해.', memo:'적의 진을 한가운데부터 무너뜨린다.'});

/* ---------- 수(수군) 28~39 ---------- */
add({id:'cheonja', name:'천자총통', hanja:'天字銃筒', pool:'navy', type:'atk', cost:2, rarity:'rare', tags:['shot', 'navy'],
  ops:[{op:'dmg', n:15, tag:'shot', bonusAt:{far:8}}], plus:{ops:[{op:'dmg', n:19, tag:'shot', bonusAt:{far:10}}], desc:'19 피해. 원거리면 +10.'},
  desc:'15 피해. 원거리면 +8.', memo:'판옥선의 주포.'});
add({id:'crane_wing', name:'학익진', hanja:'鶴翼陣', pool:'navy', type:'atk', cost:2, rarity:'rare', tags:['shot', 'navy'],
  ops:[{op:'dmg', n:9, all:true, tag:'shot', mulAt:{far:2}}], plus:{ops:[{op:'dmg', n:12, all:true, tag:'shot', mulAt:{far:2}}], desc:'적 전체 12 피해. 원거리면 ×2.'},
  desc:'적 전체 9 피해. 원거리면 ×2.', memo:'한산도 1592.7.8.'});
add({id:'turtle_ship', name:'거북선', pool:'navy', type:'atk', cost:3, rarity:'special', tags:['none', 'navy'],
  ops:[{op:'pull', n:2}, {op:'dmg', n:18, tag:'none'}, {op:'buff', id:'noMelee', turns:1}],
  plus:{ops:[{op:'pull', n:2}, {op:'dmg', n:24, tag:'none'}, {op:'buff', id:'noMelee', turns:1}], desc:'거리를 근접으로. 24 피해. 이번 턴 백병 피해를 받지 않는다.'},
  desc:'거리를 근접으로. 18 피해. 이번 턴 백병 피해를 받지 않는다.', memo:'나대용. 사천 1592.5.29 첫 출전.'});
add({id:'retreat_fire', name:'후퇴 사격', pool:'navy', type:'atk', cost:2, rarity:'common', tags:['shot', 'navy'],
  ops:[{op:'push', n:1}, {op:'dmg', n:6, tag:'shot'}], plus:{ops:[{op:'push', n:1}, {op:'dmg', n:9, tag:'shot'}], desc:'밀어내기 1. 9 피해.'},
  desc:'밀어내기 1. 6 피해.', memo:'물러나며 쏘아 끌어낸다.'});
add({id:'panok_turn', name:'판옥선 선회', hanja:'板屋船', pool:'navy', type:'def', cost:1, rarity:'common', tags:['navy'],
  ops:[{op:'block', n:7}, {op:'cond', if:{naval:true}, then:[{op:'push', n:1}]}],
  plus:{ops:[{op:'block', n:10}, {op:'cond', if:{naval:true}, then:[{op:'push', n:1}]}], desc:'진형 10. 해전이면 밀어내기 1.'},
  desc:'진형 7. 해전이면 밀어내기 1.', memo:'조선 수군의 주력선.'});
add({id:'daejanggun', name:'대장군전', hanja:'大將軍箭', pool:'navy', type:'atk', cost:2, rarity:'rare', tags:['shot', 'navy', 'pierce'],
  ops:[{op:'dmg', n:20, tag:'shot', pierce:true}], plus:{ops:[{op:'dmg', n:26, tag:'shot', pierce:true}], desc:'26 피해. 관통.'},
  desc:'20 피해. 관통.', memo:'천자총통으로 쏘는 대장군전.'});
add({id:'lure', name:'유인', hanja:'誘引', pool:'navy', type:'tac', cost:1, rarity:'common', tags:['navy'],
  ops:[{op:'push', n:1}, {op:'buff', id:'nextAtk', n:4, turns:1, nextTurn:true}],
  plus:{ops:[{op:'push', n:1}, {op:'buff', id:'nextAtk', n:7, turns:1, nextTurn:true}], desc:'밀어내기 1. 다음 턴 첫 공격 +7.'},
  desc:'밀어내기 1. 다음 턴 첫 공격 +4.', memo:'적을 넓은 바다로 끌어낸다.'});
add({id:'fire_arrow', name:'불화살', hanja:'火箭', pool:'navy', type:'atk', cost:1, rarity:'common', tags:['shot', 'navy'],
  ops:[{op:'dmg', n:6, tag:'shot'}, {op:'status', who:'target', id:'shaken', n:1}],
  plus:{ops:[{op:'dmg', n:9, tag:'shot'}, {op:'status', who:'target', id:'shaken', n:1}], desc:'9 피해. 적 동요 1.'},
  desc:'6 피해. 적 동요 1.', memo:'불을 붙여 쏘는 화살.'});
add({id:'rowers', name:'노꾼', hanja:'格軍', pool:'navy', type:'tac', cost:0, rarity:'rare', tags:['navy'], exhaust:true,
  ops:[{op:'energy', n:1}, {op:'hp', n:-2}], plus:{ops:[{op:'energy', n:1}, {op:'hp', n:-1}], desc:'군령 +1. 병력 −1.'},
  desc:'군령 +1. 병력 −2.', memo:'판옥선의 노를 젓는 사람들.'});
add({id:'twelve_ships', name:'열두 척', pool:'navy', type:'tac', cost:1, rarity:'special', tags:['navy'],
  ops:[{op:'cond', if:{deckTagCount:{tag:'navy', lte:12}}, then:[{op:'status', who:'self', id:'momentum', n:4}], else:[{op:'status', who:'self', id:'momentum', n:1}]}],
  plus:{ops:[{op:'cond', if:{deckTagCount:{tag:'navy', lte:12}}, then:[{op:'status', who:'self', id:'momentum', n:6}], else:[{op:'status', who:'self', id:'momentum', n:2}]}],
    desc:'덱의 수군 카드가 12장 이하면 기세 +6, 아니면 +2.'},
  desc:'덱의 수군 카드가 12장 이하면 기세 +4, 아니면 +1.', memo:'“신에게는 아직 열두 척의 배가 있사옵니다.” 칠천량 뒤 배설이 남긴 12척.'});
add({id:'flagship', name:'장군선', pool:'navy', type:'def', cost:2, rarity:'rare', tags:['navy'],
  ops:[{op:'block', n:12}, {op:'draw', n:1}], plus:{ops:[{op:'block', n:15}, {op:'draw', n:1}], desc:'진형 15. 1장 뽑는다.'},
  desc:'진형 12. 1장 뽑는다.', memo:'장수가 탄 판옥선.'});
add({id:'rolling_fire', name:'포격 교대', pool:'navy', type:'atk', cost:1, rarity:'common', tags:['shot', 'navy'],
  ops:[{op:'dmg', n:5, tag:'shot', perHandCard:{id:'bowstring', n:2}}],
  plus:{ops:[{op:'dmg', n:7, tag:'shot', perHandCard:{id:'bowstring', n:2}}], desc:'7 피해. 손의 ‘활시위’ 1장당 +2.'},
  desc:'5 피해. 손의 ‘활시위’ 1장당 +2.', memo:'번갈아 쏘아 포격을 끊지 않는다.'});

/* ---------- 의(의병) 40~51 (41 의병은 토큰) ---------- */
add({id:'manifesto', name:'격문', hanja:'檄文', pool:'uibyeong', type:'tac', cost:1, rarity:'common', tags:['uibyeong'],
  ops:[{op:'addCard', id:'militia', n:2, where:'hand', generated:true}],
  plus:{ops:[{op:'addCard', id:'militia', n:3, where:'hand', generated:true}], desc:'손에 ‘의병’ 3장.'},
  desc:'손에 ‘의병’ 2장.', memo:'의병을 모으는 격문.'});
add({id:'militia', name:'의병', hanja:'義兵', pool:'token', type:'atk', cost:0, rarity:null, tags:['none', 'uibyeong'], exhaust:true,
  ops:[{op:'dmg', n:4, tag:'none'}], plus:{ops:[{op:'dmg', n:6, tag:'none'}], desc:'6 피해.'}, desc:'4 피해.', memo:'격문에 모인 백성.'});
add({id:'red_robe', name:'홍의장군', hanja:'紅衣', pool:'uibyeong', type:'tac', cost:0, rarity:'rare', tags:['uibyeong'], home:'경상', exhaust:true,
  ops:[{op:'buff', id:'evadeFirst', turns:1}], plus:{ops:[{op:'buff', id:'evadeFirst', turns:1}, {op:'draw', n:1}], desc:'이번 턴 적의 첫 공격을 피한다. 1장 뽑는다.'},
  desc:'이번 턴 적의 첫 공격을 피한다.', memo:'붉은 옷을 입고 싸운 의병장 곽재우.'});
add({id:'uiryeong_rising', name:'의령의 봉기', hanja:'倡義', pool:'uibyeong', type:'atk', cost:0, rarity:'rare', tags:['none', 'uibyeong'], home:'경상',
  ops:[{op:'dmg', n:0, tag:'none', perCardsPlayed:2}], plus:{ops:[{op:'dmg', n:0, tag:'none', perCardsPlayed:3}], desc:'이번 턴 낸 카드 수 ×3 피해.'},
  desc:'이번 턴 낸 카드 수 ×2 피해.', memo:'곽재우가 의령에서 의병을 일으켰다. 1592.4.22.'});
add({id:'jeongam_ambush', name:'정암진 매복', pool:'uibyeong', type:'tac', cost:1, rarity:'common', tags:['uibyeong'], home:'경상',
  ops:[{op:'status', who:'self', id:'ambush', n:10}], plus:{ops:[{op:'status', who:'self', id:'ambush', n:15}], desc:'매복 15.'},
  desc:'매복 10.', memo:'정암진 나루에서 적을 기다린다.'});
add({id:'geumsan_drum', name:'금산의 북', pool:'uibyeong', type:'tac', cost:1, rarity:'common', tags:['uibyeong'], home:'전라',
  ops:[{op:'block', n:5}, {op:'buff', id:'atkAdd', n:2, turns:1}],
  plus:{ops:[{op:'block', n:7}, {op:'buff', id:'atkAdd', n:3, turns:1}], desc:'진형 7. 이번 턴 공격 +3.'},
  desc:'진형 5. 이번 턴 공격 +2.', memo:'고경명. 금산 1차 1592.7.10.'});
add({id:'monk_soldiers', name:'승병', hanja:'僧兵', pool:'uibyeong', type:'def', cost:1, rarity:'common', tags:['uibyeong'],
  ops:[{op:'block', n:5}, {op:'draw', n:1}], plus:{ops:[{op:'block', n:8}, {op:'draw', n:1}], desc:'진형 8. 1장 뽑는다.'},
  desc:'진형 5. 1장 뽑는다.', memo:'휴정·유정의 승병.'});
add({id:'mountain_raid', name:'산길 기습', pool:'uibyeong', type:'atk', cost:1, rarity:'common', tags:['none', 'uibyeong'], home:'충청',
  ops:[{op:'dmg', n:5, tag:'none', bonusAt:{far:5}}], plus:{ops:[{op:'dmg', n:7, tag:'none', bonusAt:{far:7}}], desc:'7 피해. 원거리면 +7.'},
  desc:'5 피해. 원거리면 +5.', memo:'산길에서 덮친다.'});
add({id:'people_stones', name:'백성의 돌', pool:'uibyeong', type:'atk', cost:0, rarity:'common', tags:['none', 'uibyeong'],
  ops:[{op:'dmg', n:2, tag:'none', all:true}], plus:{ops:[{op:'dmg', n:4, tag:'none', all:true}], desc:'적 전체 4 피해.'},
  desc:'적 전체 2 피해.', memo:'성 위에서 던지는 돌.'});
add({id:'monk_rally', name:'승병 결집', pool:'uibyeong', type:'tac', cost:2, rarity:'rare', tags:['uibyeong'], exhaust:true,
  ops:[{op:'hp', n:6}, {op:'block', n:6}], plus:{ops:[{op:'hp', n:9}, {op:'block', n:9}], desc:'병력 +9. 진형 9.'},
  desc:'병력 +6. 진형 6.', memo:'절에서 내려온 승려들이 모였다.'});
add({id:'bamboo_spear', name:'죽창', hanja:'竹槍', pool:'uibyeong', type:'atk', cost:1, rarity:'common', tags:['melee', 'uibyeong'], home:'전라',
  ops:[{op:'dmg', n:6, tag:'melee', bonusAt:{close:4}}], plus:{ops:[{op:'dmg', n:8, tag:'melee', bonusAt:{close:6}}], desc:'8 피해. 근접이면 +6.'},
  desc:'6 피해. 근접이면 +4.', memo:'대나무를 깎아 만든 창.'});
add({id:'ambush_fire', name:'매복 사격', pool:'uibyeong', type:'atk', cost:1, rarity:'common', tags:['shot', 'uibyeong'], home:'충청',
  ops:[{op:'dmg', n:5, tag:'shot', bonusAt:{far:4}}], plus:{ops:[{op:'dmg', n:7, tag:'shot', bonusAt:{far:5}}], desc:'7 피해. 원거리면 +5.'},
  desc:'5 피해. 원거리면 +4.', memo:'숲에서 쏜다.'});

/* ---------- 책(책략) 52~62 ---------- */
add({id:'scorched_earth', name:'들판 비우기', hanja:'淸野', pool:'tactic', type:'tac', cost:2, rarity:'rare', tags:[],
  ops:[{op:'status', who:'all', id:'hunger', n:3}, {op:'ration', n:-5}],
  plus:{ops:[{op:'status', who:'all', id:'hunger', n:4}, {op:'ration', n:-5}], desc:'적 전체 굶주림 4. 군량 −5.'},
  desc:'적 전체 굶주림 3. 군량 −5.', memo:'들을 비워 적의 보급을 끊는다.'});
add({id:'counter_spy', name:'이간질', hanja:'反間', pool:'tactic', type:'tac', cost:1, rarity:'common', tags:[],
  ops:[{op:'status', who:'target', id:'shaken', n:2}], plus:{ops:[{op:'status', who:'target', id:'shaken', n:3}], desc:'적 하나 동요 3.'},
  desc:'적 하나 동요 2.', memo:'적의 첩자를 거꾸로 이용한다. 요시라 1597.1.'});
add({id:'parley', name:'회담', hanja:'會談', pool:'tactic', type:'tac', cost:2, rarity:'rare', tags:[],
  ops:[{op:'stun', n:2}], plus:{cost:1}, desc:'적 하나 정지 2. 장수에게는 듣지 않는다.', memo:'서생포 회담(사명당·가토) 1594.4.'});
add({id:'nanjung_diary', name:'난중일기', hanja:'亂中日記', pool:'tactic', type:'rep', cost:1, rarity:'rare', tags:[], exhaust:true,
  ops:[{op:'suspicion', n:-1}, {op:'draw', n:1}], plus:{exhaust:false}, desc:'의심 −1. 1장 뽑는다.', memo:'이순신의 일기.'});
add({id:'scarecrow', name:'허수아비와 풍악', pool:'tactic', type:'tac', cost:1, rarity:'rare', tags:[],
  ops:[{op:'status', who:'all', id:'shaken', n:1}, {op:'buff', id:'noAdvance', turns:1}], plus:{cost:0},
  desc:'적 전체 동요 1. 이번 적 턴 전진 없음.', memo:'진주 1차(1592.10) 김시민의 계책.'});
add({id:'scout_boat', name:'척후선', hanja:'斥候船', pool:'tactic', type:'tac', cost:0, rarity:'common', tags:[],
  ops:[{op:'draw', n:1}, {op:'draw', n:1, nextTurn:true}],
  plus:{ops:[{op:'draw', n:2}, {op:'draw', n:1, nextTurn:true}], desc:'2장 뽑는다. 다음 턴 1장 더 뽑는다.'},
  desc:'1장 뽑는다. 다음 턴 1장 더 뽑는다.', memo:'먼저 나가 살피는 작은 배.'});
add({id:'memorial', name:'장계 상소', hanja:'上疏', pool:'tactic', type:'rep', cost:2, rarity:'rare', tags:[], exhaust:true,
  ops:[{op:'suspicion', n:-2}], plus:{ops:[{op:'suspicion', n:-3}], desc:'의심 −3.'}, desc:'의심 −2.', memo:'전하께 올리는 글.'});
add({id:'beacon', name:'봉화', hanja:'烽燧', pool:'tactic', type:'tac', cost:0, rarity:'common', tags:[],
  ops:[{op:'draw', n:1, nextTurn:true}], plus:{ops:[{op:'draw', n:2, nextTurn:true}], desc:'다음 턴 2장 더 뽑는다.'},
  desc:'다음 턴 1장 더 뽑는다.', memo:'산 위 봉화대에 올린 불.'});
add({id:'castle_well', name:'성 안의 우물', pool:'tactic', type:'tac', cost:1, rarity:'common', tags:[], exhaust:true,
  ops:[{op:'hp', n:5}], plus:{ops:[{op:'hp', n:8}], desc:'병력 +8.'}, desc:'병력 +5.', memo:'성 안의 우물.'});
add({id:'desperate_call', name:'결사의 격문', pool:'tactic', type:'tac', cost:2, rarity:'rare', tags:[],
  ops:[{op:'status', who:'self', id:'momentum', n:3}, {op:'suspicion', n:1}],
  plus:{ops:[{op:'status', who:'self', id:'momentum', n:5}, {op:'suspicion', n:1}], desc:'기세 +5. 의심 +1.'},
  desc:'기세 +3. 의심 +1.', memo:'조정의 허락 없이 띄운 격문.'});
add({id:'baesujin', name:'배수진', hanja:'背水陣', pool:'tactic', type:'tac', cost:1, rarity:'rare', tags:[],
  ops:[{op:'buff', id:'noPushBattle'}, {op:'status', who:'self', id:'momentum', n:3}],
  plus:{ops:[{op:'buff', id:'noPushBattle'}, {op:'status', who:'self', id:'momentum', n:5}], desc:'이번 전투 밀어내기 무효. 기세 +5.'},
  desc:'이번 전투 밀어내기 무효. 기세 +3.', memo:'탄금대 1592.4.28.'});

/* ---------- 성(수성) 63~70 ---------- */
add({id:'mountain_fort', name:'산성', hanja:'山城', pool:'siege', type:'def', cost:2, rarity:'rare', tags:['siege'],
  ops:[{op:'block', n:8, wall:true}], plus:{ops:[{op:'block', n:11, wall:true}], desc:'성벽 진형 11.'}, desc:'성벽 진형 8.', memo:'행주·독산성.'});
add({id:'hwacha', name:'화차', hanja:'火車', pool:'siege', type:'atk', cost:2, rarity:'rare', tags:['fire', 'siege'],
  ops:[{op:'dmg', n:7, tag:'fire', all:true, times:2}], plus:{ops:[{op:'dmg', n:9, tag:'fire', all:true, times:2}], desc:'적 전체 9 피해 ×2.'},
  desc:'적 전체 7 피해 ×2.', memo:'변이중의 화차. 신기전을 얹는다.'});
add({id:'hyeonja', name:'현자총통', hanja:'玄字銃筒', pool:'siege', type:'atk', cost:1, rarity:'common', tags:['shot', 'siege'],
  ops:[{op:'dmg', n:7, tag:'shot', bonusIf:{siege:5}}], plus:{ops:[{op:'dmg', n:10, tag:'shot', bonusIf:{siege:7}}], desc:'10 피해. 수성이면 +7.'},
  desc:'7 피해. 수성이면 +5.', memo:'진주성의 총통.'});
add({id:'repair_parapet', name:'성가퀴 수리', pool:'siege', type:'def', cost:1, rarity:'common', tags:['siege'],
  ops:[{op:'block', n:4, wall:true}], plus:{ops:[{op:'block', n:6, wall:true}], desc:'성벽 진형 +6.'}, desc:'성벽 진형 +4.', memo:'무너진 성가퀴를 밤새 쌓는다.'});
add({id:'ongseong', name:'겹겹 성벽', hanja:'甕城', pool:'siege', type:'def', cost:3, rarity:'special', tags:['siege'], exhaust:true,
  ops:[{op:'block', n:15, wall:true}], plus:{ops:[{op:'block', n:20, wall:true}], desc:'성벽 진형 20.'}, desc:'성벽 진형 15.', memo:'성문 밖을 둘러싼 겹성.'});
add({id:'counter_mound', name:'맞흙산', hanja:'逆土山', pool:'siege', type:'def', cost:1, rarity:'common', tags:['siege'],
  ops:[{op:'block', n:4}, {op:'status', who:'target', id:'flinch', n:1}],
  plus:{ops:[{op:'block', n:6}, {op:'status', who:'target', id:'flinch', n:1}], desc:'진형 6. 적 하나의 다음 공격 −50%.'},
  desc:'진형 4. 적 하나의 다음 공격 −50%.', memo:'적의 흙산에 맞서 성 안에도 흙을 쌓는다. 진주 2차 1593.6.'});
add({id:'gate_sally', name:'성문 역습', pool:'siege', type:'atk', cost:2, rarity:'common', tags:['melee', 'siege'],
  ops:[{op:'dmg', n:12, tag:'melee'}, {op:'status', who:'target', id:'shaken', n:1}, {op:'block', n:-5}],
  plus:{ops:[{op:'dmg', n:16, tag:'melee'}, {op:'status', who:'target', id:'shaken', n:1}, {op:'block', n:-5}], desc:'16 피해. 적 동요 1. 이번 턴 진형 −5.'},
  desc:'12 피해. 적 동요 1. 이번 턴 진형 −5.', memo:'성문을 열고 내닫는다.'});
add({id:'boiling_water', name:'끓는 물', pool:'siege', type:'atk', cost:1, rarity:'common', tags:['none', 'siege'],
  ops:[{op:'cond', if:{dist:2}, then:[{op:'dmg', n:12, tag:'none', all:true}], else:[{op:'dmg', n:4, tag:'none', all:true}]}],
  plus:{ops:[{op:'cond', if:{dist:2}, then:[{op:'dmg', n:16, tag:'none', all:true}], else:[{op:'dmg', n:6, tag:'none', all:true}]}], desc:'근접이면 적 전체 16 피해, 아니면 6.'},
  desc:'근접이면 적 전체 12 피해, 아니면 4.', memo:'성벽에 붙은 적에게 끼얹는다.'});

/* ---------- 명(명군) 71~76 ---------- */
add({id:'pyongyang_bombard', name:'평양성 포격', pool:'ming', type:'atk', cost:3, rarity:'rare', tags:['fire', 'ming'], ration:2,
  ops:[{op:'dmg', n:20, tag:'fire', all:true}], plus:{ops:[{op:'dmg', n:26, tag:'fire', all:true}], desc:'적 전체 26 피해.'},
  desc:'적 전체 20 피해.', memo:'이여송. 평양 탈환 1593.1.6~8.'});
add({id:'nambyeong_cannon', name:'명군 화포', pool:'ming', type:'atk', cost:2, rarity:'common', tags:['shot', 'ming'], ration:1,
  ops:[{op:'dmg', n:12, tag:'shot', bonusAt:{far:6}}], plus:{ops:[{op:'dmg', n:16, tag:'shot', bonusAt:{far:8}}], desc:'16 피해. 원거리면 +8.'},
  desc:'12 피해. 원거리면 +6.', memo:'명나라 남쪽 군사들이 다루던 화포.'});
add({id:'li_cavalry', name:'이여송 기병', pool:'ming', type:'atk', cost:2, rarity:'rare', tags:['charge', 'ming'], ration:2,
  ops:[{op:'dmg', n:14, tag:'charge', times:2}], plus:{ops:[{op:'dmg', n:17, tag:'charge', times:2}], desc:'근접으로 달려들어 17 피해 ×2. 근접에서는 낼 수 없다.'},
  desc:'근접으로 달려들어 14 피해 ×2. 근접에서는 낼 수 없다.', memo:'요동 기병.'});
add({id:'folangji', name:'불랑기', hanja:'佛狼機', pool:'ming', type:'atk', cost:1, rarity:'common', tags:['shot', 'ming', 'pierce'], ration:1,
  ops:[{op:'dmg', n:9, tag:'shot', pierce:true}], plus:{ops:[{op:'dmg', n:12, tag:'shot', pierce:true}], desc:'12 피해. 관통.'},
  desc:'9 피해. 관통.', memo:'명의 불랑기포.'});
add({id:'langseon', name:'창과 방패', hanja:'狼筅·藤牌', pool:'ming', type:'def', cost:1, rarity:'common', tags:['ming'], ration:1,
  ops:[{op:'block', n:9}, {op:'cond', if:{dist:2}, then:[{op:'push', n:1}]}],
  plus:{ops:[{op:'block', n:12}, {op:'cond', if:{dist:2}, then:[{op:'push', n:1}]}], desc:'진형 12. 적이 근접이면 중거리로 밀어낸다.'},
  desc:'진형 9. 적이 근접이면 중거리로 밀어낸다.', memo:'가지 달린 대나무 창과 등나무 방패를 든 명군 보병.'});
add({id:'request_troops', name:'원군 요청', hanja:'請兵', pool:'ming', type:'tac', cost:0, rarity:'common', tags:['ming'], exhaust:true,
  ops:[{op:'addCard', pool:'ming', n:1, where:'hand', generated:true}, {op:'ration', n:-3}],
  plus:{ops:[{op:'addCard', pool:'ming', n:1, where:'hand', generated:true}, {op:'ration', n:-1}], desc:'손에 무작위 명군 카드 1장(군량 비용 그대로). 군량 −1.'},
  desc:'손에 무작위 명군 카드 1장(군량 비용 그대로). 군량 −3.', memo:'명나라에 군사를 보내 달라고 청한다.'});

/* ---------- 토(명 수군 토큰) 77~79 — 7막 노량 2단계 전용 ---------- */
add({id:'chen_lin_bombard', name:'진린의 포격', pool:'token', type:'atk', cost:2, rarity:null, tags:['fire', 'ming'],
  ops:[{op:'dmg', n:12, tag:'fire', all:true}], desc:'적 전체 12 피해.', memo:'진린. 노량 1598.11.19.'});
add({id:'deng_zilong', name:'등자룡의 돌격', pool:'token', type:'atk', cost:2, rarity:null, tags:['charge', 'ming'],
  ops:[{op:'dmg', n:20, tag:'charge'}], desc:'근접으로 달려들어 20 피해. 근접에서는 낼 수 없다.', memo:'등자룡. 노량에서 전사.'});
add({id:'ming_navy_square', name:'명 수군 방진', pool:'token', type:'def', cost:1, rarity:null, tags:['ming'],
  ops:[{op:'block', n:12}], desc:'진형 12.', memo:'명 수군.'});

/* ---------- 주(주장 고유) 80~87 ---------- */
add({id:'pilsa_jeuksaeng', name:'필사즉생', hanja:'必死則生', pool:'leader', type:'atk', cost:2, costIf:{if:{hpPct:{lte:50}}, cost:0}, rarity:'special', tags:['none'], owner:'yi',
  ops:[{op:'dmg', n:12, tag:'none', all:true}], plus:{ops:[{op:'dmg', n:16, tag:'none', all:true}], desc:'적 전체 16 피해. 병력이 절반 이하면 비용 0.'},
  desc:'적 전체 12 피해. 병력이 절반 이하면 비용 0.', memo:'죽고자 하면 산다. 명량 전야 1597.9.15.'});
add({id:'not_one_ship', name:'한 척도 잃지 않는다', pool:'leader', type:'def', cost:1, rarity:'rare', tags:[], owner:'yi', exhaust:true,
  ops:[{op:'block', n:10}, {op:'buff', id:'minHp1', turns:1}], plus:{ops:[{op:'block', n:14}, {op:'buff', id:'minHp1', turns:1}], desc:'진형 14. 이번 턴 병력이 1 아래로 내려가지 않는다.'},
  desc:'진형 10. 이번 턴 병력이 1 아래로 내려가지 않는다.', memo:'옥포 5.7부터 한산 7.8까지, 잃은 배가 없었다.'});
add({id:'sinsang_pilbeol', name:'상과 벌', hanja:'信賞必罰', pool:'leader', type:'tac', cost:1, rarity:'rare', tags:[], owner:'yi',
  ops:[{op:'exhaust', n:1, choose:true, which:'hand'}, {op:'energy', n:1}, {op:'draw', n:1}],
  plus:{ops:[{op:'exhaust', n:1, choose:true, which:'hand'}, {op:'energy', n:1}, {op:'draw', n:2}], desc:'손의 카드 1장을 소모. 군령 +1. 2장 뽑는다.'},
  desc:'손의 카드 1장을 소모. 군령 +1. 1장 뽑는다.', memo:'상은 미덥게, 벌은 반드시.'});
add({id:'danghangpo_lure', name:'당항포의 유인', pool:'leader', type:'tac', cost:1, rarity:'rare', tags:[], owner:'yi', exhaust:true,
  ops:[{op:'push', n:2}, {op:'buff', id:'shotPct', n:0.5, turns:1, nextTurn:true}], plus:{exhaust:false},
  desc:'밀어내기 2. 다음 턴 사격 +50%.', memo:'당항포 1592.6.5.'});
add({id:'hwacha_volley', name:'화차 일제', pool:'leader', type:'atk', cost:3, rarity:'special', tags:['fire'], owner:'gwon',
  ops:[{op:'dmg', n:7, tag:'fire', all:true, times:3}], plus:{ops:[{op:'dmg', n:9, tag:'fire', all:true, times:3}], desc:'적 전체 9 피해 ×3.'},
  desc:'적 전체 7 피해 ×3.', memo:'행주 1593.2.12의 화차.'});
add({id:'sema', name:'쌀로 말 씻기', hanja:'洗馬', pool:'leader', type:'tac', cost:1, rarity:'rare', tags:[], owner:'gwon', exhaust:true,
  ops:[{op:'stun', n:1}], plus:{exhaust:false}, desc:'적 하나 정지 1. 장수에게는 듣지 않는다.', memo:'독산성에 전해 오는 이야기. 쌀로 말을 씻어 물이 넉넉한 척했다.'});
add({id:'die_standing', name:'서서 죽는다', pool:'leader', type:'tac', cost:2, rarity:'special', tags:[], owner:'gwon', exhaust:true,
  ops:[{op:'buff', id:'wallPersist', turns:99}], plus:{cost:1}, desc:'이번 전투 진형이 턴 끝에 사라지지 않는다.', memo:'물러설 곳이 없으니 두려울 것도 없다.'});
add({id:'level_ground', name:'진 고르기', pool:'leader', type:'def', cost:0, rarity:'common', tags:[], owner:'gwon',
  ops:[{op:'block', n:4, ifWallBonus:4}], plus:{ops:[{op:'block', n:6, ifWallBonus:6}], desc:'진형 6. 성벽 진형이 있으면 +6.'},
  desc:'진형 4. 성벽 진형이 있으면 +4.', memo:'진을 고른다.'});

/* ---------- 부(부장 고유) 88~93 ---------- */
add({id:'jeolla_right', name:'전라우수영', pool:'deputy', type:'atk', cost:2, rarity:null, tags:['shot'], owner:'yi_eokgi',
  ops:[{op:'dmg', n:10, tag:'shot', times:2}, {op:'cond', if:{naval:true}, then:[{op:'draw', n:1}]}],
  plus:{ops:[{op:'dmg', n:13, tag:'shot', times:2}, {op:'cond', if:{naval:true}, then:[{op:'draw', n:1}]}], desc:'13 피해 ×2. 해전이면 1장 뽑는다.'},
  desc:'10 피해 ×2. 해전이면 1장 뽑는다.', memo:'이억기. 칠천량 1597.7.16에 전사.'});
add({id:'wall_rally', name:'성벽을 지켜라', pool:'deputy', type:'def', cost:1, rarity:null, tags:[], owner:'kim_simin',
  ops:[{op:'block', n:6, wall:true}, {op:'buff', id:'shotAdd', n:2, turns:1}],
  plus:{ops:[{op:'block', n:9, wall:true}, {op:'buff', id:'shotAdd', n:3, turns:1}], desc:'성벽 진형 +9. 이번 턴 사격 +3.'},
  desc:'성벽 진형 +6. 이번 턴 사격 +2.', memo:'김시민. 진주 1차 1592.10.5~10.'});
add({id:'bukgwan_cavalry', name:'북관 기병', pool:'deputy', type:'atk', cost:2, rarity:null, tags:['charge', 'uibyeong'], owner:'jeong_munbu', home:'함경',
  ops:[{op:'dmg', n:11, tag:'charge', times:2}], plus:{ops:[{op:'dmg', n:13, tag:'charge', times:2}], desc:'근접으로 달려들어 13 피해 ×2. 근접에서는 낼 수 없다.'},
  desc:'근접으로 달려들어 11 피해 ×2. 근접에서는 낼 수 없다.', memo:'정문부. 북관대첩 1592.9~1593.1.'});
add({id:'seven_hundred', name:'칠백 의병', hanja:'七百義士', pool:'deputy', type:'atk', cost:3, rarity:null, tags:['none', 'uibyeong'], owner:'jo_heon', home:'충청',
  ops:[{op:'exhaustHand', perCard:[{op:'dmg', n:6, tag:'none'}]}, {op:'leave', id:'jo_heon'}],
  plus:{ops:[{op:'exhaustHand', perCard:[{op:'dmg', n:8, tag:'none'}]}, {op:'leave', id:'jo_heon'}], desc:'손의 카드를 전부 소모하고 장당 8 피해. 조헌·영규가 영구히 떠난다.'},
  desc:'손의 카드를 전부 소모하고 장당 6 피해. 조헌·영규가 영구히 떠난다.', memo:'조헌·영규. 금산 2차 1592.8.18.'});
add({id:'ichi_bow', name:'이치의 활', pool:'deputy', type:'atk', cost:1, rarity:null, tags:['shot', 'pierce'], owner:'hwang_jin',
  ops:[{op:'dmg', n:9, tag:'shot', pierce:true, bonusIf:{siege:4}}], plus:{ops:[{op:'dmg', n:12, tag:'shot', pierce:true, bonusIf:{siege:6}}], desc:'12 피해. 관통. 수성이면 +6.'},
  desc:'9 피해. 관통. 수성이면 +4.', memo:'황진. 이치 1592.7.8.'});
add({id:'yeonan_fort', name:'연안성', hanja:'延安城', pool:'deputy', type:'def', cost:1, rarity:null, tags:[], owner:'yi_jeongam',
  ops:[{op:'block', n:5, wall:true}, {op:'draw', n:1}], plus:{ops:[{op:'block', n:7, wall:true}, {op:'draw', n:1}], desc:'성벽 진형 7. 1장 뽑는다.'},
  desc:'성벽 진형 5. 1장 뽑는다.', memo:'이정암. 연안성 1592.8.28~9.2.'});

/* ---------- 어(어명) 94~97 — 전부 보존. 강화판 없음 ---------- */
add({id:'edict_advance', name:'진격하라', hanja:'進擊', pool:'edict', type:'edict', cost:0, rarity:null, tags:[], retain:true,
  ops:[{op:'buff', id:'atkPct', n:BAL.EDICT_ATK_PCT, turns:1}, {op:'pull', n:2}, {op:'buff', id:'chargeAtClose', turns:1}],
  desc:'이번 턴 공격 +50%. 거리를 근접으로. 이번 턴 돌격 카드를 근접에서도 낼 수 있다.', memo:'조정의 독촉. 원균은 칠천량(1597.7.15~16)으로 나갔다.'});
add({id:'edict_blame', name:'문책', hanja:'問責', pool:'edict', type:'edict', cost:1, rarity:null, tags:[], retain:true, exhaust:true,
  onDraw:[{op:'energy', n:-1}], ops:[], desc:'뽑힐 때 이번 턴 군령 −1. 내면 소모.', memo:'“어명이다. 어찌하여 싸우지 않는가.”'});
add({id:'edict_arrest', name:'압송', hanja:'押送', pool:'edict', type:'edict', cost:2, rarity:null, tags:[], retain:true, exhaust:true,
  onDraw:[{op:'buff', id:'passivesOff'}], ops:[], desc:'뽑힐 때 이번 전투 부장의 패시브가 멈춘다. 내면 소모.', memo:'이순신 파직·압송 1597.2.'});
add({id:'edict_envy', name:'조정의 시기', hanja:'猜忌', pool:'edict', type:'edict', cost:1, rarity:null, tags:[], retain:true, exhaust:true,
  onDraw:[{op:'discard', n:1, type:'rep', random:true}], ops:[{op:'suspicion', n:1}],
  desc:'뽑힐 때 손의 장계 카드 1장을 버린다. 내면 소모, 의심 +1.', memo:'공이 클수록 조정은 의심했다.'});

/* ---------- 사(사건 전용) 98~99 ---------- */
add({id:'jochong', name:'조총', hanja:'鳥銃', pool:'event', type:'atk', cost:2, rarity:null, tags:['shot', 'pierce'],
  ops:[{op:'cond', if:{cardMarked:true}, then:[{op:'dmg', n:18, tag:'shot', pierce:true}, {op:'mark', set:false}], else:[{op:'mark', set:true}]}],
  plus:{ops:[{op:'cond', if:{cardMarked:true}, then:[{op:'dmg', n:22, tag:'shot', pierce:true}, {op:'mark', set:false}], else:[{op:'mark', set:true}]}],
    desc:'장전 표식이 없으면 장전하고 버린다. 있으면 22 피해, 관통. 쏘면 장전이 풀린다.'},
  desc:'장전 표식이 없으면 장전하고 버린다. 있으면 18 피해, 관통. 쏘면 장전이 풀린다.', memo:'항왜 사야가(김충선)의 조총.'});
add({id:'dokjeon', name:'독전의 북', hanja:'督戰', pool:'event', type:'tac', cost:0, rarity:null, tags:[], exhaust:true,
  ops:[{op:'buff', id:'atkPct', n:BAL.DOKJEON_PCT}], desc:'이번 전투 모든 공격 +60%.', memo:'노량 1598.11.19. “나의 죽음을 알리지 마라.”'});

/* ---------- 시작 덱 (DESIGN §6.1, 유일한 출처) ---------- */
var START = {
  yi:   ['bowstring', 'bowstring', 'bowstring', 'spear_wall', 'spear_wall', 'spear_wall', 'retreat_horn', 'war_drum', 'report', 'hwando', 'seungja', 'seungja'],
  gwon: ['bowstring', 'bowstring', 'bowstring', 'spear_wall', 'spear_wall', 'spear_wall', 'retreat_horn', 'war_drum', 'report', 'throw_stone', 'mountain_fort', 'hide']
};
function startDeck(leaderId){
  if (!START[leaderId]) throw new Error('CARDS: 시작 덱이 없는 주장 ' + leaderId);
  return START[leaderId].slice();
}
function get(id){ if (!byId[id]) throw new Error('CARDS: 없는 id ' + id); return byId[id]; }
function pool(name){ var r = []; for (var i = 0; i < list.length; i++) if (list[i].pool === name) r.push(list[i]); return r; }

/* ---------- 자가 검사 ---------- */
var IDS = ('bowstring spear_wall retreat_horn war_drum report hwando throw_stone pyeonjeon seungja hide shield_wall iron_wall pike_square volley scout regroup ' +
  'cavalry_charge arrow_rain archer_ambush samsu whip resolve ash_bag cannon_volley jincheonroe discipline pajin cheonja crane_wing turtle_ship retreat_fire ' +
  'panok_turn daejanggun lure fire_arrow rowers twelve_ships flagship rolling_fire manifesto militia red_robe uiryeong_rising jeongam_ambush geumsan_drum ' +
  'monk_soldiers mountain_raid people_stones monk_rally bamboo_spear ambush_fire scorched_earth counter_spy parley nanjung_diary scarecrow scout_boat memorial ' +
  'beacon castle_well desperate_call baesujin mountain_fort hwacha hyeonja repair_parapet ongseong counter_mound gate_sally boiling_water pyongyang_bombard ' +
  'nambyeong_cannon li_cavalry folangji langseon request_troops chen_lin_bombard deng_zilong ming_navy_square pilsa_jeuksaeng not_one_ship sinsang_pilbeol ' +
  'danghangpo_lure hwacha_volley sema die_standing level_ground jeolla_right wall_rally bukgwan_cavalry seven_hundred ichi_bow yeonan_fort edict_advance ' +
  'edict_blame edict_arrest edict_envy jochong dokjeon').split(' ');
var OPS_COMMON = ['suspicion', 'ration', 'hp', 'addCard', 'removeCard', 'upgrade', 'relic', 'flag', 'leave', 'cond', 'fx', 'score'];
var OPS_BATTLE = ['dmg', 'block', 'push', 'pull', 'draw', 'energy', 'status', 'stun', 'buff', 'exhaustHand', 'discard', 'exhaust', 'retrieve', 'mark', 'delay', 'stripBlock'];
var OPS_RUN_ONLY = ['battle', 'recruit', 'ending', 'offer', 'upgrade', 'relic', 'score'];   // 카드 ops 에서는 금지(판 전용·전투에서 throw 되는 것)
var COND_KEYS = ['dist', 'distNot', 'hpPct', 'naval', 'siege', 'assault', 'field', 'turn', 'turnLte', 'hasWall', 'tide', 'wave', 'cardTag', 'cardType', 'cardPool',
  'cardId', 'cardMarked', 'enemyId', 'enemyTag', 'handCount', 'cardsPlayedThisTurn', 'deckTagCount', 'hasCard', 'hasRelic', 'hasDeputy', 'noDeputy', 'flag',
  'leader', 'lane', 'act', 'actGte', 'ration', 'suspicion', 'slotsFree', 'oncePerBattle', 'oncePerTurn'];
var STATUS_IDS = ['shaken', 'exposed', 'hunger', 'momentum', 'ambush', 'ironwall', 'stun', 'flinch', 'loaded'];
var BUFF_IDS = ['nextAtk', 'atkAdd', 'shotAdd', 'atkPct', 'shotPct', 'evadeFirst', 'hide', 'noAtk', 'noMelee', 'noPushBattle', 'wallPersist', 'chargeAtClose', 'noAdvance', 'passivesOff', 'minHp1'];
var MULT_TAGS = ['shot', 'melee', 'charge', 'fire', 'none'];
var EXTRA_TAGS = ['pierce', 'navy', 'uibyeong', 'ming', 'siege'];
var POOLS = ['base', 'common', 'navy', 'uibyeong', 'tactic', 'siege', 'ming', 'leader', 'deputy', 'edict', 'event', 'token'];
var TYPES = ['atk', 'def', 'tac', 'rep', 'edict'];
var RARITIES = ['common', 'rare', 'special', null];
var HOMES = ['경상', '전라', '충청', '경기', '강원', '황해', '평안', '함경'];
var OWNERS = ['yi', 'gwon', 'yi_eokgi', 'kim_simin', 'jeong_munbu', 'jo_heon', 'hwang_jin', 'yi_jeongam'];
var PLUS_KEYS = ['cost', 'costIf', 'ops', 'onDraw', 'desc', 'ration', 'exhaust', 'retain'];
var CARD_KEYS = ['id', 'name', 'hanja', 'pool', 'type', 'cost', 'costIf', 'rarity', 'tags', 'home', 'ration', 'exhaust', 'retain', 'owner', 'ops', 'onDraw', 'desc', 'plus', 'memo'];

// ops 트리를 걷는다. visit(op, path, inCardOps). 중첩: cond.then/else · delay.ops · exhaustHand.perCard
function walkOps(ops, path, inCardOps, visit){
  if (!Array.isArray(ops)) { visit(null, path + ' (배열 아님)', inCardOps); return; }
  for (var i = 0; i < ops.length; i++) {
    var o = ops[i], p = path + '[' + i + ']';
    visit(o, p, inCardOps);
    if (!o || typeof o !== 'object') continue;
    if (o.op === 'cond') { if (o.then) walkOps(o.then, p + '.then', inCardOps, visit); if (o.else) walkOps(o.else, p + '.else', inCardOps, visit); }
    if (o.op === 'delay') walkOps(o.ops || [], p + '.ops', false, visit);
    if (o.op === 'exhaustHand') walkOps(o.perCard || [], p + '.perCard', false, visit);
  }
}
function hasDmg(ops){ var f = false; walkOps(ops, '', true, function(o){ if (o && o.op === 'dmg') f = true; }); return f; }
function hasPierce(ops){ var f = false; walkOps(ops, '', true, function(o){ if (o && o.op === 'dmg' && o.pierce === true) f = true; }); return f; }
function sameJson(a, b){ return JSON.stringify(a) === JSON.stringify(b); }

function selfTest(){
  var errors = [];
  function err(s){ errors.push(s); }
  if (list.length !== 99) err('카드 수 ' + list.length + ' (99 아님)');
  if (list.length === IDS.length) { for (var k = 0; k < IDS.length; k++) if (list[k].id !== IDS[k]) { err('ID 순서 불일치 #' + (k + 1) + ': ' + list[k].id + ' ≠ ' + IDS[k]); break; } }
  else err('ID 목록 길이 ' + IDS.length + ' ≠ list ' + list.length);
  var seen = {};
  list.forEach(function(c, idx){
    var tag = '#' + (idx + 1) + ' ' + c.id;
    if (seen[c.id]) err(tag + ' ID 중복'); seen[c.id] = true;
    if (!/^[a-z][a-z0-9_]*$/.test(c.id)) err(tag + ' ID 형식');
    Object.keys(c).forEach(function(key){ if (CARD_KEYS.indexOf(key) < 0) err(tag + ' 모르는 필드 ' + key); });
    ['id', 'name', 'pool', 'type', 'cost', 'tags', 'ops', 'desc', 'plus', 'memo'].forEach(function(key){ if (c[key] === undefined) err(tag + ' 필수 필드 없음 ' + key); });
    if (!('rarity' in c)) err(tag + ' rarity 없음');
    if (POOLS.indexOf(c.pool) < 0) err(tag + ' pool ' + c.pool);
    if (TYPES.indexOf(c.type) < 0) err(tag + ' type ' + c.type);
    if (!(c.cost === 0 || c.cost === 1 || c.cost === 2 || c.cost === 3)) err(tag + ' cost ' + c.cost);
    if (RARITIES.indexOf(c.rarity) < 0) err(tag + ' rarity ' + c.rarity);
    var mustNull = ['token', 'edict', 'event', 'deputy'].indexOf(c.pool) >= 0;
    if (mustNull && c.rarity !== null) err(tag + ' 토큰·어명·사건·부장 카드는 rarity null');
    if (!mustNull && c.rarity === null) err(tag + ' 풀 카드는 rarity 필요');
    if ((c.type === 'edict') !== (c.pool === 'edict')) err(tag + ' type edict ↔ pool edict');
    if (typeof c.desc !== 'string' || !c.desc) err(tag + ' desc 비어 있음');
    if (typeof c.memo !== 'string' || !c.memo) err(tag + ' memo 비어 있음');
    if (c.hanja !== undefined && typeof c.hanja !== 'string') err(tag + ' hanja');
    // 태그
    if (!Array.isArray(c.tags)) { err(tag + ' tags 배열 아님'); return; }
    c.tags.forEach(function(t, i){ if (MULT_TAGS.indexOf(t) < 0 && EXTRA_TAGS.indexOf(t) < 0) err(tag + ' 모르는 태그 ' + t); if (i > 0 && MULT_TAGS.indexOf(t) >= 0) err(tag + ' 배율 태그는 첫 자리만: ' + t); });
    var atk = hasDmg(c.ops);
    if (atk && MULT_TAGS.indexOf(c.tags[0]) < 0) err(tag + ' 공격 카드의 첫 태그가 배율 태그가 아님');
    if (!atk && c.tags.length && MULT_TAGS.indexOf(c.tags[0]) >= 0) err(tag + ' 공격 아닌 카드에 배율 태그');
    if (atk && c.type !== 'atk') err(tag + ' dmg 가 있으면 type atk');
    if (c.pool === 'navy' && c.tags.indexOf('navy') < 0) err(tag + ' 수군 풀은 navy 태그');
    if ((c.pool === 'ming' || (c.pool === 'token' && c.id !== 'militia')) && c.tags.indexOf('ming') < 0) err(tag + ' 명군 풀·명 수군 토큰은 ming 태그');
    if (c.pool === 'siege' && c.tags.indexOf('siege') < 0) err(tag + ' 수성 풀은 siege 태그');
    if ((c.pool === 'uibyeong' || c.id === 'militia' || c.home) && c.tags.indexOf('uibyeong') < 0) err(tag + ' 의병 풀·의병 토큰·home 카드는 uibyeong 태그');
    var pierce = hasPierce(c.ops);
    if (pierce !== (c.tags.indexOf('pierce') >= 0)) err(tag + ' pierce 태그 ↔ dmg pierce 불일치');
    if (c.home !== undefined && HOMES.indexOf(c.home) < 0) err(tag + ' home ' + c.home);
    if (c.ration !== undefined && (c.pool !== 'ming' || !(c.ration >= 1))) err(tag + ' ration 은 명군 풀만, 1 이상');
    if (c.owner !== undefined && OWNERS.indexOf(c.owner) < 0) err(tag + ' owner ' + c.owner);
    if ((c.pool === 'leader' || c.pool === 'deputy') && !c.owner) err(tag + ' 주장·부장 고유 카드는 owner 필요');
    if (c.pool === 'leader' && c.owner !== 'yi' && c.owner !== 'gwon') err(tag + ' 주장 카드 owner');
    if (c.exhaust !== undefined && c.exhaust !== true) err(tag + ' exhaust 는 true 만');
    if (c.retain !== undefined && c.retain !== true) err(tag + ' retain 은 true 만');
    if (c.costIf !== undefined && (!c.costIf.if || typeof c.costIf.cost !== 'number')) err(tag + ' costIf 형식');
    // ops
    checkOps(c.ops, tag + ' ops', true);
    if (c.onDraw !== undefined) { checkOps(c.onDraw, tag + ' onDraw', false); if (c.pool !== 'edict') err(tag + ' onDraw 는 어명만'); }
    // plus
    if (c.plus === null || typeof c.plus !== 'object' || Array.isArray(c.plus)) err(tag + ' plus 는 객체');
    else {
      Object.keys(c.plus).forEach(function(key){ if (PLUS_KEYS.indexOf(key) < 0) err(tag + ' plus 모르는 필드 ' + key); });
      if (c.plus.ops !== undefined) { checkOps(c.plus.ops, tag + ' plus.ops', true); if (sameJson(c.plus.ops, c.ops)) err(tag + ' plus.ops 가 기본판과 같음'); if (hasPierce(c.plus.ops) !== pierce) err(tag + ' plus 관통 여부 다름'); if (hasDmg(c.plus.ops) !== atk) err(tag + ' plus 공격 여부 다름'); }
      if (c.plus.onDraw !== undefined) checkOps(c.plus.onDraw, tag + ' plus.onDraw', false);
      if (c.plus.cost !== undefined && (c.plus.cost < 0 || c.plus.cost > 3 || c.plus.cost === c.cost)) err(tag + ' plus.cost');
      if (c.plus.exhaust !== undefined && c.plus.exhaust !== false) err(tag + ' plus.exhaust 는 false 만');
      if (c.plus.exhaust === false && c.exhaust !== true) err(tag + ' plus.exhaust:false 인데 기본판이 소모가 아님');
      if (c.plus.ops !== undefined && c.plus.desc === undefined) err(tag + ' plus.ops 가 있으면 plus.desc 도');
      var noUp = ['chen_lin_bombard', 'deng_zilong', 'ming_navy_square', 'edict_advance', 'edict_blame', 'edict_arrest', 'edict_envy', 'dokjeon'];
      if ((Object.keys(c.plus).length === 0) !== (noUp.indexOf(c.id) >= 0)) err(tag + ' 강화판 유무가 DESIGN 과 다름');
    }
  });
  function checkOps(ops, where, cardOps){
    walkOps(ops, where, cardOps, function(o, p, inCard){
      if (!o || typeof o !== 'object' || Array.isArray(o)) { err(p + ' op 객체 아님'); return; }
      if (typeof o.op !== 'string') { err(p + ' op 이름 없음'); return; }
      var known = OPS_COMMON.indexOf(o.op) >= 0 || OPS_BATTLE.indexOf(o.op) >= 0;
      if (!known) err(p + ' 모르는 op ' + o.op);
      if (OPS_RUN_ONLY.indexOf(o.op) >= 0) err(p + ' 카드에서 쓸 수 없는 op ' + o.op);
      if (o.choose === true && !inCard) err(p + ' choose:true 는 카드 ops 안에서만');
      if (o.op === 'cond') { if (!o.if || typeof o.if !== 'object') err(p + ' cond.if 없음'); else Object.keys(o.if).forEach(function(k){ if (COND_KEYS.indexOf(k) < 0) err(p + ' 모르는 cond 키 ' + k); }); if (!Array.isArray(o.then)) err(p + ' cond.then 배열 아님'); }
      if (o.op === 'dmg') { if (typeof o.n !== 'number') err(p + ' dmg.n'); if (MULT_TAGS.indexOf(o.tag) < 0) err(p + ' dmg.tag ' + o.tag); if (o.times !== undefined && !(o.times >= 1)) err(p + ' dmg.times'); }
      if (o.op === 'status') { if (STATUS_IDS.indexOf(o.id) < 0) err(p + ' status id ' + o.id); if (['self', 'target', 'all'].indexOf(o.who) < 0) err(p + ' status who ' + o.who); if (typeof o.n !== 'number') err(p + ' status.n'); }
      if (o.op === 'buff') { if (BUFF_IDS.indexOf(o.id) < 0) err(p + ' buff id ' + o.id); }
      if (o.op === 'block' && typeof o.n !== 'number') err(p + ' block.n');
      if ((o.op === 'push' || o.op === 'pull') && !(o.n >= 1 && o.n <= 2)) err(p + ' push/pull n 은 1~2');
      if (o.op === 'addCard') { if (o.id && !byId[o.id]) err(p + ' addCard 없는 id ' + o.id); if (o.pool && POOLS.indexOf(o.pool) < 0) err(p + ' addCard pool'); if (!o.id && !o.pool) err(p + ' addCard id/pool 없음'); }
      if (o.op === 'leave' && OWNERS.indexOf(o.id) < 0) err(p + ' leave id ' + o.id);
      if (o.op === 'retrieve' && (o.from !== 'discard' || o.choose !== true)) err(p + ' retrieve 형식');
      if (o.op === 'mark' && typeof o.set !== 'boolean') err(p + ' mark.set');
      if (o.op === 'delay' && !Array.isArray(o.ops)) err(p + ' delay.ops');
      if (o.op === 'exhaustHand' && !Array.isArray(o.perCard)) err(p + ' exhaustHand.perCard');
      Object.keys(o).forEach(function(k){ var v = o[k]; if (v === undefined || typeof v === 'function') err(p + ' 필드 ' + k + ' 가 undefined/함수'); });
    });
  }
  // 풀별 장수 (DESIGN §9: 기본 7·공용 20·수군 12·의병 11+토큰 1·책략 11·수성 8·명군 6·명 수군 토큰 3·주장 8·부장 6·어명 4·사건 2)
  var want = {base:7, common:20, navy:12, uibyeong:11, token:4, tactic:11, siege:8, ming:6, leader:8, deputy:6, edict:4, event:2};
  Object.keys(want).forEach(function(p){ var n = pool(p).length; if (n !== want[p]) err('풀 ' + p + ' 장수 ' + n + ' ≠ ' + want[p]); });
  // 시작 덱
  ['yi', 'gwon'].forEach(function(l){
    var d = startDeck(l);
    if (d.length !== 12) err('시작 덱 ' + l + ' ' + d.length + '장');
    d.forEach(function(id){ if (!byId[id]) err('시작 덱 ' + l + ' 없는 id ' + id); });
    var pushes = 0; d.forEach(function(id){ var c = byId[id]; if (c) walkOps(c.ops, '', true, function(o){ if (o && o.op === 'push') pushes++; }); });
    if (pushes !== 4) err('시작 덱 ' + l + ' 밀어내기 카드 ' + pushes + '장 (4 아님)');
  });
  // JSON 왕복
  try { if (!sameJson(JSON.parse(JSON.stringify(list)), list)) err('JSON 왕복 불일치'); } catch (e) { err('JSON 왕복 예외 ' + e.message); }
  // get / 참조
  try { get('__none__'); err('get 이 없는 id 에 throw 하지 않음'); } catch (e) { if (!/없는 id/.test(e.message)) err('get 오류 문구 ' + e.message); }
  if (pool('navy').length && pool('navy').some(function(c){ return c.tags.indexOf('navy') < 0; })) err('navy 풀 태그 누락');
  return { ok: errors.length === 0, errors: errors };
}

return { list: list, byId: byId, get: get, startDeck: startDeck, pool: pool, selfTest: selfTest };
})();
