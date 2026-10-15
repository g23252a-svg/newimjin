/* ===== 06_map.js — 7막 고정 지도: 49열·77마디(좌표·도·날짜·종류·연결)·지형 7 ===== */
// 계약서 §3.6 스키마·노드 ID 규칙(a{막}_{슬러그}, 2막은 a2s_/a2l_)·노드 지침을 그대로 옮겼다. 수치·콘텐츠는 DESIGN §5.1~5.7·§6.3.
// 「마디 49」는 열(列) 수다(7/8/8/6/7/6/7). 한 열에 마디가 둘 이상이면 하나를 고른다. 마디 객체는 77개.
// 지형 mods 는 계약 §3.6 본문(fort {} · port/strait {startDist:0} · waeseong {enemyGunPct})을 따른다 —
//   성벽 10·적 성벽 15는 전투 유형이 주고, 조류는 boss_myeongnyang.mods.tide 만(한산·노량 조류는 2순위).
// TODO(통합): Run(08) — 2막 열1 마디에 들어갈 때 `G.flags.lane2 = node.lane` 로 기록할 것. first(2, flags)·acts[2].endEvent 의 lane 키가 이 플래그를 본다.
// TODO(통합): Run(08) — 노드 variants 는 Run 이 첫 일치 항목의 patch 를 Object.assign 으로 덮어쓴다(a1_boss 는 name·blurb 만, a5_busan_sea 는 kind·eventId 등). patch 의 null 은 「없음」.
// TODO(통합): Run(08) — court.recruits 에서 주장과 같은 인물(이순신 주장이면 'yi', 권율 주장이면 'gwon')·이미 영입·away·사망을 걸러서 보일 것. 후보가 0이면 천거를 비활성(reason).
// TODO(통합): Run(08) — a1_boss 는 terrain 'none'. b1 플래그로 ridge/river/fort mods 를 Run 이 덮어쓴다(계약 §6.8). 운봉(a5_unbong)은 enc 'unbong'; ENEMIES 에 없으면 Run 이 'pool' 로 대체해도 된다.
// TODO(통합): ENEMIES(03) — 참조 편성: tut_busan tut_gijang tut_sangju okpo dangpo danghangpo_elite yulpo gyeonnaeryang jeongam cheongju_elite yeonan pyongyang doksan namwon hwangseoksan unbong busan_sea eoranpo ulsan sacheon suncheon · 결전 boss_konishi boss_wakizaka boss_jinju1 boss_haengju boss_jiksan boss_myeongnyang boss_noryang.
// TODO(통합): EVENTS(05) — E7 ③ 의 battle(ichi_hold)은 a2l_ichi 의 지형 ridge 를 받는다. E9 ① gyeongju 는 terrain none(공성 유형이 적 성벽 15를 준다).
// TODO(통합): TXT(01) — TXT.date 는 '1592.4.14' · '1592.6'(월만) · '1592.10.5~10'(일 범위) · '1592.7.10~8.18'(월.일 범위) · '1597.12.22~1.4'(해 넘김 범위) 다섯 꼴을 받아야 한다.
var MAPDATA = (function(){ 'use strict';
  var BAL = Core.BAL;
  var DATE_RE = /^\d{4}\.\d{1,2}(\.\d{1,2})?(~\d{1,2}(\.\d{1,2})?)?$/;
  var ID_RE = /^[a-z][a-z0-9_]*$/, EV_RE = /^E\d{1,2}$/;
  var KINDS = ['fight','elite','event','camp','shop','court','boss','council'];
  var TYPES = ['field','siege','assault','naval'];
  var DOS = ['경상','전라','충청','경기','강원','황해','평안','함경','남해','서해','—'];
  var RUN_OPS = ['suspicion','ration','hp','addCard','removeCard','upgrade','relic','flag','leave','cond','fx','score','battle','recruit','ending','offer'];
  // 지도 화면 1280×720 배치: 열 간격 150, 왼쪽 x 90. 2막은 위 바다길 y≈200 / 아래 뭍길 y≈520. 한 열에 둘 이상이면 y 를 나눈다.
  var LAYOUT = { x0:90, xGap:150, yMid:360, ySea:200, yLand:520, ySpread:140, yLaneSpread:100, w:1280, h:720 };

  /* ------------------------------------------------------------ 지형 7 (+none) — DESIGN §6.3, mods 키는 계약 §5.4 */
  var TERRAINS = [
    { id:'plain',    name:'평지', hanja:'平地', desc:'돌격 카드 비용 −1.',                                 mods:{ chargeCostDelta:-1 } },
    { id:'ridge',    name:'고개', hanja:'嶺',   desc:'원거리 시작. 적이 2턴 전진하지 않는다. 턴 시작마다 진형 +5.', mods:{ startDist:0, noAdvanceTurns:BAL.RIDGE_HOLD, blockPerTurn:BAL.RIDGE_BLOCK } },
    { id:'river',    name:'강',   hanja:'江',   desc:'배수진. 밀어내기가 듣지 않는다. 기세 +3.',               mods:{ noPush:true, momentum:BAL.RIVER_MOMENTUM } },
    { id:'fort',     name:'산성', hanja:'山城', desc:'수성. 아군 성벽 10으로 시작한다.',                         mods:{} },
    { id:'port',     name:'포구', hanja:'浦口', desc:'원거리 시작. 조류는 없다.',                                 mods:{ startDist:0 } },
    { id:'strait',   name:'해협', hanja:'海峽', desc:'원거리 시작. 울돌목에서는 물이 바뀐다.',                     mods:{ startDist:0 } },
    { id:'waeseong', name:'왜성', hanja:'倭城', desc:'공성. 적 성벽 15. 적 조총 피해 +20%.',                     mods:{ enemyGunPct:BAL.WAESEONG_GUN_PCT } },
    { id:'none',     name:'—',    hanja:'',     desc:'',                                                       mods:{} }
  ];

  /* ------------------------------------------------------------ 막 7 — DESIGN §5 제목·시기. cols 는 아래 마디에서 조립 */
  var ACT_DEFS = [
    { act:1, no:'1', name:'임진', title:'검은 돛',       period:'1592년 4월~5월',           bg:'south',   lanes:false, endEvent:{ default:'E4' } },
    { act:2, no:'2', name:'임진', title:'한산',          period:'1592년 5월~10월',          bg:'sea',     lanes:true,  endEvent:{ sea:'E10', land:'E11' } },
    { act:3, no:'3', name:'계사', title:'평양과 행주',   period:'1593년 1월~6월',           bg:'north',   lanes:false, endEvent:null },
    { act:4, no:'4', name:'갑오', title:'휴전',          period:'1593년 10월~1597년 1월',   bg:'palace',  lanes:false, endEvent:null },
    { act:5, no:'5', name:'정유', title:'다시 검은 돛',  period:'1597년 1월~9월',           bg:'west',    lanes:false, endEvent:{ default:'E23' } },
    { act:6, no:'6', name:'정유', title:'명량',          period:'1597년 8월~9월',           bg:'strait',  lanes:false, endEvent:null },
    { act:7, no:'7', name:'무술', title:'노량',          period:'1597년 12월~1598년 11월',  bg:'noryang', lanes:false, endEvent:null }
  ];

  /* ------------------------------------------------------------ 마디 77 — DESIGN §5.1~5.7. 한 줄에 하나. x·y 는 layout() 이 채운다 */
  var RAW = [
    // 1막 임진 ‘검은 돛’ — 7열
    { act:1, col:1, id:'a1_busan',     kind:'fight', type:'siege', enc:'tut_busan',  terrain:'fort',  name:'부산진',  do:'경상', date:'1592.4.14',    blurb:'검은 돛이 바다를 덮었다. 성 위에서 활을 당겨라.' },
    { act:1, col:2, id:'a1_dongnae',   kind:'event', eventId:'E1',                   terrain:'none',  name:'동래',    do:'경상', date:'1592.4.15',    blurb:'싸워 죽기는 쉬우나 길을 빌려주기는 어렵다.' },
    { act:1, col:3, id:'a1_gijang',    kind:'fight', type:'field', enc:'tut_gijang', terrain:'plain', name:'기장',    do:'경상', date:'1592.4.17~19', blurb:'창이 중거리까지 왔다. 창을 세워 밀어내라.' },
    { act:1, col:3, id:'a1_miryang',   kind:'camp',                                  terrain:'none',  name:'밀양',    do:'경상', date:'1592.4.17~19', blurb:'잠시 숨을 고른다. 북으로 가는 길은 멀다.' },
    { act:1, col:3, id:'a1_eonyang',   kind:'event', eventId:'E2',                   terrain:'none',  name:'언양',    do:'경상', date:'1592.4.17~19', blurb:'조총을 든 왜인이 투항을 청해 왔다.' },
    { act:1, col:4, id:'a1_sangju',    kind:'fight', type:'field', enc:'tut_sangju', terrain:'none',  name:'상주',    do:'경상', date:'1592.4.25',    blurb:'붙었다. 근접에서 왜검은 한 배 반이다.' },
    { act:1, col:4, id:'a1_mungyeong', kind:'shop',                                  terrain:'none',  name:'문경',    do:'경상', date:'1592.4.25',    blurb:'새재 아래 시장. 고개를 오르기 전에 카드를 고른다.' },
    { act:1, col:4, id:'a1_seonsan',   kind:'camp',                                  terrain:'none',  name:'선산',    do:'경상', date:'1592.4.25',    blurb:'낙동강 가에 진을 치고 하룻밤을 쉰다.' },
    { act:1, col:5, id:'a1_chungju',   kind:'event', eventId:'E3',                   terrain:'none',  name:'충주',    do:'충청', date:'1592.4.27',    blurb:'조령에 설 것인가, 탄금대에 설 것인가.' },
    { act:1, col:6, id:'a1_hanseong',  kind:'court', recruits:['gwon','yi','yi_jeongam'], courtOps:{ report:[{ op:'relic', id:'seoae_brush' }] },
                                                                                     terrain:'none',  name:'한성(조정)', do:'경기', date:'1592.4.27', blurb:'도성의 조정. 장계를 올리거나 장수를 영입한다.' },
    { act:1, col:7, id:'a1_boss',      kind:'boss', type:'field', bossEnc:'boss_konishi', terrain:'none', name:'조령 / 탄금대', do:'충청', date:'1592.4.28', blurb:'고니시의 선봉이 고개 아래에 닿았다.',
      variants:[ { if:{ flag:{ b1:'ridge' } }, patch:{ name:'조령',   blurb:'새재 위에서 기다린다. 고개는 우리 편이다.' } },
                 { if:{ flag:{ b1:'river' } }, patch:{ name:'탄금대', blurb:'등 뒤는 강이다. 물러설 곳이 없다.' } },
                 { if:{ flag:{ b1:'fort' } },  patch:{ name:'충주성', blurb:'성문을 닫고 성가퀴 뒤에 선다.' } } ] },
    // 2막 ‘한산’ 바닷길 — 8열 (lane sea)
    { act:2, col:1, id:'a2s_okpo',         lane:'sea', kind:'fight', type:'naval', enc:'okpo',             terrain:'port',   name:'옥포',       do:'남해', date:'1592.5.7', blurb:'첫 해전. 원거리에서 총통을 쏘고 물러난다.' },
    { act:2, col:2, id:'a2s_sacheon',      lane:'sea', kind:'event', eventId:'E5',                         terrain:'none',   name:'사천',       do:'남해', date:'1592.5.29', blurb:'거북선이 처음 바다에 나간다.' },
    { act:2, col:3, id:'a2s_dangpo',       lane:'sea', kind:'fight', type:'naval', enc:'dangpo',           terrain:'port',   name:'당포',       do:'남해', date:'1592.6.2', blurb:'포구에 정박한 왜선을 친다.' },
    { act:2, col:3, id:'a2s_danghangpo',   lane:'sea', kind:'elite', type:'naval', enc:'danghangpo_elite', elite:true, terrain:'port', name:'당항포', do:'남해', date:'1592.6.5', blurb:'큰 배가 보인다. 대장선을 유인해 끌어낸다.' },
    { act:2, col:4, id:'a2s_yeosu_camp',   lane:'sea', kind:'camp',                                        terrain:'none',   name:'여수 좌수영(군영)', do:'전라', date:'1592.6', blurb:'좌수영에서 노꾼들을 쉬게 한다.' },
    { act:2, col:4, id:'a2s_yeosu_shop',   lane:'sea', kind:'shop',                                        terrain:'none',   name:'여수 좌수영(시장)', do:'전라', date:'1592.6', blurb:'좌수영 시장. 총통과 화약을 갖춘다.' },
    { act:2, col:5, id:'a2s_yulpo',        lane:'sea', kind:'fight', type:'naval', enc:'yulpo',            terrain:'port',   name:'율포',       do:'남해', date:'1592.6.7', blurb:'달아나는 왜선을 쫓아 포구 앞에서 친다.' },
    { act:2, col:5, id:'a2s_jeokjinpo',    lane:'sea', kind:'camp',                                        terrain:'none',   name:'적진포',     do:'남해', date:'1592.6.7', blurb:'포구에 닻을 내리고 배를 손본다.' },
    { act:2, col:6, id:'a2s_gyeonnaeryang', lane:'sea', kind:'fight', type:'naval', enc:'gyeonnaeryang',   terrain:'strait', name:'견내량',     do:'남해', date:'1592.7.7', blurb:'좁은 물길. 척후선이 먼저 눈에 띈다.' },
    { act:2, col:7, id:'a2s_jwasuyeong',   lane:'sea', kind:'court', recruits:['yi_eokgi'],                terrain:'none',   name:'전라좌수영(조정)', do:'전라', date:'1592.7', blurb:'좌수영 본영. 장계를 쓰고 장수를 부른다.' },
    { act:2, col:8, id:'a2s_hansan',       lane:'sea', kind:'boss', type:'naval', bossEnc:'boss_wakizaka', terrain:'strait', name:'한산도',     do:'남해', date:'1592.7.8', blurb:'넓은 바다로 끌어내어 학의 날개로 감싼다.' },
    // 2막 ‘한산’ 뭍길 — 8열 (lane land)
    { act:2, col:1, id:'a2l_uiryeong',     lane:'land', kind:'event', eventId:'E6',                        terrain:'none',  name:'의령',       do:'경상', date:'1592.4.22', blurb:'붉은 옷의 장수가 의령에서 일어났다.' },
    { act:2, col:2, id:'a2l_jeongam',      lane:'land', kind:'fight', type:'field', enc:'jeongam',         terrain:'none',  name:'정암진',     do:'경상', date:'1592.5', blurb:'나루에 매복한다. 적이 다가올 때 친다.' },
    { act:2, col:3, id:'a2l_ichi',         lane:'land', kind:'event', eventId:'E7',                        terrain:'ridge', name:'이치',       do:'전라', date:'1592.7.8', blurb:'고개를 지킨다. 전라로 가는 길목이다.' },
    { act:2, col:4, id:'a2l_geumsan',      lane:'land', kind:'event', eventId:'E8',                        terrain:'plain', name:'금산',       do:'충청', date:'1592.7.10~8.18', blurb:'금산에서 두 번 싸웠고 두 번 모두 돌아오지 못했다.' },
    { act:2, col:4, id:'a2l_cheongju',     lane:'land', kind:'elite', type:'field', enc:'cheongju_elite', elite:true, terrain:'none', name:'청주', do:'충청', date:'1592.8.1', blurb:'조총병 셋이 번갈아 장전한다. 쏘는 차례를 읽어라.' },
    { act:2, col:5, id:'a2l_yeonan',       lane:'land', kind:'fight', type:'siege', enc:'yeonan',          terrain:'fort',  name:'연안성',     do:'황해', date:'1592.8.28~9.2', blurb:'작은 성, 닷새의 농성. 끓는 물을 준비한다.',
      onWin:[ { op:'recruit', id:'yi_jeongam', optional:true } ] },
    { act:2, col:5, id:'a2l_gyeongju',     lane:'land', kind:'event', eventId:'E9',                        terrain:'none',  name:'경주',       do:'경상', date:'1592.9.8', blurb:'성 안으로 날아든 쇳덩이가 터진다.' },
    { act:2, col:6, id:'a2l_changwon',     lane:'land', kind:'camp',                                       terrain:'none',  name:'창원',       do:'경상', date:'1592.9', blurb:'창원에 진을 치고 병사를 쉬게 한다.' },
    { act:2, col:6, id:'a2l_hapcheon',     lane:'land', kind:'shop',                                       terrain:'none',  name:'합천',       do:'경상', date:'1592.9', blurb:'합천 시장. 의병의 창과 돌을 갖춘다.' },
    { act:2, col:7, id:'a2l_jinju_court',  lane:'land', kind:'court', recruits:['kim_simin','jeong_munbu'], terrain:'none', name:'진주 목사영(조정)', do:'경상', date:'1592.10', blurb:'진주 목사영. 장계를 올리고 장수를 영입한다.' },
    { act:2, col:8, id:'a2l_jinju',        lane:'land', kind:'boss', type:'siege', bossEnc:'boss_jinju1',  terrain:'fort',  name:'진주성',     do:'경상', date:'1592.10.5~10', blurb:'성벽에 선다. 엿새를 버티면 이긴다.' },
    // 3막 계사 ‘평양과 행주’ — 8열
    { act:3, col:1, id:'a3_uiju',          kind:'court', firstCourt:true, courtEvent:'E12', recruits:[],   terrain:'none',     name:'의주(조정)', do:'평안', date:'1592.12', blurb:'압록강 가, 임금이 머무는 곳. 명에 원군을 청하는 글이 간다.' },
    { act:3, col:2, id:'a3_pyongyang',     kind:'fight', type:'assault', enc:'pyongyang',                  terrain:'waeseong', name:'평양성',   do:'평안', date:'1593.1.6~8', blurb:'명군과 함께 평양성을 친다. 성벽이 높다.' },
    { act:3, col:3, id:'a3_byeokjegwan',   kind:'event', eventId:'E13',                                    terrain:'none',     name:'벽제관',   do:'경기', date:'1593.1.27', blurb:'벽제관의 진창. 명군 기병이 복병에 걸렸다.' },
    { act:3, col:4, id:'a3_gaeseong',      kind:'camp',                                                    terrain:'none',     name:'개성',     do:'경기', date:'1593.2', blurb:'옛 도읍에 진을 치고 쉰다.' },
    { act:3, col:4, id:'a3_paju',          kind:'shop',                                                    terrain:'none',     name:'파주',     do:'경기', date:'1593.2', blurb:'파주 시장. 한강을 건너기 전에 갖춘다.' },
    { act:3, col:4, id:'a3_hangang',       kind:'event', eventId:'E14',                                    terrain:'none',     name:'한강 나루', do:'경기', date:'1593.2', blurb:'참빗과 얼레빗. 백성은 누구를 더 무서워하는가.' },
    { act:3, col:5, id:'a3_doksan',        kind:'fight', type:'siege', enc:'doksan',                       terrain:'fort',     name:'독산성',   do:'경기', date:'1592.12', blurb:'물 없는 산성. 말을 씻는 체하여 적을 속인다.',
      onWin:[ { op:'offer', ids:['sema'], n:1, pick:1 } ] },
    { act:3, col:6, id:'a3_haengju_court', kind:'court', recruits:['hwang_jin'],                           terrain:'none',     name:'행주 진영(조정)', do:'경기', date:'1593.2.11', blurb:'행주 진영. 결전 전야의 조정.' },
    { act:3, col:7, id:'a3_haengju',       kind:'boss', type:'siege', bossEnc:'boss_haengju',              terrain:'fort',     name:'행주산성', do:'경기', date:'1593.2.12', blurb:'아래는 강이요 위는 하늘이다. 세 번 막는다.' },
    { act:3, col:8, id:'a3_hanseong',      kind:'event', eventId:'E15',                                    terrain:'none',     name:'한성 수복', do:'경기', date:'1593.4.18~20', blurb:'왜군이 물러갔다. 도성으로 돌아온다.' },
    // 4막 ‘휴전’ — 6열 (전투 없음)
    { act:4, col:1, id:'a4_hullyeon',      kind:'event', eventId:'E16',                                    terrain:'none', name:'훈련도감',   do:'경기', date:'1593.10', blurb:'포수·사수·살수를 기른다.' },
    { act:4, col:2, id:'a4_dunjeon',       kind:'camp',                                                    terrain:'none', name:'군량 밭',    do:'경기', date:'1594.1', blurb:'군사들이 밭을 일구어 군량을 쌓는다.' },
    { act:4, col:2, id:'a4_hanseong_shop', kind:'shop',                                                    terrain:'none', name:'한성 시장',  do:'경기', date:'1594.1', blurb:'도성 시장. 오랜만의 평온이다.' },
    { act:4, col:3, id:'a4_seosaengpo',    kind:'event', eventId:'E17',                                    terrain:'none', name:'서생포',     do:'경상', date:'1594.4', blurb:'사명당이 가토의 진에 들어가 묻는다.' },
    { act:4, col:4, id:'a4_hongsan',       kind:'event', eventId:'E18',                                    terrain:'none', name:'홍산',       do:'충청', date:'1596.7', blurb:'홍산에서 난이 일어났다. 조선인이 조선인을 친다.' },
    { act:4, col:5, id:'a4_hanseong_court', kind:'court', courtEvent:'E19', recruits:[],                   terrain:'none', name:'한성(조정)', do:'경기', date:'1597.1', blurb:'요시라의 글이 조정에 닿았다. 출격을 명한다.' },
    { act:4, col:6, id:'a4_council',       kind:'council',                                                 terrain:'none', name:'어전회의',   do:'경기', date:'1597.2', blurb:'어전. 통제사를 믿을 것인가, 묶을 것인가.' },
    // 5막 정유 ‘다시 검은 돛’ — 7열
    { act:5, col:1, id:'a5_busan_sea',     kind:'fight', type:'naval', enc:'busan_sea',                    terrain:'port', name:'부산 앞바다', do:'남해', date:'1597.2', blurb:'부산 앞바다로 나간다. 안택선이 기다린다.',
      onWin:[ { op:'relic', id:'tongjeyeong_flag' }, { op:'flag', key:'busan_held', value:true } ],
      variants:[ { if:{ flag:{ dismissed:true } }, patch:{ kind:'event', eventId:'E20', type:null, enc:null, onWin:null, terrain:'none', name:'칠천량', date:'1597.7.15~16', blurb:'바다가 비었다. 배도, 사람도, 장계도 없다.' } } ] },
    { act:5, col:2, id:'a5_hoeryeongpo',   kind:'event', eventId:'E21',                                    terrain:'none', name:'회령포',     do:'전라', date:'1597.8.18', blurb:'신에게는 아직 열두 척의 배가 있사옵니다.' },
    { act:5, col:2, id:'a5_gongju',        kind:'camp',                                                    terrain:'none', name:'공주',       do:'충청', date:'1597.8', blurb:'공주에 진을 치고 흩어진 군사를 모은다.' },
    { act:5, col:3, id:'a5_namwon',        kind:'elite', type:'siege', enc:'namwon', elite:true,           terrain:'fort',  name:'남원성',    do:'전라', date:'1597.8.13~16', blurb:'남원성. 명군과 함께 성을 지킨다.' },
    { act:5, col:3, id:'a5_hwangseoksan',  kind:'fight', type:'siege', enc:'hwangseoksan',                 terrain:'ridge', name:'황석산성',  do:'경상', date:'1597.8.16~18', blurb:'고개 위 산성. 대나무 방패를 세운 적이 올라온다.' },
    { act:5, col:4, id:'a5_unbong',        kind:'fight', type:'field', enc:'unbong',                       terrain:'none', name:'운봉',       do:'전라', date:'1597.8.19', blurb:'운봉 들판. 북상하는 적의 선봉과 마주친다.' },
    { act:5, col:4, id:'a5_jeonju_shop',   kind:'shop',                                                    terrain:'none', name:'전주 시장',  do:'전라', date:'1597.8.19', blurb:'전주 시장. 전라의 곡식과 활이 모인다.' },
    { act:5, col:5, id:'a5_white_robe',    kind:'event', eventId:'E22',                                    terrain:'none', name:'백의종군',   do:'전라', date:'1597.4.1', blurb:'도원수부에 든다. 훈련과 소식이 기다린다.' },
    { act:5, col:5, id:'a5_yeosan',        kind:'camp',                                                    terrain:'none', name:'여산',       do:'전라', date:'1597.4.1', blurb:'여산에 진을 치고 쉰다.' },
    { act:5, col:6, id:'a5_jiksan_court',  kind:'court', recruits:['hwang_jin','yi_jeongam'],              terrain:'none', name:'직산 진영(조정)', do:'충청', date:'1597.9.6', blurb:'직산 진영. 결전 전야의 조정.' },
    { act:5, col:7, id:'a5_jiksan',        kind:'boss', type:'field', bossEnc:'boss_jiksan',               terrain:'plain', name:'직산',      do:'충청', date:'1597.9.7', blurb:'직산 들판. 명군 기병과 함께 구로다를 막는다.' },
    // 6막 ‘명량’ — 6열
    { act:6, col:1, id:'a6_hoeryeongpo',   kind:'camp',                                                    terrain:'none',   name:'회령포 수군', do:'전라', date:'1597.8.18', blurb:'회령포에서 열두 척을 거둔다.' },
    { act:6, col:2, id:'a6_eoranpo',       kind:'fight', type:'naval', enc:'eoranpo',                      terrain:'port',   name:'어란포',     do:'남해', date:'1597.8.28', blurb:'어란포. 왜군 중선 떼가 먼저 온다.' },
    { act:6, col:3, id:'a6_byeokpajin',    kind:'event', eventId:'E24',                                    terrain:'none',   name:'벽파진',     do:'전라', date:'1597.9.7~15', blurb:'벽파진의 밤. 바다가 숨을 죽인다.' },
    { act:6, col:4, id:'a6_jindo_shop',    kind:'shop',                                                    terrain:'none',   name:'진도 시장',  do:'전라', date:'1597.9.15', blurb:'진도 시장. 백성이 배와 곡식을 내놓는다.' },
    { act:6, col:4, id:'a6_usuyeong',      kind:'camp',                                                    terrain:'none',   name:'우수영',     do:'전라', date:'1597.9.15', blurb:'우수영에서 노꾼들을 쉬게 한다.' },
    { act:6, col:5, id:'a6_usuyeong_court', kind:'court', courtEvent:'E25', recruits:[],                   terrain:'none',   name:'우수영 진영(조정)', do:'전라', date:'1597.9.15', blurb:'우수영 진영. 죽고자 하면 살고, 살고자 하면 죽는다.' },
    { act:6, col:6, id:'a6_uldolmok',      kind:'boss', type:'naval', bossEnc:'boss_myeongnyang',          terrain:'strait', name:'울돌목',     do:'남해', date:'1597.9.16', blurb:'울돌목. 버텨라, 물이 바뀐다.' },
    // 7막 무술 ‘노량’ — 7열
    { act:7, col:1, id:'a7_ulsan',         kind:'elite', type:'assault', enc:'ulsan', elite:true,          terrain:'waeseong', name:'울산 도산성', do:'경상', date:'1597.12.22~1.4', blurb:'도산성의 혹한. 왜성을 에워싸고 친다.' },
    { act:7, col:2, id:'a7_rumor',         kind:'event', eventId:'E26',                                    terrain:'none',     name:'풍문',       do:'—',    date:'1598.8.18', blurb:'바다 건너 풍문이 왔다. 히데요시가 죽었다 한다.' },
    { act:7, col:3, id:'a7_sacheon',       kind:'elite', type:'field', enc:'sacheon', elite:true,          terrain:'waeseong', name:'사천',       do:'경상', date:'1598.10.1', blurb:'사천. 시마즈의 선봉과 기마 무사가 맞선다.' },
    { act:7, col:3, id:'a7_suncheon',      kind:'fight', type:'assault', enc:'suncheon',                   terrain:'waeseong', name:'순천 왜교성', do:'전라', date:'1598.9.20~10.7', blurb:'순천 왜교성. 물과 뭍에서 함께 친다.' },
    { act:7, col:3, id:'a7_gogeumdo',      kind:'camp',                                                    terrain:'none',     name:'고금도',     do:'전라', date:'1598.2', blurb:'고금도 본영에서 쉰다.' },
    { act:7, col:4, id:'a7_gogeumdo_shop', kind:'shop',                                                    terrain:'none',     name:'고금도 시장', do:'전라', date:'1598.10', blurb:'고금도 시장. 명 수군의 물자가 들어온다.' },
    { act:7, col:5, id:'a7_chen_lin',      kind:'event', eventId:'E27',                                    terrain:'none',     name:'진린의 술',  do:'전라', date:'1598.11', blurb:'진린이 술을 보내왔다. 공을 나누자 한다.' },
    { act:7, col:6, id:'a7_gogeumdo_court', kind:'court', courtEvent:'E28', recruits:[],                   terrain:'none',     name:'고금도 진영(조정)', do:'남해', date:'1598.11.18', blurb:'고금도 진영. 마지막 조정, 마지막 전야.' },
    { act:7, col:7, id:'a7_noryang',       kind:'boss', type:'naval', bossEnc:'boss_noryang',              terrain:'strait',   name:'노량',       do:'남해', date:'1598.11.19', blurb:'노량. 돌아가는 적을 보내지 않는다.' }
  ];

  /* ------------------------------------------------------------ 조립: 마디 정규화(키 전부 채움) · 막 cols · 좌표 */
  function mk(o){
    return { id:o.id, act:o.act, col:o.col, kind:o.kind, name:o.name, do:o.do, date:o.date,
      type:o.type || null, enc:o.enc || null, elite:!!o.elite, eventId:o.eventId || null, courtEvent:o.courtEvent || null,
      bossEnc:o.bossEnc || null, terrain:o.terrain || 'none', lane:o.lane || null, x:0, y:0, blurb:o.blurb,
      variants:o.variants || null, recruits:o.recruits || null, onWin:o.onWin || null, courtOps:o.courtOps || null,
      firstCourt:!!o.firstCourt };
  }
  function indexBy(list){ var m = {}; for (var i = 0; i < list.length; i++) m[list[i].id] = list[i]; return m; }
  function getter(name, by){ return function(id){ var o = by[id]; if (!o) throw new Error(name + ': 없는 id ' + id); return o; }; }

  var NODES = [], i;
  for (i = 0; i < RAW.length; i++) NODES.push(mk(RAW[i]));
  var nodeById = indexBy(NODES);
  var terrainById = indexBy(TERRAINS);

  var ACTS = [null];
  for (i = 0; i < ACT_DEFS.length; i++) {
    var d = ACT_DEFS[i];
    ACTS.push({ act:d.act, no:d.no, name:d.name, title:d.title, period:d.period, bg:d.bg, cols:[], lanes:d.lanes, endEvent:d.endEvent });
  }
  for (i = 0; i < NODES.length; i++) {
    var n = NODES[i], a = ACTS[n.act];
    while (a.cols.length < n.col) a.cols.push([]);
    a.cols[n.col - 1].push(n.id);
  }
  function layout(){
    for (var act = 1; act < ACTS.length; act++) {
      var a = ACTS[act];
      for (var c = 0; c < a.cols.length; c++) {
        var groups = a.lanes ? { sea:[], land:[] } : { mid:[] };
        for (var k = 0; k < a.cols[c].length; k++) { var nd = nodeById[a.cols[c][k]]; groups[a.lanes ? nd.lane : 'mid'].push(nd); }
        for (var g in groups) {
          var arr = groups[g], base = g === 'sea' ? LAYOUT.ySea : g === 'land' ? LAYOUT.yLand : LAYOUT.yMid;
          var spread = a.lanes ? LAYOUT.yLaneSpread : LAYOUT.ySpread;
          for (var j = 0; j < arr.length; j++) {
            arr[j].x = LAYOUT.x0 + c * LAYOUT.xGap;
            arr[j].y = Math.floor(base + (j - (arr.length - 1) / 2) * spread);
          }
        }
      }
    }
  }
  layout();

  /* ------------------------------------------------------------ 조회 */
  function laneFilter(ids, lane){ return ids.filter(function(id){ return nodeById[id].lane === lane; }); }
  // 같은 막 다음 열 전부(2막은 같은 lane 만). 마지막 열이면 []
  function next(nodeId, flags){
    var n = nodeById[nodeId]; if (!n) throw new Error('MAPDATA: 없는 id ' + nodeId);
    var a = ACTS[n.act];
    if (n.col >= a.cols.length) return [];
    var ids = a.cols[n.col].slice();
    return a.lanes ? laneFilter(ids, n.lane) : ids;
  }
  // 그 막 열1. 2막은 flags.lane2 가 정해져 있으면 그 길만, 아니면 두 길 모두(여기서 길을 고른다)
  function first(act, flags){
    var a = ACTS[act]; if (!a) throw new Error('MAPDATA: 없는 막 ' + act);
    var ids = a.cols[0].slice();
    var lane = flags && flags.lane2;
    if (a.lanes && (lane === 'sea' || lane === 'land')) ids = laneFilter(ids, lane);
    return ids;
  }
  function colIds(act, col, lane){ var ids = ACTS[act].cols[col - 1] || []; return lane ? laneFilter(ids, lane) : ids.slice(); }

  /* ------------------------------------------------------------ 자가 검사 */
  function walkOps(ops, where, errors){
    if (!ops) return;
    if (!Array.isArray(ops)) { errors.push(where + ': ops 가 배열이 아님'); return; }
    for (var k = 0; k < ops.length; k++) {
      var op = ops[k];
      if (!op || typeof op.op !== 'string' || RUN_OPS.indexOf(op.op) < 0) { errors.push(where + '[' + k + ']: 판 op 아님 ' + (op && op.op)); continue; }
      if (op.op === 'cond') { walkOps(op.then, where + '.then', errors); walkOps(op.else, where + '.else', errors); }
      if (op.op === 'battle') { walkOps(op.onWin, where + '.onWin', errors); if (op.enc && !ID_RE.test(op.enc)) errors.push(where + ': enc 형식 ' + op.enc); }
      if ((op.op === 'relic' || op.op === 'recruit' || op.op === 'leave') && !ID_RE.test(String(op.id))) errors.push(where + ': id 형식 ' + op.id);
    }
  }
  function selfTest(){
    var errors = [], seen = {}, k, j, nd;
    var COLS_EXPECT = [0, 7, 8, 8, 6, 7, 6, 7], total = 0;
    // 막·열 수
    if (ACTS.length !== 8) errors.push('막 수 ' + (ACTS.length - 1));
    for (k = 1; k < ACTS.length; k++) {
      var a = ACTS[k];
      if (a.act !== k) errors.push('acts[' + k + '].act 불일치');
      if (a.cols.length !== COLS_EXPECT[k]) errors.push(k + '막 열 수 ' + a.cols.length + ' ≠ ' + COLS_EXPECT[k]);
      total += a.cols.length;
      for (j = 0; j < a.cols.length; j++) {
        if (a.cols[j].length < 1) errors.push(k + '막 열' + (j + 1) + ' 비어 있음');
        if (a.lanes && (laneFilter(a.cols[j], 'sea').length < 1 || laneFilter(a.cols[j], 'land').length < 1)) errors.push(k + '막 열' + (j + 1) + ' lane 하나가 비어 있음');
      }
      if (!a.no || !a.name || !a.title || !a.period || !a.bg) errors.push(k + '막 제목·시기·bg 누락');
      if (a.endEvent) for (var ek in a.endEvent) if (!EV_RE.test(a.endEvent[ek])) errors.push(k + '막 endEvent 형식 ' + a.endEvent[ek]);
    }
    if (total !== 49) errors.push('열 합계 ' + total + ' ≠ 49');
    // 마디 하나씩
    for (k = 0; k < NODES.length; k++) {
      nd = NODES[k]; var w = nd.id;
      if (seen[nd.id]) errors.push(w + ': id 중복'); seen[nd.id] = true;
      var pre = nd.act === 2 ? 'a2' + (nd.lane === 'sea' ? 's' : 'l') + '_' : 'a' + nd.act + '_';
      if (!ID_RE.test(nd.id) || nd.id.indexOf(pre) !== 0) errors.push(w + ': id 규칙(' + pre + ') 위반');
      if (KINDS.indexOf(nd.kind) < 0) errors.push(w + ': kind ' + nd.kind);
      if (DOS.indexOf(nd.do) < 0) errors.push(w + ': do ' + nd.do);
      if (!DATE_RE.test(nd.date)) errors.push(w + ': 날짜 형식 ' + nd.date);
      if (!nd.name || !nd.blurb) errors.push(w + ': name·blurb 누락');
      if (!terrainById[nd.terrain]) errors.push(w + ': terrain ' + nd.terrain);
      if (nd.x < 0 || nd.x > LAYOUT.w || nd.y < 0 || nd.y > LAYOUT.h) errors.push(w + ': 좌표 밖 ' + nd.x + ',' + nd.y);
      if ((nd.act === 2) !== (nd.lane !== null)) errors.push(w + ': lane 은 2막에만');
      if (nd.lane !== null && nd.lane !== 'sea' && nd.lane !== 'land') errors.push(w + ': lane ' + nd.lane);
      if (nd.type !== null && TYPES.indexOf(nd.type) < 0) errors.push(w + ': type ' + nd.type);
      if (nd.enc !== null && !ID_RE.test(nd.enc)) errors.push(w + ': enc 형식 ' + nd.enc);
      if (nd.bossEnc !== null && !ID_RE.test(nd.bossEnc)) errors.push(w + ': bossEnc 형식 ' + nd.bossEnc);
      if (nd.eventId !== null && !EV_RE.test(nd.eventId)) errors.push(w + ': eventId 형식 ' + nd.eventId);
      if (nd.courtEvent !== null && !EV_RE.test(nd.courtEvent)) errors.push(w + ': courtEvent 형식 ' + nd.courtEvent);
      var isFight = nd.kind === 'fight' || nd.kind === 'elite';
      if (isFight && (!nd.type || !nd.enc)) errors.push(w + ': 전투 마디에 type·enc 필요');
      if ((nd.kind === 'elite') !== nd.elite) errors.push(w + ': elite 플래그와 kind 불일치');
      if (nd.kind === 'boss' && (!nd.bossEnc || !nd.type)) errors.push(w + ': 결전 마디에 bossEnc·type 필요');
      if (nd.kind === 'event' && !nd.eventId) errors.push(w + ': 사건 마디에 eventId 필요');
      if (nd.kind === 'court' && !Array.isArray(nd.recruits)) errors.push(w + ': 조정 마디에 recruits 배열 필요');
      if (nd.kind !== 'court' && (nd.courtEvent || nd.courtOps || nd.firstCourt)) errors.push(w + ': 조정 필드는 court 에만');
      if (nd.recruits) for (j = 0; j < nd.recruits.length; j++) if (!ID_RE.test(nd.recruits[j])) errors.push(w + ': recruits 형식 ' + nd.recruits[j]);
      walkOps(nd.onWin, w + '.onWin', errors);
      if (nd.courtOps) for (var ck in nd.courtOps) { if (['report','recruit','request'].indexOf(ck) < 0) errors.push(w + ': courtOps 키 ' + ck); walkOps(nd.courtOps[ck], w + '.courtOps.' + ck, errors); }
      if (nd.variants) for (j = 0; j < nd.variants.length; j++) {
        var v = nd.variants[j];
        if (!v.if || typeof v.if !== 'object' || !v.patch || typeof v.patch !== 'object') errors.push(w + ': variants[' + j + '] if·patch 필요');
        else { for (var pk in v.patch) if (!(pk in nd)) errors.push(w + ': variants patch 키 ' + pk + ' 는 마디 필드가 아님');
          if (v.patch.eventId && !EV_RE.test(v.patch.eventId)) errors.push(w + ': variants eventId 형식');
          if (v.patch.date && !DATE_RE.test(v.patch.date)) errors.push(w + ': variants 날짜 형식'); walkOps(v.patch.onWin, w + '.variants.onWin', errors); }
      }
      // 결전·어전회의 바로 앞 열은 조정
      if (nd.kind === 'boss' || nd.kind === 'council') {
        if (nd.col < 2) errors.push(w + ': 결전이 열1');
        else { var prev = colIds(nd.act, nd.col - 1, nd.lane); if (!prev.length) errors.push(w + ': 앞 열 없음');
          for (j = 0; j < prev.length; j++) if (nodeById[prev[j]].kind !== 'court') errors.push(w + ': 앞 열 ' + prev[j] + ' 가 court 아님'); }
      }
      // 연결: 2막은 lane 을 넘지 않는다. 마지막 열만 []
      var nx = next(nd.id, {});
      if (nd.col === ACTS[nd.act].cols.length) { if (nx.length) errors.push(w + ': 마지막 열인데 next 있음'); }
      else { if (!nx.length) errors.push(w + ': next 비어 있음'); for (j = 0; j < nx.length; j++) if (nd.lane !== nodeById[nx[j]].lane) errors.push(w + ': lane 을 넘는 연결 ' + nx[j]); }
    }
    // 지침 마디
    var must = { a1_busan:'fight', a1_hanseong:'court', a1_boss:'boss', a2s_hansan:'boss', a2l_jinju:'boss', a2l_gyeongju:'event', a3_uiju:'court', a3_haengju:'boss', a3_hanseong:'event',
      a4_council:'council', a5_busan_sea:'fight', a5_jiksan:'boss', a6_uldolmok:'boss', a7_noryang:'boss' };
    for (var mid in must) { if (!nodeById[mid]) errors.push('지침 마디 없음 ' + mid); else if (nodeById[mid].kind !== must[mid]) errors.push(mid + ': kind ' + must[mid] + ' 이어야 함'); }
    if (nodeById.a3_uiju && (!nodeById.a3_uiju.firstCourt || nodeById.a3_uiju.courtEvent !== 'E12')) errors.push('a3_uiju: firstCourt·E12');
    var ce = { a4_hanseong_court:'E19', a6_usuyeong_court:'E25', a7_gogeumdo_court:'E28' };
    for (var cid in ce) if (!nodeById[cid] || nodeById[cid].courtEvent !== ce[cid]) errors.push(cid + ': courtEvent ' + ce[cid]);
    if (!nodeById.a5_busan_sea || !nodeById.a5_busan_sea.variants || nodeById.a5_busan_sea.variants[0].patch.eventId !== 'E20') errors.push('a5_busan_sea: dismissed → E20 variants');
    if (!nodeById.a1_boss || nodeById.a1_boss.terrain !== 'none') errors.push('a1_boss: terrain none 이어야 함');
    if (nodeById.a1_hanseong && (!nodeById.a1_hanseong.courtOps || !nodeById.a1_hanseong.courtOps.report)) errors.push('a1_hanseong: courtOps.report 필요');
    if (NODES.length !== 77) errors.push('마디 객체 수 ' + NODES.length + ' ≠ 77');
    if (JSON.stringify(first(1, null)) !== '["a1_busan"]') errors.push('first(1) ≠ [a1_busan]');
    if (first(2, {}).length !== 2 || first(2, { lane2:'sea' }).length !== 1 || first(2, { lane2:'land' }).length !== 1) errors.push('first(2, lane2) 분리 실패');
    if (!ACTS[1].endEvent || ACTS[1].endEvent.default !== 'E4' || !ACTS[2].endEvent || ACTS[2].endEvent.sea !== 'E10' || ACTS[2].endEvent.land !== 'E11' || !ACTS[5].endEvent || ACTS[5].endEvent.default !== 'E23') errors.push('endEvent: 1막 E4 · 2막 E10/E11 · 5막 E23');
    // 지형
    var tids = ['plain','ridge','river','fort','port','strait','waeseong','none'];
    for (k = 0; k < tids.length; k++) if (!terrainById[tids[k]] || typeof terrainById[tids[k]].mods !== 'object') errors.push('지형 없음 ' + tids[k]);
    if (TERRAINS.length !== 8) errors.push('지형 수 ' + TERRAINS.length);
    // JSON 왕복
    var data = { acts:ACTS, nodes:NODES, terrains:TERRAINS }, s = JSON.stringify(data);
    if (JSON.stringify(JSON.parse(s)) !== s) errors.push('JSON 왕복 불일치');
    if (s.indexOf('undefined') >= 0) errors.push('데이터에 undefined 문자열');
    // 다른 전역이 이미 있으면 참조 ID 실재까지 (없으면 건너뜀)
    var EV = typeof EVENTS !== 'undefined' ? EVENTS : null, EN = typeof ENEMIES !== 'undefined' ? ENEMIES : null, GN = typeof GENERALS !== 'undefined' ? GENERALS : null;
    for (k = 0; k < NODES.length; k++) {
      nd = NODES[k];
      if (EV && EV.byId) { if (nd.eventId && !EV.byId[nd.eventId]) errors.push(nd.id + ': EVENTS 에 없는 ' + nd.eventId); if (nd.courtEvent && !EV.byId[nd.courtEvent]) errors.push(nd.id + ': EVENTS 에 없는 ' + nd.courtEvent); }
      if (EN && EN.encounters && EN.encounters.byId) { var e = nd.enc || nd.bossEnc; if (e && e !== 'pool' && !EN.encounters.byId[e]) errors.push(nd.id + ': ENEMIES 에 없는 편성 ' + e); }
      if (GN && GN.deputies && GN.deputies.byId && nd.recruits) for (j = 0; j < nd.recruits.length; j++) if (!GN.deputies.byId[nd.recruits[j]]) errors.push(nd.id + ': GENERALS 에 없는 부장 ' + nd.recruits[j]);
    }
    return { ok: errors.length === 0, errors: errors };
  }

  var api = {
    acts: ACTS,                                                    // acts[1..7] (acts[0] 은 null)
    nodes: { list: NODES, byId: nodeById, get: getter('MAPDATA', nodeById) },
    terrains: { list: TERRAINS, byId: terrainById, get: getter('MAPDATA.terrains', terrainById) },
    next: next, first: first, colIds: colIds, LAYOUT: LAYOUT,
    selfTest: selfTest
  };
  return api;
})();
