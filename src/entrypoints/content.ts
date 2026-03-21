/**
 * Content script entry point: injects export buttons into tweets and orchestrates
 * the scrape → navigate → download export pipeline.
 */

import '@/assets/tailwind.css';
import { mount, unmount } from 'svelte';
import ToastContainer from '@/components/ToastContainer.svelte';
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
import { showToast } from '@/lib/toast.svelte';
import { observeTweets } from '@/lib/tweet-observer';

let exportInProgress = false;

export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    // Initialize toast notification UI inside Shadow DOM
    const toastUi = await createShadowRootUi(ctx, {
      name: 'tweetexport-toasts',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        return mount(ToastContainer, { target: container });
      },
      onRemove: (app) => {
        if (app) unmount(app);
      },
    });
    toastUi.mount();

    let settings: Settings = await getSettings();
    const stopSettings = onSettingsChange((newSettings) => {
      settings = newSettings;
    });

    const stopObserving = observeTweets((tweetEl) => {
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

          const partialMsg =
            comments.length < settings.topCommentCount && comments.length > 0
              ? ` (only ${comments.length} comments found)`
              : '';
          showToast('success', `Exported successfully!${partialMsg}`);
        } catch (error) {
          console.error('[TweetExport] Export failed:', error);
          setButtonState(button, 'error');
          showToast('error', 'Export failed. Try again.', {
            onRetry: () => {
              if (button.isConnected) {
                button.click();
              } else {
                showToast(
                  'error',
                  'Tweet no longer visible. Please try again manually.',
                );
              }
            },
          });
        } finally {
          exportInProgress = false;
        }
      });
    });

    ctx.onInvalidated(() => {
      stopSettings();
      stopObserving();
    });
  },
});
