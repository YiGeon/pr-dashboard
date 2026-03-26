# PR Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cross-organization GitHub PR 대시보드 데스크톱 앱을 구축한다. 내가 작성한 PR의 리뷰 상태와, 나에게 리뷰 요청된 PR의 처리 현황을 한 곳에서 관리할 수 있다.

**Architecture:** Tauri v2 (Rust) 쉘 안에서 Svelte 5 웹뷰가 UI와 GitHub API 호출을 담당하고, Rust 백엔드는 OAuth 인증, 시스템 트레이/메뉴바, 네이티브 알림만 처리한다. GitHub GraphQL API를 octokit으로 호출하며, 주기적 폴링으로 데이터를 갱신한다.

**Tech Stack:** Tauri v2, Svelte 5, TypeScript, octokit/graphql, Vite, Vitest, tauri-plugin-notification, tauri-plugin-store, tauri-plugin-shell, tauri-plugin-autostart

---

## File Structure

```
pr-dashboard/
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # Tauri command 등록, 플러그인 설정
│   │   ├── auth.rs             # OAuth: 로컬 HTTP 서버로 callback 수신, token 교환
│   │   └── tray.rs             # 시스템 트레이 / macOS 메뉴바 구성
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json        # 권한 설정
│   └── icons/                  # 앱 아이콘
├── src/
│   ├── main.ts                 # Svelte 앱 엔트리
│   ├── App.svelte              # 루트 컴포넌트 (인증 분기)
│   ├── lib/
│   │   ├── types.ts            # 공유 TypeScript 타입
│   │   ├── github/
│   │   │   ├── client.ts       # Octokit 초기화 및 GraphQL 쿼리 실행
│   │   │   └── queries.ts      # GraphQL 쿼리 문자열 + 응답 파서
│   │   ├── stores/
│   │   │   ├── auth.ts         # 인증 상태 store
│   │   │   ├── prs.ts          # PR 데이터 store + 폴링 로직
│   │   │   ├── settings.ts     # 설정 store (tauri-plugin-store 연동)
│   │   │   └── filters.ts      # 필터/정렬/검색 상태 store
│   │   ├── notifications.ts    # 이전/현재 diff → 알림 트리거
│   │   └── utils.ts            # 상대 시간 포맷, 리뷰 상태 계산 등
│   ├── components/
│   │   ├── Login.svelte        # GitHub 로그인 화면
│   │   ├── Dashboard.svelte    # 메인 대시보드 (탭 + 필터 + 리스트)
│   │   ├── TabBar.svelte       # "내 PR" / "리뷰 요청" 탭
│   │   ├── FilterBar.svelte    # Org 필터 + 정렬 + 검색
│   │   ├── PRList.svelte       # PR 카드 리스트
│   │   ├── PRCard.svelte       # 개별 PR 카드
│   │   └── Settings.svelte     # 설정 화면
│   └── app.css                 # 글로벌 스타일
├── tests/
│   ├── lib/
│   │   ├── github/
│   │   │   └── queries.test.ts # GraphQL 응답 파싱 테스트
│   │   ├── stores/
│   │   │   ├── prs.test.ts     # PR store 로직 테스트
│   │   │   └── filters.test.ts # 필터/정렬 로직 테스트
│   │   ├── notifications.test.ts # 알림 diff 로직 테스트
│   │   └── utils.test.ts       # 유틸 함수 테스트
│   └── setup.ts                # Vitest 설정 (Tauri mock)
├── index.html
├── package.json
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
└── tsconfig.node.json
```

---

## Task 1: Project Scaffolding

Tauri v2 + Svelte 5 + Vite 프로젝트 생성 및 기본 의존성 설치.

**Files:**
- Create: `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.ts`, `src/App.svelte`, `src/app.css`
- Create: `src-tauri/` (Tauri CLI가 생성)
- Create: `tests/setup.ts`

- [ ] **Step 1: Tauri + Svelte 프로젝트 생성**

```bash
npm create tauri-app@latest . -- --template svelte-ts --manager npm
```

이 명령은 현재 디렉토리(`.`)에 Tauri v2 + Svelte + TypeScript 프로젝트를 생성한다. 기존 `docs/` 디렉토리는 유지된다.

- [ ] **Step 2: 추가 의존성 설치**

```bash
npm install @octokit/graphql
npm install -D vitest @testing-library/svelte jsdom
```

- [ ] **Step 3: Tauri 플러그인 추가**

```bash
cd src-tauri
cargo add tauri-plugin-notification tauri-plugin-store tauri-plugin-shell tauri-plugin-autostart
cd ..
```

- [ ] **Step 4: Vitest 설정 파일 생성**

`vite.config.ts`를 수정하여 테스트 설정 추가:

```typescript
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
}));
```

- [ ] **Step 5: 테스트 셋업 파일 생성**

`tests/setup.ts`:

```typescript
import { vi } from "vitest";

// Tauri API를 mock하여 Node.js 환경에서 테스트 가능하게 함
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-store", () => {
  const store = new Map<string, unknown>();
  return {
    load: vi.fn(async () => ({
      get: vi.fn(async (key: string) => store.get(key)),
      set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
      save: vi.fn(),
    })),
  };
});

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-notification", () => ({
  sendNotification: vi.fn(),
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => "granted"),
}));
```

- [ ] **Step 6: 빌드 및 테스트 실행 확인**

```bash
npm run check
npx vitest run
```

Expected: 빌드 성공, 테스트 0개 (아직 테스트 파일 없음)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri v2 + Svelte 5 project with test setup"
```

---

## Task 2: TypeScript Types & Utility Functions

공유 타입 정의와 유틸리티 함수. 모든 후속 작업의 기반.

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/utils.ts`
- Create: `tests/lib/utils.test.ts`

- [ ] **Step 1: 유틸 함수 테스트 작성**

`tests/lib/utils.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { relativeTime, computeReviewStatus, reviewStatusPriority } from "../../src/lib/utils";

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-26T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for less than 1 minute ago", () => {
    expect(relativeTime("2026-03-26T11:59:30Z")).toBe("just now");
  });

  it("returns minutes for less than 1 hour ago", () => {
    expect(relativeTime("2026-03-26T11:30:00Z")).toBe("30m ago");
  });

  it("returns hours for less than 1 day ago", () => {
    expect(relativeTime("2026-03-26T09:00:00Z")).toBe("3h ago");
  });

  it("returns days for more than 1 day ago", () => {
    expect(relativeTime("2026-03-24T12:00:00Z")).toBe("2d ago");
  });
});

describe("computeReviewStatus", () => {
  it("returns pending when no reviews", () => {
    expect(computeReviewStatus([])).toBe("pending");
  });

  it("returns approved when all latest reviews are approved", () => {
    const reviews = [
      { author: "kim", state: "APPROVED" as const, submittedAt: "2026-03-26T10:00:00Z" },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("approved");
  });

  it("returns changes_requested when any latest review requests changes", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z" },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("changes_requested");
  });

  it("uses latest review per author when same author reviews multiple times", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T09:00:00Z" },
      { author: "kim", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("approved");
  });
});

describe("reviewStatusPriority", () => {
  it("sorts changes_requested first, then pending, then approved", () => {
    expect(reviewStatusPriority("changes_requested")).toBeLessThan(reviewStatusPriority("pending"));
    expect(reviewStatusPriority("pending")).toBeLessThan(reviewStatusPriority("approved"));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/utils.test.ts
```

