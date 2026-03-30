# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR Dashboard의 로딩/빈 상태, 갱신 피드백, 필터 UX, 시각 계층, 긴급 뱃지, 키보드 단축키를 개선한다.

**Architecture:** 기존 컴포넌트(PRList, FilterBar, Dashboard, TabBar, PRCard)와 store(prs, filters)를 수정. 새 파일 없이 기존 구조 안에서 해결. 키보드 핸들러는 Dashboard에서 처리하고 focusedIndex는 filters store에 추가.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, Vitest

---

### Task 1: 스켈레톤 로딩 UI

**Files:**
- Modify: `src/lib/components/PRList.svelte`

- [ ] **Step 1: isLoading import 추가**

`PRList.svelte`의 script 블록에서 import 수정:

```svelte
<script lang="ts">
  import PRCard from "./PRCard.svelte";
  import type { MyPR, ReviewRequestedPR } from "$lib/types";
  import { isLoading } from "$lib/stores/prs";

  let { prs, mode }: { prs: (MyPR | ReviewRequestedPR)[]; mode: "my-prs" | "review-requests" } = $props();
</script>
```

- [ ] **Step 2: 스켈레톤 템플릿 추가**

기존 `{#each}` 블록 앞에 추가:

```svelte
<div class="pr-list">
  {#if $isLoading && prs.length === 0}
    {#each [1, 2, 3] as _}
      <div class="skeleton-card">
        <div class="skeleton-bar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line meta"></div>
          <div class="skeleton-line reviewers"></div>
          <div class="skeleton-line status"></div>
        </div>
      </div>
    {/each}
  {:else}
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
  {/if}
</div>
```

- [ ] **Step 3: 스켈레톤 스타일 추가**

```css
  .skeleton-card {
    display: flex;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    overflow: hidden;
    height: 120px;
  }

  .skeleton-bar {
    width: 4px;
    flex-shrink: 0;
    background: #30363d;
    border-radius: 4px 0 0 4px;
  }

  .skeleton-content {
    padding: 1rem 1.25rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-line {
    background: #21262d;
    border-radius: 4px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-line.title {
    width: 60%;
    height: 16px;
  }

  .skeleton-line.meta {
    width: 40%;
    height: 12px;
  }

  .skeleton-line.reviewers {
    width: 30%;
    height: 12px;
  }

  .skeleton-line.status {
    width: 70%;
    height: 11px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 5: 커밋**

```bash
git add src/lib/components/PRList.svelte
git commit -m "feat: PR 리스트 스켈레톤 로딩 UI 추가"
```

---

### Task 2: 빈 상태 개선

**Files:**
- Modify: `src/lib/components/PRList.svelte`
- Modify: `src/lib/stores/prs.ts`

- [ ] **Step 1: PRList에 원본 store import 추가**

script 블록에 추가:

```typescript
  import { myPRs, reviewRequestedPRs } from "$lib/stores/prs";
  import { selectedOrgs, searchQuery } from "$lib/stores/filters";
```

- [ ] **Step 2: 필터 활성 여부 판단 로직 추가**

script 블록에 추가:

```typescript
  const hasActiveFilter = $derived($selectedOrgs.length > 0 || $searchQuery.trim() !== "");
  const hasOriginalData = $derived(
    mode === "my-prs" ? $myPRs.length > 0 : $reviewRequestedPRs.length > 0
  );
