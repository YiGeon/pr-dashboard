# Entity Color Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 레포지토리명과 작성자명에 해시 기반 컬러 배경 뱃지를 적용하여 한눈에 구분 가능하게 한다.

**Architecture:** `utils.ts`에 24색 팔레트 + djb2 해시 + 스타일 생성 함수를 추가하고, `PRCard.svelte`에서 repo/author 스팬에 적용. 기존 `labelStyle` 패턴을 따름.

**Tech Stack:** TypeScript, Svelte 5, Vitest

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/utils.ts` | `ENTITY_COLORS` 팔레트, `hashString`, `entityBadgeStyle` 추가 |
| Modify | `src/lib/components/PRCard.svelte` | repo/author에 뱃지 스타일 적용, `.entity-badge` CSS 추가 |
| Modify | `tests/lib/utils.test.ts` | `hashString`, `entityBadgeStyle` 테스트 추가 |

---

### Task 1: hashString + entityBadgeStyle 테스트 작성

**Files:**
- Modify: `tests/lib/utils.test.ts`

- [ ] **Step 1: hashString 테스트 작성**

`tests/lib/utils.test.ts` 파일 끝에 추가:

```typescript
describe("hashString", () => {
  it("returns the same value for the same input", () => {
    expect(hashString("my-org/my-repo")).toBe(hashString("my-org/my-repo"));
  });

  it("returns different values for different inputs", () => {
    expect(hashString("react")).not.toBe(hashString("vue"));
  });

  it("returns a non-negative number", () => {
    expect(hashString("test")).toBeGreaterThanOrEqual(0);
  });

  it("handles empty string", () => {
    expect(hashString("")).toBe(0);
  });
});
```

파일 상단 import에 `hashString`을 추가:

```typescript
import { relativeTime, computeReviewStatus, reviewStatusPriority, labelTextColor, hashString, entityBadgeStyle } from "../../src/lib/utils";
```

- [ ] **Step 2: entityBadgeStyle 테스트 작성**

같은 파일에 이어서 추가:

```typescript
describe("entityBadgeStyle", () => {
  it("returns a CSS string with background, border, and color", () => {
    const style = entityBadgeStyle("my-org/my-repo");
    expect(style).toContain("background:");
    expect(style).toContain("border:");
    expect(style).toContain("color:");
  });

  it("returns the same style for the same input", () => {
    expect(entityBadgeStyle("octocat")).toBe(entityBadgeStyle("octocat"));
  });

  it("returns different styles for different inputs", () => {
    expect(entityBadgeStyle("alice")).not.toBe(entityBadgeStyle("bob"));
  });
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

Run: `npm test -- tests/lib/utils.test.ts`
Expected: FAIL — `hashString`과 `entityBadgeStyle`이 아직 export되지 않음

- [ ] **Step 4: Commit**

```bash
git add tests/lib/utils.test.ts
git commit -m "test: hashString, entityBadgeStyle 실패 테스트 추가"
```

---

### Task 2: hashString + entityBadgeStyle 구현

**Files:**
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: ENTITY_COLORS 팔레트 + hashString + entityBadgeStyle 추가**

`src/lib/utils.ts` 파일 끝에 추가:

```typescript
const ENTITY_COLORS = [
  '#539bf5', '#57ab5a', '#c69026', '#cc6b2c',
  '#e5534b', '#b083f0', '#39c5cf', '#d16d9e',
  '#768390', '#6cb6ff', '#8ddb8c', '#daaa3f',
  '#986ee2', '#e0823d', '#4ac26b', '#f47067',
  '#57adf0', '#c6902e', '#e275ad', '#73c991',
  '#dba97b', '#7ee3be', '#a2a0d6', '#cf987a',
];

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function entityBadgeStyle(name: string): string {
  const color = ENTITY_COLORS[hashString(name) % ENTITY_COLORS.length];
  const [r, g, b] = hexToRgb(color.slice(1));
  return `background: rgba(${r},${g},${b},0.15); border: 1px solid rgba(${r},${g},${b},0.25); color: ${color}`;
}
```

- [ ] **Step 2: 테스트 실행 — 통과 확인**

Run: `npm test -- tests/lib/utils.test.ts`
Expected: PASS — 모든 테스트 통과

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: hashString, entityBadgeStyle 구현 (24색 팔레트)"
```

---

### Task 3: PRCard.svelte에 컬러 뱃지 적용

**Files:**
- Modify: `src/lib/components/PRCard.svelte`

- [ ] **Step 1: entityBadgeStyle import 추가**

`PRCard.svelte`의 import 라인을 수정:

```typescript
// Before
import { relativeTime, formatDate, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, hexToRgb, labelTextColor } from "$lib/utils";

// After
import { relativeTime, formatDate, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, hexToRgb, labelTextColor, entityBadgeStyle } from "$lib/utils";
```

- [ ] **Step 2: 레포지토리명 뱃지 적용**

템플릿에서 repo 스팬을 수정:

```svelte
<!-- Before -->
<span class="repo">{pr.repo}</span>

<!-- After -->
<span class="repo entity-badge" style={entityBadgeStyle(pr.repo)}>{pr.repo}</span>
```

- [ ] **Step 3: 작성자명 뱃지 적용**

템플릿에서 author 스팬을 수정:

```svelte
<!-- Before -->
<span class="author">by {pr.author}</span>

<!-- After -->
<span class="author entity-badge" style={entityBadgeStyle(pr.author)}>by {pr.author}</span>
```

- [ ] **Step 4: entity-badge CSS 추가**

`<style>` 블록에 추가 (`.card-meta .repo` 셀렉터 근처):

```css
.entity-badge {
  padding: 0.0625rem 0.375rem;
  border-radius: 10px;
  font-weight: 500;
}
```

- [ ] **Step 5: 개발 서버에서 시각적 확인**

Run: `npm run dev`
Expected: PR 카드에서 레포지토리명과 작성자명이 컬러 배경 뱃지로 표시됨. 같은 레포/작성자는 같은 색상.

- [ ] **Step 6: 전체 테스트 + 타입체크 실행**

Run: `npm test && npm run check`
Expected: 모든 테스트 통과, 타입 에러 없음

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/PRCard.svelte
git commit -m "feat: PRCard에 레포/작성자 컬러 뱃지 적용"
```