Expected: FAIL — 모듈을 찾을 수 없음

- [ ] **Step 3: 타입 정의 작성**

`src/lib/types.ts`:

```typescript
export type ReviewState = "approved" | "changes_requested" | "commented" | "pending";

export type CIStatus = "success" | "failure" | "pending" | null;

export interface Review {
  author: string;
  state: ReviewState;
  submittedAt: string;
}

export interface MyPR {
  id: string;
  title: string;
  url: string;
  repo: string;
  org: string;
  state: "open" | "closed" | "merged";
  createdAt: string;
  updatedAt: string;
  reviews: Review[];
  reviewStatus: ReviewState;
  ciStatus: CIStatus;
}

export interface ReviewRequestedPR {
  id: string;
  title: string;
  url: string;
  repo: string;
  org: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  myReviewStatus: ReviewState;
}

export type SortKey = "updatedAt" | "createdAt" | "reviewStatus";

export interface Settings {
  pollingIntervalMinutes: number;
  notifyOnNewReview: boolean;
  notifyOnReviewRequest: boolean;
  autoStart: boolean;
  closeToTray: boolean;
  trayShowCount: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  pollingIntervalMinutes: 5,
  notifyOnNewReview: true,
  notifyOnReviewRequest: true,
  autoStart: false,
  closeToTray: true,
  trayShowCount: true,
};
```

- [ ] **Step 4: 유틸 함수 작성**

`src/lib/utils.ts`:

```typescript
import type { Review, ReviewState } from "./types";

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffHr < 1) return `${diffMin}m ago`;
  if (diffDay < 1) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

interface RawReview {
  author: string;
  state: string;
  submittedAt: string;
}

export function computeReviewStatus(reviews: RawReview[]): ReviewState {
  if (reviews.length === 0) return "pending";

  const latestByAuthor = new Map<string, RawReview>();
  for (const r of reviews) {
    const existing = latestByAuthor.get(r.author);
    if (!existing || r.submittedAt > existing.submittedAt) {
      latestByAuthor.set(r.author, r);
    }
  }

  const states = [...latestByAuthor.values()].map((r) => r.state);
  if (states.some((s) => s === "CHANGES_REQUESTED")) return "changes_requested";
  if (states.every((s) => s === "APPROVED")) return "approved";
  if (states.some((s) => s === "COMMENTED")) return "commented";
  return "pending";
}

const STATUS_PRIORITY: Record<ReviewState, number> = {
  changes_requested: 0,
  pending: 1,
  commented: 2,
  approved: 3,
};

export function reviewStatusPriority(status: ReviewState): number {
  return STATUS_PRIORITY[status];
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run tests/lib/utils.test.ts
```

Expected: PASS (모든 테스트 통과)

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/utils.ts tests/lib/utils.test.ts
git commit -m "feat: add shared types and utility functions"
```

---

## Task 3: GitHub GraphQL Client & Query Parser

GitHub GraphQL API 호출 및 응답 파싱 레이어.

**Files:**
- Create: `src/lib/github/queries.ts`
- Create: `src/lib/github/client.ts`
- Create: `tests/lib/github/queries.test.ts`

- [ ] **Step 1: 쿼리 파서 테스트 작성**

`tests/lib/github/queries.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseMyPRs, parseReviewRequestedPRs } from "../../../src/lib/github/queries";

const MOCK_MY_PRS_RESPONSE = {
  search: {
    nodes: [
      {
        id: "PR_1",
        title: "fix: login bug",
        url: "https://github.com/company/backend/pull/42",
        repository: { nameWithOwner: "company/backend", owner: { login: "company" } },
        createdAt: "2026-03-25T10:00:00Z",
        updatedAt: "2026-03-26T10:00:00Z",
        reviews: {
          nodes: [
            { author: { login: "kim" }, state: "CHANGES_REQUESTED", submittedAt: "2026-03-26T09:00:00Z" },
            { author: { login: "lee" }, state: "APPROVED", submittedAt: "2026-03-26T10:00:00Z" },
          ],
        },
        commits: {
          nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }],
        },
      },
      {
        id: "PR_2",
        title: "feat: profile page",
        url: "https://github.com/personal/frontend/pull/10",
        repository: { nameWithOwner: "personal/frontend", owner: { login: "personal" } },
        createdAt: "2026-03-24T10:00:00Z",
        updatedAt: "2026-03-26T05:00:00Z",
        reviews: { nodes: [] },
        commits: {
          nodes: [{ commit: { statusCheckRollup: null } }],
        },
      },
    ],
  },
};

const MOCK_REVIEW_REQUESTED_RESPONSE = {
  search: {
    nodes: [
      {
        id: "PR_3",
        title: "feat: payment module",
        url: "https://github.com/company/payment/pull/7",
        repository: { nameWithOwner: "company/payment", owner: { login: "company" } },
        author: { login: "hong" },
        createdAt: "2026-03-25T08:00:00Z",
        updatedAt: "2026-03-26T06:00:00Z",
        reviews: {
          nodes: [
            { author: { login: "me" }, state: "APPROVED", submittedAt: "2026-03-26T06:00:00Z" },
          ],
        },
      },
    ],
  },
};

describe("parseMyPRs", () => {
  it("parses GraphQL response into MyPR array", () => {
    const result = parseMyPRs(MOCK_MY_PRS_RESPONSE);
    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      id: "PR_1",
      title: "fix: login bug",
      url: "https://github.com/company/backend/pull/42",
      repo: "company/backend",
      org: "company",
      state: "open",
      createdAt: "2026-03-25T10:00:00Z",
      updatedAt: "2026-03-26T10:00:00Z",
      reviews: [
        { author: "kim", state: "changes_requested", submittedAt: "2026-03-26T09:00:00Z" },
        { author: "lee", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
      ],
      reviewStatus: "changes_requested",
      ciStatus: "success",
    });

    expect(result[1].reviewStatus).toBe("pending");
    expect(result[1].ciStatus).toBeNull();
  });
});

