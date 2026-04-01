# Entity Color Badge Design

레포지토리명과 작성자명을 해시 기반 컬러 뱃지로 표시하여 한눈에 구분 가능하게 한다.

## 적용 대상

| 요소 | 위치 | 현재 | 변경 후 |
|------|------|------|---------|
| 레포지토리명 (`pr.repo`) | `card-meta` 영역 | 회색 텍스트 | 컬러 배경 뱃지 |
| 작성자명 (`by {author}`) | `card-meta` 영역 (review-requests 탭) | 회색 텍스트 | 컬러 배경 뱃지 |
| 리뷰어 뱃지 | `reviewers` 영역 | 반투명 배경 + 상태 이모지 | **변경 없음** |

## 컬러 팔레트

다크 테마(`#161b22` 배경)에서 검증된 24색. `rgba(r,g,b,0.15)` 배경 + `rgba(r,g,b,0.25)` 테두리 + 팔레트 색상 텍스트로 사용.

```typescript
const ENTITY_COLORS = [
  '#539bf5', // blue
  '#57ab5a', // green
  '#c69026', // yellow
  '#cc6b2c', // orange
  '#e5534b', // red
  '#b083f0', // purple
  '#39c5cf', // cyan
  '#d16d9e', // pink
  '#768390', // gray
  '#6cb6ff', // light-blue
  '#8ddb8c', // lime
  '#daaa3f', // gold
  '#986ee2', // violet
  '#e0823d', // tangerine
  '#4ac26b', // emerald
  '#f47067', // coral
  '#57adf0', // sky
  '#c6902e', // amber
  '#e275ad', // rose
  '#73c991', // mint
  '#dba97b', // peach
  '#7ee3be', // teal
  '#a2a0d6', // lavender
  '#cf987a', // sienna
];
```

## 해시 함수

djb2 해시 알고리즘으로 문자열을 정수로 변환 후 팔레트 인덱스를 결정.

```typescript
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
```

- 결정적(deterministic): 같은 문자열 → 항상 같은 색상
- 빠르고 가벼움, 암호학적 보안 불필요

## 스타일 생성 함수

`utils.ts`에 `entityBadgeStyle(name: string): string` 추가.

```typescript
export function entityBadgeStyle(name: string): string {
  const color = ENTITY_COLORS[hashString(name) % ENTITY_COLORS.length];
  const [r, g, b] = hexToRgb(color.slice(1));
  return `background: rgba(${r},${g},${b},0.15); border: 1px solid rgba(${r},${g},${b},0.25); color: ${color}`;
}
```

기존 `labelStyle`과 동일한 패턴 (인라인 style 문자열 반환).

## PRCard.svelte 변경

### 레포지토리명

```svelte
<!-- Before -->
<span class="repo">{pr.repo}</span>

<!-- After -->
<span class="repo entity-badge" style={entityBadgeStyle(pr.repo)}>{pr.repo}</span>
```

### 작성자명

```svelte
<!-- Before -->
<span class="author">by {pr.author}</span>

<!-- After -->
<span class="author entity-badge" style={entityBadgeStyle(pr.author)}>{pr.author}</span>
```

`by` 접두어는 뱃지 바깥에 두거나, 뱃지 안에 포함해도 무방. 뱃지 안에 포함하는 방향으로 진행.

### entity-badge CSS

```css
.entity-badge {
  padding: 0.0625rem 0.375rem;
  border-radius: 10px;
  font-weight: 500;
}
```

기존 `.label`, `.draft-badge`와 동일한 pill 스타일.

## 변경 파일

1. `src/lib/utils.ts` — `ENTITY_COLORS`, `hashString`, `entityBadgeStyle` 추가
2. `src/lib/components/PRCard.svelte` — repo/author 스팬에 스타일 적용, `.entity-badge` CSS 추가
3. `tests/lib/utils.test.ts` — `hashString` 결정성, `entityBadgeStyle` 반환값 검증

## 테스트

- `hashString("react")` === `hashString("react")` (결정성)
- `hashString("react")` !== `hashString("vue")` (분산성, 다른 인덱스)
- `entityBadgeStyle("test")`가 `background:`, `border:`, `color:` 포함하는 문자열 반환
