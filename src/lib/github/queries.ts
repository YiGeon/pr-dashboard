import type { MyPR, ReviewRequestedPR, Review, ReviewState, CIStatus } from "../types";
import { computeReviewStatus } from "../utils";

export const MY_PRS_QUERY = `
  query($searchQuery: String!) {
    search(query: $searchQuery, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          id
          title
          url
          repository { nameWithOwner owner { login } }
          createdAt
          updatedAt
          reviews(last: 20) {
            nodes { author { login } state submittedAt }
          }
          commits(last: 1) {
            nodes { commit { statusCheckRollup { state } } }
          }
        }
      }
    }
  }
`;

export const REVIEW_REQUESTED_QUERY = `
  query($searchQuery: String!) {
    search(query: $searchQuery, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          id
          title
          url
          repository { nameWithOwner owner { login } }
          author { login }
          createdAt
          updatedAt
          reviews(last: 20) {
            nodes { author { login } state submittedAt }
          }
        }
      }
    }
  }
`;

function normalizeReviewState(state: string): ReviewState {
  const map: Record<string, ReviewState> = {
    APPROVED: "approved",
    CHANGES_REQUESTED: "changes_requested",
    COMMENTED: "commented",
    PENDING: "pending",
    DISMISSED: "commented",
  };
  return map[state] ?? "pending";
}

function normalizeCIStatus(rollup: { state: string } | null): CIStatus {
  if (!rollup) return null;
  const map: Record<string, CIStatus> = {
    SUCCESS: "success",
    FAILURE: "failure",
    ERROR: "failure",
    EXPECTED: "pending",
    PENDING: "pending",
  };
  return map[rollup.state] ?? "pending";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMyPRs(data: any): MyPR[] {
  return data.search.nodes
    .filter((node: any) => node.id)
    .map((node: any) => {
      const reviews: Review[] = (node.reviews?.nodes ?? []).map((r: any) => ({
        author: r.author?.login ?? "unknown",
        state: normalizeReviewState(r.state),
        submittedAt: r.submittedAt,
      }));

      const rawReviews = (node.reviews?.nodes ?? []).map((r: any) => ({
        author: r.author?.login ?? "unknown",
        state: r.state,
        submittedAt: r.submittedAt,
      }));

      const commitNode = node.commits?.nodes?.[0]?.commit;
      const ciStatus = normalizeCIStatus(commitNode?.statusCheckRollup ?? null);

      return {
        id: node.id,
        title: node.title,
        url: node.url,
        repo: node.repository.nameWithOwner,
        org: node.repository.owner.login,
        state: "open" as const,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        reviews,
        reviewStatus: computeReviewStatus(rawReviews),
        ciStatus,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseReviewRequestedPRs(data: any, username: string): ReviewRequestedPR[] {
  return data.search.nodes
    .filter((node: any) => node.id)
    .map((node: any) => {
      const myReviews = (node.reviews?.nodes ?? [])
        .filter((r: any) => r.author?.login === username)
        .map((r: any) => ({
          state: r.state,
          submittedAt: r.submittedAt,
        }));

      const myLatest = myReviews.sort(
        (a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      )[0];

      return {
        id: node.id,
        title: node.title,
        url: node.url,
        repo: node.repository.nameWithOwner,
        org: node.repository.owner.login,
        author: node.author?.login ?? "unknown",
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        myReviewStatus: "pending" as ReviewState,
        previousReviewStatus: myLatest ? normalizeReviewState(myLatest.state) : null,
      };
    });
}
