# PR Card Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR 카드에 머지 가능 여부, 코멘트 수, 라벨, 변경 규모, base branch 정보를 compact하게 추가한다.

**Architecture:** types.ts에 새 타입/필드 추가 → GraphQL 쿼리 확장 → 파서 수정 → utils에 라벨 색상 유틸 추가 → PRCard UI 확장. 기존 코드 패턴(normalizeXxx 함수, STATUS_XXX 상수)을 따른다.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, GitHub GraphQL API, Vitest

---

### Task 1: 타입 확장

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Label, MergeableState 타입 및 MyPR/ReviewRequestedPR 필드 추가**

```typescript
// src/lib/types.ts — 기존 타입 뒤에 추가

export interface Label {
  name: string;
  color: string; // hex without # (e.g. "d73a4a")
}

export type MergeableState = "mergeable" | "conflicting" | "unknown";
```

`MyPR` 인터페이스에 필드 추가 (`ciStatus` 뒤):

```typescript
  baseRef: string;
  labels: Label[];
  unresolvedThreads: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  isDraft: boolean;
  mergeable: MergeableState;
```

`ReviewRequestedPR` 인터페이스에 필드 추가 (`previousReviewStatus` 뒤):

```typescript
  baseRef: string;
  labels: Label[];
  unresolvedThreads: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  isDraft: boolean;
  mergeable: MergeableState;
  ciStatus: CIStatus;
```

- [ ] **Step 2: 타입 체크 실행**

Run: `npm run check`
Expected: queries.ts, PRCard.svelte 등에서 새 필드 누락 에러 발생 (아직 구현 전이므로 정상). types.ts 자체에는 에러 없어야 함.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/types.ts
git commit -m "feat: PR 카드 강화를 위한 타입 확장 (Label, MergeableState, 새 필드)"
```

---

### Task 2: GraphQL 쿼리 확장

**Files:**
- Modify: `src/lib/github/queries.ts`

- [ ] **Step 1: MY_PRS_QUERY에 새 필드 추가**

`commits(last: 1)` 블록 뒤에 추가:

```graphql
          mergeable
          baseRefName
          isDraft
          labels(first: 10) {
            nodes { name color }
          }
          reviewThreads(first: 50) {
            nodes { isResolved }
          }
          additions
          deletions
          changedFiles
