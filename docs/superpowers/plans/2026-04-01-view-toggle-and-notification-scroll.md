# View Toggle 라디오 개편 + 알림 스크롤 하이라이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flat/Grouped 뷰 전환을 Segmented Control로 개편하고, 알림 클릭 시 해당 PR 카드로 스크롤 + 3초 border glow 하이라이트

**Architecture:** FilterBar의 토글 버튼을 segmented control 라디오로 교체 (store 변경 없음). 알림 시스템에 prId 추가, highlightedPRId store 신설, navigateToNotification을 스크롤 방식으로 전환, PRCard에 하이라이트 애니메이션 추가.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest

---

## File Structure

| 파일 | 역할 | 변경 |
|------|------|------|
| `src/lib/types.ts` | AppNotification 타입 | `prId` 필드 추가 |
| `src/lib/stores/filters.ts` | 필터/뷰 상태 | `highlightedPRId` store 추가 |
| `src/lib/notifications.ts` | 알림 로직 | `prId` 전달, `navigateToNotification` 스크롤 방식 전환 |
| `src/lib/components/FilterBar.svelte` | 필터 UI | 토글 → Segmented Control |
| `src/lib/components/PRCard.svelte` | PR 카드 UI | highlighted 클래스 + 스크롤 + 애니메이션 |
| `tests/lib/notifications.test.ts` | 알림 테스트 | prId 반영, navigateToNotification 테스트 수정 |
| `tests/lib/stores/filters.test.ts` | 필터 테스트 | highlightedPRId 테스트 추가 |

---

### Task 1: AppNotification에 prId 필드 추가

**Files:**
- Modify: `src/lib/types.ts:79-88`

- [ ] **Step 1: AppNotification에 prId 추가**

`src/lib/types.ts`에서 `AppNotification` 인터페이스의 `id` 필드 다음에 `prId` 추가:

```typescript
export interface AppNotification {
  id: string;
  prId: string;
  type: "new_review" | "review_request";
  prTitle: string;
  prUrl: string;
  actor: string;
  reviewState?: ReviewState;
  read: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: notifications.ts에서 prId 누락 에러 (아직 전달 안 했으므로). 이 에러는 Task 3에서 수정.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: AppNotification에 prId 필드 추가"
```

---

### Task 2: highlightedPRId store 추가

**Files:**
- Modify: `src/lib/stores/filters.ts`
- Test: `tests/lib/stores/filters.test.ts`

- [ ] **Step 1: 기존 테스트 확인**

Run: `npm test -- tests/lib/stores/filters.test.ts`
Expected: PASS

- [ ] **Step 2: highlightedPRId 테스트 작성**

`tests/lib/stores/filters.test.ts`에 다음 테스트 추가:

```typescript
import { highlightedPRId, setHighlightedPRId } from "$lib/stores/filters";
import { get } from "svelte/store";

describe("highlightedPRId", () => {
  beforeEach(() => {
    highlightedPRId.set(null);
  });

  it("should initialize as null", () => {
    expect(get(highlightedPRId)).toBeNull();
  });

  it("should set value and auto-clear after 3 seconds", () => {
    vi.useFakeTimers();
    setHighlightedPRId("PR_123");
    expect(get(highlightedPRId)).toBe("PR_123");

    vi.advanceTimersByTime(3000);
    expect(get(highlightedPRId)).toBeNull();
    vi.useRealTimers();
  });

  it("should cancel previous timer when setting new value", () => {
    vi.useFakeTimers();
    setHighlightedPRId("PR_1");
    vi.advanceTimersByTime(2000);
    setHighlightedPRId("PR_2");
    expect(get(highlightedPRId)).toBe("PR_2");

    vi.advanceTimersByTime(1000); // 3초 경과 (PR_1 기준) — PR_2는 아직 살아있어야 함
    expect(get(highlightedPRId)).toBe("PR_2");

    vi.advanceTimersByTime(2000); // PR_2 설정 후 3초 경과
    expect(get(highlightedPRId)).toBeNull();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- tests/lib/stores/filters.test.ts`
Expected: FAIL — `highlightedPRId`, `setHighlightedPRId` 존재하지 않음

- [ ] **Step 4: highlightedPRId 구현**

`src/lib/stores/filters.ts` 파일 끝에 추가:

```typescript
export const highlightedPRId = writable<string | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

export function setHighlightedPRId(prId: string) {
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightedPRId.set(prId);
  highlightTimer = setTimeout(() => {
    highlightedPRId.set(null);
    highlightTimer = null;
  }, 3000);
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- tests/lib/stores/filters.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/filters.ts tests/lib/stores/filters.test.ts
git commit -m "feat: highlightedPRId store 추가 (3초 자동 해제)"
```

