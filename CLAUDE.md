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

- `src/lib/types.ts` — 공유 타입 (MyPR, ReviewRequestedPR, Label, MergeableState, Settings 등)
- `src/lib/github/queries.ts` — GraphQL 쿼리 + 응답 파서 (mergeable, labels, threads, diff 포함)
- `src/lib/stores/prs.ts` — PR 데이터 store, 폴링, derived 필터 (urgentMyPRCount, lastUpdateCount)
- `src/lib/stores/filters.ts` — 필터/정렬/검색/탭/포커스/그룹핑 상태 (groupByRepo는 localStorage 영속)
- `src/lib/utils.ts` — 유틸 함수 (relativeTime, formatDate, labelTextColor, STATUS_COLORS/ICONS/LABELS, formatNotificationBody, hashString, entityBadgeStyle)
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
│   │   │   ├── Dashboard.svelte    #   메인 대시보드 (탭 + 필터 + 리스트 + 키보드 단축키 + 단축키 모달)
│   │   │   ├── FilterBar.svelte    #   Org 필터, 정렬, 검색, 그룹핑 토글
│   │   │   ├── Login.svelte        #   GitHub 로그인 화면
│   │   │   ├── PRCard.svelte       #   PR 카드 (클릭→GitHub + ▸확장/프리뷰 + entity 컬러 뱃지)
│   │   │   ├── PRList.svelte       #   PR 카드 리스트 (스켈레톤 + 빈 상태 + 레포별 그룹핑)
│   │   │   ├── Settings.svelte     #   설정 화면
│   │   │   └── TabBar.svelte       #   리뷰 요청 / 내 PR 탭 (긴급 뱃지)
│   │   ├── github/
│   │   │   ├── client.ts           #   Octokit GraphQL 클라이언트
│   │   │   └── queries.ts          #   GraphQL 쿼리 + 응답 파서 + PR 상세 조회
│   │   ├── stores/
│   │   │   ├── auth.ts             #   인증 상태 (token, localStorage)
│   │   │   ├── filters.ts          #   필터/정렬/검색/탭/포커스/그룹핑 + 로직
│   │   │   ├── prs.ts              #   PR 데이터 + 폴링 + derived (urgent, updateCount)
│   │   │   └── settings.ts         #   설정 영속 저장 (localStorage)
│   │   ├── notifications.ts        #   알림 diff 감지 + Notification API
│   │   ├── types.ts                #   공유 TypeScript 타입
│   │   └── utils.ts                #   유틸 함수 (상대시간, 날짜포맷, 라벨색상, STATUS 상수, entity 컬러 뱃지 등)
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

## Keyboard Shortcuts

| 키 | 동작 |
|---|---|
| `↑` / `↓` | PR 카드 이동 |
| `Enter` | PR 열기 |
| `r` | 새로고침 |
| `1` | Review Requests 탭 |
| `2` | My PRs 탭 |
| `3` | Approved 탭 |
| `/` | 검색 포커스 |
| `Esc` | 닫기 / 포커스 해제 |
| `?` | 단축키 도움말 (우하단 플로팅 버튼으로도 접근 가능) |

## Known Gotchas

- octokit/graphql에서 `query`는 예약어 — GraphQL 변수명으로 사용 불가. `$searchQuery`로 사용 중
- GitHub GraphQL search에서 `author:@me`는 동작하지 않음 — 실제 username으로 치환 필요
- `review-requested:` 검색에 잡힌 PR은 이전 리뷰와 무관하게 항상 `myReviewStatus: "pending"` — 리뷰 재요청된 것이므로. `previousReviewStatus`로 이전 리뷰 상태 참고 표시
- `mergeable` 필드는 GitHub 서버 계산에 시간이 걸려 `UNKNOWN` 응답 가능 — UI에서 "Checking..." 처리
- 기본 탭은 Review Requests (1번 탭), My PRs는 2번 탭
- 기본 폴링 주기는 1분 (설정에서 변경 가능)
- `relativeTime`은 1분 미만 초단위(`30s ago`), 이후 분/시/일 단위 표시
- Dashboard의 `tick` state가 1초마다 증가하여 `$derived`로 `relativeTime` 재계산 — `@const`는 반응성이 없으므로 사용 금지
- 숫자 표시 UI에는 `font-variant-numeric: tabular-nums` + 고정 너비로 레이아웃 흔들림 방지
- 키보드 단축키 핸들러는 `metaKey/ctrlKey/altKey` 누른 경우 early return — 브라우저 기본 단축키(Cmd+R, Cmd+1 등)와 충돌 방지
- PR 카드는 `flex-shrink: 0`으로 크기 고정, 리스트는 `min-height: 0`으로 overflow 스크롤 활성화
- 레포지토리명/작성자명은 `entityBadgeStyle`로 해시 기반 24색 컬러 뱃지 표시 — `hashString` (djb2)으로 문자열→팔레트 인덱스 결정, 같은 문자열은 항상 같은 색상
- PR 카드 클릭 시 GitHub PR 페이지로 이동 — ▸ 버튼(SVG chevron, 90도 회전 애니메이션)으로 확장/축소 토글. 확장 시 커밋/코멘트 on-demand fetch (`PR_DETAIL_QUERY`)
- 레포별 그룹핑 모드는 `localStorage`에 저장되어 다음 방문 시 유지 (키: `pr-group-by-repo`)
- 레포별 그룹핑 모드에서도 키보드 포커스 인덱스는 플랫 기준 유지
