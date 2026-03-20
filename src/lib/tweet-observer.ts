/**
 * MutationObserver-based tweet detection for X/Twitter.
 * Handles dynamic content loading, SPA navigation, and virtual scrolling.
 */

import { getSelector } from '@/lib/selectors';

const TWEET_SELECTOR = getSelector('tweet');
const PROCESSED_ATTR = 'data-tweetexport';

/** Guard against multiple `observeTweets` calls patching history twice. */
let activeObserver = false;

export type TweetCallback = (tweetElement: HTMLElement) => void;

/**
 * Scans a root element for unprocessed tweet articles and invokes the callback.
 * Also checks the root itself if it's a matching HTMLElement.
 */
function processTweets(
  root: Element | Document,
  onTweetFound: TweetCallback,
): void {
  // Check the root element itself (handles MutationObserver addedNodes that are tweets)
  if (
    root instanceof HTMLElement &&
    root.matches(TWEET_SELECTOR) &&
    !root.hasAttribute(PROCESSED_ATTR)
  ) {
    root.setAttribute(PROCESSED_ATTR, '');
    onTweetFound(root);
  }
  const tweets = root.querySelectorAll<HTMLElement>(TWEET_SELECTOR);
  for (const tweet of tweets) {
    if (tweet.hasAttribute(PROCESSED_ATTR)) continue;
    tweet.setAttribute(PROCESSED_ATTR, '');
    onTweetFound(tweet);
  }
}

/**
 * Observes the DOM for tweet elements and invokes `onTweetFound` for each new tweet.
 *
 * - Detects tweets in feed view, detail pages, and search results.
 * - Handles X's SPA navigation by monitoring URL changes.
 * - Handles virtual scrolling — recycled DOM elements are re-processed.
 * - Each tweet DOM element is processed exactly once (tracked via data attribute).
 *
 * Returns a cleanup function that disconnects all observers.
 */
export function observeTweets(onTweetFound: TweetCallback): () => void {
  if (activeObserver) {
    console.warn(
      '[TweetExport] observeTweets already active — ignoring duplicate call',
    );
    return () => {};
  }
  activeObserver = true;

  // --- Main DOM observer: catches dynamically added tweets ---
  const domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        processTweets(node, onTweetFound);
      }
    }
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // --- SPA navigation handler: re-scans on route changes ---
  let lastUrl = location.href;

  function handleNavigation(): void {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    // Wait one frame for X to render new content after navigation
    requestAnimationFrame(() => processTweets(document, onTweetFound));
  }

  // History API navigation (pushState/replaceState used by X's SPA router)
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPushState(...args);
    handleNavigation();
  };

  history.replaceState = function (...args) {
    origReplaceState(...args);
    handleNavigation();
  };

  window.addEventListener('popstate', handleNavigation);

  // --- Initial scan: process tweets already in the DOM ---
  processTweets(document, onTweetFound);

  // --- Cleanup ---
  return () => {
    activeObserver = false;
    domObserver.disconnect();
    history.pushState = origPushState;
    history.replaceState = origReplaceState;
    window.removeEventListener('popstate', handleNavigation);
  };
}
