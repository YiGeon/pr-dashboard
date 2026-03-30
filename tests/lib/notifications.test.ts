import { describe, it, expect, beforeEach } from "vitest";
import {
  detectNewReviews,
  detectNewReviewRequests,
  notifications,
  unreadCount,
  loadNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  NOTIFICATIONS_STORAGE_KEY,
  MAX_NOTIFICATIONS,
  TTL_MS,
} from "../../src/lib/notifications";
import { get } from "svelte/store";
import type { MyPR, ReviewRequestedPR, AppNotification } from "../../src/lib/types";

describe("detectNewReviews", () => {
  it("returns empty when no changes", () => {
    const pr: MyPR = {
      id: "1", title: "fix: bug", url: "", repo: "a/b", org: "a", state: "open",
      createdAt: "", updatedAt: "", reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
      ], reviewStatus: "approved", ciStatus: null,
    };
    expect(detectNewReviews([pr], [pr])).toEqual([]);
  });

  it("detects a new review on existing PR", () => {
    const prev: MyPR = {
      id: "1", title: "fix: bug", url: "https://github.com/a/b/pull/1", repo: "a/b", org: "a", state: "open",
      createdAt: "", updatedAt: "", reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
      ], reviewStatus: "approved", ciStatus: null,
    };
    const curr: MyPR = {
      ...prev, reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
        { author: "lee", state: "changes_requested", submittedAt: "2026-03-26T11:00:00Z" },
      ], reviewStatus: "changes_requested",
    };
    const result = detectNewReviews([prev], [curr]);
    expect(result).toHaveLength(1);
    expect(result[0].prTitle).toBe("fix: bug");
    expect(result[0].reviewer).toBe("lee");
    expect(result[0].state).toBe("changes_requested");
  });
});

describe("detectNewReviewRequests", () => {
  it("returns empty when no new requests", () => {
    const pr: ReviewRequestedPR = {
      id: "1", title: "feat: x", url: "", repo: "a/b", org: "a",
      author: "other", createdAt: "", updatedAt: "", myReviewStatus: "pending",
    };
    expect(detectNewReviewRequests([pr], [pr])).toEqual([]);
  });

  it("detects a new review request", () => {
    const prev: ReviewRequestedPR[] = [];
    const curr: ReviewRequestedPR[] = [{
      id: "1", title: "feat: payment", url: "https://github.com/c/d/pull/5", repo: "c/d", org: "c",
      author: "hong", createdAt: "", updatedAt: "", myReviewStatus: "pending",
    }];
    const result = detectNewReviewRequests(prev, curr);
    expect(result).toHaveLength(1);
    expect(result[0].prTitle).toBe("feat: payment");
    expect(result[0].author).toBe("hong");
  });
});

describe("notification store", () => {
  beforeEach(() => {
    localStorage.clear();
    notifications.set([]);
  });

  it("addNotification adds to store and saves to localStorage", () => {
    addNotification({
      type: "new_review",
      prTitle: "fix: bug",
      prUrl: "https://github.com/a/b/pull/1",
      actor: "kim",
      reviewState: "approved",
    });
    const items = get(notifications);
    expect(items).toHaveLength(1);
    expect(items[0].prTitle).toBe("fix: bug");
    expect(items[0].read).toBe(false);
    expect(items[0].id).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it("addNotification caps at MAX_NOTIFICATIONS, removing oldest", () => {
    for (let i = 0; i < MAX_NOTIFICATIONS + 5; i++) {
      addNotification({
        type: "review_request",
        prTitle: `PR #${i}`,
        prUrl: `https://github.com/a/b/pull/${i}`,
        actor: "user",
      });
    }
    expect(get(notifications)).toHaveLength(MAX_NOTIFICATIONS);
    expect(get(notifications)[0].prTitle).toBe(`PR #${MAX_NOTIFICATIONS + 4}`);
  });

  it("markAsRead marks a single notification as read", () => {
    addNotification({
      type: "new_review",
      prTitle: "fix: bug",
      prUrl: "https://github.com/a/b/pull/1",
      actor: "kim",
    });
    const id = get(notifications)[0].id;
    markAsRead(id);
    expect(get(notifications)[0].read).toBe(true);
    const stored = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)!);
    expect(stored[0].read).toBe(true);
  });

  it("markAllAsRead marks all notifications as read", () => {
    addNotification({ type: "new_review", prTitle: "PR 1", prUrl: "", actor: "a" });
    addNotification({ type: "review_request", prTitle: "PR 2", prUrl: "", actor: "b" });
    markAllAsRead();
    const items = get(notifications);
    expect(items.every((n) => n.read)).toBe(true);
  });

  it("unreadCount returns count of unread notifications", () => {
    addNotification({ type: "new_review", prTitle: "PR 1", prUrl: "", actor: "a" });
    addNotification({ type: "review_request", prTitle: "PR 2", prUrl: "", actor: "b" });
    expect(get(unreadCount)).toBe(2);
    markAsRead(get(notifications)[0].id);
    expect(get(unreadCount)).toBe(1);
  });

  it("loadNotifications restores from localStorage", () => {
    const saved: AppNotification[] = [{
      id: "test-1",
      type: "new_review",
      prTitle: "saved PR",
      prUrl: "",
      actor: "user",
      read: false,
      createdAt: new Date().toISOString(),
    }];
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(saved));
    loadNotifications();
    expect(get(notifications)).toHaveLength(1);
    expect(get(notifications)[0].prTitle).toBe("saved PR");
  });

  it("loadNotifications removes expired notifications (older than TTL)", () => {
    const old: AppNotification[] = [{
      id: "old-1",
      type: "new_review",
      prTitle: "expired PR",
      prUrl: "",
      actor: "user",
      read: true,
      createdAt: new Date(Date.now() - TTL_MS - 1000).toISOString(),
    }];
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(old));
    loadNotifications();
    expect(get(notifications)).toHaveLength(0);
  });
});
