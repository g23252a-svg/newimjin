# 징비(懲毖) — 구현 계약서 (CONTRACT) v2

> 이 문서는 `DESIGN.md`(수치·콘텐츠의 정본)를 **코드로 옮기기 위한 계약**이다.
> 16개 파일을 서로 다른 사람이 동시에 쓴다. 여기 적힌 이름·시그니처·스키마·ID와 다르게 쓰면 통합이 깨진다.
> 규칙이 DESIGN.md와 다르게 보이면 **이 문서가 이긴다** (§13 「의도적 차이」에 사유를 적어 두었다).
> v2: 검토자 3명의 지적 75건을 반영했다(파일 번호 변경, 파도·의도·who 스키마 확장, 미리보기 규약, 구출 재개, 저장 시점, 플래그 정리 등).

---

## 0. 절대 규칙

1. **파일 하나 = 전역 하나.** 각 파일은 최상위에 `var NAME = (function(){ 'use strict'; … return api; })();` 하나만 정의한다. 다른 최상위 `var/let/const/function`을 만들지 않는다. (`var`를 쓰는 이유: 브라우저와 node vm 양쪽에서 전역 객체의 속성이 되어 `--eval`로 접근할 수 있다.)
2. **로드 순서가 곧 의존 방향이다.** 뒤 파일은 앞 파일의 전역을 쓸 수 있고, 앞 파일은 뒤 파일을 모른다. 예외 하나: `09~12`(Input·Audio_·UIBattle·UIScreens)는 `Main`을 **함수 본문 안에서만**(지연 참조) 쓸 수 있다. IIFE 최상위에서 `Main`을 읽으면 안 된다. `Core.bus`를 통한 이벤트는 방향과 무관하다.
3. **02~08은 순수하다.** `window`·`document`·`canvas`·`AudioContext`·`localStorage`·`requestAnimationFrame`·`Date`·`Math.random`·`performance`·`setTimeout`을 참조하지 않는다. 난수는 오직 `Core.rand(rngState)`. 상태는 전부 `JSON.stringify` 왕복 가능(함수·순환 참조 금지). **선택 필드는 키를 아예 두지 않거나 `null`로 둔다(`undefined` 대입·`delete` 금지).** Combat/Run이 만드는 inst·enemyInst·prompt는 모든 키를 생성 시점에 한 번에 채운다(예: `inst = {uid, id, up, generated:false, marked:false, tmpCost:null}`).
4. **데이터 파일(02~06)은 코드가 아니다.** 효과는 전부 §4의 DSL `ops` 배열. 함수 값을 넣지 않는다. 예외: `TXT`의 생성 함수(`compare`, `date` 등)와 `MAPDATA.next()` 같은 조회 함수.
5. **ID는 이 문서의 것을 그대로 쓴다** (§3). 새 ID가 필요하면 같은 규칙(ASCII 소문자·밑줄)으로 만들고 파일 상단 주석에 적는다.
6. **수치는 `Core.BAL`에서 읽는다.** 카드·적·사건 데이터의 고유 수치(피해 6, 체력 16)는 데이터에 두고, 규칙 수치(군령 3, 손 상한 10, 문턱 4/7/10, 배율표, 군영 30%, 조정 −2)는 `BAL`에서만 읽는다. 데이터 파일에 규칙 수치를 복제하지 않는다. UI 좌표는 각 UI 파일 상단 상수 객체에.
7. **소수는 전부 `Math.floor`.** hp pct, 배율, 군영 30%, 할인 10%, 장계 분배 몫 — Combat과 Run이 공통 op를 각자 구현하되 이 규칙과 clamp 범위(의심 0~10, 군량 ≥0, 병력 ≤최대)를 똑같이 지킨다.
8. **한국어, 사극 톤.** 사용자에게 보이는 모든 문자열은 한국어. `DESIGN.md` §12 문체 견본을 따른다. 날짜는 음력, `DESIGN.md` §11 사료 메모에 있는 것만.
9. **자기 파일만 쓴다.** 다른 파일이 필요하면 고치지 말고 상단 주석 `// TODO(통합): …`으로 남긴다. 통합 담당이 모아서 고친다.
10. 모든 파일 첫 줄은 `/* ===== NN_name.js — 한 줄 설명 ===== */`, 그 아래 `var NAME = (function(){ 'use strict';`.
11. 줄 수 상한은 §1 표. 넘기면 안 되는 게 아니라 **그 안에 끝내도록 설계**하라는 뜻이다. 20% 초과까지는 허용.

---

## 1. 파일·전역·로드 순서 (v2에서 번호가 바뀌었다)

| 순서 | 파일 | 전역 | 담당 | 상한(줄) | 의존 |
|---|---|---|---|---|---|
| 00 | `src/00_core.js` | `Core` | A | 500 | — |
| 01 | `src/01_text.js` | `TXT` | F | 1,000 | Core |
| 02 | `src/02_cards.js` | `CARDS` | B | 900 | Core |
| 03 | `src/03_enemies.js` | `ENEMIES` | D | 700 | Core |
| 04 | `src/04_generals.js` | `GENERALS` | G | 500 | Core |
| 05 | `src/05_events.js` | `EVENTS` | F2 | 800 | Core |
| 06 | `src/06_map.js` | `MAPDATA` | E2 | 400 | Core |
| 07 | `src/07_combat.js` | `Combat` | C | 1,400 | Core, TXT, CARDS, ENEMIES, GENERALS |
| 08 | `src/08_run.js` | `Run` | E | 1,000 | Core, TXT, CARDS, ENEMIES, GENERALS, EVENTS, MAPDATA (Combat은 호출하지 않는다) |
| 09 | `src/09_input.js` | `Input` | A2 | 400 | Core (+Main 지연) |
| 10 | `src/10_audio.js` | `Audio_` | G2 | 400 | Core (+Main 지연) |
| 10b | `src/10b_art.js` | `ART` | — | 900 | Core (순수 그리기: 캐릭터·배·성·아이콘·카드 그림·초상. 상태를 읽지 않는다) |
| 11 | `src/11_ui_battle.js` | `UIBattle` | H | 1,500 | 00~10b (+Main 지연) |
| 12 | `src/12_ui_screens.js` | `UIScreens` | I | 1,400 | 00~11 (+Main 지연) |
| 13 | `src/13_main.js` | `Main` | A3 | 300 | 전부 |

`index.html`(개발용)은 `<html lang="ko" data-slug="jingbi">`, `<canvas id="cv" width="1280" height="720">`를 `<div id="wrap">` 안에 두고 위 순서로 `<script src="src/…"></script>`, 마지막에 `<script>Main.start();</script>`. `py build.py --out jingbi.html`이 단일 HTML을 만든다. `test/headless.js`(있음)가 같은 순서로 vm에 로드한다(`Main.start()`는 부르지 않는다 — 로드만으로 오류가 없어야 한다).

데이터 전역의 공통 모양: `{ list:[…], byId:{id:obj}, get(id) }` — `get`은 없으면 `throw new Error('CARDS: 없는 id '+id)`.

---

## 2. Core (`00_core.js`)

```js
Core.VERSION            // '1.0.0'. 저장 호환 판별
Core.SAVE_KEY           // 'jingbi_save_v1'
Core.SETTINGS_KEY       // 'jingbi_settings_v1'
Core.DIST               // { FAR:0, NEAR:1, CLOSE:2 }  — 遠 近 接
Core.BAL                // §2.1
Core.rngNew(seed)       // seed: number|string → {s:uint32}  (mulberry32 상태. 문자열은 Core.hash)
Core.rand(r)            // r={s} 를 전진시키고 [0,1) 반환
Core.randInt(r,a,b)     // a..b 정수(포함)
Core.pick(r,arr)        // 원소 하나 (빈 배열이면 null)
Core.shuffle(r,arr)     // 제자리 섞기, arr 반환
Core.weighted(r, [{w, v}]) // 가중 추출 → v
Core.hash(str)          // uint32 (FNV-1a)
Core.clamp(v,a,b)  Core.lerp(a,b,t)  Core.clone(o) /* JSON 왕복 */  Core.assert(cond,msg) /* 실패 시 throw */
Core.bus.on(type, fn) → unsubscribe fn;  Core.bus.off(type, fn);  Core.bus.emit(type, payload)
Core.save(key,obj) / Core.load(key) → obj|null / Core.clear(key)   // localStorage 없거나 예외면 조용히 null
Core.nextUid(state)     // state.uidCounter 를 1 올려 'u'+n 반환 (전투/판 상태 모두 이 방식)
Core.fmtNum(n)          // 숫자 표기
Core.selfTest() → {ok, errors}
```

`bus.emit`은 동기. 구독자 예외는 잡아서 `console.error`로만 내보낸다(상태 전이를 막지 않는다).

### 2.1 `Core.BAL` — 키 이름 (값은 DESIGN.md가 정본, 아래는 정본 값)

```js
BAL = {
  ENERGY:3, DRAW:5, HAND_MAX:10, DECK_MIN:12, TURN_CAP:30, TURN_CAP_PENALTY:0.10, TURN_HARD:100, ENEMY_MAX:6,
  RESCUE_HP:20, RESCUE_AUTO_MS:5000,
  LEADER_HP:{ yi:80, gwon:84 },  SUSP_START:{ yi:1, gwon:0 },
  SUSP_MAX:10, SUSP_THRESH:[4,7,10], EDICT_CAP:3, PRISON_RESET:7, PRISON_NO_DEPUTY_MAXHP:-10,
  RATION_START:50, RATION_FIGHT:[10,20], RATION_ELITE:35, RATION_BOSS:60, RATION_SKIP:5, RATION_NO_RELIC:30,
  SHOP:{ card:{common:30, rare:50, special:50, leader:60}, relic:[80,120], remove:40, removeEdict:90, discount:0.10, cards:5, relics:2 },
  CAMP:{ restPct:0.30, farm:40 },
  COURT:{ report:-2, requestCost:20, requestPick:3 },
  REWARD:{ common:0.70, rare:0.25, special:0.05, leaderChance:0.15, cards:3 },
  MERIT:{ total:10, default:{leader:4, king:6, ming:0}, leaderPer:4, leaderMaxUp:2, leaderSusp5:1, leaderSusp10:2,
          kingPer:3, kingMaxDown:3, kingRation:5, mingPer:5, mingMaxDiscount:2 },
  // 거리 배율표. 인덱스 = 거리(0遠 1近 2接). 적 melee의 遠은 0 = 불가(접근으로 바뀜). charge는 이동 후 항상 1.5
  MULT:{ shot:[1.5,1,0.5], melee:[0.7,1,1.2], charge:[1.5,1.5,1.5], fire:[1,1,1], none:[1,1,1],
         e_gun:[0.5,1,0.8], e_melee:[0,1,1.5], e_bow:[1,1,1] },
  HOME_BONUS:1.4, SHAKEN_PCT:0.25, EXPOSED_PCT:0.50, FLINCH_PCT:0.50, HIDE_PCT:0.70, HIDE_PLUS_PCT:0.80,
  EDICT_ATK_PCT:0.50, DOKJEON_PCT:0.60, WON_GYUN_PCT:0.20,
  YI:{ hpPct:40, atkPct:0.40 }, GWON_KEEP:3, GWON_DEPUTY_KEEP:2,
  ACT_SCALE:{ hpPer:0.12, dmgAdd:[0,0,1,1,2,2,3] },
  SIEGE_WALL:10, ASSAULT_ENEMY_WALL:15, WAESEONG_GUN_PCT:0.20, RIDGE_BLOCK:5, RIDGE_HOLD:2, RIVER_MOMENTUM:3,
  TIDE:{ period:3, ebbStep:2, ebbPush:-1, flowEnergy:1, flowPush:1 },
  MYEONGNYANG:{ todoHp:160, todoHpNoChilcheon:180, reinforceEvery:3, reinforceEveryNoChilcheon:2, cap:8, miracleNavyBonus:4 },
  NORYANG:{ p1:120, p2:150, reinforceEvery:2, cap:6, pushMax:1 },
  DRAW_HOOK_CAP:3, GUN_PIERCE:0.5,
  SCORE:{ node:10, elite:30, boss:100, hpMul:2, suspMul:15, smallDeck:{max:25, bonus:100},
          branch:{ joryeong:150, jinju1:100, jinju2:200, notDismissed:200, noChilcheon:150, miracle:300, yiAlive:250 } },
  COUNCIL:{ dismissAt:7, rationCost:30, maxRemove:2, afterDismiss:3 },
  FX_MS:250, FX_WAIT_MAX_MS:500, LONG_PRESS_MS:400, TAP_MIN:44,
};
```

---

## 3. 데이터 스키마와 ID

### 3.1 공통 조건 객체 `cond`

op `cond`의 `if`, 훅의 `cond`, 사건·노드 `variants[].if`, 선택지 `if`, 카드 `costIf.if`, 의도 `alt.if`, mods의 `if`에서 같은 모양. 모든 필드는 AND. 값이 배열이면 OR(`dist:[0,1]`, `enemyId:['sekibune','kobaya']`).

| 필드 | 뜻 | 맥락 |
|---|---|---|
| `dist: 0|1|2|[…]` / `distNot: n` | 현재 거리 | 전투 |
| `hpPct:{lte?,gte?}` | 병력 백분율(0~100) | 전투·판 |
| `naval/siege/assault/field: true` | 전투 유형 | 전투 |
| `turn: n` / `turnLte: n` | 전투 턴 | 전투 |
| `hasWall: true` | 아군 성벽 진형 > 0 | 전투 |
| `tide: 'ebb'|'flow'` / `wave: n` | 조류 / 현재 파도(1부터) | 전투 |
| `cardTag / cardType / cardPool / cardId / cardMarked` | 맥락 카드(훅 onCardPlayed/onCardDrawn의 카드, **카드 자신의 ops에서는 지금 내는 카드**) | 전투 |
| `enemyId: id|[…]` / `enemyTag: tag` | 맥락 적(onEnemyDeath/onEnemySpawn, 의도 alt에서는 실행 중인 적) | 전투 |
| `handCount:{lte?,gte?}` / `cardsPlayedThisTurn:{gte}` | (`playing` 카드는 세지 않는다) | 전투 |
| `deckTagCount:{tag, lte?, gte?}` | 덱(전투 중이면 모든 더미 합, playing 포함) 안의 태그 카드 수 | 전투·판 |
| `hasCard: id` / `hasRelic: id` / `hasDeputy: id` / `noDeputy: id` | | 전투·판 |
| `flag:{key:value}` | `G.flags` (전투에는 `req.flags` 사본) — 없는 키는 `false`/`undefined`와 같게 본다(`{chilcheon:false}`는 미설정에도 참) | 전투·판 |
| `leader: id` / `lane: 'sea'|'land'` / `act: n` / `actGte: n` | | 판 |
| `ration:{gte?}` / `suspicion:{lte?,gte?}` / `slotsFree: true` | | 판 |
| `oncePerBattle: true` / `oncePerTurn: true` | 이 핸들러·mod가 그 범위에서 아직 발화 안 함 | 훅·mod 전용 |

### 3.2 카드 (`CARDS.list`, 99장)

