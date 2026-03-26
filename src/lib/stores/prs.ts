import { writable, derived, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
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

export const pendingReviewCount = derived(
  reviewRequestedPRs,
  ($prs) => $prs.filter((pr) => pr.myReviewStatus === "pending").length
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

    // 메뉴바 뱃지 업데이트
    const pending = reviewData.filter((pr) => pr.myReviewStatus === "pending").length;
    const title = pending > 0 ? `${pending}` : "";
    invoke("update_tray_title", { title }).catch(() => {});
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
