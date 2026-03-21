/**
 * Scrapes top N reply comments from tweet detail page reply elements.
 * Extracts structured data, sorts by engagement (like count), and returns top N.
 */

import { extractTweetMedia } from '@/lib/scrape-media';
import { MAX_COMMENT_COUNT, MIN_COMMENT_COUNT } from '@/lib/storage';
import {
  extractText,
  extractTimestamp,
  extractTweetId,
  extractTweetUrl,
  toTweetAuthor,
  type TweetAuthor,
} from '@/lib/scrape-tweet';
import { getAuthorInfo, getTweetText } from '@/lib/selectors';

export interface CommentData {
  id: string;
  author: TweetAuthor;
  text: string;
  timestamp: string;
  likes: number;
  images: string[];
}

/**
 * Parses a display count string like "5", "1.2K", "12.5K", "1M" to an integer.
 */
function parseCount(text: string): number {
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/^([\d.]+)\s*([KkMm]?)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();

  if (suffix === 'K') return Math.round(num * 1000);
  if (suffix === 'M') return Math.round(num * 1000000);
  return Math.round(num);
}

/**
 * Extracts the like count from a reply's action bar.
 * Looks for the like/unlike button and its associated count.
 */
function extractLikeCount(replyEl: HTMLElement): number {
  const likeBtn = replyEl.querySelector<HTMLElement>(
    '[data-testid="like"], [data-testid="unlike"]',
  );
  if (!likeBtn) return 0;

  // Check aria-label on the button or its wrapper (e.g., "123 Likes")
  const wrapper = likeBtn.closest('[role="button"]') ?? likeBtn;
  const ariaLabel = wrapper.getAttribute('aria-label') ?? '';
  const labelMatch = ariaLabel.match(/^([\d,]+)\s/);
  if (labelMatch) {
    return parseInt(labelMatch[1].replace(/,/g, ''), 10);
  }

  // Fallback: find a span with numeric text inside the button area
  const spans = wrapper.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim() ?? '';
    if (/^\d/.test(text)) {
      return parseCount(text);
    }
  }

  return 0;
}

/**
 * Checks if a reply is a promoted/ad tweet.
 * X marks promoted content with placement tracking or "Promoted"/"Ad" labels.
 */
function isPromotedReply(replyEl: HTMLElement): boolean {
  if (replyEl.querySelector('[data-testid="placementTracking"]')) return true;

  const spans = replyEl.querySelectorAll('span');
  for (const span of spans) {
    const text = span.textContent?.trim().toLowerCase() ?? '';
    if (text === 'promoted' || text === 'ad') return true;
  }

  return false;
}

/**
 * Checks if a reply is deleted or unavailable (tombstone).
 * These appear as placeholder articles with a message instead of tweet content.
 */
function isDeletedOrUnavailable(replyEl: HTMLElement): boolean {
  if (replyEl.querySelector('[data-testid="tombstone"]')) return true;

  const text = replyEl.textContent?.toLowerCase() ?? '';
  return (
    text.includes('this tweet was deleted') ||
    text.includes('this tweet is unavailable') ||
    text.includes('this post was deleted') ||
    text.includes('this post is unavailable')
  );
}

/**
 * Checks if a reply element is a top-level reply (not a thread continuation).
 *
 * On X's detail page, thread continuation replies are visually connected
 * to the previous reply by a vertical connector line. We detect this by
 * looking for narrow connector elements positioned before the article
 * within its cell container.
 */
function isTopLevelReply(replyEl: HTMLElement): boolean {
  const cell = replyEl.closest('[data-testid="cellInnerDiv"]');
  if (!cell) return true;

  // Walk from the article upward within the cell, looking for thread connector
  // divs that precede the article. Thread connectors are narrow, tall divs
  // with a background color that creates the visual line.
  const allDivs = cell.querySelectorAll<HTMLElement>('div');
  for (const div of allDivs) {
    // Only check elements that appear before the article in DOM order
    if (replyEl.contains(div) || div.contains(replyEl)) continue;
    if (replyEl.compareDocumentPosition(div) & Node.DOCUMENT_POSITION_FOLLOWING)
      continue;

    // Thread connector: very narrow, visibly tall, has background color
    const style = window.getComputedStyle(div);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    const bg = style.backgroundColor;

    if (
      width <= 4 &&
      height > 20 &&
      bg !== 'rgba(0, 0, 0, 0)' &&
      bg !== 'transparent'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Scrapes a single reply article element into a CommentData object.
 * Returns null if essential data (URL, ID, author) cannot be extracted.
 */
function scrapeReply(replyEl: HTMLElement): CommentData | null {
  const url = extractTweetUrl(replyEl);
  if (!url) return null;

  const id = extractTweetId(url);
  if (!id) return null;

  const authorInfo = getAuthorInfo(replyEl);
  if (!authorInfo) return null;

  const tweetTextEl = getTweetText(replyEl);
  const text = tweetTextEl ? extractText(tweetTextEl) : '';

  const timestamp = extractTimestamp(replyEl);

  return {
    id,
    author: toTweetAuthor(authorInfo),
    text,
    timestamp,
    likes: extractLikeCount(replyEl),
    images: extractTweetMedia(replyEl),
  };
}

/**
 * Scrapes top N comments from reply elements, sorted by engagement.
 *
 * - Extracts structured data from each reply element
 * - Filters to top-level replies only (skips thread continuations)
 * - Deduplicates by reply ID
 * - Sorts by like count descending (highest engagement first)
 * - Returns up to N results (clamped to 1–20)
 * - Returns empty array for zero replies
 *
 * @param replyElements - Reply article DOM elements from loadReplies()
 * @param count - Maximum number of comments to return (default 5)
 */
export function scrapeTopComments(
  replyElements: HTMLElement[],
  count: number = 5,
): CommentData[] {
  if (replyElements.length === 0) return [];

  const clampedCount = Math.max(
    MIN_COMMENT_COUNT,
    Math.min(MAX_COMMENT_COUNT, count),
  );
  const seen = new Set<string>();
  const comments: CommentData[] = [];

  for (const el of replyElements) {
    // Skip thread continuations — only capture top-level replies
    if (!isTopLevelReply(el)) continue;

    // Skip promoted/ad replies
    if (isPromotedReply(el)) continue;

    // Skip deleted or unavailable replies (tombstones)
    if (isDeletedOrUnavailable(el)) continue;

    const comment = scrapeReply(el);
    if (!comment) continue;

    // Deduplicate by reply ID
    if (seen.has(comment.id)) continue;
    seen.add(comment.id);

    comments.push(comment);
  }

  // Sort by likes descending (highest engagement first)
  comments.sort((a, b) => b.likes - a.likes);

  return comments.slice(0, clampedCount);
}
