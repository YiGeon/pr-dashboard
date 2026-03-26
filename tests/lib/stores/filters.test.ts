import { describe, it, expect } from "vitest";
import { applyFilters, applySorting } from "../../../src/lib/stores/filters";
import type { MyPR, SortKey } from "../../../src/lib/types";

const MOCK_MY_PRS: MyPR[] = [
  {
    id: "1", title: "fix: login bug", url: "", repo: "company/backend", org: "company",
    state: "open", createdAt: "2026-03-24T10:00:00Z", updatedAt: "2026-03-26T10:00:00Z",
    reviews: [], reviewStatus: "changes_requested", ciStatus: null,
  },
  {
    id: "2", title: "feat: profile page", url: "", repo: "personal/frontend", org: "personal",
    state: "open", createdAt: "2026-03-25T10:00:00Z", updatedAt: "2026-03-25T05:00:00Z",
    reviews: [], reviewStatus: "approved", ciStatus: "success",
  },
  {
    id: "3", title: "chore: CI pipeline", url: "", repo: "company/infra", org: "company",
    state: "open", createdAt: "2026-03-23T10:00:00Z", updatedAt: "2026-03-26T08:00:00Z",
    reviews: [], reviewStatus: "pending", ciStatus: "pending",
  },
];

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
