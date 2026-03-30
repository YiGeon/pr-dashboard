<script lang="ts">
  import { startLogin, isLoggingIn } from "$lib/stores/auth";
</script>

<div class="login-container">
  <div class="login-card">
    <h1>PR Dashboard</h1>
    <p class="subtitle">GitHub PR을 한 곳에서 관리하세요</p>
    <button
      class="login-btn"
      onclick={startLogin}
      disabled={$isLoggingIn}
    >
      {#if $isLoggingIn}
        Connecting...
      {:else}
        Sign in with GitHub
      {/if}
    </button>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0d1117;
  }

  .login-card {
    text-align: center;
    padding: 3rem;
  }

  h1 {
    font-size: 1.8rem;
    color: #e6edf3;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #8b949e;
    margin-bottom: 2rem;
  }

  .login-btn {
    background: #238636;
    color: #fff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .login-btn:hover:not(:disabled) {
    background: #2ea043;
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
