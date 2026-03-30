import { writable, derived, get } from "svelte/store";
import type { MyPR, ReviewRequestedPR, AppNotification } from "./types";
import { settings } from "./stores/settings";

export interface NewReviewEvent {
  prTitle: string;
  prUrl: string;
  reviewer: string;
  state: string;
}

export interface NewReviewRequestEvent {
  prTitle: string;
  prUrl: string;
  author: string;
}

export const NOTIFICATIONS_STORAGE_KEY = "pr-dashboard-notifications";
export const MAX_NOTIFICATIONS = 50;
export const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const notifications = writable<AppNotification[]>([]);
export const unreadCount = derived(notifications, ($n) => $n.filter((x) => !x.read).length);

function saveToStorage(items: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
}

export function loadNotifications() {
  const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed: AppNotification[] = JSON.parse(raw);
    const now = Date.now();
    const valid = parsed.filter(
      (n) => now - new Date(n.createdAt).getTime() < TTL_MS
    );
    const trimmed = valid.slice(0, MAX_NOTIFICATIONS);
    notifications.set(trimmed);
    saveToStorage(trimmed);
  } catch {
    // ignore corrupted data
  }
}

export function addNotification(event: {
  type: "new_review" | "review_request";
  prTitle: string;
  prUrl: string;
  actor: string;
  reviewState?: string;
}) {
  const item: AppNotification = {
    id: crypto.randomUUID(),
    type: event.type,
    prTitle: event.prTitle,
    prUrl: event.prUrl,
    actor: event.actor,
    reviewState: event.reviewState as AppNotification["reviewState"],
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.update((prev) => {
    const updated = [item, ...prev].slice(0, MAX_NOTIFICATIONS);
    saveToStorage(updated);
    return updated;
  });
}

export function markAsRead(id: string) {
  notifications.update((prev) => {
    const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveToStorage(updated);
    return updated;
  });
}

export function markAllAsRead() {
  notifications.update((prev) => {
    const updated = prev.map((n) => ({ ...n, read: true }));
    saveToStorage(updated);
    return updated;
  });
}

export function detectNewReviews(prev: MyPR[], curr: MyPR[]): NewReviewEvent[] {
  const events: NewReviewEvent[] = [];
  const prevMap = new Map(prev.map((pr) => [pr.id, pr]));

  for (const pr of curr) {
    const prevPR = prevMap.get(pr.id);
    if (!prevPR) continue;

    const prevReviewKeys = new Set(
      prevPR.reviews.map((r) => `${r.author}:${r.submittedAt}`)
    );

    for (const review of pr.reviews) {
      const key = `${review.author}:${review.submittedAt}`;
      if (!prevReviewKeys.has(key)) {
        events.push({
          prTitle: pr.title,
          prUrl: pr.url,
          reviewer: review.author,
          state: review.state,
        });
      }
    }
  }

  return events;
}

export function detectNewReviewRequests(
  prev: ReviewRequestedPR[],
  curr: ReviewRequestedPR[]
): NewReviewRequestEvent[] {
  const prevIds = new Set(prev.map((pr) => pr.id));
  return curr
    .filter((pr) => !prevIds.has(pr.id))
    .map((pr) => ({
      prTitle: pr.title,
      prUrl: pr.url,
      author: pr.author,
    }));
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function checkAndNotify(
  prevMyPRs: MyPR[],
  currMyPRs: MyPR[],
  prevReviewPRs: ReviewRequestedPR[],
  currReviewPRs: ReviewRequestedPR[]
) {
  if (prevMyPRs.length === 0 && prevReviewPRs.length === 0) return;

  const $settings = get(settings);
  const permitted = await requestNotificationPermission();
  if (!permitted) return;

  if ($settings.notifyOnNewReview) {
    const newReviews = detectNewReviews(prevMyPRs, currMyPRs);
    for (const event of newReviews) {
      new Notification(`New review: ${event.prTitle}`, {
        body: `${event.reviewer} — ${event.state}`,
      });
    }
  }

  if ($settings.notifyOnReviewRequest) {
    const newRequests = detectNewReviewRequests(prevReviewPRs, currReviewPRs);
    for (const event of newRequests) {
      new Notification(`Review requested: ${event.prTitle}`, {
        body: `from ${event.author}`,
      });
    }
  }
}
