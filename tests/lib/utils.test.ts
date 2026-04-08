import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { relativeTime, computeReviewStatus, reviewStatusPriority, labelTextColor, hashString, entityBadgeStyle } from "../../src/lib/utils";

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-26T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns seconds for less than 1 minute ago", () => {
    expect(relativeTime("2026-03-26T11:59:30Z")).toBe("30s ago");
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

  it("treats changes_requested as pending when reRequested is true", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: true },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("approved");
  });

  it("treats approved as pending when reRequested is true", () => {
    const reviews = [
      { author: "kim", state: "APPROVED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: true },
    ];
    expect(computeReviewStatus(reviews)).toBe("pending");
  });

  it("returns changes_requested when reRequested is false", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: false },
      { author: "lee", state: "APPROVED" as const, submittedAt: "2026-03-26T11:00:00Z" },
    ];
    expect(computeReviewStatus(reviews)).toBe("changes_requested");
  });

  it("returns pending when all reviewers are reRequested", () => {
    const reviews = [
      { author: "kim", state: "CHANGES_REQUESTED" as const, submittedAt: "2026-03-26T10:00:00Z", reRequested: true },
      { author: "lee", state: "COMMENTED" as const, submittedAt: "2026-03-26T11:00:00Z", reRequested: true },
    ];
    expect(computeReviewStatus(reviews)).toBe("pending");
  });
});

describe("reviewStatusPriority", () => {
  it("sorts changes_requested first, then pending, then approved", () => {
    expect(reviewStatusPriority("changes_requested")).toBeLessThan(reviewStatusPriority("pending"));
    expect(reviewStatusPriority("pending")).toBeLessThan(reviewStatusPriority("approved"));
  });
});

describe("labelTextColor", () => {
  it("returns dark text for light background", () => {
    expect(labelTextColor("f9d0c4")).toBe("#24292f");
  });

  it("returns light text for dark background", () => {
    expect(labelTextColor("0e8a16")).toBe("#ffffff");
  });

  it("returns light text for very dark color", () => {
    expect(labelTextColor("000000")).toBe("#ffffff");
  });

  it("returns dark text for white", () => {
    expect(labelTextColor("ffffff")).toBe("#24292f");
  });
});

describe("hashString", () => {
  it("returns the same value for the same input", () => {
    expect(hashString("my-org/my-repo")).toBe(hashString("my-org/my-repo"));
  });

  it("returns different values for different inputs", () => {
    expect(hashString("react")).not.toBe(hashString("vue"));
  });

  it("returns a non-negative number", () => {
    expect(hashString("test")).toBeGreaterThanOrEqual(0);
  });

  it("handles empty string", () => {
    expect(hashString("")).toBe(0);
  });
});

describe("entityBadgeStyle", () => {
  it("returns a CSS string with background, border, and color", () => {
    const style = entityBadgeStyle("my-org/my-repo");
    expect(style).toContain("background:");
    expect(style).toContain("border:");
    expect(style).toContain("color:");
  });

  it("returns the same style for the same input", () => {
    expect(entityBadgeStyle("octocat")).toBe(entityBadgeStyle("octocat"));
  });

  it("returns different styles for different inputs", () => {
    expect(entityBadgeStyle("alice")).not.toBe(entityBadgeStyle("bob"));
  });
});
