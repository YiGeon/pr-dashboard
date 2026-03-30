# UI/UX 통합 리팩터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSS 토큰 기반으로 반응형, WCAG AA 접근성, 마이크로 인터랙션, 설정 패널, Review Requests 탭을 통합 개선한다.

**Architecture:** `app.css`에 디자인 토큰을 정의하고, 9개 컴포넌트에 토큰/반응형/a11y를 일괄 적용. Settings를 슬라이드 오버 패널로 전환하고, Review Requests 탭에 대기시간/사이즈 뱃지를 추가. 마이크로 인터랙션은 prs.ts 스토어에서 isNew/hasChanged 플래그를 관리.

**Tech Stack:** SvelteKit, Svelte 5 (runes), CSS Custom Properties, Vitest

**Spec:** `docs/superpowers/specs/2026-03-30-uiux-integrated-refactor-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app.css` | Modify | CSS 토큰 정의, focus-visible 전역, 반응형 미디어 쿼리 |
| `src/lib/utils.ts` | Modify | `prSize()`, `waitingHours()`, `waitingColor()` 함수 추가 |
| `tests/lib/utils.test.ts` | Modify | 새 유틸 함수 테스트 추가 |
| `src/lib/components/TabBar.svelte` | Modify | 토큰, ARIA tablist/tab |
| `src/lib/components/FilterBar.svelte` | Modify | 토큰, 반응형 세로 스택 |
| `src/lib/components/PRCard.svelte` | Modify | 토큰, 반응형, a11y, hover 변경, 대기시간/사이즈 뱃지, 트랜지션 |
| `src/lib/components/PRList.svelte` | Modify | 토큰, 반응형, ARIA listbox, 트랜지션 |
| `src/lib/components/Dashboard.svelte` | Modify | 설정 오버레이 구조, aria-live, 폴링 피드백, svelte-ignore 해결 |
| `src/lib/components/Settings.svelte` | Modify | 슬라이드 오버 패널, focus trap, 토큰 |
| `src/lib/components/NotificationBell.svelte` | Modify | 토큰, aria-expanded, 반응형 드롭다운 |
| `src/lib/components/Toast.svelte` | Modify | 토큰, role="alert" |
| `src/lib/components/Login.svelte` | Modify | 토큰 |
| `src/lib/stores/prs.ts` | Modify | isNew/hasChanged 플래그 관리 |

---

### Task 1: CSS 디자인 토큰 정의

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: app.css에 CSS custom properties 추가**

`src/app.css`의 기존 `html, body` 룰 위에 `:root` 블록 추가:

```css
:root {
  /* Surfaces */
  --color-bg-primary: #0d1117;
  --color-bg-secondary: #161b22;
  --color-bg-tertiary: #21262d;

  /* Borders */
  --color-border-default: #30363d;
  --color-border-muted: #21262d;

  /* Text */
  --color-text-primary: #e6edf3;
  --color-text-secondary: #c9d1d9;
  --color-text-muted: #8b949e;
  --color-text-subtle: #768390;

  /* Status */
  --color-success: #3fb950;
  --color-danger: #da3633;
  --color-warning: #d29922;
  --color-accent: #58a6ff;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* Focus */
  --focus-ring: 0 0 0 2px var(--color-bg-primary),
                0 0 0 4px var(--color-accent);
}
```

- [ ] **Step 2: 전역 focus-visible 스타일 추가**

`app.css`의 `::selection` 룰 뒤에 추가:

```css
:focus-visible {
  box-shadow: var(--focus-ring);
  outline: none;
}

:focus:not(:focus-visible) {
  box-shadow: none;
  outline: none;
}
```

- [ ] **Step 3: app.css 기존 값을 토큰으로 교체**

`html, body`의 `background: #0d1117` → `background: var(--color-bg-primary)`, `color: #c9d1d9` → `color: var(--color-text-secondary)`.

스크롤바: `#30363d` → `var(--color-border-default)`, `#484f58` → 그대로 (토큰에 없는 값, hover 전용).

`::selection`: `rgba(88, 166, 255, 0.3)` → `rgba(88, 166, 255, 0.3)` (alpha 값이라 토큰화 불필요).

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 5: Commit**

```bash
git add src/app.css
git commit -m "refactor: CSS 디자인 토큰 및 focus-visible 전역 스타일 정의"
```

---

### Task 2: 유틸 함수 추가 (TDD)

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `tests/lib/utils.test.ts`

- [ ] **Step 1: prSize 테스트 작성**

`tests/lib/utils.test.ts` 끝에 추가:

```typescript
import { relativeTime, computeReviewStatus, reviewStatusPriority, labelTextColor, prSize, waitingHours, waitingColor } from "../../src/lib/utils";
```

(기존 import 행을 위 내용으로 교체)

