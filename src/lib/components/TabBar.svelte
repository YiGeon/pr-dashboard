<script lang="ts">
  import { myPRs, reviewRequestedPRs, urgentMyPRCount } from "$lib/stores/prs";

  let { activeTab = $bindable("my-prs") }: { activeTab: "my-prs" | "review-requests" } = $props();
</script>

<div class="tab-bar">
  <button
    class="tab"
    class:active={activeTab === "review-requests"}
    onclick={() => (activeTab = "review-requests")}
  >
    Review Requests ({$reviewRequestedPRs.length})
  </button>
  <button
    class="tab"
    class:active={activeTab === "my-prs"}
    onclick={() => (activeTab = "my-prs")}
  >
    My PRs ({$myPRs.length})
    {#if $urgentMyPRCount > 0}
      <span class="urgent-badge">{$urgentMyPRCount}</span>
    {/if}
  </button>
</div>

<style>
  .tab-bar {
    display: flex;
    border-bottom: 1px solid #21262d;
    padding: 0.75rem 1.5rem;
    gap: 0.5rem;
    background: #161b22;
  }

  .tab {
    background: transparent;
    border: 1px solid transparent;
    color: #8b949e;
    padding: 0.375rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 20px;
    transition: all 0.2s ease;
  }

  .tab:hover {
    color: #c9d1d9;
    background: rgba(255, 255, 255, 0.04);
  }

  .tab.active {
    color: #ffffff;
    background: #21262d;
    border-color: #30363d;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .urgent-badge {
    background: #da3633;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    margin-left: 4px;
  }
</style>
