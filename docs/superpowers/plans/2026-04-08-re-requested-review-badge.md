# Re-requested Review Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** My PRs 탭에서 리뷰 재요청된 리뷰어의 뱃지를 `⏳ reviewer (prev: ❌ Changes requested)` 형태로 표시한다.

**Architecture:** `MY_PRS_QUERY`에 `reviewRequests` 필드를 추가하고, `Review` 타입에 `reRequested` 플래그를 도입하여 파서→상태계산→UI 전체 흐름에 반영한다. TDD로 진행.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, Vitest, GitHub GraphQL API

---

### Task 1: Review 타입에 reRequested 필드 추가

**Files:**
- Modify: `src/lib/types.ts:12-16`

- [ ] **Step 1: `Review` interface에 `reRequested` 필드 추가**

```typescript
export interface Review {
  author: string;
  state: ReviewState;
  submittedAt: string;
  reRequested: boolean;
}
```

- [ ] **Step 2: 타입 체크 실행하여 깨지는 곳 확인**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40`
Expected: `parseMyPRs`, `parseReviewRequestedPRs`에서 `reRequested` 누락 에러

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "chore: Review 타입에 reRequested 필드 추가"
```

---

### Task 2: computeReviewStatus에서 reRequested 처리 (TDD)

**Files:**
- Modify: `src/lib/utils.ts:23-45`
- Modify: `tests/lib/utils.test.ts`

- [ ] **Step 1: reRequested 케이스 failing 테스트 작성**

`tests/lib/utils.test.ts`의 `describe("computeReviewStatus")` 블록 끝에 추가:

```typescript
  it("treats changes_requested as pending when reRequested is true", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: true },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("approved");
  });

  it("treats approved as pending when reRequested is true", () => {
    const reviews = [
      { author: "kim", state: "APPROVED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: true },
    ];
    expect(computeReviewStatus(reviews)).toBe("pending");
  });

  it("returns changes_requested when reRequested is false", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: false },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("changes_requested");
  });

  it("returns pending when all reviewers are reRequested", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: true },
      { author: "lee", state: "COMMENTED" as const, submittedAt: "2026-03-26T11:00:00Z", reRequested: true },
    ];
    expect(computeReviewStatus(reviews)).toBe("pending");
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/utils.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: 새 4개 테스트 FAIL (reRequested 무시하므로)

- [ ] **Step 3: RawReview에 reRequested 추가 및 computeReviewStatus 수정**

`src/lib/utils.ts`에서 `RawReview` 인터페이스와 `computeReviewStatus` 수정:

```typescript
interface RawReview {
  author: string;
  state: string;
  submittedAt: string;
  reRequested?: boolean;
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

  const active = [...latestByAuthor.values()].filter((r) => !r.reRequested);
  if (active.length === 0) return "pending";

  const states = active.map((r) => r.state);
  if (states.some((s) => s === "CHANGES_REQUESTED")) return "changes_requested";
  if (states.every((s) => s === "APPROVED")) return "approved";
  if (states.some((s) => s === "COMMENTED")) return "commented";
  return "pending";
}
```

핵심: `reRequested`인 리뷰어를 `active`에서 제외하고, 나머지만으로 판정.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/lib/utils.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: 전체 PASS (기존 테스트는 `reRequested` 없이 호출 → `undefined` → `!undefined` = `true` → 필터 통과 → 기존 동작 유지)

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts tests/lib/utils.test.ts
git commit -m "feat: computeReviewStatus에서 reRequested 리뷰어 제외"
```

---

### Task 3: MY_PRS_QUERY에 reviewRequests 추가 및 parseMyPRs 수정 (TDD)

**Files:**
- Modify: `src/lib/github/queries.ts:4-40` (쿼리), `src/lib/github/queries.ts:211-255` (파서)
- Modify: `tests/lib/github/queries.test.ts`

- [ ] **Step 1: parseMyPRs 테스트에 reviewRequests mock 데이터 추가 및 기대값 수정**

`tests/lib/github/queries.test.ts` 수정:

`MOCK_MY_PRS_RESPONSE`의 첫 번째 노드(PR_1)에 `reviewRequests` 추가 — `kim`이 재요청된 상태:

