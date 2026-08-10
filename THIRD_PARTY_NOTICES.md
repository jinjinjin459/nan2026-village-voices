# Third-party notices

이 문서는 `마을의 목소리 (Village Voices)`에 사용한 생성형 AI, 외부 서비스, 오픈소스, 폰트와 시각 에셋의 출처를 기록합니다.

## Visual assets

### AI-generated original 3D visual assets

| 파일 | 생성·검수 내역 | 출처 |
| --- | --- | --- |
| `src/assets/village-diorama-v2.png` | 2026-08-10 OpenAI image generation을 사용해 본 프로젝트 전용 3D 디오라마 마을 배경으로 생성. 참가자가 화면 구성, 플레이 영역의 여백, 캐릭터·UI 가독성, 독창성을 직접 검수한 뒤 크롭·배치 및 앱 통합 | [OpenAI image generation](https://openai.com/index/image-generation/) |
| `src/assets/residents/lulu-3d.webp` | 루루의 성격·의상·실루엣을 정의해 프로젝트 전용 토끼 주민 3D 렌더로 생성. 참가자가 배경 제거, edge 검수, WebP 최적화, 맵·대화 UI 통합 | [OpenAI image generation](https://openai.com/index/image-generation/) |
| `src/assets/residents/moka-3d.webp` | 모카의 성격·의상·실루엣을 정의해 프로젝트 전용 고양이 주민 3D 렌더로 생성. 참가자가 배경 제거, edge 검수, WebP 최적화, 맵·대화 UI 통합 | [OpenAI image generation](https://openai.com/index/image-generation/) |
| `src/assets/residents/dubu-3d.webp` | 두부의 성격·의상·실루엣을 정의해 프로젝트 전용 강아지 주민 3D 렌더로 생성. 참가자가 배경 제거, edge 검수, WebP 최적화, 맵·대화 UI 통합 | [OpenAI image generation](https://openai.com/index/image-generation/) |
| `src/assets/residents/player-3d.webp` | 프로젝트 전용 방문자 플레이어 3D 렌더로 생성. 참가자가 배경 제거, edge 검수, WebP 최적화, 이동 레이어 통합 | [OpenAI image generation](https://openai.com/index/image-generation/) |

- 해상도: 1672 × 941 PNG
- SHA-256: `38A515A7D5C7E95C17AFF1A17AE69C2CB9C9395E7CD8B571249DE22C22B9F0D7`
- 3D 캐릭터 WebP 해상도: 루루 1024 × 1536, 모카 1103 × 1426, 두부 1122 × 1402, 플레이어 1024 × 1536
- 3D 캐릭터 SHA-256: 루루 `C245334E69FCB25A85EE977E18DEB9634B417B18693C43AAFABBC3FFF0C150D8`, 모카 `14510860250FD10EF68A62F70F911016801E62EDFCA007B263748D9B766D6327`, 두부 `3974E1BB2824544C39D3522C6B941F824437EEB0825F07C3D0CF6466065660F7`, 플레이어 `10D7F01C3E7D9B1D86D1477D5D6A514DAEA365717043794C390BA829FCE35675`
- 외부 게임·캐릭터·브랜드 에셋을 포함하지 않는 프로젝트용 오리지널 시각 에셋으로 제작했습니다.
- 생성 결과를 그대로 자동 제출하지 않았으며, 참가자가 실제 UI에서 반복 검수하고 코드 기반 시설·표정 cue·인터랙션 레이어와 조합했습니다.

### Code-native graphics

시설, 아이콘, 말풍선, 캐릭터 그림자·호흡 애니메이션·감정 cue와 인터랙션 UI는 프로젝트 내부 React 컴포넌트, CSS, 인라인 SVG로 제작했습니다. 별도의 외부 캐릭터·아이콘 팩·음악·효과음을 사용하지 않았습니다.

## Runtime and build dependencies

| 이름 | 사용 버전 | 용도 | 라이선스 | 출처 |
| --- | --- | --- | --- | --- |
| React / React DOM | 19.2.8 | UI 상태·렌더링 | MIT | https://github.com/facebook/react |
| Vite | 8.2.1 | 개발 서버·웹 빌드 | MIT | https://github.com/vitejs/vite |
| TypeScript | 7.0.2 | 정적 타입 | Apache-2.0 | https://github.com/microsoft/TypeScript |
| Vitest | 4.1.10 | 상태 reducer 테스트 | MIT | https://github.com/vitest-dev/vitest |
| Playwright Core | 1.62.1 | 데스크톱·모바일 실제 브라우저 검증 | Apache-2.0 | https://github.com/microsoft/playwright |

각 패키지와 transitive dependency의 고정 버전·무결성·라이선스 표시는 `package-lock.json`에 기록되어 있습니다.

## AI services, development tools and hosting

| 이름 | 활용 | 출처 |
| --- | --- | --- |
| Google Gemma 4 26B A4B Instruct (`@cf/google/gemma-4-26b-a4b-it`) | Cloudflare Workers AI binding으로 날짜·시설·관계·행복·사건을 반영한 공개 런타임 NPC 대사, 감정, 주제의 구조화 생성 | https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/ |
| OpenAI Codex | 기획 검토, 구현 보조, 회귀 테스트, 문서 작성과 UI 검증. 모든 결과는 참가자가 직접 선택·수정·실행·검수 | https://developers.openai.com/codex/ |
| OpenAI image generation | 프로젝트 전용 3D 디오라마 배경과 주민 3명·플레이어 캐릭터 렌더 생성. 생성일 2026-08-10, 인간 검수·배경 제거·최적화·통합 | https://openai.com/index/image-generation/ |
| Cloudflare Workers / Workers AI | GitHub Pages의 대화 요청을 검증하고 AI binding으로 모델을 실행하는 edge runtime | https://developers.cloudflare.com/workers-ai/ |
| GitHub Pages | 정적 웹 빌드 및 소스 공개 | https://docs.github.com/pages |

공개 런타임의 Gemma 4는 Cloudflare Workers AI가 호스팅하는 26B Mixture-of-Experts 계열 A4B Instruct 모델이며, 모델 가중치를 저장소에 포함하지 않습니다. AI 대사는 작성자가 설계한 schema, 서버 검증, fallback과 결정론적 게임 규칙 아래에서만 사용됩니다. 모델 개요: https://ai.google.dev/gemma/docs/core

Cloudflare Worker는 `env.AI` binding을 사용하므로 공개 Worker나 브라우저에 Gemini API key를 넣지 않습니다. 제공받은 Gemini key는 `server.mjs` 로컬 개발 fallback에서 환경 변수로만 사용할 수 있으며 source·`[vars]`·클라이언트 번들에는 기록하지 않습니다. 관련 공식 지침: https://developers.cloudflare.com/workers-ai/configuration/bindings/

## Fonts

웹 빌드는 폰트 파일을 포함하거나 재배포하지 않습니다. CSS font stack의 `Noto Sans KR`, `Noto Serif KR`, `Malgun Gothic`은 사용자의 운영체제에 설치된 경우에만 사용되며, 없으면 generic system font로 대체됩니다.

PDF에는 문서 렌더링 환경의 Noto Sans/Serif KR가 포함될 수 있습니다. Noto Fonts는 SIL Open Font License 1.1을 따릅니다: https://fonts.google.com/noto/specimen/Noto+Sans+KR/about

## Original work and human responsibility

게임명, 등장인물 설정, 상태 모델, 시설 효과, fallback 대사, UI 레이아웃과 코드 기반 그래픽은 이 제출 프로젝트를 위해 제작했습니다. 생성형 AI가 보조한 코드·문서·이미지 역시 참가자가 최종 선택, 수정, 통합, 실행 및 검수했으며 제출물의 저작권·라이선스 준수 책임은 참가자에게 있습니다.
