import { writable, get } from "svelte/store";

export type Priority = "high" | "medium" | "low" | null;

export interface PRNote {
  memo: string;
  priority: Priority;
}

const STORAGE_KEY = "pr-notes";

function loadFromStorage(): Record<string, PRNote> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(notes: Record<string, PRNote>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export const prNotes = writable<Record<string, PRNote>>(loadFromStorage());

prNotes.subscribe(saveToStorage);

export function setNote(prId: string, memo: string, priority: Priority) {
  prNotes.update((notes) => {
    if (!memo && !priority) {
      const { [prId]: _, ...rest } = notes;
      return rest;
    }
    return { ...notes, [prId]: { memo, priority } };
  });
}

export function getNote(prId: string): PRNote | null {
  return get(prNotes)[prId] ?? null;
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: "#f85149",
  medium: "#d29922",
  low: "#3fb950",
};

export const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};