```typescript
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
        reviewRequests: {
          nodes: [
            { requestedReviewer: { login: "kim" } },
          ],
        },
        commits: {
          totalCount: 3,
          nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }],
        },
        mergeable: "MERGEABLE",
        baseRefName: "develop",
        headRefName: "fix/login-bug",
        isDraft: false,
        labels: { nodes: [{ name: "bug", color: "d73a4a" }] },
        reviewThreads: { nodes: [{ isResolved: true }, { isResolved: false }, { isResolved: false }] },
        additions: 42,
        deletions: 8,
        changedFiles: 5,
      },
      {
        id: "PR_2",
        title: "feat: profile page",
        url: "https://github.com/personal/frontend/pull/10",
        repository: { nameWithOwner: "personal/frontend", owner: { login: "personal" } },
        createdAt: "2026-03-24T10:00:00Z",
        updatedAt: "2026-03-26T05:00:00Z",
        reviews: { nodes: [] },
        reviewRequests: { nodes: [] },
        commits: {
          totalCount: 1,
          nodes: [{ commit: { statusCheckRollup: null } }],
        },
        mergeable: "CONFLICTING",
        baseRefName: "main",
        headRefName: "feat/profile-page",
        isDraft: true,
        labels: { nodes: [] },
        reviewThreads: { nodes: [] },
        additions: 12,
        deletions: 4,
        changedFiles: 2,
      },
    ],
  },
};
```

기대값 수정 — `reviews` 배열에 `reRequested` 추가, `kim`의 `reviewStatus`가 `approved`로 변경:

```typescript
describe("parseMyPRs", () => {
  it("parses GraphQL response into MyPR array", () => {
    const result = parseMyPRs(MOCK_MY_PRS_RESPONSE.search.nodes);
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
        { author: "kim", state: "changes_requested", submittedAt: "2026-03-26T09:00:00Z", reRequested: true },
        { author: "lee", state: "approved", submittedAt: "2026-03-26T10:00:00Z", reRequested: false },
      ],
      reviewStatus: "approved",
      ciStatus: "success",
      baseRef: "develop",
      headRef: "fix/login-bug",
      labels: [{ name: "bug", color: "d73a4a" }],
      unresolvedThreads: 2,
      additions: 42,
      deletions: 8,
      changedFiles: 5,
      isDraft: false,
      mergeable: "mergeable",
      commitCount: 3,
    });

    expect(result[1].reviewStatus).toBe("pending");
    expect(result[1].ciStatus).toBeNull();
    expect(result[1].isDraft).toBe(true);
    expect(result[1].mergeable).toBe("conflicting");
    expect(result[1].unresolvedThreads).toBe(0);
    expect(result[1].labels).toEqual([]);
  });
});
```

핵심 변경: `kim`이 `reRequested: true`이므로 `computeReviewStatus`에서 제외 → `lee`의 `APPROVED`만 남음 → 전체 `reviewStatus`는 `"approved"`.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/lib/github/queries.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `parseMyPRs`가 아직 `reviewRequests`를 처리하지 않고 `reRequested` 필드도 없음

- [ ] **Step 3: MY_PRS_QUERY에 reviewRequests 추가**

`src/lib/github/queries.ts`의 `MY_PRS_QUERY`에서 `changedFiles` 뒤에 추가:

```graphql
          reviewRequests(first: 20) {
            nodes {
              requestedReviewer {
                ... on User { login }
                ... on Team { name }
              }
            }
          }
```

- [ ] **Step 4: parseMyPRs에서 reviewRequests 처리**

`src/lib/github/queries.ts`의 `parseMyPRs` 함수 수정. `return nodes.filter(...)map(...)` 내부에서 `latestByAuthor` 맵 생성 후, `reRequested` 플래그를 설정:

```typescript
export function parseMyPRs(nodes: any[]): MyPR[] {
  return nodes
    .filter((node: any) => node.id)
    .map((node: any) => {
      const rawNodes = node.reviews?.nodes ?? [];
      const mapped = rawNodes.map((r: any) => ({
        author: r.author?.login ?? "unknown",
        state: r.state as string,
        submittedAt: r.submittedAt as string,
      }));

      // reviewRequests에서 재요청된 리뷰어 목록 추출
      const requestedReviewers = new Set<string>(
        (node.reviewRequests?.nodes ?? [])
          .map((rr: any) => rr.requestedReviewer?.login ?? rr.requestedReviewer?.name)
          .filter(Boolean)
      );

      const latestByAuthor = new Map<string, Review>();
      for (const r of mapped) {
        const review: Review = {
          ...r,
          state: normalizeReviewState(r.state),
          reRequested: requestedReviewers.has(r.author),
        };
        latestByAuthor.set(r.author, review);
      }
      const reviews: Review[] = [...latestByAuthor.values()];

      // computeReviewStatus에 reRequested 정보 전달
      const rawWithReRequested = mapped.map((r) => ({
        ...r,
        reRequested: requestedReviewers.has(r.author),
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
        reviewStatus: computeReviewStatus(rawWithReRequested),
        ciStatus,
        baseRef: node.baseRefName ?? "main",
        headRef: node.headRefName ?? "",
        labels: (node.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
        unresolvedThreads: (node.reviewThreads?.nodes ?? []).filter((t: any) => !t.isResolved).length,
        additions: node.additions ?? 0,
        deletions: node.deletions ?? 0,
        changedFiles: node.changedFiles ?? 0,
        isDraft: node.isDraft ?? false,
        mergeable: normalizeMergeableState(node.mergeable),
        commitCount: node.commits?.totalCount ?? 0,
      };
    });
}
```

