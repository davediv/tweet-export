/**
 * Content script entry point: injects export buttons into tweets and orchestrates
 * the scrape → navigate → download export pipeline with graceful error handling.
 */

import '@/assets/tailwind.css';
import { mount, unmount } from 'svelte';
import ToastContainer from '@/components/ToastContainer.svelte';
import { assembleExportData, serializeExport } from '@/lib/assemble-export';
import { downloadTweetJson } from '@/lib/download';
import {
  DomStructureError,
  ExportError,
  ExportTimeoutError,
  ReplyLoadError,
} from '@/lib/errors';
import {
  getButtonState,
  injectExportButton,
  setButtonState,
} from '@/lib/inject-button';
import { loadReplies, restorePageState } from '@/lib/navigate-replies';
import { scrapeTopComments } from '@/lib/scrape-comments';
import { scrapeTweet } from '@/lib/scrape-tweet';
import type { ExtensionMessage } from '@/lib/messages';
import { requestSettings, type Settings } from '@/lib/storage';
import { clearAllToasts, showToast } from '@/lib/toast.svelte';
import { observeTweets } from '@/lib/tweet-observer';

const EXPORT_TIMEOUT_MS = 10000;

let exportInProgress = false;

/**
 * Returns a user-friendly error message based on the error type.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof ExportError) return error.userMessage;
  return 'Export failed. Try again.';
}

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

    // Request initial settings from background service worker
    let settings: Settings = await requestSettings();

    // Listen for settings broadcasts from background service worker
    const onMessage = (message: ExtensionMessage) => {
      if (message.type === 'settingsUpdated') {
        settings = message.settings;
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    const stopObserving = observeTweets((tweetEl) => {
      injectExportButton(tweetEl, async (clickedTweetEl, button) => {
        if (exportInProgress || getButtonState(button) === 'loading') return;

        exportInProgress = true;
        setButtonState(button, 'loading');

        // AbortController for cancelling work after timeout
        const abort = new AbortController();
        // Track navigation state for cleanup on both success and failure
        let navigated = false;
        let originalScrollY = 0;
        let restored = false;
        let previewShown = false;

        const safeRestore = async () => {
          if (navigated && !restored) {
            restored = true;
            try {
              await restorePageState(true, originalScrollY);
            } catch {
              // Best-effort — don't mask the original error
            }
          }
        };

        // Set up the timeout to abort the pipeline
        const timer = setTimeout(() => abort.abort(), EXPORT_TIMEOUT_MS);

        try {
          const tweetData = scrapeTweet(clickedTweetEl);
          if (!tweetData) throw new DomStructureError();

          // Attempt reply loading with one automatic retry on failure
          let loadResult: Awaited<ReturnType<typeof loadReplies>>;
          try {
            loadResult = await loadReplies(
              clickedTweetEl,
              tweetData.url,
              settings.topCommentCount,
              abort.signal,
            );
          } catch {
            try {
              loadResult = await loadReplies(
                clickedTweetEl,
                tweetData.url,
                settings.topCommentCount,
                abort.signal,
              );
            } catch (retryError) {
              throw new ReplyLoadError(
                retryError instanceof Error ? retryError.message : undefined,
              );
            }
          }

          navigated = loadResult.navigated;
          originalScrollY = loadResult.originalScrollY;

          const comments = scrapeTopComments(
            loadResult.replies,
            settings.topCommentCount,
          );

          await safeRestore();

          const exportData = assembleExportData(
            tweetData,
            comments,
            settings.topCommentCount,
          );
          const json = serializeExport(exportData);

          const shouldCopyToClipboard = settings.copyToClipboard;
          const performDownload = async () => {
            await downloadTweetJson(tweetData.id, json);

            let copiedToClipboard = false;
            if (shouldCopyToClipboard) {
              try {
                await navigator.clipboard.writeText(json);
                copiedToClipboard = true;
              } catch {
                showToast('info', 'Could not copy to clipboard.');
              }
            }

            setButtonState(button, 'success');

            const partialMsg =
              comments.length < settings.topCommentCount && comments.length > 0
                ? ` (only ${comments.length} comments found)`
                : '';
            const clipboardMsg = copiedToClipboard
              ? 'Exported and copied to clipboard!'
              : 'Exported successfully!';
            showToast('success', `${clipboardMsg}${partialMsg}`);
          };

          // Check abort before side-effecting download
          if (abort.signal.aborted)
            throw new ExportTimeoutError(EXPORT_TIMEOUT_MS);

          if (settings.showExportPreview) {
            // Show preview toast and wait for user decision
            previewShown = true;
            setButtonState(button, 'default');

            const authorDisplay = `${tweetData.author.display_name} (@${tweetData.author.handle})`;
            showToast('preview', '', {
              preview: {
                author: authorDisplay,
                text: tweetData.text,
                commentCount: comments.length,
              },
              onConfirm: () => {
                if (!button.isConnected) {
                  exportInProgress = false;
                  return;
                }
                performDownload()
                  .catch((err) => {
                    console.error('[TweetExport] Download failed:', err);
                    if (button.isConnected) setButtonState(button, 'error');
                    showToast('error', getErrorMessage(err));
                  })
                  .finally(() => {
                    exportInProgress = false;
                  });
              },
              onCancel: () => {
                exportInProgress = false;
                showToast('info', 'Export cancelled.');
              },
            });
          } else {
            await performDownload();
          }
        } catch (error) {
          // Restore page state if we navigated away during the pipeline
          await safeRestore();

          console.error('[TweetExport] Export failed:', error);
          setButtonState(button, 'error');
          showToast('error', getErrorMessage(error), {
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
          clearTimeout(timer);
          if (!previewShown) exportInProgress = false;
        }
      });
    });

    ctx.onInvalidated(() => {
      clearAllToasts();
      browser.runtime.onMessage.removeListener(onMessage);
      stopObserving();
    });
  },
});
