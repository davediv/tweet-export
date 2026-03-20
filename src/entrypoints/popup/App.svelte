<script lang="ts">
  const version = browser.runtime.getManifest().version;
</script>

<main class="w-80 p-4">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
      TweetExport Settings
    </h1>
    <span class="text-xs text-gray-500 dark:text-gray-400">v{version}</span>
  </div>
  <p class="text-sm text-gray-600 dark:text-gray-300">
    Export tweets and top comments as structured JSON.
  </p>
</main>
