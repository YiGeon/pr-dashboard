import { writable, derived } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { load } from "@tauri-apps/plugin-store";
import { initClient, clearClient, fetchUsername } from "../github/client";

export const token = writable<string | null>(null);
export const username = writable<string | null>(null);
export const isAuthenticated = derived(token, ($token) => $token !== null);
export const isLoggingIn = writable(false);

const STORE_KEY = "github_token";

export async function restoreSession() {
  const store = await load("settings.json");
  const saved = await store.get<string>(STORE_KEY);
  if (saved) {
    initClient(saved);
    try {
      const name = await fetchUsername();
      token.set(saved);
      username.set(name);
    } catch {
      await store.set(STORE_KEY, null);
      await store.save();
      clearClient();
    }
  }
}

export async function startLogin() {
  isLoggingIn.set(true);

  const unlisten = await listen<string>("oauth-token", async (event) => {
    const accessToken = event.payload;
    initClient(accessToken);
    const name = await fetchUsername();

    const store = await load("settings.json");
    await store.set(STORE_KEY, accessToken);
    await store.save();

    token.set(accessToken);
    username.set(name);
    isLoggingIn.set(false);
    unlisten();
  });

  const authUrl: string = await invoke("start_oauth");
  await open(authUrl);
}

export async function logout() {
  const store = await load("settings.json");
  await store.set(STORE_KEY, null);
  await store.save();

  clearClient();
  token.set(null);
  username.set(null);
}
