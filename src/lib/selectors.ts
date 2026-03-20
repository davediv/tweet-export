/**
 * Centralized selector abstraction layer for X/Twitter DOM elements.
 * Uses data-testid attributes as primary selectors with structural fallbacks.
 */

// --- Selector definitions (primary + fallback) ---

interface SelectorDef {
  primary: string;
  fallback: string;
}

const SELECTORS = {
  tweet: {
    primary: 'article[data-testid="tweet"]',
    fallback: 'article[role="article"]',
  },
  tweetText: {
    primary: '[data-testid="tweetText"]',
    fallback: 'div[lang]',
  },
  userName: {
    primary: '[data-testid="User-Name"]',
    fallback: 'div[class*="UserName"]',
  },
  timestamp: {
    primary: 'time[datetime]',
    fallback: 'a time',
  },
  tweetPhoto: {
    primary: '[data-testid="tweetPhoto"] img',
    fallback: 'div[aria-label] img[src*="pbs.twimg.com"]',
  },
  videoPlayer: {
    primary: '[data-testid="videoPlayer"]',
    fallback: 'div[data-testid="videoComponent"]',
  },
  actionBar: {
    primary: 'div[role="group"]',
    fallback: 'div[role="group"][aria-label]',
  },
  quoteTweet: {
    primary: '[data-testid="quoteTweet"]',
    fallback: '[data-testid="quoteTweet"]',
  },
} as const satisfies Record<string, SelectorDef>;

// --- Query helpers ---

function query<T extends Element>(
  root: Element | Document,
  def: SelectorDef,
): T | null {
  return (
    root.querySelector<T>(def.primary) ??
    root.querySelector<T>(def.fallback) ??
    null
  );
}

function queryAll<T extends Element>(
  root: Element | Document,
  def: SelectorDef,
): T[] {
  const result = root.querySelectorAll<T>(def.primary);
  if (result.length > 0) return Array.from(result);
  return Array.from(root.querySelectorAll<T>(def.fallback));
}

// --- Public selector functions ---

/**
 * Returns the tweet article element.
 * Useful for finding a tweet from an inner element.
 */
export function getTweetElement(root: Element | Document): HTMLElement | null {
  return query<HTMLElement>(root, SELECTORS.tweet);
}

/**
 * Extracts author display name and handle from a tweet element.
 */
export function getAuthorInfo(
  tweetEl: HTMLElement,
): { displayName: string; handle: string } | null {
  const userNameEl = query<HTMLElement>(tweetEl, SELECTORS.userName);
  if (!userNameEl) return null;

  // Display name: first text-containing span in the User-Name container
  const displayNameEl = userNameEl.querySelector<HTMLElement>(
    'a[role="link"] span:not([class*="css-"])',
  );
  // Handle: a link whose text starts with @
  const links =
    userNameEl.querySelectorAll<HTMLAnchorElement>('a[role="link"]');
  let handle = '';
  for (const link of links) {
    const text = link.textContent?.trim() ?? '';
    if (text.startsWith('@')) {
      handle = text;
      break;
    }
  }

  // Fallback: extract handle from link href
  if (!handle) {
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      const match = href.match(/^\/([A-Za-z0-9_]+)$/);
      if (match) {
        handle = `@${match[1]}`;
        break;
      }
    }
  }

  const displayName =
    displayNameEl?.textContent?.trim() ?? links[0]?.textContent?.trim() ?? null;

  if (!displayName) return null;

  return { displayName, handle };
}

/**
 * Extracts the tweet text element from a tweet.
 * Returns the element so callers can extract text with formatting preserved.
 */
export function getTweetText(tweetEl: HTMLElement): HTMLElement | null {
  return query<HTMLElement>(tweetEl, SELECTORS.tweetText);
}

/**
 * Extracts the timestamp element from a tweet.
 */
export function getTimestamp(tweetEl: HTMLElement): HTMLTimeElement | null {
  return query<HTMLTimeElement>(tweetEl, SELECTORS.timestamp);
}

/**
 * Returns all image elements within a tweet's media section.
 */
export function getMediaUrls(tweetEl: HTMLElement): HTMLImageElement[] {
  return queryAll<HTMLImageElement>(tweetEl, SELECTORS.tweetPhoto);
}

/**
 * Returns the action bar element (reply, retweet, like, share row).
 * Filters out action bars inside quote tweets to return only the main tweet's bar.
 */
export function getActionBar(tweetEl: HTMLElement): HTMLElement | null {
  const groups = queryAll<HTMLElement>(tweetEl, SELECTORS.actionBar);
  // Prefer action bars not inside a quote tweet
  const mainBar = groups.filter(
    (g) => !g.closest(SELECTORS.quoteTweet.primary),
  );
  return mainBar.length > 0 ? mainBar[mainBar.length - 1] : null;
}

/**
 * Returns tweet article elements from the current page.
 * On a detail page, these include both the main tweet and replies.
 */
export function getReplyElements(
  root: Element | Document = document,
): HTMLElement[] {
  return queryAll<HTMLElement>(root, SELECTORS.tweet);
}

/**
 * Returns the quote tweet container element within a tweet.
 */
export function getQuoteTweet(tweetEl: HTMLElement): HTMLElement | null {
  return query<HTMLElement>(tweetEl, SELECTORS.quoteTweet);
}

/**
 * Returns the raw selector string for a given logical name.
 * Useful for MutationObserver match checks.
 */
export function getSelector(name: keyof typeof SELECTORS): string {
  return SELECTORS[name].primary;
}
