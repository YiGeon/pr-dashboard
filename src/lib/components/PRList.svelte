<script lang="ts">
  import PRCard from "./PRCard.svelte";
  import type { MyPR, ReviewRequestedPR } from "$lib/types";
  import { isLoading, myPRs, reviewRequestedPRs } from "$lib/stores/prs";
  import { selectedOrgs, searchQuery } from "$lib/stores/filters";

  let { prs, mode }: { prs: (MyPR | ReviewRequestedPR)[]; mode: "my-prs" | "review-requests" } = $props();

  const hasActiveFilter = $derived($selectedOrgs.length > 0 || $searchQuery.trim() !== "");
  const hasOriginalData = $derived(
    mode === "my-prs" ? $myPRs.length > 0 : $reviewRequestedPRs.length > 0
  );

  function resetFilters() {
    selectedOrgs.set([]);
    searchQuery.set("");
  }
</script>

<div class="pr-list">
  {#if $isLoading && prs.length === 0 && !hasOriginalData}
    {#each [1, 2, 3] as _}
      <div class="skeleton-card">
        <div class="skeleton-bar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line meta"></div>
          <div class="skeleton-line reviewers"></div>
          <div class="skeleton-line status"></div>
        </div>
      </div>
    {/each}
  {:else}
    {#each prs as pr (pr.id)}
      <PRCard {pr} {mode} />
    {/each}
    {#if prs.length === 0}
      <div class="empty">
        {#if hasActiveFilter && hasOriginalData}
          <div class="empty-icon">🔍</div>
          <div class="empty-text">검색 결과가 없습니다</div>
          <button class="reset-btn" onclick={resetFilters}>필터 초기화</button>
        {:else if mode === "my-prs"}
          <div class="empty-icon">🎉</div>
          <div class="empty-text">열린 PR이 없습니다</div>
        {:else}
          <div class="empty-icon">✅</div>
          <div class="empty-text">리뷰 요청이 없습니다</div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .pr-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.75rem 1.25rem;
    overflow-y: auto;
    flex: 1;
    max-width: 960px;
    width: 100%;
    margin: 0 auto;
  }

  /* Skeleton styles */
  .skeleton-card {
    display: flex;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    height: 120px;
    overflow: hidden;
  }

  .skeleton-bar {
    width: 4px;
    background: #30363d;
    flex-shrink: 0;
  }

  .skeleton-content {
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .skeleton-line {
    background: #21262d;
    border-radius: 4px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-line.title {
    width: 60%;
    height: 16px;
  }

  .skeleton-line.meta {
    width: 40%;
    height: 12px;
  }

  .skeleton-line.reviewers {
    width: 30%;
    height: 12px;
  }

  .skeleton-line.status {
    width: 70%;
    height: 11px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  /* Empty state styles */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 3rem;
    text-align: center;
  }

  .empty-icon {
    font-size: 2rem;
  }

  .empty-text {
    color: #8b949e;
    font-size: 14px;
  }

  .reset-btn {
    margin-top: 0.25rem;
    background: #21262d;
    color: #58a6ff;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 0.375rem 0.75rem;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .reset-btn:hover {
    background: #30363d;
  }
</style>