```js
{ id, name, hanja?, pool:'base'|'common'|'navy'|'uibyeong'|'tactic'|'siege'|'ming'|'leader'|'deputy'|'edict'|'event'|'token',
  type:'atk'|'def'|'tac'|'rep'|'edict',          // 攻 守 策 狀 御
  cost:0|1|2|3, costIf?:{ if:cond, cost:n },      // 필사즉생: {if:{hpPct:{lte:50}}, cost:0}
  rarity:'common'|'rare'|'special'|null,          // 토큰·어명·사건·부장 카드는 null
  tags:[ 'shot'|'melee'|'charge'|'fire'|'none', ...('pierce'|'navy'|'uibyeong'|'ming'|'siege')* ],
  home?:'경상'|'전라'|'충청'|'경기'|'강원'|'황해'|'평안'|'함경',
  ration?: n,                                     // 낼 때 군량 소비(명군)
  exhaust?: true, retain?: true,
  owner?: 'yi'|'gwon'|deputyId,                   // 주장·부장 고유
  ops: [ … ], onDraw?: [ … ],                     // §4. onDraw 안에는 choose:true 금지
  desc: '6 피해.',                                 // 규칙 문구. 거리 배율·지역 보정 문구는 TXT.cardDesc가 붙인다
  plus: { cost?, costIf?, ops?, onDraw?, desc?, ration?, exhaust?:false, retain?:true },  // 강화판에서 바뀌는 필드만. 기본판 값을 덮어쓴다
  memo: '각궁' }
```
태그 규칙: 공격 카드(ops에 dmg가 있는 카드)의 **첫 태그**는 거리 배율 태그. 풀과 별개로 수군 풀 전부 `'navy'`, 명군 풀·명 수군 토큰 `'ming'`, 수성 풀 `'siege'`, 관통 카드 `'pierce'`. **`'uibyeong'` = pool 'uibyeong' 전부 + `militia` 토큰 + `home`이 있는 모든 카드**(90·91 포함; check.js: home이 있으면 uibyeong 태그 필수).

**ID 목록 (DESIGN.md §6.1 번호 순)**
```
1 bowstring 활시위 · 2 spear_wall 창을 세워라 · 3 retreat_horn 퇴각 나팔 · 4 war_drum 북을 울려라 · 5 report 장계 · 6 hwando 환도 · 7 throw_stone 돌을 던져라
8 pyeonjeon 편전 · 9 seungja 승자총통 · 10 hide 숨어라 · 11 shield_wall 방패벽 · 12 iron_wall 철벽 · 13 pike_square 장창 방진 · 14 volley 일제 사격 · 15 scout 척후 · 16 regroup 전열 정비 · 17 cavalry_charge 기병 돌격 · 18 arrow_rain 화살비 · 19 archer_ambush 궁수 매복 · 20 samsu 삼수병 · 21 whip 등채질 · 22 resolve 결사 · 23 ash_bag 재주머니 · 24 cannon_volley 총통 일제 · 25 jincheonroe 비격진천뢰 · 26 discipline 군율 · 27 pajin 파진
28 cheonja 천자총통 · 29 crane_wing 학익진 · 30 turtle_ship 거북선 · 31 retreat_fire 후퇴 사격 · 32 panok_turn 판옥선 선회 · 33 daejanggun 대장군전 · 34 lure 유인 · 35 fire_arrow 화전 · 36 rowers 격군 · 37 twelve_ships 열두 척 · 38 flagship 장군선 · 39 rolling_fire 포격 교대
40 manifesto 격문 · 41 militia 의병(토큰) · 42 red_robe 홍의 · 43 uiryeong_rising 의령 창의 · 44 jeongam_ambush 정암진 매복 · 45 geumsan_drum 금산의 북 · 46 monk_soldiers 승병 · 47 mountain_raid 산길 기습 · 48 people_stones 백성의 돌 · 49 monk_rally 의승군 결집 · 50 bamboo_spear 죽창 · 51 ambush_fire 매복 사격
52 scorched_earth 청야 · 53 counter_spy 반간 · 54 parley 회담 · 55 nanjung_diary 난중일기 · 56 scarecrow 허수아비·풍악 · 57 scout_boat 척후선 · 58 memorial 장계 상소 · 59 beacon 봉수 · 60 castle_well 성 안의 우물 · 61 desperate_call 결사의 격문 · 62 baesujin 배수진
63 mountain_fort 산성 · 64 hwacha 화차 · 65 hyeonja 현자총통 · 66 repair_parapet 성가퀴 수리 · 67 ongseong 옹성 · 68 counter_mound 역토산 · 69 gate_sally 성문 역습 · 70 boiling_water 끓는 물
71 pyongyang_bombard 평양성 포격 · 72 nambyeong_cannon 남병 화포 · 73 li_cavalry 이여송 기병 · 74 folangji 불랑기 · 75 langseon 낭선·등패 · 76 request_troops 청병 · 77 chen_lin_bombard 진린의 포격 · 78 deng_zilong 등자룡의 돌격 · 79 ming_navy_square 명 수군 방진
80 pilsa_jeuksaeng 필사즉생 · 81 not_one_ship 한 척도 잃지 않는다 · 82 sinsang_pilbeol 신상필벌 · 83 danghangpo_lure 당항포의 유인 · 84 hwacha_volley 화차 일제 · 85 sema 세마 · 86 die_standing 서서 죽는다 · 87 level_ground 진 고르기
88 jeolla_right 전라우수영 · 89 wall_rally 성벽 독전 · 90 bukgwan_cavalry 북관 기병 · 91 seven_hundred 칠백의사 · 92 ichi_bow 이치의 활 · 93 yeonan_fort 연안성
94 edict_advance 진격하라 · 95 edict_blame 문책 · 96 edict_arrest 압송 · 97 edict_envy 시기 · 98 jochong 조총 · 99 dokjeon 독전
```
**카드 표현 지침(동결)** — 담당 B는 이대로 쓴다:
- 4 북을 울려라: `{op:'buff', id:'nextAtk', n:3, turns:1}` · 45 금산의 북: `block 5` + `{op:'buff', id:'atkAdd', n:2, turns:1}` · 89 성벽 독전: `block 6 wall` + `{op:'buff', id:'shotAdd', n:2, turns:1}`
- 17·73·78·90 돌격류: `dmg tag:'charge'`만(이동은 엔진이) · 30 거북선: `pull 2` → `dmg 18 tag:'none'` → `buff noMelee turns:1`
- 27 파진: **`stripBlock` 먼저**, 그 다음 `dmg 10 melee` · 43 의령 창의: `{op:'dmg', n:0, tag:'none', perCardsPlayed:2}`(자기 자신 포함해 센다)
- 76 청병: `{op:'addCard', pool:'ming', n:1, where:'hand', generated:true}` + `ration −3` · 37 열두 척: `cond deckTagCount:{tag:'navy', lte:12}` · 80 필사즉생: `costIf`
- 94 진격하라: `{op:'buff', id:'atkPct', n:BAL.EDICT_ATK_PCT(=0.5), turns:1}` + `pull 2` + `{op:'buff', id:'chargeAtClose', turns:1}`, `retain:true` · 99 독전: `{op:'buff', id:'atkPct', n:0.6}`(전투 끝까지), `exhaust:true`
- 95 문책: `onDraw:[{op:'energy', n:-1}]` · 96 압송: `onDraw:[{op:'buff', id:'passivesOff'}]` · 97 시기: `onDraw:[{op:'discard', n:1, type:'rep', random:true}]`, `ops:[{op:'suspicion', n:1}]`, `exhaust:true`
- 98 조총: `[{op:'cond', if:{cardMarked:true}, then:[{op:'dmg', n:18, tag:'shot', pierce:true}, {op:'mark', set:false}], else:[{op:'mark', set:true}]}]` — 발사 후 장전 해제
- 91 칠백의사: `[{op:'exhaustHand', perCard:[{op:'dmg', n:6, tag:'none'}]}, {op:'leave', id:'jo_heon'}]` (낸 카드 자신은 손에 없으므로 세지 않는다)
- 26 군율: `{op:'discard', n:1, choose:true}` + `draw 2` · 16 전열 정비: `{op:'retrieve', n:1, from:'discard', choose:true}` · 82 신상필벌: `{op:'exhaust', n:1, choose:true, which:'hand'}` + `energy 1` + `draw 1`
- 10 숨어라: `{op:'buff', id:'hide', n:0.7, turns:1}` + `{op:'buff', id:'noAtk', turns:1}` · 42 홍의: `buff evadeFirst turns:1` · 56 허수아비: `status all shaken 1` + `buff noAdvance turns:1` · 81 한 척도: `block 10` + `buff minHp1 turns:1`
- 34 유인: `push 1` + `{op:'buff', id:'nextAtk', n:4, turns:1, nextTurn:true}` · 83 당항포의 유인: `push 2` + `{op:'buff', id:'shotPct', n:0.5, turns:1, nextTurn:true}` · 25 비격진천뢰: `{op:'delay', turns:1, ops:[{op:'dmg', n:16, tag:'fire', all:true}]}`
- 68 역토산: `block 4` + `{op:'status', who:'target', id:'flinch', n:1}` · 85 세마: `{op:'stun', n:1}`(보스 무효) · 54 회담: `stun 2` · 62 배수진: `buff noPushBattle` + `status self momentum 3` · 86 서서 죽는다: `buff wallPersist turns:99`
- 2 창을 세워라·75 낭선: `block n` + `{op:'cond', if:{dist:2}, then:[{op:'push', n:1}]}` · 29 학익진: `{op:'dmg', n:9, all:true, tag:'shot', mulAt:{far:2}}` · 28 천자총통: `bonusAt:{far:8}` · 65 현자총통: `bonusIf:{siege:5}` · 70 끓는 물: `cond dist:2 → dmg all 12 / else dmg all 4`
- 36 격군: `energy 1` + `hp −2` · 60 성 안의 우물: `hp 5` · 49 의승군 결집: `hp 6` + `block 6` · 52 청야: `status all hunger 3` + `ration −5` · 61 결사의 격문: `status self momentum 3` + `suspicion 1`
`CARDS.startDeck(leaderId)` → `[id,…]` (DESIGN §6.1 시작 덱 12장 — **시작 덱의 유일한 출처**). `CARDS.pool(poolName)` → 그 풀의 카드 배열. `CARDS.selfTest()`.

### 3.3 적 (`ENEMIES`)

```js
// 적 틀
{ id, name, hanja?, hp, advance:'always'|'stopAtNear'|'never', step:1|2,
  tags:['gun'|'melee'|'bow'|'ship'|'boss'|'elite'|'laborer'|'horse'…],   // 'ship' = 세키부네·고바야·안택선·대장선·도도·구루시마·시마즈
  intents:[ intent… ],   // 순환. 편성의 offset 으로 시작 위치를 어긋나게 한다
  resist?: 1,            // 기마 무사: 첫 push 무효 횟수
  passive?: { shotPctAtFar?: -0.5 },   // 죽속조. 이 밖의 패시브는 handlers 로
  handlers?: [ hook… ], memo }
// 의도
{ kind:'atk', n, tag:'gun'|'melee'|'bow', pierce?:0.5, pullFirst?:n, ignoreWall?:true, alt?:{ if:cond, n, tag, text }, text }
   // pullFirst: 피해 계산 전에 §5.3 규칙으로 pull n (fx push). alt: if가 참이면 n·tag·text를 alt 것으로 바꿔 실행. ignoreWall: 아군 성벽 진형만 건너뛴다(일반 진형은 깎음)
{ kind:'approach', text:'접근' }                  // pull 1 (melee가 遠에서 자동 변환되는 것과 같음)
{ kind:'pull', n, text:'전진' }                   // 무리 전체 n칸
{ kind:'block', n, text:'밀집' }                  // 자기 진형
{ kind:'load', text:'裝' }                        // 표시 전용
{ kind:'rally', n, who?:'all'|'self', text }      // 기세 +n (기본 all)
{ kind:'build', text:'쌓기' }                     // 토산. buildCount 3회 뒤 intents 를 [{kind:'atk', n:8, tag:'bow', ignoreWall:true, text:'토산 사격'}] 로 교체
{ kind:'reinforce', id, n, cap, text:'증원' }      // §5.2 증원 규칙
{ kind:'raid', n, text:'약탈' }                   // 군량 −n
{ kind:'signal', text:'신호' }                    // st.enemySignal += 1 (다음 적 턴 적 전체 공격 +1, 그 턴 끝에 0)
{ kind:'flee', text:'달아남' }                    // dead:true, fled:true. enemiesKilled·보상 제외
{ kind:'incite', n, text:'선동' }                 // 의심 +n
{ kind:'ops', ops:[…], text }                     // 그 밖(DSL). 이 안의 who:'actor' = 실행 중인 적
// 편성(encounter)
{ id, name, type:'field'|'siege'|'assault'|'naval', elite?:true, boss?:true,
  enemies:[ {id, offset?:0, name?:'호소카와 다다오키', hp?:60} ],
  waves?: [ { enemies:[…], intro?:'…', resetDist?:0|1|2, extraDraw?:n, trigger?:'allDead'|{enemyDead:enemyId}, keepOthers?:false,
              mods?:{ pushMax?, rescueDisabled?, reinforceEvery? }, reinforce?:{every, enemies:[id…], cap}|null, onStart?:[ops] } ],
            // waves 가 있으면 enemies 는 비운다. 파도 1도 waves[0]. trigger 기본 allDead. §5.2 참조
  reinforce?: { every:3, enemies:[id,…], cap:8, startTurn?:3 },
  handlers?: [ hook… ], mods?: { … §5.4 req.mods 와 같은 키. wall/enemyWall 은 넣지 않는다(유형이 결정) },
  reward?: { relic?:relicId, ops?:[ops] },   // 결전 고정 기물·승리 플래그(jinju1_held 등). 정예 기물은 Run이 뽑는다
  intro?: { title, memo }, memo }
ENEMIES.list / byId / get(id)                // 적 틀
ENEMIES.encounters.list / byId / get(id)     // 편성
ENEMIES.pools = { act1:{normal:[encId…], elite:[encId…]}, act2_sea:{…}, act2_land:{…}, act3, act4, act5, act6, act7 }
ENEMIES.scale(tpl, act) → { hp, dmgAdd }     // tags에 'boss'가 있으면 hp 고정, 그 밖(elite 포함) hp = floor(hp × (1 + hpPer × (act−1))). dmgAdd는 보스에도
ENEMIES.makeInst(id, act, overrides?) → enemyInst   // uid:null (Combat이 부여). rng 사용 없음
ENEMIES.build(encId, act, rng, overrides?) → { type, enemies:[enemyInst…], waves, reinforce, handlers, mods, reward, intro }   // 깊은 복사. rng는 지금은 쓰지 않지만 시그니처 고정
// enemyInst: { uid:null, id, name, hp, maxHp, block:0, status:{}, intents:[…], intentIdx:offset, advance, step, tags, resist, passive, boss, dmgAdd, buildCount:0, dead:false, fled:false, wave:1 }
```
**적 ID**: `ashigaru_spear` 창 아시가루 · `ashigaru_gun` 조총 아시가루 · `wa_archer` 왜궁수 · `mounted_samurai` 기마 무사 · `samurai` 무사 · `wa_captain` 왜장 · `siege_laborer` 공성 인부 · `bamboo_bundle` 죽속조 · `nobushi` 노부시 · `sekibune` 세키부네 · `kobaya` 고바야 · `atakebune` 안택선 · `enemy_flagship` 대장선 · `wajo_garrison` 왜성 수비대 · `rebel_monghak` 이몽학 반군 · `wa_scout` 왜 척후.
**결전 적 ID**: `konishi` · `wakizaka` · `hosokawa`(진주 1차 왜장) · `ukita_w1` `ukita_w2` `ukita_w3` · `kuroda` · `todo` · `kurushima` · `shimazu_p1` · `shimazu_p2`.
**편성 ID**: 결전 `boss_konishi` `boss_wakizaka` `boss_jinju1` `boss_haengju` `boss_jiksan` `boss_myeongnyang` `boss_noryang`; 고정 `tut_busan` `tut_gijang` `tut_sangju` `dongnae_hold` `ichi_hold` `jeongam` `cheongju_elite` `geumsan_elite` `yeonan` `gyeongju` `okpo` `dangpo` `danghangpo_elite` `yulpo` `gyeonnaeryang` `pyongyang` `byeokje_elite` `doksan` `hanseong_pursuit` `monghak_elite` `yoshira_naval` `busan_sea` `namwon` `hwangseoksan` `unbong` `eoranpo` `ulsan` `sacheon` `suncheon`; 풀 일반 편성은 `p{막}{_sea|_land}_{a,b,c…}` (예 `p1_a`, `p2_sea_b`).

