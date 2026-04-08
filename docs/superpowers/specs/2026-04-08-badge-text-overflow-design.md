# Badge Text Overflow & Card Meta Wrapping 개선

**Date:** 2026-04-08
**Scope:** PRCard.svelte (템플릿 + 스타일)

## 문제

1. Re-review 뱃지 텍스트가 너무 김: `⏳ Re-review requested (prev: ❌ Changes requested)`
2. card-meta 영역(repo, branch, author, time)이 한 줄 flex로 되어 있어 긴 내용이 불규칙하게 깨짐

## 변경 사항

### 1. Re-review 뱃지 텍스트 축약

이전 리뷰 상태 표시에서 `STATUS_LABELS` 텍스트를 제거하고 아이콘만 남김.
"Re-review requested" → "Re-review"로 축약.

**Review Requests 탭 (line 112-116):**
- Before: `⏳ Re-review requested (prev: ❌ Changes requested)`
- After: `⏳ Re-review (prev: ❌)`

**My PRs 탭 (line 94-98):**
- Before: `⏳ username (prev: ❌ Changes requested)`
- After: `⏳ username (prev: ❌)`

### 2. card-meta flex-wrap 개선

`.card-meta` 스타일에 `flex-wrap: wrap` 추가.
각 정보 그룹(뱃지, branch-ref, time 등)에 `white-space: nowrap` 적용하여 뱃지 단위로만 줄바꿈 발생.

## 수정 파일

- `src/lib/components/PRCard.svelte` — 템플릿 (텍스트 축약) + 스타일 (flex-wrap)
