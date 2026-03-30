# UI/UX 통합 리팩터 디자인 스펙

**Date:** 2026-03-30
**Scope:** CSS 토큰 도입, 반응형, WCAG AA 접근성, 마이크로 인터랙션, 설정 패널 UX, Review Requests 탭 보강
**Approach:** 통합 리팩터 — CSS 토큰 기반을 깔고 나머지 개선을 한 번에 적용

---

## 1. CSS Design Tokens

`app.css`의 `:root`에 CSS custom properties 정의. 모든 컴포넌트의 하드코딩된 색상/간격/라디우스를 토큰으로 교체.

### 색상 토큰

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
  --color-text-subtle: #768390;  /* #656d76 → contrast 보강 (WCAG AA 4.5:1) */

  /* Status */
  --color-success: #3fb950;
  --color-danger: #da3633;
  --color-warning: #d29922;
  --color-accent: #58a6ff;
}
```

### 간격 스케일

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

### 라디우스

```css
:root {
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;
}
```

### Focus Ring

```css
:root {
  --focus-ring: 0 0 0 2px var(--color-bg-primary),
                0 0 0 4px var(--color-accent);
}
```

### 적용 범위

현재 9개 컴포넌트 + `app.css`에서 하드코딩된 모든 색상/간격/라디우스를 토큰으로 교체.

---

## 2. 반응형 레이아웃

### 브레이크포인트

| Name | Range | 변경사항 |
|------|-------|---------|
| Compact | < 640px | 필터바 세로 스택, 카드 패딩 축소, diff stat 숨김, 설정 패널 전체 너비 |
| Default | 640px ~ 1280px | 현재와 동일, max-width: 960px |
| Wide | > 1280px | max-width: 1120px, 카드 여유 패딩 |

### 컴포넌트별 반응형 동작

**FilterBar:**
- Compact: `flex-direction: column`, 검색 입력 `max-width: none` (전체 너비)
- Default/Wide: 현재와 동일 (가로 배치)

**PRCard:**
- Compact: `padding: 0.75rem 1rem` (축소), diff stat 행 숨김 (`display: none`), 라벨 최대 3개 표시
- Wide: `padding: 1rem 1.5rem` (여유)

**PRList:**
- Compact: `padding: 0.5rem 0.75rem`, gap 축소
- Wide: `max-width: 1120px`

**Settings Panel:**
- Compact: `width: 100%` (전체 너비 오버레이)
- Default/Wide: `width: 360px` (오른쪽 슬라이드)

**NotificationBell Dropdown:**
- Compact: `width: calc(100vw - 2rem)`, `right: -1rem`

---

## 3. 접근성 (WCAG AA)

### Focus Management

- 모든 인터랙티브 요소 (버튼, 링크, 입력)에 `:focus-visible { box-shadow: var(--focus-ring); outline: none; }` 적용
- `:focus:not(:focus-visible)` 시 ring 숨김 (마우스 사용자는 보지 않음)
- 모달/드롭다운 열릴 때 focus trap: Tab 키가 해당 영역 안에서만 순환
- 모달 닫힐 때 트리거 요소로 포커스 복귀

### Semantic Markup

- **TabBar:** `role="tablist"`, 각 탭 `role="tab"` + `aria-selected="true/false"` + `aria-controls="tabpanel-id"`
- **PRList:** `role="listbox"`, 각 PRCard `role="option"` + `aria-selected` (키보드 포커스 시)
- **PR 리스트 영역:** `role="tabpanel"` + `aria-labelledby`
- **Dashboard 헤더:** `<header role="banner">`
- **Shortcuts 모달:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- **Settings 패널:** `role="dialog"` + `aria-modal="true"` + `aria-label="Settings"`

### Live Regions

- 폴링 완료 피드백 (`feedbackMessage`): `aria-live="polite"` + `aria-atomic="true"`
- 토스트 알림: `role="alert"` (암시적 `aria-live="assertive"`)
- PR 카운트 변경: 탭 텍스트에 반영되므로 추가 live region 불요

### Color Contrast (4.5:1 최소)

| 요소 | 현재 | 검증/변경 |
|-----|------|----------|
| muted text (#8b949e on #0d1117) | 4.6:1 | Pass |
| subtle text (#656d76 on #0d1117) | 3.1:1 | **Fail** → #768390 (4.5:1) — 토큰에 반영 완료 |
| subtle text (#656d76 on #161b22) | 2.7:1 | **Fail** → #768390 — 토큰에 반영 완료 |
| status icons (이모지) | N/A | 이모지만 의존하지 않도록 텍스트 레이블 병행 |

### 아이콘 버튼 접근성

- Refresh 버튼: `aria-label="Refresh PR list"`
- Settings 버튼: `aria-label="Open settings"`
- NotificationBell: `aria-label="Notifications"` + `aria-expanded` (드롭다운 열림 상태)
- 닫기 버튼들: `aria-label="Close"`

### 기존 svelte-ignore 해결

- `a11y_click_events_have_key_events`: shortcuts overlay에 `onkeydown` 핸들러 추가
- 모든 클릭 가능 div를 `<button>` 또는 적절한 시맨틱 요소로 교체

---

## 4. 마이크로 인터랙션

절제된 GitHub 스타일. 정보 전달 목적의 최소한 트랜지션.

### 새 PR 등장

- 폴링 후 새로 추가된 카드: `border-left: 2px solid var(--color-accent)` + `opacity: 0 → 1` (300ms ease)
- 3초 후 accent border fade out (300ms)
- 구현: PR 데이터에 `isNew` 플래그 추가, 폴링 시 이전 ID Set과 비교

### 상태 변경

- status-bar 색상 변경 시 `transition: background 300ms ease`
- 변경된 리뷰어 칩: `scale(1) → scale(1.05) → scale(1)` 1회 (200ms)
- 구현: 이전 상태와 비교하여 `hasChanged` 플래그

### PR 사라짐

- 머지/클로즈된 PR: `opacity: 1 → 0` (200ms) + `max-height` collapse (200ms)
- 구현: Svelte `transition:slide` 또는 커스텀 CSS animation

### 폴링 피드백

- 변경사항 있을 때: 현재 텍스트 피드백 유지 + refresh 아이콘에 체크마크(✓) 0.8초 표시 후 원복
- 변경사항 없을 때: 아무 표시 없음

### 공통

- 기본 트랜지션: `transition: border-color 150ms ease, background 150ms ease`
- hover 시 `translateY(-1px)` 제거 → `border-color: var(--color-accent)`만
- `focus-visible` 시 `box-shadow: var(--focus-ring)`

---

## 5. 설정 → 슬라이드 오버 패널

### 현재 문제

설정이 열리면 `{#if $showSettings}` 분기로 Dashboard 전체가 Settings 컴포넌트로 대체됨. 탭, 필터, PR 리스트가 모두 사라져서 맥락을 잃음.

### 변경 설계

- Dashboard에서 `{#if $showSettings}...{:else}...` 제거
- 탭/필터/리스트는 항상 렌더링
- Settings는 오른쪽에서 슬라이드인하는 오버레이 패널
- 배경 dim 처리 (`rgba(0, 0, 0, 0.4)`)

### 패널 스펙

- **너비:** Default/Wide 360px, Compact 100%
- **진입 애니메이션:** `transform: translateX(100%) → translateX(0)` (200ms ease)
- **퇴장 애니메이션:** 역방향 (200ms ease)
- **배경 클릭:** 패널 닫기
- **Esc 키:** 패널 닫기
- **Focus trap:** Tab 키가 패널 내부에서만 순환
- **닫힐 때:** Settings 버튼으로 포커스 복귀
- **z-index:** 50 (토스트 1000보다 아래, 일반 콘텐츠보다 위)

### 내부 레이아웃

변경 없음. 기존 Settings.svelte의 헤더/바디 구조 유지. 외부 래핑만 변경.

---

## 6. Review Requests 탭 보강

### 대기 시간 뱃지

리뷰 요청 후 경과 시간을 카드 우측 상단에 뱃지로 표시.

| 경과 시간 | 색상 | 표시 |
|----------|------|------|
| < 4h | var(--color-success) | `1h waiting` |
| 4h ~ 24h | var(--color-warning) | `6h waiting` |
| > 24h | var(--color-danger) | `2d waiting` |

- 기준 시간: `createdAt` 사용. `ReviewRequestedPR` 타입에 reviewRequestedAt이 없으므로 PR 생성 시점 기준. 리뷰 재요청의 경우 `previousReviewStatus`가 있으면 `updatedAt` 사용 (재요청 시점에 가까움)
- 구현: `utils.ts`에 `getWaitingTime(pr)` + `getWaitingColor(hours)` 함수 추가

### 사이즈 뱃지

diff 크기를 한 글자 뱃지로 표시. 빠르게 리뷰 가능한 PR 판별용.

| 변경 줄 수 (additions + deletions) | 라벨 | 색상 |
|----------------------------------|------|------|
| ≤ 10 | XS | var(--color-success) |
| ≤ 50 | S | var(--color-success) |
| ≤ 200 | M | var(--color-warning) |
| ≤ 500 | L | var(--color-danger) |
| > 500 | XL | var(--color-danger) |

- 구현: `utils.ts`에 `prSize(additions, deletions)` 함수 추가

### Status Bar 긴급도 색상 (Review Requests 탭)

현재는 항상 `STATUS_COLORS["pending"]` (노란색). 대기 시간 기반으로 변경:

- < 4h: `var(--color-success)` (초록)
- 4h ~ 24h: `var(--color-warning)` (노랑)
- > 24h: `var(--color-danger)` (빨강)

### 카드 레이아웃 변경 (Review Requests 모드)

- 카드 헤더 우측에 대기 시간 뱃지 + 사이즈 뱃지 (flex, gap: 4px)
- 기존 정보(my-review-status, status-line, labels)는 유지

---

## 파일 변경 범위

| 파일 | 변경 내용 |
|-----|----------|
| `app.css` | CSS 토큰 정의, focus-visible 전역 스타일, 반응형 미디어 쿼리 (scrollbar 등) |
| `Dashboard.svelte` | 설정 패널 오버레이 구조, aria-live region, 폴링 피드백 개선 |
| `TabBar.svelte` | role="tablist", aria-selected, aria-controls |
| `FilterBar.svelte` | 반응형 세로 스택, 토큰 적용 |
| `PRList.svelte` | role="listbox", 반응형 패딩/gap, 새PR/사라짐 트랜지션 |
| `PRCard.svelte` | role="option", aria-label, 대기시간/사이즈 뱃지 (review-requests 모드), hover 변경, 토큰 적용, 반응형 패딩 |
| `Settings.svelte` | 슬라이드 오버 패널 래핑, focus trap, 토큰 적용 |
| `NotificationBell.svelte` | aria-expanded, 반응형 드롭다운 너비, 토큰 적용 |
| `Toast.svelte` | role="alert", 토큰 적용 |
| `Login.svelte` | 토큰 적용, focus-visible |
| `utils.ts` | `getWaitingTime()`, `getWaitingColor()`, `prSize()` 함수 추가 |
| `types.ts` | 변경 없음 (기존 타입으로 충분) |

---

## 미포함 사항 (후속 작업 후보)

- **A** PR 카드 정보 계층 개선 — 선택되었으나 이번 스코프에서 제외
- **B** 헤더/탭/필터 컴팩트화 — 선택되었으나 이번 스코프에서 제외
- **D** 빈 상태/로딩 경험
- **G** 알림 센터 강화
