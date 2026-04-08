# Re-requested Review Badge Design

## Problem

My PRs 탭에서 변경 요청(CHANGES_REQUESTED) 받은 후 코드를 수정하고 리뷰를 재요청해도, PR 카드의 리뷰어 뱃지가 여전히 `❌ Changes requested`로 표시된다.

### Root Cause

- `MY_PRS_QUERY`는 `reviews(last: 20)`만 가져옴
- GitHub API에서 리뷰 재요청은 `reviews`에 새 엔트리를 생성하지 않음
- 재요청 정보는 `reviewRequests` 필드에만 반영됨
- 현재 코드는 `reviewRequests`를 조회하지 않아 재요청 상태를 알 수 없음

### Verification

PR #1176 (`doublecheck-kor/doublecheck-1.0-api`)로 실제 확인:
- `reviews`: `rentre-jmkim` → `CHANGES_REQUESTED`
- `reviewRequests`: `rentre-jmkim` → pending reviewer로 재등록됨
- 리뷰 재요청 시 해당 리뷰어가 `reviewRequests`에 다시 나타나는 것 확인

## Solution

`reviewRequests` 필드를 추가로 가져와서, 재요청된 리뷰어의 뱃지를 `⏳ reviewer (prev: ❌ Changes requested)` 형태로 표시한다.

## Changes

### 1. GraphQL Query — `MY_PRS_QUERY`

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

`REVIEW_REQUESTED_QUERY`는 변경하지 않음 — 이미 `forcePending` + `previousReviewStatus` 메커니즘으로 처리 중.

### 2. Type — `Review` interface

```typescript
export interface Review {
  author: string;
  state: ReviewState;
  submittedAt: string;
  reRequested: boolean;  // NEW
}
```

### 3. Parser — `parseMyPRs`

- `reviewRequests.nodes`에서 `requestedReviewer.login` (User) 또는 `requestedReviewer.name` (Team) 추출 → `Set<string>`
- `latestByAuthor` 매핑 시 reviewer가 Set에 있으면 `reRequested: true`
- Team reviewer는 현재 reviews에 나타나지 않으므로 실질적 영향 없음 (User만 매칭)

### 4. Parser — `parseReviewRequestedPRs`

- `reviews` 배열에 `reRequested: false` 기본값 추가 (타입 호환)

### 5. `computeReviewStatus` — `utils.ts`

현재 로직:
```
CHANGES_REQUESTED 있으면 → "changes_requested"
```

변경:
```
reRequested인 리뷰어는 상태와 무관하게 "pending"으로 취급하여 우선순위 판단에서 제외.
(CHANGES_REQUESTED + reRequested → pending, APPROVED + reRequested → pending)
나머지 리뷰어만으로 기존 로직 적용.
모든 리뷰어가 reRequested이면 → "pending"
```

`RawReview` 인터페이스에도 `reRequested?: boolean` 추가. 기존 호출부(`parseReviewRequestedPRs`에서 `computeReviewStatus` 사용하지 않으므로)는 영향 없음.

### 6. PRCard UI — My PRs 모드

현재:
```svelte
{#each (pr as MyPR).reviews as review}
  <span class="reviewer">
    {STATUS_ICONS[review.state]} {review.author}
  </span>
{/each}
```

변경:
```svelte
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
```

`.previous-review` 스타일은 이미 PRCard.svelte에 존재하므로 재사용.

## Files to Change

| File | Change |
|------|--------|
| `src/lib/types.ts` | `Review.reRequested: boolean` 추가 |
| `src/lib/github/queries.ts` | `MY_PRS_QUERY`에 `reviewRequests` 추가, `parseMyPRs`에서 매칭, `parseReviewRequestedPRs`에서 기본값 |
| `src/lib/utils.ts` | `computeReviewStatus`에서 `reRequested` 고려 |
| `src/lib/components/PRCard.svelte` | re-requested 리뷰어 뱃지 표시 |
| `tests/lib/utils.test.ts` | `computeReviewStatus` 테스트 케이스 추가 |
| `tests/lib/github/queries.test.ts` | `parseMyPRs` 테스트에 `reviewRequests` mock 추가 |

## Out of Scope

- Review Requests 탭 변경 (이미 `previousReviewStatus`로 처리)
- Approved 탭 변경 (동일)
- Team reviewer 뱃지 표시 (현재 reviews에 Team이 나타나지 않음)
- `reviewDecision` 필드 활용 (GitHub의 branch protection 기반 — 별도 이슈)
