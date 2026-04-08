import type { ReviewState, AppNotification } from "./types";

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  const diffSec = Math.floor(diffMs / 1000);
  if (diffMin < 1) return `${diffSec}s ago`;
  if (diffHr < 1) return `${diffMin}m ago`;
  if (diffDay < 1) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

interface RawReview {
  author: string;
  state: string;
  submittedAt: string;
  reRequested?: boolean;
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

  const active = [...latestByAuthor.values()].filter((r) => !r.reRequested);
  if (active.length === 0) return "pending";

  const states = active.map((r) => r.state);
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

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

export function labelTextColor(hexColor: string): string {
  const [r, g, b] = hexToRgb(hexColor);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#24292f" : "#ffffff";
}

const ENTITY_COLORS = [
  '#539bf5', '#57ab5a', '#c69026', '#cc6b2c',
  '#e5534b', '#b083f0', '#39c5cf', '#d16d9e',
  '#768390', '#6cb6ff', '#8ddb8c', '#daaa3f',
  '#986ee2', '#e0823d', '#4ac26b', '#f47067',
  '#57adf0', '#c6902e', '#e275ad', '#73c991',
  '#dba97b', '#7ee3be', '#a2a0d6', '#cf987a',
];

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function entityBadgeStyle(name: string): string {
  const color = ENTITY_COLORS[hashString(name) % ENTITY_COLORS.length];
  const [r, g, b] = hexToRgb(color.slice(1));
  return `background: rgba(${r},${g},${b},0.15); border: 1px solid rgba(${r},${g},${b},0.25); color: ${color}`;
}
