/**
 * Triggers a JSON file download via the background service worker.
 * Uses message passing since chrome.downloads API is only available in background context.
 */

import type { DownloadJsonMessage, DownloadJsonResponse } from '@/lib/messages';

/**
 * Sends JSON data to the background worker for download via chrome.downloads API.
 *
 * @param tweetId - Tweet ID used to generate filename: `tweet-{tweetId}-export.json`
 * @param json - Serialized JSON string to download
 * @throws Error if the background worker fails to trigger the download
 */
export async function downloadTweetJson(
  tweetId: string,
  json: string,
): Promise<void> {
  const message: DownloadJsonMessage = {
    type: 'downloadJson',
    filename: `tweet-${tweetId}-export.json`,
    json,
  };

  const response = (await browser.runtime.sendMessage(
    message,
  )) as DownloadJsonResponse;

  if (!response?.success) {
    throw new Error(response?.error ?? 'Download failed');
  }
}
