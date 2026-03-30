import { writable, derived, get } from "svelte/store";
import { fetchMyPRs, fetchReviewRequestedPRs, fetchOrganizations } from "../github/client";
import type { MyPR, ReviewRequestedPR } from "../types";
import { settings } from "./settings";
import { selectedOrgs, searchQuery, sortKey } from "./filters";
import { applyFilters, applySorting } from "./filters";
import { checkAndNotify } from "../notifications";

export const myPRs = writable<MyPR[]>([]);
export const reviewRequestedPRs = writable<ReviewRequestedPR[]>([]);
export const organizations = writable<string[]>([]);
export const isLoading = writable(false);
export const lastFetchedAt = writable<string | null>(null);
export const lastUpdateCount = writable<number | null>(null);

export const pendingReviewCount = derived(
  reviewRequestedPRs,
  ($prs) => $prs.length
);

export const urgentMyPRCount = derived(
  myPRs,
  ($prs) => $prs.filter((pr) => pr.mergeable === "conflicting").length
);

export const filteredMyPRs = derived(
  [myPRs, selectedOrgs, searchQuery, sortKey],
  ([$myPRs, $orgs, $query, $sortKey]) => {
    const filtered = applyFilters($myPRs, $orgs, $query);
    return applySorting(filtered, $sortKey);
  }
);

export const filteredReviewRequestedPRs = derived(
  [reviewRequestedPRs, selectedOrgs, searchQuery, sortKey],
  ([$prs, $orgs, $query, $sortKey]) => {
    const filtered = applyFilters($prs, $orgs, $query);
    return applySorting(filtered, $sortKey);
  }
);

let pollingTimer: ReturnType<typeof setInterval> | null = null;

export async function fetchAll() {
  isLoading.set(true);
  try {
    const [myPRData, reviewData, orgs] = await Promise.all([
      fetchMyPRs(),
      fetchReviewRequestedPRs(),
      fetchOrganizations(),
    ]);

    const prevMyPRs = get(myPRs);
    const prevReviewPRs = get(reviewRequestedPRs);

    myPRs.set(myPRData);
    reviewRequestedPRs.set(reviewData);
    organizations.set(orgs);
    lastFetchedAt.set(new Date().toISOString());

    await checkAndNotify(prevMyPRs, myPRData, prevReviewPRs, reviewData);

    const prevIds = new Set([...prevMyPRs.map(p => p.id), ...prevReviewPRs.map(p => p.id)]);
    const currIds = new Set([...myPRData.map(p => p.id), ...reviewData.map(p => p.id)]);
    const changed = [...currIds].filter(id => !prevIds.has(id)).length +
                    [...prevIds].filter(id => !currIds.has(id)).length;
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
