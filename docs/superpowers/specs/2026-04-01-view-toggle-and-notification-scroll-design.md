# View Toggle 라디오 개편 + 알림 클릭 스크롤 하이라이트

**Date**: 2026-04-01

## 개요

두 가지 UX 개선:
1. Flat/Grouped 뷰 전환을 토글 버튼에서 Segmented Control 라디오로 변경
2. 알림 클릭 시 검색 필터링 대신 해당 카드로 스크롤 + 3초 border glow 하이라이트

## 1. Segmented Control

### 변경 사항

**파일**: `src/lib/components/FilterBar.svelte`

현재 단일 토글 버튼(`▤ Flat` / `▤ Grouped`)을 두 버튼이 붙은 Segmented Control로 교체.

### 디자인

- 두 버튼이 `border-radius: 6px`로 묶인 하나의 그룹 (overflow: hidden)
- 선택된 쪽: `background: #1f6feb`, `color: #fff`
- 비선택 쪽: `background: #161b22`, `color: #8b949e`
- 두 버튼 사이에 `border-left: 1px solid #30363d` 구분선
- 호버 시 비선택 쪽 `border-color: #484f58`

### 동작

- `groupByRepo` store 값에 따라 활성 버튼 결정
- 클릭 시 `groupByRepo.set(false)` 또는 `groupByRepo.set(true)`
- localStorage 영속 로직 변경 없음 (기존 `filters.ts`의 subscribe 유지)

## 2. 알림 클릭 → 카드 스크롤 + 하이라이트

### 타입 변경

**파일**: `src/lib/types.ts`

`AppNotification`에 `prId: string` 필드 추가.

### Store 추가

**파일**: `src/lib/stores/filters.ts`

`highlightedPRId` writable store 추가:
- 타입: `writable<string | null>`
- 초기값: `null`
- 설정 시 `setTimeout`으로 3초 후 자동 `null` 리셋

### navigateToNotification 변경

**파일**: `src/lib/notifications.ts`

기존 동작:
```
showSettings 닫기 → 탭 전환 → searchQuery에 제목 설정 → markAsRead
```

새 동작:
```
prId 없으면 return → showSettings 닫기 → 탭 전환 → 필터 초기화(selectedOrgs, searchQuery) → highlightedPRId 설정 → markAsRead
```

- `prId`가 없는 기존 알림은 클릭해도 동작하지 않음 (fallback 없음)
- `searchQuery.set("")`, `selectedOrgs.set([])` 로 필터 초기화하여 해당 PR이 반드시 리스트에 보이도록 보장

### addNotification 변경

**파일**: `src/lib/notifications.ts`

`addNotification` 파라미터에 `prId: string` 추가. `AppNotification` 객체에 포함.

### checkAndNotify 변경

**파일**: `src/lib/notifications.ts`

`addNotification` 호출부에서 `prId` 전달:
- `detectNewReviews` → `pr.id` 전달
- `detectNewReviewRequests` → `pr.id` 전달

`NewReviewEvent`, `NewReviewRequestEvent` 인터페이스에도 `prId` 필드 추가.

### PRCard 하이라이트

**파일**: `src/lib/components/PRCard.svelte`

- `highlightedPRId` store 구독
- `pr.id === $highlightedPRId`이면 `.highlighted` CSS 클래스 부여
- `.highlighted` 시 `scrollIntoView({ block: "center", behavior: "smooth" })`
- CSS 애니메이션: border glow pulse (파란색 테두리 + box-shadow가 3초간 2회 pulse 후 fade-out)

```css
.pr-card.highlighted {
  border-color: #58a6ff;
  box-shadow: 0 0 12px rgba(88, 166, 255, 0.3);
  animation: highlight-glow 1.5s ease-in-out 2;
}

@keyframes highlight-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(88, 166, 255, 0.2); }
  50% { box-shadow: 0 0 16px rgba(88, 166, 255, 0.5); border-color: #79c0ff; }
}
```

### 브라우저 알림 (OS Notification) onclick

**파일**: `src/lib/notifications.ts`

기존 `n.onclick`에서 `navigateToNotification(notif)`을 호출하는 로직 유지. `navigateToNotification`의 내부 동작만 바뀌므로 변경 없음.

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/types.ts` | `AppNotification`에 `prId` 추가 |
| `src/lib/stores/filters.ts` | `highlightedPRId` store 추가 |
| `src/lib/notifications.ts` | `navigateToNotification` 스크롤 방식 전환, `addNotification`에 `prId` 추가, event 인터페이스에 `prId` 추가 |
| `src/lib/components/FilterBar.svelte` | 토글 → Segmented Control |
| `src/lib/components/PRCard.svelte` | highlighted 클래스 + 스크롤 + 애니메이션 |

## 테스트

- `tests/lib/notifications.test.ts` — `addNotification`에 `prId` 포함, `navigateToNotification` 동작 변경 반영
- `tests/lib/stores/filters.test.ts` — `highlightedPRId` store 테스트 (설정 → 3초 후 null)
