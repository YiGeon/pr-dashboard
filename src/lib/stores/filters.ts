import { writable, derived, type Readable } from "svelte/store";
import type { MyPR, ReviewRequestedPR, SortKey } from "../types";
import { reviewStatusPriority } from "../utils";

export const selectedOrgs = writable<string[]>([]);
export const searchQuery = writable("");
export const sortKey = writable<SortKey>("updatedAt");

export type TabKey = "my-prs" | "review-requests" | "approved";
export const activeTab = writable<TabKey>("review-requests");
export const focusedIndex = writable<number>(-1);
function loadGroupByRepo(): boolean {
  if (typeof localStorage === "undefined") return false;
  try { return localStorage.getItem("pr-group-by-repo") === "true"; } catch { return false; }
}
export const groupByRepo = writable<boolean>(loadGroupByRepo());
let groupInitialized = false;
groupByRepo.subscribe((v) => {
  if (!groupInitialized) { groupInitialized = true; return; }
  if (typeof localStorage !== "undefined") localStorage.setItem("pr-group-by-repo", String(v));
});

type Filterable = MyPR | ReviewRequestedPR;

export function applyFilters<T extends Filterable>(items: T[], orgs: string[], query: string): T[] {
  let result = items;

  if (orgs.length > 0) {
    result = result.filter((item) => orgs.includes(item.org));
  }

  if (query.trim()) {
    const lower = query.toLowerCase();
    result = result.filter((item) => item.title.toLowerCase().includes(lower));
  }

  return result;
}

export function makeFilteredStore<T extends Filterable>(source: Readable<T[]>) {
  return derived(
    [source, selectedOrgs, searchQuery, sortKey],
    ([$items, $orgs, $query, $sortKey]) => applySorting(applyFilters($items, $orgs, $query), $sortKey)
  );
}

export function applySorting<T extends Filterable>(items: T[], key: SortKey): T[] {
  if (items.length < 2) return items;
  const sorted = [...items];

  switch (key) {
    case "updatedAt":
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case "createdAt":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "reviewStatus": {
      sorted.sort((a, b) => {
        const statusA = "reviewStatus" in a ? a.reviewStatus : (a as ReviewRequestedPR).myReviewStatus;
        const statusB = "reviewStatus" in b ? b.reviewStatus : (b as ReviewRequestedPR).myReviewStatus;
        return reviewStatusPriority(statusA) - reviewStatusPriority(statusB);
      });
      break;
    }
  }

  return sorted;
}

export const highlightedPRId = writable<string | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

export function setHighlightedPRId(prId: string) {
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightedPRId.set(prId);
  highlightTimer = setTimeout(() => {
    highlightedPRId.set(null);
    highlightTimer = null;
  }, 3000);
}
