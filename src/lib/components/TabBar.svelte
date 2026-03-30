<script lang="ts">
  import { myPRs, reviewRequestedPRs } from "$lib/stores/prs";

  let { activeTab = $bindable("my-prs") }: { activeTab: "my-prs" | "review-requests" } = $props();
</script>

<div class="tab-bar">
  <button
    class="tab"
    class:active={activeTab === "my-prs"}
    onclick={() => (activeTab = "my-prs")}
  >
    My PRs ({$myPRs.length})
  </button>
  <button
    class="tab"
    class:active={activeTab === "review-requests"}
    onclick={() => (activeTab = "review-requests")}
  >
    Review Requests ({$reviewRequestedPRs.length})
  </button>
</div>

<style>
  .tab-bar {
    display: flex;
    border-bottom: 1px solid #30363d;
    padding: 0 1.25rem;
    gap: 0;
    background: #161b22;
  }

  .tab {
    background: none;
    border: none;
    color: #8b949e;
    padding: 0.625rem 1rem;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    position: relative;
  }

  .tab:hover {
    color: #e6edf3;
    background: rgba(255, 255, 255, 0.04);
  }

  .tab.active {
    color: #e6edf3;
    font-weight: 600;
    border-bottom-color: #f78166;
  }
</style>
