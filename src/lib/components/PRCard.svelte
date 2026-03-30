<script lang="ts">
  import type { MyPR, ReviewRequestedPR, ReviewState } from "$lib/types";
  import { relativeTime } from "$lib/utils";

  let { pr, mode }: { pr: MyPR | ReviewRequestedPR; mode: "my-prs" | "review-requests" } = $props();

  const STATUS_COLORS: Record<ReviewState, string> = {
    approved: "#238636",
    changes_requested: "#da3633",
    commented: "#8b949e",
    pending: "#d29922",
  };

  const STATUS_ICONS: Record<ReviewState, string> = {
    approved: "✅",
    changes_requested: "❌",
    commented: "💬",
    pending: "⏳",
  };

  function getBarColor(): string {
    if (mode === "my-prs") {
      return STATUS_COLORS[(pr as MyPR).reviewStatus];
    }
    return STATUS_COLORS[(pr as ReviewRequestedPR).myReviewStatus];
  }

  function handleClick() {
    window.open(pr.url, "_blank");
  }
</script>

<button class="pr-card" onclick={handleClick}>
  <div class="status-bar" style="background: {getBarColor()}"></div>
  <div class="card-content">
    <div class="card-header">
      <span class="pr-title">{pr.title}</span>
    </div>
    <div class="card-meta">
      <span class="repo">{pr.repo}</span>
      {#if mode === "review-requests"}
        <span class="author">by {(pr as ReviewRequestedPR).author}</span>
      {/if}
      <span class="time">{relativeTime(pr.updatedAt)}</span>
    </div>
    {#if mode === "my-prs"}
      <div class="reviewers">
        {#each (pr as MyPR).reviews as review}
          <span class="reviewer">
            {STATUS_ICONS[review.state]} {review.author}
          </span>
        {/each}
        {#if (pr as MyPR).reviews.length === 0}
          <span class="no-reviews">No reviews yet</span>
        {/if}
      </div>
    {:else}
      <div class="my-review-status">
        {STATUS_ICONS[(pr as ReviewRequestedPR).myReviewStatus]}
        {#if (pr as ReviewRequestedPR).myReviewStatus === "pending"}
          Not reviewed
        {:else if (pr as ReviewRequestedPR).myReviewStatus === "approved"}
          Approved
        {:else if (pr as ReviewRequestedPR).myReviewStatus === "changes_requested"}
          Changes requested
        {:else}
          Commented
        {/if}
      </div>
    {/if}
  </div>
</button>

<style>
  .pr-card {
    display: flex;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.2s;
    width: 100%;
    text-align: left;
    padding: 0;
    font: inherit;
    color: inherit;
  }

  .pr-card:hover {
    border-color: #58a6ff;
  }

  .status-bar {
    width: 4px;
    flex-shrink: 0;
  }

  .card-content {
    padding: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .card-header {
    margin-bottom: 0.25rem;
  }

  .pr-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #e6edf3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #8b949e;
    margin-bottom: 0.375rem;
  }

  .reviewers, .my-review-status {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #c9d1d9;
  }

  .no-reviews {
    color: #484f58;
    font-size: 0.75rem;
  }
</style>
