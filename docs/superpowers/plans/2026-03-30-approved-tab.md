# Approved 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내가 승인했지만 아직 열려있는 PR을 추적하는 3번째 "Approved" 탭 추가

**Architecture:** 기존 `reviewed-by:` GitHub search 쿼리로 데이터를 가져오고, `parseReviewRequestedPRs` 파서에 `forcePending` 파라미터를 추가하여 재사용. 새 store와 탭 UI를 추가하되 기존 컴포넌트(PRList, PRCard)는 그대로 재사용.

**Tech Stack:** SvelteKit, Svelte 5 runes, Octokit GraphQL, Vitest

---

### Task 1: 파서에 forcePending 파라미터 추가

**Files:**
- Modify: `src/lib/github/queries.ts:151-209` — `parseReviewRequestedPRs` 함수
- Test: `tests/lib/github/queries.test.ts`

- [ ] **Step 1: 기존 테스트에 forcePending=true 명시**

`tests/lib/github/queries.test.ts`의 기존 `parseReviewRequestedPRs` 호출에 3번째 인자 `true`를 추가한다. 기존 동작이 깨지지 않는지 확인하기 위함.

```ts
// describe("parseReviewRequestedPRs") 안의 두 테스트에서:
const result = parseReviewRequestedPRs(MOCK_REVIEW_REQUESTED_RESPONSE, "me", true);
// ...
const result = parseReviewRequestedPRs(response, "me", true);
```

- [ ] **Step 2: forcePending=false 테스트 추가**

같은 `MOCK_REVIEW_REQUESTED_RESPONSE` 데이터에 대해 `forcePending: false`로 호출하면 `myReviewStatus`가 실제 리뷰 상태(`"approved"`)로 설정되고, `previousReviewStatus`는 `null`이 되는 테스트 작성.

