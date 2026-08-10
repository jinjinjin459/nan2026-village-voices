/**
 * 이전 실행 명령과의 호환성을 유지하는 최신 sandbox E2E 진입점입니다.
 * 실제 시나리오는 data-testid 기반 scripts/sandbox-e2e.mjs 한 곳에서 관리합니다.
 */
if (process.env.E2E_BASE_URL && !process.env.SANDBOX_BASE_URL) {
  process.env.SANDBOX_BASE_URL = process.env.E2E_BASE_URL;
}

await import("./sandbox-e2e.mjs");
