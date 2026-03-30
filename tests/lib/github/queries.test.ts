import { describe, it, expect } from "vitest";
import { parseMyPRs, parseReviewRequestedPRs } from "../../../src/lib/github/queries";

const MOCK_MY_PRS_RESPONSE = {
  search: {
    nodes: [
      {
        id: "PR_1",
        title: "fix: login bug",
        url: "https://github.com/company/backend/pull/42",
        repository: { nameWithOwner: "company/backend", owner: { login: "company" } },
        createdAt: "2026-03-25T10:00:00Z",
        updatedAt: "2026-03-26T10:00:00Z",
        reviews: {
          nodes: [
            { author: { login: "kim" }, state: "CHANGES_REQUESTED", submittedAt: "2026-03-26T09:00:00Z" },
            { author: { login: "lee" }, state: "APPROVED", submittedAt: "2026-03-26T10:00:00Z" },
          ],
        },
        commits: {
          nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }],
        },
      },
      {
        id: "PR_2",
        title: "feat: profile page",
        url: "https://github.com/personal/frontend/pull/10",
        repository: { nameWithOwner: "personal/frontend", owner: { login: "personal" } },
        createdAt: "2026-03-24T10:00:00Z",
        updatedAt: "2026-03-26T05:00:00Z",
        reviews: { nodes: [] },
        commits: {
          nodes: [{ commit: { statusCheckRollup: null } }],
        },
      },
    ],
  },
};

const MOCK_REVIEW_REQUESTED_RESPONSE = {
  search: {
    nodes: [
      {
        id: "PR_3",
        title: "feat: payment module",
        url: "https://github.com/company/payment/pull/7",
        repository: { nameWithOwner: "company/payment", owner: { login: "company" } },
        author: { login: "hong" },
        createdAt: "2026-03-25T08:00:00Z",
        updatedAt: "2026-03-26T06:00:00Z",
        reviews: {
          nodes: [
            { author: { login: "me" }, state: "APPROVED", submittedAt: "2026-03-26T06:00:00Z" },
          ],
        },
      },
    ],
  },
};

describe("parseMyPRs", () => {
  it("parses GraphQL response into MyPR array", () => {
    const result = parseMyPRs(MOCK_MY_PRS_RESPONSE);
    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      id: "PR_1",
      title: "fix: login bug",
      url: "https://github.com/company/backend/pull/42",
      repo: "company/backend",
      org: "company",
      state: "open",
      createdAt: "2026-03-25T10:00:00Z",
      updatedAt: "2026-03-26T10:00:00Z",
      reviews: [
        { author: "kim", state: "changes_requested", submittedAt: "2026-03-26T09:00:00Z" },
        { author: "lee", state: "approved", submittedAt: "2026-03-26T10:00:00Z" },
      ],
      reviewStatus: "changes_requested",
      ciStatus: "success",
    });

    expect(result[1].reviewStatus).toBe("pending");
    expect(result[1].ciStatus).toBeNull();
  });
});

describe("parseReviewRequestedPRs", () => {
  it("parses with pending status and previous review info", () => {
    const result = parseReviewRequestedPRs(MOCK_REVIEW_REQUESTED_RESPONSE, "me");
    expect(result).toHaveLength(1);

    expect(result[0]).toEqual({
      id: "PR_3",
      title: "feat: payment module",
      url: "https://github.com/company/payment/pull/7",
      repo: "company/payment",
      org: "company",
      author: "hong",
      createdAt: "2026-03-25T08:00:00Z",
      updatedAt: "2026-03-26T06:00:00Z",
      myReviewStatus: "pending",
      previousReviewStatus: "approved",
    });
  });

  it("returns null previousReviewStatus when user has not reviewed", () => {
    const response = {
      search: {
        nodes: [{
          id: "PR_4", title: "test", url: "https://github.com/x/y/pull/1",
          repository: { nameWithOwner: "x/y", owner: { login: "x" } },
          author: { login: "other" },
          createdAt: "2026-03-25T00:00:00Z", updatedAt: "2026-03-25T00:00:00Z",
          reviews: { nodes: [] },
        }],
      },
    };
    const result = parseReviewRequestedPRs(response, "me");
    expect(result[0].myReviewStatus).toBe("pending");
    expect(result[0].previousReviewStatus).toBeNull();
  });
});
