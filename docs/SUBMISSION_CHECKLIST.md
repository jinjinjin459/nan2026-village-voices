# NAN 2026 제출 체크리스트

마감: 2026-08-10 23:00 KST

## 필수 제출

- [x] 웹 플레이 빌드: https://jinjinjin459.github.io/nan2026-village-voices/
- [x] 전체 소스: https://github.com/jinjinjin459/nan2026-village-voices
- [x] 40.00초 실제 플레이 영상 원본: `docs/submission/Village_Voices_40s_Gameplay.webm`
- [x] 게임 소개 및 설명 PDF 원본: `docs/source/game-introduction.html`
- [x] AI 활용 기술 PDF 원본: `docs/source/ai-technical.html`
- [x] 자유 진행형 설명과 최종 캡처를 반영한 PDF 3종 재출력·교체
- [x] 팀원 롤 기술서: 개인 참가이므로 생략
- [x] 제출 UI가 파일을 강제할 때 사용할 개인 참가 확인 원본·PDF 준비

## 구현·자동 검증

- [x] `npm run check`: 상태 테스트와 production build
- [x] 자유 진행 sandbox: 키보드 이동, 순서 없는 반복 대화
- [x] 1일 차 공원 → 다음 날 → 2일 차 오락실 누적 건설
- [x] `localStorage` 날짜·시설·플레이어 위치 저장/복원
- [x] 390×844 touch 이동·NPC 탭 모바일 smoke
- [x] sandbox/mobile 경로 콘솔·페이지 오류 0건
- [x] 시설 3개 전 순서 누적, 범위 clamp, 이전 save hydration 단위 테스트
- [x] API 미연결·오류 시 fallback 전체 진행

## AI 배포

- [x] Cloudflare Worker + Workers AI binding 코드와 `wrangler.jsonc` 준비
- [x] GitHub Pages origin allowlist, payload 재검증, CORS, timeout, cache, 요청 제한 구현
- [x] Worker 계정에 Workers AI binding 활성화
- [x] Worker 실제 배포 및 health/dialogue smoke
- [x] Pages build의 `VITE_API_BASE_URL`을 공개 Worker에 연결
- [x] 라이브 AI 실패 시 안전 대사로 전체 진행되는 경로 확인

> 공개 Worker: `https://nan2026-village-voices-api.wlsalswo14.workers.dev`

## 제출 직전 수동 확인

- [x] 새 브라우저 context에서 웹 링크 열기
- [x] `WASD`·방향키 및 마을 빈 곳 클릭 이동
- [x] 모카 → 루루 → 모카처럼 자유 순서·반복 대화
- [x] 서로 다른 날 시설 2개 이상 누적 후 새로고침 복원
- [ ] 모바일 실제 기기에서 이동 패드·배경 탭·NPC 탭 확인
- [x] 공개 링크에서 AI badge·Gemma 실응답 확인
- [ ] YouTube 영상을 공개 또는 일부 공개로 설정
- [ ] 제출 폼에 실제 YouTube 링크 입력
- [x] 게임 소개·AI 기술 PDF의 페이지 수, 하단 겹침, 링크, 한글 폰트 확인
- [x] GitHub 저장소 public 및 Pages 접근 확인
- [ ] 제출 폼 5개 항목과 개인 참가 예외 확인
- [ ] 공개된 API 키 폐기·회전 및 사용량 확인
- [x] 저장소·빌드·PDF에서 실제 key 패턴, 로컬 경로, 미완성 문구 0건 최종 확인
