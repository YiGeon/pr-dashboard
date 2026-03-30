# CLAUDE.md

## Project Overview

PR Dashboard — Cross-organization GitHub PR 관리 웹앱 (SvelteKit + Svelte 5, Vercel 배포).

## Commands

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm test          # Vitest 전체 테스트
npm run check     # svelte-check 타입 검사
```

## Architecture

```
SvelteKit on Vercel
┌──────────────────────────────┐
│  Client (Browser)            │
│  ┌────────────────────────┐  │
│  │ Octokit GraphQL        │  │
│  │ Svelte Stores          │  │
│  │ UI Components          │  │
│  │ Polling (setInterval)  │  │
│  │ Notification API       │  │
│  │ localStorage           │  │
│  └────────────┬───────────┘  │
│               │ fetch()      │
│  ┌────────────▼───────────┐  │
│  │ Server Routes          │  │
│  │  /api/auth/login       │  │
│  │  /api/auth/callback    │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

- **Client**: GitHub GraphQL API 호출 (octokit), 상태 관리 (Svelte stores), UI, 폴링
- **Server Routes**: OAuth 토큰 교환만 처리 (client_secret 서버 전용)
- 데이터 영속: `localStorage` (settings, token)
- PR 데이터는 메모리에만 유지 (새로고침 시 새로 fetch)

## Code Conventions

- Svelte 5 runes 문법 사용 (`$state`, `$derived`, `$props`, `$bindable`)
- 컴포넌트 props는 `$props()`, 양방향 바인딩은 `$bindable()`
- 이벤트 핸들러는 `onclick` (Svelte 5 방식), `on:click` 아님
- GitHub API 응답의 상태값은 대문자 (`APPROVED`), 내부 타입은 소문자 (`approved`)
- `queries.ts`의 파서 함수가 대문자→소문자 변환 담당
- import 경로는 `$lib/` alias 사용

## Key Files

- `src/lib/types.ts` — 모든 공유 타입 (MyPR, ReviewRequestedPR, Settings 등)
- `src/lib/github/queries.ts` — GraphQL 쿼리 + 응답 파서
- `src/lib/stores/prs.ts` — PR 데이터 store, 폴링, derived 필터
- `src/lib/notifications.ts` — 이전/현재 데이터 diff → 브라우저 알림 트리거
- `src/routes/api/auth/login/+server.ts` — GitHub OAuth redirect
- `src/routes/api/auth/callback/+server.ts` — OAuth 토큰 교환

## Project Structure

```
pr-dashboard/
├── src/
│   ├── routes/
│   │   ├── +page.svelte            # 메인 페이지 (인증 분기 + OAuth callback 처리)
│   │   ├── +layout.svelte          # 전역 레이아웃 + CSS
│   │   └── api/auth/
│   │       ├── login/+server.ts    #   GitHub OAuth redirect
│   │       └── callback/+server.ts #   토큰 교환
│   ├── lib/
│   │   ├── components/             # UI 컴포넌트
│   │   │   ├── Dashboard.svelte    #   메인 대시보드 (탭 + 필터 + 리스트)
│   │   │   ├── FilterBar.svelte    #   Org 필터, 정렬, 검색
│   │   │   ├── Login.svelte        #   GitHub 로그인 화면
│   │   │   ├── PRCard.svelte       #   PR 카드 (상태바 + 리뷰어)
│   │   │   ├── PRList.svelte       #   PR 카드 리스트
│   │   │   ├── Settings.svelte     #   설정 화면
│   │   │   └── TabBar.svelte       #   내 PR / 리뷰 요청 탭
│   │   ├── github/
│   │   │   ├── client.ts           #   Octokit GraphQL 클라이언트
│   │   │   └── queries.ts          #   GraphQL 쿼리 + 응답 파서
│   │   ├── stores/
│   │   │   ├── auth.ts             #   인증 상태 (token, localStorage)
│   │   │   ├── filters.ts          #   필터/정렬/검색 상태 + 로직
│   │   │   ├── prs.ts              #   PR 데이터 + 폴링
│   │   │   └── settings.ts         #   설정 영속 저장 (localStorage)
│   │   ├── notifications.ts        #   알림 diff 감지 + Notification API
│   │   ├── types.ts                #   공유 TypeScript 타입
│   │   └── utils.ts                #   유틸 함수 (상대시간, 리뷰상태 등)
│   ├── app.css                     # 글로벌 스타일
│   └── app.html                    # HTML 템플릿
├── tests/                          # Vitest 테스트
│   ├── lib/
│   │   ├── github/queries.test.ts
│   │   ├── stores/filters.test.ts
│   │   ├── notifications.test.ts
│   │   └── utils.test.ts
│   ├── setup.ts                    # 브라우저 API mock (localStorage, Notification)
│   └── smoke.test.ts
├── svelte.config.js                # SvelteKit + Vercel adapter
├── vite.config.ts
└── package.json
```

## Testing

- Vitest + jsdom 환경
- `tests/setup.ts`에서 브라우저 API mock (localStorage, Notification)
- 테스트 대상: 유틸 함수, GraphQL 파서, 필터/정렬 로직, 알림 diff 로직
- Svelte 컴포넌트 테스트는 아직 없음 (순수 로직 중심 테스트)

## Development Setup

### OAuth

GitHub OAuth App의 callback URL을 배포 도메인의 `/api/auth/callback`으로 설정.
환경변수 (Vercel 또는 `.env`):

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### 사전 요구사항

- Node.js v18+

## Deploy

- Vercel에 연결하여 자동 배포
- 환경변수: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## Known Gotchas

- octokit/graphql에서 `query`는 예약어 — GraphQL 변수명으로 사용 불가. `$searchQuery`로 사용 중
- GitHub GraphQL search에서 `author:@me`는 동작하지 않음 — 실제 username으로 치환 필요
