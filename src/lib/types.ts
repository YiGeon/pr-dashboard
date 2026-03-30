export type ReviewState = "approved" | "changes_requested" | "commented" | "pending";

export type CIStatus = "success" | "failure" | "pending" | null;

export interface Review {
  author: string;
  state: ReviewState;
  submittedAt: string;
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
}

export type SortKey = "updatedAt" | "createdAt" | "reviewStatus";

export interface Settings {
  pollingIntervalMinutes: number;
  notifyOnNewReview: boolean;
  notifyOnReviewRequest: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  pollingIntervalMinutes: 5,
  notifyOnNewReview: true,
  notifyOnReviewRequest: true,
};

export interface AppNotification {
  id: string;
  type: "new_review" | "review_request";
  prTitle: string;
  prUrl: string;
  actor: string;
  reviewState?: ReviewState;
  read: boolean;
  createdAt: string;
}
