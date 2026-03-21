<script lang="ts">
  import {
    DEFAULT_SETTINGS,
    MAX_COMMENT_COUNT,
    MIN_COMMENT_COUNT,
    getSettings,
    saveSettings,
  } from '@/lib/storage';

  const version = browser.runtime.getManifest().version;

  let topCommentCount = $state(DEFAULT_SETTINGS.topCommentCount);
  let loading = $state(true);

  async function loadSettings() {
    const settings = await getSettings();
    topCommentCount = settings.topCommentCount;
    loading = false;
  }

  function handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    let value = Math.round(Number(input.value));

    if (Number.isNaN(value) || value < MIN_COMMENT_COUNT)
      value = MIN_COMMENT_COUNT;
    if (value > MAX_COMMENT_COUNT) value = MAX_COMMENT_COUNT;

    topCommentCount = value;
    input.value = String(value);
    saveSettings({ topCommentCount: value });
  }

  loadSettings();
</script>

<main class="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <svg
        class="w-5 h-5 text-blue-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"
        />
        <path
          d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
        />
      </svg>
      <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        TweetExport Settings
      </h1>
    </div>
    <span
      class="text-xs font-medium text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full"
    >
      v{version}
    </span>
  </div>

  <!-- Divider -->
  <hr class="border-gray-200 dark:border-gray-700 mb-4" />

  <!-- Top comments count setting -->
  <div class="space-y-2">
    <label
      for="topCommentCount"
      class="block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      Number of top comments to export
    </label>
    {#if loading}
      <div class="h-9 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
    {:else}
      <input
        id="topCommentCount"
        type="number"
        min={MIN_COMMENT_COUNT}
        max={MAX_COMMENT_COUNT}
        value={topCommentCount}
        onchange={handleChange}
        class="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
      />
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Between {MIN_COMMENT_COUNT} and {MAX_COMMENT_COUNT} comments per export
      </p>
    {/if}
  </div>
</main>
