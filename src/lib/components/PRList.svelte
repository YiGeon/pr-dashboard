<script lang="ts">
  import PRCard from "./PRCard.svelte";
  import type { MyPR, ReviewRequestedPR } from "$lib/types";

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
    padding: 0.75rem 1.25rem;
    overflow-y: auto;
    flex: 1;
    max-width: 960px;
    width: 100%;
    margin: 0 auto;
  }

  .empty {
    text-align: center;
    color: #484f58;
    padding: 3rem;
    font-size: 0.85rem;
  }
</style>
