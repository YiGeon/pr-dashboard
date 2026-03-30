<script lang="ts">
  import type { MyPR, ReviewRequestedPR, Label } from "$lib/types";
  import { relativeTime, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, labelTextColor } from "$lib/utils";

  let { pr, mode }: { pr: MyPR | ReviewRequestedPR; mode: "my-prs" | "review-requests" } = $props();

  function getBarColor(): string {
    if (mode === "my-prs") {
      return STATUS_COLORS[(pr as MyPR).reviewStatus];
    }
    return STATUS_COLORS["pending"];
  }

  function handleClick() {
    window.open(pr.url, "_blank");
  }

  function labelStyle(label: Label): string {
    const r = parseInt(label.color.slice(0, 2), 16);
    const g = parseInt(label.color.slice(2, 4), 16);
    const b = parseInt(label.color.slice(4, 6), 16);
    const bg = `rgba(${r}, ${g}, ${b}, 0.2)`;
    const border = `rgba(${r}, ${g}, ${b}, 0.3)`;
    const text = labelTextColor(label.color);
    return `background: ${bg}; border-color: ${border}; color: ${text}`;
  }
</script>

<button class="pr-card" onclick={handleClick}>
  <div class="status-bar" style="background: {getBarColor()}"></div>
  <div class="card-content">
    <div class="card-header">
      <span class="pr-title">{pr.title}</span>
      {#if pr.isDraft}
        <span class="draft-badge">Draft</span>
      {/if}
    </div>
    <div class="card-meta">
      <span class="repo">{pr.repo}</span>
      <span class="base-ref">← {pr.baseRef}</span>
      {#if mode === "review-requests" && "author" in pr}
        <span class="separator">·</span>
        <span class="author">by {pr.author}</span>
      {/if}
      <span class="separator">·</span>
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
    <div class="status-line">
      {#if pr.isDraft}
        <span class="merge-status draft">● Draft</span>
      {:else if pr.mergeable === "mergeable"}
        <span class="merge-status mergeable">● Mergeable</span>
      {:else if pr.mergeable === "conflicting"}
        <span class="merge-status conflicting">● Conflict</span>
      {:else}
        <span class="merge-status checking">● Checking...</span>
      {/if}
      {#if "ciStatus" in pr && pr.ciStatus}
        <span class="dot-sep">·</span>
        {#if pr.ciStatus === "success"}
          <span class="ci success">✓ CI passed</span>
        {:else if pr.ciStatus === "failure"}
          <span class="ci failure">✗ CI failed</span>
        {:else}
          <span class="ci pending">● CI running</span>
        {/if}
      {/if}
      {#if pr.unresolvedThreads > 0}
        <span class="dot-sep">·</span>
        <span class="threads">💬 {pr.unresolvedThreads}</span>
      {/if}
      <span class="dot-sep">·</span>
      <span class="diff-stat">
        <span class="additions">+{pr.additions}</span>
        <span class="deletions">-{pr.deletions}</span>
        <span class="dot-sep">·</span>
        <span class="files">{pr.changedFiles} {pr.changedFiles === 1 ? "file" : "files"}</span>
      </span>
    </div>
    {#if pr.labels.length > 0}
      <div class="labels">
        {#each pr.labels as label}
          <span class="label" style={labelStyle(label)}>{label.name}</span>
        {/each}
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
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
    margin-bottom: 0.625rem;
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
    margin-bottom: 0;
  }

  .my-review-status {
    background: rgba(255, 255, 255, 0.06);
    padding: 0.25rem 0.625rem;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    display: inline-flex;
    gap: 0.25rem;
    margin-bottom: 0;
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

  .draft-badge {
    font-size: 11px;
    color: #8b949e;
    background: rgba(139, 148, 158, 0.15);
    border: 1px solid rgba(139, 148, 158, 0.25);
    padding: 0.0625rem 0.375rem;
    border-radius: 10px;
    white-space: nowrap;
    font-weight: 500;
    flex-shrink: 0;
  }

  .card-meta .base-ref {
    color: #656d76;
  }

  .card-meta .separator {
    color: #30363d;
  }

  .status-line {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 11px;
    color: #8b949e;
    margin-top: 0.5rem;
  }

  .merge-status {
    font-weight: 500;
  }
  .merge-status.mergeable { color: #3fb950; }
  .merge-status.conflicting { color: #f85149; }
  .merge-status.checking { color: #d29922; }
  .merge-status.draft { color: #8b949e; }

  .ci.success { color: #3fb950; }
  .ci.failure { color: #f85149; }
  .ci.pending { color: #d29922; }

  .threads { color: #d29922; }

  .dot-sep {
    color: #30363d;
    font-size: 10px;
  }

  .diff-stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .additions { color: #3fb950; font-weight: 600; }
  .deletions { color: #f85149; font-weight: 600; }
  .files { color: #8b949e; }

  .labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3125rem;
    margin-top: 0.375rem;
  }

  .label {
    font-size: 11px;
    font-weight: 500;
    padding: 0.0625rem 0.4375rem;
    border-radius: 10px;
    line-height: 1.5;
    border: 1px solid transparent;
  }
</style>
