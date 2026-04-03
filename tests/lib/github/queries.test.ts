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
          totalCount: 3,
          nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }],
        },
        mergeable: "MERGEABLE",
        baseRefName: "develop",
        headRefName: "fix/login-bug",
        isDraft: false,
        labels: { nodes: [{ name: "bug", color: "d73a4a" }] },
        reviewThreads: { nodes: [{ isResolved: true }, { isResolved: false }, { isResolved: false }] },
        additions: 42,
        deletions: 8,
        changedFiles: 5,
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
          totalCount: 1,
          nodes: [{ commit: { statusCheckRollup: null } }],
        },
        mergeable: "CONFLICTING",
        baseRefName: "main",
        headRefName: "feat/profile-page",
        isDraft: true,
        labels: { nodes: [] },
        reviewThreads: { nodes: [] },
        additions: 12,
        deletions: 4,
        changedFiles: 2,
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
            { author: { login: "kim" }, state: "APPROVED", submittedAt: "2026-03-26T05:00:00Z" },
            { author: { login: "lee" }, state: "COMMENTED", submittedAt: "2026-03-26T04:00:00Z" },
          ],
        },
        commits: { totalCount: 5, nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }] },
        mergeable: "MERGEABLE",
        baseRefName: "main",
        headRefName: "feat/payment-module",
        isDraft: false,
        labels: { nodes: [{ name: "feature", color: "a2eeef" }] },
        reviewThreads: { nodes: [{ isResolved: false }] },
        additions: 65,
        deletions: 20,
        changedFiles: 4,
      },
    ],
  },
};

describe("parseMyPRs", () => {
  it("parses GraphQL response into MyPR array", () => {
    const result = parseMyPRs(MOCK_MY_PRS_RESPONSE.search.nodes);
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
      baseRef: "develop",
      headRef: "fix/login-bug",
      labels: [{ name: "bug", color: "d73a4a" }],
      unresolvedThreads: 2,
      additions: 42,
      deletions: 8,
      changedFiles: 5,
      isDraft: false,
      mergeable: "mergeable",
      commitCount: 3,
    });

    expect(result[1].reviewStatus).toBe("pending");
    expect(result[1].ciStatus).toBeNull();
    expect(result[1].isDraft).toBe(true);
    expect(result[1].mergeable).toBe("conflicting");
    expect(result[1].unresolvedThreads).toBe(0);
    expect(result[1].labels).toEqual([]);
  });
});

describe("parseReviewRequestedPRs", () => {
  it("parses with pending status and previous review info", () => {
    const result = parseReviewRequestedPRs(MOCK_REVIEW_REQUESTED_RESPONSE.search.nodes, "me", true);
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
      reviews: [
        { author: "kim", state: "approved", submittedAt: "2026-03-26T05:00:00Z" },
        { author: "lee", state: "commented", submittedAt: "2026-03-26T04:00:00Z" },
      ],
      baseRef: "main",
      headRef: "feat/payment-module",
      labels: [{ name: "feature", color: "a2eeef" }],
      unresolvedThreads: 1,
      additions: 65,
      deletions: 20,
      changedFiles: 4,
      isDraft: false,
      mergeable: "mergeable",
      ciStatus: "success",
      commitCount: 5,
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
          commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
          mergeable: "UNKNOWN",
          baseRefName: "develop",
          isDraft: false,
          labels: { nodes: [] },
          reviewThreads: { nodes: [] },
          additions: 0,
          deletions: 0,
          changedFiles: 0,
        }],
      },
    };
    const result = parseReviewRequestedPRs(response.search.nodes, "me", true);
    expect(result[0].myReviewStatus).toBe("pending");
    expect(result[0].previousReviewStatus).toBeNull();
    expect(result[0].ciStatus).toBeNull();
    expect(result[0].mergeable).toBe("unknown");
  });

  it("returns actual review status when forcePending is false", () => {
    const result = parseReviewRequestedPRs(MOCK_REVIEW_REQUESTED_RESPONSE.search.nodes, "me", false);
    expect(result).toHaveLength(1);
    expect(result[0].myReviewStatus).toBe("approved");
    expect(result[0].previousReviewStatus).toBeNull();
  });
});
