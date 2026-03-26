<script lang="ts">
  import { settings, updateSettings } from "../lib/stores/settings";
  import { username, logout } from "../lib/stores/auth";
  import { updateTrayBadge } from "../lib/stores/prs";

  let { onclose }: { onclose: () => void } = $props();

  function handlePollingChange(e: Event) {
    const value = Number((e.target as HTMLSelectElement).value);
    updateSettings({ pollingIntervalMinutes: value });
  }

  function handleCloseActionChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value === "tray";
    updateSettings({ closeToTray: value });
  }

  async function handleLogout() {
    await logout();
  }
</script>

<div class="settings">
  <div class="settings-header">
    <h2>Settings</h2>
    <button class="close-btn" onclick={onclose}>✕</button>
  </div>

  <div class="settings-body">
    <section class="setting-group">
      <h3>Account</h3>
      <div class="setting-row">
        <span class="setting-label">Logged in as</span>
        <span class="setting-value">{$username}</span>
      </div>
      <button class="logout-btn" onclick={handleLogout}>Sign out</button>
    </section>

    <section class="setting-group">
      <h3>Polling</h3>
      <div class="setting-row">
        <label for="polling-interval">Refresh interval</label>
        <select id="polling-interval" value={$settings.pollingIntervalMinutes} onchange={handlePollingChange}>
          <option value={1}>1 min</option>
          <option value={3}>3 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
        </select>
      </div>
    </section>

    <section class="setting-group">
      <h3>Notifications</h3>
      <div class="setting-row">
        <label for="notify-review">New reviews</label>
        <input
          id="notify-review"
          type="checkbox"
          checked={$settings.notifyOnNewReview}
          onchange={() => updateSettings({ notifyOnNewReview: !$settings.notifyOnNewReview })}
        />
      </div>
      <div class="setting-row">
        <label for="notify-request">Review requests</label>
        <input
          id="notify-request"
          type="checkbox"
          checked={$settings.notifyOnReviewRequest}
          onchange={() => updateSettings({ notifyOnReviewRequest: !$settings.notifyOnReviewRequest })}
        />
      </div>
    </section>

    <section class="setting-group">
      <h3>Behavior</h3>
      <div class="setting-row">
        <label for="autostart">Launch at startup</label>
        <input
          id="autostart"
          type="checkbox"
          checked={$settings.autoStart}
          onchange={() => updateSettings({ autoStart: !$settings.autoStart })}
        />
      </div>
      <div class="setting-row">
        <label for="close-action">On close</label>
        <select id="close-action" value={$settings.closeToTray ? "tray" : "quit"} onchange={handleCloseActionChange}>
          <option value="tray">Minimize to tray</option>
          <option value="quit">Quit</option>
        </select>
      </div>
      <div class="setting-row">
        <label for="tray-count">Show count in tray</label>
        <input
          id="tray-count"
          type="checkbox"
          checked={$settings.trayShowCount}
          onchange={() => { updateSettings({ trayShowCount: !$settings.trayShowCount }); updateTrayBadge(); }}
        />
      </div>
    </section>
  </div>
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #30363d;
  }

  .settings-header h2 {
    font-size: 0.9rem;
    color: #e6edf3;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #8b949e;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
  }

  .settings-body {
    padding: 1rem;
  }

  .setting-group {
    margin-bottom: 1.5rem;
  }

  .setting-group h3 {
    font-size: 0.8rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    font-size: 0.85rem;
  }

  .setting-label {
    color: #c9d1d9;
  }

  .setting-value {
    color: #58a6ff;
    font-weight: 600;
  }

  select, input[type="checkbox"] {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  .logout-btn {
    background: #da3633;
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .logout-btn:hover {
    background: #f85149;
  }
</style>
