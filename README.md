<div align="center">

# PR Dashboard

**GitHub PR을 한 곳에서 관리하세요.**

Organization 상관없이 내가 작성한 PR과 나에게 리뷰 요청된 PR을 한눈에 확인할 수 있는 데스크톱 앱입니다.

[![Release](https://img.shields.io/github/v/release/YiGeon/pr-dashboard?style=flat-square)](https://github.com/YiGeon/pr-dashboard/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%20v2-FFC131?style=flat-square)](https://v2.tauri.app/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-FF3E00?style=flat-square)](https://svelte.dev/)

[Download](#download) | [Features](#features) | [Settings](#settings)

</div>

---

## Features

- **내 PR 리뷰 상태** — 리뷰어별 승인 / 변경요청 / 코멘트 / 대기 상태를 한눈에 확인
- **리뷰 요청 관리** — 나에게 온 리뷰 요청 중 아직 리뷰하지 않은 PR을 빠르게 파악
- **Organization 필터** — 여러 org에 걸친 PR을 필터링, 복수 선택 가능
- **정렬 & 검색** — 업데이트순, 생성일순, 리뷰 상태순 정렬 + PR 제목 검색
- **네이티브 알림** — 새 리뷰, 새 리뷰 요청 시 OS 알림
- **메뉴바 뱃지** — macOS 상단바에 미리뷰 건수 표시
- **백그라운드 동작** — 앱을 닫아도 트레이에서 폴링 유지

## Download

[GitHub Releases](https://github.com/YiGeon/pr-dashboard/releases)에서 최신 버전을 다운로드하세요.

**Homebrew (macOS):**

```bash
brew tap YiGeon/pr-dashboard
brew install --cask pr-dashboard
```

| 플랫폼 | 파일 |
|:---|:---|
| macOS (Apple Silicon) | `.dmg` (aarch64) |
| macOS (Intel) | `.dmg` (x86_64) |
| Windows | `.msi` / `.exe` |
| Linux | `.deb` / `.AppImage` |

> **macOS 사용자 (Sequoia 15 이상):** Apple 정식 서명이 없는 앱이므로 첫 실행 시 Gatekeeper 경고가 표시됩니다.
>
> 1. 앱을 실행하면 차단 다이얼로그가 나타납니다 → **"완료"** 를 눌러 닫습니다
> 2. **시스템 설정 → 개인정보 보호 및 보안** 으로 이동합니다
> 3. 하단 "보안" 섹션에서 **"그래도 열기"** 버튼을 클릭합니다
> 4. 비밀번호를 입력하면 이후 정상적으로 실행됩니다 (최초 1회만 필요)
>
> 또는 터미널에서 `xattr -cr /Applications/PR\ Dashboard.app`을 실행하세요.

## Settings

앱 내 ⚙️ 버튼에서 변경할 수 있습니다.

| 항목 | 기본값 |
|:---|:---|
| 폴링 주기 | 5분 |
| 새 리뷰 알림 | ON |
| 새 리뷰 요청 알림 | ON |
| 시작 시 자동 실행 | OFF |
| 닫기 시 동작 | 트레이 최소화 |
| 트레이 건수 표시 | ON |

## Tech Stack

| | |
|:---|:---|
| App | [Tauri v2](https://v2.tauri.app/) |
| Frontend | [Svelte 5](https://svelte.dev/) + TypeScript |
| API | GitHub GraphQL via [octokit](https://github.com/octokit/graphql.js) |
| Auth | GitHub OAuth |

## License

[MIT](LICENSE)
