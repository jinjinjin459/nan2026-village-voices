# 마을의 목소리 — Village Voices

> **주민의 말을 들으며 관계를 이해하고, 하루씩 나만의 마을을 가꾸는 AI 생활 시뮬레이션.**

NAN 2026 Game × AI Hackathon 사전 과제 프로토타입입니다. 플레이어는 오리지널 3D 배경과 3D 렌더 캐릭터로 구성한 디오라마 마을을 자유롭게 산책하고, 원하는 주민에게 원하는 순서로 몇 번이든 말을 겁니다. 하루에 시설 하나를 지으면 시설·행복도·관계·최근 사건이 누적되고, 다음 날 주민들은 달라진 세계를 각자의 성격으로 이야기합니다.

게임 코드가 세계의 사실과 결과를 결정하고, 공개 웹에서는 **Cloudflare Workers AI**의 **Google Gemma 4 26B A4B Instruct** (`@cf/google/gemma-4-26b-a4b-it`)가 그 상태를 주민별 관점의 짧은 대화로 번역합니다. AI를 사용할 수 없는 환경에서도 동일한 상태를 반영한 검증 대사로 중단 없이 진행됩니다.

## 제출 링크

| 항목 | 링크 |
| --- | --- |
| 웹 플레이 | [GitHub Pages에서 바로 플레이](https://jinjinjin459.github.io/nan2026-village-voices/) |
| 전체 소스 | [GitHub 저장소](https://github.com/jinjinjin459/nan2026-village-voices) |
| 40초 실제 플레이 영상 | [`Village_Voices_40s_Gameplay.webm`](docs/submission/Village_Voices_40s_Gameplay.webm) |
| 게임 소개 PDF | [`docs/submission/Game_Introduction_KO.pdf`](docs/submission/Game_Introduction_KO.pdf) |
| AI 활용 기술 PDF | [`docs/submission/AI_Technical_Document_KO.pdf`](docs/submission/AI_Technical_Document_KO.pdf) |

개인 참가 프로젝트이므로 팀원 롤 기술서는 공고에 따라 생략합니다. 제출 화면이 파일을 강제할 경우 [`Individual_Participation_Notice_KO.pdf`](docs/submission/Individual_Participation_Notice_KO.pdf)를 사용합니다.

YouTube 제출용 제목·설명·설정은 [`YouTube_Upload_Copy_KO.txt`](docs/submission/YouTube_Upload_Copy_KO.txt)에 준비되어 있습니다. 영상은 공개 Pages 최종본에서 실제 Gemma 응답을 포함해 40.00초로 연속 녹화했습니다.

## 게임 방법

### 목표

정해진 정답이나 강제 퀘스트 순서 없이 주민과 관계를 쌓고, 매일 시설 하나를 선택해 나만의 마을을 완성합니다. 주민 대화는 현재 날짜, 누적 시설, 행복도, 관계와 최근 사건을 반영합니다.

### 조작

- **PC 이동:** `WASD` 또는 방향키
- **마우스 이동:** 마을의 빈 곳을 클릭해 해당 위치로 이동
- **모바일 이동:** 화면 이동 패드 또는 마을 빈 곳 탭
- **대화:** 루루·모카·두부 중 원하는 주민 클릭/탭
- **질문:** 추천 질문 또는 40자 이하 직접 질문
- **저장:** 별도 버튼 없이 `localStorage`에 자동 저장

### 자유 진행 루프

```text
3D 마을 산책
   ↓
원하는 주민과 순서 없이 반복 대화
   ↓
원할 때 오늘의 시설 하나 건설
   ↓
시설·행복도·관계·최근 사건 누적
   ↓
더 대화하거나 하루 기록 확인
   ↓
다음 날 → 새로운 상태의 대화와 건설
```

- 대화는 건설의 강제 조건이 아니며, 같은 주민과 반복 대화할 수 있습니다.
- 주민과 대화할 때 해당 주민의 누적 대화 횟수와 행복도가 증가합니다.
- 하루에는 아직 짓지 않은 시설 하나만 건설할 수 있습니다.
- 이전 날의 시설은 사라지지 않으며 최대 세 시설이 마을에 함께 표시됩니다.
- 세 시설을 모두 지은 뒤에도 날짜와 대화 루프는 계속됩니다.
- 고정된 종료 화면은 없습니다. 플레이어가 원하는 마을을 만들고 원하는 만큼 이어갑니다.

## 누적되는 마을 상태

| 시설 | 즉시 적용되는 시스템 변화 | 이후 대화에서 드러나는 의미 |
| --- | --- | --- |
| 느티나무 공원 | 전원 행복 증가, 루루–모카 관계 크게 개선 | 서로 다른 속도로 쉬며 다시 대화할 계기 |
| 별빛 오락실 | 루루 행복 증가, 모카 행복·관계 감소 | 한 주민의 즐거움이 다른 주민에게는 피로 |
| 마을 잡화점 | 모두 조금 행복, 관계 변화 없음 | 생활은 편리해지지만 관계 문제는 별개 |

건설 결과는 선택 순서와 무관하게 누적됩니다. 최근 사건은 새 사건부터 최대 12개까지 유지되고, 관계·행복도는 0~100 범위에서 관리됩니다.

## 자동 저장과 복원

앱은 마을 상태와 플레이어 위치를 브라우저 `localStorage`에 자동 저장합니다.

- `village-voices-save-v2`: 날짜, 단계, 시설, 행복도, 관계, 사건, 대화 기록
- `village-voices-player-v1`: 플레이어의 마을 내 위치

새로고침하거나 브라우저를 다시 열면 저장한 날짜·누적 시설·플레이어 위치를 복원합니다. 이전 형식의 일부 저장 데이터도 기본값 보완과 범위 검사를 거쳐 안전하게 불러옵니다. 우측 상단 초기화 버튼은 저장 데이터를 지우고 1일 차로 돌아갑니다.

## 실행 방법

### 공개 웹 빌드

위 GitHub Pages 링크를 최신 Chrome, Edge, Safari에서 열면 설치 없이 바로 플레이할 수 있습니다. 정적 배포에서 live AI endpoint가 구성되지 않았거나 일시적으로 응답하지 않아도 검증된 fallback 대사로 전체 sandbox 루프가 작동합니다.

### 로컬 안전 데모

```powershell
npm ci
npm run dev
```

표시된 Vite 주소를 브라우저에서 엽니다. API endpoint를 별도로 지정하지 않으면 fallback 경로를 사용합니다.

### 로컬 Gemma 4 라이브 모드

키는 브라우저 번들에 넣지 않고 Node 서버 환경 변수로만 제공합니다.

```powershell
$env:GEMINI_API_KEY='새로 발급한 서버 전용 키'
npm run dev:ai
```

프로덕션 빌드 실행:

```powershell
npm run build
$env:GEMINI_API_KEY='새로 발급한 서버 전용 키'
npm start
```

`.env`, 클라이언트 코드, GitHub Pages 빌드에는 실제 키를 넣지 마세요. 공개된 키는 폐기하고 새 키로 교체해야 합니다.

## GitHub Pages + Cloudflare Worker 구조

라이브 웹 AI 경로는 정적 프론트와 Cloudflare Workers AI 런타임을 분리해 배포했습니다.

```text
GitHub Pages React 앱
  ├─ VITE_API_BASE_URL 미설정/health 실패 → 로컬 fallback
  └─ VITE_API_BASE_URL 설정
          ↓ HTTPS + 허용 origin CORS
Cloudflare Worker /api/health · /api/dialogue
          ↓ Workers AI binding: env.AI
Google Gemma 4 26B A4B Instruct
(@cf/google/gemma-4-26b-a4b-it)
```

- Worker 코드는 [`cloudflare/worker.mjs`](cloudflare/worker.mjs), 설정은 [`wrangler.jsonc`](wrangler.jsonc)에 있습니다.
- `ALLOWED_ORIGIN`은 GitHub Pages origin만 허용하며, 임의 origin의 API 요청은 거부합니다.
- 공개 Worker는 Cloudflare Workers AI binding만 사용하며 API key를 브라우저·소스·Worker 변수에 포함하지 않습니다.
- Worker는 요청 길이·상태 일관성·질문 정규화·출력 schema를 검증하고 요청량·동시 요청을 제한합니다.
- 공개 Worker는 `https://nan2026-village-voices-api.wlsalswo14.workers.dev`에 배포했고, Pages 빌드의 `VITE_API_BASE_URL`로 연결했습니다.

## 핵심 AI 구조

```text
VillageState
(날짜·누적 시설·행복도·관계·최근 사건·대화 횟수)
            ↓
서버측 정규화와 NPC별 Context Builder
            ↓
Persona + Relationship + Mood + Player Question
            ↓
Gemma 4 26B A4B Instruct → Structured JSON → 이중 검증
            ↓                              ↓ 실패
       주민 대화 UI                 상태별 fallback
            ↓
대화 또는 플레이어의 일일 시설 선택
            ↓
Deterministic State Reducer
            └──────────────→ 누적 VillageState → 자동 저장
```

AI가 담당하는 것은 `dialogue`, `emotion`, `topic`의 표현뿐입니다. 시설 존재 여부, 날짜, 행복도, 관계도, 실제 사건과 건설 결과는 [`src/game/engine.ts`](src/game/engine.ts)의 결정론적 규칙이 관리합니다.

### AI 안정성

- 클라이언트 입력을 신뢰하지 않고 Worker에서 시설 수·날짜·단계의 일관성을 재계산
- 주민에게 필요한 사실만 전달하는 NPC별 context
- 플레이어 질문을 지시가 아닌 인용 데이터로 취급하는 prompt-injection 방어
- 게임 데이터 밖의 시설·사건·과거 생성 금지 system instruction
- JSON Schema 기반 구조화 출력과 허용 field·enum·120자 재검증
- 서버 12초, 클라이언트 13초 timeout
- 10분 TTL·최대 120개 응답 cache
- API 오류, quota, 네트워크 단절, 비정상 JSON 시 상태별 fallback
- AI 출력은 게임 상태를 수정할 권한이 없음

## 프로젝트 구조

```text
src/
  assets/
    village-diorama-v2.png  3D 디오라마 마을 배경
    residents/*.webp        루루·모카·두부·플레이어 3D 렌더
  components/               3D 캐릭터 통합·아이콘
  game/
    data.ts                 주민·시설·save hydration·fallback
    engine.ts               누적 상태와 날짜 reducer
    engine.test.ts          sandbox 상태 회귀 테스트
  services/dialogueApi.ts   Worker/Node API와 fallback 전환
  App.tsx                   이동·대화·건설·날짜·저장 UI
cloudflare/worker.mjs       Workers AI edge 추론·검증·CORS·제한
server.mjs                  로컬 개발용 Gemini API fallback·정적 서버
scripts/                    sandbox/mobile/AI/제출물 검증
docs/source/                PDF 원본 HTML
docs/submission/            최종 제출 PDF
```

## 검증

```powershell
npm run check
node scripts/sandbox-e2e.mjs
node scripts/mobile-smoke.mjs
node scripts/ai-smoke.mjs   # 라이브 AI 서버 환경 필요
npm run verify
```

검증된 자유 진행 경로:

```text
인트로 → 방향키 이동 → 모카 → 루루 → 모카 반복 대화
→ 1일 차 공원 → 다음 날 → 두부 → 모카
→ 2일 차 오락실 → 공원+오락실 누적 확인
→ 새로고침 → 날짜·시설·localStorage 복원
```

모바일 smoke는 390×844 touch 환경에서 화면 이동 패드, NPC 탭 대화, 콘솔·페이지 오류 0건을 확인합니다.

## 개발 및 AI 도구 사용

- **공개 런타임 AI:** Cloudflare Workers AI의 [Google Gemma 4 26B A4B Instruct](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/) (`@cf/google/gemma-4-26b-a4b-it`) — 누적 World State 기반 NPC 대사·감정·주제 생성.
- **로컬 개발 fallback:** `server.mjs`는 서버 환경 변수로 제공한 Gemini API key가 있을 때만 별도 개발 경로를 사용할 수 있습니다. 이 키는 공개 Worker와 브라우저에 포함하지 않습니다.
- **개발 보조 AI:** OpenAI Codex — 기획 검토, 코드 작성 보조, 테스트·문서·UI 검증. 모든 결과는 참가자가 직접 실행하고 검수했습니다.
- **3D 오리지널 비주얼:** 2026-08-10 OpenAI image generation으로 프로젝트 전용 마을 배경과 루루·모카·두부·플레이어 렌더를 생성했습니다. 참가자가 캐릭터 설정, 의상, 카메라·조명, 화면 적합성, 가독성, 독창성을 검수하고 배경 제거·WebP 최적화·UI 통합을 수행했습니다.
- **코드 기반 그래픽:** 시설, 아이콘, 말풍선, 표정 상태 cue와 인터랙션 UI는 React·CSS·인라인 SVG로 제작했습니다.
- **사운드:** 사용하지 않았습니다.
- **폰트:** 운영체제 기본 `Noto Sans KR`/`맑은 고딕` fallback만 사용하며 웹 폰트 파일을 배포하지 않습니다.

자세한 버전·출처·라이선스·생성 에셋 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.

## 참가 형태

개인 참가. 기획, 게임 시스템, 프론트엔드, AI 연동, UI·에셋 통합, 테스트, 문서화를 참가자 1인이 담당했습니다.

## 라이선스

프로젝트 소스는 [MIT License](LICENSE)로 공개합니다. NAN 2026 제출 및 심사를 위한 실행·검토를 허용합니다.
