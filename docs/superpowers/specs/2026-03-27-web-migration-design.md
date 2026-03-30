# PR Dashboard — Web Migration Design Spec

Tauri v2 데스크톱 앱을 SvelteKit 웹앱으로 전환한다. macOS 코드 서명 없이도 사용자가 별도 설치 없이 브라우저에서 바로 사용할 수 있도록 한다.

## 결정 사항

| 항목 | 결정 |
|---|---|
| 프레임워크 | SvelteKit (Svelte 5) |
| OAuth 처리 | SvelteKit 서버 라우트 |
| 배포 | Vercel (기본 도메인) |
| 데스크톱 앱 | 완전 교체 (Tauri 코드 제거) |
| 시스템 트레이/자동시작 | 제거 (대체 없음) |
| 알림 | Browser Notification API |
| 데이터 저장 | localStorage |

## 아키텍처

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

## OAuth 플로우

1. 사용자가 "Login" 클릭
2. 클라이언트가 `/api/auth/login`으로 redirect
3. 서버가 GitHub `/login/oauth/authorize`로 redirect (client_id + redirect_uri)
4. GitHub 인증 후 `/api/auth/callback?code=xxx`로 redirect
5. 서버가 `code` + `client_secret`으로 `access_token` 교환
6. 토큰을 쿼리 파라미터로 클라이언트에 전달, 클라이언트가 localStorage에 저장
7. 클라이언트에서 Octokit 초기화

환경변수 (Vercel):
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## Tauri → 웹 교체 매핑

| Tauri 기능 | 웹 대체 | 대상 파일 |
|---|---|---|
| `@tauri-apps/api/core` invoke/listen | SvelteKit 서버 라우트 | auth.ts |
| `@tauri-apps/plugin-store` | localStorage | auth.ts, settings.ts |
| `@tauri-apps/plugin-notification` | Notification API | notifications.ts |
| `@tauri-apps/plugin-shell` open() | window.open() | PRCard.svelte, Settings.svelte |
| 시스템 트레이 / 뱃지 | 제거 | prs.ts |
| 자동 시작 / 트레이 최소화 | 제거 | Settings.svelte |

## 디렉토리 구조

```
pr-dashboard/
├── src/
│   ├── routes/
│   │   ├── +page.svelte            # 메인 페이지 (기존 App.svelte 역할)
│   │   ├── +layout.svelte          # 전역 레이아웃 + CSS import
│   │   └── api/auth/
│   │       ├── login/+server.ts    # GitHub OAuth redirect
│   │       └── callback/+server.ts # 토큰 교환
│   ├── lib/
│   │   ├── components/             # 기존 src/components/ 이동
│   │   │   ├── Dashboard.svelte
│   │   │   ├── FilterBar.svelte
│   │   │   ├── Login.svelte
│   │   │   ├── PRCard.svelte
│   │   │   ├── PRList.svelte
│   │   │   ├── Settings.svelte
│   │   │   └── TabBar.svelte
│   │   ├── github/
│   │   │   ├── client.ts           # 변경 없음
│   │   │   └── queries.ts          # 변경 없음
│   │   ├── stores/
│   │   │   ├── auth.ts             # localStorage + 일반 OAuth
│   │   │   ├── filters.ts          # 변경 없음
│   │   │   ├── prs.ts              # 트레이 관련 코드 제거
│   │   │   └── settings.ts         # localStorage
│   │   ├── notifications.ts        # Notification API
│   │   ├── types.ts                # 변경 없음
│   │   └── utils.ts                # 변경 없음
│   └── app.css                     # 글로벌 스타일
├── static/                         # 파비콘 등
├── svelte.config.js                # Vercel adapter
├── vite.config.ts
├── package.json
└── tests/                          # Vitest 테스트
```

## 삭제 대상

- `src-tauri/` 전체
- `.github/workflows/release.yml`
- Tauri 관련 npm 패키지 5개 (`@tauri-apps/*`)
- `src/main.ts` (SvelteKit 엔트리로 대체)
- README의 데스크톱 설치 안내, Homebrew 섹션

## 테스트

- 기존 Vitest 테스트 유지 (queries, filters, notifications, utils)
- `tests/setup.ts`의 Tauri mock 제거
- `notifications.test.ts`를 Notification API mock으로 교체