**적 표현 지침(동결)**: 기마 무사 `{kind:'atk', n:12, tag:'melee', pullFirst:2, text:'돌격'}` · 구로다 `{kind:'atk', n:18, tag:'melee', pullFirst:2, text:'기병 돌격'}` · 왜성 수비대 `{kind:'atk', n:9, tag:'melee', text:'돌출', alt:{if:{distNot:2}, n:10, tag:'gun', text:'조총'}}` · 무사 기합 `{kind:'rally', n:2, who:'self', text:'기합'}` · 조총 `{kind:'atk', n:14, tag:'gun', pierce:0.5, text:'發'}`(앞에 load 둘) · `boss_wakizaka.handlers=[{hook:'onCardPlayed', cond:{cardId:'crane_wing', dist:0}, ops:[{op:'fx', kind:'banner', key:'crane'}, {op:'status', who:'enemy', enemyId:'wakizaka', id:'shaken', n:2}]}]` · `boss_myeongnyang.handlers=[{hook:'onEnemyDeath', cond:{enemyId:'kurushima'}, ops:[{op:'status', who:'all', id:'shaken', n:3}, {op:'fx', kind:'banner', key:'kurushima'}]}]`, `mods:{tide:true}`, `reinforce:{every:3, enemies:['sekibune','sekibune'], cap:8}` · `boss_noryang.waves=[{enemies:[{id:'shimazu_p1'},{id:'sekibune'},{id:'sekibune'}], trigger:{enemyDead:'shimazu_p1'}, keepOthers:true}, {enemies:[{id:'shimazu_p2'}], resetDist:1, extraDraw:0, mods:{pushMax:1, rescueDisabled:true}, reinforce:{every:2, enemies:['sekibune','sekibune'], cap:6}, onStart:[{op:'addCard', id:'chen_lin_bombard', where:'hand', free:true, generated:true}, {op:'addCard', id:'deng_zilong', where:'hand', free:true, generated:true}, {op:'addCard', id:'ming_navy_square', where:'hand', free:true, generated:true}]}]` · `boss_haengju.waves` 3개(`resetDist:1, extraDraw:3`, 파3 `onStart:[{op:'addCard', id:'bowstring', n:2, where:'hand', generated:true}, {op:'fx', kind:'banner', key:'arrows'}]`) · `boss_jiksan.mods.startHand=[{id:'li_cavalry', free:true},{id:'folangji', free:true},{id:'nambyeong_cannon', free:true}]` · 평양 `startHand` 명군 2장 free · 남원 `startHand:[{id:'folangji', free:true}]` · `tut_busan.mods={noAdvanceTurns:2, tutorial:'far'}`, `tut_gijang.mods={tutorial:'near'}`, `tut_sangju.mods={startDist:2, tutorial:'close'}` · 결전 reward: wakizaka `{relic:'hansan_drum'}`, jinju1 `{relic:'jinju_drum', ops:[{op:'flag', key:'jinju1_held', value:true}]}`, haengju `{relic:'haengju_ash'}`, jiksan `{relic:'jiksan_spear'}`, myeongnyang `{relic:'myeongnyang_chain'}`, konishi는 Run이 `b1`로 정한다(§6.8).

### 3.4 장수·기물 (`GENERALS`)

```js
GENERALS.leaders.list/byId/get   // { id:'yi'|'gwon', name, hanja, hp, suspStart, famed:bool, passive:{handlers?:[hook…], mods?:[mod…]}, cards:[cardId…](고유 카드 풀 4장), desc, passiveDesc, deckColor, memo }
GENERALS.deputies.list/byId/get  // { id, name, hanja, famed?, passive:{handlers?, mods?}, card:cardId, recruit:'…설명', desc, passiveDesc, memo }
GENERALS.relics.list/byId/get    // { id, name, hanja?, handlers?:[hook…], upHandlers?:[hook…], mods?:[mod…], onAcquire?:[ops], runMods?:{ shopDiscount?:0.10, eventRationBonus?:5, actStartOps?:[ops] }, curse?:true, src:'elite'|'boss'|'shop'|'event', desc, memo }
```
시작 덱은 `CARDS.startDeck`만이 안다(GENERALS에 `extraStart` 없음).
**부장 ID**: `gwon`(권율, 이순신 주장 때) · `yi`(이순신, 권율 주장 때) · `yi_eokgi` 이억기 · `kim_simin` 김시민 · `jeong_munbu` 정문부 · `jo_heon` 조헌·영규 · `hwang_jin` 황진 · `yi_jeongam` 이정암.
**기물 ID**: `turtle_blueprint` 거북선 설계도 · `jincheonroe_relic` 비격진천뢰 · `hwacha_relic` 화차 · `nanjung_relic` 난중일기 · `jingbirok` 징비록 · `tonga` 편전 통아 · `hangwae_gun` 항왜의 조총 · `obangnang` 오방낭 · `seoae_brush` 서애의 붓 · `chains` 금고의 쇠사슬 · `joryeong_stone` 조령의 돌 · `hansan_drum` 한산의 북 · `jinju_drum` 진주의 북 · `haengju_ash` 행주의 재 · `jiksan_spear` 직산의 창 · `myeongnyang_chain` 명량의 쇠사슬 · `tongjeyeong_flag` 통제영의 깃발.
기물 강화(E10·E11)는 `G.relicUp[id]=true`(op `relic … up:true`)이고, 있으면 `handlers` 대신 `upHandlers`를 쓴다.

**패시브 → 계약 표현** (담당 G가 이대로 쓴다). mod 이름은 `dmgBonus`(평가산) · `atkPct`(비율) · `costDelta` · `blockKeep` 넷뿐.
| 대상 | 표현 |
|---|---|
| 이순신 주장 | `mods:[{mod:'atkPct', n:0.40, if:{hpPct:{lte:40}}}]`, `handlers:[{hook:'onTurnStart', cond:{naval:true, turn:1}, ops:[{op:'energy', n:1}]}]` |
| 권율 주장 | `mods:[{mod:'blockKeep', n:3}]` |
| 권율 부장 | `mods:[{mod:'blockKeep', n:2}]` |
| 이순신 부장 | 위 `onTurnStart` 훅만 |
| 이억기 | `mods:[{mod:'dmgBonus', n:2, if:{naval:true, cardTag:'shot'}}]` |
| 김시민 | `handlers:[{hook:'onTurnStart', cond:{siege:true}, ops:[{op:'block', n:2, wall:true}]}]` |
| 정문부 | `mods:[{mod:'costDelta', n:-1, if:{cardTag:'charge'}, once:'battle'}]` |
| 조헌·영규 | `mods:[{mod:'dmgBonus', n:2, if:{cardTag:'uibyeong'}}]` |
| 황진 | `handlers:[{hook:'onTurnStart', cond:{siege:true, turn:1}, ops:[{op:'energy', n:1}]}]` |
| 이정암 | `handlers:[{hook:'onBattleStart', ops:[{op:'block', n:3, wall:true}]}]` |
| 거북선 설계도 | `handlers:[{hook:'onBattleStart', cond:{naval:true}, ops:[{op:'addCard', id:'turtle_ship', where:'hand', generated:true}]}]` |
| 비격진천뢰(기물) | `handlers:[{hook:'onBattleStart', cond:{siege:true}, ops:[{op:'dmg', n:15, all:true, tag:'fire'}]}]` |
| 화차(기물) | `handlers:[{hook:'onCardPlayed', cond:{cardType:'atk', oncePerTurn:true}, ops:[{op:'dmg', n:4, all:true, tag:'fire'}]}]` |
| 난중일기(기물) | `runMods:{actStartOps:[{op:'suspicion', n:-1}]}` |
| 징비록 | `handlers:[{hook:'onBattleStart', ops:[{op:'draw', n:1}]}]` |
| 편전 통아 | `mods:[{mod:'dmgBonus', n:2, if:{cardTag:'pierce'}}]` |
| 항왜의 조총 | `onAcquire:[{op:'addCard', id:'jochong', n:2}]` |
| 오방낭 | `runMods:{shopDiscount:0.10, eventRationBonus:5}` |
| 서애의 붓 | `handlers:[{hook:'onCardDrawn', cond:{cardType:'edict', oncePerBattle:true}, ops:[{op:'exhaust', which:'drawn'}]}]` (어전회의 −1은 Run이 보유 여부로) |
| 금고의 쇠사슬 | `onAcquire:[{op:'suspicion', n:2}]`, `handlers:[{hook:'onTurnStart', ops:[{op:'energy', n:1}]}]`, `curse:true` |
| 조령의 돌 | `handlers:[{hook:'onBattleStart', ops:[{op:'buff', id:'noAdvance', turns:1}]}]` |
| 한산의 북 | `handlers:[{hook:'onTurnStart', cond:{naval:true, turn:1}, ops:[{op:'push', n:1}]}]`, `upHandlers`는 n:2 |
| 진주의 북 | `handlers:[{hook:'onBattleStart', cond:{siege:true}, ops:[{op:'status', who:'all', id:'shaken', n:1}]}]`, `upHandlers`는 n:2 |
| 행주의 재 | `handlers:[{hook:'onBattleStart', ops:[{op:'addCard', id:'ash_bag', where:'hand', generated:true}]}]` |
| 직산의 창 | `mods:[{mod:'dmgBonus', n:2, if:{cardTag:'melee'}}]` |
| 명량의 쇠사슬 | `handlers:[{hook:'onEnemySpawn', cond:{naval:true, enemyId:['sekibune','kobaya']}, ops:[{op:'status', who:'spawned', id:'shaken', n:1}]}]` |
| 통제영의 깃발 | `mods:[{mod:'dmgBonus', n:1, if:{cardTag:'navy'}}]` |

### 3.5 사건 (`EVENTS`)

**사건의 title·text·choices[].text·reason·preview 문자열은 EVENTS(F2)가 소유한다.** TXT는 사건 본문을 갖지 않는다(`TXT.event` 금지).
```js
{ id:'E1', key:'dongnae', act:1, title, text:['문단',…], memo,
  variants?:[ { if:cond, patch:{ title?, text?, choices? } } ],   // Run이 프롬프트를 만들기 전에 첫 일치 항목을 덮어쓴다 (E21 수군 재건 / E22 백의종군·도원수부)
  choices:[ { text, if?:cond, hidden?:true /* if 실패 시 숨김(기본은 회색+reason) */, reason?:'…', ops:[…], preview?:'…'(없으면 Run이 TXT.opsText로) } ] }
EVENTS.list/byId/get, EVENTS.byKey
```
사건 ID `E1`~`E29`, `key`는 `dongnae, sayaga, joryeong_or_tangeumdae, king_leaves, turtle_launch, red_general, ichi_pass, geumsan_twice, jincheonroe, busanpo_jeongun, kim_simin_wound, cheongbyeong, byeokjegwan, combs, hanseong_recovered, hullyeondogam, head_is_treasure, monghak, yoshira, chilcheon, twelve_ships_left, white_robe, return_tongjesa, byeokpajin_night, pilsa_jeuksaeng, hideyoshi_dies, chen_lin_wine, do_not_announce, court`. E29(court)는 Run이 court 프롬프트로 처리하므로 제목·본문만 둔다. 조정·군영 규칙 수치는 EVENTS에 두지 않는다(Run이 BAL로 만든다).

**사건 표현 지침(동결)**:
- E1 ①: `[{op:'battle', enc:'dongnae_hold', reward:false, onWin:[{op:'addCard', id:'manifesto'}]}]` · E3: ① `[{op:'flag', key:'b1', value:'ridge'}]` ② `[{op:'flag', key:'b1', value:'river'}, {op:'addCard', id:'baesujin'}]` ③ `[{op:'flag', key:'b1', value:'fort'}]`
- E7: 선택지 ①을 둘로 — `{text:'권율을 청한다', if:{leader:'yi'}, hidden:true, ops:[{op:'recruit', id:'gwon'}]}` / `{text:'황진을 청한다', if:{leader:'gwon'}, hidden:true, ops:[{op:'recruit', id:'hwang_jin'}]}`; ③ `[{op:'battle', enc:'ichi_hold', onWin:[{op:'addCard', id:'ichi_bow'}]}]`
- E8 ①: `[{op:'battle', enc:'geumsan_elite', onWin:[{op:'addCard', id:'geumsan_drum'}]}]`(정예 기물은 battle의 일반 보상이 준다) · E9: ① `[{op:'battle', enc:'gyeongju', handlers:[{hook:'onBattleStart', ops:[{op:'dmg', n:16, tag:'fire', all:true}]}], onWin:[{op:'relic', id:'jincheonroe_relic'}]}]` ② `[{op:'addCard', id:'hwacha'}, {op:'battle', enc:'gyeongju'}]` ③ `[{op:'ration', n:15}]`
- E10 ①: `[{op:'relic', id:'hansan_drum', up:true}, {op:'hp', n:-10}]` · E11: ① `[{op:'ration', n:-25}, {op:'recruit', id:'kim_simin'}]`(이미 있으면 recruit 무시) ② `[{op:'leave', id:'kim_simin'}, {op:'recruit', id:'hwang_jin'}]` ③ `[{op:'leave', id:'kim_simin'}, {op:'relic', id:'jinju_drum', up:true}]` — `leave`는 그 부장이 없으면 무시
- E12: ① `[{op:'offer', pool:'ming', n:2, pick:1}]` ② `[{op:'ration', n:-30}, {op:'offer', pool:'ming', n:3, pick:2}]` ③ `[{op:'suspicion', n:1}, {op:'addCard', id:'request_troops', n:2}]`
- E13 ③: `[{op:'flag', key:'mingCostDelta', value:1}, {op:'flag', key:'mingCostDeltaUntilAct', value:4}]`(다음 막까지) · E14 ②: `[{op:'flag', key:'mingCostDelta', value:1}, {op:'flag', key:'mingCostDeltaUntilAct', value:3}, {op:'suspicion', n:-1}]`
- E17 ②: `[{op:'flag', key:'boss5HpPct', value:-0.15}]` · E19 ③: `[{op:'flag', key:'boss5HpPct', value:-0.10}, {op:'fx', kind:'banner', key:'counterspy'}]`(§13) · E19 ①: `[{op:'battle', enc:'yoshira_naval', hpDelta:-10, onWin:[{op:'suspicion', n:-1}]}]`
- E20(칠천량): 선택지 **1개** `[{op:'flag', key:'chilcheon', value:true}]`(처리는 Run §6.6) · E21 `variants`(chilcheon false → 「수군 재건」 `[{op:'ration', n:30}, {op:'hp', n:10}]`) · E22 `variants`(dismissed → 「백의종군」 ① `[{op:'hp', n:10}]`; 아니면 「권율의 도원수부」 ① `[{op:'upgrade', n:1, choose:true}]`) · E23 선택지 1개 `[{op:'recruit', id:'yi', special:true}]`(이미 주장·부장이면 무시)
- E24: ② `[{op:'flag', key:'b6_scouts', value:true}]` ③ `[{op:'flag', key:'b6_block', value:10}]` · E25 ②: `[{op:'flag', key:'b6_momentum', value:3}]` · E26 ①: `[{op:'flag', key:'b7_p2Hp', value:-20}, {op:'suspicion', n:1}]` ③ `[{op:'battle', enc:'suncheon'}]`
- E27 ①: `[{op:'flag', key:'b7_mingExtra', add:1}]` · E28: ① `[{op:'flag', key:'dokjeon', value:true}]` ② `[{op:'flag', key:'dokjeon', value:false}]` ③ `[{op:'flag', key:'b7_mingExtra', add:2}, {op:'score', n:-100}]`
- E4 ②: `[{op:'relic', id:'jingbirok'}, {op:'suspicion', n:1}]` · E18: ① `[{op:'suspicion', n:2}, {op:'addCard', id:'resolve', n:2}]` ② `[{op:'relic', id:'chains'}]` ③ `[{op:'battle', enc:'monghak_elite', onWin:[{op:'suspicion', n:-1}]}]` · E15 ①: `[{op:'battle', enc:'hanseong_pursuit'}]` · E13 ②: `[{op:'battle', enc:'byeokje_elite'}]`

