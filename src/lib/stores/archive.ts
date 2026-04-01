import { writable } from "svelte/store";

const STORAGE_KEY = "pr-archive";

function loadFromStorage(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveToStorage(ids: Set<string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export const archivedIds = writable<Set<string>>(loadFromStorage());

let initialized = false;
archivedIds.subscribe((ids) => {
  if (!initialized) { initialized = true; return; }
  saveToStorage(ids);
});

export function archivePR(prId: string) {
  archivedIds.update((ids) => {
    const next = new Set(ids);
    next.add(prId);
    return next;
  });
}

export function unarchivePR(prId: string) {
  archivedIds.update((ids) => {
    const next = new Set(ids);
    next.delete(prId);
    return next;
  });
}
