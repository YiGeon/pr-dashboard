import type { ReviewState, AppNotification } from "./types";

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffHr < 1) return `${diffMin}m ago`;
  if (diffDay < 1) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

interface RawReview {
  author: string;
  state: string;
  submittedAt: string;
}

export function computeReviewStatus(reviews: RawReview[]): ReviewState {
  if (reviews.length === 0) return "pending";

  const latestByAuthor = new Map<string, RawReview>();
  for (const r of reviews) {
    const existing = latestByAuthor.get(r.author);
    if (!existing || r.submittedAt > existing.submittedAt) {
      latestByAuthor.set(r.author, r);
    }
  }

  const states = [...latestByAuthor.values()].map((r) => r.state);
  if (states.some((s) => s === "CHANGES_REQUESTED")) return "changes_requested";
  if (states.every((s) => s === "APPROVED")) return "approved";
  if (states.some((s) => s === "COMMENTED")) return "commented";
  return "pending";
}

export const STATUS_COLORS: Record<ReviewState, string> = {
  approved: "#238636",
  changes_requested: "#da3633",
  commented: "#8b949e",
  pending: "#d29922",
};

export const STATUS_ICONS: Record<ReviewState, string> = {
  approved: "✅",
  changes_requested: "❌",
  commented: "💬",
  pending: "⏳",
};

export const STATUS_LABELS: Record<ReviewState, string> = {
  approved: "Approved",
  changes_requested: "Changes requested",
  commented: "Commented",
  pending: "Pending",
};

export function formatNotificationBody(notif: AppNotification): string {
  if (notif.type === "new_review") return `${notif.actor} — ${notif.reviewState ?? "reviewed"}`;
  return `from ${notif.actor}`;
}

const STATUS_PRIORITY: Record<ReviewState, number> = {
  changes_requested: 0,
  pending: 1,
  commented: 2,
  approved: 3,
};

export function reviewStatusPriority(status: ReviewState): number {
  return STATUS_PRIORITY[status];
}

export function labelTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#24292f" : "#ffffff";
}