### 3.6 지도 (`MAPDATA`)

```js
MAPDATA.acts[1..7] = { act, no:'一', name:'임진', title:'검은 돛', period:'1592년 4월~5월', bg:'south'|'sea'|'north'|'palace'|'west'|'strait'|'noryang',
                       cols:[ [nodeId,…], … ], lanes?:true, endEvent?:{ sea?:eventId, land?:eventId, default?:eventId } }   // 1막 E4, 2막 sea E10/land E11, 5막 E23. 그 밖 없음
MAPDATA.nodes.list/byId/get = { id:'a1_busan', act, col, kind:'fight'|'elite'|'event'|'camp'|'shop'|'court'|'boss'|'council', name, do, date:'1592.4.14',
  type?:'field'|'siege'|'assault'|'naval', enc?:encId|'pool', elite?:true, eventId?, courtEvent?:eventId, bossEnc?:encId,
  terrain:'plain'|'ridge'|'river'|'fort'|'port'|'strait'|'waeseong'|'none',
  lane?:'sea'|'land', x, y, blurb:'한 줄 소개',
  variants?:[ { if:cond, patch:{…덮어쓸 필드} } ],   // 5막 열1: {if:{flag:{dismissed:true}}, patch:{kind:'event', eventId:'E20', name:'칠천량', …}} / else 해전 busan_sea
  recruits?:[deputyId,…],                           // 조정 천거 후보(미영입자만 보인다)
  onWin?:[ops],                                     // 전투 승리 결과 적용 직후·보상 앞에 Run.applyOps
  courtOps?:{ report?:[ops], recruit?:[ops], request?:[ops] } }   // 조정 선택지 기본 효과 뒤에 이어 실행
MAPDATA.terrains.byId = { id, name, desc, mods:{…} }   // plain {chargeCostDelta:-1} · ridge {startDist:0, noAdvanceTurns:2, blockPerTurn:5} · river {noPush:true, momentum:3} · fort {} · port {startDist:0} · strait {startDist:0} · waeseong {enemyGunPct:0.2} · none {}
MAPDATA.next(nodeId, flags) → [nodeId…]   // 같은 막 다음 열 전부(2막은 같은 lane만). 마지막 열이면 []
MAPDATA.first(act, flags) → [nodeId…]     // 그 막 열1
```
노드 ID 규칙: `a{막}_{슬러그}` (예 `a1_busan`, `a2s_okpo`(바다길), `a2l_uiryeong`(뭍길), `a4_council`). 결전 바로 앞 열은 반드시 `court`. 성벽 10·적 성벽 15는 지형이 아니라 **전투 유형**이 준다. 조류는 `boss_myeongnyang.mods.tide`만(해협 지형은 遠 시작만).
**노드 지침**: `a1_hanseong.courtOps={report:[{op:'relic', id:'seoae_brush'}]}` · `a1_boss`(조령/탄금대)는 `terrain:'none'`, Run이 b1로 덮어쓴다 · `a2l_gyeongju`는 `kind:'event', eventId:'E9'`(전투는 사건이 띄운다) · `a2l_yeonan.onWin=[{op:'recruit', id:'yi_jeongam', optional:true}]` · `a3_doksan.onWin=[{op:'offer', ids:['sema'], n:1, pick:1}]` · `a5_busan_sea.onWin=[{op:'relic', id:'tongjeyeong_flag'}, {op:'flag', key:'busan_held', value:true}]` · `a3_uiju`: `kind:'court', courtEvent:'E12'` · 4막 열5 `courtEvent:'E19'`, 6막 열5 `'E25'`, 7막 열6 `'E28'` · 3막 열8 한성 수복은 `kind:'event'`(결전 뒤 마디) · 5막 열2 회령포 `eventId:'E21'`, 열5 `eventId:'E22'` · 7막 열2 풍문 `do:'—'`.

---

## 4. DSL — op 33종 (동결)

`{op:'…', …}` 객체. 공통 12 + 전투 16 + 판 5. `check.js`가 이 밖의 op를 거부한다. 전투 전용 op를 판 맥락에서 만나면 `Run.applyOps`는 **throw**(데이터 실수를 즉시 잡는다). 판 전용 op를 전투에서 만나면 `Combat.applyOps`가 throw.

### 4.1 공통 (전투·판)
| op | 필드 | 전투 맥락 | 판 맥락 |
|---|---|---|---|
| `suspicion` | `n` | `st.suspicion` 변화(0~10 clamp), `st.suspicionDelta` 누적 | `G.suspicion` 변화. 문턱 판정은 §6.5 시점에만 |
| `ration` | `n` | `st.ration` (0 미만 → 0) | `G.ration`. 사건에서 +면 오방낭 `eventRationBonus` 가산 |
| `hp` | `n?, max?, pct?` | 병력 ±n (최대 상한), `pct`면 최대 병력의 % floor, `max`면 최대 병력도 ±max | 같음 |
| `addCard` | `id?, pool?, n=1, where='deck', up?, generated?, free?` | `where:'hand'|'draw'|'discard'|'deck'`(deck = draw 더미 + deckChanges add). 손 상한 넘치면 버림 더미로. `id` 없으면 `CARDS.pool(pool)` 중 `rarity!==null`에서 `Core.pick(st.rng)`. `generated:true`면 onCardDrawn 훅 비발화·deckChanges 제외. `free:true`면 `tmpCost=0`·군량 0(hand만) | 덱에 추가(`where` 무시). `pool`이면 `G.rng`로 |
| `removeCard` | `id? | tag? | pool?, all?, n=1` | 모든 더미에서 제거(generated 아닌 것은 deckChanges remove) | 덱에서 제거 → 덱 하한 보충(§6.6) |
| `upgrade` | `n=1, choose?, id?` | (throw) | `choose`면 `pickCard` 프롬프트, `id`면 그 카드, 아니면 미강화 중 무작위 |
| `relic` | `id, remove?, up?` | (throw) | 획득(`onAcquire` 실행; 이미 있으면 무시) / 제거 / `up`이면 `G.relicUp[id]=true`(미보유면 획득도) |
| `flag` | `key, value? | add?` | `st.flags[key]` + `st.flagsOut[key]` (결과로 반환). `add`면 숫자 누적 | `G.flags[key]` |
| `leave` | `id, dead?` | 그 부장의 handlers/mods(src.id) 제거, 고유 카드를 모든 더미에서 제거(지금 내는 카드는 끝까지 실행 후 exhaust), `st.generalsLost.push(id)`, fx banner{key:'leave'}. 없으면 무시. special(yi)이면 무시 | 부장 이탈: `G.deputies`에서 제거, 고유 카드 덱에서 제거, `dead`가 아니면 `G.away.push(id)`(복귀 §6.4). 없으면 무시. 덱 하한 |
| `cond` | `if, then:[ops], else?:[ops]` | §3.1 | §3.1 |
| `fx` | `kind, key?, text?` | `bus.emit('fx', {kind, key, text})` (dryRun이면 생략) | 같음(무해) |
| `score` | `n` | (throw) | `G.scoreAdj += n` |

### 4.2 전투 전용
| op | 필드 | 뜻 |
|---|---|---|
| `dmg` | `n, tag, all?, pierce?, times=1, bonusAt?:{far,near,close}, mulAt?:{far,near,close}, bonusIf?:{siege,naval,assault,field}, perCardsPlayed?:n, perHandCard?:{id,n}, who?:'target'|'all'|'random'|'spawned'|'enemy'(+enemyId)` | §5.5. `all`이면 살아 있는 적 전체. `times`는 매번 따로 계산·적용(진형 소모 포함); **대상이 죽으면 남은 times는 버린다**. `tag:'charge'`면 먼저 거리를 接으로(§5.3) |
| `block` | `n, wall?, ifWallBonus?` | 진형(+n, 음수 허용, 0 미만 불가). `wall`이면 성벽 진형. `ifWallBonus`는 성벽 > 0일 때 추가. **카드 자신의 ops이고 `card.home === st.do`이면 n(wall 포함)에 ×HOME_BONUS floor(음수는 보정 없음)** |
| `push` / `pull` | `n` | 거리 이동(§5.3) |
| `draw` | `n, nextTurn?` | 한 장씩. 뽑을 더미가 비면 버림 더미를 `Core.shuffle(st.rng, …)`로 옮긴다(한 번의 draw에서 최대 1회). 둘 다 비면 남은 장수는 뽑지 않는다(오류 아님). 손이 `HAND_MAX`면 뽑지 않는다. `nextTurn`이면 다음 턴 시작 뽑기에 +n |
| `energy` | `n, nextTurn?` | 군령 |
| `status` | `who:'self'|'target'|'all'|'spawned'|'actor'|'enemy', enemyId?, id, n` | id: `shaken 동요 · exposed 허점 · hunger 굶주림 · momentum 기세 · ambush 매복 · ironwall 철벽 · stun 정지 · flinch 위축 · loaded 장전`. 같은 id는 n 누적. `'enemy'`는 `enemyId`(배열 가능)의 살아 있는 적 전부. `'actor'`는 적 맥락 ops에서 실행 중인 적(아군 맥락이면 self) |
| `stun` | `n, who='target'` | 정지 n. 대상 tags에 `boss`면 무효 + 로그 「장수는 꾀에 넘어가지 않았다」 |
| `buff` | `id, n?, turns?, nextTurn?` | 아군 임시 수정자. id: `nextAtk(n,turns) · atkAdd(n,turns) · shotAdd(n,turns) · atkPct(n,turns) · shotPct(n,turns) · evadeFirst(turns) · hide(n=0.7|0.8, turns) · noAtk(turns) · noMelee(turns) · noPushBattle · wallPersist(turns, 99=영구) · chargeAtClose(turns) · noAdvance(turns) · passivesOff · minHp1(turns)`. `turns` 없는 것은 전투 끝까지. `nextTurn`이면 다음 턴 시작(onTurnStart 뒤·delayed 앞)에 걸리고 그때부터 센다. 같은 id가 이미 있으면 n은 합, turns는 큰 쪽 |
| `exhaustHand` | `perCard:[ops]` | 손 전체 소모(playing 제외), 장당 `perCard` 실행(맥락 카드 = 그 장) |
| `discard` | `n=1, choose?, random?, type?` | 손에서 버림(playing 제외). `choose`면 §5.6. `random`이면 시드로. `type`이면 그 종류만 후보 |
| `exhaust` | `n=1, choose?, which?:'ctxCard'|'drawn'|'hand'` | 소모. `which:'drawn'`은 onCardDrawn 맥락 카드(uid로 모든 더미에서 찾음), `'ctxCard'`는 `st.playing`, `'hand'`는 손에서(choose/random) |
| `retrieve` | `n=1, from:'discard', choose:true` | 버린 패에서 손으로 |
| `mark` | `set:true|false` | 맥락 카드(`st.playing`)의 `marked`. 전투 시작 시 전부 false |
| `delay` | `turns=1, ops:[…]` | `st.delayed.push({turns, ops})`. 턴 시작(onTurnStart·조류·군령 뒤, 뽑기 앞)에 turns−1, 0이면 실행 |
| `stripBlock` | `who='target'` | 대상 진형 0 |

`choose:true`는 **카드 `ops`(그 안의 cond then/else 포함) 안에서만** 유효하다. 훅 ops·onDraw·delayed·perCard·waves.onStart·적 `kind:'ops'` 안에서는 `random:true`로 취급하며 check.js가 정적으로 거부한다.

### 4.3 판 전용 (`Run.applyOps`만)
| op | 필드 | 뜻 |
|---|---|---|
| `battle` | `enc, type?, terrain?, hpDelta?, mods?, handlers?, onWin?:[ops], onLose?:'nanse'|'continue'(기본 'nanse'), reward?:true(기본)` | 즉시 전투 프롬프트를 큐 앞에 넣는다. `mods`·`handlers`는 req에 병합(지형 → 편성 → battle op 순, 뒤가 덮어씀). `hpDelta`는 시작 병력 보정. `reward`면 일반 보상(enc.elite면 정예 기물·의심 +1 포함). `onWin`은 보상 뒤 |
| `recruit` | `id, optional?, special?` | 부장 영입 + 고유 카드 1장 덱에. 이미 주장·부장·special이면 무시. 자리가 차 있으면 `pickGeneral`(교체; `{id:null}` 답은 거절). `optional`이면 자리가 남아도 `pickGeneral{reason:'optional'}`로 묻는다. `special`이면 `G.special=id`(3번째 자리, 교체·구출 불가) |
| `ending` | `id:'silrok'|'jingbi'|'nanse'` | 즉시 결말 |
| `offer` | `pool?|ids?, n, pick, cost?` | `pickCard{reason:'offer'}` 프롬프트(n장 중 pick장을 덱에; canSkip true) |
| `leave` | (공통 §4.1) | |

### 4.4 알려진 플래그 (`G.flags`, 전투에 사본 `req.flags`)
`b1:'ridge'|'river'|'fort'`(E3; 점수 joryeong은 `b1==='ridge'`) · `lane2:'sea'|'land'` · `dismissed` · `wonGyun` · `chilcheon` · `dokjeon` · `jinju1_held` · `busan_held` · `rescuedUsed` · `mingDiscount`(0~2) · `mingDiscountAct`(적용 막) · `mingCostDelta` · `mingCostDeltaUntilAct` · `boss5HpPct`(−0.15 등, 누적 아님: 작은 값 우선 `Math.min`) · `b6_scouts` · `b6_block` · `b6_momentum` · `b7_p2Hp` · `b7_mingExtra`(누적 add) · `leaveDeputy`(미사용) .
플래그를 req.mods로 바꾸는 규칙은 §6.8.

