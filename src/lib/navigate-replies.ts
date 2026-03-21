/**
 * Handles navigation to tweet detail page and loading of reply elements.
 * Supports both feed view (requires SPA navigation) and detail page (direct access).
 */

import { extractTweetId, extractTweetUrl } from '@/lib/scrape-tweet';
import { getReplyElements, getTimestamp } from '@/lib/selectors';

const REPLY_WAIT_MS = 2000;
const NAV_TIMEOUT_MS = 5000;
const POST_NAV_DELAY_MS = 500;
const BACK_NAV_TIMEOUT_MS = 3000;
const MAX_SCROLL_ATTEMPTS = 3;
const SCROLL_WAIT_MS = 1500;
const EXPAND_WAIT_MS = 1000;

/**
 * Checks if current page is the given tweet's detail page.
 */
function isOnTweetDetailPage(tweetUrl: string): boolean {
  try {
    return window.location.pathname === new URL(tweetUrl).pathname;
  } catch {
    return false;
  }
}

/**
 * Observes DOM mutations and resolves when check() returns a truthy value, or null on timeout.
 */
function waitForDOM<T>(
  check: () => T | null,
  timeoutMs: number,
): Promise<T | null> {
  return new Promise((resolve) => {
    const result = check();
    if (result) {
      resolve(result);
      return;
    }

    let done = false;
    const finish = (val: T | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve(val);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    const observer = new MutationObserver(() => {
      const r = check();
      if (r) finish(r);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/**
 * Polls for URL pathname to match the expected value within NAV_TIMEOUT_MS.
 */
function waitForUrl(expected: string): Promise<boolean> {
  if (window.location.pathname === expected) return Promise.resolve(true);

  return new Promise((resolve) => {
    let done = false;
    const finish = (val: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(poll);
      resolve(val);
    };
    const timer = setTimeout(() => finish(false), NAV_TIMEOUT_MS);
    const poll = setInterval(() => {
      if (window.location.pathname === expected) finish(true);
    }, 100);
  });
}

/**
 * Returns reply tweet articles from the detail page.
 * Identifies replies as articles appearing after the main tweet in DOM order.
 */
function collectReplies(mainTweetId: string): HTMLElement[] {
  const articles = getReplyElements(document);
  if (articles.length <= 1) return [];

  // Find the main tweet by matching its status ID
  let mainIdx = -1;
  for (let i = 0; i < articles.length; i++) {
    const url = extractTweetUrl(articles[i]);
    const id = url ? extractTweetId(url) : '';
    if (id === mainTweetId) {
      mainIdx = i;
      break;
    }
  }

  // Everything after the main tweet article is a reply
  return mainIdx >= 0 ? articles.slice(mainIdx + 1) : [];
}

/**
 * Clicks "Show more replies" / "Show additional replies" expansion buttons.
 * Skips "Show offensive replies" gated sections (does not click through).
 * Returns true if any button was clicked.
 */
async function expandShowMoreReplies(): Promise<boolean> {
  let clicked = false;

  const candidates = document.querySelectorAll<HTMLElement>(
    'div[role="button"], span[role="button"]',
  );

  for (const el of candidates) {
    const text = (el.textContent ?? '').toLowerCase();

    // Skip offensive content gates
    if (text.includes('offensive') || text.includes('potentially sensitive'))
      continue;

    // Click "show more replies" type buttons
    if (
      text.includes('show more repl') ||
      text.includes('show additional repl') ||
      text.includes('show replies')
    ) {
      el.click();
      clicked = true;
      await new Promise((r) => setTimeout(r, EXPAND_WAIT_MS));
    }
  }

  return clicked;
}

/**
 * Scrolls to the bottom of the page to trigger lazy loading of more replies.
 * Returns true if the page height increased (new content loaded).
 */
async function scrollForMore(): Promise<boolean> {
  const prevHeight = document.documentElement.scrollHeight;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise((r) => setTimeout(r, SCROLL_WAIT_MS));
  return document.documentElement.scrollHeight > prevHeight;
}

export interface LoadRepliesResult {
  /** Reply DOM elements found on the detail page. */
  replies: HTMLElement[];
  /** Whether SPA navigation occurred (caller should restore state). */
  navigated: boolean;
  /** Scroll position before navigation, for restoration. */
  originalScrollY: number;
}

/**
 * Navigates to a tweet's detail page (if needed) and waits for reply elements to load.
 *
 * - If already on the tweet's detail page, waits for replies directly.
 * - If on feed view, clicks the tweet's permalink to trigger SPA navigation, then waits.
 * - Implements one automatic retry if no replies found within the initial 2-second timeout.
 * - Returns empty array for tweets with no replies (no errors thrown).
 * - Checks the optional AbortSignal at each async step for early termination.
 *
 * @param tweetEl - The tweet's article DOM element (used for permalink click navigation)
 * @param tweetUrl - Canonical tweet URL (e.g., https://x.com/user/status/123)
 * @param desiredCount - Target number of replies to load (triggers scroll/expand if needed)
 * @param signal - Optional AbortSignal to cancel long-running reply loading
 */
export async function loadReplies(
  tweetEl: HTMLElement,
  tweetUrl: string,
  desiredCount: number = 5,
  signal?: AbortSignal,
): Promise<LoadRepliesResult> {
  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) {
    return { replies: [], navigated: false, originalScrollY: 0 };
  }

  const originalScrollY = window.scrollY;
  const onDetailPage = isOnTweetDetailPage(tweetUrl);

  // Navigate to detail page if not already there
  if (!onDetailPage) {
    // Find the tweet's timestamp permalink for reliable SPA navigation
    const timeEl = getTimestamp(tweetEl);
    const link =
      timeEl?.closest<HTMLAnchorElement>('a[href*="/status/"]') ??
      tweetEl.querySelector<HTMLAnchorElement>('a[href*="/status/"]');

    if (!link) {
      return { replies: [], navigated: false, originalScrollY };
    }

    link.click();

    let pathname: string;
    try {
      pathname = new URL(tweetUrl).pathname;
    } catch {
      return { replies: [], navigated: true, originalScrollY };
    }

    const reached = await waitForUrl(pathname);
    if (!reached || signal?.aborted) {
      return { replies: [], navigated: true, originalScrollY };
    }

    // Allow DOM to render after SPA navigation
    await new Promise((r) => setTimeout(r, POST_NAV_DELAY_MS));
  }

  if (signal?.aborted) {
    return { replies: [], navigated: !onDetailPage, originalScrollY };
  }

  // Check for reply elements
  const checker = () => {
    const found = collectReplies(tweetId);
    return found.length > 0 ? found : null;
  };

  // Attempt 1: wait up to 2 seconds
  let replies = await waitForDOM(checker, REPLY_WAIT_MS);

  // One automatic retry if no replies found on first attempt
  if (!replies && !signal?.aborted) {
    replies = await waitForDOM(checker, REPLY_WAIT_MS);
  }

  // Try to expand "Show more replies" sections if not enough
  let replyList = replies ?? [];
  if (replyList.length < desiredCount && !signal?.aborted) {
    const expanded = await expandShowMoreReplies();
    if (expanded) {
      replyList = collectReplies(tweetId);
    }
  }

  // Scroll to load more replies if still not enough (up to 3 attempts)
  let scrollAttempts = 0;
  while (
    replyList.length < desiredCount &&
    scrollAttempts < MAX_SCROLL_ATTEMPTS &&
    !signal?.aborted
  ) {
    const prevCount = replyList.length;
    const grew = await scrollForMore();
    replyList = collectReplies(tweetId);

    // Expand "Show more" buttons only if still short
    if (replyList.length < desiredCount) {
      await expandShowMoreReplies();
      replyList = collectReplies(tweetId);
    }

    // Stop if no new replies loaded and page didn't grow
    if (replyList.length <= prevCount && !grew) break;
    scrollAttempts++;
  }

  return {
    replies: replyList,
    navigated: !onDetailPage,
    originalScrollY,
  };
}

/**
 * Restores the previous page state after reply scraping.
 * Navigates back via browser history and restores scroll position.
 * No-op if no navigation occurred.
 */
export async function restorePageState(
  navigated: boolean,
  originalScrollY: number,
): Promise<void> {
  if (!navigated) return;

  window.history.back();

  await new Promise<void>((resolve) => {
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('popstate', onPop);
      requestAnimationFrame(() => {
        window.scrollTo(0, originalScrollY);
        resolve();
      });
    };

    const onPop = () => cleanup();
    window.addEventListener('popstate', onPop);

    // Fallback timeout in case popstate doesn't fire
    setTimeout(cleanup, BACK_NAV_TIMEOUT_MS);
  });
}
