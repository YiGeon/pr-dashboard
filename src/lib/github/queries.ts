import type { MyPR, ReviewRequestedPR, Review, ReviewState, CIStatus, MergeableState, Label } from "../types";
import { computeReviewStatus } from "../utils";

export const MY_PRS_QUERY = `
  query($searchQuery: String!, $after: String) {
    search(query: $searchQuery, type: ISSUE, first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
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
            totalCount
            nodes { commit { statusCheckRollup { state } } }
          }
          mergeable
          baseRefName
          headRefName
          isDraft
          labels(first: 10) {
            nodes { name color }
          }
          reviewThreads(first: 50) {
            nodes { isResolved }
          }
          additions
          deletions
          changedFiles
        }
      }
    }
  }
`;

export const REVIEW_REQUESTED_QUERY = `
  query($searchQuery: String!, $after: String) {
    search(query: $searchQuery, type: ISSUE, first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
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
          commits(last: 1) {
            totalCount
            nodes { commit { statusCheckRollup { state } } }
          }
          mergeable
          baseRefName
          headRefName
          isDraft
          labels(first: 10) {
            nodes { name color }
          }
          reviewThreads(first: 50) {
            nodes { isResolved }
          }
          additions
          deletions
          changedFiles
        }
      }
    }
  }
`;

export const PR_DETAIL_QUERY = `
  query($nodeId: ID!) {
    node(id: $nodeId) {
      ... on PullRequest {
        commits(last: 10) {
          nodes {
            commit {
              oid
              messageHeadline
              author { name date }
            }
          }
        }
        comments(last: 15) {
          nodes {
            author { login }
            body
            createdAt
          }
        }
        reviewThreads(first: 20) {
          nodes {
            isResolved
            comments(first: 3) {
              nodes {
                author { login }
                body
                createdAt
                path
              }
            }
          }
        }
      }
    }
  }
`;

export interface PRDetailCommit {
  oid: string;
  message: string;
  author: string;
  date: string;
}

export interface PRDetailComment {
  author: string;
  body: string;
  createdAt: string;
  path?: string;
  isReviewThread: boolean;
  isResolved: boolean;
}

export interface PRDetail {
  commits: PRDetailCommit[];
  comments: PRDetailComment[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePRDetail(data: any): PRDetail {
  const node = data.node;
  const commits: PRDetailCommit[] = (node.commits?.nodes ?? []).map((n: any) => ({
    oid: n.commit.oid.slice(0, 7),
    message: n.commit.messageHeadline,
    author: n.commit.author?.name ?? "unknown",
    date: n.commit.author?.date ?? "",
  })).reverse();

  const issueComments: PRDetailComment[] = (node.comments?.nodes ?? []).map((c: any) => ({
    author: c.author?.login ?? "unknown",
    body: c.body?.slice(0, 200) ?? "",
    createdAt: c.createdAt,
    isReviewThread: false,
    isResolved: false,
  }));

  const threadComments: PRDetailComment[] = (node.reviewThreads?.nodes ?? []).flatMap((t: any) =>
    (t.comments?.nodes ?? []).map((c: any) => ({
      author: c.author?.login ?? "unknown",
      body: c.body?.slice(0, 200) ?? "",
      createdAt: c.createdAt,
      path: c.path,
      isReviewThread: true,
      isResolved: t.isResolved,
    }))
  );

  const allComments = [...issueComments, ...threadComments];
  const timestamps = new Map(allComments.map((c) => [c, new Date(c.createdAt).getTime()]));
  const comments = allComments
    .sort((a, b) => timestamps.get(b)! - timestamps.get(a)!)
    .slice(0, 15);

  return { commits, comments };
}

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

function normalizeMergeableState(state: string | null): MergeableState {
  const map: Record<string, MergeableState> = {
    MERGEABLE: "mergeable",
    CONFLICTING: "conflicting",
    UNKNOWN: "unknown",
  };
  return map[state ?? ""] ?? "unknown";
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
export function parseMyPRs(nodes: any[]): MyPR[] {
  return nodes
    .filter((node: any) => node.id)
    .map((node: any) => {
      const rawNodes = node.reviews?.nodes ?? [];
      const mapped = rawNodes.map((r: any) => ({
        author: r.author?.login ?? "unknown",
        state: r.state as string,
        submittedAt: r.submittedAt as string,
      }));
      const latestByAuthor = new Map<string, Review>();
      for (const r of mapped) {
        const review: Review = { ...r, state: normalizeReviewState(r.state) };
        latestByAuthor.set(r.author, review);
      }
      const reviews: Review[] = [...latestByAuthor.values()];

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
        reviewStatus: computeReviewStatus(mapped),
        ciStatus,
        baseRef: node.baseRefName ?? "main",
        headRef: node.headRefName ?? "",
        labels: (node.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
        unresolvedThreads: (node.reviewThreads?.nodes ?? []).filter((t: any) => !t.isResolved).length,
        additions: node.additions ?? 0,
        deletions: node.deletions ?? 0,
        changedFiles: node.changedFiles ?? 0,
        isDraft: node.isDraft ?? false,
        mergeable: normalizeMergeableState(node.mergeable),
        commitCount: node.commits?.totalCount ?? 0,
      };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseReviewRequestedPRs(nodes: any[], username: string, forcePending: boolean = true): ReviewRequestedPR[] {
  return nodes
    .filter((node: any) => node.id)
    .map((node: any) => {
      const rawNodes = node.reviews?.nodes ?? [];
      const myReviews = rawNodes
        .filter((r: any) => r.author?.login === username)
        .map((r: any) => ({
          state: r.state,
          submittedAt: r.submittedAt,
        }));

      const myLatest = myReviews.sort(
        (a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      )[0];

      const otherReviews: Review[] = rawNodes
        .filter((r: any) => r.author?.login && r.author.login !== username)
        .map((r: any) => ({
          author: r.author.login,
          state: normalizeReviewState(r.state),
          submittedAt: r.submittedAt,
        }));

      const latestByAuthor = new Map<string, Review>();
      for (const r of otherReviews) {
        const existing = latestByAuthor.get(r.author);
        if (!existing || r.submittedAt > existing.submittedAt) {
          latestByAuthor.set(r.author, r);
        }
      }

      const commitNode = node.commits?.nodes?.[0]?.commit;
      const ciStatus = normalizeCIStatus(commitNode?.statusCheckRollup ?? null);

      const myLatestState = myLatest ? normalizeReviewState(myLatest.state) : null;

      return {
        id: node.id,
        title: node.title,
        url: node.url,
        repo: node.repository.nameWithOwner,
        org: node.repository.owner.login,
        author: node.author?.login ?? "unknown",
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        myReviewStatus: forcePending ? ("pending" as ReviewState) : (myLatestState ?? ("pending" as ReviewState)),
        previousReviewStatus: forcePending ? myLatestState : null,
        reviews: [...latestByAuthor.values()],
        baseRef: node.baseRefName ?? "main",
        headRef: node.headRefName ?? "",
        labels: (node.labels?.nodes ?? []).map((l: any) => ({ name: l.name, color: l.color })),
        unresolvedThreads: (node.reviewThreads?.nodes ?? []).filter((t: any) => !t.isResolved).length,
        additions: node.additions ?? 0,
        deletions: node.deletions ?? 0,
        changedFiles: node.changedFiles ?? 0,
        isDraft: node.isDraft ?? false,
        mergeable: normalizeMergeableState(node.mergeable),
        ciStatus,
        commitCount: node.commits?.totalCount ?? 0,
      };
    });
}
