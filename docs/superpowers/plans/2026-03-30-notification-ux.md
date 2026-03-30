# Notification UX Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브라우저 알림 클릭 네비게이션, 인앱 토스트, 벨 드롭다운 알림 히스토리를 추가하여 PR Dashboard의 알림 UX를 개선한다.

**Architecture:** 기존 `notifications.ts`에 알림 store + localStorage 영속화를 추가하고, `filters.ts`에 `activeTab` store를 승격한다. Toast와 NotificationBell은 독립 Svelte 컴포넌트로 만들고 Dashboard에서 마운트한다. 알림 클릭 시 `navigateToNotification()`이 `activeTab` + `searchQuery`를 세팅하여 해당 PR로 네비게이션한다.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Vitest, localStorage

**Spec:** `docs/superpowers/specs/2026-03-30-notification-ux-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/types.ts` | Modify | `AppNotification` 타입 추가 |
| `src/lib/notifications.ts` | Modify | 알림 store, CRUD 함수, localStorage 영속, navigateToNotification, 토스트 큐 store |
| `src/lib/stores/filters.ts` | Modify | `activeTab` writable store 추가 |
| `src/lib/stores/settings.ts` | Modify | `showSettings` writable store 추가 |
| `src/lib/components/Toast.svelte` | Create | 토스트 알림 UI (슬라이드인, 자동 소멸, 클릭 네비게이션) |
| `src/lib/components/NotificationBell.svelte` | Create | 벨 아이콘 + 드롭다운 알림 목록 |
| `src/lib/components/Dashboard.svelte` | Modify | Toast/NotificationBell 마운트, activeTab/showSettings를 store로 교체 |
| `tests/lib/notifications.test.ts` | Modify | store, TTL, 네비게이션 테스트 추가 |

---

## Task 1: AppNotification 타입 추가

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: types.ts에 AppNotification 인터페이스 추가**

`src/lib/types.ts` 파일 끝에 추가:

