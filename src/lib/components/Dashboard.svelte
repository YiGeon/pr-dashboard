<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import TabBar from "./TabBar.svelte";
  import FilterBar from "./FilterBar.svelte";
  import PRList from "./PRList.svelte";
  import Toast from "./Toast.svelte";
  import NotificationBell from "./NotificationBell.svelte";
  import { filteredMyPRs, filteredReviewRequestedPRs, filteredApprovedPRs, isLoading, startPolling, fetchAll, lastFetchedAt, lastUpdateCount } from "$lib/stores/prs";
  import { relativeTime } from "$lib/utils";
  import { username, logout } from "$lib/stores/auth";
  import { loadSettings, showSettings } from "$lib/stores/settings";
  import { activeTab, focusedIndex } from "$lib/stores/filters";
  import { get, derived } from "svelte/store";
  import { loadNotifications } from "$lib/notifications";

  const activePRs = derived(
    [activeTab, filteredMyPRs, filteredReviewRequestedPRs, filteredApprovedPRs],
    ([$tab, $my, $review, $approved]) =>
      $tab === "my-prs" ? $my : $tab === "approved" ? $approved : $review
  );

  let stopPolling: (() => void) | null = null;
  let tick = $state(0);
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let lastFetchedRelative = $derived(tick !== undefined ? relativeTime($lastFetchedAt ?? "") : "");

  let feedbackMessage = $state("");
  let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  let showShortcuts = $state(false);

  $effect(() => {
    const count = $lastUpdateCount;
    if (count && count > 0) {
      feedbackMessage = `${count}개 PR 업데이트됨`;
      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        feedbackMessage = "";
        lastUpdateCount.set(null);
      }, 2000);
    }
  });

  onMount(async () => {
    await loadSettings();
    loadNotifications();
    stopPolling = startPolling();
    tickTimer = setInterval(() => { tick++; }, 1000);
  });

  onDestroy(() => {
    stopPolling?.();
    if (tickTimer) clearInterval(tickTimer);
  });

  $effect(() => {
    $activeTab;
    focusedIndex.set(-1);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") {
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement).blur();
        e.preventDefault();
      }
      return;
    }

    const handledKeys = ["ArrowDown", "ArrowUp", "Enter", "r", "1", "2", "3", "/", "Escape", "?"];
    if (!handledKeys.includes(e.key)) return;

    const prs = get(activePRs);
    const maxIndex = prs.length - 1;

    switch (e.key) {
      case "ArrowDown": {
        const idx = get(focusedIndex);
        focusedIndex.set(Math.min(idx + 1, maxIndex));
        e.preventDefault();
        break;
      }
      case "ArrowUp": {
        const idx = get(focusedIndex);
        focusedIndex.set(Math.max(idx - 1, 0));
        e.preventDefault();
        break;
      }
      case "Enter": {
        const idx = get(focusedIndex);
        if (idx >= 0 && idx <= maxIndex) {
          window.open(prs[idx].url, "_blank");
          e.preventDefault();
        }
        break;
      }
      case "r":
        fetchAll();
        e.preventDefault();
        break;
      case "1":
        activeTab.set("review-requests");
        focusedIndex.set(-1);
        e.preventDefault();
        break;
      case "2":
        activeTab.set("my-prs");
        focusedIndex.set(-1);
        e.preventDefault();
        break;
      case "3":
        activeTab.set("approved");
        focusedIndex.set(-1);
        e.preventDefault();
        break;
      case "/":
        document.querySelector<HTMLInputElement>(".search-input")?.focus();
        e.preventDefault();
        break;
      case "Escape":
        if (showShortcuts) {
          showShortcuts = false;
        } else {
          focusedIndex.set(-1);
        }
        break;
      case "?":
        showShortcuts = !showShortcuts;
        e.preventDefault();
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="dashboard">
  <header class="title-bar">
    <span class="app-title">PR Dashboard</span>
    <div class="header-actions">
      <span class="username">{$username}</span>
      {#if $lastFetchedAt}
        <span class="last-fetched">{lastFetchedRelative}</span>
      {/if}
      {#if feedbackMessage}
        <span class="feedback-msg">{feedbackMessage}</span>
      {/if}
      <button class="icon-btn" onclick={fetchAll} disabled={$isLoading} title="Refresh">
        <svg class:spinning={$isLoading} width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 014.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177l1.38 1.38A7.002 7.002 0 0114.95 7.16a.75.75 0 11-1.49.178A5.5 5.5 0 008 2.5zM1.705 8.005a.75.75 0 01.834.656 5.5 5.5 0 009.592 2.97l-1.204-1.204a.25.25 0 01.177-.427h3.646a.25.25 0 01.25.25v3.646a.25.25 0 01-.427.177l-1.38-1.38A7.002 7.002 0 011.05 8.84a.75.75 0 01.656-.834z"></path></svg>
      </button>
      <NotificationBell />
      <button class="icon-btn" onclick={() => showSettings.update(v => !v)} title="Settings">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M7.429 1.525a3.5 3.5 0 011.142 0c.036.003.108.036.137.146l.289 1.105c.147.56.55.967.997 1.189.174.086.341.183.501.29.417.278.97.423 1.53.27l1.102-.303c.11-.03.175.016.195.046a3.5 3.5 0 01.571.99c.02.058.014.134-.067.2l-.814.806c-.411.408-.56.942-.56 1.434v.002c0 .492.149 1.026.56 1.434l.793.784c.082.066.087.142.067.2a3.5 3.5 0 01-.571.99c-.02.03-.085.076-.195.046l-1.102-.303c-.56-.153-1.113-.008-1.53.27a4.5 4.5 0 01-.501.29c-.447.222-.85.629-.997 1.189l-.289 1.105c-.029.11-.1.143-.137.146a3.5 3.5 0 01-1.142 0c-.036-.003-.108-.037-.137-.146l-.289-1.105c-.147-.56-.55-.967-.997-1.189a4.5 4.5 0 01-.501-.29c-.417-.278-.97-.423-1.53-.27l-1.102.303c-.11.03-.175-.016-.195-.046a3.5 3.5 0 01-.571-.99c-.02-.058-.014-.134.067-.2l.814-.806c.411-.408.56-.942.56-1.434v-.002c0-.492-.149-1.026-.56-1.434l-.793-.784c-.082-.066-.087-.142-.067-.2a3.5 3.5 0 01.571-.99c.02-.03.085-.076.195-.046l1.102.303c.56.153 1.113.008 1.53-.27.16-.107.327-.204.501-.29.447-.222.85-.629.997-1.189l.289-1.105c.029-.11.1-.143.137-.146zM8 0c-.236 0-.47.01-.701.03-.743.065-1.29.615-1.458 1.261l-.29 1.106c-.017.066-.078.158-.211.224a5.994 5.994 0 00-.668.386c-.123.082-.233.117-.3.117h-.003l-1.103-.303c-.644-.176-1.392.021-1.82.63a4.998 4.998 0 00-.571.99c-.282.55-.182 1.283.166 1.826l.793.784c.042.041.085.137.085.316v.002c0 .18-.043.275-.085.316l-.793.784c-.348.543-.448 1.277-.166 1.826.145.283.314.554.571.99.428.609 1.176.806 1.82.63l1.103-.303h.003c.067 0 .177.035.3.117.214.143.436.272.668.386.133.066.194.158.212.224l.289 1.106c.169.646.715 1.196 1.458 1.26a4.97 4.97 0 001.402 0c.743-.064 1.29-.614 1.458-1.26l.29-1.106c.017-.066.078-.158.211-.224a5.98 5.98 0 00.668-.386c.123-.082.233-.117.3-.117h.003l1.103.303c.644.176 1.392-.021 1.82-.63.257-.436.426-.707.571-.99.282-.55.182-1.283-.166-1.826l-.793-.784c-.042-.041-.085-.137-.085-.316v-.002c0-.18.043-.275.085-.316l.793-.784c.348-.543.448-1.277.166-1.826a4.993 4.993 0 00-.571-.99c-.428-.609-1.176-.806-1.82-.63l-1.103.303h-.003c-.067 0-.177-.035-.3-.117a5.994 5.994 0 00-.668-.386c-.133-.066-.194-.158-.212-.224l-.289-1.106C9.79.615 9.243.065 8.5.03A4.997 4.997 0 008 0zM6.5 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8 5a3 3 0 100 6 3 3 0 000-6z"></path></svg>
      </button>
    </div>
  </header>

  {#if $showSettings}
    {#await import("./Settings.svelte") then { default: Settings }}
      <Settings onclose={() => showSettings.set(false)} />
    {/await}
  {:else}
    <TabBar bind:activeTab={$activeTab} />
    <FilterBar />
    <PRList prs={$activePRs} mode={$activeTab} />
  {/if}
</div>

<Toast />

{#if showShortcuts}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="shortcuts-overlay" role="presentation" onclick={() => (showShortcuts = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="shortcuts-modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <div class="shortcuts-header">
        <h3>Keyboard Shortcuts</h3>
        <button class="shortcuts-close" onclick={() => (showShortcuts = false)}>Esc</button>
      </div>
      <div class="shortcuts-body">
        <div class="shortcut-row"><kbd>↑</kbd> <kbd>↓</kbd> <span>PR 카드 이동</span></div>
        <div class="shortcut-row"><kbd>Enter</kbd> <span>PR 열기</span></div>
        <div class="shortcut-row"><kbd>r</kbd> <span>새로고침</span></div>
        <div class="shortcut-row"><kbd>1</kbd> <span>Review Requests 탭</span></div>
        <div class="shortcut-row"><kbd>2</kbd> <span>My PRs 탭</span></div>
        <div class="shortcut-row"><kbd>3</kbd> <span>Approved 탭</span></div>
        <div class="shortcut-row"><kbd>/</kbd> <span>검색</span></div>
        <div class="shortcut-row"><kbd>Esc</kbd> <span>닫기 / 포커스 해제</span></div>
        <div class="shortcut-row"><kbd>?</kbd> <span>단축키 도움말</span></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #0d1117;
    color: #c9d1d9;
  }

  .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    height: 56px;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    -webkit-app-region: drag;
  }

  .app-title {
    font-weight: 700;
    font-size: 1.125rem;
    color: #e6edf3;
    letter-spacing: -0.01em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    -webkit-app-region: no-drag;
  }

  .username {
    font-size: 12px;
    color: #8b949e;
    margin-right: 0.5rem;
  }

  .spinning {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.375rem;
    border-radius: 6px;
    color: #8b949e;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .icon-btn:hover {
    background: #21262d;
    color: #e6edf3;
  }

  .icon-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .icon-btn:disabled:hover {
    background: none;
    color: #8b949e;
  }

  .last-fetched {
    font-size: 11px;
    color: #656d76;
    margin-right: 0.25rem;
    min-width: 4.5em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .feedback-msg {
    font-size: 11px;
    color: #3fb950;
    font-weight: 500;
    animation: fade-in 0.3s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .shortcuts-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fade-in 0.15s ease;
  }

  .shortcuts-modal {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    width: 340px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }

  .shortcuts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #30363d;
  }

  .shortcuts-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: #e6edf3;
    margin: 0;
  }

  .shortcuts-close {
    background: #21262d;
    border: 1px solid #30363d;
    color: #8b949e;
    font-size: 11px;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .shortcuts-body {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 13px;
    color: #c9d1d9;
  }

  .shortcut-row span {
    flex: 1;
    text-align: right;
    color: #8b949e;
  }

  .shortcut-row kbd {
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    padding: 0.125rem 0.375rem;
    font-size: 12px;
    font-family: inherit;
    color: #c9d1d9;
    min-width: 24px;
    text-align: center;
  }
</style>
