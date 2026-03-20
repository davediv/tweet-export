/**
 * Content script entry point: injects export buttons into tweets and orchestrates
 * the scrape → navigate → download export pipeline.
 */

import { assembleExportData, serializeExport } from '@/lib/assemble-export';
import { downloadTweetJson } from '@/lib/download';
import {
  getButtonState,
  injectExportButton,
  setButtonState,
} from '@/lib/inject-button';
import { loadReplies, restorePageState } from '@/lib/navigate-replies';
import { scrapeTopComments } from '@/lib/scrape-comments';
import { scrapeTweet } from '@/lib/scrape-tweet';
import { getSettings, onSettingsChange, type Settings } from '@/lib/storage';
import { observeTweets } from '@/lib/tweet-observer';

let exportInProgress = false;

export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  async main() {
    let settings: Settings = await getSettings();
    onSettingsChange((newSettings) => {
      settings = newSettings;
    });

    observeTweets((tweetEl) => {
      injectExportButton(tweetEl, async (clickedTweetEl, button) => {
        if (exportInProgress || getButtonState(button) === 'loading') return;

        exportInProgress = true;
        setButtonState(button, 'loading');

        try {
          const tweetData = scrapeTweet(clickedTweetEl);
          if (!tweetData) {
            throw new Error('Failed to extract tweet data');
          }

          const { replies, navigated, originalScrollY } = await loadReplies(
            clickedTweetEl,
            tweetData.url,
            settings.topCommentCount,
          );

          const comments = scrapeTopComments(replies, settings.topCommentCount);

          await restorePageState(navigated, originalScrollY);

          const exportData = assembleExportData(
            tweetData,
            comments,
            settings.topCommentCount,
          );
          const json = serializeExport(exportData);

          await downloadTweetJson(tweetData.id, json);

          setButtonState(button, 'success');
        } catch (error) {
          console.error('[TweetExport] Export failed:', error);
          setButtonState(button, 'error');
        } finally {
          exportInProgress = false;
        }
      });
    });
  },
});
