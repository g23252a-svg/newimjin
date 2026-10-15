/* ===== 05_events.js — 사건 29(E1~E29)·조정/군영 규칙 데이터. 효과는 전부 DSL ops(Run이 해석) ===== */
var EVENTS = (function(){ 'use strict';
// TODO(통합): Run.applyOps — cond `hasDeputy:'yi'`는 G.special(특별 부장 자리)도 포함해 평가해 달라(E28 ① 권율 주장 변형).
// TODO(통합): Run — `hp` op에 n 없이 max만 있으면(E15 ②, E21 ②) 최대 병력만 올리고 현재 병력은 그대로. n과 max가 함께면 max를 먼저 올린 뒤 n을 더한다(E5 ③).
// TODO(통합): Run — E5 변형(권율 주장·이순신 미영입)의 `recruit yi optional:true`는 계약 §4.3대로 pickGeneral{reason:'optional'}로 묻는다.
// TODO(통합): Run — court/camp 프롬프트의 text·desc·reason 문자열은 EVENTS.court/EVENTS.camp에서, 수치(COURT.report 등)는 BAL에서 읽어 preview를 만든다.
// TODO(통합): TXT — 사건 제목·본문·선택지·preview는 여기(EVENTS)가 소유한다. TXT.event를 만들지 않는다(계약 §3.5).
// TODO(통합): check.js — E29(court)는 choices가 빈 배열이다(조정 프롬프트가 대신한다). E20·E23은 선택지 1개(계약 허용).

  /* ---------------- 사건 29 ---------------- */
  var list = [
  { id:'E1', key:'dongnae', act:1, title:'싸워 죽기는 쉬우나',
    text:[
      '부산진이 떨어진 이튿날, 왜의 선봉이 동래성 아래에 이르렀다. 성문 앞에 세운 나무 팻말에는 “싸우려거든 싸우고, 싸우지 않으려거든 길을 비켜라”라고 적혀 있었다.',
      '동래 부사가 붓을 들어 그 아래에 답을 썼다. “싸워 죽기는 쉬우나 길을 빌려주기는 어렵다.”',
      '성 안에는 창을 든 백성과 활 몇 벌뿐이다. 성벽은 낮고 적은 많다. 그대는 어찌할 것인가.'
    ],
    choices:[
      { text:'동래성을 지킨다', preview:'즉시 전투(동래성 수성) → 이기면 ‘격문’ 카드', ops:[{op:'battle', enc:'dongnae_hold', reward:false, onWin:[{op:'addCard', id:'manifesto'}]}] },
      { text:'백성을 피신시킨다', preview:'병력 +8', ops:[{op:'hp', n:8}] },
      { text:'길을 비킨다', preview:'군량 +20, 의심 +1', ops:[{op:'ration', n:20}, {op:'suspicion', n:1}] }
    ],
    memo:'동래 1592.4.15. 동래 부사 송상현의 답글' },

  { id:'E2', key:'sayaga', act:1, title:'항왜 사야가',
    text:[
      '경상도의 어느 고을. 왜의 선봉에서 조총을 든 무리 하나가 창끝을 거꾸로 돌려 진 앞에 나왔다. 우두머리는 제 이름을 사야가라 했다.',
      '“우리는 이 나라의 예의를 흠모하여 왔소. 조총 쏘는 법과 화약 다루는 법을 가르쳐 드리리다.” 그의 부하들은 말없이 총을 내려놓았다.',
      '항복한 왜를 진중에 두는 일이다. 조정이 알면 무어라 할지 모른다.'
    ],
    choices:[
      { text:'받아들인다', preview:'기물 ‘항왜의 조총’(덱에 ‘조총’ 2장)', ops:[{op:'relic', id:'hangwae_gun'}] },
      { text:'내친다', preview:'군량 +10', ops:[{op:'ration', n:10}] },
      { text:'조총만 거둔다', preview:'‘조총’ 1장, 의심 +1', ops:[{op:'addCard', id:'jochong'}, {op:'suspicion', n:1}] }
    ],
    memo:'항복한 왜인 사야가, 뒤의 이름은 김충선. 조총 만드는 법과 쏘는 법을 전했다.' },

  { id:'E3', key:'joryeong_or_tangeumdae', act:1, title:'조령인가 탄금대인가',
    text:[
      '상주가 무너졌다는 보고와 함께 왜의 본대가 문경 새재 아래에 이르렀다는 척후가 들어왔다.',
      '종사관 김여물이 지도를 짚었다. “조령은 하늘이 내린 험한 땅입니다. 고개 위에서 활을 쏘면 저들은 올라오지 못합니다.”',
      '신립이 고개를 저었다. “우리 군사는 기병이다. 기병은 들판에서 싸운다. 강을 등지고 서면 물러설 곳이 없으니 죽기로 싸울 것이다.”',
      '두 길 가운데 하나를 골라야 한다. 아니면 충주성 안에 들어 성벽에 기대는 길도 있다.'
    ],
    choices:[
      { text:'조령으로 간다 (김여물)', preview:'결전 지형 고개: 원거리에서 시작, 적이 한동안 오르지 못하고 턴마다 진형을 얻는다. 이기면 기물 ‘조령의 돌’', ops:[{op:'flag', key:'b1', value:'ridge'}] },
      { text:'탄금대에 선다 (신립)', preview:'결전 지형 강: 밀어내기 무효, 기세를 얻고 돌격이 싸진다. ‘배수진’ 카드. 이기면 군량 +20', ops:[{op:'flag', key:'b1', value:'river'}, {op:'addCard', id:'baesujin'}] },
      { text:'충주성에 든다', preview:'결전이 수성(아군 성벽)으로. 이기면 군량 −20', ops:[{op:'flag', key:'b1', value:'fort'}] }
    ],
    memo:'탄금대 1592.4.28 전날. 김여물은 조령을 막자 했고, 신립은 강을 등지고 싸웠다.' },

  { id:'E4', key:'king_leaves', act:1, title:'임금이 도성을 떠나다',
    text:[
      '4월 그믐 밤, 비가 내렸다. 임금의 가마가 서쪽 문을 나서 북으로 향했다. 궁궐 뒤에서 불길이 올랐다.',
      '닷새 뒤 왜군이 한성에 들어왔다. 길에는 버려진 짐과 흩어진 문서뿐이었다.',
      '그대의 군사는 어디로 갈 것인가. 임금을 따라 북으로 갈지, 남아 싸울지, 불을 끌지.'
    ],
    choices:[
      { text:'임금을 따라간다', preview:'의심 −2, 병력 −6', ops:[{op:'suspicion', n:-2}, {op:'hp', n:-6}] },
      { text:'도성에 남아 싸운다', preview:'기물 ‘징비록’, 의심 +1', ops:[{op:'relic', id:'jingbirok'}, {op:'suspicion', n:1}] },
      { text:'경복궁의 불을 끈다', preview:'군량 +25', ops:[{op:'ration', n:25}] }
    ],
    memo:'선조가 도성을 떠난 날 1592.4.30, 한성 함락 5.3.' },

  { id:'E5', key:'turtle_launch', act:2, title:'거북선 진수',
    text:[
      '사천 앞바다. 나대용이 만든 배가 처음으로 돛을 올렸다. 등에는 쇠못이 꽂혔고 머리에서는 연기가 났다.',
      '“적이 올라타지 못하고, 우리는 사방으로 쏜다.” 노꾼들이 노를 저어 왜선 사이로 들어갔다.',
      '이 배를 어찌 쓸 것인가. 한 척을 끌고 다닐지, 설계도를 간직할지, 아니면 판옥선 두 척을 더 지을지.'
    ],
    variants:[
      { if:{leader:'gwon', noDeputy:'yi'}, patch:{
        text:[
          '사천 앞바다. 나대용이 만든 배가 처음으로 돛을 올렸다. 등에는 쇠못이 꽂혔고 머리에서는 연기가 났다.',
          '뱃머리에는 전라좌수사 이순신이 서 있었다. “적이 올라타지 못하고, 우리는 사방으로 쏜다.”',
          '이 배를 어찌 쓸 것인가. 좌수사를 진중에 맞아들일 수도 있다.'
        ],
        choices:[
          { text:'거북선을 받고 좌수사를 청한다', preview:'‘거북선’ 카드. 이순신을 부장으로 영입(원하면)', ops:[{op:'addCard', id:'turtle_ship'}, {op:'recruit', id:'yi', optional:true}] },
          { text:'설계도를 간직한다', preview:'기물 ‘거북선 설계도’(해전 시작 시 손에 ‘거북선’)', ops:[{op:'relic', id:'turtle_blueprint'}] },
          { text:'판옥선 두 척', preview:'최대 병력 +8, 병력 +8', ops:[{op:'hp', n:8, max:8}] }
        ] } }
    ],
    choices:[
      { text:'거북선을 받는다', preview:'‘거북선’ 카드', ops:[{op:'addCard', id:'turtle_ship'}] },
      { text:'설계도를 간직한다', preview:'기물 ‘거북선 설계도’(해전 시작 시 손에 ‘거북선’)', ops:[{op:'relic', id:'turtle_blueprint'}] },
      { text:'판옥선 두 척', preview:'최대 병력 +8, 병력 +8', ops:[{op:'hp', n:8, max:8}] }
    ],
    memo:'사천 1592.5.29, 거북선 첫 출전. 나대용이 만들었다.' },  // 변형: 권율이 주장이고 이순신이 없으면 ①에서 영입

  { id:'E6', key:'red_general', act:2, title:'홍의장군',
    text:[
      '의령. 붉은 옷을 입은 사내가 제 집 재산을 풀어 사람을 모았다. 곽재우였다.',
      '“관군은 흩어졌고 수령은 달아났다. 이 땅은 우리가 지킨다.” 낫과 죽창을 든 이들이 강가에 모였다.',
      '의병은 제 고을에서 강하다. 격문을 돌려 사람을 더 모을지, 곽재우의 계책을 빌릴지, 양식을 받을지.'
    ],
    choices:[
      { text:'격문을 돌린다', preview:'‘격문’ 2장', ops:[{op:'addCard', id:'manifesto', n:2}] },
      { text:'홍의장군의 계책', preview:'‘홍의장군’ 1장, ‘의령의 봉기’ 1장', ops:[{op:'addCard', id:'red_robe'}, {op:'addCard', id:'uiryeong_rising'}] },
      { text:'의병의 양식을 받는다', preview:'군량 +30', ops:[{op:'ration', n:30}] }
    ],
    memo:'곽재우가 의령에서 의병을 일으켰다 1592.4.22. 홍의장군.' },

  { id:'E7', key:'ichi_pass', act:2, title:'이치의 고개',
    text:[
      '전라도 이치. 한산도에서 포성이 울리던 바로 그날, 뭍에서는 왜군이 전라도로 넘어오는 고개를 두드렸다.',
      '권율이 고개 위에 목책을 세우고, 동복현감 황진이 앞에서 활을 쏘았다. 황진은 화살에 맞고도 물러서지 않았다.',
      '이 고개를 넘기면 전라도의 곡창이 열린다. 누구를 진중에 청하고, 누가 고개에 설 것인가.'
    ],
    choices:[
      { text:'권율을 청한다', if:{leader:'yi'}, hidden:true, preview:'부장 권율 영입', ops:[{op:'recruit', id:'gwon'}] },
      { text:'황진을 청한다', if:{leader:'gwon'}, hidden:true, preview:'부장 황진 영입', ops:[{op:'recruit', id:'hwang_jin'}] },
      { text:'황진을 청한다', preview:'부장 황진 영입', ops:[{op:'recruit', id:'hwang_jin'}] },
      { text:'고개를 지킨다', preview:'즉시 전투(고개, 창병 둘과 조총병) → 이기면 ‘이치의 활’ 카드', ops:[{op:'battle', enc:'ichi_hold', onWin:[{op:'addCard', id:'ichi_bow'}]}] }
    ],
    memo:'이치 1592.7.8. 권율과 황진이 고개를 지켰다.' },  // ①은 주장에 따라 둘 중 하나만 보인다(계약 §3.5)

  { id:'E8', key:'geumsan_twice', act:2, title:'금산, 두 번',
    text:[
      '7월 10일, 금산. 고경명이 의병 수천을 이끌고 성 아래로 갔다. 관군이 먼저 무너지자 의병도 흩어졌고, 고경명은 돌아오지 않았다.',
      '8월 18일, 다시 금산. 조헌과 승려 장수 영규가 칠백을 이끌고 같은 성 아래에 섰다. “물러서는 자는 없다.” 하루가 지나자 칠백 가운데 한 사람도 남지 않았다.',
      '그대의 군사는 어느 금산에 설 것인가.'
    ],
    choices:[
      { text:'고경명과 함께 싸운다', preview:'정예 전투(왜장과 창병 둘, 평지) → 이기면 ‘금산의 북’과 기물', ops:[{op:'battle', enc:'geumsan_elite', onWin:[{op:'addCard', id:'geumsan_drum'}]}] },
      { text:'조헌·영규를 청한다', preview:'부장 조헌·영규 영입', ops:[{op:'recruit', id:'jo_heon'}] },
      { text:'물러난다', preview:'병력 +5', ops:[{op:'hp', n:5}] }
    ],
    memo:'금산 1차 1592.7.10 고경명, 2차 8.18 조헌·영규와 칠백 의병.' },

  { id:'E9', key:'jincheonroe', act:2, title:'비격진천뢰',
    text:[
      '경주성 아래. 왜군이 성을 차지한 지 석 달이다. 이장손이 만든 둥근 쇠탄을 큰 포로 성 안에 쏘아 넣으면 한참 뒤에 터진다 했다.',
      '“굴러 들어온 쇠공을 왜적이 둘러서서 구경하다가, 터지는 소리에 수십이 넘어졌다”는 말이 돌았다.',
      '포를 먼저 쏠지, 변이중의 화차를 먼저 끌고 갈지, 아니면 성이 비기를 기다릴지.'
    ],
    choices:[
      { text:'이장손의 포를 쏜다', preview:'전투(경주 공성) 시작 시 적 전체에 16 피해 → 이기면 기물 ‘비격진천뢰’', ops:[{op:'battle', enc:'gyeongju', handlers:[{hook:'onBattleStart', ops:[{op:'dmg', n:16, tag:'fire', all:true}]}], onWin:[{op:'relic', id:'jincheonroe_relic'}]}] },
      { text:'화차를 먼저', preview:'‘화차’ 카드. 전투(경주 공성)는 그대로', ops:[{op:'addCard', id:'hwacha'}, {op:'battle', enc:'gyeongju'}] },
      { text:'둘 다 천천히', preview:'전투 생략, 군량 +15', ops:[{op:'ration', n:15}] }
    ],
    memo:'경주 탈환 1592.9.8. 이장손의 비격진천뢰, 변이중의 화차' },

  { id:'E10', key:'busanpo_jeongun', act:2, title:'부산포, 정운',
    text:[
      '9월 1일, 부산포. 왜선 수백 척이 포구에 매여 있었다. 함대가 포구 깊숙이 들어가 포를 쏘았다.',
      '녹도만호 정운이 앞장서 왜선 사이로 들어갔다가 조총 탄환에 맞아 쓰러졌다. 북소리가 잠시 멎었다.',
      '끝까지 칠 것인가, 물러날 것인가. 아니면 만호의 시신부터 거둘 것인가.'
    ],
    choices:[
      { text:'끝까지 친다', preview:'기물 ‘한산의 북’ 강화(해전 첫 턴 밀어내기 2), 병력 −10', ops:[{op:'relic', id:'hansan_drum', up:true}, {op:'hp', n:-10}] },
      { text:'물러난다', preview:'군량 +20', ops:[{op:'ration', n:20}] },
      { text:'녹도만호의 시신을 거둔다', preview:'의심 −1', ops:[{op:'suspicion', n:-1}] }
    ],
    memo:'부산포 1592.9.1. 녹도만호 정운이 전사했다.' },  // 2막 바닷길 결산 사건

  { id:'E11', key:'kim_simin_wound', act:2, title:'김시민의 상처',
    text:[
      '진주성. 엿새의 싸움이 끝났다. 왜군은 물러갔으나 진주목사 김시민은 이마에 조총 탄환을 맞고 쓰러졌다.',
      '의원이 말했다. “약이 있으면 살릴지도 모릅니다. 그러나 약은 먼 데 있고 값이 비쌉니다.”',
      '남은 군량을 털어 의원을 보낼지, 성을 황진에게 맡길지, 그대로 둘지.'
    ],
    variants:[
      { if:{noDeputy:'kim_simin'}, patch:{
        text:[
          '진주성. 엿새의 싸움이 끝났다. 왜군은 물러갔으나 진주목사 김시민은 이마에 조총 탄환을 맞고 쓰러졌다.',
          '김시민은 그대의 진중에 없다. 그러나 의원을 보내 살려내면 그가 그대의 북을 칠 것이다.',
          '남은 군량을 털어 의원을 보낼지, 성을 황진에게 맡길지, 그대로 둘지.'
        ],
        choices:[
          { text:'의원을 보낸다', if:{ration:{gte:25}}, reason:'군량 25가 없다.', preview:'군량 −25 → 김시민 영입(자리가 찼으면 교체)', ops:[{op:'ration', n:-25}, {op:'recruit', id:'kim_simin'}] },
          { text:'황진에게 맡긴다', preview:'황진 영입(자리가 찼으면 교체)', ops:[{op:'leave', id:'kim_simin'}, {op:'recruit', id:'hwang_jin'}] },
          { text:'그대로 둔다', preview:'기물 ‘진주의 북’ 강화(수성 첫 턴 적 전체 동요 2)', ops:[{op:'leave', id:'kim_simin'}, {op:'relic', id:'jinju_drum', up:true}] }
        ] } }
    ],
    choices:[
      { text:'의원을 보낸다', if:{ration:{gte:25}}, reason:'군량 25가 없다.', preview:'군량 −25, 김시민 유지', ops:[{op:'ration', n:-25}, {op:'recruit', id:'kim_simin'}] },
      { text:'황진에게 맡긴다', preview:'김시민 이탈, 황진 영입(자리가 찼으면 교체)', ops:[{op:'leave', id:'kim_simin'}, {op:'recruit', id:'hwang_jin'}] },
      { text:'그대로 둔다', preview:'김시민 이탈, 기물 ‘진주의 북’ 강화(수성 첫 턴 적 전체 동요 2)', ops:[{op:'leave', id:'kim_simin'}, {op:'relic', id:'jinju_drum', up:true}] }
    ],
    memo:'진주 1차 1592.10.5~10. 김시민은 총상을 입고 며칠 뒤 숨졌다.' },  // 2막 뭍길 결산 사건. recruit는 이미 있으면 무시, leave는 없으면 무시

  { id:'E12', key:'cheongbyeong', act:3, title:'명나라에 원군을 청하다',
    text:[
      '의주. 압록강 건너 요동에서 명의 군사가 온다는 말이 몇 달째 오갔다. 이덕형이 여러 번 강을 건너 원군을 청했다.',
      '“명군은 세다. 그러나 밥을 두 배로 먹고, 공은 저희가 가져간다.” 조정의 늙은 신하가 혀를 찼다.',
      '명의 대포와 기병을 얼마나 받을 것인가. 군량은 그만큼 줄 것이다.'
    ],
    choices:[
      { text:'한 부대만 청한다', preview:'명군 카드 2장 가운데 1장 선택', ops:[{op:'offer', pool:'ming', n:2, pick:1}] },
      { text:'군량을 내고 크게 청한다', if:{ration:{gte:30}}, reason:'군량 30이 없다.', preview:'군량 −30, 명군 카드 3장 가운데 2장 선택', ops:[{op:'ration', n:-30}, {op:'offer', pool:'ming', n:3, pick:2}] },
      { text:'요청을 미룬다', preview:'의심 +1, ‘원군 요청’ 카드 2장', ops:[{op:'suspicion', n:1}, {op:'addCard', id:'request_troops', n:2}] }
    ],
    memo:'이덕형이 명에 원군을 청했다. 의주 1592.12.' },  // 3막 열1 조정 사건

  { id:'E13', key:'byeokjegwan', act:3, title:'벽제관',
    text:[
      '벽제관. 평양을 되찾은 이여송이 기세를 몰아 한성으로 내달렸다. 고개 아래에서 고바야카와의 복병이 일어났다.',
      '명의 기병은 진창에 빠졌고 왜의 조총이 쏟아졌다. 이여송은 말을 잃고 물러났다.',
      '그대의 군사는 어디 있었는가. 말릴 것인가, 함께 싸울 것인가, 지켜볼 것인가.'
    ],
    choices:[
      { text:'이여송을 말린다', preview:'군량 +15', ops:[{op:'ration', n:15}] },
      { text:'함께 싸운다', preview:'정예 전투 ‘고바야카와 복병’ → 기물', ops:[{op:'battle', enc:'byeokje_elite'}] },
      { text:'지켜본다', preview:'다음 막까지 명군 카드 군량 비용 +1', ops:[{op:'flag', key:'mingCostDelta', value:1}, {op:'flag', key:'mingCostDeltaUntilAct', value:4}] }
    ],
    memo:'벽제관 1593.1.27. 이여송이 고바야카와의 복병에 꺾였다.' },

  { id:'E14', key:'combs', act:3, title:'참빗과 얼레빗',
    text:[
      '한강 나루. 명군이 지나간 고을마다 백성이 말했다. “왜군은 얼레빗이요 명군은 참빗이다.” 얼레빗은 성기게 긁고 참빗은 촘촘히 긁는다는 뜻이다.',
      '명의 장수가 군량을 내놓으라 했다. 내주면 우리 군사가 굶고, 안 내주면 저들이 백성을 턴다.',
      '군량을 내줄지, 따질지, 백성을 먼저 피신시킬지.'
    ],
    choices:[
      { text:'군량을 내준다', if:{ration:{gte:15}}, reason:'내줄 군량이 없다.', preview:'군량 −15', ops:[{op:'ration', n:-15}] },
      { text:'따진다', preview:'이번 막 명군 카드 군량 비용 +1, 의심 −1', ops:[{op:'flag', key:'mingCostDelta', value:1}, {op:'flag', key:'mingCostDeltaUntilAct', value:3}, {op:'suspicion', n:-1}] },
      { text:'백성을 피신시킨다', preview:'병력 −4, ‘백성의 돌’ 2장', ops:[{op:'hp', n:-4}, {op:'addCard', id:'people_stones', n:2}] }
    ],
    memo:'참빗과 얼레빗 이야기. 명군이 백성을 괴롭혔다. 한강 나루 1593.2.' },

  { id:'E15', key:'hanseong_recovered', act:3, title:'한성 수복',
    text:[
      '왜군이 한성을 비웠다. 사흘 뒤 조선군이 성문을 열고 들어갔다. 길에는 주린 백성과 뼈만 남은 시신이 있었다.',
      '왜군은 남으로 물러가는 중이다. 뒤를 쫓으면 칠 수 있으나, 성 안의 백성은 당장 먹을 것이 없다.',
      '추격할 것인가, 백성을 먹일 것인가, 임금께 장계를 올릴 것인가.'
    ],
    choices:[
      { text:'추격한다', preview:'정예 전투(기마 무사와 창병 둘) → 기물', ops:[{op:'battle', enc:'hanseong_pursuit'}] },
      { text:'백성을 먹인다', if:{ration:{gte:20}}, reason:'나눌 군량이 없다.', preview:'군량 −20, 최대 병력 +6', ops:[{op:'ration', n:-20}, {op:'hp', max:6}] },
      { text:'장계를 올린다', preview:'의심 −2', ops:[{op:'suspicion', n:-2}] }
    ],
    memo:'한성 수복 1593.4.18~20.' },  // 3막 결전 뒤 마디

  { id:'E16', key:'hullyeondogam', act:4, title:'훈련도감',
    text:[
      '한성. 임금이 훈련도감을 세우라 했다. 총을 쏘는 포수, 활을 쏘는 사수, 칼을 쓰는 살수를 함께 기르는 삼수병의 법이다.',
      '“조총은 배워야 쏜다. 왜에게서 배운 법을 우리 군사에게 가르치라.” 도감에 모인 이들은 주린 백성이 대부분이었다.',
      '도감의 쌀을 어디에 쓸 것인가. 군사를 훈련할지, 삼수병을 받을지, 밭을 일굴지.'
    ],
    choices:[
      { text:'군사를 훈련한다', preview:'카드 2장 강화(고른다)', ops:[{op:'upgrade', n:2, choose:true}] },
      { text:'삼수병을 받는다', preview:'‘삼수병’ 2장', ops:[{op:'addCard', id:'samsu', n:2}] },
      { text:'밭을 일군다', preview:'군량 +50', ops:[{op:'ration', n:50}] }
    ],
    memo:'훈련도감을 세웠다 1593. 포수·사수·살수를 함께 길렀다.' },

  { id:'E17', key:'head_is_treasure', act:4, title:'네 머리가 보배다',
    text:[
      '서생포 왜성. 승려 장수 사명당이 가토의 진에 홀로 들어갔다. 가토가 물었다. “조선의 보배는 무엇인가.”',
      '사명당이 답했다. “조선에는 보배가 없다. 보배는 일본에 있다. 네 머리가 보배다.” 가토가 크게 웃었다 한다.',
      '회담에서 무엇을 얻어 올 것인가. 말인가, 정보인가, 양식인가.'
    ],
    choices:[
      { text:'사명당의 회담', preview:'‘회담’ 카드, 의심 −1', ops:[{op:'addCard', id:'parley'}, {op:'suspicion', n:-1}] },
      { text:'가토의 정보', preview:'5막 결전 적 체력 −15%', ops:[{op:'flag', key:'boss5HpPct', value:-0.15}] },
      { text:'양식을 받아 온다', preview:'군량 +30', ops:[{op:'ration', n:30}] }
    ],
    memo:'서생포 회담 1594.4. 사명당과 가토.' },

  { id:'E18', key:'monghak', act:4, title:'이몽학의 난',
    text:[
      '홍산. 이몽학이 “왜를 치러 간다”며 사람을 모아 관아를 쳤다. 난은 열흘을 못 넘기고 무너졌다.',
      '잡힌 자들이 입을 모아 말했다. “김덕령도 함께하기로 했다.” 김덕령은 의병장으로 이름이 높았다. 임금이 그를 잡아 올리라 했다.',
      '한 달 뒤 김덕령은 매를 맞다 옥에서 죽었다. 그대는 그를 변호할 것인가, 입을 다물 것인가, 반군을 칠 것인가.'
    ],
    choices:[
      { text:'김덕령을 변호한다', preview:'의심 +2, ‘결사’ 2장', ops:[{op:'suspicion', n:2}, {op:'addCard', id:'resolve', n:2}] },
      { text:'입을 다문다', preview:'기물 ‘감옥의 쇠사슬’(저주: 의심 +2, 매 턴 군령 +1)', ops:[{op:'relic', id:'chains'}] },
      { text:'반군을 친다', preview:'정예 전투(이몽학 반군) → 기물, 이기면 의심 −1', ops:[{op:'battle', enc:'monghak_elite', onWin:[{op:'suspicion', n:-1}]}] }
    ],
    memo:'이몽학의 난 1596.7 홍산. 김덕령이 옥에서 죽었다 1596.8.' },

  { id:'E19', key:'yoshira', act:4, title:'요시라의 계략',
    text:[
      '경상도. 고니시의 부하 요시라가 조선 장수의 진에 와서 말했다. “가토가 며칠 뒤 바다를 건넌다. 통제사가 나가면 잡을 수 있다.”',
      '조정이 출격을 명했다. 바다를 아는 이는 말했다. “적의 말을 믿고 수군을 내보내면 그물에 드는 것이다.”',
      '나갈 것인가, 거부할 것인가. 아니면 저들의 첩자를 되돌려 쓸 것인가.'
    ],
    choices:[
      { text:'출격한다', if:{hpPct:{gte:20}}, reason:'병력이 너무 적다.', preview:'즉시 정예 해전(안택선과 중선 둘), 시작 병력 −10 → 이기면 의심 −1', ops:[{op:'battle', enc:'yoshira_naval', hpDelta:-10, onWin:[{op:'suspicion', n:-1}]}] },
      { text:'출격하지 않는다', preview:'의심 +3', ops:[{op:'suspicion', n:3}] },
      { text:'첩자를 되돌려 쓴다', if:{hasCard:['counter_spy','scout_boat']}, reason:'덱에 ‘이간질’이나 ‘척후선’이 있어야 한다.', preview:'5막 결전 적 체력 −10%. 의심 그대로', ops:[{op:'flag', key:'boss5HpPct', value:-0.10}, {op:'fx', kind:'banner', key:'counterspy'}] }
    ],
    memo:'요시라의 말 1597.1. 이순신이 파직되는 발단이 되었다.' },  // ③은 계약 §13(의도 공개 → 체력 −10% + 배너)

  { id:'E20', key:'chilcheon', act:5, title:'칠천량',
    text:[
      '7월 16일 새벽, 칠천량. 조정의 독촉에 밀려 나간 함대가 밤새 왜선에 둘러싸였다. 원균이 죽고 이억기가 죽었다. 판옥선 백여 척이 불탔다.',
      '배설이 열두 척을 이끌고 빠져나왔다. 바다가 비었다. 배도, 사람도, 장계도 없다. 남은 것은 열두 척이라는 숫자뿐이다.',
      '임금이 붓을 들었다. “통제사를 다시 부르라.”'
    ],
    choices:[
      { text:'통제사를 다시 부른다', preview:'수군 카드 전부 잃음 → ‘열두 척’·‘필사즉생’ 덱에 → 이억기 전사 → 이순신 복귀', ops:[{op:'flag', key:'chilcheon', value:true}] }
    ],
    memo:'칠천량 1597.7.15~16. 원균과 이억기가 전사하고, 배설이 12척을 건졌다.' },  // 선택지 1개. 처리는 Run §6.6

  { id:'E21', key:'twelve_ships_left', act:5, title:'신에게는 아직 열두 척',
    text:[
      '회령포. 백의종군에서 돌아온 통제사가 남은 배를 세었다. 열두 척이었다.',
      '조정에서 글이 왔다. “수군이 약하니 배를 버리고 권율의 육군에 합치라.” 통제사가 답을 썼다. “신에게는 아직 열두 척의 배가 있사옵니다.”',
      '열두 척으로 무엇을 할 것인가.'
    ],
    variants:[
      { if:{flag:{chilcheon:false}}, patch:{ title:'수군 재건',
        text:[
          '회령포. 칠천량의 화를 면한 함대가 포구에 들었다. 배는 상했고 노꾼들은 지쳤다.',
          '조정은 수군을 의심하지 않았다. 그러나 왜의 대선단이 다시 남해를 덮고 있다.',
          '함대를 어떻게 다시 세울 것인가.'
        ],
        choices:[
          { text:'수군을 다시 세운다', preview:'군량 +30, 병력 +10', ops:[{op:'ration', n:30}, {op:'hp', n:10}] },
          { text:'열두 척의 결의', preview:'‘열두 척’ 1장(이미 있으면 강화)', ops:[{op:'cond', if:{hasCard:'twelve_ships'}, then:[{op:'upgrade', id:'twelve_ships'}], else:[{op:'addCard', id:'twelve_ships'}]}] },
          { text:'장계를 올린다', preview:'의심 −1', ops:[{op:'suspicion', n:-1}] }
        ] } }
    ],
    choices:[
      { text:'수군을 다시 세운다', preview:'‘열두 척’ 1장(이미 있으면 강화)', ops:[{op:'cond', if:{hasCard:'twelve_ships'}, then:[{op:'upgrade', id:'twelve_ships'}], else:[{op:'addCard', id:'twelve_ships'}]}] },
      { text:'수군 폐지 어명을 거부한다', preview:'의심 +2, 최대 병력 +10', ops:[{op:'suspicion', n:2}, {op:'hp', max:10}] },
      { text:'백성의 배를 모은다', preview:'군량 +30', ops:[{op:'ration', n:30}] }
    ],
    memo:'회령포 1597.8.18. 변형: 칠천량을 겪지 않았으면 ‘수군 재건’' },

  { id:'E22', key:'white_robe', act:5, title:'권율의 도원수부',
    text:[
      '정유년 봄, 전라도. 도원수 권율의 진이 남녘 길목에 섰다. 왜군이 다시 바다를 건넜다는 소식이 날마다 왔다.',
      '도원수가 그대의 군사를 둘러보았다. “싸움은 다시 온다. 훈련할 틈은 지금뿐이다.”',
      '도원수부에서 무엇을 얻을 것인가.'
    ],
    variants:[
      { if:{flag:{dismissed:true}}, patch:{ title:'백의종군',
        text:[
          '한성에서 풀려난 전 통제사가 흰옷을 입고 남으로 내려왔다. 벼슬도 군사도 없이, 도원수 권율의 진으로 가는 길이다.',
          '길가의 백성들이 나와 울었다. “통제사 어른, 어디로 가십니까.” 그는 답하지 않고 걸었다.',
          '그대의 군사가 그 길목에 있다. 흰옷의 사내를 따를 것인가.'
        ],
        choices:[
          { text:'통제사를 따른다', preview:'병력 +10', ops:[{op:'hp', n:10}] },
          { text:'도원수부의 군량을 받는다', preview:'군량 +20', ops:[{op:'ration', n:20}] },
          { text:'결사를 다짐한다', preview:'‘결사’ 1장', ops:[{op:'addCard', id:'resolve'}] }
        ] } }
    ],
    choices:[
      { text:'도원수의 훈련', preview:'카드 1장 강화(고른다)', ops:[{op:'upgrade', n:1, choose:true}] },
      { text:'도원수부의 군량을 받는다', preview:'군량 +20', ops:[{op:'ration', n:20}] },
      { text:'결사를 다짐한다', preview:'‘결사’ 1장', ops:[{op:'addCard', id:'resolve'}] }
    ],
    memo:'백의종군 1597.4.1 / 권율 도원수부. 변형: 파직되었으면 ‘백의종군’' },

  { id:'E23', key:'return_tongjesa', act:5, title:'통제사 복귀',
    text:[
      '8월 3일, 임금의 글이 내려왔다. “지난날의 일은 과인의 허물이다. 그대를 다시 삼도수군통제사로 삼노라.”',
      '흰옷의 사내가 다시 갑옷을 입었다. 남은 배와 남은 군사를 찾아 남쪽으로 내려갔다.',
      '이순신이 진중에 합류한다.'
    ],
    choices:[
      { text:'통제사를 맞는다', preview:'이순신 합류(주장·부장이 아니면 특별 부장 자리)', ops:[{op:'recruit', id:'yi', special:true}] }
    ],
    memo:'이순신 복직 1597.8.3.' },  // 5막 결산 사건. 선택지 1개. 이미 주장·부장이면 무시

  { id:'E24', key:'byeokpajin_night', act:6, title:'벽파진의 밤',
    text:[
      '벽파진. 울돌목 앞의 작은 포구에 열세 척이 매였다. 밤마다 왜선의 불빛이 어란포 쪽에서 가까워졌다.',
      '어란포에서 척후가 왔다. “왜선이 백 척을 넘습니다.” 백성들이 배를 끌고 와 진 뒤에 늘어섰다.',
      '울돌목의 밤을 어떻게 보낼 것인가.'
    ],
    choices:[
      { text:'군사를 쉬게 한다', preview:'병력 +20', ops:[{op:'hp', n:20}] },
      { text:'어란포 척후', preview:'결전 첫 손에 ‘척후선’ 2장', ops:[{op:'flag', key:'b6_scouts', value:true}] },
      { text:'백성의 배를 뒤에 세운다', preview:'결전 시작 진형 +10', ops:[{op:'flag', key:'b6_block', value:10}] }
    ],
    memo:'벽파진 1597.9.7~15, 어란포 8.28. 명량 전야.' },

  { id:'E25', key:'pilsa_jeuksaeng', act:6, title:'필사즉생',
    text:[
      '우수영. 통제사가 장수들을 모아 놓고 말했다. “병법에 이르기를, 죽고자 하면 살고 살고자 하면 죽는다 하였다.”',
      '“한 사람이 길목을 지키면 천 사람을 두렵게 할 수 있다. 내일 울돌목에서 싸운다.” 아무도 대답하지 않았으나 아무도 물러서지 않았다.',
      '전야의 결의를 어디에 둘 것인가.'
    ],
    choices:[
      { text:'필사즉생', preview:'‘필사즉생’ 1장(이순신이 주장이면 강화판)', ops:[{op:'cond', if:{leader:'yi'}, then:[{op:'addCard', id:'pilsa_jeuksaeng', up:true}], else:[{op:'addCard', id:'pilsa_jeuksaeng'}]}] },
      { text:'기세를 올린다', preview:'결전 동안 기세 +3', ops:[{op:'flag', key:'b6_momentum', value:3}] },
      { text:'장계를 올린다', preview:'의심 −2', ops:[{op:'suspicion', n:-2}] }
    ],
    memo:'명량 전야 1597.9.15 우수영.' },  // 6막 열5 조정 사건

  { id:'E26', key:'hideyoshi_dies', act:7, title:'히데요시가 죽다',
    text:[
      '왜의 우두머리 히데요시가 죽었다. 소식은 비밀에 부쳐졌으나 가을이 되자 남해안의 왜성마다 철수하는 배가 늘었다.',
      '순천 왜교성의 고니시가 길을 열어 달라 명군에 청했다. 명의 장수들은 뇌물을 받고 눈을 감으려 했다.',
      '돌아가는 적을 칠 것인가, 보낼 것인가, 순천을 먼저 칠 것인가.'
    ],
    choices:[
      { text:'철수하는 적을 친다', preview:'결전 2단계 적 체력 −20, 의심 +1', ops:[{op:'flag', key:'b7_p2Hp', value:-20}, {op:'suspicion', n:1}] },
      { text:'보낸다', preview:'군량 +40', ops:[{op:'ration', n:40}] },
      { text:'순천을 친다', preview:'전투(순천 왜교성, 공성) → 기물', ops:[{op:'battle', enc:'suncheon'}] }
    ],
    memo:'히데요시가 죽었다 1598.8.18. 순천 왜교성 9.20~10.7. 왜군이 물러가기 시작했다.' },

  { id:'E27', key:'chen_lin_wine', act:7, title:'진린의 술',
    text:[
      '고금도. 명 수군의 대장 진린의 배가 진 옆에 닻을 내렸다. 진린은 처음에 조선 수군을 깔보았으나 몇 번의 싸움 뒤 술을 들고 찾아왔다.',
      '“이 공을 함께 아뢰자. 황제께도, 그대 임금께도.” 진린이 잔을 내밀었다.',
      '잔을 받을 것인가, 공을 나눌 것인가, 거절할 것인가.'
    ],
    choices:[
      { text:'술을 받는다', preview:'결전 명 수군 카드 +1', ops:[{op:'flag', key:'b7_mingExtra', add:1}] },
      { text:'공을 나눈다', preview:'의심 −2', ops:[{op:'suspicion', n:-2}] },
      { text:'거절한다', preview:'군량 +20', ops:[{op:'ration', n:20}] }
    ],
    memo:'고금도 본영 1598.2. 진린의 명 수군이 합류했다.' },

  { id:'E28', key:'do_not_announce', act:7, title:'나의 죽음을 알리지 마라',
    text:[
      '고금도의 밤. 순천의 고니시를 구하러 시마즈의 함대가 노량으로 온다는 척후가 들어왔다. 통제사가 갑판에 올라 향을 피웠다.',
      '“이 원수를 갚을 수 있다면 죽어도 한이 없겠습니다.” 그는 장수들을 돌아보며 말했다. “내일 내가 앞에 선다. 싸움이 급하니, 무슨 일이 있어도 북을 멈추지 마라.”',
      '통제사가 직접 북을 치며 싸움을 재촉하면 모든 공격이 매서워진다. 그러나 그 끝은 역사에 적힌 대로다.'
    ],
    variants:[
      { if:{leader:'gwon'}, patch:{
        choices:[
          { text:'‘독전의 북’을 받는다', if:{hasDeputy:'yi'}, reason:'이순신이 진중에 없다.', preview:'결전 첫 손에 ‘독전의 북’(모든 공격 +60%). 결전 뒤 이순신 전사 → 결말 ‘실록’', ops:[{op:'flag', key:'dokjeon', value:true}] },
          { text:'거부한다', preview:'결말 ‘징비’로 가는 길(이순신 생환)', ops:[{op:'flag', key:'dokjeon', value:false}] },
          { text:'명군에 맡긴다', preview:'결전 명 수군 카드 +2, 점수 −100', ops:[{op:'flag', key:'b7_mingExtra', add:2}, {op:'score', n:-100}] }
        ] } }
    ],
    choices:[
      { text:'‘독전의 북’을 받는다', preview:'결전 첫 손에 ‘독전의 북’(모든 공격 +60%). 결전 뒤 이순신 전사 → 결말 ‘실록’', ops:[{op:'flag', key:'dokjeon', value:true}] },
      { text:'거부한다', preview:'결말 ‘징비’로 가는 길(이순신 생환)', ops:[{op:'flag', key:'dokjeon', value:false}] },
      { text:'명군에 맡긴다', preview:'결전 명 수군 카드 +2, 점수 −100', ops:[{op:'flag', key:'b7_mingExtra', add:2}, {op:'score', n:-100}] }
    ],
    memo:'노량 1598.11.19 전야, 고금도 11.18.' },  // 7막 열6 조정 사건. 변형: 권율 주장이면 ①은 이순신 부장 필요

  { id:'E29', key:'court', act:0, title:'조정',
    text:[
      '전하께 아뢰는 자리다. 싸움의 사정을 장계로 올리고, 쓸 만한 장수를 들이고, 명의 군사를 청할 수 있다.',
      '조정은 공을 기억하되 의심도 함께 기억한다. 올린 장계는 의심을 누그러뜨리고, 청한 군사는 군량을 먹는다.'
    ],
    choices:[],
    memo:'조정' }  // 마디 공통. Run이 court 프롬프트로 처리하므로 제목·본문만. 선택지 규칙은 EVENTS.court
  ];

  /* ---------------- 조정·군영 규칙 데이터 (수치는 두지 않는다 — Run이 BAL로 만든다) ---------------- */
  var court = {
    eventId:'E29',
    options:[
      { id:'report',  text:'장계 올리기', desc:'싸움의 전말을 전하께 아뢴다. 임금의 의심이 누그러진다.', always:true, bal:'COURT.report' },
      { id:'recruit', text:'장수 영입', desc:'이 막의 장수 후보 가운데 한 사람을 진중에 들인다. 자리가 찼으면 한 사람과 바꾼다.', reasonNone:'영입할 장수가 없다.' },
      { id:'request', text:'명군 요청', desc:'명의 군사를 청한다. 명군 카드 가운데 하나를 덱에 넣고 군량을 내준다.', minAct:3, bal:'COURT.requestCost', balPick:'COURT.requestPick', reasonAct:'명군은 아직 압록강 너머에 있다.', reasonRation:'내줄 군량이 모자란다.' }
    ],
    lines:{
      enter:'궁궐의 문이 열렸다. 무엇을 아뢸까?',
      after:{ report:'장계가 올라갔다. 전하께서 고개를 끄덕이셨다 한다.', recruit:'새 장수가 진중에 들어왔다. 북소리가 한 번 더 울렸다.', request:'압록강 너머에서 명의 군사가 건너왔다. 군량 창고가 조금 가벼워졌다.' },
      replace:'자리가 찼다. 누구를 내보낼까?'
    }
  };
  var camp = {
    options:[
      { id:'rest',  text:'휴식', desc:'천막을 치고 군사를 쉬게 한다. 병력이 돌아온다.', bal:'CAMP.restPct' },
      { id:'train', text:'훈련', desc:'카드 1장을 골라 강화한다.' },
      { id:'farm',  text:'농사', desc:'군사가 밭을 갈아 군량을 거둔다.', bal:'CAMP.farm' }
    ],
    lines:{
      enter:'천막이 섰다. 하루를 어떻게 쓸까?',
      after:{ rest:'군사들이 불가에서 잠들었다. 아침에 북소리가 가벼웠다.', train:'활시위를 당기는 소리가 밤늦도록 났다.', farm:'가을걷이가 끝났다. 수레에 쌀이 실렸다.' }
    }
  };

  /* ---------------- 색인 ---------------- */
  var byId = {}, byKey = {};
  for (var i = 0; i < list.length; i++) { byId[list[i].id] = list[i]; byKey[list[i].key] = list[i]; }
  function get(id) { var e = byId[id]; if (!e) throw new Error('EVENTS: 없는 id ' + id); return e; }

  /* ---------------- selfTest ---------------- */
  var KEYS = ['dongnae','sayaga','joryeong_or_tangeumdae','king_leaves','turtle_launch','red_general','ichi_pass','geumsan_twice','jincheonroe','busanpo_jeongun',
    'kim_simin_wound','cheongbyeong','byeokjegwan','combs','hanseong_recovered','hullyeondogam','head_is_treasure','monghak','yoshira','chilcheon',
    'twelve_ships_left','white_robe','return_tongjesa','byeokpajin_night','pilsa_jeuksaeng','hideyoshi_dies','chen_lin_wine','do_not_announce','court'];
  var OPS_COMMON = ['suspicion','ration','hp','addCard','removeCard','upgrade','relic','flag','leave','cond','fx','score'];
  var OPS_BATTLE = ['dmg','block','push','pull','draw','energy','status','stun','buff','exhaustHand','discard','exhaust','retrieve','mark','delay','stripBlock'];
  var OPS_RUN = ['battle','recruit','ending','offer'];
  var HOOKS = ['onBattleStart','onTurnStart','onTurnEnd','onCardPlayed','onCardDrawn','onDamageDealt','onDamageTaken','onDistanceChange','onEnemyDeath','onEnemySpawn','onWaveStart','onHpZero','onBattleEnd','onActStart','onAcquire'];
  var COND_KEYS = ['dist','distNot','hpPct','naval','siege','assault','field','turn','turnLte','hasWall','tide','wave','cardTag','cardType','cardPool','cardId','cardMarked',
    'enemyId','enemyTag','handCount','cardsPlayedThisTurn','deckTagCount','hasCard','hasRelic','hasDeputy','noDeputy','flag','leader','lane','act','actGte','ration','suspicion','slotsFree','oncePerBattle','oncePerTurn'];
  var ID_RE = /^[a-z][a-z0-9_]*$/;
  var DEPUTIES = ['gwon','yi','yi_eokgi','kim_simin','jeong_munbu','jo_heon','hwang_jin','yi_jeongam'];
  var RELICS = ['turtle_blueprint','jincheonroe_relic','hwacha_relic','nanjung_relic','jingbirok','tonga','hangwae_gun','obangnang','seoae_brush','chains','joryeong_stone','hansan_drum','jinju_drum','haengju_ash','jiksan_spear','myeongnyang_chain','tongjeyeong_flag'];
  var CHOOSE_OPS = ['discard','exhaust','retrieve','upgrade'];

  function has(arr, v) { return arr.indexOf(v) >= 0; }
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  function checkPlain(v, path, errors) {
    if (v === undefined || typeof v === 'function') { errors.push(path + ': JSON 왕복 불가 값(' + typeof v + ')'); return; }
    if (v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) checkPlain(v[i], path + '[' + i + ']', errors); return; }
    if (Object.getPrototypeOf(v) !== Object.prototype) { errors.push(path + ': 순수 객체가 아님'); return; }
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) checkPlain(v[k], path + '.' + k, errors);
  }
  function checkCond(c, path, errors) {
    if (!isObj(c)) { errors.push(path + ': cond가 객체가 아님'); return; }
    for (var k in c) if (!has(COND_KEYS, k)) errors.push(path + ': 모르는 cond 키 ' + k);
  }
  function refId(v, path, errors, refs, bucket) {
    if (typeof v !== 'string' || !ID_RE.test(v)) { errors.push(path + ': ID 형식 오류 ' + JSON.stringify(v)); return; }
    refs[bucket].push(v);
  }
  // ctx: 'run'(사건 선택지) | 'battle'(battle.handlers 안)
  function walkOps(ops, ctx, path, errors, refs, inCard) {
    if (!Array.isArray(ops)) { errors.push(path + ': ops가 배열이 아님'); return; }
    for (var i = 0; i < ops.length; i++) {
      var o = ops[i], p = path + '[' + i + ']';
      if (!isObj(o) || typeof o.op !== 'string') { errors.push(p + ': op 객체가 아님'); continue; }
      var allowed = ctx === 'run' ? OPS_COMMON.concat(OPS_RUN) : OPS_COMMON.concat(OPS_BATTLE);
      if (!has(allowed, o.op)) { errors.push(p + ': ' + ctx + ' 맥락에서 허용되지 않는 op ' + o.op); continue; }
      if (o.choose === true && (!inCard || !has(CHOOSE_OPS, o.op))) {
        if (!(ctx === 'run' && o.op === 'upgrade')) errors.push(p + ': choose:true는 카드 ops 안(또는 판 upgrade)에서만');
      }
      switch (o.op) {
        case 'cond':
          checkCond(o['if'], p + '.if', errors);
          walkOps(o.then, ctx, p + '.then', errors, refs, inCard);
          if (o['else'] !== undefined) walkOps(o['else'], ctx, p + '.else', errors, refs, inCard);
          break;
        case 'addCard': case 'removeCard':
          if (o.id !== undefined) refId(o.id, p + '.id', errors, refs, 'cards');
          if (o.pool !== undefined && typeof o.pool !== 'string') errors.push(p + '.pool: 문자열 아님');
          if (o.id === undefined && o.pool === undefined && o.op === 'addCard') errors.push(p + ': addCard에 id도 pool도 없음');
          break;
        case 'upgrade': if (o.id !== undefined) refId(o.id, p + '.id', errors, refs, 'cards'); break;
        case 'relic': refId(o.id, p + '.id', errors, refs, 'relics'); break;
        case 'recruit': case 'leave': refId(o.id, p + '.id', errors, refs, 'deputies'); break;
        case 'flag':
          if (typeof o.key !== 'string' || !o.key) errors.push(p + ': flag key 없음');
          if (o.value === undefined && o.add === undefined) errors.push(p + ': flag에 value도 add도 없음');
          break;
        case 'offer':
          if (o.ids !== undefined) { if (!Array.isArray(o.ids)) errors.push(p + '.ids: 배열 아님'); else for (var j = 0; j < o.ids.length; j++) refId(o.ids[j], p + '.ids[' + j + ']', errors, refs, 'cards'); }
          else if (typeof o.pool !== 'string') errors.push(p + ': offer에 pool도 ids도 없음');
          if (typeof o.n !== 'number' || typeof o.pick !== 'number' || o.pick > o.n) errors.push(p + ': offer n/pick 오류');
          break;
        case 'battle':
          refId(o.enc, p + '.enc', errors, refs, 'encs');
          if (o.onWin !== undefined) walkOps(o.onWin, 'run', p + '.onWin', errors, refs, false);
          if (o.handlers !== undefined) {
            if (!Array.isArray(o.handlers)) { errors.push(p + '.handlers: 배열 아님'); break; }
            for (var h = 0; h < o.handlers.length; h++) {
              var hd = o.handlers[h], hp = p + '.handlers[' + h + ']';
              if (!isObj(hd) || !has(HOOKS, hd.hook)) errors.push(hp + ': 모르는 훅 ' + (hd && hd.hook));
              if (hd && hd.cond !== undefined) checkCond(hd.cond, hp + '.cond', errors);
              if (hd) walkOps(hd.ops, 'battle', hp + '.ops', errors, refs, false);
            }
          }
          break;
        case 'suspicion': case 'ration': case 'score':
          if (typeof o.n !== 'number') errors.push(p + ': n이 숫자 아님');
          break;
        case 'hp':
          if (o.n === undefined && o.max === undefined && o.pct === undefined) errors.push(p + ': hp에 n/max/pct 없음');
          break;
        case 'fx': if (typeof o.kind !== 'string') errors.push(p + ': fx kind 없음'); break;
        case 'dmg': if (typeof o.n !== 'number' || typeof o.tag !== 'string') errors.push(p + ': dmg n/tag 오류'); break;
        default: break;
      }
    }
  }
  function checkChoice(c, path, errors, refs) {
    if (!isObj(c)) { errors.push(path + ': 선택지가 객체 아님'); return; }
    if (typeof c.text !== 'string' || !c.text) errors.push(path + ': text 없음');
    if (c.preview !== undefined && typeof c.preview !== 'string') errors.push(path + ': preview 문자열 아님');
    if (c['if'] !== undefined) checkCond(c['if'], path + '.if', errors);
    if (c.hidden !== undefined && (c.hidden !== true || c['if'] === undefined)) errors.push(path + ': hidden은 if와 함께 true만');
    if (c.reason !== undefined && (typeof c.reason !== 'string' || c['if'] === undefined)) errors.push(path + ': reason은 if와 함께 문자열만');
    walkOps(c.ops, 'run', path + '.ops', errors, refs, false);
  }
  function checkText(t, path, errors) {
    if (!Array.isArray(t) || t.length < 1 || t.length > 4) { errors.push(path + ': text는 문단 1~4개'); return; }
    for (var i = 0; i < t.length; i++) if (typeof t[i] !== 'string' || !t[i]) errors.push(path + '[' + i + ']: 빈 문단');
  }

  function selfTest() {
    var errors = [], refs = { cards:[], relics:[], deputies:[], encs:[] };
    if (list.length !== 29) errors.push('사건 수 ' + list.length + ' ≠ 29');
    var seenId = {}, seenKey = {};
    for (var i = 0; i < list.length; i++) {
      var e = list[i], p = 'E[' + i + ']';
      if (!isObj(e)) { errors.push(p + ': 객체 아님'); continue; }
      p = e.id || p;
      if (e.id !== 'E' + (i + 1)) errors.push(p + ': id 순서 오류(기대 E' + (i + 1) + ')');
      if (e.key !== KEYS[i]) errors.push(p + ': key 오류 ' + e.key + ' (기대 ' + KEYS[i] + ')');
      if (seenId[e.id]) errors.push(p + ': id 중복'); seenId[e.id] = true;
      if (seenKey[e.key]) errors.push(p + ': key 중복 ' + e.key); seenKey[e.key] = true;
      if (typeof e.act !== 'number' || e.act < 0 || e.act > 7) errors.push(p + ': act 범위 오류');
      if (typeof e.title !== 'string' || !e.title) errors.push(p + ': title 없음');
      if (typeof e.memo !== 'string') errors.push(p + ': memo 없음');
      checkText(e.text, p + '.text', errors);
      if (!Array.isArray(e.choices)) { errors.push(p + ': choices 배열 아님'); continue; }
      var want = e.id === 'E29' ? 0 : (e.id === 'E20' || e.id === 'E23') ? 1 : 3;
      if (want === 0 ? e.choices.length !== 0 : want === 1 ? e.choices.length !== 1 : e.choices.length < 3) errors.push(p + ': 선택지 수 ' + e.choices.length + ' (기대 ' + (want === 3 ? '3 이상' : want) + ')');
      for (var c = 0; c < e.choices.length; c++) checkChoice(e.choices[c], p + '.choices[' + c + ']', errors, refs);
      if (e.variants !== undefined) {
        if (!Array.isArray(e.variants)) errors.push(p + '.variants: 배열 아님');
        else for (var v = 0; v < e.variants.length; v++) {
          var va = e.variants[v], vp = p + '.variants[' + v + ']';
          if (!isObj(va) || !isObj(va.patch)) { errors.push(vp + ': {if, patch} 아님'); continue; }
          checkCond(va['if'], vp + '.if', errors);
          for (var k in va.patch) if (!has(['title','text','choices'], k)) errors.push(vp + '.patch: 모르는 키 ' + k);
          if (va.patch.title !== undefined && typeof va.patch.title !== 'string') errors.push(vp + '.patch.title: 문자열 아님');
          if (va.patch.text !== undefined) checkText(va.patch.text, vp + '.patch.text', errors);
          if (va.patch.choices !== undefined) {
            if (!Array.isArray(va.patch.choices) || va.patch.choices.length < 1) errors.push(vp + '.patch.choices: 배열(1개 이상) 아님');
            else for (var pc = 0; pc < va.patch.choices.length; pc++) checkChoice(va.patch.choices[pc], vp + '.patch.choices[' + pc + ']', errors, refs);
          }
        }
      }
      for (var ek in e) if (!has(['id','key','act','title','text','memo','variants','choices'], ek)) errors.push(p + ': 모르는 필드 ' + ek);
    }
    checkPlain(list, 'EVENTS.list', errors);
    checkPlain(court, 'EVENTS.court', errors);
    checkPlain(camp, 'EVENTS.camp', errors);
    try { if (JSON.stringify(JSON.parse(JSON.stringify(list))) !== JSON.stringify(list)) errors.push('EVENTS.list: JSON 왕복 불일치'); }
    catch (ex) { errors.push('EVENTS.list: JSON 왕복 예외 ' + ex.message); }
    // 참조 ID: 부장·기물은 계약 §3.4 목록과 대조. 카드·편성은 형식만(전역이 있으면 존재까지)
    var d, r, s;
    for (d = 0; d < refs.deputies.length; d++) if (!has(DEPUTIES, refs.deputies[d])) errors.push('모르는 부장 ID ' + refs.deputies[d]);
    for (r = 0; r < refs.relics.length; r++) if (!has(RELICS, refs.relics[r])) errors.push('모르는 기물 ID ' + refs.relics[r]);
    if (typeof CARDS !== 'undefined' && CARDS && CARDS.byId) for (s = 0; s < refs.cards.length; s++) if (!CARDS.byId[refs.cards[s]]) errors.push('CARDS에 없는 카드 ID ' + refs.cards[s]);
    if (typeof ENEMIES !== 'undefined' && ENEMIES && ENEMIES.encounters && ENEMIES.encounters.byId) for (s = 0; s < refs.encs.length; s++) if (!ENEMIES.encounters.byId[refs.encs[s]]) errors.push('ENEMIES에 없는 편성 ID ' + refs.encs[s]);
    if (typeof GENERALS !== 'undefined' && GENERALS && GENERALS.relics && GENERALS.relics.byId) for (s = 0; s < refs.relics.length; s++) if (!GENERALS.relics.byId[refs.relics[s]]) errors.push('GENERALS에 없는 기물 ID ' + refs.relics[s]);
    // court/camp 구조
    var ids = court.options.map(function (o) { return o.id; }).join(',');
    if (ids !== 'report,recruit,request') errors.push('EVENTS.court.options id 순서 오류: ' + ids);
    ids = camp.options.map(function (o) { return o.id; }).join(',');
    if (ids !== 'rest,train,farm') errors.push('EVENTS.camp.options id 순서 오류: ' + ids);
    if (!byId.E29 || court.eventId !== 'E29') errors.push('EVENTS.court.eventId는 E29');
    return { ok: errors.length === 0, errors: errors };
  }

  var api = { list: list, byId: byId, byKey: byKey, get: get, court: court, camp: camp, selfTest: selfTest };
  return api;
})();