---

## 5. Combat (`07_combat.js`)

### 5.1 API
```js
Combat.create(req) → st                       // §5.4. onBattleStart → startHand → 턴 1 시작까지 수행
Combat.cardInfo(st, handIdx) → { card, inst, cost, ration, playable:bool, reason:'', needsTarget:bool }
Combat.needsTarget(st, handIdx) → bool       // ops(cond 포함) 안에 dmg(all 아님·who 없음)·status who:'target'·stun·stripBlock 이 있으면 true
Combat.legalMoves(st) → [ { handIdx, targets:[enemyIdx…]|null } ]   // phase 'player' 아니면 []
Combat.play(st, handIdx, targetIdx|null) → { ok, reason? }   // 상태 즉시 변경. 선택 필요 → phase 'choose'. 구출 필요 → phase 'rescue'
Combat.choose(st, idxs) → { ok, reason? }      // st.choice.candidates 의 인덱스 배열. 남은 ops 이어서 실행
Combat.endTurn(st) → { ok, reason? }           // §5.2 → 다음 턴 시작. phase 'player'|'rescue'|'done'
Combat.chooseRescue(st, deputyId) → { ok, reason? }   // phase 'rescue' 에서. 재개 §5.7
Combat.preview(st, handIdx, targetIdx|null) → { lines:[{label, base, final, note}], perEnemy:[n|null…], distAfter, blockAfter }
Combat.intentPreview(st) → [ { enemyIdx, kind, text, dmg:n|null, raw:n|null, pierce:bool, nextDist:n|null, mark:'裝'|'發'|'貫'|null } ]
Combat.result(st) → BattleResult               // phase 'done' 에서
Combat.applyOps(st, ops, ctx)                  // 내보냄(테스트·기물)
Combat.evalCond(st, cond, ctx) → bool
Combat.selfTest() → { ok, errors:[…] }
```
`play/choose/chooseRescue/endTurn`은 `phase`가 맞지 않으면 상태를 바꾸지 않고 `{ok:false, reason:'phase'}`. `cardInfo/needsTarget/legalMoves/preview/intentPreview/evalCond/result`는 **rng를 포함해 상태를 바꾸지 않는다**.

**`play`의 순서(동결)**: 비용·군량 판정 → inst를 `hand`에서 빼 `st.playing=inst` → 군령·군량 차감 → `cardsPlayedThisTurn += 1`(자기 자신 포함, ops **전에**) → `stats.cardsPlayed[id]++`(edict면 edictsPlayed) → ops 실행(choose·rescue로 중단되면 재개 때 이어서) → ops 끝: `exhaust`(또는 강화 `exhaust:false`가 아닌 한)면 exhaust 더미, `retain`이면 손으로 돌아가지 않고 **그냥 버림**(보존은 턴 끝 버림을 면하는 것이다) → 아니면 discard → `st.playing=null` → `onCardPlayed` 훅 → 승리 판정(§5.2 ①). `handCount`·`discard`·`exhaustHand`·`perHandCard`는 `playing`을 세지 않는다.
**`cardInfo` 비용**: 기본 cost → `costIf`(참이면) → 강화 `plus.cost` → `inst.tmpCost`(0 고정) → `mods.costOverride[id]` → `costDelta` mods(조건 참, once) → `mods.chargeCostDelta`(charge만) → 최소 0. 군량: `tmpCost===0 ? 0 : max(0, (card.ration||0) − (flags.mingDiscount||0) + (flags.mingCostDelta||0))`. `playable=false` 사유: 군령 부족·군량 부족·`charge`를 接에서(chargeAtClose 없음)·`noAtk` 중 攻·`mods.wonGyun` 중 狀·phase.

### 5.2 상태 `st`
```js
st = {
  seed, rng:{s}, uidCounter, act, nodeId, type, terrain, do, flags:{…}, flagsOut:{}, mods:{…req.mods, 파도 mods 로 덮어씀},
  turn:1, phase:'player'|'choose'|'rescue'|'done', won:null|true|false, dist:0|1|2, startDist, dryRun:false,
  tide:null|{ phase:'ebb'|'flow', left:3 },
  player:{ hp, maxHp, energy, energyMax:3, block:0, wall:0, status:{}, buffs:[{id,n,turns}], pending:[{kind:'draw'|'energy'|'buff', …}], leader, deputies:[id…], special:id|null },
  ration, suspicion, suspicionDelta:0,
  draw:[inst…], hand:[inst…], discard:[inst…], exhaust:[inst…], playing:null|inst,   // inst = { uid, id, up, generated, marked, tmpCost }
  enemies:[ enemyInst… ],          // 죽은 적은 dead:true 로 남긴다(인덱스 안정). 파도는 뒤에 push(추가). 화면은 dead 를 숨긴다
  enemyWall:0, enemyWall0:0, spawned:{ id:n }, reinforce:null|{every, enemies, cap, timer}, enemySignal:0,
  waves:[…]|null, wave:1,
  handlers:[ { hook, cond, ops, once, src:{kind,id}, usedBattle:false, usedTurn:false } ],
  mods_:[ { mod, n, if, once, src, used:false } ],
  delayed:[ {turns, ops} ],
  cardsPlayedThisTurn:0, drawHooksThisTurn:0,
  choice:null|{ kind:'discard'|'exhaust'|'retrieve', n, candidates:[{where, idx, uid, id}], rest:[ops], ctx:{cardUid, cardId, targetIdx} },
  rescue:{ used:false, disabled:false, pending:null|[id…], resume:null|{at:'enemyTurn', nextEnemyIdx:n}|{at:'play', rest:[ops], ctx:{cardUid, cardId, targetIdx}} },
  generalsLost:[], log:[ '…' ],
  stats:{ turns:0, dmgDealt:0, dmgTaken:0, cardsPlayed:{}, edictsPlayed:0, distTurns:[0,0,0], pushes:0, intentChecks:{ok:0,bad:0}, enemiesKilled:0, turnCapHit:false, wavesCleared:0 },
  tutorial:null|'far'|'near'|'close'
}
```
훅 ctx `{card, inst, target, enemyIdx, …}`는 함수 인자로만 쓰고 st에 넣지 않는다.

**턴 순서(정본)**: `create` → `onBattleStart` 훅 → `startHand` → 턴 1 시작.
턴 시작(§13 참조, 구현 순서): 턴 상한 처리(`turn > TURN_CAP`: 살아 있는 적마다 `hp −= max(1, floor(maxHp×TURN_CAP_PENALTY))`, `enemyWall −= max(1, floor(enemyWall0×0.1))`(0 미만 불가), `fx turnCap`, `stats.turnCapHit=true`; `turn > TURN_HARD`면 `won=false, phase='done'`) → 조류 갱신(`turn ≥ 2`일 때만 `left−1`; 0이면 교대) → 군령 = `ENERGY` + pending energy + (순류면 `TIDE.flowEnergy`) → pending buff 적용 → `onTurnStart` 훅 → 고개 진형(`blockPerTurn`) → `delayed` 처리 → 뽑기 `DRAW` + pending draw(손 상한) → `distTurns[dist]++` → 승리 판정.
`endTurn`: 손 버림(`retain` 제외) → `onTurnEnd` → **적 턴**(적 진형 0, 신호 적용): (`enemySignal`을 그 턴 적 공격에 가산) 살아 있는 적 왼쪽부터 의도 실행(§5.5; 적 `hunger`는 그 적의 행동 직전에 피해) → **증원**(`reinforce.timer`가 `every`에 닿으면: 살아 있는 적 < `ENEMY_MAX`이고 `spawned[id] < cap`인 것만 등장, `onEnemySpawn`, `fx spawn`; 건너뛰어도 timer는 리셋) → 거리 전진(§5.3) → `enemySignal=0` → **진형 처리**(`ironwall`·`wallPersist`면 전부 남김, 아니면 `blockKeep` 최대값만 남김; 성벽은 항상 남음) → 상태 경과(아군 buffs·status, 적 status의 turns −1) → 승리 판정(§5.2 ②) → `turn++` → `stats.turns++` → 다음 턴 시작.
**승리 판정 시점은 둘뿐**: ① `play`(choose·chooseRescue 재개 포함)의 ops가 모두 끝난 직후 ② 적 턴의 상태 경과 뒤. ops 중간·times 반복 중간·적 의도 중간에는 판정하지 않는다. 판정 시 살아 있는 적이 0(flee 포함)이거나 현재 파도의 `trigger.enemyDead`가 죽어 있으면: 파도가 남았으면 전환 — `keepOthers`가 아니면 살아 있는 나머지 적 `dead:true`(enemiesKilled 미포함) → 새 파도 적을 `enemies` 뒤에 push(`wave` 필드, `spawned` 갱신, `onEnemySpawn`) → `resetDist` → `Object.assign(st.mods, wave.mods)`, `rescue.disabled = !!st.mods.rescueDisabled`, `reinforce` 교체(null이면 중단, 새 값이면 timer 0) → `onStart` ops → `extraDraw` → `onWaveStart` → `wave++`, `stats.wavesCleared++` → `fx wave{idx, intro, enemies:[{enemyIdx,id,hp,maxHp}]}`. ②에서 전환된 새 파도는 그 턴에 행동·전진하지 않는다. 파도가 없으면 `won=true`, `onBattleEnd`, `phase='done'`, `fx win`.
**패배 판정은 피해 즉시**(§5.7)이므로 같은 틱에 둘이 겹치지 않는다.
**상태 턴 감소**는 적 턴 뒤 「상태 경과」에서만. 따라서 플레이어 턴에 건 `turns:1`은 바로 다음 적 턴까지 유효하고 다음 플레이어 턴 시작 전에 사라진다.
**`cap`·`spawned`**: `st.spawned[id]` = 이 전투에 지금까지 등장한 그 id의 총수(초기 편성·파도·증원 전부; create가 초기값을 채운다). 편성 `reinforce.cap`과 의도 `reinforce.cap`은 이 값과 비교한다. 증원·파도 inst는 `ENEMIES.makeInst(id, st.act)` + `uid=Core.nextUid(st)`, `enemies` 끝에 push. `onEnemySpawn`은 증원·파도에만(초기 적은 아님).

### 5.3 거리 규칙 (동결)
- `push n` = 遠 쪽(−), `pull n` = 接 쪽(+). 결과는 0~2 clamp. 바뀔 때만 `onDistanceChange` + `fx push {from,to}` + `stats.pushes++`(push만).
- push 적용 순서: ① `noPushBattle`(배수진)이면 무효 ② 기마 무사(살아 있는 적 중 `resist>0`)가 있으면 **첫 push만** 무효(그 적 `resist−1`, `fx resist`) ③ `st.mods.pushMax`로 clamp ④ 조류: 순류 +1, 역류 −1(최소 0) ⑤ 적용.
- 전진(적 턴): 살아 있는 적의 `advance` 중 가장 센 규칙(`always` > `stopAtNear` > `never`). `always`면 +step(무리 중 최대 step; 역류면 `TIDE.ebbStep`), `stopAtNear`면 近까지만, `never`면 제자리. `buff noAdvance`·`mods.noAdvanceTurns`(남은 턴, create가 `st.noAdvanceLeft`로) 중엔 없음. 의도 `approach/pull/pullFirst`는 전진과 별개로 즉시.
- `charge` 카드: 接에서는 낼 수 없다(`chargeAtClose` 중엔 가능). 내면 먼저 `pull 2`(위 규칙; 못 옮겨도 공격은 한다), 그 다음 배율 1.5.

### 5.4 `req` (BattleRequest)
```js
req = { seed, uidCounter, act, nodeId, type:'field'|'siege'|'assault'|'naval', terrain, do, encId, elite, boss,
  enemies:[enemyInst…], waves, reinforce, handlers, reward, intro,
  mods:{ wall?, enemyWall?, startDist?:0|1|2, startBlock?:n, noAdvanceTurns?, blockPerTurn?, noPush?, momentum?, chargeCostDelta?, enemyGunPct?,
         tide?:true, startHand?:[{id, up?, free?}], costOverride?:{id:n}, dmgBonus?:[{n, if}], rescueDisabled?, bossHp?:{id:n}, bossHpDelta?:{id:n},
         enemyHpPct?, reinforceEvery?, pushMax?, wonGyun?, extraDraw?, tutorial?:'far'|'near'|'close', passivesOff? },
  deck:[{uid,id,up}], relics:[id…], relicUp:{id:true}, leader, deputies:[id…], special:id|null,
  hp, maxHp, ration, suspicion, flags:{…} }
```
`Combat.create`가 하는 일(순서): `st.seed=req.seed; st.rng=Core.rngNew(req.seed); st.uidCounter=req.uidCounter` → 덱 복사(uid 유지)·`Core.shuffle` → `dist = mods.startDist ?? (field 1, siege 0, assault 1, naval 0)` → `player.wall = mods.wall ?? (siege ? SIEGE_WALL : 0)`, `enemyWall = enemyWall0 = mods.enemyWall ?? (assault ? ASSAULT_ENEMY_WALL : 0)` (덮어쓰기이지 가산이 아니다) → `block = startBlock||0`, `momentum` → 적 inst에 uid·`spawned` 초기값·`bossHp/bossHpDelta/enemyHpPct` 적용 → `tide` → handlers/mods_ 조립 순서: 주장 → 부장(순서대로) → special → 기물(순서대로, relicUp이면 upHandlers) → 편성 handlers → req.handlers → `mods.dmgBonus`; `mods.wonGyun`이면 부장 건너뛰고 `mods_`에 `{mod:'atkPct', n:WON_GYUN_PCT}` → `onBattleStart` → `startHand`(`free`면 `tmpCost=0`) → 턴 1 시작. **`passivesOff` 버프가 있는 동안** 디스패치·cardInfo는 `src.kind==='deputy'`(special 포함)인 handlers/mods를 건너뛴다. 전투 중 만들어지는 모든 inst·적 inst의 uid는 `Core.nextUid(st)`(판 덱과 충돌 없음).

