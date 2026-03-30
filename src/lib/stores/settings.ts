import { writable, get } from "svelte/store";
import { type Settings, DEFAULT_SETTINGS } from "../types";

export const settings = writable<Settings>({ ...DEFAULT_SETTINGS });

const STORAGE_KEY = "app_settings";

export async function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw) as Partial<Settings>;
      settings.set({ ...DEFAULT_SETTINGS, ...saved });
    } catch {
      // ignore corrupted data
    }
  }
}

export async function updateSettings(partial: Partial<Settings>) {
  settings.update((current) => ({ ...current, ...partial }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(get(settings)));
}
