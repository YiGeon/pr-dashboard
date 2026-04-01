<script lang="ts">
  import { organizations } from "$lib/stores/prs";
  import { selectedOrgs, searchQuery, sortKey, groupByRepo } from "$lib/stores/filters";
  import type { SortKey } from "$lib/types";

  let orgDropdownOpen = $state(false);

  function toggleOrg(org: string) {
    selectedOrgs.update((current) => {
      if (current.includes(org)) {
        return current.filter((o) => o !== org);
      }
      return [...current, org];
    });
  }

  function handleSortChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    sortKey.set(target.value as SortKey);
  }

  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    searchQuery.set(target.value);
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".org-filter")) {
      orgDropdownOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="filter-bar">
  <div class="org-filter">
    <button class="filter-btn" onclick={() => (orgDropdownOpen = !orgDropdownOpen)}>
      {$selectedOrgs.length === 0 ? "All Orgs" : `${$selectedOrgs.length} selected`} ▾
    </button>
    {#if orgDropdownOpen}
      <div class="dropdown">
        {#each $organizations as org}
          <label class="dropdown-item">
            <input
              type="checkbox"
              checked={$selectedOrgs.includes(org)}
              onchange={() => toggleOrg(org)}
            />
            {org}
          </label>
        {/each}
        {#if $organizations.length === 0}
          <span class="dropdown-empty">No organizations</span>
        {/if}
      </div>
    {/if}
  </div>

  <select class="sort-select" value={$sortKey} onchange={handleSortChange}>
    <option value="updatedAt">Updated</option>
    <option value="createdAt">Created</option>
    <option value="reviewStatus">Review Status</option>
  </select>

  <button
    class="filter-btn"
    class:active={$groupByRepo}
    onclick={() => groupByRepo.update(v => !v)}
    title="레포별 그룹핑"
  >
    {$groupByRepo ? "▤ Grouped" : "▤ Flat"}
  </button>

  <input
    type="text"
    class="search-input"
    placeholder="Search PRs..."
    value={$searchQuery}
    oninput={handleSearchInput}
  />
</div>

<style>
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: #0d1117;
    border-bottom: 1px solid #21262d;
  }

  .org-filter {
    position: relative;
  }

  .filter-btn, .sort-select {
    background: #161b22;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .filter-btn:hover, .sort-select:hover {
    border-color: #484f58;
  }

  .filter-btn.active {
    background: #1f6feb;
    border-color: #1f6feb;
    color: #fff;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 0.5rem;
    z-index: 10;
    min-width: 180px;
    margin-top: 0.25rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    color: #c9d1d9;
    font-size: 0.875rem;
    cursor: pointer;
    border-radius: 4px;
  }

  .dropdown-item:hover {
    background: #21262d;
  }

  .dropdown-empty {
    color: #8b949e;
    font-size: 0.875rem;
    padding: 0.375rem 0.5rem;
  }

  .search-input {
    background: #161b22;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
    flex: 1;
    max-width: 480px;
    min-width: 0;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .search-input:focus {
    outline: none;
    border-color: #58a6ff;
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.15);
  }

  .search-input::placeholder {
    color: #8b949e;
  }
</style>
