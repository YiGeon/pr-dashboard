# CLAUDE.md

## Project Overview

PR Dashboard — Cross-organization GitHub PR 관리 데스크톱 앱 (Tauri v2 + Svelte 5).

## Commands

```bash
npm run tauri dev     # 개발 모드 (Vite HMR + Tauri)
npm run tauri build   # 프로덕션 빌드
npm test              # Vitest 전체 테스트
npm run check         # svelte-check 타입 검사
cd src-tauri && cargo check  # Rust 컴파일 검사
```

## Architecture

```
Svelte (WebView)                    Rust (Tauri Shell)
┌─────────────────────┐             ┌──────────────────────┐
│ Octokit → Stores    │  invoke()   │ OAuth 인증 윈도우     │
│ UI Components       │ ──────────► │ 시스템 트레이/메뉴바   │
│ Polling (setInterval)│  emit()    │ 네이티브 알림          │
│ Filter/Sort/Search  │ ◄────────── │ 자동 시작             │
└─────────────────────┘             └──────────────────────┘
```

- **Svelte (WebView)**: GitHub GraphQL API 호출 (octokit), 상태 관리 (Svelte stores), UI, 폴링
- **Rust (Tauri)**: OAuth 인증, 시스템 트레이/macOS 메뉴바, 네이티브 알림, 자동시작
- 데이터 영속: `tauri-plugin-store` (settings.json)
- PR 데이터는 메모리에만 유지 (앱 재시작 시 새로 fetch)

## Code Conventions

- Svelte 5 runes 문법 사용 (`$state`, `$derived`, `$props`, `$bindable`)
- 컴포넌트 props는 `$props()`, 양방향 바인딩은 `$bindable()`
- 이벤트 핸들러는 `onclick` (Svelte 5 방식), `on:click` 아님
- GitHub API 응답의 상태값은 대문자 (`APPROVED`), 내부 타입은 소문자 (`approved`)
- `queries.ts`의 파서 함수가 대문자→소문자 변환 담당

## Key Files

- `src/lib/types.ts` — 모든 공유 타입 (MyPR, ReviewRequestedPR, Settings 등)
- `src/lib/github/queries.ts` — GraphQL 쿼리 + 응답 파서
- `src/lib/stores/prs.ts` — PR 데이터 store, 폴링, derived 필터, 트레이 뱃지
- `src/lib/notifications.ts` — 이전/현재 데이터 diff → 알림 트리거
- `src-tauri/src/auth.rs` — OAuth: 로컬 TCP 서버로 callback 수신 → token 교환
- `src-tauri/src/tray.rs` — 시스템 트레이 메뉴 + macOS 메뉴바 + 뱃지

## Project Structure

```
pr-dashboard/
├── src/                        # Svelte 프론트엔드
│   ├── components/             # UI 컴포넌트
│   │   ├── Dashboard.svelte    #   메인 대시보드 (탭 + 필터 + 리스트)
│   │   ├── FilterBar.svelte    #   Org 필터, 정렬, 검색
│   │   ├── Login.svelte        #   GitHub 로그인 화면
│   │   ├── PRCard.svelte       #   PR 카드 (상태바 + 리뷰어)
│   │   ├── PRList.svelte       #   PR 카드 리스트
│   │   ├── Settings.svelte     #   설정 화면
│   │   └── TabBar.svelte       #   내 PR / 리뷰 요청 탭
│   ├── lib/
│   │   ├── github/
│   │   │   ├── client.ts       #   Octokit GraphQL 클라이언트
│   │   │   └── queries.ts      #   GraphQL 쿼리 + 응답 파서
│   │   ├── stores/
│   │   │   ├── auth.ts         #   인증 상태 (token, username)
│   │   │   ├── filters.ts      #   필터/정렬/검색 상태 + 로직
│   │   │   ├── prs.ts          #   PR 데이터 + 폴링 + 트레이 뱃지
│   │   │   └── settings.ts     #   설정 영속 저장
│   │   ├── notifications.ts    #   알림 diff 감지 + 발송
│   │   ├── types.ts            #   공유 TypeScript 타입
│   │   └── utils.ts            #   유틸 함수 (상대시간, 리뷰상태 등)
│   ├── App.svelte              # 루트 컴포넌트 (인증 분기)
│   ├── app.css                 # 글로벌 스타일
│   └── main.ts                 # 엔트리
├── src-tauri/                  # Tauri Rust 백엔드
│   ├── src/
│   │   ├── auth.rs             #   OAuth 플로우 (로컬 서버 callback)
│   │   ├── tray.rs             #   시스템 트레이 / macOS 메뉴바
│   │   ├── lib.rs              #   Tauri 앱 설정 및 플러그인 등록
│   │   └── main.rs             #   엔트리
│   ├── build.rs                #   .env → 컴파일타임 환경변수 주입
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/                      # Vitest 테스트
│   ├── lib/
│   │   ├── github/queries.test.ts
│   │   ├── stores/filters.test.ts
│   │   ├── notifications.test.ts
│   │   └── utils.test.ts
│   ├── setup.ts                # Tauri API mock
│   └── smoke.test.ts
├── .github/workflows/
│   └── release.yml             # CI/CD 릴리즈 워크플로우
└── docs/superpowers/           # 설계 문서 (스펙 + 구현 계획)
```

## Testing

- Vitest + jsdom 환경
- `tests/setup.ts`에서 Tauri API를 mock (invoke, store, shell, notification)
- 테스트 대상: 유틸 함수, GraphQL 파서, 필터/정렬 로직, 알림 diff 로직
- Svelte 컴포넌트 테스트는 아직 없음 (순수 로직 중심 테스트)

## Development Setup

### OAuth

`.env` 파일에 `GITHUB_CLIENT_ID`와 `GITHUB_CLIENT_SECRET`을 설정해야 앱이 동작함.
`build.rs`가 빌드 시 `.env`를 읽어 `env!()` 매크로로 컴파일 타임에 주입.

```bash
cp .env.example .env
# .env 파일에 GitHub OAuth App의 Client ID / Secret 입력
```

### 사전 요구사항

- Node.js v18+
- Rust (stable)
- Tauri 시스템 의존성: https://v2.tauri.app/start/prerequisites/

## Release

- GitHub Actions 워크플로우: `.github/workflows/release.yml`
- `git tag v*` 푸시 시 자동 빌드 (macOS ARM/Intel, Windows, Linux)
- `tauri-apps/tauri-action`으로 Draft Release 생성
- GitHub Secrets 필요: `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`
- Rust 의존성 캐시 적용 (`actions/cache`로 `~/.cargo` + `src-tauri/target` 캐시)
- macOS ad-hoc 서명: `APPLE_SIGNING_IDENTITY="-"` (tauri-action env로 직접 전달)
- 릴리즈 플로우: `git tag vX.Y.Z && git push origin vX.Y.Z` → Actions 자동 빌드 → Draft Release → Publish

## Known Gotchas

- octokit/graphql에서 `query`는 예약어 — GraphQL 변수명으로 사용 불가. `$searchQuery`로 사용 중
- GitHub GraphQL search에서 `author:@me`는 동작하지 않음 — 실제 username으로 치환 필요
- `include_bytes!`로 포함된 트레이 아이콘은 Rust 재컴파일 필요 (HMR 미반영)
- macOS 코드 서명 없이 배포 시 Gatekeeper "손상됨" 경고 → ad-hoc 서명(`-`)으로 완화