```typescript
export interface AppNotification {
  id: string;
  type: "new_review" | "review_request";
  prTitle: string;
  prUrl: string;
  actor: string;
  reviewState?: ReviewState;
  read: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: 타입 체크 실행**

Run: `npm run check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add AppNotification type"
```

---

## Task 2: activeTab과 showSettings store 승격

**Files:**
- Modify: `src/lib/stores/filters.ts`
- Modify: `src/lib/stores/settings.ts`
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: filters.ts에 activeTab store 추가**

`src/lib/stores/filters.ts`에서 기존 import에 `type`을 추가하고, 파일 상단 store 선언부에 추가:

```typescript
export type TabKey = "my-prs" | "review-requests";
export const activeTab = writable<TabKey>("my-prs");
```

- [ ] **Step 2: settings.ts에 showSettings store 추가**

`src/lib/stores/settings.ts` 파일 상단에 추가:

```typescript
export const showSettings = writable(false);
```

- [ ] **Step 3: Dashboard.svelte에서 로컬 상태를 store로 교체**

`src/lib/components/Dashboard.svelte`의 `<script>` 블록을 수정한다.

import 변경 — 기존:
```typescript
import { loadSettings } from "$lib/stores/settings";
```
변경 후:
```typescript
import { loadSettings, showSettings } from "$lib/stores/settings";
import { activeTab } from "$lib/stores/filters";
```

로컬 상태 제거 — 다음 두 줄을 삭제:
```typescript
let activeTab: "my-prs" | "review-requests" = $state("my-prs");
let showSettings = $state(false);
```

템플릿에서 store 사용 — `activeTab`을 `$activeTab`로, `showSettings`를 `$showSettings`로 교체:
- `{#if showSettings}` → `{#if $showSettings}`
- `onclose={() => (showSettings = false)}` → `onclose={() => showSettings.set(false)}`
- `onclick={() => (showSettings = !showSettings)}` → `onclick={() => showSettings.update(v => !v)}`
- `bind:activeTab` → `bind:activeTab={$activeTab}` (TabBar에서)
- `{#if activeTab === "my-prs"}` → `{#if $activeTab === "my-prs"}`

- [ ] **Step 4: 타입 체크 실행**

Run: `npm run check`
Expected: 에러 없이 통과

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/filters.ts src/lib/stores/settings.ts src/lib/components/Dashboard.svelte
git commit -m "refactor: promote activeTab and showSettings to stores"
```

---

## Task 3: 알림 Store + localStorage 영속화

**Files:**
- Modify: `src/lib/notifications.ts`
- Test: `tests/lib/notifications.test.ts`

- [ ] **Step 1: 테스트 작성 — loadNotifications, addNotification, markAsRead, markAllAsRead, TTL 정리**

`tests/lib/notifications.test.ts`에 기존 테스트 아래에 추가:

```typescript
import {
  detectNewReviews,
  detectNewReviewRequests,
  notifications,
  unreadCount,
  loadNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  NOTIFICATIONS_STORAGE_KEY,
  MAX_NOTIFICATIONS,
  TTL_MS,
} from "../../src/lib/notifications";
import { get } from "svelte/store";
import type { AppNotification } from "../../src/lib/types";

// 기존 import를 위 통합 import로 교체

describe("notification store", () => {
  beforeEach(() => {
    localStorage.clear();
    notifications.set([]);
  });

  it("addNotification adds to store and saves to localStorage", () => {
    addNotification({
      type: "new_review",
      prTitle: "fix: bug",
      prUrl: "https://github.com/a/b/pull/1",
      actor: "kim",
      reviewState: "approved",
    });

    const items = get(notifications);
    expect(items).toHaveLength(1);
    expect(items[0].prTitle).toBe("fix: bug");
    expect(items[0].read).toBe(false);
    expect(items[0].id).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it("addNotification caps at MAX_NOTIFICATIONS, removing oldest", () => {
    for (let i = 0; i < MAX_NOTIFICATIONS + 5; i++) {
      addNotification({
        type: "review_request",
        prTitle: `PR #${i}`,
        prUrl: `https://github.com/a/b/pull/${i}`,
        actor: "user",
      });
    }

    expect(get(notifications)).toHaveLength(MAX_NOTIFICATIONS);
    // 가장 최신 항목이 앞에 있어야 함
    expect(get(notifications)[0].prTitle).toBe(`PR #${MAX_NOTIFICATIONS + 4}`);
  });

  it("markAsRead marks a single notification as read", () => {
    addNotification({
      type: "new_review",
      prTitle: "fix: bug",
      prUrl: "https://github.com/a/b/pull/1",
      actor: "kim",
    });

    const id = get(notifications)[0].id;
    markAsRead(id);

    expect(get(notifications)[0].read).toBe(true);
    const stored = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)!);
    expect(stored[0].read).toBe(true);
  });

  it("markAllAsRead marks all notifications as read", () => {
    addNotification({ type: "new_review", prTitle: "PR 1", prUrl: "", actor: "a" });
    addNotification({ type: "review_request", prTitle: "PR 2", prUrl: "", actor: "b" });

    markAllAsRead();

    const items = get(notifications);
    expect(items.every((n) => n.read)).toBe(true);
  });

  it("unreadCount returns count of unread notifications", () => {
    addNotification({ type: "new_review", prTitle: "PR 1", prUrl: "", actor: "a" });
    addNotification({ type: "review_request", prTitle: "PR 2", prUrl: "", actor: "b" });

    expect(get(unreadCount)).toBe(2);

    markAsRead(get(notifications)[0].id);
    expect(get(unreadCount)).toBe(1);
  });

  it("loadNotifications restores from localStorage", () => {
    const saved: AppNotification[] = [{
      id: "test-1",
      type: "new_review",
      prTitle: "saved PR",
      prUrl: "",
      actor: "user",
      read: false,
      createdAt: new Date().toISOString(),
    }];
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(saved));

    loadNotifications();

    expect(get(notifications)).toHaveLength(1);
    expect(get(notifications)[0].prTitle).toBe("saved PR");
  });

  it("loadNotifications removes expired notifications (older than TTL)", () => {
    const old: AppNotification[] = [{
      id: "old-1",
      type: "new_review",
      prTitle: "expired PR",
      prUrl: "",
      actor: "user",
      read: true,
      createdAt: new Date(Date.now() - TTL_MS - 1000).toISOString(),
    }];
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(old));

    loadNotifications();

    expect(get(notifications)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: 새 테스트들이 FAIL (notifications, unreadCount 등이 아직 export되지 않음)

- [ ] **Step 3: notifications.ts에 store 구현**

`src/lib/notifications.ts`를 수정한다. 기존 코드(import, interface, detect 함수들, requestNotificationPermission, checkAndNotify)는 유지하고 store 로직을 추가한다.

파일 상단 import를 수정:
```typescript
import { writable, derived, get } from "svelte/store";
import type { MyPR, ReviewRequestedPR, AppNotification } from "./types";
import { settings } from "./stores/settings";
```

기존 `NewReviewEvent`, `NewReviewRequestEvent` interface 아래, `detectNewReviews` 함수 위에 상수와 store를 추가:

```typescript
export const NOTIFICATIONS_STORAGE_KEY = "pr-dashboard-notifications";
export const MAX_NOTIFICATIONS = 50;
export const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const notifications = writable<AppNotification[]>([]);
export const unreadCount = derived(notifications, ($n) => $n.filter((x) => !x.read).length);

function saveToStorage(items: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
}

export function loadNotifications() {
  const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed: AppNotification[] = JSON.parse(raw);
    const now = Date.now();
    const valid = parsed.filter(
      (n) => now - new Date(n.createdAt).getTime() < TTL_MS
    );
    const trimmed = valid.slice(0, MAX_NOTIFICATIONS);
    notifications.set(trimmed);
    saveToStorage(trimmed);
  } catch {
    // ignore corrupted data
  }
}

export function addNotification(event: {
  type: "new_review" | "review_request";
  prTitle: string;
  prUrl: string;
  actor: string;
  reviewState?: string;
}) {
  const item: AppNotification = {
    id: crypto.randomUUID(),
    type: event.type,
    prTitle: event.prTitle,
    prUrl: event.prUrl,
    actor: event.actor,
    reviewState: event.reviewState as AppNotification["reviewState"],
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.update((prev) => {
    const updated = [item, ...prev].slice(0, MAX_NOTIFICATIONS);
    saveToStorage(updated);
    return updated;
  });
}

export function markAsRead(id: string) {
  notifications.update((prev) => {
    const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveToStorage(updated);
    return updated;
  });
}

export function markAllAsRead() {
  notifications.update((prev) => {
    const updated = prev.map((n) => ({ ...n, read: true }));
    saveToStorage(updated);
    return updated;
  });
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts tests/lib/notifications.test.ts
git commit -m "feat: add notification store with localStorage persistence and TTL"
```

---

## Task 4: navigateToNotification + 토스트 큐

**Files:**
- Modify: `src/lib/notifications.ts`
- Test: `tests/lib/notifications.test.ts`

- [ ] **Step 1: 테스트 작성 — navigateToNotification과 토스트 큐**

`tests/lib/notifications.test.ts`에 추가:

```typescript
import {
  // ... 기존 import에 추가:
  navigateToNotification,
  toastQueue,
  dismissToast,
} from "../../src/lib/notifications";
import { activeTab } from "../../src/lib/stores/filters";
import { showSettings } from "../../src/lib/stores/settings";
import { searchQuery } from "../../src/lib/stores/filters";

describe("navigateToNotification", () => {
  beforeEach(() => {
    localStorage.clear();
    notifications.set([]);
    activeTab.set("my-prs");
    searchQuery.set("");
    showSettings.set(false);
  });

  it("switches to my-prs tab for new_review type", () => {
    const notif: AppNotification = {
      id: "1", type: "new_review", prTitle: "fix: bug",
      prUrl: "", actor: "kim", read: false, createdAt: new Date().toISOString(),
    };
    navigateToNotification(notif);

    expect(get(activeTab)).toBe("my-prs");
    expect(get(searchQuery)).toBe("fix: bug");
    expect(get(showSettings)).toBe(false);
  });

  it("switches to review-requests tab for review_request type", () => {
    showSettings.set(true);
    const notif: AppNotification = {
      id: "2", type: "review_request", prTitle: "feat: payment",
      prUrl: "", actor: "hong", read: false, createdAt: new Date().toISOString(),
    };
    navigateToNotification(notif);

    expect(get(activeTab)).toBe("review-requests");
    expect(get(searchQuery)).toBe("feat: payment");
    expect(get(showSettings)).toBe(false);
  });

  it("marks the notification as read", () => {
    addNotification({ type: "new_review", prTitle: "test", prUrl: "", actor: "a" });
    const notif = get(notifications)[0];

    navigateToNotification(notif);

    expect(get(notifications)[0].read).toBe(true);
  });
});

describe("toastQueue", () => {
  beforeEach(() => {
    toastQueue.set([]);
  });

  it("dismissToast removes a toast by id", () => {
    const notif: AppNotification = {
      id: "t1", type: "new_review", prTitle: "test",
      prUrl: "", actor: "a", read: false, createdAt: new Date().toISOString(),
    };
    toastQueue.set([notif]);

    dismissToast("t1");

    expect(get(toastQueue)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: FAIL (navigateToNotification, toastQueue, dismissToast가 아직 없음)

- [ ] **Step 3: notifications.ts에 네비게이션과 토스트 큐 구현**

`src/lib/notifications.ts`의 import에 추가:

```typescript
import { activeTab, searchQuery } from "./stores/filters";
import { showSettings } from "./stores/settings";
```

`markAllAsRead()` 함수 아래에 추가:

```typescript
export const toastQueue = writable<AppNotification[]>([]);

export function dismissToast(id: string) {
  toastQueue.update((prev) => prev.filter((t) => t.id !== id));
}

export function navigateToNotification(notif: AppNotification) {
  showSettings.set(false);
  activeTab.set(notif.type === "new_review" ? "my-prs" : "review-requests");
  searchQuery.set(notif.prTitle);
  markAsRead(notif.id);
}
```

- [ ] **Step 4: checkAndNotify에서 addNotification + toastQueue 연동**

`checkAndNotify()` 함수를 수정한다. 기존 `new Notification()` 호출 직전에 `addNotification()`과 `toastQueue` 업데이트를 추가한다.

기존 new review 알림 루프:
```typescript
  if ($settings.notifyOnNewReview) {
    const newReviews = detectNewReviews(prevMyPRs, currMyPRs);
    for (const event of newReviews) {
      new Notification(`New review: ${event.prTitle}`, {
        body: `${event.reviewer} — ${event.state}`,
      });
    }
  }
```

변경 후:
```typescript
  if ($settings.notifyOnNewReview) {
    const newReviews = detectNewReviews(prevMyPRs, currMyPRs);
    for (const event of newReviews) {
      const added = addNotification({
        type: "new_review",
        prTitle: event.prTitle,
        prUrl: event.prUrl,
        actor: event.reviewer,
        reviewState: event.state,
      });
      if (!document.hidden) {
        toastQueue.update((q) => [...q, get(notifications)[0]]);
      }
      if (permitted) {
        const n = new Notification(`New review: ${event.prTitle}`, {
          body: `${event.reviewer} — ${event.state}`,
        });
        const notif = get(notifications)[0];
        n.onclick = () => {
          window.focus();
          navigateToNotification(notif);
        };
      }
    }
  }
```

기존 review request 알림 루프:
```typescript
  if ($settings.notifyOnReviewRequest) {
    const newRequests = detectNewReviewRequests(prevReviewPRs, currReviewPRs);
    for (const event of newRequests) {
      new Notification(`Review requested: ${event.prTitle}`, {
        body: `from ${event.author}`,
      });
    }
  }
```

변경 후:
```typescript
  if ($settings.notifyOnReviewRequest) {
    const newRequests = detectNewReviewRequests(prevReviewPRs, currReviewPRs);
    for (const event of newRequests) {
      addNotification({
        type: "review_request",
        prTitle: event.prTitle,
        prUrl: event.prUrl,
        actor: event.author,
      });
      if (!document.hidden) {
        toastQueue.update((q) => [...q, get(notifications)[0]]);
      }
      if (permitted) {
        const n = new Notification(`Review requested: ${event.prTitle}`, {
          body: `from ${event.author}`,
        });
        const notif = get(notifications)[0];
        n.onclick = () => {
          window.focus();
          navigateToNotification(notif);
        };
      }
    }
  }
```

또한 `checkAndNotify`의 브라우저 알림 권한 체크 위치를 변경한다. 인앱 알림은 권한 무관하게 동작해야 하므로, `permitted` 체크를 `new Notification()` 직전으로 이동(위 코드에 이미 반영됨). 함수 상단의 early return을 제거:

기존:
```typescript
  const permitted = await requestNotificationPermission();
  if (!permitted) return;
```

변경 후:
```typescript
  const permitted = await requestNotificationPermission();
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications.ts tests/lib/notifications.test.ts
git commit -m "feat: add navigateToNotification, toast queue, and browser notification onclick"
```

---

## Task 5: Toast 컴포넌트

**Files:**
- Create: `src/lib/components/Toast.svelte`

- [ ] **Step 1: Toast.svelte 생성**

`src/lib/components/Toast.svelte`:

```svelte
<script lang="ts">
  import { toastQueue, dismissToast, navigateToNotification } from "$lib/notifications";
  import { onDestroy } from "svelte";

  const MAX_VISIBLE = 3;

  let timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // 새 토스트가 추가되면 5초 타이머 설정
  const unsubscribe = toastQueue.subscribe(($queue) => {
    for (const notif of $queue) {
      if (!timers.has(notif.id)) {
        const timer = setTimeout(() => {
          dismissToast(notif.id);
          timers.delete(notif.id);
        }, 5000);
        timers.set(notif.id, timer);
      }
    }
  });

  onDestroy(() => {
    unsubscribe();
    for (const timer of timers.values()) clearTimeout(timer);
  });

  function handleClick(notif: import("$lib/types").AppNotification) {
    dismissToast(notif.id);
    navigateToNotification(notif);
  }

  function getBody(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") {
      return `${notif.actor} — ${notif.reviewState ?? "reviewed"}`;
    }
    return `from ${notif.actor}`;
  }

  function getTitle(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") return "New review";
    return "Review requested";
  }
</script>

<div class="toast-container">
  {#each $toastQueue.slice(0, MAX_VISIBLE) as notif (notif.id)}
    <button class="toast" onclick={() => handleClick(notif)}>
      <div class="toast-title">{getTitle(notif)}</div>
      <div class="toast-pr">{notif.prTitle}</div>
      <div class="toast-body">{getBody(notif)}</div>
    </button>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    min-width: 280px;
    max-width: 360px;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
    animation: slide-in 0.3s ease-out;
    transition: opacity 0.2s, transform 0.2s;
  }

  .toast:hover {
    border-color: #58a6ff;
  }

  .toast-title {
    font-size: 0.7rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .toast-pr {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e6edf3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toast-body {
    font-size: 0.75rem;
    color: #8b949e;
    margin-top: 0.125rem;
  }

  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
```

- [ ] **Step 2: 타입 체크 실행**

Run: `npm run check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/Toast.svelte
git commit -m "feat: add Toast component for in-app notifications"
```

---

## Task 6: NotificationBell 컴포넌트

**Files:**
- Create: `src/lib/components/NotificationBell.svelte`

- [ ] **Step 1: NotificationBell.svelte 생성**

`src/lib/components/NotificationBell.svelte`:

```svelte
<script lang="ts">
  import { notifications, unreadCount, markAsRead, markAllAsRead, navigateToNotification } from "$lib/notifications";
  import { relativeTime } from "$lib/utils";

  let open = $state(false);

  function handleItemClick(notif: import("$lib/types").AppNotification) {
    open = false;
    navigateToNotification(notif);
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".notification-bell")) {
      open = false;
    }
  }

  function getIcon(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") return "💬";
    return "👀";
  }

  function getSubtext(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") {
      return `${notif.actor} — ${notif.reviewState ?? "reviewed"}`;
    }
    return `from ${notif.actor}`;
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="notification-bell">
  <button class="bell-btn" onclick={() => (open = !open)} title="Notifications">
    🔔
    {#if $unreadCount > 0}
      <span class="badge">{$unreadCount}</span>
    {/if}
  </button>

  {#if open}
    <div class="dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Notifications</span>
        {#if $unreadCount > 0}
          <button class="mark-all-btn" onclick={markAllAsRead}>Mark all read</button>
        {/if}
      </div>
      <div class="dropdown-list">
        {#each $notifications as notif (notif.id)}
          <button class="notif-item" class:unread={!notif.read} onclick={() => handleItemClick(notif)}>
            {#if !notif.read}
              <span class="unread-dot"></span>
            {/if}
            <span class="notif-icon">{getIcon(notif)}</span>
            <div class="notif-content">
              <div class="notif-pr">{notif.prTitle}</div>
              <div class="notif-meta">
                {getSubtext(notif)} · {relativeTime(notif.createdAt)}
              </div>
            </div>
          </button>
        {:else}
          <div class="empty">No notifications</div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .notification-bell {
    position: relative;
  }

  .bell-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
    position: relative;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -6px;
    background: #da3633;
    color: #fff;
    font-size: 0.6rem;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 340px;
    max-height: 400px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    overflow: hidden;
    z-index: 100;
    display: flex;
    flex-direction: column;
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #30363d;
  }

  .dropdown-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e6edf3;
  }

  .mark-all-btn {
    background: none;
    border: none;
    color: #58a6ff;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0;
  }

  .mark-all-btn:hover {
    text-decoration: underline;
  }

  .dropdown-list {
    overflow-y: auto;
    flex: 1;
  }

  .notif-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid #21262d;
    cursor: pointer;
    width: 100%;
    text-align: left;
    background: none;
    border-left: none;
    border-right: none;
    border-top: none;
    font: inherit;
    color: inherit;
    position: relative;
  }

  .notif-item:hover {
    background: #21262d;
  }

  .unread-dot {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #58a6ff;
  }

  .unread {
    padding-left: 1.25rem;
  }

  .notif-icon {
    font-size: 0.85rem;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .notif-content {
    min-width: 0;
    flex: 1;
  }

  .notif-pr {
    font-size: 0.8rem;
    font-weight: 600;
    color: #e6edf3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .notif-meta {
    font-size: 0.7rem;
    color: #8b949e;
    margin-top: 2px;
  }

  .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: #484f58;
    font-size: 0.8rem;
  }
</style>
```

- [ ] **Step 2: 타입 체크 실행**

Run: `npm run check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/NotificationBell.svelte
git commit -m "feat: add NotificationBell component with dropdown and read/unread state"
```

---

## Task 7: Dashboard 통합

**Files:**
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: Dashboard에 Toast + NotificationBell 마운트 및 loadNotifications 호출**

`src/lib/components/Dashboard.svelte`의 `<script>` import에 추가:

```typescript
import Toast from "./Toast.svelte";
import NotificationBell from "./NotificationBell.svelte";
import { loadNotifications } from "$lib/notifications";
```

`onMount` 내부의 `await loadSettings()` 뒤에 추가:

```typescript
loadNotifications();
```

헤더의 `.header-actions` 안에서 Settings 버튼 앞에 NotificationBell 추가:

기존:
```svelte
<button class="icon-btn" onclick={() => showSettings.update(v => !v)} title="Settings">
```

변경 후:
```svelte
<NotificationBell />
<button class="icon-btn" onclick={() => showSettings.update(v => !v)} title="Settings">
```

닫는 `</div>` 뒤, `</style>` 앞에 Toast 마운트:

`{/if}` (showSettings else 블록의 마지막) 아래, `</div>` (dashboard div) 아래에 추가:

기존:
```svelte
  {/if}
</div>
```

변경 후:
```svelte
  {/if}
</div>

<Toast />
```

- [ ] **Step 2: 타입 체크 실행**

Run: `npm run check`
Expected: 에러 없이 통과

- [ ] **Step 3: 개발 서버에서 수동 확인**

Run: `npm run dev`
확인 사항:
- 헤더에 벨 아이콘이 보이는지
- 벨 클릭 시 드롭다운이 열리는지
- "No notifications" 표시되는지

- [ ] **Step 4: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Dashboard.svelte
git commit -m "feat: integrate Toast and NotificationBell into Dashboard"
```

---

## Task 8: 최종 검증

**Files:** (변경 없음, 검증만)

- [ ] **Step 1: 타입 체크**

Run: `npm run check`
Expected: 에러 없이 통과

- [ ] **Step 2: 전체 테스트**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 3: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공, 에러/경고 없음

- [ ] **Step 4: Commit (필요한 경우)**

빌드 과정에서 수정이 필요했다면 커밋:
```bash
git add -A
git commit -m "fix: resolve build issues"
```