### 5.5 피해 파이프라인 (동결)
**아군 → 적** (한 번의 `dmg` 계산, `times`마다 반복):
`base = n (+perCardsPlayed×cardsPlayedThisTurn, +perHandCard.n×손의 그 id 수)` → `+ bonusAt[dist] + bonusIf[type]` → `+ Σ dmgBonus mods(조건 참) + nextAtk(첫 공격에 소모) + Σ atkAdd + Σ shotAdd(shot만) + player.status.momentum` → `× mulAt[dist]` → `× MULT[tag][dist]`(charge는 1.5) → `× (1 + enemy.passive.shotPctAtFar)`(tag shot·dist 0·pierce 아님) → `× HOME_BONUS`(**카드 자신의 ops**이고 `card.home === st.do`일 때만; 핸들러·기물 ops에는 적용 없음) → `× (1 + Σ mods_.atkPct(조건 참) + Σ buffs.atkPct + (shot이면 Σ buffs.shotPct))` → `× (1 − SHAKEN_PCT if 아군 shaken)` → `× (1 + EXPOSED_PCT if 적 exposed)` → `floor`, 최소 1 → `pierce`면 적 `block`·`enemyWall` 모두 무시, 아니면 적 `block` → `enemyWall` → 체력. `fx hit`. `onDamageDealt`. 0 이하면 `dead`, `stats.enemiesKilled++`, `onEnemyDeath`, `fx enemyDeath`.
**적 → 아군**: (`pullFirst`·`alt` 먼저 처리) `base = n + enemy.dmgAdd + enemy.status.momentum + st.enemySignal` → `× MULT.e_*[dist]`(e_melee 遠은 의도가 접근으로 바뀌므로 여기 안 온다) → `× (1+mods.enemyGunPct)`(gun만) → `× (1 − SHAKEN_PCT if 적 shaken)` → `× (1 − FLINCH_PCT, 소모)` → `× (1 − hide.n)`(gun·bow만) → `× 0`(`noMelee` 중 melee) → `evadeFirst`면 첫 공격 0(소모) → `floor`, 최소 0 → 관통 비율(`pierce`)만큼은 진형 무시 → 진형 → 성벽 진형(`ignoreWall`이면 건너뜀) → 병력(`minHp1`이면 최소 1). `fx playerHit`. `onDamageTaken`. `stats.dmgTaken`.
**`preview`·`intentPreview`는 원본 st를 절대 바꾸지 않는다.** 둘 다 `var c = Core.clone(st); c.dryRun = true;` 위에서 **실제 코드 경로를 그대로** 실행하고 결과만 읽는다. `dryRun`이면 `bus.emit`·`log`·`stats` 갱신만 생략하고 그 밖(훅·상태·진형 소모·거리·rng 전진)은 똑같이 수행한다. `intentPreview`는 복제본에 `endTurn`의 진형 처리 단계부터 적 턴 끝(상태 경과 직전)까지 실행하며 적 의도마다 `{enemyIdx, kind, text, dmg:병력 감소량|null, raw:진형 적용 전 값|null, pierce, nextDist, mark}`를 **순서대로** 모은다(앞 적의 approach/pull/rally/signal, 앞 적이 소모한 진형·성벽·flinch·evadeFirst, hide가 모두 반영된 순차 값). `preview`는 복제본에 `play`를 실행해 `perEnemy`(체력 감소), `distAfter`, `blockAfter`, 단계별 `lines`를 돌려준다. `endTurn`은 첫 단계에서 `intentPreview(st)`를 지역 변수에 두고 실제 `playerHit`마다 같은 순번의 `dmg`와 비교해 `stats.intentChecks.ok/bad`를 올린다. `bad>0`이면 selfTest·sim 실패.

### 5.6 선택 단계 (`phase:'choose'`)
`discard/exhaust/retrieve`에 `choose:true`가 있으면 `st.choice`를 채우고(후보는 `{where, idx, uid, id}`) 멈춘다. `Combat.choose(st, idxs)`가 처리하고 `rest`를 이어서 실행한 뒤 play 마무리(§5.1). 후보가 0장이면 선택 없이 건너뛴다. 후보 수 ≤ n이면 자동 선택.

### 5.7 구출 (「부장이 대신 섰다」)
병력 ≤ 0 판정은 피해(또는 hp op)가 적용된 직후 그 자리에서 한다. 결과는 셋 중 하나:
(a) 구출 불가(`rescue.disabled` 또는 `rescue.used` 또는 `flags.rescuedUsed` 또는 부장(special 제외) 0) → `won=false, phase='done'`, `fx lose`, 진행 중이던 적 턴·ops는 즉시 중단.
(b) 부장 1명 → 그 자리에서 구출 적용 후 진행을 계속한다(남은 적은 계속 행동).
(c) 부장 2명 → `phase='rescue'`, `rescue.pending=[ids]`, `rescue.resume = {at:'enemyTurn', nextEnemyIdx:i+1} | {at:'play', rest:[남은 ops], ctx}`를 저장하고 `endTurn/play`는 그 자리에서 반환. `chooseRescue(st, id)`는 구출을 적용한 뒤 `resume`에 따라 남은 적 턴(증원·전진·상태 경과·승리 판정·다음 턴 시작까지) 또는 남은 ops → play 마무리 → 승리 판정을 끝까지 수행하고 `resume=null`. `phase==='rescue'`에서 `play/endTurn/choose`는 `{ok:false, reason:'rescue'}`, `legalMoves`는 `[]`.
구출 적용: 그 부장의 handlers/mods 제거, 고유 카드를 모든 더미에서 제거(deckChanges에는 넣지 않는다), `hp=RESCUE_HP`, `rescue.used=true`, `generalsLost.push(id)`, `fx rescue{deputyId, text}`. 병력 20이 다시 0이 되면 구출은 없다.

### 5.8 결과 (BattleResult)
```js
{ won, hp, maxHp, ration, suspicionDelta, turns, flagsOut:{…},
  deckChanges:[ {op:'remove', uid} | {op:'add', id, up} ],   // remove = 전투 removeCard 로 지워진 generated 아닌 카드만. add = addCard where:'deck' 로 만든 generated 아닌 카드만. 구출·leave 의 고유 카드는 넣지 않는다
  generalsLost:[id…], rescued:bool,
  stats:{ dmgDealt, dmgTaken, cardsPlayed:{id:n}, edictsPlayed, distTurns:[f,n,c], pushes, turnCapHit, intentChecks:{ok,bad}, enemiesKilled, shipsLeft:n|null, wavesCleared, turns }, log:[…] }
```

### 5.9 fx 이벤트 (`Core.bus.emit('fx', p)`) — 실제 일어난 순서대로, 「이후 값」을 담는다
`turnStart{turn,energy,drawn:[uid…],handUids:[uid…]}`(턴 시작 뽑기는 별도 draw fx 없음) · `draw{uids,handUids}` · `play{uid,cardId,handIdx,targetIdx,energyAfter,rationAfter,to:'discard'|'exhaust'}` · `hit{enemyIdx,n,pierce,hpAfter,blockAfter,dead,tag}` · `playerHit{n,blocked,hpAfter,blockAfter,wallAfter,source,tag,pierce}` · `block{n,wall,after}` · `push{from,to}` · `resist{enemyIdx}` · `status{who,idx?,id,n,after}` · `buff{id,n,turns}` · `enemyAct{enemyIdx,intent}` · `enemyDeath{enemyIdx,id,fled}` · `spawn{enemyIdx,id,hp,maxHp,wave}` · `wave{idx,intro,enemies:[{enemyIdx,id,hp,maxHp}]}` · `banner{key,text}` · `tide{phase,left}` · `load{enemyIdx}` · `advance{dist}` · `discard{uids,handUids}` · `exhaust{uids,handUids}` · `energy{after}` · `heal{n,hpAfter}` · `ration{n,after}` · `suspicion{n,after}` · `rescue{deputyId,text,hpAfter}` · `stun{enemyIdx}` · `win` · `lose` · `log{text}` · `turnCap` · `enemyBlock{enemyIdx,after}` · `enemyWall{after}`.
연출이 없어도(헤드리스) 상태는 완결된다. Combat은 Audio/UI를 모른다. 로그는 `TXT.log.*`가 있으면 쓰고 없으면 간단 문자열.

---

## 6. Run (`08_run.js`) — 판 상태기와 프롬프트 프로토콜

### 6.1 API
```js
Run.newRun(leaderId, seed) → G            // 시작 덱은 CARDS.startDeck(leaderId) 12장(uid는 Core.nextUid(G)). 첫 프롬프트는 1막 'map'
Run.state() → G                           // 읽기 전용으로 취급
Run.current() → prompt                    // G.prompt
Run.answer(a) → prompt                    // 답을 적용하고 다음 프롬프트. 잘못된 답은 throw
Run.save() / Run.load() → bool / Run.hasSave() → {act, leader, date}|null / Run.clearSave()
Run.deck() → [ {uid,id,up,card} ]
Run.score() → { total, parts:[{label,n}] }
Run.applyOps(ops, ctx) / Run.previewOps(ops) → string
Run.buildReq(node, extra?) → req           // 노드 진입(또는 battle op)당 정확히 한 번. 첫 줄 req.seed = Core.randInt(G.rng, 1, 0x7fffffff) → req.uidCounter = G.uidCounter → ENEMIES.build(encId, G.act, G.rng, overrides) (이 순서 고정). 그 밖에 G.rng 사용 없음
Run.suspicionCheck() / Run.afterNode() / Run.ensureDeckMin()   // 내보냄(테스트)
Run.selfTest() → {ok, errors}
```
`Run.current/state/deck/score/previewOps/hasSave`는 rng를 포함해 상태를 바꾸지 않는다.

### 6.2 `G`
```js
G = { ver, seed, rng:{s}, uidCounter, leader, act, nodeId:null, col:0, path:[nodeId…],
  hp, maxHp, ration, suspicion, deck:[{uid,id,up}], relics:[id…], relicUp:{}, deputies:[id…](최대 2), special:null|'yi', away:[id…],
  flags:{}, thresholds:{4:false,7:false,10:false}, scoreAdj:0,
  stats:{ nodes:0, fights:0, elites:0, bosses:0, turns:0, cardsOffered:{}, cardsPicked:{}, rescued:0, perBoss:{} },
  actLog:{ [act]:{ fights:[{node, won, turns}], suspTrace:[n…], gained:{cards:[], relics:[]}, choices:[{event, choice}] } },
  prompt:{…}, queue:[prompt…], done:false, ending:null }
```

### 6.3 프롬프트와 답 (UI는 `kind`별로 화면 하나)
| kind | 프롬프트 필드 | 답 |
|---|---|---|
| `map` | `{act, actInfo, nodes:[{…node, state:'done'|'current'|'open'|'closed'}], reachable:[id…], path}` | `{nodeId}` |
| `battle` | `{req, node, onWin:[ops]|null, onLose:'nanse'|'continue', reward:bool}` | `{result:BattleResult}` — UI/봇이 Combat을 돌리고 결과를 돌려준다 |
| `event` | `{eventId, title, text:[…], choices:[{text, enabled, reason, preview, hidden}], node?}` | `{choice:i}` |
| `shop` | `{cards:[{card, price, sold}], relics:[{relic, price, sold}], removePrice, removeUsed, ration}` | `{buy:'card', idx}` / `{buy:'relic', idx}` / `{remove:uid}` / `{leave:true}` (떠날 때까지 같은 프롬프트) |
| `camp` | `{options:[{id:'rest'|'train'|'farm', text, enabled, preview}]}` | `{pick:id}` (`train`이면 이어서 `pickCard`) |
| `court` | `{options:[{id:'report'|'recruit'|'request', text, enabled, reason, preview}], recruits:[{general, slotFull}], mingCards:[card…]|null}` | `{pick:'report'}` / `{pick:'recruit', id}` / `{pick:'request', cardId}` |
| `reward` | `{cards:[card…], relic:relic|null, ration:n, skipBonus:5, elite, boss}` | `{cardIdx:i|null}` |
| `merit` | `{slots:['leader','king'(,'ming')], total:10, defaults:{…}}` | `{alloc:{leader,king,ming}}` (합 10) |
| `pickCard` | `{reason:'upgrade'|'remove'|'offer'|'train', n, candidates:[{uid?, id, up, card}], canSkip}` | `{picks:[idx…]}` (`canSkip`이면 `[]` 허용) |
| `pickGeneral` | `{reason:'replace'|'optional', candidates:[{general}], incoming:general}` | `{id}` 또는 `{id:null}`(거절) |
| `scroll` | `{key, title, lines:[…], memo?, date?, encId?}` (문턱 통지·어명 삽입·칠천량·통제사 복귀·옥사·결전 도입 `key:'bossIntro'`) | `{}` |
| `actEnd` | `{act, summary:{dates, fights, suspTrace, gained, choices, compare:[str…]}}` | `{}` |
| `council` | `{page:1|2|3, suspicion, defenses:[{id:'ration'|'removeReport'|'brush', text, enabled, reason, left:n}], removeCandidates:[{uid,id,card}], verdict:null|{dismissed, text}}` | page1 `{next:true}` · page2 `{defend:id, uid?}` 또는 `{verdict:true}` · page3 `{next:true}` |
| `ending` | `{id:'silrok'|'jingbi'|'nanse', act, title, lines:[…], score, compare:[…], choices:[…]}` | `{}` → `G.done=true` |

`pickCard`는 `candidates.length===0`이면 프롬프트를 내지 않고 `{picks:[]}`로 처리한다. `candidates.length <= n`이고 `canSkip:false`면 자동 선택. `event`는 enabled 선택지가 0이면 첫 선택지를 enabled로 강제하고 `console.error`. `court`의 report는 언제나 enabled. `Run.answer`는 큐 방식: 답을 적용하면 생긴 후속 프롬프트들을 `G.queue` 앞에 넣고, 큐가 비면 `map`으로 돌아간다(마지막 열이면 §6.4 막 전환).

### 6.4 마디 흐름
`map` 답 → 노드 `variants` 적용(첫 일치) → `G.nodeId/col/path` 갱신, `stats.nodes++` → 종류별:
- `fight/elite/boss`: `boss`·`elite`·tutorial이면 먼저 `scroll{key:'bossIntro', encId}` → `battle` 프롬프트(저장) → 결과: `won=false`(onLose 'nanse') → `ending nanse`. `won` → **결과 적용 순서 고정**: `hp/maxHp/ration ← result` → `suspicion += suspicionDelta` → `deckChanges`(add는 `Core.nextUid(G)`) → `generalsLost.forEach(id → leave {id, dead:true})` → `rescued`면 `flags.rescuedUsed=true, stats.rescued++` → `flagsOut` 병합 → `ensureDeckMin()` → `stats.fights/elites/bosses`, actLog → `node.onWin` → `reward`(일반 10~20 / 정예 35 + 정예 기물(`src==='elite'` 미보유에서 `Core.pick`, 없으면 `RATION_NO_RELIC`) / 결전 60 + `enc.reward.relic`) → reward 답 뒤 `enc.reward.ops` → boss면 `merit` → `pickCard upgrade`(주장 점수÷4, 최대 2) → `suspicionCheck()` → `afterNode()` → 다음.
- `event`: `event` 프롬프트 → 답의 `ops` 적용(`battle` op면 battle 프롬프트가 끼어들고, 그 결과 처리 뒤 `onWin`) → `suspicionCheck()` → `afterNode()`.
- `court`: `courtEvent`가 있으면 먼저 `event` → `court`(`act>=3`이면 항상 `mingCards`(명군 풀 시드 3장, 미보유 우선)·`request.enabled = ration>=COURT.requestCost`; `act<3`이면 `mingCards:null`, `request.enabled=false, reason`) → 선택 적용(report `[{op:'suspicion', n:BAL.COURT.report}]` / recruit `recruit` / request `ration −20` + 덱 추가) + `node.courtOps[pick]` → `suspicionCheck()` → `afterNode()`.
- `camp`: rest `[{op:'hp', pct:CAMP.restPct}]` / train `pickCard upgrade` / farm `[{op:'ration', n:CAMP.farm}]`. `shop`: 진열은 보상 풀 규칙(§6.9)으로 시드 5장 + 기물 2 + 환향. 오방낭 할인. 방문당 퇴출 1회.
- `council`: §6.7 → `suspicionCheck()` → `afterNode()`.
`Run.afterNode()`(모든 마디 종료 공통): `act===5 && col===1`이면 `flags.wonGyun=false`, `away`의 부장을 `recruit {id}`(자리 차면 pickGeneral replace)로 복귀시키고 `away=[]`, `scroll{key:'return_tongjesa'}` → `MAPDATA.next(nodeId, flags)`가 `[]`이면 막 전환, 아니면 `map`(저장).
**막 전환**: `actEnd` 프롬프트 → `acts[act].endEvent`(lane 키 → default → 없으면 생략) → `suspicionCheck()` → `act++` → `onActStart` → 저장 → `map`. 예외: 7막 `boss` 승리는 merit·문턱 뒤 곧장 `ending`(`dokjeon`이면 `silrok`, 아니면 `jingbi`; actEnd 없음). `boss`가 마지막 열이 아니면(3막) 그냥 `map`.
**`onActStart`**: `act>=2`이고 「공 큰 장수」(famed: 이순신·곽재우)가 주장·부장·special이면 의심 +1(1막은 SUSP_START가 대신) → 기물 `runMods.actStartOps` → `flags.mingDiscountAct !== act`면 `mingDiscount=0` → `act > flags.mingCostDeltaUntilAct`면 `mingCostDelta=0` → `thresholds` 재무장(§6.5) → actLog 초기화.

