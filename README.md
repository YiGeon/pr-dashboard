# PR Dashboard

Cross-organization GitHub PR 관리를 위한 데스크톱 대시보드 앱.
내가 작성한 PR의 리뷰 상태와, 나에게 리뷰 요청된 PR의 처리 현황을 한 곳에서 관리한다.

## 기능

- **내 PR 관리** — 작성한 PR의 리뷰 상태를 한눈에 확인 (리뷰어별 승인/변경요청/코멘트/대기)
- **리뷰 요청 관리** — 나에게 온 리뷰 요청의 처리 현황 확인
- **Organization 필터** — 여러 org에 걸친 PR을 org별로 필터링, 복수 선택 가능
- **정렬 & 검색** — 업데이트순, 생성일순, 리뷰 상태순 정렬 + PR 제목 검색
- **네이티브 알림** — 새 리뷰, 새 리뷰 요청 시 OS 네이티브 알림
- **macOS 메뉴바** — 상단 메뉴바에 아이콘 상주, 미처리 건수 표시
- **시스템 트레이** — 앱 닫기 시 트레이로 최소화, 백그라운드 폴링 유지

## 기술 스택

| 항목 | 기술 |
|---|---|
| 앱 프레임워크 | [Tauri v2](https://v2.tauri.app/) |
| 프론트엔드 | [Svelte 5](https://svelte.dev/) + TypeScript |
| GitHub API | GraphQL via [@octokit/graphql](https://github.com/octokit/graphql.js) |
| 인증 | GitHub OAuth App |
| 테스트 | [Vitest](https://vitest.dev/) |

## 사전 요구사항

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri 시스템 의존성: [플랫폼별 가이드](https://v2.tauri.app/start/prerequisites/)

## 설치

```bash
git clone <repo-url>
cd pr-dashboard
npm install
```

## GitHub OAuth App 설정

앱을 실행하기 전에 GitHub OAuth App을 생성해야 한다.

1. [GitHub Developer Settings](https://github.com/settings/developers) → **New OAuth App**
2. 설정:
   - **Application name**: PR Dashboard
   - **Homepage URL**: `http://localhost`
   - **Authorization callback URL**: `http://localhost/callback`
3. 생성 후 **Client ID**와 **Client Secret**을 복사
4. 프로젝트 루트에 `.env` 파일 생성:

```bash
cp .env.example .env
```

5. `.env` 파일에 값 입력:

```
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

> `.env` 파일은 `.gitignore`에 포함되어 있어 코드에 시크릿이 노출되지 않는다. 빌드 시 `build.rs`가 `.env`를 읽어 컴파일 타임에 주입한다.

## 실행

### 개발 모드

```bash
npm run tauri dev
```

Vite HMR이 활성화되어 프론트엔드 코드 변경 시 자동 반영된다.

### 프로덕션 빌드

```bash
npm run tauri build
```

플랫폼별 설치 파일이 `src-tauri/target/release/bundle/`에 생성된다.

## 릴리즈

GitHub Actions를 통해 자동으로 크로스플랫폼 빌드 및 릴리즈가 진행된다.

### 사전 설정 (최초 1회)

GitHub 레포에 시크릿을 등록해야 한다:

```bash
gh secret set OAUTH_CLIENT_ID --body "your_client_id"
gh secret set OAUTH_CLIENT_SECRET --body "your_client_secret"
```

### 릴리즈 생성

```bash
# 버전 태그 생성 및 푸시
git tag v0.1.0
git push origin v0.1.0
```

태그 푸시 시 GitHub Actions가 자동으로:
1. macOS (Apple Silicon + Intel), Windows, Linux 빌드
2. Draft Release 생성 + 설치 파일 첨부
3. GitHub Releases 페이지에서 Draft 확인 → **Publish** 클릭으로 공개

### 빌드 산출물

| 플랫폼 | 파일 |
|---|---|
| macOS (Apple Silicon) | `.dmg` (aarch64) |
| macOS (Intel) | `.dmg` (x86_64) |
| Windows | `.msi`, `.exe` |
| Linux | `.deb`, `.AppImage` |

### macOS 실행 시 주의사항

Apple Developer 계정으로 정식 서명/공증되지 않은 앱이므로 macOS Gatekeeper 경고가 발생한다.
(ad-hoc 서명이 적용되어 있어 "손상됨"이 아닌 "확인되지 않은 개발자" 경고가 표시됨)

**실행 방법:**
1. dmg에서 앱을 Applications로 드래그
2. **우클릭 > 열기** (일반 더블클릭이 아닌 우클릭)
3. "확인되지 않은 개발자" 경고에서 **열기** 클릭
4. 이후부터는 정상 실행됨

또는 터미널에서:
```bash
xattr -cr /Applications/PR\ Dashboard.app
```

### CI/CD 파이프라인

- `.github/workflows/release.yml`에서 워크플로우 관리
- Rust 의존성 캐시 적용 (첫 빌드 ~10분, 이후 ~3~4분)
- macOS 빌드 시 ad-hoc 서명 자동 적용 (`APPLE_SIGNING_IDENTITY="-"`)

## 테스트

```bash
# 전체 테스트 실행
npm test

# Svelte 타입 체크
npm run check
```

## 프로젝트 구조

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
│   │   │   ├── prs.ts          #   PR 데이터 + 폴링
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
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/                      # Vitest 테스트
│   ├── lib/
│   │   ├── github/
│   │   │   └── queries.test.ts
│   │   ├── stores/
│   │   │   └── filters.test.ts
│   │   ├── notifications.test.ts
│   │   └── utils.test.ts
│   ├── setup.ts                # Tauri API mock
│   └── smoke.test.ts
└── docs/                       # 설계 문서
    └── superpowers/
        ├── specs/              # 디자인 스펙
        └── plans/              # 구현 계획
```

## 설정

앱 내 설정 (⚙️ 버튼)에서 변경 가능:

| 항목 | 기본값 |
|---|---|
| 폴링 주기 | 5분 |
| 새 리뷰 알림 | ON |
| 새 리뷰 요청 알림 | ON |
| 시작 시 자동 실행 | OFF |
| 닫기 시 동작 | 트레이 최소화 |
| 트레이 건수 표시 | ON |

## 아키텍처

```
Svelte (WebView)                    Rust (Tauri Shell)
┌─────────────────────┐             ┌──────────────────────┐
│ Octokit → Stores    │  invoke()   │ OAuth 인증 윈도우     │
│ UI Components       │ ──────────► │ 시스템 트레이/메뉴바   │
│ Polling (setInterval)│  emit()    │ 네이티브 알림          │
│ Filter/Sort/Search  │ ◄────────── │ 자동 시작             │
└─────────────────────┘             └──────────────────────┘
```

- **Svelte**: GitHub API 호출, 데이터 관리, UI 렌더링, 알림 트리거 감지
- **Rust**: OAuth callback 수신, 네이티브 기능 (트레이, 알림, 자동시작)

## 라이선스

MIT
