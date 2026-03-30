import { writable, derived } from "svelte/store";
import { initClient, clearClient, fetchUsername } from "../github/client";

export const token = writable<string | null>(null);
export const username = writable<string | null>(null);
export const isAuthenticated = derived(token, ($token) => $token !== null);
export const isLoggingIn = writable(false);

const STORAGE_KEY = "github_token";

export async function restoreSession() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    initClient(saved);
    try {
      const name = await fetchUsername();
      token.set(saved);
      username.set(name);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      clearClient();
    }
  }
}

export function handleOAuthCallback(accessToken: string) {
  localStorage.setItem(STORAGE_KEY, accessToken);
  initClient(accessToken);
  token.set(accessToken);
  isLoggingIn.set(false);
}

export async function startLogin() {
  isLoggingIn.set(true);
  window.location.href = "/api/auth/login";
}

export async function logout() {
  localStorage.removeItem(STORAGE_KEY);
  clearClient();
  token.set(null);
  username.set(null);
}
