<div align="center">

# PR Dashboard

**GitHub PR을 한 곳에서 관리하세요.**

Organization 상관없이 내가 작성한 PR과 나에게 리뷰 요청된 PR을 한눈에 확인할 수 있는 웹앱입니다.

[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-Svelte%205-FF3E00?style=flat-square)](https://svelte.dev/)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black?style=flat-square)](https://vercel.com)

[Features](#features) | [Settings](#settings) | [Development](#development)

</div>

---

## Features

- **내 PR 리뷰 상태** — 리뷰어별 승인 / 변경요청 / 코멘트 / 대기 상태를 한눈에 확인
- **리뷰 요청 관리** — 나에게 온 리뷰 요청 중 아직 리뷰하지 않은 PR을 빠르게 파악
- **Organization 필터** — 여러 org에 걸친 PR을 필터링, 복수 선택 가능
- **정렬 & 검색** — 업데이트순, 생성일순, 리뷰 상태순 정렬 + PR 제목 검색
- **브라우저 알림** — 새 리뷰, 새 리뷰 요청 시 알림

## Settings

앱 내 ⚙️ 버튼에서 변경할 수 있습니다.

| 항목 | 기본값 |
|:---|:---|
| 폴링 주기 | 5분 |
| 새 리뷰 알림 | ON |
| 새 리뷰 요청 알림 | ON |

## Development

### 사전 요구사항

- Node.js v18+

### 설정

```bash
npm install
```

Vercel 환경변수 (또는 `.env`):
- `GITHUB_CLIENT_ID` — GitHub OAuth App의 Client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth App의 Client Secret

### 실행

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm test          # 테스트
npm run check     # 타입 검사
```

## Tech Stack

| | |
|:---|:---|
| Framework | [SvelteKit](https://svelte.dev/) (Svelte 5) + TypeScript |
| API | GitHub GraphQL via [octokit](https://github.com/octokit/graphql.js) |
| Auth | GitHub OAuth (서버 라우트에서 토큰 교환) |
| Deploy | [Vercel](https://vercel.com) |

## License

[MIT](LICENSE)
