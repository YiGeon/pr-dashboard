<script lang="ts">
  import { onMount } from "svelte";
  import { isAuthenticated, restoreSession, handleOAuthCallback } from "$lib/stores/auth";
  import { fetchUsername } from "$lib/github/client";
  import { username } from "$lib/stores/auth";
  import Login from "$lib/components/Login.svelte";
  import Dashboard from "$lib/components/Dashboard.svelte";

  let ready = $state(false);

  onMount(async () => {
    // Handle OAuth callback token from URL
    const params = new URLSearchParams(window.location.search);
    const tokenFromCallback = params.get("token");
    if (tokenFromCallback) {
      handleOAuthCallback(tokenFromCallback);
      const name = await fetchUsername();
      username.set(name);
      window.history.replaceState({}, "", "/");
      // Request notification permission right after login (user gesture context)
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    await restoreSession();
    ready = true;
  });
</script>

{#if !ready}
  <div class="splash">Loading...</div>
{:else if $isAuthenticated}
  <Dashboard />
{:else}
  <Login />
{/if}

<style>
  .splash {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0d1117;
    color: #8b949e;
    font-size: 0.9rem;
  }
</style>
