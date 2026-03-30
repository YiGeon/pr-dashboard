# PR Dashboard — Web Migration Implementation Plan

## Step 1: SvelteKit 프로젝트 초기화
- [ ] SvelteKit, adapter-vercel 설치
- [ ] svelte.config.js, app.html 생성
- [ ] vite.config.ts를 SvelteKit용으로 교체
- [ ] Tauri npm 패키지 5개 제거

## Step 2: 디렉토리 재배치
- [ ] src/components/ → src/lib/components/
- [ ] src/lib/ 하위 (github, stores, types, utils, notifications) 유지
- [ ] src/App.svelte → src/routes/+page.svelte
- [ ] src/routes/+layout.svelte 생성 (CSS import)
- [ ] src/main.ts 삭제

## Step 3: Tauri 의존성 제거
- [ ] auth.ts: plugin-store → localStorage, listen("oauth-token") → URL 파라미터 기반
- [ ] settings.ts: plugin-store → localStorage
- [ ] prs.ts: invoke("update_tray_title") 제거
- [ ] notifications.ts: plugin-notification → Notification API
- [ ] PRCard.svelte: plugin-shell → window.open()
- [ ] Settings.svelte: invoke/shell 제거, 자동시작/트레이 설정 UI 제거

## Step 4: OAuth 서버 라우트
- [ ] src/routes/api/auth/login/+server.ts (GitHub redirect)
- [ ] src/routes/api/auth/callback/+server.ts (토큰 교환)
- [ ] Login.svelte에서 /api/auth/login으로 redirect

## Step 5: src-tauri 및 데스크톱 관련 파일 삭제
- [ ] src-tauri/ 전체 삭제
- [ ] .github/workflows/release.yml 삭제
- [ ] Tauri 관련 설정 파일 정리

## Step 6: 테스트 수정
- [ ] tests/setup.ts Tauri mock 제거
- [ ] notifications.test.ts Notification API mock으로 교체
- [ ] 전체 테스트 통과 확인

## Step 7: 문서 업데이트
- [ ] README.md 웹앱 기준으로 재작성
- [ ] CLAUDE.md 업데이트
- [ ] package.json scripts 정리

## Step 8: Vercel 배포
- [ ] Vercel 프로젝트 연결
- [ ] 환경변수 설정 (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
- [ ] 배포 확인
