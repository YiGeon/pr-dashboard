<script lang="ts">
  import PRCard from "./PRCard.svelte";
  import type { MyPR, ReviewRequestedPR } from "$lib/types";
  import type { TabKey } from "$lib/stores/filters";
  import { isLoading, myPRs, reviewRequestedPRs, approvedPRs } from "$lib/stores/prs";
  import { selectedOrgs, searchQuery, focusedIndex, groupByRepo } from "$lib/stores/filters";
  import { entityBadgeStyle } from "$lib/utils";

  let { prs, mode }: { prs: (MyPR | ReviewRequestedPR)[]; mode: TabKey } = $props();

  const hasActiveFilter = $derived($selectedOrgs.length > 0 || $searchQuery.trim() !== "");

  type RepoGroup = { repo: string; prs: (MyPR | ReviewRequestedPR)[] };
  const grouped = $derived.by(() => {
    if (!$groupByRepo) return null;
    const map = new Map<string, (MyPR | ReviewRequestedPR)[]>();
    for (const pr of prs) {
      const list = map.get(pr.repo);
      if (list) list.push(pr);
      else map.set(pr.repo, [pr]);
    }
    return [...map.entries()].map(([repo, prs]) => ({ repo, prs })) as RepoGroup[];
  });
  const hasOriginalData = $derived(
    mode === "my-prs" ? $myPRs.length > 0 :
    mode === "approved" ? $approvedPRs.length > 0 :
    $reviewRequestedPRs.length > 0
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
    {#if grouped}
      {@const flatIndex = { value: 0 }}
      {#each grouped as group (group.repo)}
        <div class="repo-group">
          <div class="repo-group-header">
            <span class="repo-group-name entity-badge" style={entityBadgeStyle(group.repo)}>{group.repo}</span>
            <span class="repo-group-count">{group.prs.length}</span>
          </div>
          {#each group.prs as pr, _j (pr.id)}
            {@const idx = flatIndex.value++}
            <PRCard {pr} {mode} focused={$focusedIndex === idx} />
          {/each}
        </div>
      {/each}
    {:else}
      {#each prs as pr, i (pr.id)}
        <PRCard {pr} {mode} focused={$focusedIndex === i} />
      {/each}
    {/if}
    {#if prs.length === 0}
      <div class="empty">
        {#if hasActiveFilter && hasOriginalData}
          <div class="empty-icon">🔍</div>
          <div class="empty-text">검색 결과가 없습니다</div>
          <button class="reset-btn" onclick={resetFilters}>필터 초기화</button>
        {:else if mode === "my-prs"}
          <div class="empty-icon">🎉</div>
          <div class="empty-text">열린 PR이 없습니다</div>
          <div class="empty-sub">새 PR을 만들면 여기에 표시됩니다</div>
        {:else if mode === "approved"}
          <div class="empty-icon">📭</div>
          <div class="empty-text">승인한 PR이 없습니다</div>
          <div class="empty-sub">리뷰를 승인하면 여기에 표시됩니다</div>
        {:else}
          <div class="empty-icon">✅</div>
          <div class="empty-text">리뷰 요청이 없습니다</div>
          <div class="empty-sub">모든 리뷰를 완료했습니다</div>
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
    min-height: 0;
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

  /* Repo group styles */
  .repo-group {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .repo-group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    margin-top: 0.5rem;
  }

  .repo-group:first-child .repo-group-header {
    margin-top: 0;
  }

  .repo-group-name {
    font-size: 13px;
    font-weight: 600;
  }

  .entity-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 10px;
  }

  .repo-group-count {
    font-size: 11px;
    color: #656d76;
    font-variant-numeric: tabular-nums;
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

  .empty-sub {
    color: #656d76;
    font-size: 12px;
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