```typescript
describe("prSize", () => {
  it("returns XS for ≤10 lines", () => {
    expect(prSize(5, 3)).toEqual({ label: "XS", color: "var(--color-success)" });
  });

  it("returns S for ≤50 lines", () => {
    expect(prSize(30, 15)).toEqual({ label: "S", color: "var(--color-success)" });
  });

  it("returns M for ≤200 lines", () => {
    expect(prSize(100, 80)).toEqual({ label: "M", color: "var(--color-warning)" });
  });

  it("returns L for ≤500 lines", () => {
    expect(prSize(300, 150)).toEqual({ label: "L", color: "var(--color-danger)" });
  });

  it("returns XL for >500 lines", () => {
    expect(prSize(400, 200)).toEqual({ label: "XL", color: "var(--color-danger)" });
  });

  it("boundary: exactly 10 → XS", () => {
    expect(prSize(5, 5)).toEqual({ label: "XS", color: "var(--color-success)" });
  });

  it("boundary: exactly 51 → M", () => {
    expect(prSize(26, 25)).toEqual({ label: "M", color: "var(--color-warning)" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --run tests/lib/utils.test.ts`
Expected: FAIL — `prSize` is not exported

- [ ] **Step 3: prSize 구현**

`src/lib/utils.ts` 끝에 추가:

```typescript
export function prSize(additions: number, deletions: number): { label: string; color: string } {
  const total = additions + deletions;
  if (total <= 10) return { label: "XS", color: "var(--color-success)" };
  if (total <= 50) return { label: "S", color: "var(--color-success)" };
  if (total <= 200) return { label: "M", color: "var(--color-warning)" };
  if (total <= 500) return { label: "L", color: "var(--color-danger)" };
  return { label: "XL", color: "var(--color-danger)" };
}
```

- [ ] **Step 4: prSize 테스트 통과 확인**

Run: `npm test -- --run tests/lib/utils.test.ts`
Expected: 모든 prSize 테스트 PASS

- [ ] **Step 5: waitingHours, waitingColor 테스트 작성**

`tests/lib/utils.test.ts`에 추가:

```typescript
describe("waitingHours", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-26T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns hours since creation for new review request", () => {
    expect(waitingHours("2026-03-26T09:00:00Z", null)).toBe(3);
  });

  it("uses updatedAt for re-review (previousReviewStatus present)", () => {
    expect(waitingHours("2026-03-25T12:00:00Z", "2026-03-26T10:00:00Z")).toBe(2);
  });

  it("returns 0 for future date", () => {
    expect(waitingHours("2026-03-26T13:00:00Z", null)).toBe(0);
  });
});

describe("waitingColor", () => {
  it("returns success for <4 hours", () => {
    expect(waitingColor(2)).toBe("var(--color-success)");
  });

  it("returns warning for 4-24 hours", () => {
    expect(waitingColor(6)).toBe("var(--color-warning)");
  });

  it("returns danger for >24 hours", () => {
    expect(waitingColor(30)).toBe("var(--color-danger)");
  });

  it("boundary: exactly 4 → warning", () => {
    expect(waitingColor(4)).toBe("var(--color-warning)");
  });

  it("boundary: exactly 24 → danger", () => {
    expect(waitingColor(24)).toBe("var(--color-danger)");
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm test -- --run tests/lib/utils.test.ts`
Expected: FAIL — `waitingHours`, `waitingColor` not exported

- [ ] **Step 7: waitingHours, waitingColor 구현**

`src/lib/utils.ts`에 추가:

```typescript
export function waitingHours(createdAt: string, updatedAt: string | null): number {
  const baseTime = updatedAt ?? createdAt;
  const diffMs = Date.now() - new Date(baseTime).getTime();
  return Math.max(0, Math.floor(diffMs / 3600000));
}

export function waitingColor(hours: number): string {
  if (hours >= 24) return "var(--color-danger)";
  if (hours >= 4) return "var(--color-warning)";
  return "var(--color-success)";
}
```

- [ ] **Step 8: 전체 유틸 테스트 통과 확인**