```

- [ ] **Step 2: REVIEW_REQUESTED_QUERY에 새 필드 추가**

`reviews(last: 20)` 블록 뒤에 추가 (commits 포함):

```graphql
          commits(last: 1) {
            nodes { commit { statusCheckRollup { state } } }
          }
          mergeable
          baseRefName
          isDraft
          labels(first: 10) {
            nodes { name color }
          }
          reviewThreads(first: 50) {
            nodes { isResolved }
          }
          additions
          deletions
          changedFiles
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/github/queries.ts
git commit -m "feat: GraphQL 쿼리에 mergeable, labels, threads, diff 필드 추가"
```

---

### Task 3: 파서 함수 수정 + 테스트

**Files:**
- Modify: `src/lib/github/queries.ts`
- Modify: `tests/lib/github/queries.test.ts`

- [ ] **Step 1: normalizeMergeableState 함수 추가**

`queries.ts`의 `normalizeCIStatus` 함수 뒤에:

```typescript
function normalizeMergeableState(state: string | null): MergeableState {
  const map: Record<string, MergeableState> = {
    MERGEABLE: "mergeable",
    CONFLICTING: "conflicting",
    UNKNOWN: "unknown",
  };
  return map[state ?? ""] ?? "unknown";
}
```

import에 `MergeableState, Label` 추가:

```typescript
import type { MyPR, ReviewRequestedPR, Review, ReviewState, CIStatus, MergeableState, Label } from "../types";
```

- [ ] **Step 2: parseMyPRs에 새 필드 매핑 추가**

`parseMyPRs`의 return 객체에 추가 (`ciStatus` 뒤):

```typescript
        baseRef: node.baseRefName ?? "main",
        labels: (node.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
        unresolvedThreads: (node.reviewThreads?.nodes ?? []).filter((t: any) => !t.isResolved).length,
        additions: node.additions ?? 0,
        deletions: node.deletions ?? 0,
        changedFiles: node.changedFiles ?? 0,
        isDraft: node.isDraft ?? false,
        mergeable: normalizeMergeableState(node.mergeable),
```

- [ ] **Step 3: parseReviewRequestedPRs에 새 필드 + ciStatus 매핑 추가**

`parseReviewRequestedPRs`의 map 콜백 안에서, `myReviews` 로직 뒤에 CI 파싱 추가:

```typescript
      const commitNode = node.commits?.nodes?.[0]?.commit;
      const ciStatus = normalizeCIStatus(commitNode?.statusCheckRollup ?? null);
```

return 객체에 추가 (`previousReviewStatus` 뒤):

```typescript
        baseRef: node.baseRefName ?? "main",
        labels: (node.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
        unresolvedThreads: (node.reviewThreads?.nodes ?? []).filter((t: any) => !t.isResolved).length,
        additions: node.additions ?? 0,
        deletions: node.deletions ?? 0,
        changedFiles: node.changedFiles ?? 0,
        isDraft: node.isDraft ?? false,
        mergeable: normalizeMergeableState(node.mergeable),
        ciStatus,
```

- [ ] **Step 4: 테스트 mock 데이터에 새 필드 추가**

`MOCK_MY_PRS_RESPONSE`의 첫 번째 node(PR_1)에 추가 (`commits` 뒤):

```typescript
        mergeable: "MERGEABLE",
        baseRefName: "develop",
        isDraft: false,
        labels: { nodes: [{ name: "bug", color: "d73a4a" }] },
        reviewThreads: { nodes: [{ isResolved: true }, { isResolved: false }, { isResolved: false }] },
        additions: 42,
        deletions: 8,
        changedFiles: 5,
```

두 번째 node(PR_2)에 추가 (`commits` 뒤):

```typescript
        mergeable: "CONFLICTING",
        baseRefName: "main",
        isDraft: true,
        labels: { nodes: [] },
        reviewThreads: { nodes: [] },
        additions: 12,
        deletions: 4,
        changedFiles: 2,
```

`MOCK_REVIEW_REQUESTED_RESPONSE`의 PR_3 node에 추가 (`reviews` 뒤):

```typescript
        commits: { nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
        mergeable: "MERGEABLE",
        baseRefName: "main",
        isDraft: false,
        labels: { nodes: [{ name: "feature", color: "a2eeef" }] },
        reviewThreads: { nodes: [{ isResolved: false }] },
        additions: 65,
        deletions: 20,
        changedFiles: 4,
```

두 번째 테스트("returns null previousReviewStatus")의 mock node에도 추가:

```typescript
          commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
          mergeable: "UNKNOWN",
          baseRefName: "develop",
          isDraft: false,
          labels: { nodes: [] },
          reviewThreads: { nodes: [] },
          additions: 0,
          deletions: 0,
          changedFiles: 0,
```

- [ ] **Step 5: 테스트 expected 값 업데이트**

parseMyPRs 테스트의 `result[0]` expected에 추가:

```typescript
      baseRef: "develop",
      labels: [{ name: "bug", color: "d73a4a" }],
      unresolvedThreads: 2,
      additions: 42,
      deletions: 8,
      changedFiles: 5,
      isDraft: false,
      mergeable: "mergeable",
```

`result[1]` 검증 추가:

```typescript
    expect(result[1].isDraft).toBe(true);
    expect(result[1].mergeable).toBe("conflicting");
    expect(result[1].unresolvedThreads).toBe(0);
    expect(result[1].labels).toEqual([]);
```

parseReviewRequestedPRs 첫 번째 테스트의 expected에 추가:

```typescript
      baseRef: "main",
      labels: [{ name: "feature", color: "a2eeef" }],
      unresolvedThreads: 1,
      additions: 65,
      deletions: 20,
      changedFiles: 4,
      isDraft: false,
      mergeable: "mergeable",
      ciStatus: "success",
```

두 번째 테스트에 검증 추가:

```typescript
    expect(result[0].ciStatus).toBeNull();
    expect(result[0].mergeable).toBe("unknown");
```

- [ ] **Step 6: 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 7: 커밋**

```bash
git add src/lib/github/queries.ts tests/lib/github/queries.test.ts
git commit -m "feat: 파서에 mergeable, labels, threads, diff 필드 매핑 추가"
```

---

### Task 4: notification 테스트 mock 업데이트

**Files:**
- Modify: `tests/lib/notifications.test.ts`

- [ ] **Step 1: ReviewRequestedPR mock 객체에 새 필드 추가**

`notifications.test.ts`에서 `ReviewRequestedPR` mock 객체가 2개 있음. 둘 다에 `previousReviewStatus` 뒤에 추가:

```typescript
      baseRef: "main", labels: [], unresolvedThreads: 0, additions: 0, deletions: 0, changedFiles: 0, isDraft: false, mergeable: "mergeable" as const, ciStatus: null,
```

- [ ] **Step 2: 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 3: 커밋**

```bash
git add tests/lib/notifications.test.ts
git commit -m "test: notification 테스트 mock에 PR 카드 새 필드 추가"
```

---

### Task 5: 라벨 텍스트 색상 유틸 추가

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `tests/lib/utils.test.ts`

- [ ] **Step 1: 테스트 먼저 작성**

`tests/lib/utils.test.ts`에 추가:

```typescript
import { labelTextColor } from "../../src/lib/utils";

describe("labelTextColor", () => {
  it("returns dark text for light background", () => {
    expect(labelTextColor("f9d0c4")).toBe("#24292f");
  });

  it("returns light text for dark background", () => {
    expect(labelTextColor("0e8a16")).toBe("#ffffff");
  });

  it("returns light text for very dark color", () => {
    expect(labelTextColor("000000")).toBe("#ffffff");
  });

  it("returns dark text for white", () => {
    expect(labelTextColor("ffffff")).toBe("#24292f");
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test`
Expected: `labelTextColor` 관련 테스트 실패

- [ ] **Step 3: 유틸 함수 구현**

`src/lib/utils.ts`에 추가:

```typescript
export function labelTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  // W3C relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#24292f" : "#ffffff";
}
```

- [ ] **Step 4: 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add src/lib/utils.ts tests/lib/utils.test.ts
git commit -m "feat: 라벨 텍스트 색상 결정 유틸 (labelTextColor) 추가"
```

---

### Task 6: PRCard UI 확장

**Files:**
- Modify: `src/lib/components/PRCard.svelte`

- [ ] **Step 1: import 및 script 업데이트**

```svelte
<script lang="ts">
  import type { MyPR, ReviewRequestedPR, Label } from "$lib/types";
  import { relativeTime, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, labelTextColor } from "$lib/utils";

  let { pr, mode }: { pr: MyPR | ReviewRequestedPR; mode: "my-prs" | "review-requests" } = $props();

  function getBarColor(): string {
    if (mode === "my-prs") {
      return STATUS_COLORS[(pr as MyPR).reviewStatus];
    }
    const prev = (pr as ReviewRequestedPR).previousReviewStatus;
    return STATUS_COLORS[prev ?? "pending"];
  }

  function handleClick() {
    window.open(pr.url, "_blank");
  }

  function labelStyle(label: Label): string {
    const bg = `rgba(${parseInt(label.color.slice(0, 2), 16)}, ${parseInt(label.color.slice(2, 4), 16)}, ${parseInt(label.color.slice(4, 6), 16)}, 0.2)`;
    const border = `rgba(${parseInt(label.color.slice(0, 2), 16)}, ${parseInt(label.color.slice(2, 4), 16)}, ${parseInt(label.color.slice(4, 6), 16)}, 0.3)`;
    const text = labelTextColor(label.color);
    return `background: ${bg}; border-color: ${border}; color: ${text}`;
  }
</script>
```

- [ ] **Step 2: 카드 header에 Draft 뱃지 추가**

`.card-header` 내부 변경:

```svelte
    <div class="card-header">
      <span class="pr-title">{pr.title}</span>
      {#if pr.isDraft}
        <span class="draft-badge">Draft</span>
      {/if}
    </div>
```

- [ ] **Step 3: 메타 줄에 baseRef 추가**

`.card-meta` 변경:

```svelte
    <div class="card-meta">
      <span class="repo">{pr.repo}</span>
      <span class="base-ref">← {pr.baseRef}</span>
      {#if mode === "review-requests" && "author" in pr}
        <span class="separator">·</span>
        <span class="author">by {pr.author}</span>
      {/if}
      <span class="separator">·</span>
      <span class="time">{relativeTime(pr.updatedAt)}</span>
    </div>
```

- [ ] **Step 4: 상태 줄 추가 (리뷰어/my-review-status 블록 뒤에)**

기존 `{/if}` (mode 분기 닫는 부분) 뒤, `</div>` (card-content 닫는 부분) 전에 추가:

```svelte
    <div class="status-line">
      {#if pr.isDraft}
        <span class="merge-status draft">● Draft</span>
      {:else if pr.mergeable === "mergeable"}
        <span class="merge-status mergeable">● Mergeable</span>
      {:else if pr.mergeable === "conflicting"}
        <span class="merge-status conflicting">● Conflict</span>
      {:else}
        <span class="merge-status checking">● Checking...</span>
      {/if}
      {#if "ciStatus" in pr && pr.ciStatus}
        <span class="dot-sep">·</span>
        {#if pr.ciStatus === "success"}
          <span class="ci success">✓ CI passed</span>
        {:else if pr.ciStatus === "failure"}
          <span class="ci failure">✗ CI failed</span>
        {:else}
          <span class="ci pending">● CI running</span>
        {/if}
      {/if}
      {#if pr.unresolvedThreads > 0}
        <span class="dot-sep">·</span>
        <span class="threads">💬 {pr.unresolvedThreads}</span>
      {/if}
      <span class="dot-sep">·</span>
      <span class="diff-stat">
        <span class="additions">+{pr.additions}</span>
        <span class="deletions">-{pr.deletions}</span>
        <span class="dot-sep">·</span>
        <span class="files">{pr.changedFiles} {pr.changedFiles === 1 ? "file" : "files"}</span>
      </span>
    </div>
    {#if pr.labels.length > 0}
      <div class="labels">
        {#each pr.labels as label}
          <span class="label" style={labelStyle(label)}>{label.name}</span>
        {/each}
      </div>
    {/if}
```

- [ ] **Step 5: 스타일 추가**

`<style>` 블록에 추가:

```css
  .card-header {
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .draft-badge {
    font-size: 11px;
    color: #8b949e;
    background: rgba(139, 148, 158, 0.15);
    border: 1px solid rgba(139, 148, 158, 0.25);
    padding: 0.0625rem 0.375rem;
    border-radius: 10px;
    white-space: nowrap;
    font-weight: 500;
    flex-shrink: 0;
  }

  .card-meta .base-ref {
    color: #656d76;
  }

  .card-meta .separator {
    color: #30363d;
  }

  .status-line {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 11px;
    color: #8b949e;
    margin-top: 0.5rem;
  }

  .merge-status {
    font-weight: 500;
  }
  .merge-status.mergeable { color: #3fb950; }
  .merge-status.conflicting { color: #f85149; }
  .merge-status.checking { color: #d29922; }
  .merge-status.draft { color: #8b949e; }

  .ci.success { color: #3fb950; }
  .ci.failure { color: #f85149; }
  .ci.pending { color: #d29922; }

  .threads { color: #d29922; }

  .dot-sep {
    color: #30363d;
    font-size: 10px;
  }

  .diff-stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .additions { color: #3fb950; font-weight: 600; }
  .deletions { color: #f85149; font-weight: 600; }
  .files { color: #8b949e; }

  .labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3125rem;
    margin-top: 0.375rem;
  }

  .label {
    font-size: 11px;
    font-weight: 500;
    padding: 0.0625rem 0.4375rem;
    border-radius: 10px;
    line-height: 1.5;
    border: 1px solid transparent;
  }
```

기존 `.card-header` 스타일에서 중복 제거 — 기존 `margin-bottom: 0.375rem`을 위의 새 스타일로 교체.

기존 `.card-meta`의 `margin-bottom`을 `0.625rem`으로 줄임.

기존 `.reviewers, .my-review-status`에 `margin-bottom: 0`으로 설정 (status-line이 아래에 오므로).

- [ ] **Step 6: 빌드 확인**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add src/lib/components/PRCard.svelte
git commit -m "feat: PR 카드에 머지 상태, CI, 코멘트, diff, 라벨 표시 추가"
```

---

### Task 7: stores 필터 정렬 호환성 확인 + 통합 테스트

**Files:**
- Modify: `tests/lib/stores/filters.test.ts` (mock 데이터에 새 필드 추가 필요시)

- [ ] **Step 1: filters 테스트의 mock PR 데이터에 새 필드 추가**

`tests/lib/stores/filters.test.ts`를 열어서 `MyPR` / `ReviewRequestedPR` mock 객체에 새 필드 추가. 패턴은 Task 4와 동일:

MyPR mock에:
```typescript
baseRef: "main", labels: [], unresolvedThreads: 0, additions: 0, deletions: 0, changedFiles: 0, isDraft: false, mergeable: "mergeable" as const,
```

ReviewRequestedPR mock에:
```typescript
baseRef: "main", labels: [], unresolvedThreads: 0, additions: 0, deletions: 0, changedFiles: 0, isDraft: false, mergeable: "mergeable" as const, ciStatus: null,
```

- [ ] **Step 2: 전체 테스트 실행**

Run: `npm test`
Expected: 35+ 테스트 모두 통과

- [ ] **Step 3: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add tests/lib/stores/filters.test.ts
git commit -m "test: filters 테스트 mock에 PR 카드 새 필드 추가"
```

---

### Task 8: 목업 파일 정리

**Files:**
- Delete: `docs/superpowers/specs/pr-card-mockup.html`

- [ ] **Step 1: 목업 파일 삭제 및 커밋**

```bash
git rm docs/superpowers/specs/pr-card-mockup.html
git commit -m "chore: PR 카드 목업 파일 제거 (구현 완료)"
```
