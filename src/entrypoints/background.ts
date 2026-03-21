import { extractErrorMessage } from '@/lib/errors';
import type {
  DownloadJsonResponse,
  ExtensionMessage,
  GetSettingsResponse,
  SettingsUpdatedMessage,
} from '@/lib/messages';
import { getSettings, onSettingsChange } from '@/lib/storage';

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
    return {
      success: false,
      error: extractErrorMessage(err, 'Download failed'),
    };
  }
}

/**
 * Handles a settings request from a content script.
 * Reads current settings from chrome.storage.sync and returns them.
 */
async function handleGetSettings(): Promise<GetSettingsResponse> {
  try {
    const settings = await getSettings();
    return { success: true, settings };
  } catch (err) {
    return {
      success: false,
      error: extractErrorMessage(err, 'Failed to read settings'),
    };
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
          return true;
        }

        if (message.type === 'getSettings') {
          handleGetSettings().then(sendResponse);
          return true;
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