Run: `npm test -- --run tests/lib/utils.test.ts`
Expected: 모든 테스트 PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/utils.ts tests/lib/utils.test.ts
git commit -m "feat: prSize, waitingHours, waitingColor 유틸 함수 추가 (TDD)"
```

---

### Task 3: TabBar 토큰 + ARIA

**Files:**
- Modify: `src/lib/components/TabBar.svelte`

- [ ] **Step 1: ARIA 속성 추가**

`TabBar.svelte`의 템플릿을 수정:

```svelte
<div class="tab-bar" role="tablist">
  <button
    class="tab"
    class:active={activeTab === "review-requests"}
    onclick={() => (activeTab = "review-requests")}
    role="tab"
    aria-selected={activeTab === "review-requests"}
    aria-controls="tabpanel-review-requests"
    id="tab-review-requests"
  >
    Review Requests ({$reviewRequestedPRs.length})
  </button>
  <button
    class="tab"
    class:active={activeTab === "my-prs"}
    onclick={() => (activeTab = "my-prs")}
    role="tab"
    aria-selected={activeTab === "my-prs"}
    aria-controls="tabpanel-my-prs"
    id="tab-my-prs"
  >
    My PRs ({$myPRs.length})
    {#if $urgentMyPRCount > 0}
      <span class="urgent-badge">{$urgentMyPRCount}</span>
    {/if}
  </button>
</div>
```

- [ ] **Step 2: CSS를 토큰으로 교체**

`<style>` 섹션에서 하드코딩된 값을 토큰으로 교체:

| 기존 값 | 토큰 |
|---------|------|
| `#21262d` (border-bottom, tab.active bg) | `var(--color-border-muted)` / `var(--color-bg-tertiary)` |
| `#8b949e` (tab color) | `var(--color-text-muted)` |
| `#c9d1d9` (tab:hover) | `var(--color-text-secondary)` |
| `#ffffff` (tab.active) | `var(--color-text-primary)` |
| `#30363d` (tab.active border) | `var(--color-border-default)` |
| `#da3633` (urgent-badge) | `var(--color-danger)` |
| `#161b22` (tab-bar bg) | `var(--color-bg-secondary)` |
| `20px` (border-radius) | `var(--radius-full)` |
| `8px` (urgent-badge radius) | `var(--radius-lg)` |

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/TabBar.svelte
git commit -m "refactor: TabBar에 ARIA tablist/tab 속성 및 CSS 토큰 적용"
```

---

### Task 4: FilterBar 토큰 + 반응형

**Files:**
- Modify: `src/lib/components/FilterBar.svelte`

- [ ] **Step 1: CSS를 토큰으로 교체**

`<style>` 섹션에서 하드코딩된 값 교체:

| 기존 값 | 토큰 |
|---------|------|
| `#0d1117` (filter-bar bg) | `var(--color-bg-primary)` |
| `#21262d` (border-bottom) | `var(--color-border-muted)` |
| `#161b22` (filter-btn, sort-select, search-input bg) | `var(--color-bg-secondary)` |
| `#c9d1d9` (color) | `var(--color-text-secondary)` |
| `#30363d` (border) | `var(--color-border-default)` |
| `#484f58` (hover border) | 그대로 유지 (토큰에 없는 hover 전용) |
| `#58a6ff` (focus border) | `var(--color-accent)` |
| `#8b949e` (placeholder, dropdown-empty) | `var(--color-text-muted)` |
| `#21262d` (dropdown-item:hover, dropdown shadow) | `var(--color-bg-tertiary)` |
| `6px` (border-radius) | `var(--radius-md)` |
| `8px` (dropdown radius) | `var(--radius-lg)` |
| `4px` (dropdown-item radius) | `var(--radius-sm)` |

- [ ] **Step 2: 반응형 미디어 쿼리 추가**

`<style>` 섹션 끝에 추가:

```css
@media (max-width: 639px) {
  .filter-bar {
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
  }

  .search-input {
    max-width: none;
  }

  .filter-btn, .sort-select {
    width: 100%;
  }
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/FilterBar.svelte
git commit -m "refactor: FilterBar에 CSS 토큰 및 Compact 반응형 적용"
```

---

### Task 5: PRCard 토큰 + 반응형 + a11y + hover 변경

**Files:**
- Modify: `src/lib/components/PRCard.svelte`

- [ ] **Step 1: ARIA 속성 추가**

`<button>` 태그에 `role="option"` 및 `aria-selected` 추가. `aria-label`로 PR 요약 제공:

```svelte
<button
  class="pr-card"
  class:focused
  onclick={handleClick}
  bind:this={cardEl}
  role="option"
  aria-selected={focused}
  aria-label="{pr.title} — {pr.repo}, {mode === 'my-prs' ? STATUS_LABELS[(pr as MyPR).reviewStatus] : 'review requested'}"
>
```

(import에 `STATUS_LABELS` 추가 — 이미 import 되어 있음)

- [ ] **Step 2: CSS를 토큰으로 교체**

주요 교체 목록:

| 기존 값 | 토큰 |
|---------|------|
| `#161b22` (card bg) | `var(--color-bg-secondary)` |
| `#30363d` (border) | `var(--color-border-default)` |
| `#58a6ff` (focused border, accent) | `var(--color-accent)` |
| `#1c2129` (hover bg) | 제거 (hover 변경) |
| `#ffffff` (pr-title) | `var(--color-text-primary)` |
| `#8b949e` (muted text) | `var(--color-text-muted)` |
| `#656d76` (subtle text) | `var(--color-text-subtle)` |
| `#c9d1d9` (secondary text) | `var(--color-text-secondary)` |
| `#3fb950` (success) | `var(--color-success)` |
| `#f85149` / `#da3633` (danger) | `var(--color-danger)` |
| `#d29922` (warning) | `var(--color-warning)` |
| `8px` (card radius) | `var(--radius-lg)` |
| `12px` (reviewer/badge radius) | `var(--radius-full)` |
| `10px` (label/draft radius) | `var(--radius-full)` |

- [ ] **Step 3: hover 스타일 변경 (절제된 스타일)**

기존 hover:

```css
.pr-card:hover {
  border-color: #58a6ff;
  background: #1c2129;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transform: translateY(-1px);
}
```

변경:

```css
.pr-card:hover {
  border-color: var(--color-accent);
}
```

- [ ] **Step 4: status-bar에 트랜지션 추가**

```css
.status-bar {
  width: 4px;
  flex-shrink: 0;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  transition: background 300ms ease;
}
```

- [ ] **Step 5: 공통 트랜지션 추가**

```css
.pr-card {
  /* 기존 속성 유지 */
  transition: border-color 150ms ease;
}
```

(기존 `transition: all 0.2s ease;` 를 위 내용으로 교체)

- [ ] **Step 6: 반응형 미디어 쿼리 추가**

`<style>` 끝에:

```css
@media (max-width: 639px) {
  .card-content {
    padding: var(--space-3) var(--space-4);
  }

  .status-line {
    display: none;
  }

  .labels {
    max-width: 100%;
  }

  .labels .label:nth-child(n+4) {
    display: none;
  }
}

@media (min-width: 1281px) {
  .card-content {
    padding: var(--space-4) var(--space-6);
  }
}
```

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/PRCard.svelte
git commit -m "refactor: PRCard에 토큰, ARIA, 반응형, 절제된 hover 적용"
```

---

### Task 6: PRList 토큰 + 반응형 + ARIA

**Files:**
- Modify: `src/lib/components/PRList.svelte`

- [ ] **Step 1: ARIA listbox 추가 및 tabpanel 래핑**

템플릿 수정:

```svelte
<div
  class="pr-list"
  role="listbox"
  aria-label={mode === "my-prs" ? "My pull requests" : "Review requested pull requests"}
  id="tabpanel-{mode}"
  aria-labelledby="tab-{mode}"
>
```

(`role="tabpanel"` 대신 `listbox` 사용 — PRCard가 `role="option"`. tabpanel id와 labelledby는 TabBar의 `aria-controls`와 연결)

참고: `role="listbox"`가 tabpanel 역할도 겸하므로 별도 wrapper 불필요. id와 aria-labelledby로 TabBar와 연결.

- [ ] **Step 2: CSS를 토큰으로 교체**

| 기존 값 | 토큰 |
|---------|------|
| `#161b22` (skeleton bg) | `var(--color-bg-secondary)` |
| `#30363d` (skeleton border, bar) | `var(--color-border-default)` |
| `#21262d` (skeleton-line bg) | `var(--color-bg-tertiary)` |
| `#8b949e` (empty-text) | `var(--color-text-muted)` |
| `#58a6ff` (reset-btn text) | `var(--color-accent)` |
| `#21262d` (reset-btn bg) | `var(--color-bg-tertiary)` |
| `#30363d` (reset-btn border, hover bg) | `var(--color-border-default)` |
| `6px` (skeleton/reset radius) | `var(--radius-md)` |
| `4px` (skeleton-line radius) | `var(--radius-sm)` |

- [ ] **Step 3: 반응형 미디어 쿼리 추가**

```css
@media (max-width: 639px) {
  .pr-list {
    padding: var(--space-2) var(--space-3);
    gap: var(--space-2);
  }
}

@media (min-width: 1281px) {
  .pr-list {
    max-width: 1120px;
  }
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/PRList.svelte
git commit -m "refactor: PRList에 ARIA listbox, 토큰, 반응형 적용"
```

---

### Task 7: Settings 슬라이드 오버 패널

**Files:**
- Modify: `src/lib/components/Settings.svelte`
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: Settings.svelte를 슬라이드 패널 구조로 변경**

`Settings.svelte` 전체 템플릿을 래핑:

```svelte
<script lang="ts">
  import { settings, updateSettings } from "$lib/stores/settings";
  import { username, logout } from "$lib/stores/auth";
  import { onMount, onDestroy } from "svelte";

  let { onclose }: { onclose: () => void } = $props();

  let panelEl: HTMLDivElement;
  let visible = $state(false);

  let notificationPermission = $state(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  async function requestNotification() {
    const result = await Notification.requestPermission();
    notificationPermission = result;
  }

  function handlePollingChange(e: Event) {
    const value = Number((e.target as HTMLSelectElement).value);
    updateSettings({ pollingIntervalMinutes: value });
  }

  async function handleLogout() {
    await logout();
  }

  function openOrgAccess() {
    window.open("https://github.com/settings/applications", "_blank");
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closePanel();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      closePanel();
      e.stopPropagation();
    }
    // Focus trap
    if (e.key === "Tab" && panelEl) {
      const focusable = panelEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last?.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first?.focus();
        e.preventDefault();
      }
    }
  }

  function closePanel() {
    visible = false;
    setTimeout(onclose, 200); // wait for exit animation
  }

  onMount(() => {
    requestAnimationFrame(() => { visible = true; });
    panelEl?.querySelector<HTMLElement>("button")?.focus();
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="settings-overlay"
  class:visible
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
>
  <div
    class="settings-panel"
    class:visible
    bind:this={panelEl}
    role="dialog"
    aria-modal="true"
    aria-label="Settings"
  >
    <div class="settings-header">
      <h2>Settings</h2>
      <button class="close-btn" onclick={closePanel} aria-label="Close">✕</button>
    </div>

    <div class="settings-body">
      <section class="setting-group">
        <h3>Account</h3>
        <div class="setting-row">
          <span class="setting-label">Logged in as</span>
          <span class="setting-value">{$username}</span>
        </div>
        <button class="org-access-btn" onclick={openOrgAccess}>Manage organization access</button>
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
        {#if notificationPermission !== "granted"}
          <button class="org-access-btn" onclick={requestNotification}>
            {notificationPermission === "denied" ? "Notifications blocked (change in browser settings)" : "Enable browser notifications"}
          </button>
        {/if}
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
    </div>
  </div>
</div>
```

- [ ] **Step 2: Settings.svelte CSS를 슬라이드 패널 스타일로 교체**

```css
<style>
  .settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0);
    z-index: 50;
    transition: background 200ms ease;
  }

  .settings-overlay.visible {
    background: rgba(0, 0, 0, 0.4);
  }

  .settings-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 360px;
    background: var(--color-bg-secondary);
    border-left: 1px solid var(--color-border-default);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    transform: translateX(100%);
    transition: transform 200ms ease;
  }

  .settings-panel.visible {
    transform: translateX(0);
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-default);
  }

  .settings-header h2 {
    font-size: 14px;
    color: var(--color-text-primary);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 1rem;
    padding: var(--space-1);
  }

  .settings-body {
    padding: var(--space-4);
  }

  .setting-group {
    margin-bottom: var(--space-6);
  }

  .setting-group h3 {
    font-size: 12px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) 0;
    font-size: 14px;
  }

  .setting-label {
    color: var(--color-text-secondary);
  }

  .setting-value {
    color: var(--color-accent);
    font-weight: 600;
  }

  select, input[type="checkbox"] {
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-2);
    font-size: 12px;
  }

  .org-access-btn {
    background: var(--color-bg-tertiary);
    color: var(--color-accent);
    border: 1px solid var(--color-border-default);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 12px;
    cursor: pointer;
    margin-top: var(--space-2);
    width: 100%;
  }

  .org-access-btn:hover {
    background: var(--color-border-default);
  }

  .logout-btn {
    background: var(--color-danger);
    color: #fff;
    border: none;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 12px;
    cursor: pointer;
    margin-top: var(--space-2);
  }

  .logout-btn:hover {
    background: #f85149;
  }

  @media (max-width: 639px) {
    .settings-panel {
      width: 100%;
    }
  }
</style>
```

- [ ] **Step 3: Dashboard.svelte에서 설정 분기를 오버레이로 변경**

기존 코드:

```svelte
{#if $showSettings}
  {#await import("./Settings.svelte") then { default: Settings }}
    <Settings onclose={() => showSettings.set(false)} />
  {/await}
{:else}
  <TabBar bind:activeTab={$activeTab} />
  <FilterBar />
  {#if $activeTab === "my-prs"}
    <PRList prs={$filteredMyPRs} mode="my-prs" />
  {:else}
    <PRList prs={$filteredReviewRequestedPRs} mode="review-requests" />
  {/if}
{/if}
```

변경:

```svelte
  <TabBar bind:activeTab={$activeTab} />
  <FilterBar />
  {#if $activeTab === "my-prs"}
    <PRList prs={$filteredMyPRs} mode="my-prs" />
  {:else}
    <PRList prs={$filteredReviewRequestedPRs} mode="review-requests" />
  {/if}

  {#if $showSettings}
    {#await import("./Settings.svelte") then { default: Settings }}
      <Settings onclose={() => showSettings.set(false)} />
    {/await}
  {/if}
```

- [ ] **Step 4: Dashboard 헤더 아이콘 버튼에 aria-label 추가**

Settings 버튼에 `aria-label="Open settings"`, Refresh 버튼에 `aria-label="Refresh PR list"` 추가.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Settings.svelte src/lib/components/Dashboard.svelte
git commit -m "feat: Settings를 슬라이드 오버 패널로 전환, focus trap 및 a11y 적용"
```

---

### Task 8: Dashboard 토큰 + aria-live + 폴링 피드백 + svelte-ignore 해결

**Files:**
- Modify: `src/lib/components/Dashboard.svelte`

- [ ] **Step 1: feedbackMessage에 aria-live 추가**

기존:

```svelte
{#if feedbackMessage}
  <span class="feedback-msg">{feedbackMessage}</span>
{/if}
```

변경 — `{#if}` 밖으로 빼서 항상 렌더링 (aria-live는 DOM에 있어야 동작):

```svelte
<span class="feedback-msg" aria-live="polite" aria-atomic="true">
  {feedbackMessage}
</span>
```

- [ ] **Step 2: 폴링 피드백 — refresh 아이콘 체크마크**

스크립트에 상태 추가:

```typescript
let showCheck = $state(false);
```

기존 `$effect` 수정 — feedbackMessage 설정 시 showCheck도 true:

```typescript
$effect(() => {
  const count = $lastUpdateCount;
  if (count && count > 0) {
    feedbackMessage = `${count}개 PR 업데이트됨`;
    showCheck = true;
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      feedbackMessage = "";
      showCheck = false;
      lastUpdateCount.set(null);
    }, 2000);
  }
});
```

Refresh 버튼 SVG를 조건부 렌더:

```svelte
<button class="icon-btn" onclick={fetchAll} disabled={$isLoading} aria-label="Refresh PR list">
  {#if showCheck}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--color-success)"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
  {:else}
    <svg class:spinning={$isLoading} width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 014.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177l1.38 1.38A7.002 7.002 0 0114.95 7.16a.75.75 0 11-1.49.178A5.5 5.5 0 008 2.5zM1.705 8.005a.75.75 0 01.834.656 5.5 5.5 0 009.592 2.97l-1.204-1.204a.25.25 0 01.177-.427h3.646a.25.25 0 01.25.25v3.646a.25.25 0 01-.427.177l-1.38-1.38A7.002 7.002 0 011.05 8.84a.75.75 0 01.656-.834z"></path></svg>
  {/if}
</button>
```

- [ ] **Step 3: shortcuts-overlay svelte-ignore 해결**

기존:

```svelte
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="shortcuts-overlay" role="presentation" onclick={() => (showShortcuts = false)}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="shortcuts-modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
```

변경 — `<button>` 래핑 대신 `onkeydown` 추가하고 svelte-ignore 제거:

```svelte
<div
  class="shortcuts-overlay"
  role="presentation"
  onclick={() => (showShortcuts = false)}
  onkeydown={(e) => { if (e.key === "Escape") showShortcuts = false; }}
>
  <div
    class="shortcuts-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="shortcuts-header">
      <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
```

- [ ] **Step 4: Dashboard CSS를 토큰으로 교체**

| 기존 값 | 토큰 |
|---------|------|
| `#0d1117` (dashboard bg) | `var(--color-bg-primary)` |
| `#c9d1d9` (dashboard color) | `var(--color-text-secondary)` |
| `#161b22` (title-bar bg, shortcuts-modal bg) | `var(--color-bg-secondary)` |
| `#30363d` (borders) | `var(--color-border-default)` |
| `#e6edf3` (app-title, heading) | `var(--color-text-primary)` |
| `#8b949e` (username, muted) | `var(--color-text-muted)` |
| `#656d76` (last-fetched) | `var(--color-text-subtle)` |
| `#3fb950` (feedback-msg) | `var(--color-success)` |
| `#21262d` (icon-btn:hover, shortcut bg) | `var(--color-bg-tertiary)` |
| `6px` (icon-btn radius) | `var(--radius-md)` |
| `12px` (shortcuts-modal radius) | `var(--radius-lg)` |
| `4px` (kbd, shortcuts-close radius) | `var(--radius-sm)` |

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Dashboard.svelte
git commit -m "refactor: Dashboard에 토큰, aria-live, 폴링 체크마크, svelte-ignore 해결"
```

---

### Task 9: NotificationBell + Toast + Login 토큰 + a11y

**Files:**
- Modify: `src/lib/components/NotificationBell.svelte`
- Modify: `src/lib/components/Toast.svelte`
- Modify: `src/lib/components/Login.svelte`

- [ ] **Step 1: NotificationBell — aria-expanded 및 토큰**

버튼에 `aria-expanded` 추가:

```svelte
<button class="bell-btn" onclick={() => (open = !open)} aria-label="Notifications" aria-expanded={open}>
```

CSS에서 하드코딩된 값을 토큰으로 교체:

| 기존 값 | 토큰 |
|---------|------|
| `#21262d` (bell-btn:hover) | `var(--color-bg-tertiary)` |
| `#da3633` (badge) | `var(--color-danger)` |
| `#161b22` (dropdown bg) | `var(--color-bg-secondary)` |
| `#30363d` (dropdown border, header border) | `var(--color-border-default)` |
| `#e6edf3` (dropdown-title, notif-pr) | `var(--color-text-primary)` |
| `#58a6ff` (mark-all-btn, unread-dot) | `var(--color-accent)` |
| `#21262d` (notif-item border, hover) | `var(--color-border-muted)` / `var(--color-bg-tertiary)` |
| `#8b949e` (notif-meta) | `var(--color-text-muted)` |
| `#484f58` (empty) | `var(--color-text-subtle)` |
| `8px` (dropdown radius, badge radius) | `var(--radius-lg)` |
| `6px` (bell-btn radius) | `var(--radius-md)` |

반응형 추가:

```css
@media (max-width: 639px) {
  .dropdown {
    width: calc(100vw - 2rem);
    right: -1rem;
  }
}
```

- [ ] **Step 2: Toast — role="alert" 및 토큰**

토스트 `<button>` 에 `role="alert"` 추가:

```svelte
<button class="toast" role="alert" onclick={() => handleClick(notif)}>
```

CSS 토큰 교체:

| 기존 값 | 토큰 |
|---------|------|
| `#161b22` (toast bg) | `var(--color-bg-secondary)` |
| `#30363d` (toast border) | `var(--color-border-default)` |
| `#58a6ff` (hover border) | `var(--color-accent)` |
| `#8b949e` (toast-title, toast-body) | `var(--color-text-muted)` |
| `#e6edf3` (toast-pr) | `var(--color-text-primary)` |
| `8px` (toast radius) | `var(--radius-lg)` |

- [ ] **Step 3: Login — 토큰**

CSS 토큰 교체:

| 기존 값 | 토큰 |
|---------|------|
| `#0d1117` (login-container bg) | `var(--color-bg-primary)` |
| `#e6edf3` (h1) | `var(--color-text-primary)` |
| `#8b949e` (subtitle) | `var(--color-text-muted)` |
| `#238636` (login-btn) | `var(--color-success)` |
| `6px` (login-btn radius) | `var(--radius-md)` |

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/NotificationBell.svelte src/lib/components/Toast.svelte src/lib/components/Login.svelte
git commit -m "refactor: NotificationBell, Toast, Login에 토큰 및 a11y 적용"
```

---

### Task 10: Review Requests 대기시간/사이즈 뱃지

**Files:**
- Modify: `src/lib/components/PRCard.svelte`

- [ ] **Step 1: import 추가**

`PRCard.svelte` 스크립트에 추가:

```typescript
import { prSize, waitingHours, waitingColor } from "$lib/utils";
```

- [ ] **Step 2: review-requests 모드에서 뱃지 데이터 계산**

스크립트에 derived 값 추가:

```typescript
let waitingBadge = $derived.by(() => {
  if (mode !== "review-requests") return null;
  const rrPR = pr as ReviewRequestedPR;
  const baseDate = rrPR.previousReviewStatus ? rrPR.updatedAt : rrPR.createdAt;
  const hours = waitingHours(baseDate, null);
  const label = hours >= 24 ? `${Math.floor(hours / 24)}d waiting` : `${hours}h waiting`;
  return { label, color: waitingColor(hours) };
});

let sizeBadge = $derived(prSize(pr.additions, pr.deletions));
```

- [ ] **Step 3: 카드 헤더에 뱃지 렌더링**

기존 `.card-header`:

```svelte
<div class="card-header">
  <span class="pr-title">{pr.title}</span>
  {#if pr.isDraft}
    <span class="draft-badge">Draft</span>
  {/if}
</div>
```

변경:

```svelte
<div class="card-header">
  <span class="pr-title">{pr.title}</span>
  <div class="header-badges">
    {#if pr.isDraft}
      <span class="draft-badge">Draft</span>
    {/if}
    {#if mode === "review-requests" && waitingBadge}
      <span class="waiting-badge" style="background: rgba(0,0,0,0); color: {waitingBadge.color}; border-color: {waitingBadge.color}">
        {waitingBadge.label}
      </span>
    {/if}
    <span class="size-badge" style="background: rgba(0,0,0,0); color: {sizeBadge.color}; border-color: {sizeBadge.color}">
      {sizeBadge.label}
    </span>
  </div>
</div>
```

- [ ] **Step 4: review-requests 모드의 status-bar 색상을 대기 시간 기반으로 변경**

기존 `getBarColor()`:

```typescript
function getBarColor(): string {
  if (mode === "my-prs") {
    return STATUS_COLORS[(pr as MyPR).reviewStatus];
  }
  return STATUS_COLORS["pending"];
}
```

변경:

```typescript
function getBarColor(): string {
  if (mode === "my-prs") {
    return STATUS_COLORS[(pr as MyPR).reviewStatus];
  }
  const rrPR = pr as ReviewRequestedPR;
  const baseDate = rrPR.previousReviewStatus ? rrPR.updatedAt : rrPR.createdAt;
  const hours = waitingHours(baseDate, null);
  return waitingColor(hours);
}
```

- [ ] **Step 5: 뱃지 CSS 추가**

```css
.header-badges {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
  align-items: center;
}

.waiting-badge,
.size-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  border: 1px solid;
  white-space: nowrap;
}
```

- [ ] **Step 6: 기존 테스트 깨지지 않는지 확인**

Run: `npm test -- --run`
Expected: 모든 테스트 PASS

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/PRCard.svelte
git commit -m "feat: Review Requests 카드에 대기시간/사이즈 뱃지 및 긴급도 status-bar 추가"
```

---

### Task 11: 마이크로 인터랙션 — 새 PR, 상태 변경, PR 사라짐

**Files:**
- Modify: `src/lib/stores/prs.ts`
- Modify: `src/lib/components/PRCard.svelte`
- Modify: `src/lib/components/PRList.svelte`

- [ ] **Step 1: prs.ts에 이전 ID Set 및 변경 감지 추가**

`prs.ts`에 모듈 레벨 변수 추가 (기존 `pollingTimer` 근처):

```typescript
let previousMyPRIds = new Set<string>();
let previousReviewPRIds = new Set<string>();
let previousMyPRStates = new Map<string, string>(); // id → reviewStatus
let isFirstFetch = true;
```

새로운 export store 추가 (기존 export 블록 근처):

```typescript
export const newPRIds = writable<Set<string>>(new Set());
export const changedPRIds = writable<Set<string>>(new Set());
```

`fetchAll()` 함수 내부, `myPRs.set(myPRData)` 직전에 추가:

```typescript
// Skip marking on first fetch — all PRs would appear "new"
if (!isFirstFetch) {
  const allPrevIds = new Set([...previousMyPRIds, ...previousReviewPRIds]);
  const foundNewIds = new Set([
    ...myPRData.filter(p => !allPrevIds.has(p.id)).map(p => p.id),
    ...reviewData.filter(p => !allPrevIds.has(p.id)).map(p => p.id),
  ]);

  const changedStatusIds = new Set<string>();
  for (const pr of myPRData) {
    const prevStatus = previousMyPRStates.get(pr.id);
    if (prevStatus && prevStatus !== pr.reviewStatus) {
      changedStatusIds.add(pr.id);
    }
  }

  newPRIds.set(foundNewIds);
  changedPRIds.set(changedStatusIds);
}
isFirstFetch = false;
```

`myPRs.set(myPRData)` 직후에 이전 상태 갱신:

```typescript
previousMyPRIds = new Set(myPRData.map(p => p.id));
previousReviewPRIds = new Set(reviewData.map(p => p.id));
previousMyPRStates = new Map(myPRData.map(p => [p.id, p.reviewStatus]));
```

- [ ] **Step 2: PRCard에 isNew/hasChanged 스타일 적용**

스크립트에 import 추가:

```typescript
import { newPRIds, changedPRIds } from "$lib/stores/prs";
```

props 근처에 추가:

```typescript
let isNew = $derived($newPRIds.has(pr.id));
let hasChanged = $derived($changedPRIds.has(pr.id));
```

`$effect`로 3초 후 isNew 상태 해제:

```typescript
$effect(() => {
  if (isNew) {
    const timer = setTimeout(() => {
      newPRIds.update(ids => { ids.delete(pr.id); return new Set(ids); });
    }, 3000);
    return () => clearTimeout(timer);
  }
});

$effect(() => {
  if (hasChanged) {
    const timer = setTimeout(() => {
      changedPRIds.update(ids => { ids.delete(pr.id); return new Set(ids); });
    }, 3000);
    return () => clearTimeout(timer);
  }
});
```

`<button>` 태그에 class 추가:

```svelte
<button class="pr-card" class:focused class:is-new={isNew} class:has-changed={hasChanged} ...>
```

CSS 추가:

```css
.pr-card.is-new {
  border-left: 2px solid var(--color-accent);
  animation: fade-in 300ms ease;
}

.pr-card.has-changed .reviewer {
  animation: pulse-once 200ms ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse-once {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 3: PRList에 Svelte transition 적용 (PR 사라짐)**

`PRList.svelte` 스크립트에 import 추가:

```typescript
import { slide } from "svelte/transition";
```

`{#each}` 블록의 PRCard에 transition 추가:

```svelte
{#each prs as pr, i (pr.id)}
  <div transition:slide={{ duration: 200 }}>
    <PRCard {pr} {mode} focused={$focusedIndex === i} />
  </div>
{/each}
```

- [ ] **Step 4: 테스트 확인**

Run: `npm test -- --run`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/prs.ts src/lib/components/PRCard.svelte src/lib/components/PRList.svelte
git commit -m "feat: 마이크로 인터랙션 — 새 PR fade-in, 상태 변경 pulse, PR 사라짐 slide"
```

---

### Task 12: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test -- --run`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 타입 체크**

Run: `npm run check`
Expected: 에러 없음

- [ ] **Step 3: 프로덕션 빌드**

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 4: 개발 서버에서 수동 확인**

Run: `npm run dev`

확인 사항:
1. 토큰이 올바르게 적용되었는지 (색상, 간격, 라디우스)
2. 640px 미만에서 필터바 세로 스택, 카드 diff stat 숨김
3. 1280px 이상에서 넓은 max-width
4. Tab 키로 focus ring 확인 (마우스 클릭 시 안 보임)
5. 설정 버튼 → 슬라이드 패널 열림, Esc로 닫힘, 배경 클릭 닫힘
6. Review Requests 탭에서 대기시간/사이즈 뱃지 확인
7. 키보드 단축키 정상 동작 (↑↓ Enter r 1 2 / Esc ?)
8. 스크린 리더로 탭/리스트/버튼 읽기 확인 (VoiceOver)