### 6.5 의심 문턱 판정 (`Run.suspicionCheck()`)
시점: 막 시작, 결전 승리 직후(장계 분배 뒤), 사건·조정·council 종료 직후. 각 문턱 t는 `thresholds[t]===false`이고 `suspicion ≥ t`일 때 한 번: 4 → `edict_advance` 덱 추가, 7 → `edict_blame|edict_arrest|edict_envy` 중 시드 무작위, 10 → 부장 시드 무작위 옥사(`leave dead`) 또는 부장 없으면 최대 병력 −10, 의심 = `PRISON_RESET`. 덱 안 어명 ≥ `EDICT_CAP`이면 추가 생략(통지는 한다). 통지 `scroll{key:'thresh4'|'thresh7'|'thresh10'}`. 의심이 t 아래로 내려가면 `thresholds[t]=false`(다시 넘으면 다시).

### 6.6 덱 하한·칠천량
`ensureDeckMin()`: `DECK_MIN` 미만이면 `bowstring`·`spear_wall`을 번갈아 추가. 칠천량(E20 답 뒤, `flags.chilcheon`이 막 true가 된 그 자리에서 Run이): `removeCard tag:'navy' all` → `addCard twelve_ships`, `addCard pilsa_jeuksaeng` → 하한 → `leave yi_eokgi dead` → `scroll chilcheon`.

### 6.7 어전회의 (`kind:'council'`)
page1 회상 → page2 변호(`ration` 1회: 군량 −30 → −1 / `removeReport` 2회: 덱의 狀 카드 영구 제거 → −1 / `brush` 1회: 서애의 붓 보유 → −1) → `verdict` → page3: 의심 ≤ 6 유임 / ≥ 7 파직(`dismissed=true`; 이순신 주장이면 `flags.wonGyun=true`, 부장이면 `leave {id:'yi'}`(away); 의심 = `COUNCIL.afterDismiss`, 이순신 주장이면 바로 +1). 의심 ≥ 10이면 먼저 옥사(§6.5). 1순위에서 wonGyun 전투는 없으므로 Combat은 cardInfo(狀 불가)·배율만.

### 6.8 `req.mods` 조립 (`Run.buildReq`)
`mods = Object.assign({}, terrains[node.terrain].mods, enc.mods, extra.mods)` 뒤 플래그 변환:
- `boss_konishi`: `b1==='ridge'` → terrains.ridge.mods + `reward.relic='joryeong_stone'`; `'river'` → `{noPush:true, momentum:RIVER_MOMENTUM, chargeCostDelta:-1}` + reward ops `ration +20`; `'fort'` → `type='siege'`, reward ops `ration −20`. 미설정이면 river.
- `boss_myeongnyang`: `chilcheon` → `costOverride:{twelve_ships:0, pilsa_jeuksaeng:0}`, `dmgBonus:[{n:MYEONGNYANG.miracleNavyBonus, if:{cardTag:'navy'}}]`; 아니면 `bossHp:{todo:todoHpNoChilcheon}`, `reinforceEvery:reinforceEveryNoChilcheon`. `b6_scouts` → startHand에 `{id:'scout_boat'}` ×2; `b6_block` → `startBlock`; `b6_momentum` → `momentum`.
- `boss_noryang`: `b7_p2Hp` → `bossHpDelta:{shimazu_p2:n}`; `b7_mingExtra` → 2단계 `onStart`에 `chen_lin_bombard, deng_zilong, ming_navy_square` 순서로 n장 추가(free, generated); `dokjeon` → `startHand`에 `{id:'dokjeon', free:true}`.
- `boss_jiksan`: `boss5HpPct` → `enemyHpPct`. `wonGyun` → `mods.wonGyun`. `passivesOff` 없음(압송은 카드).
- 1막 튜토리얼 3전투는 편성 mods의 `tutorial`. `hpDelta`는 `req.hp`에.
명군 군량 계산은 Run이 하지 않는다(§5.1 cardInfo). 장계 분배 ming 슬롯: `flags.mingDiscount = min(mingMaxDiscount, floor(ming/mingPer)); flags.mingDiscountAct = act+1`.

### 6.9 보상 풀 (`Run.rewardCards(n)`)
풀 출현 규칙은 DESIGN §6.1(수·의·성·명·주의 조건). 희귀도 추첨(`REWARD`) → 그 희귀도 안에서 가능한 풀의 카드 균등(`G.rng`). 주장 고유는 `leaderChance` 자리 하나. 이미 덱에 2장 이상인 카드는 가중치 절반. `stats.cardsOffered/cardsPicked` 기록. 장시 진열도 같은 함수.

### 6.10 저장
저장 시점 셋: 프롬프트가 `map`이 될 때, 막 시작, 프롬프트가 `battle`이 될 때(UI가 전투를 시작하기 전). 전투 중에는 저장하지 않는다. `load`: `ver !== Core.VERSION`이면 폐기. 불러온 `prompt.kind==='battle'`이면 Main이 즉시 그 `req`로 전투를 처음부터(seed·uidCounter·enemies·deck uid가 같으므로 같은 전투).

---

## 7. UI·입력·오디오·메인

### 7.1 `Main` (`13_main.js`)
```js
Main.W=1280, Main.H=720;  Main.VIEW={scale:1, rot:0|90}
Main.start()                 // 부트스트랩: 캔버스·resize·Input.init·설정 로드·루프. 첫 입력(bus 'firstInput')에서 Audio_.init
Main.go(scene, params?)      // 'title'|'leader'|'settings'|'run'|'battle'|'deck'
Main.scene                   // 현재 씬 이름
Main.settings = { volume:0.7, fast:false, shake:true, captions:true, mute:false }
Main.setSetting(key, value)  // settings[key]=value → Core.save(SETTINGS_KEY) → volume|mute면 Audio_.setVolume/mute
Main.newSeed() → number      // Core.hash(String(Date.now()) + Math.random())  — 13_main 만 Date/Math.random 허용
Main.time                    // ms 누적 (UI 연출용. 로직은 쓰지 않음)
Main.debug = { newRun(leader, seed), answer(a), state(), goto(act, col), winBattle(), skipBattle(), setHp(n), setSusp(n), give(cardId), relic(id) }
// window.__J = {Core, TXT, CARDS, ENEMIES, GENERALS, EVENTS, MAPDATA, Combat, Run, Input, Audio_, UIBattle, UIScreens, Main}
```
루프: `requestAnimationFrame` → `dt(≤48ms)` → `Input.begin()` → 씬 `update(dt)` → `draw(ctx)` → `Input.end()`. 세로 폰: 제1부 방식(`imjin-rpg/imjin-part1.html` 70~120행 `screenToCanvas`, 4813~4831행 `resize`) — `#wrap`을 CSS `rotate(90deg)`, `VIEW.rot=90`, 좌표 변환은 `Input.toCanvas`. `run` 씬: `Run.current().kind==='battle'`이면 `Main.go('battle', {req})` → `UIBattle.start(req, result => { Run.answer({result}); Main.go('run'); })`; 그 밖은 `UIScreens.draw(ctx, dt, prompt)`; `G.done`이면 제목. 로드 직후 `prompt.kind==='battle'`이면 바로 battle. 음악: title/map → 'map', battle → 'battle', ending → 'ending'. `window.onerror`로 예외를 화면 하단에 작게 표시(게임은 멈추지 않는다). `M` 음소거.

### 7.2 `Input` (`09_input.js`) — 즉시 모드 히트존
```js
Input.init(canvasEl, wrapEl, viewRef)     // 이벤트 바인딩. viewRef = Main.VIEW (참조만 보관)
Input.begin()                             // 프레임 시작: 이번 프레임 히트존 비움, 키 에지 정리
Input.end()                               // 프레임 끝: 보류 입력을 디스패치, 커서 적용
Input.zone({ id?, x, y, w, h, tap?:fn(p), long?:fn(p), down?:fn(p), drag?:fn(p, dx, dy), up?:fn(p), wheel?:fn(delta), cursor?:'pointer', enabled?:true })
Input.p → { x, y, down:bool, justDown, justUp, moved }   // 캔버스 좌표. 터치면 마지막 터치
Input.key(code) → bool                    // 이번 프레임 눌림(에지). 'Space','Enter','Escape','Digit1'…'Digit0','KeyE','KeyD','KeyM','KeyS','Tab'
Input.keyDown(code) → bool  Input.consumeKey(code)
Input.wheel → number                      // 이번 프레임 휠 합(히트존 wheel 이 먹지 않은 것)
Input.isTouch → bool                      // pointer: coarse
Input.toCanvas(clientX, clientY) → {x,y}
Input.hover(zoneId) → bool                // 마우스가 그 id 영역 위(터치면 false)
Input.selfTest()
```
**디스패치는 `Input.end()`에서 한다.** end()는 이번 프레임 보류 이벤트(down, up/tap, long, drag, wheel)를 **등록 역순**으로 히트 테스트해 첫 적중 영역의 콜백만 부른다(콜백 안에서 Run.answer/Combat.play 호출 가능; 효과는 다음 프레임에 보인다). `enabled:false` 영역은 가리기만 한다. `id`는 `long`·`drag`·`up`·`hover`를 쓰는 영역에서 **필수**이며, down이 일어난 영역의 id와 같은 id로 다음 프레임에 등록된 영역이 drag/up을 받는다(없으면 up은 버려진다). long은 down 뒤 `LONG_PRESS_MS` 동안 같은 id 위에서 moved가 false일 때 1회, 그 뒤 tap은 발화하지 않는다. 첫 pointerdown/keydown에서 `Core.bus.emit('firstInput')`. Space·방향키·Tab preventDefault. 터치면 `document.body.classList.add('touch')`.

### 7.3 `UIBattle` (`11_ui_battle.js`)
```js
UIBattle.start(req, onDone(result))      // 큐 초기화 → bus 'fx' 구독 → view 를 req 값(hp/maxHp, block 0, 빈 손, 적 hp)으로 먼저 만든다 → Combat.create(req) → 큐 재생
UIBattle.update(dt) / UIBattle.draw(ctx) / UIBattle.stop()   // stop 에서 구독 해제
UIBattle.view                            // 표시용 복사. fx 의 after 값으로만 바뀌고, 큐가 비면 st 와 재동기화
```
규칙: 상태 전이는 즉시(`Combat.play/endTurn`), 연출은 큐(각 ≤ `FX_MS`, `Main.settings.fast`면 즉시 비움). 큐가 비기 전에도 입력은 받되 다음 `endTurn`은 큐가 빌 때까지(최대 `FX_WAIT_MAX_MS`) 기다린다. 좌표·영역은 DESIGN §7.1. 적이 5~6체면 폭을 줄여(85px) 한 줄에 그린다. 카드 톡→대상 톡, 길게 → 전문+적용 수치(`Combat.preview`). 적 머리 위 `intentPreview`(`raw`를 「發 14」, `dmg`를 실제 받을 피해로 함께). 1막 자막(`req.mods.tutorial` → `TXT.tutorial`). 결전 도입은 그리지 않는다(Run이 scroll로). `phase==='rescue'`면 부장 선택 창(5초 자동 첫째). `phase==='choose'`면 후보 강조 선택 창. `inst.marked`는 카드에 「裝」. 끝나면 1초 뒤(fast면 즉시) `onDone(Combat.result(st))`.

### 7.4 `UIScreens` (`12_ui_screens.js`)
```js
UIScreens.draw(ctx, dt, prompt)          // kind 별 화면. 선택은 Input.zone 으로 받아 Run.answer(a) 호출 → 반환값 무시(다음 프레임에 Run.current())
UIScreens.title(ctx, dt) / UIScreens.leaderSelect(ctx, dt) / UIScreens.settings(ctx, dt) / UIScreens.deck(ctx, dt, onClose)
```
leaderSelect는 `Run.newRun(id, Main.newSeed())` 뒤 `Main.go('run')`. settings는 값을 바꿀 때 오직 `Main.setSetting`. 지도 배경·두루마리 질감·인장 초상은 오프스크린 캐시(act 키). 키: 사건 `1 2 3`, `Esc` 닫기(사건·결말·council 제외), `D` 덱, `S` 저장 후 제목(map에서만). 지도 아이콘은 `TXT.kindIcon`(council 포함).

### 7.5 `Audio_` (`10_audio.js`)
```js
Audio_.init()        // bus 'firstInput' 에서 Main 이 부른다. AudioContext 없으면 조용히 비활성
Audio_.sfx(name)     // 'card','shot','melee','gun','fire','sink','drum','horn','banner','suspicion','scroll','button','move','win','lose','load','tide','hwacha','turtle','parley','hit','block','draw','rescue','spawn'
Audio_.music(name|null)  // 'map','battle','ending'
Audio_.setVolume(v) / Audio_.mute(bool)
```
`Core.bus.on('fx', …)`로 fx kind → sfx 매핑을 **Audio_ 안에서** 한다. UI 단추 소리만 `Audio_.sfx('button')`.

