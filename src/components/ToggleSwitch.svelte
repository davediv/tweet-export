<script lang="ts">
  let {
    id,
    label,
    checked,
    loading = false,
    onToggle,
  }: {
    id: string;
    label: string;
    checked: boolean;
    loading?: boolean;
    onToggle: () => void;
  } = $props();
</script>

<div class="mt-4 flex items-center justify-between">
  <label
    id="{id}Label"
    class="text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    {label}
  </label>
  {#if loading}
    <div
      class="w-9 h-5 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse"
    ></div>
  {:else}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby="{id}Label"
      onclick={onToggle}
      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 outline-none {checked
        ? 'bg-blue-500'
        : 'bg-gray-300 dark:bg-gray-600'}"
    >
      <span
        aria-hidden="true"
        class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform {checked
          ? 'translate-x-4'
          : 'translate-x-0'}"
      ></span>
    </button>
  {/if}
</div>
