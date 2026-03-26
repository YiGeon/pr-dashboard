# PR Dashboard — Design Spec

Cross-organization PR 관리를 위한 데스크톱 대시보드 앱.
내가 작성한 PR의 리뷰 상태와, 나에게 리뷰 요청된 PR의 처리 현황을 한 곳에서 관리한다.

## 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 앱 프레임워크 | Tauri v2 | 가벼운 번들(~10MB), 크로스플랫폼 |
| 프론트엔드 | Svelte 5 | 최소 번들, Tauri와 가벼움 지향 궁합 |
| GitHub API | GraphQL via octokit | 한 요청으로 PR+리뷰+CI 조회, rate limit 효율 |
| 인증 | GitHub OAuth App | 다른 사용자도 "GitHub로 로그인"으로 바로 사용 가능 |

## 아키텍처

```
┌─────────────────────────────────────────┐
│              Tauri Shell                 │
│  ┌─────────────────────────────────────┐ │
│  │         Svelte (WebView)            │ │
│  │                                     │ │
│  │  ┌───────────┐   ┌──────────────┐  │ │
│  │  │ Octokit   │   │  Svelte      │  │ │
│  │  │ (GitHub   │──▶│  Stores      │  │ │
│  │  │  API)     │   │  (상태관리)   │  │ │
│  │  └───────────┘   └──────┬───────┘  │ │
│  │                         │          │ │
│  │  ┌──────────────────────▼───────┐  │ │
│  │  │        UI Components         │  │ │
│  │  │  - PR List (My PRs)          │  │ │
│  │  │  - PR List (Review Requests) │  │ │
│  │  │  - Filters / Sort / Search   │  │ │
│  │  │  - Settings                  │  │ │
│  │  └──────────────────────────────┘  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Rust Backend (최소)                      │
│  - OAuth 인증 윈도우                      │
│  - 시스템 트레이 / macOS 메뉴바            │
│  - 네이티브 알림 (tauri-plugin-notification)│
│  - 자동 시작 (tauri-plugin-autostart)      │
└──────────────────────────────────────────┘
```

### 핵심 흐름

1. 앱 시작 → GitHub OAuth 로그인 (Tauri가 인증 윈도우 관리)
2. Access token 획득 → Octokit 초기화
3. 폴링 타이머 시작 → GitHub GraphQL API 호출 → Svelte store 업데이트 → UI 반영
4. 새 이벤트 감지 시 → Tauri invoke로 네이티브 알림 발송

### Rust가 담당하는 것

- OAuth 인증 플로우: Tauri의 웹뷰 윈도우로 GitHub OAuth 페이지를 열고, redirect URI(`http://localhost:{port}/callback`)를 Rust 쪽 로컬 HTTP 서버로 수신하여 authorization code를 캡처한 뒤 access token으로 교환
- 시스템 트레이 / macOS 메뉴바 아이콘 관리
- 네이티브 알림 발송
- OS 시작 시 자동 실행
- 앱 윈도우 관리 (닫기 시 트레이 최소화)

### Svelte가 담당하는 것

- GitHub GraphQL API 호출 (octokit)
- 데이터 폴링 (setInterval)
- 상태 관리 (Svelte stores)
- UI 렌더링 전체
- 이전/현재 데이터 diff로 알림 트리거 감지

## 데이터 모델

```typescript
interface MyPR {
  id: number
  title: string
  url: string
  repo: string           // "org/repo"
  org: string
  state: 'open' | 'closed' | 'merged'
  createdAt: string
  updatedAt: string
  reviews: Review[]
  reviewStatus: 'pending' | 'approved' | 'changes_requested' | 'commented'
  ciStatus: 'success' | 'failure' | 'pending' | null
}

interface ReviewRequestedPR {
  id: number
  title: string
  url: string
  repo: string
  org: string
  author: string
  createdAt: string
  updatedAt: string
  myReviewStatus: 'pending' | 'approved' | 'changes_requested' | 'commented'
}

interface Review {
  author: string
  state: 'approved' | 'changes_requested' | 'commented' | 'pending'
  submittedAt: string
}
```

## GitHub API

GitHub GraphQL API를 사용한다. REST 대비 장점:
- 한 번의 요청으로 PR + 리뷰 상태 + CI 상태를 모두 가져올 수 있음
- Organization을 넘나들며 조회 가능
- Rate limit 효율이 훨씬 좋음

### 쿼리

```graphql
# 내가 작성한 open PR
query {
  search(query: "is:pr is:open author:@me", type: ISSUE, first: 50) {
    nodes {
      ... on PullRequest {
        id
        title
        url
        repository { nameWithOwner owner { login } }
        createdAt
        updatedAt
        reviews(last: 20) {
          nodes { author { login } state submittedAt }
        }
        commits(last: 1) {
          nodes { commit { statusCheckRollup { state } } }
        }
      }
    }
  }
}

# 나에게 리뷰 요청된 open PR
query {
  search(query: "is:pr is:open review-requested:@me", type: ISSUE, first: 50) {
    nodes {
      ... on PullRequest {
        id
        title
        url
        repository { nameWithOwner owner { login } }
        author { login }
        createdAt
        updatedAt
        reviews(last: 20) {
          nodes { author { login } state submittedAt }
        }
      }
    }
  }
}
```

