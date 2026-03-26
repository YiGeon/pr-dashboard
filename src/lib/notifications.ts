import { get } from "svelte/store";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { MyPR, ReviewRequestedPR } from "./types";
import { settings } from "./stores/settings";

export interface NewReviewEvent {
  prTitle: string;
  prUrl: string;
  reviewer: string;
  state: string;
}

export interface NewReviewRequestEvent {
  prTitle: string;
  prUrl: string;
  author: string;
}

export function detectNewReviews(prev: MyPR[], curr: MyPR[]): NewReviewEvent[] {
  const events: NewReviewEvent[] = [];
  const prevMap = new Map(prev.map((pr) => [pr.id, pr]));

  for (const pr of curr) {
    const prevPR = prevMap.get(pr.id);
    if (!prevPR) continue;

    const prevReviewKeys = new Set(
      prevPR.reviews.map((r) => `${r.author}:${r.submittedAt}`)
    );

    for (const review of pr.reviews) {
      const key = `${review.author}:${review.submittedAt}`;
      if (!prevReviewKeys.has(key)) {
        events.push({
          prTitle: pr.title,
          prUrl: pr.url,
          reviewer: review.author,
          state: review.state,
        });
      }
    }
  }

  return events;
}

export function detectNewReviewRequests(
  prev: ReviewRequestedPR[],
  curr: ReviewRequestedPR[]
): NewReviewRequestEvent[] {
  const prevIds = new Set(prev.map((pr) => pr.id));
  return curr
    .filter((pr) => !prevIds.has(pr.id))
    .map((pr) => ({
      prTitle: pr.title,
      prUrl: pr.url,
      author: pr.author,
    }));
}

export async function checkAndNotify(
  prevMyPRs: MyPR[],
  currMyPRs: MyPR[],
  prevReviewPRs: ReviewRequestedPR[],
  currReviewPRs: ReviewRequestedPR[]
) {
  if (prevMyPRs.length === 0 && prevReviewPRs.length === 0) return;

  const $settings = get(settings);
  let permitted = await isPermissionGranted();
  if (!permitted) {
    const result = await requestPermission();
    permitted = result === "granted";
  }
  if (!permitted) return;

  if ($settings.notifyOnNewReview) {
    const newReviews = detectNewReviews(prevMyPRs, currMyPRs);
    for (const event of newReviews) {
      sendNotification({
        title: `New review: ${event.prTitle}`,
        body: `${event.reviewer} — ${event.state}`,
      });
    }
  }

  if ($settings.notifyOnReviewRequest) {
    const newRequests = detectNewReviewRequests(prevReviewPRs, currReviewPRs);
    for (const event of newRequests) {
      sendNotification({
        title: `Review requested: ${event.prTitle}`,
        body: `from ${event.author}`,
      });
    }
  }
}
