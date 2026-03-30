# UX Improvements Design

## Summary

PR Dashboard의 UX를 전반적으로 개선한다. Phase 1(Quick Wins)과 Phase 2(Medium)로 나누어 진행.

## Phase 1: Quick Wins

### 1. 스켈레톤 로딩 UI

첫 로딩 시(`isLoading === true && prs.length === 0`) PR 리스트에 카드 모양 스켈레톤 3개 표시.

- PRList.svelte에서 `isLoading` store를 import하여 조건부 렌더링
- 스켈레톤 카드: 기존 PRCard와 동일한 높이/구조, 내부는 회색 블록 + pulse 애니메이션
- 기존 데이터가 있는 상태에서의 폴링 리프레시 때는 스켈레톤 안 보여줌 (기존 카드 유지)
- `@keyframes pulse` — `opacity: 0.4 → 1 → 0.4` 사이클 (1.5s infinite)

### 2. 빈 상태 개선

탭별로 다른 메시지:
- My PRs (데이터 없음): `🎉 열린 PR이 없습니다`
- Review Requests (데이터 없음): `✅ 리뷰 요청이 없습니다`
- 필터/검색 결과 없음: `🔍 검색 결과가 없습니다` + "필터 초기화" 버튼

필터 초기화 버튼 동작: `selectedOrgs.set([])`, `searchQuery.set("")`

검색 결과 없음 vs 데이터 없음 구분: `prs.length === 0`이면서 원본 store에 데이터가 있으면 검색 결과 없음.

### 3. 마지막 갱신 시각 + 새로고침 피드백

**갱신 시각:**
- 헤더의 새로고침 버튼 옆에 `lastFetchedAt` 기반으로 `"3m ago"` 표시
- `relativeTime` 유틸 재사용
- 매 분마다 자동 갱신 (setInterval)

**새로고침 피드백:**
- `fetchAll()` 완료 시 이전/현재 PR 수 비교
- 변화가 있으면 토스트: `"N개 PR 업데이트됨"`
- 변화 없으면 토스트 없음
- 기존 toastQueue/AppNotification은 PR 알림 전용이므로 사용하지 않음. Dashboard에서 간단한 `$state` 기반 임시 메시지 표시 (2초 후 자동 사라짐)

### 4. org 필터 드롭다운 외부 클릭 닫기

FilterBar.svelte에 `svelte:window onclick` 이벤트 추가.

```svelte
<svelte:window onclick={handleClickOutside} />
```

```typescript
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".org-filter")) {
    orgDropdownOpen = false;
  }
}
```

NotificationBell.svelte에 이미 동일 패턴 존재.

### 5. PR 카드 시각적 계층 강화

CSS 미세 조정:
- `.pr-title`: 16px → 15px
- `.status-line`: `opacity: 0.8` 추가
- `.pr-list` gap: 0.5rem → 0.625rem

## Phase 2: Medium

### 6. 탭 긴급 PR 카운트

My PRs 탭에 conflict 또는 CI fail인 PR 수를 빨간 뱃지로 표시.

**derived store 추가 (prs.ts):**
```typescript
export const urgentMyPRCount = derived(
  myPRs,
  ($prs) => $prs.filter((pr) => pr.mergeable === "conflicting" || pr.ciStatus === "failure").length
);
```

**TabBar UI:**
- `My PRs (5)` 옆에 숫자가 0보다 크면 빨간 원형 뱃지 표시
- Review Requests 탭은 전체 수만 표시 (현재와 동일)
- 뱃지 스타일: `background: #da3633`, `color: #fff`, `font-size: 11px`, `border-radius: 50%`, `min-width: 16px`

### 7. 키보드 단축키

**글로벌 단축키:**

| 키 | 동작 |
|---|---|
| `j` / `k` | PR 카드 아래/위 이동 (포커스) |
| `Enter` | 포커스된 카드의 PR 열기 |
| `r` | 새로고침 |
| `1` / `2` | My PRs / Review Requests 탭 전환 |
| `/` | 검색 입력 포커스 |
| `Escape` | 검색/드롭다운 닫기, 포커스 해제 |

**구현:**
- `focusedIndex` store (writable<number>, 초기값 -1)
- Dashboard.svelte에서 `svelte:window onkeydown` 핸들러
- input/textarea에 포커스 중일 때는 j/k/r/1/2 비활성 (`document.activeElement?.tagName`으로 판단)
- `/` 누르면 검색 input에 focus + 기본 동작(검색바 입력) preventDefault
- 포커스된 카드: `border-color: #58a6ff` + `box-shadow: 0 0 0 1px #58a6ff`
- 탭 전환 시 focusedIndex 리셋 (-1)
- PR 리스트 변경 시 focusedIndex가 범위 밖이면 리셋

**PRCard에 focused 상태 전달:**
- PRList에서 `focusedIndex`와 카드 인덱스 비교하여 `focused` prop 전달
- PRCard에서 `focused` prop에 따라 스타일 적용 + `scrollIntoView({ block: "nearest" })`

## Files to Modify

### Phase 1
1. `src/lib/components/PRList.svelte` — 스켈레톤 로딩, 빈 상태 개선
2. `src/lib/components/FilterBar.svelte` — 외부 클릭 닫기
3. `src/lib/components/Dashboard.svelte` — 마지막 갱신 시각 표시
4. `src/lib/components/PRCard.svelte` — CSS 계층 조정
5. `src/lib/stores/prs.ts` — 새로고침 피드백 로직

### Phase 2
6. `src/lib/stores/prs.ts` — urgentMyPRCount derived store
7. `src/lib/components/TabBar.svelte` — 긴급 뱃지
8. `src/lib/stores/filters.ts` — focusedIndex store
9. `src/lib/components/Dashboard.svelte` — 키보드 이벤트 핸들러
10. `src/lib/components/PRList.svelte` — focused prop 전달
11. `src/lib/components/PRCard.svelte` — focused 스타일

## Testing

- `urgentMyPRCount` derived store 테스트
- 키보드 핸들러는 순수 로직 함수로 분리하여 단위 테스트 (키 → 액션 매핑)
- 스켈레톤/빈 상태/드롭다운은 Svelte 컴포넌트 테스트 없음 (기존 정책 유지)
