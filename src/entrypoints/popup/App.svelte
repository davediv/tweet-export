<script lang="ts">
  const version = browser.runtime.getManifest().version;
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

  <!-- Settings placeholder -->
  <p class="text-sm text-gray-500 dark:text-gray-400">
    Configure your export preferences below.
  </p>
</main>
