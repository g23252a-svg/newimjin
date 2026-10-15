/* ===== 03_enemies.js — 적 틀 16 + 결전 적 11, 편성(결전 7·고정 29·풀), 막 배율, 인스턴스 생성 (전역 ENEMIES) ===== */
var ENEMIES = (function(){ 'use strict';
// 담당 D. 계약서 §3.3 스키마·ID 그대로. 수치는 DESIGN §5.8·§6.2. 규칙 수치는 Core.BAL.ACT_SCALE 만 읽는다.
// 새 ID(계약서에 없는 것): 풀 정예 편성 `p1_elite_a`(「왜장과 창대」). 그 밖의 풀 정예는 고정 편성 ID 를 재사용한다.
// TODO(통합): build() 는 waves 가 있는 편성에서 enemies 에 파도 1(waves[0]) 의 인스턴스를 채워 돌려준다(wave:1).
//             Combat.create 는 req.enemies 를 그대로 쓰고, 파도 전환 때만 waves[st.wave].enemies 를 makeInst 로 만들면 된다.
//             waves[0] 을 create 에서 다시 인스턴스화하면 적이 두 배가 되니 주의.
// TODO(통합): boss_konishi.reward 는 {relic:null, ops:[]} 로 두었다. Run.buildReq 가 b1 에 따라 reward.relic / reward.ops 를 채운다(§6.8).
// TODO(통합): boss_noryang 의 reward 도 {relic:null, ops:[]} (보상은 결말). Run 은 reward.relic 이 null 이면 기물을 주지 않는다.
// TODO(통합): 풀 편성의 type 은 편성 쪽 값이다. 마디(node.type)와 다르면 Run.buildReq 가 node.type 을 우선한다고 가정했다.
// TODO(통합): 파도 편성(boss_haengju)의 waves[0] 에도 resetDist:1·extraDraw:3 을 두었다(계약서 문구 그대로). Combat.create 가
//             파도 1 의 resetDist/extraDraw/onStart 를 적용할지는 Combat 담당이 정한다 — 적용하지 않는 쪽을 권한다(수성 원거리 시작 유지).
// TODO(통합): 공성 인부의 intents 는 build ×3 이다. buildCount 가 3 에 닿으면 Combat 이 §3.3 대로 토산 사격으로 교체한다.
// TODO(통합): build(encId, act, rng, overrides) 의 overrides 는 {enemies?:[spec], mods?:{}, hp?:{id:n}, names?:{id:name}} 를 받는다.

  var B = Core.BAL;
  var KINDS = ['atk', 'approach', 'pull', 'block', 'load', 'rally', 'build', 'reinforce', 'raid', 'signal', 'flee', 'incite', 'ops'];
  var ATK_TAGS = ['gun', 'melee', 'bow'];
  var ADV = ['always', 'stopAtNear', 'never'];
  var TYPES = ['field', 'siege', 'assault', 'naval'];

  /* ---------- 의도 짓기 도우미 (결과는 전부 순수 데이터) ---------- */
  function A(n, tag, text, extra) { var o = { kind: 'atk', n: n, tag: tag, text: text }; if (extra) { for (var k in extra) { o[k] = extra[k]; } } return o; }
  function L() { return { kind: 'load', text: '장전' }; }
  function BLK(n, text) { return { kind: 'block', n: n, text: text }; }
  function RLY(n, who, text) { return { kind: 'rally', n: n, who: who, text: text }; }
  function PULL(n, text) { return { kind: 'pull', n: n, text: text }; }
  function BUILD() { return { kind: 'build', text: '쌓기' }; }

  /* ================================================================
   * 1. 적 틀 — 일반·정예 16종 (DESIGN §6.2)
   * ================================================================ */
  var list = [
    { id: 'ashigaru_spear', name: '왜군 창병', hanja: '槍足輕', hp: 16, advance: 'always', step: 1, tags: ['melee'],
      intents: [A(8, 'melee', '찌르기'), A(8, 'melee', '찌르기'), BLK(5, '밀집')],
      memo: '왜군 보병의 뼈대. 멀리 있으면 먼저 다가온다.' },
    { id: 'ashigaru_gun', name: '왜군 조총병', hanja: '鐵砲足輕', hp: 13, advance: 'stopAtNear', step: 1, tags: ['gun'],
      intents: [L(), L(), A(14, 'gun', '조총 사격', { pierce: B.GUN_PIERCE })],
      memo: '장전, 장전, 그리고 사격. 쏘는 차례를 읽어라. 중거리에서 멈춘다.' },
    { id: 'wa_archer', name: '왜군 궁수', hanja: '和弓', hp: 12, advance: 'stopAtNear', step: 1, tags: ['bow'],
      intents: [A(5, 'bow', '사격')],
      memo: '거리와 상관없이 활을 쏜다.' },
    { id: 'mounted_samurai', name: '기마 무사', hanja: '騎馬武士', hp: 30, advance: 'always', step: 1, tags: ['melee', 'horse'], resist: 1,
      intents: [A(10, 'melee', '돌격', { pullFirst: 2 }), A(8, 'melee', '베기'), A(8, 'melee', '베기')],
      memo: '첫 밀어내기를 버틴다. 돌격하면 먼저 근접으로 달려든다.' },
    { id: 'samurai', name: '무사', hanja: '侍', hp: 24, advance: 'always', step: 1, tags: ['melee'],
      intents: [A(10, 'melee', '베기'), A(10, 'melee', '베기'), RLY(2, 'self', '기합')],
      memo: '기합을 넣어 제 기세를 올린다.' },
    { id: 'wa_captain', name: '왜장', hanja: '隊將', hp: 40, advance: 'always', step: 1, tags: ['melee', 'elite'],
      intents: [RLY(2, 'all', '명령'), A(14, 'melee', '베기'), A(14, 'melee', '베기')],
      memo: '왜군의 장수. 명령을 내리면 적 전체의 기세가 오른다.' },
    { id: 'siege_laborer', name: '공성 인부', hanja: '工夫', hp: 20, advance: 'never', step: 1, tags: ['laborer'],
      intents: [BUILD(), BUILD(), BUILD()],
      memo: '흙산을 세 번 쌓으면 그 위에서 성벽 너머로 쏜다. 다 쌓기 전에 잡아라.' },
    { id: 'bamboo_bundle', name: '대나무 방패병', hanja: '竹束', hp: 22, advance: 'always', step: 1, tags: ['melee'], passive: { shotPctAtFar: -0.5 },
      intents: [BLK(8, '방패 세우기'), A(7, 'melee', '찌르기'), A(7, 'melee', '찌르기')],
      memo: '대나무 다발을 앞세워 온다. 원거리에서 받는 사격 피해 −50%(관통은 그대로).' },
    { id: 'nobushi', name: '왜군 약탈병', hanja: '野武士', hp: 18, advance: 'always', step: 1, tags: ['melee'],
      intents: [{ kind: 'raid', n: 3, text: '약탈' }, A(7, 'melee', '베기'), A(7, 'melee', '베기')],
      memo: '군량을 빼앗아 간다.' },
    { id: 'sekibune', name: '왜군 중선', hanja: '關船', hp: 20, advance: 'always', step: 2, tags: ['ship', 'melee'],
      intents: [{ kind: 'approach', text: '접근' }, A(10, 'melee', '올라타기')],
      memo: '빠른 배. 한 번에 두 칸씩 다가온다.' },
    { id: 'kobaya', name: '왜군 소선', hanja: '小早', hp: 12, advance: 'always', step: 2, tags: ['ship', 'melee'],
      intents: [A(6, 'melee', '올라타기')],
      memo: '작고 많은 배. 한 번에 두 칸씩 다가온다.' },
    { id: 'atakebune', name: '안택선', hanja: '安宅船', hp: 40, advance: 'stopAtNear', step: 1, tags: ['ship', 'bow', 'melee'],
      intents: [A(8, 'bow', '포격'), A(8, 'bow', '포격'), A(12, 'melee', '올라타기')],
      memo: '왜 수군의 큰 배. 중거리에서 멈추고 포를 쏜다.' },
    { id: 'enemy_flagship', name: '대장선', hanja: '大將船', hp: 70, advance: 'stopAtNear', step: 1, tags: ['ship', 'bow', 'elite'],
      intents: [RLY(1, 'all', '깃발 신호'), A(12, 'bow', '포격'), A(12, 'bow', '포격')],
      memo: '깃발을 올리면 적 전체의 기세가 오른다.' },
    { id: 'wajo_garrison', name: '왜성 수비대', hanja: '倭城守備', hp: 35, advance: 'never', step: 1, tags: ['gun', 'melee'],
      intents: [A(10, 'gun', '조총'), A(9, 'melee', '뛰쳐나오기', { alt: { if: { distNot: 2 }, n: 10, tag: 'gun', text: '조총' } })],
      memo: '왜성 안에서 버틴다. 붙지 않으면 뛰쳐나오는 대신 조총을 쏜다.' },
    { id: 'rebel_monghak', name: '이몽학 반군', hanja: '李夢鶴', hp: 40, advance: 'always', step: 1, tags: ['melee', 'elite'],
      intents: [{ kind: 'incite', n: 1, text: '선동' }, A(9, 'melee', '공격'), A(9, 'melee', '공격')],
      memo: '조선 사람이다. 선동하면 의심이 오른다.' },
    { id: 'wa_scout', name: '왜군 척후', hanja: '斥候', hp: 10, advance: 'never', step: 1, tags: ['scout'],
      intents: [{ kind: 'signal', text: '신호' }, { kind: 'flee', text: '달아남' }],
      memo: '신호를 보내 적의 공격을 높인다. 달아나기 전에 잡아라.' },

  /* ================================================================
   * 2. 결전 적 11 (DESIGN §5.8) — tags 'boss' 는 체력 고정(막 배율 없음), 정지 무효
   * ================================================================ */
    { id: 'konishi', name: '고니시 유키나가', hanja: '小西行長', hp: 90, advance: 'always', step: 1, tags: ['boss', 'gun', 'melee'],
      intents: [A(16, 'gun', '일제 사격'), PULL(1, '전진'), A(20, 'melee', '포위'), BLK(10, '재정비')],
      memo: '임진년 왜군의 선봉장. 조총병을 거느렸다.' },
    { id: 'wakizaka', name: '와키자카 야스하루', hanja: '脇坂安治', hp: 90, advance: 'stopAtNear', step: 1, tags: ['boss', 'ship', 'bow', 'melee'],
      intents: [PULL(1, '돌격 전개'), A(10, 'bow', '포격'), A(14, 'melee', '올라타기'), { kind: 'reinforce', id: 'sekibune', n: 1, cap: 6, text: '증원' }],
      memo: '한산도의 적장. 원거리에서 학익진을 맞으면 흔들린다.' },
    { id: 'hosokawa', name: '호소카와 다다오키', hanja: '細川忠興', hp: 60, advance: 'always', step: 1, tags: ['boss', 'melee'],
      intents: [RLY(2, 'all', '명령'), A(14, 'melee', '베기'), A(18, 'melee', '총공격')],
      memo: '진주성을 에워싼 왜장.' },
    { id: 'ukita_w1', name: '고니시 부대', hanja: '小西隊', hp: 30, advance: 'always', step: 1, tags: ['boss', 'melee'],
      intents: [A(13, 'melee', '총공격'), PULL(1, '사다리'), A(18, 'melee', '돌파')],
      memo: '행주산성의 첫 파도.' },
    { id: 'ukita_w2', name: '이시다·구로다 부대', hanja: '石田黑田隊', hp: 34, advance: 'always', step: 1, tags: ['boss', 'melee'],
      intents: [A(13, 'melee', '총공격'), PULL(1, '사다리'), A(20, 'melee', '돌파')],
      memo: '행주산성의 둘째 파도.' },
    { id: 'ukita_w3', name: '우키타 히데이에', hanja: '宇喜多秀家', hp: 40, advance: 'always', step: 1, tags: ['boss', 'melee'],
      intents: [A(13, 'melee', '총공격'), PULL(1, '사다리'), A(22, 'melee', '돌파')],
      memo: '행주산성의 셋째 파도, 적의 본대.' },
    { id: 'kuroda', name: '구로다 나가마사', hanja: '黑田長政', hp: 100, advance: 'always', step: 1, tags: ['boss', 'melee', 'gun', 'horse'],
      intents: [A(14, 'melee', '기병 돌격', { pullFirst: 2 }), A(12, 'gun', '조총'), BLK(8, '재정비')],
      memo: '직산의 적장. 기마 무사를 거느리고 온다.' },
    { id: 'todo', name: '도도 다카토라', hanja: '藤堂高虎', hp: B.MYEONGNYANG.todoHp, advance: 'stopAtNear', step: 1, tags: ['boss', 'ship', 'bow'],
      intents: [A(12, 'bow', '포격'), RLY(1, 'all', '깃발 신호'), A(14, 'bow', '포격')],
      memo: '울돌목 왜 수군의 대장선.' },
    { id: 'kurushima', name: '구루시마 미치후사', hanja: '來島通總', hp: 40, advance: 'always', step: 1, tags: ['boss', 'ship', 'melee'],
      intents: [A(9, 'melee', '올라타기'), A(9, 'melee', '올라타기'), A(13, 'melee', '돌격')],
      memo: '울돌목의 선봉장. 쓰러지면 적 전체가 흔들린다.' },
    { id: 'shimazu_p1', name: '시마즈 요시히로', hanja: '島津義弘', hp: B.NORYANG.p1, advance: 'always', step: 1, tags: ['boss', 'ship', 'gun', 'melee'],
      intents: [PULL(1, '포위'), A(14, 'gun', '조총'), A(16, 'melee', '올라타기'), RLY(1, 'all', '깃발 신호')],
      memo: '노량의 적장. 쓰러뜨리면 퇴로의 싸움이 시작된다.' },
    { id: 'shimazu_p2', name: '시마즈 요시히로 — 퇴로', hanja: '島津義弘', hp: B.NORYANG.p2, advance: 'always', step: 1, tags: ['boss', 'ship', 'melee'],
      intents: [A(20, 'melee', '결사 돌격'), BLK(12, '재정비'), A(20, 'melee', '결사 돌격')],
      memo: '퇴로를 뚫으려 뱃머리로 들이받는다.' }
  ];

  /* ================================================================
   * 3. 편성
   * ================================================================ */
  function e(id, offset, name, hp) { var o = { id: id, offset: offset || 0 }; if (name) { o.name = name; } if (hp) { o.hp = hp; } return o; }
  function hand(ids) { var a = []; for (var i = 0; i < ids.length; i++) { a.push({ id: ids[i], free: true }); } return a; }
  function give(id, n) { return { op: 'addCard', id: id, n: n || 1, where: 'hand', free: true, generated: true }; }

  var encounters = [
    /* ----- 결전 7 ----- */
    { id: 'boss_konishi', name: '고니시 유키나가', type: 'field', boss: true,
      enemies: [e('konishi'), e('ashigaru_gun', 0), e('ashigaru_gun', 1)],
      reward: { relic: null, ops: [] },
      intro: { title: '조령, 그리고 탄금대', memo: '고니시의 선봉이 충주에 이르렀다. 새재를 막을 것인가, 강을 등질 것인가.' },
      memo: 'B1. 지형·보상은 Run 이 flags.b1 로 정한다(§6.8)' },
    { id: 'boss_wakizaka', name: '와키자카 야스하루', type: 'naval', boss: true,
      enemies: [e('wakizaka'), e('sekibune'), e('sekibune', 1)],
      handlers: [{ hook: 'onCardPlayed', cond: { cardId: 'crane_wing', dist: 0 },
                   ops: [{ op: 'fx', kind: 'banner', key: 'crane' }, { op: 'status', who: 'enemy', enemyId: 'wakizaka', id: 'shaken', n: 2 }] }],
      reward: { relic: 'hansan_drum' },
      intro: { title: '한산도', memo: '견내량의 좁은 물에서 적을 끌어내 한산 앞바다에 펼친다. 학이 날개를 편다.' },
      memo: 'B2. 원거리에서 학익진 → 배너 + 와키자카 동요 2' },
    { id: 'boss_jinju1', name: '진주성 1차', type: 'siege', boss: true,
      enemies: [e('hosokawa'), e('siege_laborer'), e('siege_laborer', 1), e('ashigaru_gun')],
      reward: { relic: 'jinju_drum', ops: [{ op: 'flag', key: 'jinju1_held', value: true }] },
      intro: { title: '진주성', memo: '김시민이 성문을 닫았다. 저들은 흙산을 쌓고, 우리는 성가퀴 뒤에서 기다린다.' },
      memo: 'B2′. 수성(아군 성벽 10 은 유형이 준다)' },
    { id: 'boss_haengju', name: '우키타 히데이에', type: 'siege', boss: true,
      enemies: [],
      waves: [
        { enemies: [e('ukita_w1'), e('ashigaru_gun', 1)], intro: '첫 파도 — 고니시의 군사가 산 아래 깔렸다.',
          resetDist: 1, extraDraw: 3, trigger: 'allDead', keepOthers: false },
        { enemies: [e('ukita_w2'), e('samurai', 1)], intro: '둘째 파도 — 이시다와 구로다의 깃발이 올라온다.',
          resetDist: 1, extraDraw: 3, trigger: 'allDead', keepOthers: false },
        { enemies: [e('ukita_w3'), e('wa_captain', 1, '고바야카와', 28)], intro: '셋째 파도 — 화살이 떨어져 간다. 강 위에 배가 보인다.',
          resetDist: 1, extraDraw: 3, trigger: 'allDead', keepOthers: false,
          onStart: [{ op: 'addCard', id: 'bowstring', n: 2, where: 'hand', generated: true }, { op: 'fx', kind: 'banner', key: 'arrows' }] }
      ],
      reward: { relic: 'haengju_ash' },
      intro: { title: '행주산성', memo: '아래는 강이요 위는 하늘이다. 물러설 곳이 없으니 두려울 것도 없다.' },
      memo: 'B3. 세 파도. 파도마다 중거리로 되돌리고 3장 더 뽑는다. 파3 시작에 활시위 2장' },
    { id: 'boss_jiksan', name: '구로다 나가마사', type: 'field', boss: true,
      enemies: [e('kuroda'), e('mounted_samurai'), e('mounted_samurai', 1)],
      mods: { startHand: hand(['li_cavalry', 'folangji', 'nambyeong_cannon']) },
      reward: { relic: 'jiksan_spear' },
      intro: { title: '직산', memo: '구로다의 기병이 직산 벌판에 섰다. 명의 기병이 우리 곁에 섰다. 이번만은 군량을 묻지 않는다.' },
      memo: 'B5 정예급 결전. 첫 손 명군 3장 군량 0' },
    { id: 'boss_myeongnyang', name: '구루시마·도도', type: 'naval', boss: true,
      enemies: [e('todo'), e('kurushima'), e('sekibune'), e('sekibune', 1)],
      handlers: [{ hook: 'onEnemyDeath', cond: { enemyId: 'kurushima' },
                   ops: [{ op: 'status', who: 'all', id: 'shaken', n: 3 }, { op: 'fx', kind: 'banner', key: 'kurushima' }] }],
      mods: { tide: true },
      reinforce: { every: B.MYEONGNYANG.reinforceEvery, enemies: ['sekibune', 'sekibune'], cap: B.MYEONGNYANG.cap },
      reward: { relic: 'myeongnyang_chain' },
      intro: { title: '울돌목', memo: '물이 거꾸로 흐른다. 열두 척이 좁은 목에 섰다. 버텨라, 물이 바뀐다.' },
      memo: 'B6. 조류. 3턴마다 세키부네 2척, 총 등장 상한 8. 칠천량 분기는 Run 이 mods 로(§6.8)' },
    { id: 'boss_noryang', name: '시마즈 요시히로', type: 'naval', boss: true,
      enemies: [],
      waves: [
        { enemies: [e('shimazu_p1'), e('sekibune'), e('sekibune', 1)], intro: '시마즈의 대선단이 노량 앞바다를 메웠다.',
          trigger: { enemyDead: 'shimazu_p1' }, keepOthers: true },
        { enemies: [e('shimazu_p2')], intro: '퇴로 — 시마즈가 뱃머리를 돌려 들이받는다. 명의 수군이 포를 열었다.',
          resetDist: 1, extraDraw: 0, trigger: 'allDead', keepOthers: false,
          mods: { pushMax: B.NORYANG.pushMax, rescueDisabled: true },
          reinforce: { every: B.NORYANG.reinforceEvery, enemies: ['sekibune', 'sekibune'], cap: B.NORYANG.cap },
          onStart: [give('chen_lin_bombard'), give('deng_zilong'), give('ming_navy_square')] }
      ],
      reward: { relic: null, ops: [] },
      intro: { title: '노량', memo: '돌아가는 적을 바다에서 막는다. 일곱 해의 마지막 싸움이다.' },
      memo: 'B7. 2단계. 1단계 시마즈가 0이 되면 즉시 전환(남은 세키부네는 남긴다). 2단계 push 1칸 상한·구출 없음·2턴마다 증원 상한 6' },

    /* ----- 1막 튜토리얼 3 ----- */
    { id: 'tut_busan', name: '부산진', type: 'siege', enemies: [e('ashigaru_gun', 0), e('ashigaru_gun', 1)],
      mods: { noAdvanceTurns: 2, tutorial: 'far' }, memo: '튜토리얼 원거리. 2턴 동안 전진 없음' },
    { id: 'tut_gijang', name: '기장', type: 'field', enemies: [e('ashigaru_spear'), e('ashigaru_spear', 1)],
      mods: { tutorial: 'near' }, memo: '튜토리얼 중거리' },
    { id: 'tut_sangju', name: '상주', type: 'field', enemies: [e('ashigaru_spear'), e('samurai')],
      mods: { startDist: 2, tutorial: 'close' }, memo: '튜토리얼 근접. 근접 시작' },

    /* ----- 고정 편성 (사건·마디) ----- */
    { id: 'dongnae_hold', name: '동래성', type: 'siege', enemies: [e('ashigaru_spear'), e('ashigaru_spear', 1)], memo: 'E1 ① 동래성을 지킨다' },
    { id: 'ichi_hold', name: '이치 고개', type: 'field', enemies: [e('ashigaru_spear'), e('ashigaru_spear', 2), e('ashigaru_gun')], memo: 'E7 ③. 지형 고개는 battle op 가 준다' },
    { id: 'jeongam', name: '정암진', type: 'field', enemies: [e('ashigaru_spear'), e('ashigaru_spear', 1), e('wa_archer')], memo: '2막 뭍길 열2. 매복 교육' },
    { id: 'cheongju_elite', name: '조총병 셋', type: 'field', elite: true, enemies: [e('ashigaru_gun', 0), e('ashigaru_gun', 1), e('ashigaru_gun', 2)], memo: '2막 뭍길 정예' },
    { id: 'geumsan_elite', name: '금산의 왜장', type: 'field', elite: true, enemies: [e('wa_captain'), e('ashigaru_spear'), e('ashigaru_spear', 1)], memo: 'E8 ① 고경명과 함께. 평지는 battle op 가 준다' },
    { id: 'yeonan', name: '연안성', type: 'siege', enemies: [e('siege_laborer'), e('ashigaru_spear'), e('ashigaru_gun', 1)], memo: '2막 뭍길 열5. 승리 보상에 이정암(마디 onWin)' },
    { id: 'gyeongju', name: '경주성', type: 'assault', enemies: [e('wajo_garrison'), e('ashigaru_spear', 1)], memo: 'E9 가 띄우는 공성. 적 성벽 15 는 유형이 준다' },
    { id: 'okpo', name: '옥포', type: 'naval', enemies: [e('sekibune'), e('sekibune', 1), e('sekibune')], memo: '2막 바다길 열1' },
    { id: 'dangpo', name: '당포', type: 'naval', enemies: [e('sekibune'), e('sekibune', 1), e('kobaya')], memo: '2막 바다길 열3' },
    { id: 'danghangpo_elite', name: '당항포의 대장선', type: 'naval', elite: true, enemies: [e('enemy_flagship'), e('sekibune'), e('sekibune', 1)], memo: '2막 바다길 정예' },
    { id: 'yulpo', name: '율포', type: 'naval', enemies: [e('atakebune'), e('sekibune', 1)], memo: '2막 바다길 열5' },
    { id: 'gyeonnaeryang', name: '견내량', type: 'naval', enemies: [e('sekibune'), e('sekibune', 1), e('wa_scout')], memo: '한산 전야의 척후전. 척후를 먼저' },
    { id: 'pyongyang', name: '평양성', type: 'assault', enemies: [e('wajo_garrison'), e('ashigaru_gun', 0), e('ashigaru_gun', 1)],
      mods: { startHand: hand(['pyongyang_bombard', 'nambyeong_cannon']) }, memo: '3막 열2. 명군 동행 2장 군량 0' },
    { id: 'byeokje_elite', name: '고바야카와 복병', type: 'field', elite: true, enemies: [e('samurai'), e('samurai', 1), e('ashigaru_gun')], memo: 'E13 ②' },
    { id: 'doksan', name: '독산성', type: 'siege', enemies: [e('siege_laborer'), e('siege_laborer', 1), e('ashigaru_spear')], memo: '3막 열5. 수성 교육. 세마는 마디 onWin' },
    { id: 'hanseong_pursuit', name: '한성 추격', type: 'field', elite: true, enemies: [e('mounted_samurai'), e('ashigaru_spear'), e('ashigaru_spear', 1)], memo: 'E15 ①' },
    { id: 'monghak_elite', name: '이몽학의 반군', type: 'field', elite: true, enemies: [e('rebel_monghak'), e('nobushi'), e('nobushi', 1)], memo: 'E18 ③ · 4막 정예' },
    { id: 'yoshira_naval', name: '부산 출격', type: 'naval', elite: true, enemies: [e('atakebune'), e('sekibune'), e('sekibune', 1)], memo: 'E19 ①. 시작 병력 −10 은 battle op' },
    { id: 'busan_sea', name: '부산 앞바다', type: 'naval', enemies: [e('atakebune'), e('atakebune', 1), e('sekibune')], memo: '5막 열1(파직 아님). 통제영의 깃발은 마디 onWin' },
    { id: 'namwon', name: '남원성', type: 'siege', elite: true, enemies: [e('wa_captain'), e('siege_laborer'), e('siege_laborer', 1), e('ashigaru_gun')],
      mods: { startHand: hand(['folangji']) }, memo: '5막 열3 정예. 명군 불랑기 1장 동행' },
    { id: 'hwangseoksan', name: '황석산성', type: 'siege', enemies: [e('bamboo_bundle'), e('bamboo_bundle', 1), e('samurai')], memo: '5막 열3' },
    { id: 'unbong', name: '운봉', type: 'field', enemies: [e('samurai'), e('samurai', 1), e('ashigaru_gun')], memo: '5막 열4. 일반 풀과 같은 급' },
    { id: 'eoranpo', name: '어란포', type: 'naval', enemies: [e('sekibune'), e('sekibune', 1), e('sekibune'), e('atakebune')], memo: '6막 열2' },
    { id: 'ulsan', name: '울산 도산성', type: 'assault', elite: true, enemies: [e('wajo_garrison'), e('wajo_garrison', 1), e('ashigaru_gun')], memo: '7막 열1 정예' },
    { id: 'sacheon', name: '사천', type: 'field', elite: true, enemies: [e('wa_captain', 0, '시마즈의 선봉장'), e('mounted_samurai'), e('mounted_samurai', 1)], memo: '7막 열3 정예' },
    { id: 'suncheon', name: '순천 왜교성', type: 'assault', enemies: [e('wajo_garrison'), e('sekibune'), e('sekibune', 1)], memo: '7막 열3 · E26 ③. 수륙' },

    /* ----- 풀 일반 편성 (DESIGN §6.2 표) ----- */
    { id: 'p1_a', name: '창병 둘', type: 'field', enemies: [e('ashigaru_spear'), e('ashigaru_spear', 1)], memo: '1막' },
    { id: 'p1_b', name: '창병과 조총병', type: 'field', enemies: [e('ashigaru_spear'), e('ashigaru_gun')], memo: '1막' },
    { id: 'p1_c', name: '조총병 둘', type: 'field', enemies: [e('ashigaru_gun', 0), e('ashigaru_gun', 1)], memo: '1막' },
    { id: 'p1_d', name: '창병과 궁수', type: 'field', enemies: [e('ashigaru_spear'), e('wa_archer')], memo: '1막' },
    { id: 'p1_elite_a', name: '왜장과 창병', type: 'field', elite: true, enemies: [e('wa_captain'), e('ashigaru_spear'), e('ashigaru_spear', 1)], memo: '1막 정예' },
    { id: 'p2_sea_a', name: '중선 세 척', type: 'naval', enemies: [e('sekibune'), e('sekibune', 1), e('sekibune')], memo: '2막 바다' },
    { id: 'p2_sea_b', name: '안택선과 중선', type: 'naval', enemies: [e('atakebune'), e('sekibune')], memo: '2막 바다' },
    { id: 'p2_sea_c', name: '소선 떼', type: 'naval', enemies: [e('kobaya'), e('kobaya'), e('kobaya'), e('kobaya')], memo: '2막 바다' },
    { id: 'p2_sea_d', name: '척후를 앞세운 중선', type: 'naval', enemies: [e('sekibune'), e('sekibune', 1), e('wa_scout')], memo: '2막 바다' },
    { id: 'p2_land_a', name: '창병과 조총병', type: 'field', enemies: [e('ashigaru_spear'), e('ashigaru_spear', 1), e('ashigaru_gun')], memo: '2막 뭍' },
    { id: 'p2_land_b', name: '대나무 방패와 조총', type: 'field', enemies: [e('bamboo_bundle'), e('ashigaru_gun', 1)], memo: '2막 뭍' },
    { id: 'p2_land_c', name: '무사 둘', type: 'field', enemies: [e('samurai'), e('samurai', 1)], memo: '2막 뭍' },
    { id: 'p2_land_d', name: '왜군 약탈병', type: 'field', enemies: [e('nobushi'), e('nobushi', 1)], memo: '2막 뭍' },
    { id: 'p2_land_e', name: '창병·궁수·척후', type: 'field', enemies: [e('ashigaru_spear'), e('wa_archer'), e('wa_scout')], memo: '2막 뭍' },
    { id: 'p3_a', name: '조총병과 창병', type: 'field', enemies: [e('ashigaru_gun', 0), e('ashigaru_gun', 1), e('ashigaru_spear')], memo: '3막' },
    { id: 'p3_b', name: '무사와 대나무 방패', type: 'field', enemies: [e('samurai'), e('bamboo_bundle')], memo: '3막' },
    { id: 'p3_c', name: '기마 무사와 창병', type: 'field', enemies: [e('mounted_samurai'), e('ashigaru_spear')], memo: '3막' },
    { id: 'p5_a', name: '기마 무사와 조총병', type: 'field', enemies: [e('mounted_samurai'), e('ashigaru_gun')], memo: '5막' },
    { id: 'p5_b', name: '대나무 방패병 둘', type: 'field', enemies: [e('bamboo_bundle'), e('bamboo_bundle', 1)], memo: '5막' },
    { id: 'p5_c', name: '무사 둘과 조총병', type: 'field', enemies: [e('samurai'), e('samurai', 1), e('ashigaru_gun')], memo: '5막' },
    { id: 'p6_a', name: '중선 세 척과 안택선', type: 'naval', enemies: [e('sekibune'), e('sekibune', 1), e('sekibune'), e('atakebune')], memo: '6막' },
    { id: 'p6_b', name: '소선 셋과 중선', type: 'naval', enemies: [e('kobaya'), e('kobaya'), e('kobaya'), e('sekibune')], memo: '6막' },
    { id: 'p7_a', name: '안택선 둘과 중선', type: 'naval', enemies: [e('atakebune'), e('atakebune', 1), e('sekibune')], memo: '7막' },
    { id: 'p7_b', name: '왜성 수비대와 중선', type: 'assault', enemies: [e('wajo_garrison'), e('sekibune'), e('sekibune', 1)], memo: '7막. 수륙' }
  ];

  var pools = {
    act1:      { normal: ['p1_a', 'p1_b', 'p1_c', 'p1_d'], elite: ['p1_elite_a'] },
    act2_sea:  { normal: ['p2_sea_a', 'p2_sea_b', 'p2_sea_c', 'p2_sea_d'], elite: ['danghangpo_elite'] },
    act2_land: { normal: ['p2_land_a', 'p2_land_b', 'p2_land_c', 'p2_land_d', 'p2_land_e'], elite: ['cheongju_elite'] },
    act3:      { normal: ['p3_a', 'p3_b', 'p3_c'], elite: ['byeokje_elite'] },
    act4:      { normal: [], elite: ['monghak_elite'] },
    act5:      { normal: ['p5_a', 'p5_b', 'p5_c'], elite: ['namwon'] },
    act6:      { normal: ['p6_a', 'p6_b'], elite: [] },
    act7:      { normal: ['p7_a', 'p7_b'], elite: ['ulsan', 'sacheon'] }
  };

  /* ================================================================
   * 4. 색인·조회
   * ================================================================ */
  function index(arr, label) {
    var by = {};
    for (var i = 0; i < arr.length; i++) { by[arr[i].id] = arr[i]; }
    return { list: arr, byId: by, get: function (id) { if (!by[id]) { throw new Error(label + ': 없는 id ' + id); } return by[id]; } };
  }
  var tplIdx = index(list, 'ENEMIES');
  var encIdx = index(encounters, 'ENEMIES.encounters');
  function has(arr, v) { return arr.indexOf(v) >= 0; }

  /* ================================================================
   * 5. 막 배율·인스턴스
   * ================================================================ */
  // tags 에 'boss' 가 있으면 hp 고정. 그 밖은 floor(hp × (1 + hpPer × (act−1))) — 정수 연산으로 부동소수 오차를 없앤다.
  function scale(tpl, act) {
    var S = B.ACT_SCALE;
    var a = Math.max(1, Math.floor(Number(act) || 1));
    var per100 = Math.round(S.hpPer * 100);
    var isBoss = has(tpl.tags, 'boss');
    var hp = isBoss ? tpl.hp : Math.floor(tpl.hp * (100 + per100 * (a - 1)) / 100);
    var dmgAdd = S.dmgAdd[Math.min(a, S.dmgAdd.length) - 1];
    return { hp: hp, dmgAdd: dmgAdd };
  }

  // enemyInst — 모든 키를 지금 채운다. uid 는 Combat 이 Core.nextUid 로 준다.
  function makeInst(id, act, overrides) {
    var tpl = tplIdx.get(id);
    var ov = overrides || {};
    var base = (ov.hp != null) ? Object.assign({}, tpl, { hp: ov.hp }) : tpl;
    var sc = scale(base, act);
    var intents = Core.clone(tpl.intents);
    var off = (ov.offset != null) ? Math.floor(ov.offset) : 0;
    off = ((off % intents.length) + intents.length) % intents.length;
    return {
      uid: null, id: id, name: ov.name || tpl.name, hp: sc.hp, maxHp: sc.hp, block: 0, status: {},
      intents: intents, intentIdx: off, advance: tpl.advance, step: tpl.step, tags: tpl.tags.slice(),
      resist: tpl.resist || 0, passive: tpl.passive ? Core.clone(tpl.passive) : null, boss: has(tpl.tags, 'boss'),
      dmgAdd: sc.dmgAdd, buildCount: 0, dead: false, fled: false, wave: (ov.wave != null) ? ov.wave : 1
    };
  }

  function normWave(w, i) {
    return {
      enemies: Core.clone(w.enemies), intro: w.intro || null,
      resetDist: (w.resetDist != null) ? w.resetDist : null, extraDraw: w.extraDraw || 0,
      trigger: w.trigger || 'allDead', keepOthers: !!w.keepOthers,
      mods: w.mods ? Core.clone(w.mods) : null,
      reinforce: w.reinforce ? normReinforce(w.reinforce) : null,
      onStart: w.onStart ? Core.clone(w.onStart) : [], idx: i
    };
  }
  function normReinforce(r) {
    return { every: r.every, enemies: r.enemies.slice(), cap: r.cap, startTurn: (r.startTurn != null) ? r.startTurn : null };
  }

  // 편성 → 전투 요청 조각. 깊은 복사. rng 는 지금 쓰지 않는다(시그니처 고정).
  // overrides: { enemies?:[spec], mods?:{}, hp?:{id:n}, names?:{id:name} }
  function build(encId, act, rng, overrides) {
    var enc = encIdx.get(encId);
    var ov = overrides || {};
    var waves = enc.waves ? enc.waves.map(normWave) : null;
    var spec = ov.enemies ? ov.enemies : (waves ? waves[0].enemies : enc.enemies);
    var insts = [];
    for (var i = 0; i < spec.length; i++) {
      var s = spec[i];
      var o = { offset: s.offset || 0, name: s.name || null, hp: (s.hp != null) ? s.hp : null, wave: 1 };
      if (ov.hp && ov.hp[s.id] != null) { o.hp = ov.hp[s.id]; }
      if (ov.names && ov.names[s.id]) { o.name = ov.names[s.id]; }
      insts.push(makeInst(s.id, act, o));
    }
    var mods = enc.mods ? Core.clone(enc.mods) : {};
    if (ov.mods) { Object.assign(mods, Core.clone(ov.mods)); }
    return {
      id: enc.id, name: enc.name, type: enc.type, elite: !!enc.elite, boss: !!enc.boss,
      enemies: insts, waves: waves,
      reinforce: enc.reinforce ? normReinforce(enc.reinforce) : null,
      handlers: enc.handlers ? Core.clone(enc.handlers) : [],
      mods: mods,
      reward: enc.reward ? Core.clone(enc.reward) : null,
      intro: enc.intro ? Core.clone(enc.intro) : null
    };
  }

  /* ================================================================
   * 6. 자가 검사
   * ================================================================ */
  function selfTest() {
    var errors = [];
    function err(m) { errors.push(m); }
    var seen = {}, i, j, k, t, enc, w;

    // 적 틀
    for (i = 0; i < list.length; i++) {
      t = list[i];
      if (!t.id || seen[t.id]) { err('적 id 중복/없음: ' + t.id); } seen[t.id] = true;
      if (!/^[a-z0-9_]+$/.test(t.id)) { err('적 id 규칙 위반: ' + t.id); }
      if (!t.name || !(t.hp > 0) || !has(ADV, t.advance) || !(t.step === 1 || t.step === 2)) { err('적 필수 필드: ' + t.id); }
      if (!Array.isArray(t.tags) || !Array.isArray(t.intents) || !t.intents.length) { err('적 tags/intents: ' + t.id); continue; }
      for (j = 0; j < t.intents.length; j++) {
        var it = t.intents[j];
        if (!it || !has(KINDS, it.kind)) { err('의도 kind: ' + t.id + '[' + j + '] ' + (it && it.kind)); continue; }
        if (it.kind === 'atk' && (!(it.n >= 0) || !has(ATK_TAGS, it.tag))) { err('atk 의도 n/tag: ' + t.id + '[' + j + ']'); }
        if (it.kind === 'atk' && it.alt && (!it.alt.if || !(it.alt.n >= 0) || !has(ATK_TAGS, it.alt.tag))) { err('alt 의도: ' + t.id + '[' + j + ']'); }
        if (has(['pull', 'block', 'rally', 'raid', 'incite'], it.kind) && !(it.n > 0)) { err('의도 n: ' + t.id + '[' + j + ']'); }
        if (it.kind === 'reinforce' && (!tplIdx.byId[it.id] || !(it.n > 0) || !(it.cap > 0))) { err('reinforce 의도 id/n/cap: ' + t.id + '[' + j + ']'); }
        if (it.kind === 'ops' && !Array.isArray(it.ops)) { err('ops 의도 ops 배열: ' + t.id + '[' + j + ']'); }
        if (typeof it.text !== 'string' || !it.text) { err('의도 text: ' + t.id + '[' + j + ']'); }
      }
      if (t.passive && typeof t.passive.shotPctAtFar !== 'number') { err('passive 키: ' + t.id); }
    }
    var tplCount = 16 + 11;
    if (list.length !== tplCount) { err('적 틀 수 ' + list.length + ' ≠ ' + tplCount); }

    // 편성
    seen = {};
    function checkSpec(spec, where) {
      if (!Array.isArray(spec)) { err('enemies 배열 아님: ' + where); return; }
      if (spec.length > B.ENEMY_MAX) { err('동시 적 수 초과: ' + where); }
      for (var q = 0; q < spec.length; q++) {
        var s = spec[q], tp = tplIdx.byId[s.id];
        if (!tp) { err('편성의 적 id 없음: ' + where + ' ' + s.id); continue; }
        if (s.offset != null && (s.offset < 0 || s.offset >= tp.intents.length)) { err('offset 범위: ' + where + ' ' + s.id); }
        if (s.hp != null && !(s.hp > 0)) { err('hp 덮어쓰기 값: ' + where + ' ' + s.id); }
      }
    }
    function checkReinforce(r, where) {
      if (!(r.every > 0) || !(r.cap > 0) || !Array.isArray(r.enemies) || !r.enemies.length) { err('reinforce every/cap/enemies: ' + where); return; }
      for (var q = 0; q < r.enemies.length; q++) { if (!tplIdx.byId[r.enemies[q]]) { err('reinforce 적 id 없음: ' + where + ' ' + r.enemies[q]); } }
    }
    for (i = 0; i < encounters.length; i++) {
      enc = encounters[i];
      if (!enc.id || seen[enc.id]) { err('편성 id 중복/없음: ' + enc.id); } seen[enc.id] = true;
      if (!/^[a-z0-9_]+$/.test(enc.id)) { err('편성 id 규칙 위반: ' + enc.id); }
      if (!enc.name || !has(TYPES, enc.type)) { err('편성 name/type: ' + enc.id); }
      if (enc.waves) {
        if (enc.enemies.length) { err('waves 있는 편성은 enemies 를 비운다: ' + enc.id); }
        if (!Array.isArray(enc.waves) || !enc.waves.length) { err('waves 비어 있음: ' + enc.id); }
        for (j = 0; j < (enc.waves || []).length; j++) {
          w = enc.waves[j];
          checkSpec(w.enemies, enc.id + '.waves[' + j + ']');
          if (w.trigger && w.trigger !== 'allDead') {
            if (!w.trigger.enemyDead) { err('wave trigger 모양: ' + enc.id + '[' + j + ']'); }
            else {
              var found = false;
              for (k = 0; k < w.enemies.length; k++) { if (w.enemies[k].id === w.trigger.enemyDead) { found = true; } }
              if (!found) { err('wave trigger.enemyDead 가 그 파도에 없음: ' + enc.id + '[' + j + ']'); }
            }
          }
          if (w.resetDist != null && !(w.resetDist >= 0 && w.resetDist <= 2)) { err('wave resetDist: ' + enc.id + '[' + j + ']'); }
          if (w.reinforce) { checkReinforce(w.reinforce, enc.id + '.waves[' + j + ']'); }
          if (w.onStart && !Array.isArray(w.onStart)) { err('wave onStart 배열: ' + enc.id + '[' + j + ']'); }
        }
      } else {
        checkSpec(enc.enemies, enc.id);
        if (!enc.enemies.length) { err('편성에 적이 없음: ' + enc.id); }
      }
      if (enc.reinforce) { checkReinforce(enc.reinforce, enc.id); }
      if (enc.handlers) {
        for (j = 0; j < enc.handlers.length; j++) {
          if (!enc.handlers[j].hook || !Array.isArray(enc.handlers[j].ops)) { err('handler hook/ops: ' + enc.id + '[' + j + ']'); }
        }
      }
      if (enc.boss && enc.reward === undefined) { err('결전 reward 키 없음: ' + enc.id); }
      if (enc.boss && !enc.intro) { err('결전 intro 없음: ' + enc.id); }
      if (enc.mods && enc.mods.startHand) {
        for (j = 0; j < enc.mods.startHand.length; j++) { if (!enc.mods.startHand[j].id) { err('startHand id: ' + enc.id); } }
      }
    }

    // 풀
    for (var pk in pools) {
      var p = pools[pk];
      if (!Array.isArray(p.normal) || !Array.isArray(p.elite)) { err('풀 모양: ' + pk); continue; }
      var all = p.normal.concat(p.elite);
      for (j = 0; j < all.length; j++) {
        if (!encIdx.byId[all[j]]) { err('풀의 편성 id 없음: ' + pk + ' ' + all[j]); }
        else if (encIdx.byId[all[j]].boss) { err('풀에 결전이 있음: ' + pk + ' ' + all[j]); }
      }
      for (j = 0; j < p.elite.length; j++) { if (encIdx.byId[p.elite[j]] && !encIdx.byId[p.elite[j]].elite) { err('풀 정예가 elite 아님: ' + pk + ' ' + p.elite[j]); } }
      for (j = 0; j < p.normal.length; j++) { if (encIdx.byId[p.normal[j]] && encIdx.byId[p.normal[j]].elite) { err('풀 일반이 elite: ' + pk + ' ' + p.normal[j]); } }
    }
    var mustPools = ['act1', 'act2_sea', 'act2_land', 'act3', 'act4', 'act5', 'act6', 'act7'];
    for (i = 0; i < mustPools.length; i++) { if (!pools[mustPools[i]]) { err('풀 없음: ' + mustPools[i]); } }

    // 계약서 §3.3 ID 전부 존재
    var mustEnemies = ['ashigaru_spear', 'ashigaru_gun', 'wa_archer', 'mounted_samurai', 'samurai', 'wa_captain', 'siege_laborer', 'bamboo_bundle',
      'nobushi', 'sekibune', 'kobaya', 'atakebune', 'enemy_flagship', 'wajo_garrison', 'rebel_monghak', 'wa_scout',
      'konishi', 'wakizaka', 'hosokawa', 'ukita_w1', 'ukita_w2', 'ukita_w3', 'kuroda', 'todo', 'kurushima', 'shimazu_p1', 'shimazu_p2'];
    for (i = 0; i < mustEnemies.length; i++) { if (!tplIdx.byId[mustEnemies[i]]) { err('계약 적 id 없음: ' + mustEnemies[i]); } }
    var mustEnc = ['boss_konishi', 'boss_wakizaka', 'boss_jinju1', 'boss_haengju', 'boss_jiksan', 'boss_myeongnyang', 'boss_noryang',
      'tut_busan', 'tut_gijang', 'tut_sangju', 'dongnae_hold', 'ichi_hold', 'jeongam', 'cheongju_elite', 'geumsan_elite', 'yeonan', 'gyeongju',
      'okpo', 'dangpo', 'danghangpo_elite', 'yulpo', 'gyeonnaeryang', 'pyongyang', 'byeokje_elite', 'doksan', 'hanseong_pursuit', 'monghak_elite',
      'yoshira_naval', 'busan_sea', 'namwon', 'hwangseoksan', 'unbong', 'eoranpo', 'ulsan', 'sacheon', 'suncheon'];
    for (i = 0; i < mustEnc.length; i++) { if (!encIdx.byId[mustEnc[i]]) { err('계약 편성 id 없음: ' + mustEnc[i]); } }

    // 배율·인스턴스·build 왕복
    try {
      var sc = scale(tplIdx.get('ashigaru_spear'), 3);
      var want3 = Math.floor(16 * (100 + Math.round(B.ACT_SCALE.hpPer * 100) * 2) / 100);
      if (sc.hp !== want3 || sc.dmgAdd !== B.ACT_SCALE.dmgAdd[2]) { err('scale(창 아시가루, 3막) 기대 {' + want3 + '} 실제 ' + JSON.stringify(sc)); }
      if (scale(tplIdx.get('konishi'), 7).hp !== tplIdx.get('konishi').hp) { err('보스 체력이 고정이 아님'); }
      var want7 = Math.floor(40 * (100 + Math.round(B.ACT_SCALE.hpPer * 100) * 6) / 100);
      if (scale(tplIdx.get('wa_captain'), 7).hp !== want7) { err('정예 체력 배율(7막 왜장 ' + want7 + ') 실제 ' + scale(tplIdx.get('wa_captain'), 7).hp); }
      var inst = makeInst('ashigaru_gun', 1, { offset: 1 });
      if (inst.intentIdx !== 1 || inst.hp !== 13 || inst.uid !== null || inst.dmgAdd !== 0) { err('makeInst 기본값'); }
      if (JSON.stringify(JSON.parse(JSON.stringify(inst))) !== JSON.stringify(inst)) { err('inst JSON 왕복'); }
      for (i = 0; i < encounters.length; i++) {
        for (var act = 1; act <= 7; act++) {
          var r = build(encounters[i].id, act, null, null);
          if (JSON.stringify(JSON.parse(JSON.stringify(r))) !== JSON.stringify(r)) { err('build JSON 왕복: ' + encounters[i].id); }
          if (!r.enemies.length) { err('build enemies 비어 있음: ' + encounters[i].id); }
          for (j = 0; j < r.enemies.length; j++) {
            if (r.enemies[j].intents === tplIdx.byId[r.enemies[j].id].intents) { err('intents 가 깊은 복사가 아님: ' + encounters[i].id); }
          }
        }
      }
      var ny = build('boss_noryang', 7, null, null);
      if (!ny.waves || ny.waves.length !== 2 || ny.enemies.length !== 3 || ny.waves[1].mods.pushMax !== 1 || !ny.waves[1].mods.rescueDisabled) { err('노량 파도 모양'); }
      var hj = build('boss_haengju', 3, null, null);
      if (!hj.waves || hj.waves.length !== 3 || hj.waves[2].onStart.length !== 2) { err('행주 파도 모양'); }
      var mn = build('boss_myeongnyang', 6, null, null);
      if (!mn.mods.tide || !mn.reinforce || mn.reinforce.cap !== B.MYEONGNYANG.cap) { err('명량 mods/reinforce'); }
      var jk = build('boss_jiksan', 5, null, { mods: { enemyHpPct: -0.15 } });
      if (jk.mods.startHand.length !== 3 || jk.mods.enemyHpPct !== -0.15) { err('직산 startHand/overrides.mods'); }
      var sn = build('sacheon', 7, null, { names: { wa_captain: '시험' } });
      if (sn.enemies[0].name !== '시험') { err('overrides.names'); }
    } catch (ex) { err('예외: ' + (ex && ex.message)); }

    // JSON 왕복(데이터 전체)
    try {
      var blob = { list: list, encounters: encounters, pools: pools };
      if (JSON.stringify(JSON.parse(JSON.stringify(blob))) !== JSON.stringify(blob)) { err('데이터 JSON 왕복 불일치'); }
    } catch (ex2) { err('데이터 직렬화 예외: ' + (ex2 && ex2.message)); }

    return { ok: errors.length === 0, errors: errors };
  }

  return {
    list: tplIdx.list, byId: tplIdx.byId, get: tplIdx.get,
    encounters: encIdx,
    pools: pools,
    KINDS: KINDS,
    scale: scale, makeInst: makeInst, build: build,
    selfTest: selfTest
  };
})();
