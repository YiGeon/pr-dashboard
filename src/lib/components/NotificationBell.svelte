<script lang="ts">
  import { notifications, unreadCount, markAsRead, markAllAsRead, navigateToNotification } from "$lib/notifications";
  import { relativeTime } from "$lib/utils";

  let open = $state(false);

  function handleItemClick(notif: import("$lib/types").AppNotification) {
    open = false;
    navigateToNotification(notif);
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".notification-bell")) {
      open = false;
    }
  }

  function getIcon(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") return "💬";
    return "👀";
  }

  function getSubtext(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") {
      return `${notif.actor} — ${notif.reviewState ?? "reviewed"}`;
    }
    return `from ${notif.actor}`;
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="notification-bell">
  <button class="bell-btn" onclick={() => (open = !open)} title="Notifications">
    🔔
    {#if $unreadCount > 0}
      <span class="badge">{$unreadCount}</span>
    {/if}
  </button>

  {#if open}
    <div class="dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Notifications</span>
        {#if $unreadCount > 0}
          <button class="mark-all-btn" onclick={markAllAsRead}>Mark all read</button>
        {/if}
      </div>
      <div class="dropdown-list">
        {#each $notifications as notif (notif.id)}
          <button class="notif-item" class:unread={!notif.read} onclick={() => handleItemClick(notif)}>
            {#if !notif.read}
              <span class="unread-dot"></span>
            {/if}
            <span class="notif-icon">{getIcon(notif)}</span>
            <div class="notif-content">
              <div class="notif-pr">{notif.prTitle}</div>
              <div class="notif-meta">
                {getSubtext(notif)} · {relativeTime(notif.createdAt)}
              </div>
            </div>
          </button>
        {:else}
          <div class="empty">No notifications</div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .notification-bell {
    position: relative;
  }

  .bell-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.375rem;
    position: relative;
    border-radius: 6px;
    transition: background 0.15s;
  }

  .bell-btn:hover {
    background: #21262d;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -6px;
    background: #da3633;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 340px;
    max-height: 400px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    overflow: hidden;
    z-index: 100;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #30363d;
  }

  .dropdown-title {
    font-size: 14px;
    font-weight: 600;
    color: #e6edf3;
  }

  .mark-all-btn {
    background: none;
    border: none;
    color: #58a6ff;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
  }

  .mark-all-btn:hover {
    text-decoration: underline;
  }

  .dropdown-list {
    overflow-y: auto;
    flex: 1;
  }

  .notif-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid #21262d;
    cursor: pointer;
    width: 100%;
    text-align: left;
    background: none;
    border-left: none;
    border-right: none;
    border-top: none;
    font: inherit;
    color: inherit;
    position: relative;
  }

  .notif-item:hover {
    background: #21262d;
  }

  .unread-dot {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #58a6ff;
  }

  .unread {
    padding-left: 1.25rem;
  }

  .notif-icon {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .notif-content {
    min-width: 0;
    flex: 1;
  }

  .notif-pr {
    font-size: 13px;
    font-weight: 600;
    color: #e6edf3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .notif-meta {
    font-size: 12px;
    color: #8b949e;
    margin-top: 2px;
  }

  .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: #484f58;
    font-size: 14px;
  }
</style>
