import { writable } from "svelte/store";

const STORAGE_KEY = "pr-archive";

function loadFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveToStorage(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export const archivedIds = writable<Set<string>>(loadFromStorage());

archivedIds.subscribe(saveToStorage);

export function archivePR(prId: string) {
  archivedIds.update((ids) => new Set([...ids, prId]));
}

export function unarchivePR(prId: string) {
  archivedIds.update((ids) => {
    const next = new Set(ids);
    next.delete(prId);
    return next;
  });
}
