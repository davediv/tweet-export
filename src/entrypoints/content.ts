import { injectExportButton } from '@/lib/inject-button';
import { observeTweets } from '@/lib/tweet-observer';

export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  main() {
    console.log('TweetExport content script loaded.');

    observeTweets((tweetEl) => {
      injectExportButton(tweetEl, (_tweet, _button) => {
        // Placeholder: export orchestration will be wired in FEAT-P2-013
        console.debug('[TweetExport] Export clicked');
      });
    });
  },
});
