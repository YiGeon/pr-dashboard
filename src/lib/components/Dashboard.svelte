<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import TabBar from "./TabBar.svelte";
  import FilterBar from "./FilterBar.svelte";
  import PRList from "./PRList.svelte";
  import Toast from "./Toast.svelte";
  import NotificationBell from "./NotificationBell.svelte";
  import { filteredMyPRs, filteredReviewRequestedPRs, isLoading, startPolling, fetchAll } from "$lib/stores/prs";
  import { username, logout } from "$lib/stores/auth";
  import { loadSettings, showSettings } from "$lib/stores/settings";
  import { activeTab } from "$lib/stores/filters";
  import { loadNotifications } from "$lib/notifications";

  let stopPolling: (() => void) | null = null;

  onMount(async () => {
    await loadSettings();
    loadNotifications();
    stopPolling = startPolling();
  });

  onDestroy(() => {
    stopPolling?.();
  });
</script>

<div class="dashboard">
  <header class="title-bar">
    <span class="app-title">PR Dashboard</span>
    <div class="header-actions">
      <span class="username">{$username}</span>
      <button class="icon-btn" onclick={fetchAll} disabled={$isLoading} title="Refresh">
        <span class:spinning={$isLoading}>↻</span>
      </button>
      <NotificationBell />
      <button class="icon-btn" onclick={() => showSettings.update(v => !v)} title="Settings">
        ⚙️
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
    {#if $activeTab === "my-prs"}
      <PRList prs={$filteredMyPRs} mode="my-prs" />
    {:else}
      <PRList prs={$filteredReviewRequestedPRs} mode="review-requests" />
    {/if}
  {/if}
</div>

<Toast />

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
    padding: 0.75rem 1rem;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    -webkit-app-region: drag;
  }

  .app-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: #e6edf3;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    -webkit-app-region: no-drag;
  }

  .username {
    font-size: 0.8rem;
    color: #8b949e;
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
    font-size: 1rem;
    padding: 0.25rem;
  }
</style>
