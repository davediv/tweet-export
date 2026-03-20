import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'TweetExport',
    permissions: ['storage', 'downloads', 'activeTab'],
    host_permissions: ['*://x.com/*', '*://twitter.com/*'],
  },
});
