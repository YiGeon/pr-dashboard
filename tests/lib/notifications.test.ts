import { describe, it, expect } from "vitest";
import { detectNewReviews, detectNewReviewRequests } from "../../src/lib/notifications";
import type { MyPR, ReviewRequestedPR } from "../../src/lib/types";

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
