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
    padding: 0 1rem;
  }

  .tab {
    background: none;
    border: none;
    color: #8b949e;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
  }

  .tab:hover {
    color: #e6edf3;
  }

  .tab.active {
    color: #58a6ff;
    border-bottom-color: #58a6ff;
  }
</style>
