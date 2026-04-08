export type ReviewState = "approved" | "changes_requested" | "commented" | "pending";

export type CIStatus = "success" | "failure" | "pending" | null;

export interface Label {
  name: string;
  color: string;
}

export type MergeableState = "mergeable" | "conflicting" | "unknown";

export interface Review {
  author: string;
  state: ReviewState;
  submittedAt: string;
  reRequested: boolean;
}

export interface MyPR {
  id: string;
  title: string;
  url: string;
  repo: string;
  org: string;
  state: "open" | "closed" | "merged";
  createdAt: string;
  updatedAt: string;
  reviews: Review[];
  reviewStatus: ReviewState;
  ciStatus: CIStatus;
  baseRef: string;
  headRef: string;
  labels: Label[];
  unresolvedThreads: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  isDraft: boolean;
  mergeable: MergeableState;
  commitCount: number;
}

export interface ReviewRequestedPR {
  id: string;
  title: string;
  url: string;
  repo: string;
  org: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  myReviewStatus: ReviewState;
  previousReviewStatus: ReviewState | null;
  reviews: Review[];
  baseRef: string;
  headRef: string;
  labels: Label[];
  unresolvedThreads: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  isDraft: boolean;
  mergeable: MergeableState;
  ciStatus: CIStatus;
  commitCount: number;
}

export type SortKey = "updatedAt" | "createdAt" | "reviewStatus";

export interface Settings {
  pollingIntervalMinutes: number;
  notifyOnNewReview: boolean;
  notifyOnReviewRequest: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  pollingIntervalMinutes: 1,
  notifyOnNewReview: true,
  notifyOnReviewRequest: true,
};

export interface AppNotification {
  id: string;
  prId: string;
  type: "new_review" | "review_request";
  prTitle: string;
  prUrl: string;
  actor: string;
  reviewState?: ReviewState;
  read: boolean;
  createdAt: string;
}
