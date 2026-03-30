# PR Card Enhancement Design

## Summary

PR 카드에 추가 정보를 compact하게 한 줄 추가하여 GitHub으로 이동하지 않고도 PR 상태를 한눈에 파악할 수 있게 한다.

## Scope

추가할 정보 4가지 + base branch 표시:

1. **머지 가능 여부** — mergeable state, conflict, draft 구분
2. **코멘트/대화 수** — unresolved review thread 수
3. **라벨** — GitHub 라벨 (색상 포함 뱃지)
4. **변경 규모** — additions/deletions, changed files 수
5. **Base branch** — 메타 줄에 `← main` 형태

## GraphQL Query Changes

두 쿼리(MY_PRS_QUERY, REVIEW_REQUESTED_QUERY) 모두에 아래 필드 추가:

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

REVIEW_REQUESTED_QUERY에는 CI 상태를 위한 `commits` 필드도 추가:

```graphql
commits(last: 1) {
  nodes { commit { statusCheckRollup { state } } }
}
```

### Notes

- `mergeable`은 GitHub 서버에서 계산에 시간이 걸릴 수 있어 `UNKNOWN` 응답 가능 — UI에서 "Checking..." 처리
- `isDraft`는 별도 요청(A6)은 아니었으나 머지 가능 여부 표시에 필요하므로 포함

## Type Changes

### New types

```typescript
interface Label {
  name: string;
  color: string; // hex without # (e.g. "d73a4a")
}

type MergeableState = "mergeable" | "conflicting" | "unknown";
```

### MyPR additions

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

### ReviewRequestedPR additions

```typescript
baseRef: string;
labels: Label[];
unresolvedThreads: number;
additions: number;
deletions: number;
changedFiles: number;
isDraft: boolean;
mergeable: MergeableState;
ciStatus: CIStatus; // 기존에 MyPR에만 있던 필드
```

## Parser Changes

### parseMyPRs

기존 파서에 새 필드 매핑 추가:
- `mergeable`: `node.mergeable` → lowercase (`"MERGEABLE"` → `"mergeable"`)
- `baseRef`: `node.baseRefName`
- `labels`: `node.labels.nodes` → `{ name, color }`
- `unresolvedThreads`: `node.reviewThreads.nodes.filter(t => !t.isResolved).length`
- `additions`, `deletions`, `changedFiles`: 직접 매핑
- `isDraft`: `node.isDraft`

### parseReviewRequestedPRs

동일한 필드 매핑 + `ciStatus` 추가 (기존 MY_PRS_QUERY의 CI 파싱 로직 재사용)

## UI Design

### Card Layout

```
┌─────────────────────────────────────────────────┐
│ ▌ fix: login bug                                │  타이틀
│ ▌ company/backend ← main  ·  by kim  ·  2h ago  │  메타 (baseRef 추가)
│ ▌ ✅ kim  ❌ lee                                 │  리뷰어 (기존)
│ ▌ 🟢 Mergeable · 💬 3 · +42/-8 · 2 files        │  상태 줄 (신규)
│ ▌ 🏷 bug  feature                                │  라벨 줄 (있을 때만)
└─────────────────────────────────────────────────┘
```

### Status Line Rules

| 조건 | 표시 |
|------|------|
| `isDraft === true` | `📝 Draft` |
| `mergeable === "mergeable"` | `🟢 Mergeable` |
| `mergeable === "conflicting"` | `🔴 Conflict` |
| `mergeable === "unknown"` | `⏳ Checking...` |

- Draft이면 mergeable 상태 대신 Draft 표시
- `unresolvedThreads > 0`일 때만 `💬 N` 표시, 0이면 숨김
- 변경 규모: `+N/-M · K files` — additions은 초록(`#3fb950`), deletions은 빨간(`#f85149`)
- CI 상태: 리뷰 요청 탭에도 기존 MY_PRS의 CI 아이콘 로직 적용

### Label Badges

- GitHub 라벨의 `color` 값을 배경색으로, 텍스트 색상은 밝기 기반 자동 결정 (밝은 배경 → 검정 텍스트, 어두운 배경 → 흰색 텍스트)
- 라벨이 없으면 라벨 줄 자체를 숨김
- `border-radius: 12px`, `font-size: 11px`, `padding: 0.125rem 0.5rem`

### Meta Line Update

기존: `company/backend · by kim · 2h ago`
변경: `company/backend ← main · by kim · 2h ago`

`← main` 부분은 `#656d76` 색상으로 repo보다 연하게 표시

## Testing

- `parseMyPRs` 테스트: 새 필드가 올바르게 파싱되는지 검증
- `parseReviewRequestedPRs` 테스트: 새 필드 + ciStatus 파싱 검증
- `unresolvedThreads` 계산 로직 테스트
- `mergeable` 상태 정규화 테스트
- 라벨 텍스트 색상 결정 유틸 테스트 (밝기 기반)

## Files to Modify

1. `src/lib/types.ts` — Label, MergeableState 타입 추가, MyPR/ReviewRequestedPR 확장
2. `src/lib/github/queries.ts` — GraphQL 쿼리 확장, 파서 수정
3. `src/lib/github/client.ts` — parseReviewRequestedPRs에 username 외 추가 변경 없음
4. `src/lib/utils.ts` — 라벨 텍스트 색상 유틸 추가
5. `src/lib/components/PRCard.svelte` — 상태 줄, 라벨 줄, baseRef 표시 추가
6. `tests/lib/github/queries.test.ts` — 새 필드 테스트
7. `tests/lib/utils.test.ts` — 라벨 색상 유틸 테스트
8. `tests/lib/notifications.test.ts` — ReviewRequestedPR mock에 새 필드 추가
