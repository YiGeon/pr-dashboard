# Notification UX Improvement Design

## Overview

PR Dashboard의 브라우저 알림 UX를 개선한다. 현재는 OS 알림만 발송하고 클릭 핸들러/인앱 UI가 없는 상태에서, 토스트 + 벨 드롭다운 + 브라우저 알림 클릭 네비게이션을 추가한다.

## Goals

- 브라우저 알림 클릭 시 웹앱으로 포커스 이동 + 해당 PR 네비게이션
- 인앱 토스트 알림으로 실시간 피드백
- 벨 아이콘 드롭다운으로 알림 히스토리 확인
- 읽음/안읽음 구분
- localStorage 영속 + 자동 만료

## Data Model

```typescript
interface AppNotification {
  id: string;                          // crypto.randomUUID()
  type: "new_review" | "review_request";
  prTitle: string;
  prUrl: string;
  actor: string;                       // reviewer 또는 author
  reviewState?: ReviewState;           // new_review일 때만
  read: boolean;
  createdAt: string;                   // ISO string
}
```

- localStorage 키: `pr-dashboard-notifications`
- TTL: 7일 — 앱 로드 시 7일 지난 항목 자동 정리
- 최대 보관: 50개 (오래된 순 삭제)

## Notification Store

기존 `src/lib/notifications.ts`에 추가:

### Store

- `notifications`: `writable<AppNotification[]>` — 알림 목록
- `unreadCount`: `derived` — `read: false`인 항목 수

### Functions

- `addNotification(event)` — store에 추가 + localStorage 저장
- `markAsRead(id)` — 단건 읽음 처리
- `markAllAsRead()` — 전체 읽음 처리
- `loadNotifications()` — 앱 시작 시 localStorage 복원 + TTL/상한 정리

### Integration

`checkAndNotify()`에서 기존 `new Notification()` 호출 직전에 `addNotification()`도 호출. 기존 `detectNewReviews`, `detectNewReviewRequests` 함수는 변경 없음.

## UI Components

### Toast (`Toast.svelte`)

- 위치: 화면 우상단, 슬라이드인 애니메이션
- 5초 후 자동 사라짐
- 알림 타입별 표시:
  - `new_review`: `"{reviewer} — {state}"` + PR 제목
  - `review_request`: `"from {author}"` + PR 제목
- 클릭 시: 해당 PR이 있는 탭으로 전환 + 검색어에 PR 제목 자동 입력
- 동시 알림: 최대 3개 스택 표시, 나머지는 큐잉
- `document.hidden`일 때는 토스트 스킵 (브라우저 알림 + store 저장만 수행)

### Bell Dropdown (`NotificationBell.svelte`)

- 위치: Dashboard 헤더, 기존 아이콘 옆
- `unreadCount > 0`이면 빨간 뱃지로 숫자 표시
- 클릭 시 드롭다운 열림:
  - 상단: "모두 읽음" 버튼
  - 알림 목록 (최신순, 스크롤)
  - 각 항목: 타입 아이콘 + PR 제목 + actor + 상대시간
  - 안 읽은 항목: 왼쪽에 파란 점 (blue dot)
  - 항목 클릭: 읽음 처리 + 해당 탭 전환 + PR 제목으로 검색

### Browser Notification Click

- `new Notification()`에 `onclick` 핸들러 추가
- 클릭 시: `window.focus()` → 해당 탭 전환 + PR 검색 (인앱 알림 클릭과 동일)

## Navigation Logic

알림 클릭 시 공통 동작 (`navigateToNotification(notification)`):

1. `window.focus()` (브라우저 알림인 경우)
2. 설정 화면이 열려있으면 닫기
3. 탭 전환:
   - `new_review` → "my-prs" 탭
   - `review_request` → "review-requests" 탭
4. 검색 필터에 PR 제목 입력 → 해당 PR이 리스트 상단에 노출

### Store 변경

- `activeTab`을 Dashboard 로컬 상태에서 `filters.ts` store로 승격
- `navigateToNotification()` 유틸 함수가 `activeTab` + `searchQuery`를 세팅

## Edge Cases

- **Notification 권한 거부**: 인앱 알림(토스트 + 벨)은 권한 무관하게 항상 동작. 브라우저 알림만 권한 필요.
- **localStorage 용량**: 50개 상한 + 7일 TTL로 실질적으로 문제 없음.
- **동시 폴링 알림**: 토스트 최대 3개, 나머지 큐잉. 벨 드롭다운에는 전부 표시.
- **탭 비활성**: `document.hidden`일 때 토스트 스킵, 브라우저 알림 + store 저장만 수행. 탭 복귀 시 벨 뱃지로 확인.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/types.ts` | `AppNotification` 타입 추가 |
| `src/lib/notifications.ts` | store, addNotification, markAsRead, markAllAsRead, loadNotifications, navigateToNotification 추가 |
| `src/lib/stores/filters.ts` | `activeTab` store 추가 |
| `src/lib/components/Toast.svelte` | 새 파일 |
| `src/lib/components/NotificationBell.svelte` | 새 파일 |
| `src/lib/components/Dashboard.svelte` | 벨 아이콘 추가, activeTab을 store로 교체, 토스트 마운트 |
| `tests/lib/notifications.test.ts` | store/TTL/네비게이션 테스트 추가 |
