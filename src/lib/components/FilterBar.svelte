<script lang="ts">
  import { organizations } from "$lib/stores/prs";
  import { selectedOrgs, searchQuery, sortKey } from "$lib/stores/filters";
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
</script>

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
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #30363d;
  }

  .org-filter {
    position: relative;
  }

  .filter-btn, .sort-select {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 0.5rem;
    z-index: 10;
    min-width: 160px;
    margin-top: 0.25rem;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    color: #c9d1d9;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .dropdown-empty {
    color: #8b949e;
    font-size: 0.8rem;
  }

  .search-input {
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    flex: 1;
    min-width: 0;
  }

  .search-input::placeholder {
    color: #484f58;
  }
</style>
