import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { relativeTime, computeReviewStatus, reviewStatusPriority } from "../../src/lib/utils";

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-26T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for less than 1 minute ago", () => {
    expect(relativeTime("2026-03-26T11:59:30Z")).toBe("just now");
  });

  it("returns minutes for less than 1 hour ago", () => {
    expect(relativeTime("2026-03-26T11:30:00Z")).toBe("30m ago");
  });

  it("returns hours for less than 1 day ago", () => {
    expect(relativeTime("2026-03-26T09:00:00Z")).toBe("3h ago");
  });

  it("returns days for more than 1 day ago", () => {
    expect(relativeTime("2026-03-24T12:00:00Z")).toBe("2d ago");
  });
});

describe("computeReviewStatus", () => {
  it("returns pending when no reviews", () => {
    expect(computeReviewStatus([])).toBe("pending");
  });

  it("returns approved when all latest reviews are approved", () => {
    const reviews = [
      { author: "kim", state: "APPROVED" as const, submittedAt: "2026-03-26T10:00:00Z" },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("approved");
  });

  it("returns changes_requested when any latest review requests changes", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z" },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("changes_requested");
  });

  it("uses latest review per author when same author reviews multiple times", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T09:00:00Z" },
      { author: "kim", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("approved");
  });
});

describe("reviewStatusPriority", () => {
  it("sorts changes_requested first, then pending, then approved", () => {
    expect(reviewStatusPriority("changes_requested")).toBeLessThan(reviewStatusPriority("pending"));
    expect(reviewStatusPriority("pending")).toBeLessThan(reviewStatusPriority("approved"));
  });
});
