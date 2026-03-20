import { onSettingsChange } from '@/lib/storage';

export default defineBackground({
  main() {
    console.log('TweetExport background service worker started.', {
      id: browser.runtime.id,
    });

    // Broadcast settings changes to all active content scripts
    onSettingsChange(async (newSettings) => {
      const tabs = await browser.tabs.query({
        url: ['*://x.com/*', '*://twitter.com/*'],
      });
      for (const tab of tabs) {
        if (tab.id != null) {
          browser.tabs
            .sendMessage(tab.id, {
              type: 'settingsUpdated',
              settings: newSettings,
            })
            .catch(() => {
              // Tab may not have content script loaded yet — ignore
            });
        }
      }
    });
  },
});
