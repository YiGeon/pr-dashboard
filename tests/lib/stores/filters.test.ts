import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyFilters, applySorting, highlightedPRId, setHighlightedPRId } from "../../../src/lib/stores/filters";
import { urgentMyPRCount } from "../../../src/lib/stores/prs";
import { get } from "svelte/store";
import type { MyPR, SortKey } from "../../../src/lib/types";

const MOCK_MY_PRS: MyPR[] = [
  {
    id: "1", title: "fix: login bug", url: "", repo: "company/backend", org: "company",
    state: "open", createdAt: "2026-03-24T10:00:00Z", updatedAt: "2026-03-26T10:00:00Z",
    reviews: [], reviewStatus: "changes_requested", ciStatus: null,
    baseRef: "main", labels: [], unresolvedThreads: 0, additions: 0, deletions: 0, changedFiles: 0, isDraft: false, mergeable: "mergeable" as const, commitCount: 1,
  },
  {
    id: "2", title: "feat: profile page", url: "", repo: "personal/frontend", org: "personal",
    state: "open", createdAt: "2026-03-25T10:00:00Z", updatedAt: "2026-03-25T05:00:00Z",
    reviews: [], reviewStatus: "approved", ciStatus: "success",
    baseRef: "main", labels: [], unresolvedThreads: 0, additions: 0, deletions: 0, changedFiles: 0, isDraft: false, mergeable: "mergeable" as const, commitCount: 1,
  },
  {
    id: "3", title: "chore: CI pipeline", url: "", repo: "company/infra", org: "company",
    state: "open", createdAt: "2026-03-23T10:00:00Z", updatedAt: "2026-03-26T08:00:00Z",
    reviews: [], reviewStatus: "pending", ciStatus: "pending",
    baseRef: "main", labels: [], unresolvedThreads: 0, additions: 0, deletions: 0, changedFiles: 0, isDraft: false, mergeable: "mergeable" as const, commitCount: 1,
  },
];

describe("urgentMyPRCount", () => {
  it("counts PRs with conflict", async () => {
    const { myPRs } = await import("../../../src/lib/stores/prs");
    myPRs.set([
      { ...MOCK_MY_PRS[0], mergeable: "conflicting" },
      { ...MOCK_MY_PRS[1], mergeable: "mergeable" },
      { ...MOCK_MY_PRS[2], mergeable: "conflicting" },
    ]);
    expect(get(urgentMyPRCount)).toBe(2);
  });
});

describe("applyFilters", () => {
  it("returns all when no filters applied", () => {
    const result = applyFilters(MOCK_MY_PRS, [], "");
    expect(result).toHaveLength(3);
  });

  it("filters by organization", () => {
    const result = applyFilters(MOCK_MY_PRS, ["company"], "");
    expect(result).toHaveLength(2);
    expect(result.every((pr) => pr.org === "company")).toBe(true);
  });

  it("filters by search query on title", () => {
    const result = applyFilters(MOCK_MY_PRS, [], "login");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("fix: login bug");
  });

  it("combines org filter and search", () => {
    const result = applyFilters(MOCK_MY_PRS, ["company"], "CI");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("chore: CI pipeline");
  });
});

describe("applySorting", () => {
  it("sorts by updatedAt descending", () => {
    const result = applySorting([...MOCK_MY_PRS], "updatedAt");
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("3");
    expect(result[2].id).toBe("2");
  });

  it("sorts by createdAt descending", () => {
    const result = applySorting([...MOCK_MY_PRS], "createdAt");
    expect(result[0].id).toBe("2");
    expect(result[1].id).toBe("1");
    expect(result[2].id).toBe("3");
  });

  it("sorts by reviewStatus priority", () => {
    const result = applySorting([...MOCK_MY_PRS], "reviewStatus");
    expect(result[0].reviewStatus).toBe("changes_requested");
    expect(result[1].reviewStatus).toBe("pending");
    expect(result[2].reviewStatus).toBe("approved");
  });
});

describe("highlightedPRId", () => {
  beforeEach(() => {
    highlightedPRId.set(null);
  });

  it("should initialize as null", () => {
    expect(get(highlightedPRId)).toBeNull();
  });

  it("should set value and auto-clear after 3 seconds", () => {
    vi.useFakeTimers();
    setHighlightedPRId("PR_123");
    expect(get(highlightedPRId)).toBe("PR_123");
    vi.advanceTimersByTime(3000);
    expect(get(highlightedPRId)).toBeNull();
    vi.useRealTimers();
  });

  it("should cancel previous timer when setting new value", () => {
    vi.useFakeTimers();
    setHighlightedPRId("PR_1");
    vi.advanceTimersByTime(2000);
    setHighlightedPRId("PR_2");
    expect(get(highlightedPRId)).toBe("PR_2");
    vi.advanceTimersByTime(1000);
    expect(get(highlightedPRId)).toBe("PR_2");
    vi.advanceTimersByTime(2000);
    expect(get(highlightedPRId)).toBeNull();
    vi.useRealTimers();
  });
});