## UI 레이아웃

탭 기반 단일 컬럼 레이아웃.

### 구조

```
┌──────────────────────────────────────┐
│  🔀 PR Dashboard              [⚙️]  │  ← 타이틀바
├──────────────────────────────────────┤
│  [내 PR (5)]  [리뷰 요청 (3)]        │  ← 탭
├──────────────────────────────────────┤
│  [All Orgs ▾] [Sort ▾] [🔍 검색...] │  ← 필터/정렬/검색 바
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ ● fix: 로그인 버그 수정        │  │  ← PR 카드
│  │   company/backend • 2h ago     │  │     좌측 색상 바: 리뷰 상태
│  │   👤 kim: ❌  👤 lee: ✅       │  │     리뷰어별 상태 표시
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ ● feat: 사용자 프로필 페이지   │  │
│  │   personal/frontend • 5h ago   │  │
│  │   👤 choi: ✅  👤 jung: ✅     │  │
│  └────────────────────────────────┘  │
│  ...                                 │
└──────────────────────────────────────┘
```

### PR 카드 상세

**내 PR 탭:**
- PR 제목
- repo 이름 (org/repo) + 상대 시간
- 리뷰어별 상태 아이콘 (✅ approved / ❌ changes requested / 💬 commented / ⏳ pending)
- 좌측 색상 바: 전체 리뷰 상태 (초록=approved, 빨강=changes requested, 노랑=pending)
- CI 상태 표시 (선택적)

**리뷰 요청 탭:**
- PR 제목
- repo 이름 + PR 작성자 + 상대 시간
- 내 리뷰 상태 (⏳ 미리뷰 / ✅ 승인함 / ❌ 변경요청함 / 💬 코멘트함)
- 좌측 색상 바: 내 리뷰 상태 기준

### PR 카드 클릭 동작

PR 카드 클릭 시 기본 브라우저에서 해당 GitHub PR 페이지를 연다.

## 필터 & 정렬

### 필터
- **Organization 드롭다운**: 로그인 사용자의 org 목록 자동 조회 + 개인 repos. 복수 선택 가능. 기본값 "All"
- **검색**: PR 제목 텍스트 검색 (클라이언트 사이드 필터링)

### 정렬
- 최근 업데이트순 (기본값)
- 생성일순
- 리뷰 상태순 (Changes Requested → Pending → Approved)

## 알림 시스템

### 트리거
| 이벤트 | 감지 방법 |
|---|---|
| 내 PR에 새 리뷰 | 이전 폴링의 reviews 배열과 비교, 새 항목 감지 |
| 새 리뷰 요청 도착 | 이전 폴링의 리뷰 요청 목록과 비교, 새 PR 감지 |

### 동작
- `tauri-plugin-notification`으로 OS 네이티브 알림 발송
- 알림 제목: 이벤트 유형 (예: "새 리뷰: fix: 로그인 버그 수정")
- 알림 본문: 리뷰어 이름 + 상태
- 알림 클릭 시 해당 PR GitHub 페이지를 기본 브라우저에서 열기

### macOS 메뉴바

- 상단 메뉴바에 아이콘 상주
- 미처리 건수 텍스트 표시 (예: `🔀 3`)
- 클릭 시 드롭다운으로 간단 요약:
  - 미리뷰 건수
  - 새 리뷰 건수
  - "대시보드 열기" 버튼
- Windows/Linux에서는 시스템 트레이로 폴백

## 설정

| 항목 | 타입 | 기본값 |
|---|---|---|
| 폴링 주기 | select (1/3/5/10분) | 5분 |
| 알림: 새 리뷰 | toggle | on |
| 알림: 새 리뷰 요청 | toggle | on |
| 시작 시 자동 실행 | toggle | off |
| 닫기 동작 | select (트레이 최소화/앱 종료) | 트레이 최소화 |
| 트레이 표시 | select (아이콘만/아이콘+건수) | 아이콘+건수 |
| 계정 | 읽기 전용 + 로그아웃 버튼 | — |

## 로컬 저장소

- **tauri-plugin-store**: OAuth 토큰, 설정값, 마지막 조회 시점을 파일 기반으로 영속 저장. localStorage보다 안정적이고 Tauri 생태계와 일관됨
- **메모리 (Svelte store)**: PR 데이터. 앱 재시작 시 새로 조회

## Tauri 플러그인

| 플러그인 | 용도 |
|---|---|
| tauri-plugin-notification | 네이티브 알림 |
| tauri-plugin-autostart | OS 시작 시 자동 실행 |
| tauri-plugin-shell | 기본 브라우저에서 URL 열기 |
| tauri-plugin-store | 설정/토큰 영속 저장 (localStorage 대안) |

## 범위 외 (향후 고려)

- PR 머지 가능 상태 알림
- GitHub Webhook 실시간 연동
- PR 코멘트 미리보기
- 다크/라이트 테마 전환
- 키보드 단축키