---

### Task 3: notifications.ts에 prId 전달 + navigateToNotification 변경

**Files:**
- Modify: `src/lib/notifications.ts`
- Test: `tests/lib/notifications.test.ts`

- [ ] **Step 1: 기존 테스트 확인**

Run: `npm test -- tests/lib/notifications.test.ts`
Expected: PASS (또는 Task 1의 타입 변경으로 인해 FAIL — 이 경우 이 태스크에서 수정)

- [ ] **Step 2: notifications.test.ts 업데이트 — addNotification에 prId**

기존 `addNotification` 호출부에 `prId` 추가. `tests/lib/notifications.test.ts`에서 `addNotification` 호출하는 부분을 찾아 `prId: "PR_test"` 추가.

또한 navigateToNotification 테스트 수정 — searchQuery 대신 highlightedPRId 확인:

```typescript
import { highlightedPRId } from "$lib/stores/filters";

// navigateToNotification 테스트에서:
it("should set highlightedPRId and clear filters when prId exists", () => {
  const notif: AppNotification = {
    id: "n1",
    prId: "PR_123",
    type: "new_review",
    prTitle: "Test PR",
    prUrl: "https://github.com/test/repo/pull/1",
    actor: "user1",
    read: false,
    createdAt: new Date().toISOString(),
  };
  navigateToNotification(notif);
  expect(get(activeTab)).toBe("my-prs");
  expect(get(searchQuery)).toBe("");
  expect(get(selectedOrgs)).toEqual([]);
  expect(get(highlightedPRId)).toBe("PR_123");
});

it("should do nothing when prId is missing", () => {
  const notif = {
    id: "n2",
    type: "new_review",
    prTitle: "Old PR",
    prUrl: "https://github.com/test/repo/pull/2",
    actor: "user1",
    read: false,
    createdAt: new Date().toISOString(),
  } as AppNotification;
  searchQuery.set("something");
  navigateToNotification(notif);
  expect(get(searchQuery)).toBe("something"); // 변경 없음
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- tests/lib/notifications.test.ts`
Expected: FAIL

- [ ] **Step 4: notifications.ts 수정**

4a. `NewReviewEvent`, `NewReviewRequestEvent` 인터페이스에 `prId` 추가:

```typescript
export interface NewReviewEvent {
  prId: string;
  prTitle: string;
  prUrl: string;
  reviewer: string;
  state: string;
}

export interface NewReviewRequestEvent {
  prId: string;
  prTitle: string;
  prUrl: string;
  author: string;
}
```

4b. `addNotification` 파라미터에 `prId` 추가:

```typescript
export function addNotification(event: {
  type: "new_review" | "review_request";
  prId: string;
  prTitle: string;
  prUrl: string;
  actor: string;
  reviewState?: string;
}) {
  const item: AppNotification = {
    id: crypto.randomUUID(),
    prId: event.prId,
    type: event.type,
    prTitle: event.prTitle,
    prUrl: event.prUrl,
    actor: event.actor,
    reviewState: event.reviewState as AppNotification["reviewState"],
    read: false,
    createdAt: new Date().toISOString(),
  };
```

4c. `navigateToNotification` 변경 — import에 `setHighlightedPRId`, `selectedOrgs` 추가:

```typescript
import { activeTab, searchQuery, selectedOrgs, setHighlightedPRId } from "./stores/filters";
```

함수 본체 변경:

```typescript
export function navigateToNotification(notif: AppNotification) {
  if (!notif.prId) return;
  showSettings.set(false);
  activeTab.set(notif.type === "new_review" ? "my-prs" : "review-requests");
  searchQuery.set("");
  selectedOrgs.set([]);
  setHighlightedPRId(notif.prId);
  markAsRead(notif.id);
}
```

4d. `detectNewReviews`에서 `prId` 포함:

```typescript
events.push({
  prId: pr.id,
  prTitle: pr.title,
  prUrl: pr.url,
  reviewer: review.author,
  state: review.state,
});
```

4e. `detectNewReviewRequests`에서 `prId` 포함:

```typescript
return curr
  .filter((pr) => !prevIds.has(pr.id))
  .map((pr) => ({
    prId: pr.id,
    prTitle: pr.title,
    prUrl: pr.url,
    author: pr.author,
  }));
```

4f. `checkAndNotify`에서 `addNotification` 호출에 `prId` 추가:

```typescript
addNotification({
  type: "new_review",
  prId: event.prId,
  prTitle: event.prTitle,
  ...
});
```

```typescript
addNotification({
  type: "review_request",
  prId: event.prId,
  prTitle: event.prTitle,
  ...
});
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- tests/lib/notifications.test.ts`
Expected: PASS

