import type {
  DownloadJsonResponse,
  ExtensionMessage,
  SettingsUpdatedMessage,
} from '@/lib/messages';
import { onSettingsChange } from '@/lib/storage';

/**
 * Handles a download request from the content script.
 * Encodes JSON as a base64 data URL and triggers chrome.downloads.
 * Uses data URL because URL.createObjectURL is unavailable in MV3 service workers.
 */
async function handleDownload(
  filename: string,
  json: string,
): Promise<DownloadJsonResponse> {
  try {
    const base64 = btoa(unescape(encodeURIComponent(json)));
    const dataUrl = `data:application/json;base64,${base64}`;
    await browser.downloads.download({ url: dataUrl, filename, saveAs: false });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed';
    return { success: false, error: message };
  }
}

export default defineBackground({
  main() {
    console.log('TweetExport background service worker started.', {
      id: browser.runtime.id,
    });

    // Handle messages from content scripts
    browser.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        if (message.type === 'downloadJson') {
          handleDownload(message.filename, message.json).then(sendResponse);
          return true; // Keep message channel open for async response
        }
      },
    );

    // Broadcast settings changes to all active content scripts
    onSettingsChange(async (newSettings) => {
      const tabs = await browser.tabs.query({
        url: ['*://x.com/*', '*://twitter.com/*'],
      });
      for (const tab of tabs) {
        if (tab.id != null) {
          const msg: SettingsUpdatedMessage = {
            type: 'settingsUpdated',
            settings: newSettings,
          };
          browser.tabs.sendMessage(tab.id, msg).catch(() => {
            // Tab may not have content script loaded yet — ignore
          });
        }
      }
    });
  },
});
