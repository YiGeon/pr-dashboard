# Approved 탭 디자인 스펙

## 개요

승인 완료했지만 아직 열려있는 PR을 추적하기 위한 3번째 탭 추가.
목적: 내가 승인한 PR이 머지됐는지/막혀있는지 진행 상황 확인.

## 데이터 모델

기존 `ReviewRequestedPR` 타입을 그대로 재사용한다. 새 타입 불필요.
차이점은 `myReviewStatus`가 `"approved"`로 설정된다는 것뿐.

## API & 파싱

### GitHub Search 쿼리

```
reviewed-by:${username} is:pr is:open -author:${username}
```

- 내가 리뷰한 모든 열린 PR을 가져옴 (내가 author인 것 제외)
- GraphQL 쿼리 구조는 기존 `REVIEW_REQUESTED_QUERY`와 동일한 필드셋 사용

### 파서 수정

`parseReviewRequestedPRs`에 `forcePending: boolean` 파라미터 추가:

- `forcePending: true` (기존 Review Requests 호출) → `myReviewStatus`를 `"pending"` 고정
- `forcePending: false` (Approved 호출) → 내 최신 리뷰 상태를 실제 값으로 설정

### 클라이언트 필터링

1. 파서 결과에서 `myReviewStatus === "approved"`인 것만 유지
2. Review Requests 탭에 이미 있는 PR ID 제외 (중복 방지)

## Store (`src/lib/stores/prs.ts`)

- `approvedPRs` writable store 추가 (`ReviewRequestedPR[]`)
- `filteredApprovedPRs` derived store (기존 `applyFilters` + `applySorting` 재사용)
- `fetchAll()`에서 3개 API 병렬 호출: `fetchMyPRs`, `fetchReviewRequestedPRs`, `fetchApprovedPRs`

## Client (`src/lib/github/client.ts`)

`fetchApprovedPRs()` 함수 추가:

- 쿼리: `reviewed-by:${username} is:pr is:open -author:${username}`
- `parseReviewRequestedPRs(data, username, false)` 호출
- 결과에서 `myReviewStatus === "approved"`인 것만 반환

## UI

### TabBar

- 3번째 탭 추가: **"Approved (N)"**
- 탭 순서: Review Requests (`1`) → My PRs (`2`) → Approved (`3`)

### Dashboard

- `TabKey`에 `"approved"` 추가
- `$activeTab === "approved"` 분기에서 `PRList`에 `filteredApprovedPRs` 전달
- `PRList` mode: `"approved"` (기존 `PRCard` 그대로 사용)

### 키보드 단축키

- `3`: Approved 탭으로 전환
- 기존 `1` (Review Requests), `2` (My PRs) 변경 없음

## 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/lib/github/queries.ts` | `parseReviewRequestedPRs`에 `forcePending` 파라미터 추가 |
| `src/lib/github/client.ts` | `fetchApprovedPRs()` 함수 추가 |
| `src/lib/stores/prs.ts` | `approvedPRs`, `filteredApprovedPRs` store 추가, `fetchAll` 수정 |
| `src/lib/stores/filters.ts` | `TabKey`에 `"approved"` 추가 |
| `src/lib/components/TabBar.svelte` | 3번째 탭 추가 |
| `src/lib/components/Dashboard.svelte` | approved 탭 분기 + 단축키 `3` 추가 |
| `src/lib/notifications.ts` | approved PR 변동 알림 (선택적, 1차에서는 제외) |
| `tests/` | 파서 테스트에 `forcePending` 케이스 추가 |

## 범위 밖 (향후 고려)

- 승인 후 새 커밋 감지 표시
- 승인 후 경과 시간 표시
- Approved PR 변동 알림
