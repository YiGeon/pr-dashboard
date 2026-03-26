<script lang="ts">
  import PRCard from "./PRCard.svelte";
  import type { MyPR, ReviewRequestedPR } from "../lib/types";

  let { prs, mode }: { prs: (MyPR | ReviewRequestedPR)[]; mode: "my-prs" | "review-requests" } = $props();
</script>

<div class="pr-list">
  {#each prs as pr (pr.id)}
    <PRCard {pr} {mode} />
  {/each}
  {#if prs.length === 0}
    <div class="empty">
      {#if mode === "my-prs"}
        No open PRs
      {:else}
        No review requests
      {/if}
    </div>
  {/if}
</div>

<style>
  .pr-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .empty {
    text-align: center;
    color: #484f58;
    padding: 2rem;
    font-size: 0.875rem;
  }
</style>