```ts
it("returns actual review status when forcePending is false", () => {
  const result = parseReviewRequestedPRs(MOCK_REVIEW_REQUESTED_RESPONSE, "me", false);
  expect(result).toHaveLength(1);
  expect(result[0].myReviewStatus).toBe("approved");
  expect(result[0].previousReviewStatus).toBeNull();
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

Run: `npm test -- tests/lib/github/queries.test.ts`
Expected: 새 테스트가 실패 (파서가 아직 3번째 파라미터를 지원하지 않으므로)하고, 기존 테스트도 실패 (인자 개수 불일치)

- [ ] **Step 4: parseReviewRequestedPRs에 forcePending 파라미터 구현**

`src/lib/github/queries.ts`의 `parseReviewRequestedPRs` 시그니처를 변경:

```ts
export function parseReviewRequestedPRs(data: any, username: string, forcePending: boolean = true): ReviewRequestedPR[] {
```

함수 내부에서 `myReviewStatus`와 `previousReviewStatus` 설정 로직 변경:

```ts
      const myLatestState = myLatest ? normalizeReviewState(myLatest.state) : null;

      return {
        // ... 기존 필드 동일 ...
        myReviewStatus: forcePending ? ("pending" as ReviewState) : (myLatestState ?? "pending"),
        previousReviewStatus: forcePending ? myLatestState : null,
        // ... 나머지 동일 ...
      };
```

`forcePending: true`일 때: 기존 동작 (myReviewStatus="pending", previousReviewStatus=실제 상태)
`forcePending: false`일 때: myReviewStatus=실제 상태, previousReviewStatus=null

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `npm test -- tests/lib/github/queries.test.ts`
Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/github/queries.ts tests/lib/github/queries.test.ts
git commit -m "feat: parseReviewRequestedPRs에 forcePending 파라미터 추가"
```

---

### Task 2: fetchApprovedPRs 클라이언트 함수 추가

**Files:**
- Modify: `src/lib/github/client.ts` — `fetchApprovedPRs` 함수 추가

- [ ] **Step 1: fetchApprovedPRs 함수 구현**

`src/lib/github/client.ts`에 추가:

```ts
export async function fetchApprovedPRs(reviewRequestedIds: Set<string>): Promise<ReviewRequestedPR[]> {
  if (!graphqlClient) throw new Error("Client not initialized");
  if (!currentUsername) await fetchUsername();
  const data = await graphqlClient(REVIEW_REQUESTED_QUERY, {
    searchQuery: `is:pr is:open reviewed-by:${currentUsername} -author:${currentUsername}`,
  });
  return parseReviewRequestedPRs(data, currentUsername, false)
    .filter((pr) => pr.myReviewStatus === "approved" && !reviewRequestedIds.has(pr.id));
}
```

import에 `parseReviewRequestedPRs` 추가 (이미 있음), `REVIEW_REQUESTED_QUERY` 사용 (이미 import됨).

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/github/client.ts
git commit -m "feat: fetchApprovedPRs 클라이언트 함수 추가"
```

---

### Task 3: Store에 approvedPRs 추가 및 fetchAll 수정

**Files:**
- Modify: `src/lib/stores/filters.ts:9` — TabKey에 "approved" 추가
- Modify: `src/lib/stores/prs.ts` — approvedPRs store, filteredApprovedPRs derived, fetchAll 수정

- [ ] **Step 1: TabKey에 "approved" 추가**

`src/lib/stores/filters.ts` 9번째 줄:

```ts
export type TabKey = "my-prs" | "review-requests" | "approved";
```

- [ ] **Step 2: approvedPRs store 추가**

`src/lib/stores/prs.ts`에서:

import에 `fetchApprovedPRs` 추가:
```ts
import { fetchMyPRs, fetchReviewRequestedPRs, fetchApprovedPRs, fetchOrganizations } from "../github/client";
```

store 선언부에 추가:
```ts
export const approvedPRs = writable<ReviewRequestedPR[]>([]);
```

filteredApprovedPRs derived store 추가 (filteredReviewRequestedPRs 아래에):
```ts
export const filteredApprovedPRs = derived(
  [approvedPRs, selectedOrgs, searchQuery, sortKey],
  ([$prs, $orgs, $query, $sortKey]) => {
    const filtered = applyFilters($prs, $orgs, $query);
    return applySorting(filtered, $sortKey);
  }
);
```

- [ ] **Step 3: fetchAll에서 approvedPRs 업데이트**

`fetchAll` 함수 수정 — reviewData를 먼저 받아서 그 ID set을 `fetchApprovedPRs`에 전달:

```ts
export async function fetchAll() {
  isLoading.set(true);
  try {
    const [myPRData, reviewData, orgs] = await Promise.all([
      fetchMyPRs(),
      fetchReviewRequestedPRs(),
      fetchOrganizations(),
    ]);

    const reviewRequestedIds = new Set(reviewData.map((pr) => pr.id));
    const approvedData = await fetchApprovedPRs(reviewRequestedIds);

    const prevMyPRs = get(myPRs);
    const prevReviewPRs = get(reviewRequestedPRs);

    myPRs.set(myPRData);
    reviewRequestedPRs.set(reviewData);
    approvedPRs.set(approvedData);
    organizations.set(orgs);
    lastFetchedAt.set(new Date().toISOString());

    await checkAndNotify(prevMyPRs, myPRData, prevReviewPRs, reviewData);

    const prevIds = new Set([...prevMyPRs.map(p => p.id), ...prevReviewPRs.map(p => p.id)]);
    const currIds = new Set([...myPRData.map(p => p.id), ...reviewData.map(p => p.id), ...approvedData.map(p => p.id)]);
    const changed = [...currIds].filter(id => !prevIds.has(id)).length +
                    [...prevIds].filter(id => !currIds.has(id)).length;
    lastUpdateCount.set(changed > 0 ? changed : null);
  } catch (err) {
    console.error("Failed to fetch PRs:", err);
  } finally {
    isLoading.set(false);
  }
}
```

참고: `fetchApprovedPRs`는 `reviewData`의 ID가 필요하므로 `Promise.all`에 넣지 않고 순차 호출한다.

- [ ] **Step 4: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/lib/stores/filters.ts src/lib/stores/prs.ts
git commit -m "feat: approvedPRs store 및 fetchAll에 approved 데이터 추가"
```

---

### Task 4: TabBar에 Approved 탭 추가

**Files:**
- Modify: `src/lib/components/TabBar.svelte`

- [ ] **Step 1: approvedPRs import 추가 및 3번째 탭 버튼 추가**

`src/lib/components/TabBar.svelte`의 script에서 `approvedPRs` import 추가:

```ts
import { myPRs, reviewRequestedPRs, urgentMyPRCount, approvedPRs } from "$lib/stores/prs";
```

My PRs 버튼 다음에 Approved 버튼 추가:

```svelte
  <button
    class="tab"
    class:active={activeTab === "approved"}
    onclick={() => (activeTab = "approved")}
  >
    Approved ({$approvedPRs.length})
  </button>
```

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/lib/components/TabBar.svelte
git commit -m "feat: TabBar에 Approved 탭 추가"
```

---

### Task 5: Dashboard에 Approved 탭 분기 및 단축키 추가

**Files:**
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: filteredApprovedPRs import 추가**

Dashboard.svelte의 import에 `filteredApprovedPRs` 추가:

```ts
import { filteredMyPRs, filteredReviewRequestedPRs, filteredApprovedPRs, isLoading, startPolling, fetchAll, lastFetchedAt, lastUpdateCount } from "$lib/stores/prs";
```

- [ ] **Step 2: 탭 분기에 approved 추가**

기존 `{#if $activeTab === "my-prs"}` 블록을 수정:

```svelte
    {#if $activeTab === "my-prs"}
      <PRList prs={$filteredMyPRs} mode="my-prs" />
    {:else if $activeTab === "approved"}
      <PRList prs={$filteredApprovedPRs} mode="approved" />
    {:else}
      <PRList prs={$filteredReviewRequestedPRs} mode="review-requests" />
    {/if}
```

- [ ] **Step 3: 키보드 단축키 `3` 추가**

`handleKeydown` 함수의 `handledKeys` 배열에 `"3"` 추가:

```ts
const handledKeys = ["ArrowDown", "ArrowUp", "Enter", "r", "1", "2", "3", "/", "Escape", "?"];
```

`prs` 변수 계산에 approved 분기 추가:

```ts
const prs = currentTab === "my-prs" ? get(filteredMyPRs) : currentTab === "approved" ? get(filteredApprovedPRs) : get(filteredReviewRequestedPRs);
```

switch문에 `"3"` 케이스 추가 (`"2"` 케이스 아래에):

```ts
      case "3":
        activeTab.set("approved");
        focusedIndex.set(-1);
        e.preventDefault();
        break;
```

- [ ] **Step 4: 단축키 모달에 3번 추가**

shortcuts-body 안에 기존 `<div class="shortcut-row"><kbd>2</kbd>` 뒤에:

```svelte
        <div class="shortcut-row"><kbd>3</kbd> <span>Approved 탭</span></div>
```

- [ ] **Step 5: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/lib/components/Dashboard.svelte
git commit -m "feat: Dashboard에 Approved 탭 분기 및 단축키 3 추가"
```

---

### Task 6: PRCard와 PRList의 approved 모드 호환

**Files:**
- Modify: `src/lib/components/PRCard.svelte:16-21` — getBarColor에 approved 처리
- Modify: `src/lib/components/PRList.svelte:11-13` — hasOriginalData에 approved 처리

- [ ] **Step 1: PRCard의 getBarColor에 approved 모드 추가**

`src/lib/components/PRCard.svelte`의 `getBarColor` 함수:

```ts
  function getBarColor(): string {
    if (mode === "my-prs") {
      return STATUS_COLORS[(pr as MyPR).reviewStatus];
    }
    if (mode === "approved") {
      return STATUS_COLORS["approved"];
    }
    return STATUS_COLORS["pending"];
  }
```

- [ ] **Step 2: PRList의 hasOriginalData에 approved 분기 추가**

`src/lib/components/PRList.svelte`에서 `approvedPRs` import 추가:

```ts
import { isLoading, myPRs, reviewRequestedPRs, approvedPRs } from "$lib/stores/prs";
```

`hasOriginalData` derived 수정:

```ts
  const hasOriginalData = $derived(
    mode === "my-prs" ? $myPRs.length > 0 :
    mode === "approved" ? $approvedPRs.length > 0 :
    $reviewRequestedPRs.length > 0
  );
```

- [ ] **Step 3: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/components/PRCard.svelte src/lib/components/PRList.svelte
git commit -m "feat: PRCard, PRList에서 approved 모드 호환 처리"
```

---

### Task 7: 전체 테스트 및 빌드 확인

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 3: 빌드**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋 (필요시)**

테스트나 빌드 중 수정이 필요했다면 커밋.
