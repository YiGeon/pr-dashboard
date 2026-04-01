<script lang="ts">
  import type { MyPR, ReviewRequestedPR, Label } from "$lib/types";
  import type { TabKey } from "$lib/stores/filters";
  import type { PRDetail } from "$lib/github/queries";
  import { relativeTime, formatDate, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS, hexToRgb, labelTextColor, entityBadgeStyle } from "$lib/utils";
  import { fetchPRDetail } from "$lib/github/client";

  let { pr, mode, focused = false }: { pr: MyPR | ReviewRequestedPR; mode: TabKey; focused?: boolean } = $props();

  let cardEl: HTMLElement;
  let expanded = $state(false);
  let detail = $state<PRDetail | null>(null);
  let detailLoading = $state(false);

  $effect(() => {
    if (focused && cardEl) {
      cardEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });

  function getBarColor(): string {
    if (mode === "my-prs") {
      return STATUS_COLORS[(pr as MyPR).reviewStatus];
    }
    return STATUS_COLORS[(pr as ReviewRequestedPR).myReviewStatus];
  }

  async function toggleExpand() {
    expanded = !expanded;
    if (expanded && !detail) {
      detailLoading = true;
      try {
        detail = await fetchPRDetail(pr.id);
      } catch (err) {
        console.error("Failed to fetch PR detail:", err);
      } finally {
        detailLoading = false;
      }
    }
  }

  function openInGitHub(e: MouseEvent) {
    e.stopPropagation();
    window.open(pr.url, "_blank");
  }

  function labelStyle(label: Label): string {
    const [r, g, b] = hexToRgb(label.color);
    return `background: rgba(${r},${g},${b},0.2); border-color: rgba(${r},${g},${b},0.3); color: ${labelTextColor(label.color)}`;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="pr-card" class:focused class:expanded onclick={toggleExpand} bind:this={cardEl}>
  <div class="status-bar" style="background: {getBarColor()}"></div>
  <div class="card-content">
    <div class="card-header">
      <span class="pr-title">{pr.title}</span>
      {#if pr.isDraft}
        <span class="draft-badge">Draft</span>
      {/if}
      <button class="open-link" onclick={openInGitHub} title="GitHub에서 열기">↗</button>
    </div>
    <div class="card-meta">
      <span class="repo entity-badge" style={entityBadgeStyle(pr.repo)}>{pr.repo}</span>
      <span class="base-ref">← {pr.baseRef}</span>
      {#if mode === "review-requests" && "author" in pr}
        <span class="separator">·</span>
        <span class="author entity-badge" style={entityBadgeStyle(pr.author)}>by {pr.author}</span>
      {/if}
      <span class="separator">·</span>
      <span class="time" title="Created: {formatDate(pr.createdAt)}">created {relativeTime(pr.createdAt)}</span>
      <span class="separator">·</span>
      <span class="time" title="Updated: {formatDate(pr.updatedAt)}">updated {relativeTime(pr.updatedAt)}</span>
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
      <div class="reviewers">
        <span class="my-review-status">
          {#if rrPR.previousReviewStatus}
            ⏳ Re-review requested
            <span class="previous-review">
              (prev: {STATUS_ICONS[rrPR.previousReviewStatus]} {STATUS_LABELS[rrPR.previousReviewStatus]})
            </span>
          {:else}
            ⏳ Not reviewed
          {/if}
        </span>
        {#each rrPR.reviews as review}
          <span class="reviewer">
            {STATUS_ICONS[review.state]} {review.author}
          </span>
        {/each}
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
    {#if expanded}
      <div class="detail-panel">
        {#if detailLoading}
          <div class="detail-loading">Loading...</div>
        {:else if detail}
          <div class="detail-sections">
            {#if detail.commits.length > 0}
              <div class="detail-section">
                <div class="detail-section-title">Commits ({detail.commits.length})</div>
                {#each detail.commits as commit}
                  <div class="commit-row">
                    <code class="commit-sha">{commit.oid}</code>
                    <span class="commit-msg">{commit.message}</span>
                    <span class="commit-meta">{commit.author} · {relativeTime(commit.date)}</span>
                  </div>
                {/each}
              </div>
            {/if}
            {#if detail.comments.length > 0}
              <div class="detail-section">
                <div class="detail-section-title">Comments ({detail.comments.length})</div>
                {#each detail.comments as comment}
                  <div class="comment-row" class:resolved={comment.isResolved}>
                    <div class="comment-header">
                      <span class="comment-author">{comment.author}</span>
                      {#if comment.path}
                        <span class="comment-path">{comment.path}</span>
                      {/if}
                      <span class="comment-time">{relativeTime(comment.createdAt)}</span>
                    </div>
                    <div class="comment-body">{comment.body}</div>
                  </div>
                {/each}
              </div>
            {/if}
            {#if detail.commits.length === 0 && detail.comments.length === 0}
              <div class="detail-empty">커밋과 코멘트가 없습니다</div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .pr-card {
    display: flex;
    flex-shrink: 0;
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

  .pr-card.focused {
    border-color: #58a6ff;
    box-shadow: 0 0 0 1px #58a6ff;
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
    font-size: 15px;
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

  .entity-badge {
    padding: 0.0625rem 0.375rem;
    border-radius: 10px;
    font-weight: 500;
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
    opacity: 0.8;
  }

  .merge-status {
    font-weight: 500;
  }
  .merge-status.mergeable { color: #3fb950; }
  .merge-status.conflicting { color: #f85149; }
  .merge-status.checking { color: #d29922; }
  .merge-status.draft { color: #8b949e; }

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

  .pr-card.expanded {
    border-color: #30363d;
    background: #1c2129;
  }

  .open-link {
    background: none;
    border: 1px solid #30363d;
    color: #8b949e;
    font-size: 12px;
    padding: 0 0.375rem;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
    line-height: 1.4;
    margin-left: auto;
    transition: color 0.15s, border-color 0.15s;
  }

  .open-link:hover {
    color: #58a6ff;
    border-color: #58a6ff;
  }

  .detail-panel {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #21262d;
  }

  .detail-loading {
    color: #656d76;
    font-size: 12px;
    padding: 0.5rem 0;
  }

  .detail-sections {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-section-title {
    font-size: 11px;
    font-weight: 600;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 0.375rem;
  }

  .commit-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 12px;
    padding: 0.25rem 0;
  }

  .commit-sha {
    color: #58a6ff;
    font-size: 11px;
    background: rgba(88, 166, 255, 0.1);
    padding: 0.0625rem 0.3rem;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .commit-msg {
    color: #c9d1d9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .commit-meta {
    color: #656d76;
    font-size: 11px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .comment-row {
    padding: 0.375rem 0;
    border-bottom: 1px solid #21262d;
  }

  .comment-row:last-child {
    border-bottom: none;
  }

  .comment-row.resolved {
    opacity: 0.5;
  }

  .comment-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 11px;
    margin-bottom: 0.25rem;
  }

  .comment-author {
    color: #c9d1d9;
    font-weight: 600;
  }

  .comment-path {
    color: #58a6ff;
    font-size: 10px;
    background: rgba(88, 166, 255, 0.1);
    padding: 0.0625rem 0.25rem;
    border-radius: 3px;
  }

  .comment-time {
    color: #656d76;
    margin-left: auto;
  }

  .comment-body {
    color: #8b949e;
    font-size: 12px;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .detail-empty {
    color: #656d76;
    font-size: 12px;
    padding: 0.5rem 0;
  }
</style>