- [ ] **Step 5: parseReviewRequestedPRs에 reRequested 기본값 추가**

같은 파일의 `parseReviewRequestedPRs`에서 `otherReviews` 매핑에 `reRequested: false` 추가:

```typescript
      const otherReviews: Review[] = rawNodes
        .filter((r: any) => r.author?.login && r.author.login !== username)
        .map((r: any) => ({
          author: r.author.login,
          state: normalizeReviewState(r.state),
          submittedAt: r.submittedAt,
          reRequested: false,
        }));
```

- [ ] **Step 6: parseReviewRequestedPRs 테스트 기대값에 reRequested 추가**

`tests/lib/github/queries.test.ts`의 `parseReviewRequestedPRs` 테스트에서 `reviews` 기대값 수정:

```typescript
      reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T05:00:00Z", reRequested: false },
        { author: "lee", state: "commented", submittedAt: "2026-03-26T04:00:00Z", reRequested: false },
      ],
```

- [ ] **Step 7: 전체 테스트 통과 확인**

Run: `npx vitest run tests/lib/github/queries.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: 전체 PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/github/queries.ts tests/lib/github/queries.test.ts
git commit -m "feat: MY_PRS_QUERY에 reviewRequests 추가, 재요청 리뷰어 감지"
```

---

### Task 4: PRCard UI — 재요청 리뷰어 뱃지 표시

**Files:**
- Modify: `src/lib/components/PRCard.svelte:2,90-100`

- [ ] **Step 1: PRCard에서 STATUS_LABELS import 추가**

`src/lib/components/PRCard.svelte`의 import문 수정:

```typescript
  import { relativeTime, formatDate, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, hexToRgb, labelTextColor, entityBadgeStyle } from "$lib/utils";
```

`STATUS_LABELS`는 이미 import되어 있으므로 확인만 한다. (현재 line 6에 이미 포함됨)

- [ ] **Step 2: My PRs 모드의 리뷰어 뱃지 렌더링 수정**

`src/lib/components/PRCard.svelte`의 My PRs 모드 리뷰어 섹션 (line 90-100) 수정:

```svelte
    {#if mode === "my-prs"}
      <div class="reviewers">
        {#each (pr as MyPR).reviews as review}
          <span class="reviewer">
            {#if review.reRequested}
              ⏳ {review.author}
              <span class="previous-review">
                (prev: {STATUS_ICONS[review.state]} {STATUS_LABELS[review.state]})
              </span>
            {:else}
              {STATUS_ICONS[review.state]} {review.author}
            {/if}
          </span>
        {/each}
        {#if (pr as MyPR).reviews.length === 0}
          <span class="no-reviews">No reviews yet</span>
        {/if}
      </div>
```

`.previous-review` 스타일은 이미 PRCard.svelte:301에 `color: #656d76`으로 정의되어 있으므로 재사용.

- [ ] **Step 3: 전체 테스트 통과 확인**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: 전체 PASS

- [ ] **Step 4: 타입 체크 통과 확인**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -10`
Expected: 에러 없음

- [ ] **Step 5: 개발 서버에서 시각적 확인**

Run: `npm run dev`
확인 사항:
- My PRs 탭에서 재요청된 리뷰어가 `⏳ reviewer (prev: ❌ Changes requested)` 형태로 표시되는지
- 상태 바 색상이 재요청 후 변경되는지 (CHANGES_REQUESTED 빨강 → 다른 색)
- Review Requests 탭은 기존과 동일하게 동작하는지

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/PRCard.svelte
git commit -m "feat: My PRs 탭에서 재요청 리뷰어 뱃지 표시 (prev 상태 포함)"
```

---

### Task 5: CLAUDE.md 업데이트

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Known Gotchas에 reviewRequests 관련 항목 추가**

`CLAUDE.md`의 Known Gotchas 섹션 끝에 추가:

```markdown
- My PRs 탭에서 리뷰 재요청 감지는 `reviewRequests` GraphQL 필드 기반. `reviews`에는 재요청이 반영되지 않으므로, `Review.reRequested`로 교차 매칭하여 `computeReviewStatus`에서 해당 리뷰어를 pending으로 취급
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md에 reviewRequests 재요청 감지 메커니즘 문서화"
```
