import { writable } from "svelte/store";
import type { MyPR, ReviewRequestedPR, SortKey } from "../types";
import { reviewStatusPriority } from "../utils";

export const selectedOrgs = writable<string[]>([]);
export const searchQuery = writable("");
export const sortKey = writable<SortKey>("updatedAt");

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

export function applySorting<T extends Filterable>(items: T[], key: SortKey): T[] {
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