```

- [ ] **Step 3: 빈 상태 메시지 교체**

기존 empty div를 교체:

```svelte
    {#if prs.length === 0}
      <div class="empty">
        {#if hasActiveFilter && hasOriginalData}
          <div class="empty-icon">🔍</div>
          <div class="empty-text">검색 결과가 없습니다</div>
          <button class="reset-btn" onclick={resetFilters}>필터 초기화</button>
        {:else if mode === "my-prs"}
          <div class="empty-icon">🎉</div>
          <div class="empty-text">열린 PR이 없습니다</div>
        {:else}
          <div class="empty-icon">✅</div>
          <div class="empty-text">리뷰 요청이 없습니다</div>
        {/if}
      </div>
    {/if}
```

- [ ] **Step 4: resetFilters 함수 추가**

script 블록에 추가:

```typescript
  function resetFilters() {
    selectedOrgs.set([]);
    searchQuery.set("");
  }
```

- [ ] **Step 5: 빈 상태 스타일 업데이트**

기존 `.empty` 스타일을 교체:

```css
  .empty {
    text-align: center;
    color: #484f58;
    padding: 3rem;
    font-size: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .empty-icon {
    font-size: 2rem;
  }

  .empty-text {
    color: #8b949e;
  }

  .reset-btn {
    background: #21262d;
    color: #58a6ff;
    border: 1px solid #30363d;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    margin-top: 0.25rem;
  }

  .reset-btn:hover {
    background: #30363d;
  }
```

- [ ] **Step 6: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 7: 커밋**

```bash
git add src/lib/components/PRList.svelte
git commit -m "feat: 빈 상태 UX 개선 (이모지, 필터 초기화 버튼)"
```

---

### Task 3: 마지막 갱신 시각 표시

**Files:**
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: import 추가**

Dashboard.svelte의 import에 추가:

```typescript
  import { filteredMyPRs, filteredReviewRequestedPRs, isLoading, lastFetchedAt, startPolling, fetchAll } from "$lib/stores/prs";
  import { relativeTime } from "$lib/utils";
```

- [ ] **Step 2: 갱신 시각 자동 업데이트를 위한 tick state 추가**

script 블록에 추가:

```typescript
  let tick = $state(0);
  let tickTimer: ReturnType<typeof setInterval> | null = null;

  onMount(async () => {
    await loadSettings();
    loadNotifications();
    stopPolling = startPolling();
    tickTimer = setInterval(() => tick++, 60000);
  });

  onDestroy(() => {
    stopPolling?.();
    if (tickTimer) clearInterval(tickTimer);
  });
```

기존 `onMount`와 `onDestroy` 블록을 위의 코드로 교체 (기존 로직 유지하면서 tickTimer 추가).

- [ ] **Step 3: 갱신 시각 표시 추가**

헤더의 `.header-actions` 안에, username 뒤 refresh 버튼 앞에 추가:

```svelte
      {#if $lastFetchedAt}
        {@const _ = tick}
        <span class="last-fetched">{relativeTime($lastFetchedAt)}</span>
      {/if}
```

`tick`을 참조해야 Svelte가 매 분 리렌더하므로 `{@const _ = tick}` 사용.

- [ ] **Step 4: 스타일 추가**

```css
  .last-fetched {
    font-size: 11px;
    color: #656d76;
    margin-right: 0.25rem;
  }
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 6: 커밋**

```bash
git add src/lib/components/Dashboard.svelte
git commit -m "feat: 헤더에 마지막 갱신 시각 표시"
```

---

### Task 4: 새로고침 피드백 메시지

**Files:**
- Modify: `src/lib/stores/prs.ts`
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: prs store에 업데이트 카운트 store 추가**

`src/lib/stores/prs.ts`에서 `lastFetchedAt` 뒤에 추가:

```typescript
export const lastUpdateCount = writable<number | null>(null);
```

`fetchAll` 함수에서 `await checkAndNotify(...)` 뒤에 추가:

```typescript
    const prevTotal = prevMyPRs.length + prevReviewPRs.length;
    const currTotal = myPRData.length + reviewData.length;
    const prevIds = new Set([...prevMyPRs.map(p => p.id), ...prevReviewPRs.map(p => p.id)]);
    const currIds = new Set([...myPRData.map(p => p.id), ...reviewData.map(p => p.id)]);
    const changed = [...currIds].filter(id => !prevIds.has(id)).length +
                    [...prevIds].filter(id => !currIds.has(id)).length;
    lastUpdateCount.set(changed > 0 ? changed : null);
```

- [ ] **Step 2: Dashboard에 피드백 메시지 표시**

Dashboard.svelte의 import에 `lastUpdateCount` 추가:

```typescript
  import { filteredMyPRs, filteredReviewRequestedPRs, isLoading, lastFetchedAt, lastUpdateCount, startPolling, fetchAll } from "$lib/stores/prs";
```

script에 추가:

```typescript
  let feedbackMessage = $state("");
  let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const count = $lastUpdateCount;
    if (count && count > 0) {
      feedbackMessage = `${count}개 PR 업데이트됨`;
      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        feedbackMessage = "";
        lastUpdateCount.set(null);
      }, 2000);
    }
  });
```

헤더의 `.last-fetched` 뒤에 추가:

```svelte
      {#if feedbackMessage}
        <span class="feedback-msg">{feedbackMessage}</span>
      {/if}
```

- [ ] **Step 3: 스타일 추가**

```css
  .feedback-msg {
    font-size: 11px;
    color: #3fb950;
    font-weight: 500;
    animation: fade-in 0.3s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 5: 커밋**

```bash
git add src/lib/stores/prs.ts src/lib/components/Dashboard.svelte
git commit -m "feat: 새로고침 후 업데이트 피드백 메시지 표시"
```

---

### Task 5: org 필터 외부 클릭 닫기

**Files:**
- Modify: `src/lib/components/FilterBar.svelte`

- [ ] **Step 1: 외부 클릭 핸들러 추가**

FilterBar.svelte의 script에 함수 추가:

```typescript
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".org-filter")) {
      orgDropdownOpen = false;
    }
  }
```

- [ ] **Step 2: 이벤트 리스너 추가**

템플릿 최상단에 추가:

```svelte
<svelte:window onclick={handleClickOutside} />
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add src/lib/components/FilterBar.svelte
git commit -m "feat: org 필터 드롭다운 외부 클릭 시 닫기"
```

---

### Task 6: PR 카드 시각적 계층 강화

**Files:**
- Modify: `src/lib/components/PRCard.svelte`
- Modify: `src/lib/components/PRList.svelte`

- [ ] **Step 1: PRCard CSS 조정**

`.pr-title` font-size 변경:

```css
  .pr-title {
    font-size: 15px;
```

`.status-line`에 opacity 추가:

```css
  .status-line {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 11px;
    color: #8b949e;
    margin-top: 0.5rem;
    opacity: 0.8;
  }
```

- [ ] **Step 2: PRList 카드 간격 조정**

`.pr-list` gap 변경:

```css
  .pr-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 4: 커밋**

```bash
git add src/lib/components/PRCard.svelte src/lib/components/PRList.svelte
git commit -m "style: PR 카드 시각적 계층 강화 (타이틀, 상태줄, 간격)"
```

---

### Task 7: 탭 긴급 PR 카운트 + 테스트

**Files:**
- Modify: `src/lib/stores/prs.ts`
- Modify: `src/lib/components/TabBar.svelte`
- Modify: `tests/lib/stores/filters.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/stores/filters.test.ts`에 import 추가:

```typescript
import { urgentMyPRCount } from "../../src/lib/stores/prs";
import { get } from "svelte/store";
```

테스트 추가:

```typescript
describe("urgentMyPRCount", () => {
  it("counts PRs with conflict or CI failure", () => {
    const { myPRs } = await import("../../src/lib/stores/prs");
    myPRs.set([
      { ...MOCK_MY_PRS[0], mergeable: "conflicting", ciStatus: "success" },
      { ...MOCK_MY_PRS[1], mergeable: "mergeable", ciStatus: "failure" },
      { ...MOCK_MY_PRS[2], mergeable: "mergeable", ciStatus: "success" },
    ]);
    expect(get(urgentMyPRCount)).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test`
Expected: `urgentMyPRCount` import 에러로 실패

- [ ] **Step 3: urgentMyPRCount derived store 구현**

`src/lib/stores/prs.ts`에서 `pendingReviewCount` 뒤에 추가:

```typescript
export const urgentMyPRCount = derived(
  myPRs,
  ($prs) => $prs.filter((pr) => pr.mergeable === "conflicting" || pr.ciStatus === "failure").length
);
```

- [ ] **Step 4: 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 5: TabBar에 긴급 뱃지 추가**

`src/lib/components/TabBar.svelte` 수정:

script에 import 추가:

```typescript
  import { myPRs, reviewRequestedPRs, urgentMyPRCount } from "$lib/stores/prs";
```

My PRs 탭 버튼 내용 변경:

```svelte
  <button
    class="tab"
    class:active={activeTab === "my-prs"}
    onclick={() => (activeTab = "my-prs")}
  >
    My PRs ({$myPRs.length})
    {#if $urgentMyPRCount > 0}
      <span class="urgent-badge">{$urgentMyPRCount}</span>
    {/if}
  </button>
```

- [ ] **Step 6: 뱃지 스타일 추가**

```css
  .urgent-badge {
    background: #da3633;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    margin-left: 4px;
  }
```

- [ ] **Step 7: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 8: 커밋**

```bash
git add src/lib/stores/prs.ts src/lib/components/TabBar.svelte tests/lib/stores/filters.test.ts
git commit -m "feat: My PRs 탭에 긴급 PR 카운트 (conflict/CI fail) 뱃지 추가"
```

---

### Task 8: 키보드 단축키 — focusedIndex store + 핸들러

**Files:**
- Modify: `src/lib/stores/filters.ts`
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: focusedIndex store 추가**

`src/lib/stores/filters.ts`에 추가:

```typescript
export const focusedIndex = writable<number>(-1);
```

- [ ] **Step 2: Dashboard에 키보드 핸들러 추가**

Dashboard.svelte의 import에 추가:

```typescript
  import { activeTab, focusedIndex } from "$lib/stores/filters";
  import { get } from "svelte/store";
```

기존 `activeTab` import가 중복되면 하나로 합침.

script에 키보드 핸들러 추가:

```typescript
  function handleKeydown(e: KeyboardEvent) {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") {
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement).blur();
        e.preventDefault();
      }
      return;
    }

    const currentTab = get(activeTab);
    const prs = currentTab === "my-prs" ? get(filteredMyPRs) : get(filteredReviewRequestedPRs);
    const maxIndex = prs.length - 1;

    switch (e.key) {
      case "j": {
        const idx = get(focusedIndex);
        focusedIndex.set(Math.min(idx + 1, maxIndex));
        e.preventDefault();
        break;
      }
      case "k": {
        const idx = get(focusedIndex);
        focusedIndex.set(Math.max(idx - 1, 0));
        e.preventDefault();
        break;
      }
      case "Enter": {
        const idx = get(focusedIndex);
        if (idx >= 0 && idx <= maxIndex) {
          window.open(prs[idx].url, "_blank");
          e.preventDefault();
        }
        break;
      }
      case "r":
        fetchAll();
        e.preventDefault();
        break;
      case "1":
        activeTab.set("my-prs");
        focusedIndex.set(-1);
        e.preventDefault();
        break;
      case "2":
        activeTab.set("review-requests");
        focusedIndex.set(-1);
        e.preventDefault();
        break;
      case "/":
        document.querySelector<HTMLInputElement>(".search-input")?.focus();
        e.preventDefault();
        break;
      case "Escape":
        focusedIndex.set(-1);
        break;
    }
  }
```

- [ ] **Step 3: 이벤트 리스너 연결**

Dashboard.svelte 템플릿 최상단에 추가:

```svelte
<svelte:window onkeydown={handleKeydown} />
```

- [ ] **Step 4: 탭 전환 시 focusedIndex 리셋**

script에 $effect 추가:

```typescript
  $effect(() => {
    $activeTab;
    focusedIndex.set(-1);
  });
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 6: 커밋**

```bash
git add src/lib/stores/filters.ts src/lib/components/Dashboard.svelte
git commit -m "feat: 키보드 단축키 핸들러 추가 (j/k/Enter/r/1/2///Esc)"
```

---

### Task 9: 키보드 포커스 시각 피드백

**Files:**
- Modify: `src/lib/components/PRList.svelte`
- Modify: `src/lib/components/PRCard.svelte`

- [ ] **Step 1: PRList에서 focused prop 전달**

PRList.svelte의 import에 추가:

```typescript
  import { focusedIndex } from "$lib/stores/filters";
```

기존 PRCard 렌더링 변경:

```svelte
    {#each prs as pr, i (pr.id)}
      <PRCard {pr} {mode} focused={$focusedIndex === i} />
    {/each}
```

- [ ] **Step 2: PRCard에 focused prop + scrollIntoView 추가**

PRCard.svelte의 props 변경:

```typescript
  let { pr, mode, focused = false }: { pr: MyPR | ReviewRequestedPR; mode: "my-prs" | "review-requests"; focused?: boolean } = $props();
```

script에 ref + 스크롤 로직 추가:

```typescript
  let cardEl: HTMLButtonElement;

  $effect(() => {
    if (focused && cardEl) {
      cardEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
```

버튼에 bind:this와 focused 클래스 추가:

```svelte
<button class="pr-card" class:focused onclick={handleClick} bind:this={cardEl}>
```

- [ ] **Step 3: focused 스타일 추가**

PRCard.svelte의 style에 추가:

```css
  .pr-card.focused {
    border-color: #58a6ff;
    box-shadow: 0 0 0 1px #58a6ff;
  }
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 5: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 통과

- [ ] **Step 6: 커밋**

```bash
git add src/lib/components/PRList.svelte src/lib/components/PRCard.svelte
git commit -m "feat: 키보드 포커스 카드 하이라이트 및 스크롤"
```
