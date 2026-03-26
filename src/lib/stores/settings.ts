import { writable, get } from "svelte/store";
import { load } from "@tauri-apps/plugin-store";
import { type Settings, DEFAULT_SETTINGS } from "../types";

export const settings = writable<Settings>({ ...DEFAULT_SETTINGS });

const STORE_KEY = "app_settings";

export async function loadSettings() {
  const store = await load("settings.json");
  const saved = await store.get<Settings>(STORE_KEY);
  if (saved) {
    settings.set({ ...DEFAULT_SETTINGS, ...saved });
  }
}

export async function updateSettings(partial: Partial<Settings>) {
  settings.update((current) => ({ ...current, ...partial }));
  const store = await load("settings.json");
  await store.set(STORE_KEY, get(settings));
  await store.save();
}