describe("parseReviewRequestedPRs", () => {
  it("parses GraphQL response into ReviewRequestedPR array", () => {
    const username = "me";
    const result = parseReviewRequestedPRs(MOCK_REVIEW_REQUESTED_RESPONSE, username);
    expect(result).toHaveLength(1);

    expect(result[0]).toEqual({
      id: "PR_3",
      title: "feat: payment module",
      url: "https://github.com/company/payment/pull/7",
      repo: "company/payment",
      org: "company",
      author: "hong",
      createdAt: "2026-03-25T08:00:00Z",
      updatedAt: "2026-03-26T06:00:00Z",
      myReviewStatus: "approved",
    });
  });

  it("returns pending when user has not reviewed", () => {
    const response = {
      search: {
        nodes: [{
          id: "PR_4", title: "test", url: "https://github.com/x/y/pull/1",
          repository: { nameWithOwner: "x/y", owner: { login: "x" } },
          author: { login: "other" },
          createdAt: "2026-03-25T00:00:00Z", updatedAt: "2026-03-25T00:00:00Z",
          reviews: { nodes: [] },
        }],
      },
    };
    const result = parseReviewRequestedPRs(response, "me");
    expect(result[0].myReviewStatus).toBe("pending");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/github/queries.test.ts
```

Expected: FAIL

- [ ] **Step 3: GraphQL 쿼리 및 파서 작성**

`src/lib/github/queries.ts`:

```typescript
import type { MyPR, ReviewRequestedPR, Review, ReviewState, CIStatus } from "../types";
import { computeReviewStatus } from "../utils";

export const MY_PRS_QUERY = `
  query($query: String!) {
    search(query: $query, type: ISSUE, first: 50) {
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
`;

export const REVIEW_REQUESTED_QUERY = `
  query($query: String!) {
    search(query: $query, type: ISSUE, first: 50) {
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
`;

function normalizeReviewState(state: string): ReviewState {
  const map: Record<string, ReviewState> = {
    APPROVED: "approved",
    CHANGES_REQUESTED: "changes_requested",
    COMMENTED: "commented",
    PENDING: "pending",
    DISMISSED: "commented",
  };
  return map[state] ?? "pending";
}

function normalizeCIStatus(rollup: { state: string } | null): CIStatus {
  if (!rollup) return null;
  const map: Record<string, CIStatus> = {
    SUCCESS: "success",
    FAILURE: "failure",
    ERROR: "failure",
    EXPECTED: "pending",
    PENDING: "pending",
  };
  return map[rollup.state] ?? "pending";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMyPRs(data: any): MyPR[] {
  return data.search.nodes
    .filter((node: any) => node.id)
    .map((node: any) => {
      const reviews: Review[] = (node.reviews?.nodes ?? []).map((r: any) => ({
        author: r.author?.login ?? "unknown",
        state: normalizeReviewState(r.state),
        submittedAt: r.submittedAt,
      }));

      const rawReviews = (node.reviews?.nodes ?? []).map((r: any) => ({
        author: r.author?.login ?? "unknown",
        state: r.state,
        submittedAt: r.submittedAt,
      }));

      const commitNode = node.commits?.nodes?.[0]?.commit;
      const ciStatus = normalizeCIStatus(commitNode?.statusCheckRollup ?? null);

      return {
        id: node.id,
        title: node.title,
        url: node.url,
        repo: node.repository.nameWithOwner,
        org: node.repository.owner.login,
        state: "open" as const,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        reviews,
        reviewStatus: computeReviewStatus(rawReviews),
        ciStatus,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseReviewRequestedPRs(data: any, username: string): ReviewRequestedPR[] {
  return data.search.nodes
    .filter((node: any) => node.id)
    .map((node: any) => {
      const myReviews = (node.reviews?.nodes ?? [])
        .filter((r: any) => r.author?.login === username)
        .map((r: any) => ({
          author: r.author.login,
          state: r.state,
          submittedAt: r.submittedAt,
        }));

      const myLatest = myReviews.sort(
        (a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      )[0];

      return {
        id: node.id,
        title: node.title,
        url: node.url,
        repo: node.repository.nameWithOwner,
        org: node.repository.owner.login,
        author: node.author?.login ?? "unknown",
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        myReviewStatus: myLatest ? normalizeReviewState(myLatest.state) : "pending",
      };
    });
}
```

- [ ] **Step 4: GitHub 클라이언트 작성**

`src/lib/github/client.ts`:

```typescript
import { graphql } from "@octokit/graphql";
import { MY_PRS_QUERY, REVIEW_REQUESTED_QUERY, parseMyPRs, parseReviewRequestedPRs } from "./queries";
import type { MyPR, ReviewRequestedPR } from "../types";

let graphqlClient: typeof graphql | null = null;
let currentUsername: string = "";

export function initClient(token: string) {
  graphqlClient = graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

export function clearClient() {
  graphqlClient = null;
  currentUsername = "";
}

export async function fetchUsername(): Promise<string> {
  if (!graphqlClient) throw new Error("Client not initialized");
  const data: any = await graphqlClient(`query { viewer { login } }`);
  currentUsername = data.viewer.login;
  return currentUsername;
}

export function getUsername(): string {
  return currentUsername;
}

export async function fetchMyPRs(): Promise<MyPR[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  const data = await graphqlClient(MY_PRS_QUERY, {
    query: "is:pr is:open author:@me",
  });
  return parseMyPRs(data);
}

export async function fetchReviewRequestedPRs(): Promise<ReviewRequestedPR[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  const data = await graphqlClient(REVIEW_REQUESTED_QUERY, {
    query: "is:pr is:open review-requested:@me",
  });
  return parseReviewRequestedPRs(data, currentUsername);
}

export async function fetchOrganizations(): Promise<string[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  const data: any = await graphqlClient(`
    query {
      viewer {
        organizations(first: 50) {
          nodes { login }
        }
      }
    }
  `);
  return data.viewer.organizations.nodes.map((org: any) => org.login);
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run tests/lib/github/queries.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/github/ tests/lib/github/
git commit -m "feat: add GitHub GraphQL client and query parser"
```

---

## Task 4: Auth Store & OAuth Flow (Rust)

OAuth 인증 플로우: Rust에서 로컬 HTTP 서버로 callback을 수신하고, Svelte에서 인증 상태를 관리한다.

**Files:**
- Create: `src-tauri/src/auth.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`
- Create: `src/lib/stores/auth.ts`

- [ ] **Step 1: Rust OAuth 모듈 작성**

`src-tauri/src/auth.rs`:

```rust
use std::net::TcpListener;
use std::io::{Read, Write};
use tauri::Emitter;

const CLIENT_ID: &str = "YOUR_GITHUB_CLIENT_ID";
const CLIENT_SECRET: &str = "YOUR_GITHUB_CLIENT_SECRET";

#[tauri::command]
pub async fn start_oauth(app: tauri::AppHandle) -> Result<String, String> {
    // 랜덤 포트로 로컬 서버 바인드
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let redirect_uri = format!("http://localhost:{}/callback", port);

    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}&scope=read:org,repo",
        CLIENT_ID,
        urlencoding::encode(&redirect_uri)
    );

    // 별도 스레드에서 callback 대기
    let app_handle = app.clone();
    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buf = [0u8; 4096];
            if let Ok(n) = stream.read(&mut buf) {
                let request = String::from_utf8_lossy(&buf[..n]);
                if let Some(code) = extract_code(&request) {
                    let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body><h2>Authentication successful!</h2><p>You can close this window.</p></body></html>";
                    let _ = stream.write_all(response.as_bytes());

                    // code -> access token 교환
                    if let Ok(token) = exchange_code(&code, &redirect_uri) {
                        let _ = app_handle.emit("oauth-token", token);
                    }
                }
            }
        }
    });

    Ok(auth_url)
}

fn extract_code(request: &str) -> Option<String> {
    let first_line = request.lines().next()?;
    let path = first_line.split_whitespace().nth(1)?;
    let query = path.split('?').nth(1)?;
    for param in query.split('&') {
        let mut kv = param.splitn(2, '=');
        if kv.next()? == "code" {
            return kv.next().map(|s| s.to_string());
        }
    }
    None
}

fn exchange_code(code: &str, redirect_uri: &str) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }))
        .send()
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    body["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No access_token in response".to_string())
}
```

- [ ] **Step 2: Cargo.toml에 의존성 추가**

`src-tauri/Cargo.toml`의 `[dependencies]`에 추가:

```toml
reqwest = { version = "0.12", features = ["blocking", "json"] }
serde_json = "1"
urlencoding = "2"
```

- [ ] **Step 3: lib.rs에 auth 모듈 등록**

`src-tauri/src/lib.rs`를 수정하여 auth 커맨드를 등록한다:

```rust
mod auth;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![auth::start_oauth])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Tauri capabilities 설정**

`src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for the PR Dashboard",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "notification:default",
    "notification:allow-is-permission-granted",
    "notification:allow-request-permission",
    "notification:allow-notify",
    "store:default",
    "shell:default",
    "shell:allow-open",
    "autostart:default",
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled"
  ]
}
```

- [ ] **Step 5: Auth store 작성**

`src/lib/stores/auth.ts`:

```typescript
import { writable, derived } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { load } from "@tauri-apps/plugin-store";
import { initClient, clearClient, fetchUsername } from "../github/client";

export const token = writable<string | null>(null);
export const username = writable<string | null>(null);
export const isAuthenticated = derived(token, ($token) => $token !== null);
export const isLoggingIn = writable(false);

const STORE_KEY = "github_token";

export async function restoreSession() {
  const store = await load("settings.json");
  const saved = await store.get<string>(STORE_KEY);
  if (saved) {
    initClient(saved);
    try {
      const name = await fetchUsername();
      token.set(saved);
      username.set(name);
    } catch {
      await store.set(STORE_KEY, null);
      await store.save();
      clearClient();
    }
  }
}

export async function startLogin() {
  isLoggingIn.set(true);

  const unlisten = await listen<string>("oauth-token", async (event) => {
    const accessToken = event.payload;
    initClient(accessToken);
    const name = await fetchUsername();

    const store = await load("settings.json");
    await store.set(STORE_KEY, accessToken);
    await store.save();

    token.set(accessToken);
    username.set(name);
    isLoggingIn.set(false);
    unlisten();
  });

  const authUrl: string = await invoke("start_oauth");
  await open(authUrl);
}

export async function logout() {
  const store = await load("settings.json");
  await store.set(STORE_KEY, null);
  await store.save();

  clearClient();
  token.set(null);
  username.set(null);
}
```

- [ ] **Step 6: Rust 빌드 확인**

```bash
cd src-tauri && cargo check && cd ..
```

Expected: 컴파일 성공 (warning 가능)

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/auth.rs src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/capabilities/ src/lib/stores/auth.ts
git commit -m "feat: add OAuth authentication flow"
```

---

## Task 5: Settings Store

tauri-plugin-store를 사용한 설정 영속 저장.

**Files:**
- Create: `src/lib/stores/settings.ts`

- [ ] **Step 1: Settings store 작성**

`src/lib/stores/settings.ts`:

```typescript
import { writable, get } from "svelte/store";
import { load } from "@tauri-apps/plugin-store";
import { type Settings, DEFAULT_SETTINGS } from "../types";

export const settings = writable<Settings>({ ...DEFAULT_SETTINGS });

const STORE_KEY = "app_settings";

export async function loadSettings() {
  const store = await load("settings.json");
  const saved = await store.get<Settings>(STORE_KEY);
  if (saved) {
    settings.set({ ...DEFAULT_SETTINGS, ...saved });
  }
}

export async function updateSettings(partial: Partial<Settings>) {
  settings.update((current) => ({ ...current, ...partial }));
  const store = await load("settings.json");
  await store.set(STORE_KEY, get(settings));
  await store.save();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/settings.ts
git commit -m "feat: add settings store with tauri-plugin-store persistence"
```

---

## Task 6: PR Data Store & Polling

PR 데이터 fetch, 폴링 관리, 필터/정렬 로직.

**Files:**
- Create: `src/lib/stores/prs.ts`
- Create: `src/lib/stores/filters.ts`
- Create: `tests/lib/stores/filters.test.ts`

- [ ] **Step 1: 필터/정렬 테스트 작성**

`tests/lib/stores/filters.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { applyFilters, applySorting } from "../../src/lib/stores/filters";
import type { MyPR, ReviewRequestedPR, SortKey } from "../../src/lib/types";

const MOCK_MY_PRS: MyPR[] = [
  {
    id: "1", title: "fix: login bug", url: "", repo: "company/backend", org: "company",
    state: "open", createdAt: "2026-03-24T10:00:00Z", updatedAt: "2026-03-26T10:00:00Z",
    reviews: [], reviewStatus: "changes_requested", ciStatus: null,
  },
  {
    id: "2", title: "feat: profile page", url: "", repo: "personal/frontend", org: "personal",
    state: "open", createdAt: "2026-03-25T10:00:00Z", updatedAt: "2026-03-25T05:00:00Z",
    reviews: [], reviewStatus: "approved", ciStatus: "success",
  },
  {
    id: "3", title: "chore: CI pipeline", url: "", repo: "company/infra", org: "company",
    state: "open", createdAt: "2026-03-23T10:00:00Z", updatedAt: "2026-03-26T08:00:00Z",
    reviews: [], reviewStatus: "pending", ciStatus: "pending",
  },
];

describe("applyFilters", () => {
  it("returns all when no filters applied", () => {
    const result = applyFilters(MOCK_MY_PRS, [], "");
    expect(result).toHaveLength(3);
  });

  it("filters by organization", () => {
    const result = applyFilters(MOCK_MY_PRS, ["company"], "");
    expect(result).toHaveLength(2);
    expect(result.every((pr) => pr.org === "company")).toBe(true);
  });

  it("filters by search query on title", () => {
    const result = applyFilters(MOCK_MY_PRS, [], "login");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("fix: login bug");
  });

  it("combines org filter and search", () => {
    const result = applyFilters(MOCK_MY_PRS, ["company"], "CI");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("chore: CI pipeline");
  });
});

describe("applySorting", () => {
  it("sorts by updatedAt descending", () => {
    const result = applySorting([...MOCK_MY_PRS], "updatedAt");
    expect(result[0].id).toBe("1"); // 2026-03-26T10:00
    expect(result[1].id).toBe("3"); // 2026-03-26T08:00
    expect(result[2].id).toBe("2"); // 2026-03-25T05:00
  });

  it("sorts by createdAt descending", () => {
    const result = applySorting([...MOCK_MY_PRS], "createdAt");
    expect(result[0].id).toBe("2"); // 2026-03-25
    expect(result[1].id).toBe("1"); // 2026-03-24
    expect(result[2].id).toBe("3"); // 2026-03-23
  });

  it("sorts by reviewStatus priority", () => {
    const result = applySorting([...MOCK_MY_PRS], "reviewStatus");
    expect(result[0].reviewStatus).toBe("changes_requested");
    expect(result[1].reviewStatus).toBe("pending");
    expect(result[2].reviewStatus).toBe("approved");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/stores/filters.test.ts
```

Expected: FAIL

- [ ] **Step 3: 필터/정렬 로직 작성**

`src/lib/stores/filters.ts`:

```typescript
import { writable } from "svelte/store";
import type { MyPR, ReviewRequestedPR, SortKey } from "../types";
import { reviewStatusPriority } from "../utils";

export const selectedOrgs = writable<string[]>([]);
export const searchQuery = writable("");
export const sortKey = writable<SortKey>("updatedAt");

type Filterable = MyPR | ReviewRequestedPR;

export function applyFilters<T extends Filterable>(items: T[], orgs: string[], query: string): T[] {
  let result = items;

  if (orgs.length > 0) {
    result = result.filter((item) => orgs.includes(item.org));
  }

  if (query.trim()) {
    const lower = query.toLowerCase();
    result = result.filter((item) => item.title.toLowerCase().includes(lower));
  }

  return result;
}

export function applySorting<T extends Filterable>(items: T[], key: SortKey): T[] {
  const sorted = [...items];

  switch (key) {
    case "updatedAt":
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case "createdAt":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "reviewStatus": {
      sorted.sort((a, b) => {
        const statusA = "reviewStatus" in a ? a.reviewStatus : (a as ReviewRequestedPR).myReviewStatus;
        const statusB = "reviewStatus" in b ? b.reviewStatus : (b as ReviewRequestedPR).myReviewStatus;
        return reviewStatusPriority(statusA) - reviewStatusPriority(statusB);
      });
      break;
    }
  }

  return sorted;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/lib/stores/filters.test.ts
```

Expected: PASS

- [ ] **Step 5: PR 데이터 store 작성**

`src/lib/stores/prs.ts`:

```typescript
import { writable, derived, get } from "svelte/store";
import { fetchMyPRs, fetchReviewRequestedPRs, fetchOrganizations } from "../github/client";
import type { MyPR, ReviewRequestedPR } from "../types";
import { settings } from "./settings";
import { selectedOrgs, searchQuery, sortKey } from "./filters";
import { applyFilters, applySorting } from "./filters";
import { checkAndNotify } from "../notifications";

export const myPRs = writable<MyPR[]>([]);
export const reviewRequestedPRs = writable<ReviewRequestedPR[]>([]);
export const organizations = writable<string[]>([]);
export const isLoading = writable(false);
export const lastFetchedAt = writable<string | null>(null);

export const filteredMyPRs = derived(
  [myPRs, selectedOrgs, searchQuery, sortKey],
  ([$myPRs, $orgs, $query, $sortKey]) => {
    const filtered = applyFilters($myPRs, $orgs, $query);
    return applySorting(filtered, $sortKey);
  }
);

export const filteredReviewRequestedPRs = derived(
  [reviewRequestedPRs, selectedOrgs, searchQuery, sortKey],
  ([$prs, $orgs, $query, $sortKey]) => {
    const filtered = applyFilters($prs, $orgs, $query);
    return applySorting(filtered, $sortKey);
  }
);

let pollingTimer: ReturnType<typeof setInterval> | null = null;

export async function fetchAll() {
  isLoading.set(true);
  try {
    const [myPRData, reviewData, orgs] = await Promise.all([
      fetchMyPRs(),
      fetchReviewRequestedPRs(),
      fetchOrganizations(),
    ]);

    const prevMyPRs = get(myPRs);
    const prevReviewPRs = get(reviewRequestedPRs);

    myPRs.set(myPRData);
    reviewRequestedPRs.set(reviewData);
    organizations.set(orgs);
    lastFetchedAt.set(new Date().toISOString());

    await checkAndNotify(prevMyPRs, myPRData, prevReviewPRs, reviewData);
  } finally {
    isLoading.set(false);
  }
}

export function startPolling() {
  stopPolling();
  fetchAll();

  const unsubscribe = settings.subscribe(($settings) => {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(fetchAll, $settings.pollingIntervalMinutes * 60 * 1000);
  });

  return () => {
    unsubscribe();
    stopPolling();
  };
}

export function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/prs.ts src/lib/stores/filters.ts tests/lib/stores/filters.test.ts
git commit -m "feat: add PR data store with polling and filter/sort logic"
```

---

## Task 7: Notification System

이전/현재 데이터 diff로 새 이벤트를 감지하고 네이티브 알림 발송.

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `tests/lib/notifications.test.ts`

- [ ] **Step 1: 알림 로직 테스트 작성**

`tests/lib/notifications.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectNewReviews, detectNewReviewRequests } from "../src/lib/notifications";
import type { MyPR, ReviewRequestedPR } from "../src/lib/types";

describe("detectNewReviews", () => {
  it("returns empty when no changes", () => {
    const pr: MyPR = {
      id: "1", title: "fix: bug", url: "", repo: "a/b", org: "a", state: "open",
      createdAt: "", updatedAt: "", reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
      ], reviewStatus: "approved", ciStatus: null,
    };
    expect(detectNewReviews([pr], [pr])).toEqual([]);
  });

  it("detects a new review on existing PR", () => {
    const prev: MyPR = {
      id: "1", title: "fix: bug", url: "https://github.com/a/b/pull/1", repo: "a/b", org: "a", state: "open",
      createdAt: "", updatedAt: "", reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
      ], reviewStatus: "approved", ciStatus: null,
    };
    const curr: MyPR = {
      ...prev, reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
        { author: "lee", state: "changes_requested", submittedAt: "2026-03-26T11:00:00Z" },
      ], reviewStatus: "changes_requested",
    };
    const result = detectNewReviews([prev], [curr]);
    expect(result).toHaveLength(1);
    expect(result[0].prTitle).toBe("fix: bug");
    expect(result[0].reviewer).toBe("lee");
    expect(result[0].state).toBe("changes_requested");
  });
});

describe("detectNewReviewRequests", () => {
  it("returns empty when no new requests", () => {
    const pr: ReviewRequestedPR = {
      id: "1", title: "feat: x", url: "", repo: "a/b", org: "a",
      author: "other", createdAt: "", updatedAt: "", myReviewStatus: "pending",
    };
    expect(detectNewReviewRequests([pr], [pr])).toEqual([]);
  });

  it("detects a new review request", () => {
    const prev: ReviewRequestedPR[] = [];
    const curr: ReviewRequestedPR[] = [{
      id: "1", title: "feat: payment", url: "https://github.com/c/d/pull/5", repo: "c/d", org: "c",
      author: "hong", createdAt: "", updatedAt: "", myReviewStatus: "pending",
    }];
    const result = detectNewReviewRequests(prev, curr);
    expect(result).toHaveLength(1);
    expect(result[0].prTitle).toBe("feat: payment");
    expect(result[0].author).toBe("hong");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run tests/lib/notifications.test.ts
```

Expected: FAIL

- [ ] **Step 3: 알림 로직 구현**

`src/lib/notifications.ts`:

```typescript
import { get } from "svelte/store";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { open } from "@tauri-apps/plugin-shell";
import type { MyPR, ReviewRequestedPR } from "./types";
import { settings } from "./stores/settings";

export interface NewReviewEvent {
  prTitle: string;
  prUrl: string;
  reviewer: string;
  state: string;
}

export interface NewReviewRequestEvent {
  prTitle: string;
  prUrl: string;
  author: string;
}

export function detectNewReviews(prev: MyPR[], curr: MyPR[]): NewReviewEvent[] {
  const events: NewReviewEvent[] = [];
  const prevMap = new Map(prev.map((pr) => [pr.id, pr]));

  for (const pr of curr) {
    const prevPR = prevMap.get(pr.id);
    if (!prevPR) continue;

    const prevReviewKeys = new Set(
      prevPR.reviews.map((r) => `${r.author}:${r.submittedAt}`)
    );

    for (const review of pr.reviews) {
      const key = `${review.author}:${review.submittedAt}`;
      if (!prevReviewKeys.has(key)) {
        events.push({
          prTitle: pr.title,
          prUrl: pr.url,
          reviewer: review.author,
          state: review.state,
        });
      }
    }
  }

  return events;
}

export function detectNewReviewRequests(
  prev: ReviewRequestedPR[],
  curr: ReviewRequestedPR[]
): NewReviewRequestEvent[] {
  const prevIds = new Set(prev.map((pr) => pr.id));
  return curr
    .filter((pr) => !prevIds.has(pr.id))
    .map((pr) => ({
      prTitle: pr.title,
      prUrl: pr.url,
      author: pr.author,
    }));
}

export async function checkAndNotify(
  prevMyPRs: MyPR[],
  currMyPRs: MyPR[],
  prevReviewPRs: ReviewRequestedPR[],
  currReviewPRs: ReviewRequestedPR[]
) {
  // 최초 로드시에는 알림 보내지 않음
  if (prevMyPRs.length === 0 && prevReviewPRs.length === 0) return;

  const $settings = get(settings);
  let permitted = await isPermissionGranted();
  if (!permitted) {
    const result = await requestPermission();
    permitted = result === "granted";
  }
  if (!permitted) return;

  if ($settings.notifyOnNewReview) {
    const newReviews = detectNewReviews(prevMyPRs, currMyPRs);
    for (const event of newReviews) {
      sendNotification({
        title: `New review: ${event.prTitle}`,
        body: `${event.reviewer} — ${event.state}`,
      });
    }
  }

  if ($settings.notifyOnReviewRequest) {
    const newRequests = detectNewReviewRequests(prevReviewPRs, currReviewPRs);
    for (const event of newRequests) {
      sendNotification({
        title: `Review requested: ${event.prTitle}`,
        body: `from ${event.author}`,
      });
    }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run tests/lib/notifications.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts tests/lib/notifications.test.ts
git commit -m "feat: add notification system with diff detection"
```

---

## Task 8: Login Component

GitHub OAuth 로그인 화면.

**Files:**
- Create: `src/components/Login.svelte`

- [ ] **Step 1: Login 컴포넌트 작성**

`src/components/Login.svelte`:

```svelte
<script lang="ts">
  import { startLogin, isLoggingIn } from "../lib/stores/auth";
</script>

<div class="login-container">
  <div class="login-card">
    <h1>PR Dashboard</h1>
    <p class="subtitle">GitHub PR을 한 곳에서 관리하세요</p>
    <button
      class="login-btn"
      onclick={startLogin}
      disabled={$isLoggingIn}
    >
      {#if $isLoggingIn}
        Connecting...
      {:else}
        Sign in with GitHub
      {/if}
    </button>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0d1117;
  }

  .login-card {
    text-align: center;
    padding: 3rem;
  }

  h1 {
    font-size: 1.8rem;
    color: #e6edf3;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #8b949e;
    margin-bottom: 2rem;
  }

  .login-btn {
    background: #238636;
    color: #fff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .login-btn:hover:not(:disabled) {
    background: #2ea043;
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Login.svelte
git commit -m "feat: add GitHub login component"
```

---

## Task 9: Dashboard Layout — TabBar, FilterBar, PRCard, PRList

메인 대시보드 UI 컴포넌트 전체.

**Files:**
- Create: `src/components/TabBar.svelte`
- Create: `src/components/FilterBar.svelte`
- Create: `src/components/PRCard.svelte`
- Create: `src/components/PRList.svelte`
- Create: `src/components/Dashboard.svelte`

- [ ] **Step 1: TabBar 컴포넌트**

`src/components/TabBar.svelte`:

```svelte
<script lang="ts">
  import { myPRs, reviewRequestedPRs } from "../lib/stores/prs";

  let { activeTab = $bindable("my-prs") }: { activeTab: "my-prs" | "review-requests" } = $props();
</script>

<div class="tab-bar">
  <button
    class="tab"
    class:active={activeTab === "my-prs"}
    onclick={() => (activeTab = "my-prs")}
  >
    My PRs ({$myPRs.length})
  </button>
  <button
    class="tab"
    class:active={activeTab === "review-requests"}
    onclick={() => (activeTab = "review-requests")}
  >
    Review Requests ({$reviewRequestedPRs.length})
  </button>
</div>

<style>
  .tab-bar {
    display: flex;
    border-bottom: 1px solid #30363d;
    padding: 0 1rem;
  }

  .tab {
    background: none;
    border: none;
    color: #8b949e;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }

  .tab:hover {
    color: #e6edf3;
  }

  .tab.active {
    color: #58a6ff;
    border-bottom-color: #58a6ff;
  }
</style>
```

- [ ] **Step 2: FilterBar 컴포넌트**

`src/components/FilterBar.svelte`:

```svelte
<script lang="ts">
  import { organizations } from "../lib/stores/prs";
  import { selectedOrgs, searchQuery, sortKey } from "../lib/stores/filters";
  import type { SortKey } from "../lib/types";

  let orgDropdownOpen = $state(false);

  function toggleOrg(org: string) {
    selectedOrgs.update((current) => {
      if (current.includes(org)) {
        return current.filter((o) => o !== org);
      }
      return [...current, org];
    });
  }

  function handleSortChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    sortKey.set(target.value as SortKey);
  }

  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery.set(target.value);
  }
</script>

<div class="filter-bar">
  <div class="org-filter">
    <button class="filter-btn" onclick={() => (orgDropdownOpen = !orgDropdownOpen)}>
      {$selectedOrgs.length === 0 ? "All Orgs" : `${$selectedOrgs.length} selected`} ▾
    </button>
    {#if orgDropdownOpen}
      <div class="dropdown">
        {#each $organizations as org}
          <label class="dropdown-item">
            <input
              type="checkbox"
              checked={$selectedOrgs.includes(org)}
              onchange={() => toggleOrg(org)}
            />
            {org}
          </label>
        {/each}
        {#if $organizations.length === 0}
          <span class="dropdown-empty">No organizations</span>
        {/if}
      </div>
    {/if}
  </div>

  <select class="sort-select" value={$sortKey} onchange={handleSortChange}>
    <option value="updatedAt">Updated</option>
    <option value="createdAt">Created</option>
    <option value="reviewStatus">Review Status</option>
  </select>

  <input
    type="text"
    class="search-input"
    placeholder="Search PRs..."
    value={$searchQuery}
    oninput={handleSearchInput}
  />
</div>

<style>
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #30363d;
  }

  .org-filter {
    position: relative;
  }

  .filter-btn, .sort-select {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 0.5rem;
    z-index: 10;
    min-width: 160px;
    margin-top: 0.25rem;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    color: #c9d1d9;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .dropdown-empty {
    color: #8b949e;
    font-size: 0.8rem;
  }

  .search-input {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    flex: 1;
    min-width: 0;
  }

  .search-input::placeholder {
    color: #484f58;
  }
</style>
```

- [ ] **Step 3: PRCard 컴포넌트**

`src/components/PRCard.svelte`:

```svelte
<script lang="ts">
  import { open } from "@tauri-apps/plugin-shell";
  import type { MyPR, ReviewRequestedPR, ReviewState } from "../lib/types";
  import { relativeTime } from "../lib/utils";

  let { pr, mode }: { pr: MyPR | ReviewRequestedPR; mode: "my-prs" | "review-requests" } = $props();

  const STATUS_COLORS: Record<ReviewState, string> = {
    approved: "#238636",
    changes_requested: "#da3633",
    commented: "#8b949e",
    pending: "#d29922",
  };

  const STATUS_ICONS: Record<ReviewState, string> = {
    approved: "✅",
    changes_requested: "❌",
    commented: "💬",
    pending: "⏳",
  };

  function getBarColor(): string {
    if (mode === "my-prs") {
      return STATUS_COLORS[(pr as MyPR).reviewStatus];
    }
    return STATUS_COLORS[(pr as ReviewRequestedPR).myReviewStatus];
  }

  function handleClick() {
    open(pr.url);
  }
</script>

<button class="pr-card" onclick={handleClick}>
  <div class="status-bar" style="background: {getBarColor()}"></div>
  <div class="card-content">
    <div class="card-header">
      <span class="pr-title">{pr.title}</span>
    </div>
    <div class="card-meta">
      <span class="repo">{pr.repo}</span>
      {#if mode === "review-requests"}
        <span class="author">by {(pr as ReviewRequestedPR).author}</span>
      {/if}
      <span class="time">{relativeTime(pr.updatedAt)}</span>
    </div>
    {#if mode === "my-prs"}
      <div class="reviewers">
        {#each (pr as MyPR).reviews as review}
          <span class="reviewer">
            {STATUS_ICONS[review.state]} {review.author}
          </span>
        {/each}
        {#if (pr as MyPR).reviews.length === 0}
          <span class="no-reviews">No reviews yet</span>
        {/if}
      </div>
    {:else}
      <div class="my-review-status">
        {STATUS_ICONS[(pr as ReviewRequestedPR).myReviewStatus]}
        {#if (pr as ReviewRequestedPR).myReviewStatus === "pending"}
          Not reviewed
        {:else if (pr as ReviewRequestedPR).myReviewStatus === "approved"}
          Approved
        {:else if (pr as ReviewRequestedPR).myReviewStatus === "changes_requested"}
          Changes requested
        {:else}
          Commented
        {/if}
      </div>
    {/if}
  </div>
</button>

<style>
  .pr-card {
    display: flex;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.2s;
    width: 100%;
    text-align: left;
    padding: 0;
    font: inherit;
    color: inherit;
  }

  .pr-card:hover {
    border-color: #58a6ff;
  }

  .status-bar {
    width: 4px;
    flex-shrink: 0;
  }

  .card-content {
    padding: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .pr-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #e6edf3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #8b949e;
    margin-bottom: 0.375rem;
  }

  .reviewers, .my-review-status {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #c9d1d9;
  }

  .reviewer, .no-reviews {
    font-size: 0.75rem;
  }

  .no-reviews {
    color: #484f58;
  }
</style>
```

- [ ] **Step 4: PRList 컴포넌트**

`src/components/PRList.svelte`:

```svelte
<script lang="ts">
  import PRCard from "./PRCard.svelte";
  import type { MyPR, ReviewRequestedPR } from "../lib/types";

  let { prs, mode }: { prs: (MyPR | ReviewRequestedPR)[]; mode: "my-prs" | "review-requests" } = $props();
</script>

<div class="pr-list">
  {#each prs as pr (pr.id)}
    <PRCard {pr} {mode} />
  {/each}
  {#if prs.length === 0}
    <div class="empty">
      {#if mode === "my-prs"}
        No open PRs
      {:else}
        No review requests
      {/if}
    </div>
  {/if}
</div>

<style>
  .pr-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .empty {
    text-align: center;
    color: #484f58;
    padding: 2rem;
    font-size: 0.875rem;
  }
</style>
```

- [ ] **Step 5: Dashboard 컴포넌트**

`src/components/Dashboard.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import TabBar from "./TabBar.svelte";
  import FilterBar from "./FilterBar.svelte";
  import PRList from "./PRList.svelte";
  import { filteredMyPRs, filteredReviewRequestedPRs, isLoading, startPolling } from "../lib/stores/prs";
  import { username, logout } from "../lib/stores/auth";
  import { loadSettings } from "../lib/stores/settings";

  let activeTab: "my-prs" | "review-requests" = $state("my-prs");
  let showSettings = $state(false);
  let stopPolling: (() => void) | null = null;

  onMount(async () => {
    await loadSettings();
    stopPolling = startPolling();
  });

  onDestroy(() => {
    stopPolling?.();
  });
</script>

<div class="dashboard">
  <header class="title-bar">
    <span class="app-title">PR Dashboard</span>
    <div class="header-actions">
      <span class="username">{$username}</span>
      {#if $isLoading}
        <span class="loading-indicator">↻</span>
      {/if}
      <button class="icon-btn" onclick={() => (showSettings = !showSettings)} title="Settings">
        ⚙️
      </button>
    </div>
  </header>

  {#if showSettings}
    {#await import("./Settings.svelte") then { default: Settings }}
      <Settings onclose={() => (showSettings = false)} />
    {/await}
  {:else}
    <TabBar bind:activeTab />
    <FilterBar />
    {#if activeTab === "my-prs"}
      <PRList prs={$filteredMyPRs} mode="my-prs" />
    {:else}
      <PRList prs={$filteredReviewRequestedPRs} mode="review-requests" />
    {/if}
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #0d1117;
    color: #c9d1d9;
  }

  .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    -webkit-app-region: drag;
  }

  .app-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: #e6edf3;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    -webkit-app-region: no-drag;
  }

  .username {
    font-size: 0.8rem;
    color: #8b949e;
  }

  .loading-indicator {
    animation: spin 1s linear infinite;
    font-size: 0.9rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
  }
</style>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add dashboard UI components (tabs, filter, PR cards, list)"
```

---

## Task 10: Settings Component

설정 화면 UI.

**Files:**
- Create: `src/components/Settings.svelte`

- [ ] **Step 1: Settings 컴포넌트 작성**

`src/components/Settings.svelte`:

```svelte
<script lang="ts">
  import { settings, updateSettings } from "../lib/stores/settings";
  import { username, logout } from "../lib/stores/auth";

  let { onclose }: { onclose: () => void } = $props();

  function handlePollingChange(e: Event) {
    const value = Number((e.target as HTMLSelectElement).value);
    updateSettings({ pollingIntervalMinutes: value });
  }

  function handleCloseActionChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value === "tray";
    updateSettings({ closeToTray: value });
  }

  async function handleLogout() {
    await logout();
  }
</script>

<div class="settings">
  <div class="settings-header">
    <h2>Settings</h2>
    <button class="close-btn" onclick={onclose}>✕</button>
  </div>

  <div class="settings-body">
    <section class="setting-group">
      <h3>Account</h3>
      <div class="setting-row">
        <span class="setting-label">Logged in as</span>
        <span class="setting-value">{$username}</span>
      </div>
      <button class="logout-btn" onclick={handleLogout}>Sign out</button>
    </section>

    <section class="setting-group">
      <h3>Polling</h3>
      <div class="setting-row">
        <label for="polling-interval">Refresh interval</label>
        <select id="polling-interval" value={$settings.pollingIntervalMinutes} onchange={handlePollingChange}>
          <option value={1}>1 min</option>
          <option value={3}>3 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
        </select>
      </div>
    </section>

    <section class="setting-group">
      <h3>Notifications</h3>
      <div class="setting-row">
        <label for="notify-review">New reviews</label>
        <input
          id="notify-review"
          type="checkbox"
          checked={$settings.notifyOnNewReview}
          onchange={() => updateSettings({ notifyOnNewReview: !$settings.notifyOnNewReview })}
        />
      </div>
      <div class="setting-row">
        <label for="notify-request">Review requests</label>
        <input
          id="notify-request"
          type="checkbox"
          checked={$settings.notifyOnReviewRequest}
          onchange={() => updateSettings({ notifyOnReviewRequest: !$settings.notifyOnReviewRequest })}
        />
      </div>
    </section>

    <section class="setting-group">
      <h3>Behavior</h3>
      <div class="setting-row">
        <label for="autostart">Launch at startup</label>
        <input
          id="autostart"
          type="checkbox"
          checked={$settings.autoStart}
          onchange={() => updateSettings({ autoStart: !$settings.autoStart })}
        />
      </div>
      <div class="setting-row">
        <label for="close-action">On close</label>
        <select id="close-action" value={$settings.closeToTray ? "tray" : "quit"} onchange={handleCloseActionChange}>
          <option value="tray">Minimize to tray</option>
          <option value="quit">Quit</option>
        </select>
      </div>
      <div class="setting-row">
        <label for="tray-count">Show count in tray</label>
        <input
          id="tray-count"
          type="checkbox"
          checked={$settings.trayShowCount}
          onchange={() => updateSettings({ trayShowCount: !$settings.trayShowCount })}
        />
      </div>
    </section>
  </div>
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #30363d;
  }

  .settings-header h2 {
    font-size: 0.9rem;
    color: #e6edf3;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #8b949e;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
  }

  .settings-body {
    padding: 1rem;
  }

  .setting-group {
    margin-bottom: 1.5rem;
  }

  .setting-group h3 {
    font-size: 0.8rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    font-size: 0.85rem;
  }

  .setting-label {
    color: #c9d1d9;
  }

  .setting-value {
    color: #58a6ff;
    font-weight: 600;
  }

  select, input[type="checkbox"] {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  .logout-btn {
    background: #da3633;
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .logout-btn:hover {
    background: #f85149;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Settings.svelte
git commit -m "feat: add settings component"
```

---

## Task 11: App Root & Global Styles

루트 App.svelte에서 인증 분기 처리, 글로벌 CSS.

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/app.css`

- [ ] **Step 1: App.svelte 수정**

`src/App.svelte`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { isAuthenticated, restoreSession } from "./lib/stores/auth";
  import Login from "./components/Login.svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import "./app.css";

  let ready = $state(false);

  onMount(async () => {
    await restoreSession();
    ready = true;
  });
</script>

{#if !ready}
  <div class="splash">Loading...</div>
{:else if $isAuthenticated}
  <Dashboard />
{:else}
  <Login />
{/if}

<style>
  .splash {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0d1117;
    color: #8b949e;
    font-size: 0.9rem;
  }
</style>
```

- [ ] **Step 2: Global CSS**

`src/app.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  background: #0d1117;
  color: #c9d1d9;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.svelte src/app.css
git commit -m "feat: add app root with auth routing and global styles"
```

---

## Task 12: System Tray / macOS Menu Bar (Rust)

Rust에서 시스템 트레이 설정. macOS에서는 메뉴바 아이콘으로 동작.

**Files:**
- Create: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: tray 모듈 작성**

`src-tauri/src/tray.rs`:

```rust
use tauri::{
    AppHandle, Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(app, "open", "Open Dashboard", true, None::<&str>)?;
    let refresh_item = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_item, &refresh_item, &quit_item])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("PR Dashboard")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "refresh" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("refresh-prs", ());
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
pub fn update_tray_title(app: AppHandle, title: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some(&title));
    }
}
```

- [ ] **Step 2: lib.rs에 tray 등록**

`src-tauri/src/lib.rs`를 수정:

```rust
mod auth;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 트레이로 최소화 (기본 동작, 설정에서 변경 가능)
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            auth::start_oauth,
            tray::update_tray_title,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Rust 빌드 확인**

```bash
cd src-tauri && cargo check && cd ..
```

Expected: 컴파일 성공

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/tray.rs src-tauri/src/lib.rs
git commit -m "feat: add system tray with macOS menu bar support"
```

---

## Task 13: Tauri Config & Final Wiring

Tauri 설정 파일 최종 구성 및 앱 윈도우 설정.

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: tauri.conf.json 설정**

`src-tauri/tauri.conf.json`의 핵심 설정을 다음과 같이 조정한다:

```json
{
  "$schema": "https://raw.githubusercontent.com/nicegram/nicegram-web/refs/heads/master/nicegram-deeplinks/node_modules/@anthropic-ai/sdk/tauri.conf.json",
  "productName": "PR Dashboard",
  "version": "0.1.0",
  "identifier": "com.pr-dashboard.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "PR Dashboard",
        "width": 480,
        "height": 720,
        "resizable": true,
        "minWidth": 400,
        "minHeight": 500,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://api.github.com https://github.com; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

참고: `$schema` URL은 Tauri가 생성한 실제 스키마 경로로 교체한다. 위 JSON은 핵심 필드만 보여준다. 기존 `tauri.conf.json`에서 `productName`, `identifier`, `app.windows`, `app.security.csp` 부분만 수정하면 된다.

- [ ] **Step 2: 앱 전체 빌드 확인**

```bash
npm run tauri build -- --debug
```

Expected: 빌드 성공, `.app` 또는 `.dmg` 생성

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: configure Tauri window and security settings"
```

---

## Task 14: Integration Test — Full App Smoke Test

앱이 정상적으로 시작되고 로그인 화면이 표시되는지 수동 확인.

- [ ] **Step 1: dev 모드로 앱 실행**

```bash
npm run tauri dev
```

Expected: 앱 윈도우가 열리고 "PR Dashboard" 로그인 화면이 표시됨

- [ ] **Step 2: 전체 테스트 스위트 실행**

```bash
npx vitest run
```

Expected: 모든 유닛 테스트 통과

- [ ] **Step 3: Commit (최종 정리)**

남아있는 미추가 파일이 있으면 커밋:

```bash
git add -A
git commit -m "chore: final cleanup and verify all tests pass"
```