- [ ] **Step 6: 전체 타입 체크**

Run: `npm run check`
Expected: PASS (PRCard는 아직 변경 안 했지만 highlightedPRId를 사용하지 않으므로 에러 없음)

- [ ] **Step 7: Commit**

```bash
git add src/lib/notifications.ts tests/lib/notifications.test.ts
git commit -m "feat: 알림에 prId 전달 + navigateToNotification 스크롤 방식 전환"
```

---

### Task 4: FilterBar Segmented Control

**Files:**
- Modify: `src/lib/components/FilterBar.svelte:67-74` (버튼), `:85-118` (스타일)

- [ ] **Step 1: 토글 버튼을 Segmented Control로 교체**

`src/lib/components/FilterBar.svelte`에서 기존 토글 버튼:

```svelte
  <button
    class="filter-btn"
    class:active={$groupByRepo}
    onclick={() => groupByRepo.update(v => !v)}
    title="레포별 그룹핑"
  >
    {$groupByRepo ? "▤ Grouped" : "▤ Flat"}
  </button>
```

을 다음으로 교체:

```svelte
  <div class="view-toggle">
    <button
      class="view-toggle-btn"
      class:active={!$groupByRepo}
      onclick={() => groupByRepo.set(false)}
    >
      Flat
    </button>
    <button
      class="view-toggle-btn"
      class:active={$groupByRepo}
      onclick={() => groupByRepo.set(true)}
    >
      Grouped
    </button>
  </div>
```

- [ ] **Step 2: CSS 추가**

`<style>` 블록에서 `.filter-btn.active` 스타일은 유지 (org 필터 드롭다운 버튼에서 사용). 다음 CSS 추가:

```css
  .view-toggle {
    display: inline-flex;
    border: 1px solid #30363d;
    border-radius: 6px;
    overflow: hidden;
  }

  .view-toggle-btn {
    background: #161b22;
    color: #8b949e;
    border: none;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .view-toggle-btn:not(:first-child) {
    border-left: 1px solid #30363d;
  }

  .view-toggle-btn:hover:not(.active) {
    color: #c9d1d9;
    background: #1c2129;
  }

  .view-toggle-btn.active {
    background: #1f6feb;
    color: #fff;
  }
```

- [ ] **Step 3: 개발 서버에서 확인**

Run: `npm run dev`
브라우저에서 FilterBar의 Segmented Control이 정상 동작하는지 확인:
- Flat/Grouped 클릭 시 뷰 전환
- 선택된 쪽 파란색 하이라이트
- 새로고침 후에도 상태 유지 (localStorage)

- [ ] **Step 4: 타입 체크**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/FilterBar.svelte
git commit -m "feat: Flat/Grouped 토글을 Segmented Control로 개편"
```

---

### Task 5: PRCard 하이라이트 + 스크롤

**Files:**
- Modify: `src/lib/components/PRCard.svelte`

- [ ] **Step 1: highlightedPRId import 및 prop/state 추가**

`PRCard.svelte`의 `<script>` 블록에 import 추가:

```typescript
import { highlightedPRId } from "$lib/stores/filters";
```

기존 `$effect` (focused 스크롤) 아래에 highlighted 관련 코드 추가:

```typescript
  const highlighted = $derived($highlightedPRId === pr.id);

  $effect(() => {
    if (highlighted && cardEl) {
      cardEl.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });
```

- [ ] **Step 2: HTML에 highlighted 클래스 추가**

기존:
```svelte
<div class="pr-card" class:focused class:expanded onclick={handleClick} bind:this={cardEl}>
```

변경:
```svelte
<div class="pr-card" class:focused class:expanded class:highlighted onclick={handleClick} bind:this={cardEl}>
```

- [ ] **Step 3: CSS 애니메이션 추가**

`<style>` 블록에 추가:

```css
  .pr-card.highlighted {
    border-color: #58a6ff;
    box-shadow: 0 0 12px rgba(88, 166, 255, 0.3);
    animation: highlight-glow 1.5s ease-in-out 2;
  }

  @keyframes highlight-glow {
    0%, 100% {
      box-shadow: 0 0 4px rgba(88, 166, 255, 0.2);
      border-color: #58a6ff;
    }
    50% {
      box-shadow: 0 0 16px rgba(88, 166, 255, 0.5);
      border-color: #79c0ff;
    }
  }
```

- [ ] **Step 4: 타입 체크**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: 전체 테스트**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/PRCard.svelte
git commit -m "feat: 알림 클릭 시 PR 카드 스크롤 + border glow 하이라이트"
```

---

### Task 6: 전체 검증

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공
