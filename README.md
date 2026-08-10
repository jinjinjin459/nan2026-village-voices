# 마을의 목소리 · 픽셀 빌리지

직접 돌아다니고, 주민과 자유롭게 대화하고, 낚시와 벌목으로 마을을 가꾸는 픽셀 생활 게임입니다.

## 지금 할 수 있는 것

- `WASD` 또는 방향키로 확장된 마을과 서쪽 낚시터 탐험
- 루루·모카·두부의 자율 이동, 일정, 주민 간 대화
- 주민에게 자유 문장으로 말 걸기, 관계와 대화 기억 저장
- “낚시 축제를 열자” 같은 제안으로 실제 마을 목표 생성
- 나무 앞에서 `E`를 세 번 눌러 벌목하고 목재 획득
- 가꾸기 도구로 길·꽃·어린나무·벤치·가로등·연못 배치
- 서쪽 다리를 건너 부두에서 낚시
- 집에 들어가 침대에서 자고 다음 날 시작
- 낮과 밤이 실제 5분마다 전환되며 밤에는 집·가로등·모닥불이 주변을 밝힘
- 모든 진행 상황을 브라우저 `localStorage`에 자동 저장

## AI 주민

서버 AI 어댑터는 OpenAI Responses API의 `gpt-5.6-luna`와 `reasoning.effort: low`를 사용합니다. 모델 응답은 구조화된 JSON으로 제한하고, 게임 규칙이 기억·관계·이벤트 조건을 검증한 뒤 상태에 반영합니다.

API 키가 없거나 서버가 응답하지 않으면 게임을 멈추지 않고 같은 이벤트 규칙을 사용하는 로컬 마을 두뇌로 자동 전환합니다. 따라서 GitHub Pages에서도 플레이할 수 있지만, Pages 정적 배포만으로는 라이브 Luna 호출을 사용할 수 없습니다.

키는 브라우저 코드나 GitHub 저장소에 넣지 말고 Node 서버의 환경 변수로만 설정해야 합니다.

```powershell
$env:OPENAI_API_KEY='서버 전용 OpenAI API 키'
npm run dev:ai
```

## 로컬 실행

```powershell
npm ci
npm run dev
```

AI 서버와 함께 실행:

```powershell
$env:OPENAI_API_KEY='서버 전용 OpenAI API 키' # 선택 사항
npm run dev:ai
```

프로덕션 실행:

```powershell
npm run build
$env:OPENAI_API_KEY='서버 전용 OpenAI API 키' # 선택 사항
npm start
```

## 조작

| 행동 | 조작 |
| --- | --- |
| 이동 | `WASD`, 방향키, 모바일 화면 패드 |
| 대화·입장·낚시·벌목 | 가까이에서 `E` 또는 화면의 상호작용 버튼 |
| 마을 가꾸기 | `B` 또는 우하단 `마을 가꾸기` |
| 패널 닫기 | `Esc` |

낚시는 부두의 낚시 표지 근처에서 `E`를 누르고, 입질이 왔을 때 다시 `E`를 누르면 됩니다.

## 저장과 검증

현재 저장 키는 `village-voices-pixel-v3`입니다. 이전 픽셀 저장 데이터는 처음 실행할 때 자동으로 변환됩니다.

```powershell
npm run check
npm run dev:ai
npm run test:e2e
```

자동 검증은 자유 대화→마을 이벤트→벌목→서쪽 부두 이동→낚시→밤 조명→집 입장→수면까지 한 번에 확인합니다.

## 링크

- [GitHub 저장소](https://github.com/jinjinjin459/nan2026-village-voices)
- [GitHub Pages 플레이](https://jinjinjin459.github.io/nan2026-village-voices/)

MIT License