### 7.6 `TXT` (`01_text.js`) — UI·Run이 부르는 이름
```js
TXT.title='징비', TXT.hanja='懲毖', TXT.subtitle='일곱 해의 패'
TXT.act[1..7] = { no:'一', era:'임진', name:'검은 돛', period, intro:['…'] }
TXT.date(str) → '임진년 사월 열나흘'      // '1592.4.14' → 간지 연도 + 음력 월일 한글. 범위·월만도 처리
TXT.dist = ['遠','近','接'], TXT.distName=['멀리','가까이','붙음'], TXT.tutorial = { far:[…], near:[…], close:[…], suspicion:[…] }
TXT.type = { atk:'攻', def:'守', tac:'策', rep:'狀', edict:'御' }, TXT.pool = {…}, TXT.rarity = {…}
TXT.status[id] = { name, hanja, desc }, TXT.buff[id] = { name, desc }, TXT.tag = { shot:'사격', melee:'백병', charge:'돌격', fire:'화공', none:'' }
TXT.intent = { atk:'{text} {n}', approach:'접근', load:'裝', … }
TXT.opsText(ops, ctx?) → '의심 −1, 군량 +20'         // 33개 op 전부. cond는 「(遠이면) …, (아니면) …」
TXT.cardDesc(card, up, ctx?) → string               // desc + 거리 배율·지역 보정·군량·소모/보존 문구
TXT.banner = { crane, kurushima, rescue, wave, arrows, tide_flow, edict, starve, leave, counterspy, … }
TXT.scroll = { thresh4:{title,lines}, thresh7, thresh10, chilcheon, return_tongjesa, prison, bossIntro:{[encId]:{title,memo,lines}}, council1, council2, council3_keep, council3_dismiss, … }
TXT.rescue(name) → '황진이 창을 들고 앞으로 나섰다. 북소리가 다시 울렸다.'
TXT.defeat[1..7], TXT.ending = { silrok:{title, lines(G)}, jingbi:{…}, nanse:{…} }
TXT.compare[bossEnc](stats) → string                // 역사 대조 한 줄 7개
TXT.log = { play:(card)=>…, hit:(name,n)=>…, enemyAct:(name,intent)=>…, dead:(name)=>…, push:(from,to)=>…, turn:(n)=>…, starve:…, stunFail:… }
TXT.ui = { endTurn:'턴을 마친다', skip:'거른다', confirm:'그리한다', cancel:'물린다', continue:'계속', newRun:'새 판', resume:'이어하기', settings:'설정', deck:'패 보기', buy:'산다', leave:'떠난다', remove:'환향', rest:'쉰다', train:'조련', farm:'둔전', report:'장계를 올린다', recruit:'천거', request:'청병', decline:'사양한다', … }
TXT.merit = { head, slots:{leader:'주장',king:'성은',ming:'명군'}, effects:{…} }
TXT.council = {…}, TXT.memo = { '1592.4.14':'부산진 함락', … }
TXT.terrain[id] = { name, desc }, TXT.kindIcon = { fight:'⚔', naval:'⚓', elite:'★', event:'📜', camp:'⛺', shop:'🏮', court:'🏯', boss:'👹', council:'👑' }
TXT.selfTest()
```

---

## 8. 테스트 (`test/`)

- `test/headless.js`(있음): `node test/headless.js` 로드만 / `--eval "Combat.selfTest()"` / `--run test/sim.js`.
- `test/sim.js`: `module.exports = (ctx, win) => stats`. 인자는 `process.argv`에서 직접(`--seeds 1-1000 --leader yi|gwon|both --bot greedy|far|random|all --verbose`). 봇: `GreedyBot`(합법 수마다 `preview`·`intentPreview`로 기대 피해·기대 방어·거리 가치·의심 비용 점수화) · `FarBot`(push·遠 우선) · `RandomBot`(퍼징). **전투 밖 기본 정책**: reward — Greedy는 덱 평균 비용 ≤1.5면 희귀 우선 아니면 거르기, Far는 push/shot 우선, Random은 무작위 · merit `{leader:4,king:6,ming:0}`(3막 이후 `{4,3,3}`) · pickCard 첫 n개(canSkip이면 `[]`도 가능) · pickGeneral 첫 후보 · shop 군량 ≥ 가격+20이면 첫 카드 1장 뒤 leave · camp hp<60%면 rest 아니면 farm · court suspicion≥3이면 report, 아니면 recruit(후보 있으면), 아니면 report · event enabled 중 시드 무작위(분기 도달률용) · council ration≥30이면 ration 변호 뒤 verdict · scroll/actEnd/ending `{}` · rescue 첫째 · choose 첫 n개. 매 적 턴 전 `intentPreview`를 기록해 fx `playerHit`의 n과 대조. 안전장치: 판당 프롬프트 3,000개·전투당 300턴 넘으면 「교착」으로 기록하고 중단. 출력 JSON: 판 수, 완주율, 막별 누적 사망률, 평균 턴/전투(막별), 카드별 채택률·사용률, 어명 사용률, 밀어내기/전투, 遠·近·接 체류 비율, 분기 도달률(b1·lane·dismissed·chilcheon·dokjeon), 구출 발동률, 턴 상한 도달 수, intent 불일치 수, 교착 수, 예외 목록(최대 20개: seed, leader, bot, act, node, kind, stack), 엔딩 분포, 평균 점수.
- `test/check.js`: `headless.js`의 `loadScripts()`로 전역을 얻은 뒤 다음 경로를 재귀로 걷는다(중첩 `then`·`else`·`perCard`·`ops`·`onWin`·`onStart`). 전투 맥락: `CARDS.list[].ops/onDraw/plus.ops/plus.onDraw`, `GENERALS.*.passive.handlers[].ops`, `GENERALS.relics[].handlers/upHandlers[].ops`, `ENEMIES.list[].intents[kind:'ops'].ops`, `ENEMIES.list[].handlers`, `ENEMIES.encounters[].handlers/waves[].onStart`. 판 맥락: `EVENTS.list[].choices[].ops`(그 안 `battle.onWin`·`battle.handlers`는 각각 판·전투), `EVENTS.list[].variants[].patch.choices[].ops`, `GENERALS.relics[].onAcquire/runMods.actStartOps`, `MAPDATA.nodes[].onWin/courtOps`, `ENEMIES.encounters[].reward.ops`. 검사: op 이름이 §4 33종 안이고 그 맥락에서 허용, `cond` 키가 §3.1 안, 훅 이름이 §9 안, mod 이름이 {dmgBonus, atkPct, costDelta, blockKeep} 안, status/buff id가 §4.2 안, 의도 kind가 §3.3 안, `choose:true`는 카드 ops 안에만, 모든 데이터가 JSON 왕복 후 deep-equal, ID 대조(카드 99 정확히 일치·적 16+결전 11·기물 17·부장 8·주장 2·사건 29·**열 49**(막별 7/8/8/6/7/6/7 — 한 열에 선택 마디가 여럿이면 노드 수는 49보다 많다; 현재 77)·참조 편성 존재·카드/기물/부장 참조 ID 존재, home 있으면 uibyeong 태그), 음력 날짜 정규식 `^\d{4}\.\d{1,2}(\.\d{1,2})?(~\d{1,2}(\.\d{1,2})?)?$`, 각 src 파일의 최상위 `var`가 정확히 하나이고 §1 이름, 02~08에 금지 토큰 없음(00의 save/load 예외; 09~12의 `Main`은 허용), index.html script 순서 = §1, dist html 외부 참조 0, 파일별 줄 수. 결정성: 시드 1~20에 대해 `Combat.create(Run.buildReq(1막 첫 마디))` → RandomBot K수 → `a=st, b=Core.clone(st)` → 같은 수열 N수를 a·b에 각각 → `JSON.stringify(a)===JSON.stringify(b)`(키 순서까지). Run도 `newRun → answer` 수열로 같은 절차. 각 전역 `selfTest()` 호출. 실패는 종료 코드 1. 모르는 항목(파일 없음)은 「건너뜀」(`--strict`면 실패). ID·op·훅 목록은 check.js 안에 상수로.

---

## 9. 훅 15종 (동결)

Combat 발화: `onBattleStart`(ctx `{}`) · `onTurnStart`(`{turn}`) · `onTurnEnd` · `onCardPlayed`(`{card, inst, target}`) · `onCardDrawn`(`{card, inst}`; `DRAW_HOOK_CAP`은 **이 훅의 핸들러 발화 횟수**에만 적용, 카드 자신의 onDraw는 제한 없음) · `onDamageDealt`(`{n, enemyIdx, card}`) · `onDamageTaken`(`{n, enemyIdx}`) · `onDistanceChange`(`{from, to}`) · `onEnemyDeath`(`{enemyIdx, enemy}`) · `onEnemySpawn`(`{enemyIdx, enemy}`, `who:'spawned'`) · `onWaveStart`(`{wave}`) · `onHpZero` · `onBattleEnd`(`{won}`).
Run 발화: `onActStart`(기물 `runMods.actStartOps`) · `onAcquire`(기물 `onAcquire`).
핸들러 `{hook, cond?, ops, once?:'battle'|'turn', src:{kind:'leader'|'deputy'|'special'|'relic'|'encounter'|'req', id}}`. 발화 순서는 조립 순서(§5.4). `oncePerBattle/oncePerTurn` cond는 핸들러별 `usedBattle/usedTurn`으로.

---

## 10. 문체·표기 규칙 (모든 파일)
- 로그·배너·두루마리: 사극 톤, 「」 인용, 음력 날짜 한글(`TXT.date`). 숫자는 아라비아 숫자.
- 카드 `desc`는 규칙 문구(「6 피해. 遠이면 +8」). 거리 배율·지역 보정 문구는 `TXT.cardDesc`가 덧붙인다.
- 「전승」 표기 대상: 세마대·명량 쇠사슬. 삼단 사격·논개 금지.

---

## 11. 담당별 체크리스트 (제출 전)
1. `node --check src/NN_x.js` 통과. 전역은 하나. `'use strict'`.
2. 데이터 파일: `X.selfTest()`가 ID 중복·필수 필드·op 이름·훅 이름·참조 ID를 검사해 `{ok, errors}`를 돌려준다.
3. Combat/Run: `selfTest()`가 더미로 한 판/한 전투를 돌린다. `JSON.parse(JSON.stringify(st))` 뒤 같은 입력 → 같은 결과.
4. UI 파일: 모든 누름 영역 `Input.zone`, 44px 이상, `Main.settings.fast` 존중, 오프스크린 캐시, `Main`은 함수 안에서만.
5. 파일 상단에 `// TODO(통합): …` 로 다른 파일에 바라는 것을 적는다.

---

## 12. 결정성·교착 요약 (전 담당 공통)
- 난수는 `G.rng`(판)와 `st.rng`(전투)뿐. 미리보기·조회 함수는 rng를 전진시키지 않는다(복제본에서만).
- 교착 방지: 턴 상한 30(적 체력 −10%, 최소 1)·강제 종료 100, choose 후보 0 건너뜀, 덱·버림 모두 비면 뽑기 중단, 손 상한, 증원 cap·`ENEMY_MAX`, 의도 순환 유한, 0비용 연쇄 `DRAW_HOOK_CAP`, 파도 전환은 판정 시점에만, 구출 재개 프로토콜.
- 모든 상태 객체는 생성 시 키를 전부 채운다. `undefined`·`delete` 금지.

---

## 13. DESIGN.md와의 의도적 차이
| 항목 | DESIGN | 계약 | 이유 |
|---|---|---|---|
| 파일 번호 | 09 UIBattle 10 UIScreens 11 Input 12 Audio | 09 Input 10 Audio 11 UIBattle 12 UIScreens | 로드 순서 = 의존 방향 |
| 정문부 패시브 | 막당 1회 | 전투당 1회 | 막 단위 추적 비용 |
| 서애의 붓 | 전투 중 어명 1장 소모(능동) | 어명을 뽑을 때 자동 소모(전투당 1회) | 능동 기물 UI 제거 |
| 훅 수 | 13 | 15 (`onEnemySpawn`, `onAcquire`) | 명량의 쇠사슬·항왜의 조총 |
| op 수 | 23 | 33 | 군율·신상필벌·전열 정비·조총·비격진천뢰·파진·배너·점수·E12·칠백의사(leave 공통) |
| 상태 효과 | 8 | 9 (`flinch 위축`) | 역토산 |
| 관통 | 「관통 무시」 | 관통은 적 진형·적 성벽 모두 무시 | 뜻을 하나로 |
| charge 接 배율 | 사용 불가 | 이동 후 항상 ×1.5 | 진격하라로 接에서 낼 때 |
| 정예 체력 | 배율 | 배율(보스만 고정) | DESIGN 그대로 — 계약 v1의 「elite 고정」을 철회 |
| 증원 cap | 「총 등장 상한」 | 초기 편성 포함 총수 | 뜻을 하나로 |
| E19 ③ | 5막 적 의도 전부 공개 | 5막 결전 적 체력 −10% + 배너 | 1순위는 의도가 이미 전부 공개 |
| E13 ③ | 다음 막까지 비용 +1 | `mingCostDeltaUntilAct=4` | 수명을 플래그로 |
| 동시 적 수 | 1~4체 | 최대 6(5~6체면 폭 축소) | 명량 증원 |
| 결전 도입 | battle 안 | Run이 scroll로 먼저 | 소유자 하나 |
| 보존(retain) 카드를 낸 뒤 | — | 보통처럼 버림 | 보존은 턴 끝 버림을 면하는 것 |
| 진형이 사라지는 때 | 턴 마침에 0 | **적 턴이 끝난 뒤**(상태 경과 직전) 0. 철벽·서서 죽는다·지구(blockKeep)는 이때 본다 | 적 턴 전에 0이면 진형이 아무것도 막지 못한다 |
| 턴 시작 순서 | onTurnStart → 군령 → 뽑기 | 턴 상한 → 조류 → **군령 산정** → 보류 버프 → onTurnStart → 고개 진형 → delayed → 뽑기 → 승리 판정 | 「해전 첫 턴 군령 +1」 같은 훅이 군령 재설정에 덮이지 않게 |
| 적 진형 | — | 적 턴 시작에 0 | 「밀집」이 플레이어 턴 동안 그 적을 지킨다 |
| 원균 대행 | 부장 패시브 끔 | **주장 패시브**를 끈다 | 원균이 이순신 자리에 섰다 |
| 왜 척후 「신호」 | 다음 적 턴 기세 +1 | `enemySignalNext` → 다음 적 턴의 공격에 +1, 그 턴 끝에 0 | 같은 턴에 쌓고 지우면 효과가 없다 |
| 의도 진행 | 적 턴 끝에 일괄 | 그 적이 행동한 직후 | 새로 나온 적이 첫 의도를 건너뛰지 않게 |
| 미리 보기 | perEnemy·distAfter | + `incomingAfter`(이 패를 낸 뒤 다음 적 턴에 받을 피해), `hpAfter`, `won` | 화면의 「받을 피해 27 → 12」, 시뮬 봇의 판단 |
| 막 전환 회복 | 없음 | 새 막에 들어서면 잃은 병력의 50%를 수습(`BAL.ACT_HEAL_PCT`) | 시뮬: 회복 없이는 3막에서 95% 사망 |
| 막 배율 | 체력 +12%/막 | +8%/막 | 시뮬 밸런스(덱 성장 속도에 맞춤) |
| 결전 수치 | DESIGN §5.8 | 와키자카 90·등선 14·세키부네 2척 / 행주 30·34·40, 호위 가볍게, 공격 13·18~22 / 구로다 100·돌격 14 / 도도 130(칠천량 없으면 140, 증원 3턴) · 구루시마 40 / 노량 100·120, 자폭 20 / 안택선 40·등선 12 / 기마 무사 돌격 10 | 시뮬 300판 기준 완주 20~25%, 1막 사망 ≤5% |
| 지도 좌표 | 1280×720 고정 | 화면이 열들을 가로 가운데로 옮겨 그린다 | 7열 막의 오른쪽이 비어 보였다 |
| 화면 문자·화풍 | 한자 인장·먹 두루마리·「遠/近/接」·「發」「裝」 | 화면에는 한자를 쓰지 않는다. 거리는 원거리·중거리·근접, 의도·종류·기물은 `ART.icon` 그림, 장수는 `ART.person`/`ART.portrait` 캐릭터. `UIBattle.gfx.txt/para`가 모든 글에서 괄호 속 한자와 홀로 쓴 한자를 걷어 낸다(`gfx.clean`). 데이터의 `hanja` 칸은 남겨 두되 그리지 않는다 | 사용자 피드백: 「이순신 캐릭터가 없고 한자가 많아 중국 게임 같다, 게임스럽지 않다」 |

