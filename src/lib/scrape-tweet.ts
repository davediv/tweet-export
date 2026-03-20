/**
 * Extracts structured tweet data from a tweet DOM element.
 */

import { extractQuoteTweetMedia, extractTweetMedia } from '@/lib/scrape-media';
import { getAuthorInfo, getTimestamp, getTweetText } from '@/lib/selectors';

export interface TweetAuthor {
  display_name: string;
  handle: string;
}

export interface QuoteTweetData {
  text: string;
  author: TweetAuthor;
  images: string[];
}

export interface PollData {
  options: string[];
}

export interface TweetData {
  id: string;
  url: string;
  author: TweetAuthor;
  text: string;
  timestamp: string;
  images: string[];
  quote_tweet?: QuoteTweetData;
  poll?: PollData;
}

/**
 * Extracts the tweet URL from the timestamp's parent link.
 * X wraps the timestamp in an <a> linking to the tweet's permalink.
 */
function extractTweetUrl(tweetEl: HTMLElement): string | null {
  // The timestamp link contains the canonical tweet URL
  const timeEl = getTimestamp(tweetEl);
  const link = timeEl?.closest<HTMLAnchorElement>('a[href*="/status/"]');
  if (link) {
    const href = link.getAttribute('href') ?? '';
    // Normalize to absolute URL on x.com
    if (href.startsWith('/')) {
      return `https://x.com${href}`;
    }
    return href;
  }

  // Fallback: search for any status link in the tweet
  const statusLink = tweetEl.querySelector<HTMLAnchorElement>(
    'a[href*="/status/"]',
  );
  if (statusLink) {
    const href = statusLink.getAttribute('href') ?? '';
    if (href.startsWith('/')) return `https://x.com${href}`;
    return href;
  }

  return null;
}

/**
 * Extracts the tweet ID from a tweet URL.
 */
function extractTweetId(url: string): string {
  const match = url.match(/\/status\/(\d+)/);
  return match?.[1] ?? '';
}

/**
 * Extracts text content from the tweet text element, preserving line breaks.
 * Handles emojis (rendered as <img alt="emoji">), hashtags, mentions, and links.
 */
function extractText(tweetTextEl: HTMLElement): string {
  let result = '';

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const tag = node.tagName.toLowerCase();

    // Line breaks
    if (tag === 'br') {
      result += '\n';
      return;
    }

    // Emoji images — X renders emojis as <img alt="😀">
    if (tag === 'img') {
      const alt = node.getAttribute('alt');
      if (alt) result += alt;
      return;
    }

    // Block-level elements that imply line breaks between them
    if (tag === 'div' || tag === 'p') {
      if (result.length > 0 && !result.endsWith('\n')) {
        result += '\n';
      }
    }

    for (const child of node.childNodes) {
      walk(child);
    }
  }

  walk(tweetTextEl);
  return result.trim();
}

/**
 * Extracts the timestamp from a tweet and returns it as ISO 8601 string.
 */
function extractTimestamp(tweetEl: HTMLElement): string {
  const timeEl = getTimestamp(tweetEl);
  if (!timeEl) return '';
  // X's <time> element has a `datetime` attribute already in ISO 8601
  return timeEl.getAttribute('datetime') ?? '';
}

/**
 * Extracts quote tweet data from a tweet element.
 */
function extractQuoteTweet(tweetEl: HTMLElement): QuoteTweetData | undefined {
  const quoteEl = tweetEl.querySelector<HTMLElement>(
    '[data-testid="quoteTweet"]',
  );
  if (!quoteEl) return undefined;

  const authorInfo = getAuthorInfo(quoteEl);
  const textEl = getTweetText(quoteEl);
  const text = textEl ? extractText(textEl) : '';

  return {
    text,
    author: authorInfo
      ? { display_name: authorInfo.displayName, handle: authorInfo.handle }
      : { display_name: '', handle: '' },
    images: extractQuoteTweetMedia(tweetEl),
  };
}

/**
 * Extracts poll data from a tweet element.
 * X renders polls with `data-testid="cardPoll"` or as list items inside a poll container.
 */
function extractPoll(tweetEl: HTMLElement): PollData | undefined {
  // Primary: card poll container
  const pollEl = tweetEl.querySelector<HTMLElement>(
    '[data-testid="cardPoll"], [data-testid="card.wrapper"] [role="listitem"]',
  );
  if (!pollEl) {
    // Fallback: look for poll option spans with percentage text patterns
    const options = tweetEl.querySelectorAll<HTMLElement>(
      '[data-testid^="poll"] span, [role="radio"]',
    );
    if (options.length === 0) return undefined;

    const texts = Array.from(options)
      .map((el) => el.textContent?.trim() ?? '')
      .filter((t) => t.length > 0);
    return texts.length > 0 ? { options: texts } : undefined;
  }

  // Extract option texts from list items or direct children
  const items = pollEl.closest('[data-testid="cardPoll"]')
    ? pollEl
        .closest('[data-testid="cardPoll"]')!
        .querySelectorAll<HTMLElement>('[role="listitem"], li, div > span')
    : pollEl.querySelectorAll<HTMLElement>('[role="listitem"], li');

  const options: string[] = [];
  for (const item of items) {
    const text = item.textContent?.trim() ?? '';
    if (text.length > 0 && !options.includes(text)) {
      options.push(text);
    }
  }

  return options.length > 0 ? { options } : undefined;
}

/**
 * Scrapes structured data from a tweet DOM element.
 * Handles regular tweets, quote tweets, polls, retweets, threads, and cards.
 * Returns null if essential data (URL, author, text) cannot be extracted.
 */
export function scrapeTweet(tweetEl: HTMLElement): TweetData | null {
  const url = extractTweetUrl(tweetEl);
  if (!url) return null;

  const id = extractTweetId(url);
  if (!id) return null;

  const authorInfo = getAuthorInfo(tweetEl);
  if (!authorInfo) return null;

  const tweetTextEl = getTweetText(tweetEl);
  const text = tweetTextEl ? extractText(tweetTextEl) : '';

  const timestamp = extractTimestamp(tweetEl);

  const result: TweetData = {
    id,
    url,
    author: {
      display_name: authorInfo.displayName,
      handle: authorInfo.handle,
    },
    text,
    timestamp,
    images: extractTweetMedia(tweetEl),
  };

  // Quote tweet
  const quoteTweet = extractQuoteTweet(tweetEl);
  if (quoteTweet) result.quote_tweet = quoteTweet;

  // Poll
  const poll = extractPoll(tweetEl);
  if (poll) result.poll = poll;

  return result;
}
