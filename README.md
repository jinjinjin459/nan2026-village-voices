# 마을의 목소리 — Village Voices

> **상태창 없이 주민의 말만 듣고 문제를 진단하는 AI 마을 운영 게임.**

NAN 2026 Game × AI Hackathon 사전 과제 프로토타입입니다. 플레이어는 세 주민의 서로 다른 증언을 듣고 마을에 필요한 시설을 하나 선택합니다. 게임 코드가 시설·행복도·관계·사건을 결정하고, Gemini 3.6 Flash는 그 상태를 각 주민의 성격과 관계에 맞는 짧은 대화로 번역합니다.

## 제출 링크

| 항목 | 링크 |
| --- | --- |
| 웹 플레이 | [GitHub Pages에서 바로 플레이](https://jinjinjin459.github.io/nan2026-village-voices/) |
| 전체 소스 | [GitHub 저장소](https://github.com/jinjinjin459/nan2026-village-voices) |
| 플레이 영상 | YouTube 업로드 후 NAN 2026 제출 폼에 기재 |
| 게임 소개 PDF | [`docs/submission/Game_Introduction_KO.pdf`](docs/submission/Game_Introduction_KO.pdf) |
| AI 활용 기술 PDF | [`docs/submission/AI_Technical_Document_KO.pdf`](docs/submission/AI_Technical_Document_KO.pdf) |

개인 참가 프로젝트이므로 팀원 롤 기술서는 공고에 따라 생략합니다. 제출 화면이 파일을 강제할 경우 [`Individual_Participation_Notice_KO.pdf`](docs/submission/Individual_Participation_Notice_KO.pdf)를 사용합니다.

## 게임 방법

- **목표:** 주민들의 말에 담긴 욕구와 관계를 추론하고 마을에 필요한 시설을 선택합니다.
- **조작:** 마우스 클릭 또는 터치만 사용합니다. 주민 대화창에서는 추천 질문과 40자 이하 직접 질문을 사용할 수 있습니다.
- **진행:** 주민 두 명 이상과 대화 → 공원·오락실·잡화점 중 하나 선택 → 달라진 주민 두 명 이상과 재대화 → 결과 확인.
- **종료 조건:** 선택 후 주민 두 명의 반응을 듣고 `변화 돌아보기` 화면을 열면 한 회차가 끝납니다.
- **예상 플레이 시간:** 약 3분.

세 시설은 모두 실제로 서로 다른 결과를 냅니다.

| 선택 | 시스템 결과 | 대화에서 드러나는 의미 |
| --- | --- | --- |
| 느티나무 공원 | 전원 행복 증가, 루루–모카 관계 크게 개선 | 서로 다른 욕구의 공통점을 찾음 |
| 별빛 오락실 | 루루 행복 증가, 모카 행복·관계 감소 | 한 주민의 큰 목소리에 치우침 |
| 마을 잡화점 | 모두 조금 행복, 관계 변화 없음 | 생활은 편리하지만 본질은 그대로 |

## 실행 방법

### 공개 웹 빌드

위 GitHub Pages 링크를 브라우저에서 열면 설치 없이 바로 플레이할 수 있습니다. 서버 API가 없는 정적 호스팅에서는 검증된 fallback 대사로 전체 게임을 항상 완주할 수 있습니다.

### 로컬 안전 데모

```powershell
npm ci
npm run dev
```

표시된 Vite 주소를 브라우저에서 엽니다. 이 모드는 API 키 없이 fallback 경로를 사용합니다.

### Gemini 3.6 Flash 라이브 모드

API 키는 브라우저 번들에 넣지 않고 Node 서버 환경변수로만 제공합니다.

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

`.env`, 클라이언트 코드, GitHub Pages 빌드에는 키를 넣지 마세요. 채팅·메신저·공개 저장소에 노출된 키는 폐기하고 새 키로 교체해야 합니다.

## 핵심 구조

```text
VillageState (시설·행복도·관계·최근 사건)
            ↓
NPC별 Context Builder
            ↓
Persona + Relationship + Player Question
            ↓
Gemini 3.6 Flash → Structured JSON → 앱 검증
            ↓                              ↓ 실패
       주민 대화 UI                 검증된 fallback
            ↓
      플레이어의 시설 선택
            ↓
Deterministic State Reducer (AI는 결과를 바꾸지 않음)
            └──────────────→ 갱신된 VillageState
```

AI가 담당하는 것은 `dialogue`, `emotion`, `topic`의 표현뿐입니다. 시설 존재 여부, 행복도, 관계도, 실제 사건과 선택 결과는 [`src/game/engine.ts`](src/game/engine.ts)의 결정론적 규칙이 관리합니다.

### AI 안정성

- 주민에게 필요한 사실만 전달하는 NPC별 context
- 게임 데이터 밖의 시설·사건·과거 생성 금지 system instruction
- JSON Schema 기반 구조화 출력
- 서버측 길이·enum·숫자 노출 재검증
- 12초 timeout 및 클라이언트 13초 timeout
- 동일 상태·주민·질문 요청 캐시
- API 오류, quota, 네트워크 단절, 비정상 JSON 시 상태별 fallback
- AI 출력은 게임 상태를 수정할 권한이 없음

## 프로젝트 구조

```text
src/
  components/          코드로 그린 캐릭터·아이콘
  game/
    data.ts            주민·시설·fallback·단서 데이터
    engine.ts          결정론적 상태 변경 규칙
    engine.test.ts     상태 reducer 회귀 테스트
  services/            대화 API 클라이언트
  App.tsx              전체 플레이 흐름과 UI
server.mjs             서버 전용 Gemini 프록시·검증·정적 서버
scripts/               브라우저 완주·AI·제출물 검증
docs/source/           PDF 원본 HTML
docs/submission/       최종 제출 PDF
```

## 검증

```powershell
npm test
npm run build
node scripts/e2e-smoke.mjs
node scripts/ai-smoke.mjs   # GEMINI_API_KEY를 가진 로컬 AI 서버 필요
```

검증된 실제 사용자 경로:

```text
인트로 → 루루 대화 → 모카 대화 → 공원 선택
→ 모카 재대화 → 루루 재대화 → Before/After 결과
```

## 개발 및 AI 도구 사용

- **런타임 AI:** Google Gemini 3.6 Flash — World State 기반 NPC 대사·감정·주제 생성.
- **개발 보조 AI:** OpenAI Codex — 기획 검토, 코드 작성 보조, 테스트·문서·UI 검증. 모든 결과는 작성자가 직접 실행하고 검수했습니다.
- **그래픽:** 외부 이미지 에셋 없이 React·CSS·인라인 SVG로 직접 구성했습니다.
- **사운드:** 사용하지 않았습니다.
- **폰트:** 운영체제 기본 `Noto Sans KR`/`맑은 고딕` fallback만 사용하며 폰트 파일을 배포하지 않습니다.

자세한 버전·출처·라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.

## 참가 형태

개인 참가. 기획, 게임 시스템, 프론트엔드, AI 연동, UI, 테스트, 문서화를 참가자 1인이 담당했습니다.

## 라이선스

프로젝트 소스는 [MIT License](LICENSE)로 공개합니다. NAN 2026 제출 및 심사를 위한 실행·검토를 허용합니다.
