import { writable, derived, get } from "svelte/store";
import { fetchMyPRs, fetchReviewRequestedPRs, fetchApprovedPRs, fetchOrganizations } from "../github/client";
import type { MyPR, ReviewRequestedPR } from "../types";
import { settings } from "./settings";
import { makeFilteredStore } from "./filters";
import { checkAndNotify } from "../notifications";

export const myPRs = writable<MyPR[]>([]);
export const reviewRequestedPRs = writable<ReviewRequestedPR[]>([]);
export const approvedPRs = writable<ReviewRequestedPR[]>([]);
export const organizations = writable<string[]>([]);
export const isLoading = writable(false);
export const lastFetchedAt = writable<string | null>(null);
export const lastUpdateCount = writable<number | null>(null);

export const urgentMyPRCount = derived(
  myPRs,
  ($prs) => $prs.filter((pr) => pr.mergeable === "conflicting").length
);

export const filteredMyPRs = makeFilteredStore(myPRs);
export const filteredReviewRequestedPRs = makeFilteredStore(reviewRequestedPRs);
export const filteredApprovedPRs = makeFilteredStore(approvedPRs);

let pollingTimer: ReturnType<typeof setInterval> | null = null;

export async function fetchAll() {
  isLoading.set(true);
  try {
    const [myPRData, reviewData, orgs] = await Promise.all([
      fetchMyPRs(),
      fetchReviewRequestedPRs(),
      fetchOrganizations(),
    ]);

    const allApproved = await fetchApprovedPRs();
    const reviewRequestedIds = new Set(reviewData.map((pr) => pr.id));
    const approvedData = allApproved.filter((pr) => !reviewRequestedIds.has(pr.id));

    const prevMyPRs = get(myPRs);
    const prevReviewPRs = get(reviewRequestedPRs);
    const prevApproved = get(approvedPRs);

    myPRs.set(myPRData);
    reviewRequestedPRs.set(reviewData);
    approvedPRs.set(approvedData);
    organizations.set(orgs);
    lastFetchedAt.set(new Date().toISOString());

    await checkAndNotify(prevMyPRs, myPRData, prevReviewPRs, reviewData);

    const prevIds = new Set([...prevMyPRs.map(p => p.id), ...prevReviewPRs.map(p => p.id), ...prevApproved.map(p => p.id)]);
    const currIds = new Set([...myPRData.map(p => p.id), ...reviewData.map(p => p.id), ...approvedData.map(p => p.id)]);
    let changed = 0;
    for (const id of currIds) if (!prevIds.has(id)) changed++;
    for (const id of prevIds) if (!currIds.has(id)) changed++;
    lastUpdateCount.set(changed > 0 ? changed : null);
  } catch (err) {
    console.error("Failed to fetch PRs:", err);
  } finally {
    isLoading.set(false);
  }
}

export function startPolling() {
  stopPolling();
  fetchAll();

  const unsubscribe = settings.subscribe(($settings) => {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(fetchAll, $settings.pollingIntervalMinutes * 60 * 1000);
  });

  return () => {
    unsubscribe();
    stopPolling();
  };
}

export function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}
