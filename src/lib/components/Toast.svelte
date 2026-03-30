<script lang="ts">
  import { toastQueue, dismissToast, navigateToNotification } from "$lib/notifications";
  import { onDestroy } from "svelte";

  const MAX_VISIBLE = 3;

  let timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  const unsubscribe = toastQueue.subscribe(($queue) => {
    for (const notif of $queue) {
      if (!timers.has(notif.id)) {
        const timer = setTimeout(() => {
          dismissToast(notif.id);
          timers.delete(notif.id);
        }, 5000);
        timers.set(notif.id, timer);
      }
    }
  });

  onDestroy(() => {
    unsubscribe();
    for (const timer of timers.values()) clearTimeout(timer);
  });

  function handleClick(notif: import("$lib/types").AppNotification) {
    dismissToast(notif.id);
    navigateToNotification(notif);
  }

  function getBody(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") {
      return `${notif.actor} — ${notif.reviewState ?? "reviewed"}`;
    }
    return `from ${notif.actor}`;
  }

  function getTitle(notif: import("$lib/types").AppNotification): string {
    if (notif.type === "new_review") return "New review";
    return "Review requested";
  }
</script>

<div class="toast-container">
  {#each $toastQueue.slice(0, MAX_VISIBLE) as notif (notif.id)}
    <button class="toast" onclick={() => handleClick(notif)}>
      <div class="toast-title">{getTitle(notif)}</div>
      <div class="toast-pr">{notif.prTitle}</div>
      <div class="toast-body">{getBody(notif)}</div>
    </button>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    min-width: 280px;
    max-width: 360px;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
    animation: slide-in 0.3s ease-out;
    transition: opacity 0.2s, transform 0.2s;
  }

  .toast:hover {
    border-color: #58a6ff;
  }

  .toast-title {
    font-size: 0.7rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .toast-pr {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e6edf3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toast-body {
    font-size: 0.75rem;
    color: #8b949e;
    margin-top: 0.125rem;
  }

  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
