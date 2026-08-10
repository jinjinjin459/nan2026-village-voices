# Third-party notices

이 프로젝트는 외부 이미지·음악·효과음 파일을 포함하지 않습니다. 캐릭터, 마을, 건물, 아이콘은 React/CSS/인라인 SVG 코드로 제작했습니다.

## Runtime and build dependencies

| 이름 | 사용 버전 | 용도 | 라이선스 | 출처 |
| --- | --- | --- | --- | --- |
| React / React DOM | package-lock.json 참조 | UI 렌더링 | MIT | https://react.dev/ |
| Vite | package-lock.json 참조 | 개발 서버·웹 빌드 | MIT | https://vite.dev/ |
| TypeScript | package-lock.json 참조 | 정적 타입 | Apache-2.0 | https://www.typescriptlang.org/ |
| Vitest | package-lock.json 참조 | 상태 reducer 테스트 | MIT | https://vitest.dev/ |
| Playwright Core | package-lock.json 참조 | 실제 브라우저 완주 검증 | Apache-2.0 | https://playwright.dev/ |

각 패키지의 정확한 고정 버전과 transitive dependency는 `package-lock.json`에 기록되어 있습니다.

## AI services and tools

| 이름 | 활용 | 출처 |
| --- | --- | --- |
| Google Gemini 3.6 Flash | 런타임 NPC 대화·감정·주제 구조화 생성 | https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash |
| OpenAI Codex | 기획·구현·검증·문서화 보조 | https://developers.openai.com/codex/ |

Google Gemini는 프로젝트에 모델 가중치나 외부 콘텐츠를 포함하지 않으며 API 서비스로만 사용됩니다. AI 출력은 작성자가 설계한 schema, 검증기, fallback과 결정론적 게임 규칙 아래에서 사용됩니다.

## Fonts

웹 빌드는 폰트 파일을 포함하거나 재배포하지 않습니다. CSS font stack의 `Noto Sans KR`, `Noto Serif KR`, `Malgun Gothic`은 사용자의 운영체제에 설치된 경우에만 사용되며, 없으면 generic system font로 대체됩니다.

PDF에는 로컬 문서 렌더링 환경의 Noto Sans/Serif KR가 포함될 수 있습니다. Noto Fonts는 SIL Open Font License 1.1을 따릅니다: https://fonts.google.com/noto/specimen/Noto+Sans+KR/about

## Original work

게임명, 등장인물 설정, 대사 시나리오, UI 레이아웃, 코드 기반 벡터 캐릭터와 마을 그래픽은 이 제출 프로젝트를 위해 제작했습니다. AI 보조를 받은 부분도 참가자가 직접 선택·수정·실행·검증했습니다.
