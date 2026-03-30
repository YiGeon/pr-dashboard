<script lang="ts">
  import "../app.css";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>PR Dashboard</title>
</svelte:head>

{@render children()}
