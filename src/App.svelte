<script lang="ts">
  import { onMount } from "svelte";
  import { isAuthenticated, restoreSession } from "./lib/stores/auth";
  import Login from "./components/Login.svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import "./app.css";

  let ready = $state(false);

  onMount(async () => {
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
