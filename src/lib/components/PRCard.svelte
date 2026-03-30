<script lang="ts">
  import type { MyPR, ReviewRequestedPR } from "$lib/types";
  import { relativeTime, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS } from "$lib/utils";

  let { pr, mode }: { pr: MyPR | ReviewRequestedPR; mode: "my-prs" | "review-requests" } = $props();

  function getBarColor(): string {
    if (mode === "my-prs") {
      return STATUS_COLORS[(pr as MyPR).reviewStatus];
    }
    const prev = (pr as ReviewRequestedPR).previousReviewStatus;
    return STATUS_COLORS[prev ?? "pending"];
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
      {#if mode === "review-requests" && "author" in pr}
        <span class="author">by {pr.author}</span>
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
      {@const rrPR = pr as ReviewRequestedPR}
      <div class="my-review-status">
        {#if rrPR.previousReviewStatus}
          ⏳ Re-review requested
          <span class="previous-review">
            (prev: {STATUS_ICONS[rrPR.previousReviewStatus]} {STATUS_LABELS[rrPR.previousReviewStatus]})
          </span>
        {:else}
          ⏳ Not reviewed
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
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    text-align: left;
    padding: 0;
    font: inherit;
    color: inherit;
  }

  .pr-card:hover {
    border-color: #58a6ff;
    background: #1c2129;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }

  .status-bar {
    width: 4px;
    flex-shrink: 0;
    border-radius: 4px 0 0 4px;
  }

  .card-content {
    padding: 1rem 1.25rem;
    flex: 1;
    min-width: 0;
  }

  .card-header {
    margin-bottom: 0.375rem;
  }

  .pr-title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
    display: block;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 12px;
    color: #8b949e;
    margin-bottom: 0.75rem;
  }

  .card-meta .repo {
    color: #8b949e;
    font-weight: 500;
  }

  .card-meta .time {
    color: #656d76;
  }

  .reviewers, .my-review-status {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 12px;
    color: #c9d1d9;
    align-items: center;
  }

  .my-review-status {
    background: rgba(255, 255, 255, 0.06);
    padding: 0.25rem 0.625rem;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    display: inline-flex;
    gap: 0.25rem;
  }

  .previous-review {
    color: #656d76;
  }

  .reviewer {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.625rem;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .no-reviews {
    color: #6e7681;
    font-size: 12px;
    font-style: italic;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.25rem 0.625rem;
    border-radius: 12px;
  }
</style>
