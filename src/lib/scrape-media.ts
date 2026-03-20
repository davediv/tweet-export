/**
 * Extracts media URLs (images, video thumbnails, GIFs) from tweet DOM elements.
 */

import { getMediaUrls, getQuoteTweet } from '@/lib/selectors';

/** Strips query params for deduplication comparison. */
function baseUrl(url: string): string {
  return url.split('?')[0];
}

/**
 * Upgrades a pbs.twimg.com image URL to the highest resolution variant.
 * Replaces name=small/medium/900x900 etc. with name=large.
 */
function toHighRes(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'pbs.twimg.com') {
      u.searchParams.set('name', 'large');
      if (!u.searchParams.has('format')) {
        u.searchParams.set('format', 'jpg');
      }
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Extracts image URLs from a tweet element.
 * Returns high-resolution pbs.twimg.com URLs.
 */
function extractImageUrls(tweetEl: HTMLElement): string[] {
  const imgs = getMediaUrls(tweetEl);
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const img of imgs) {
    const src = img.getAttribute('src') ?? '';
    if (!src || !src.includes('pbs.twimg.com')) continue;

    const highRes = toHighRes(src);
    const base = baseUrl(highRes);
    if (seen.has(base)) continue;
    seen.add(base);
    urls.push(highRes);
  }

  return urls;
}

/**
 * Extracts video/GIF thumbnail URLs from a tweet element.
 */
function extractVideoThumbnails(tweetEl: HTMLElement): string[] {
  const urls: string[] = [];

  // Video player poster images
  const videos = tweetEl.querySelectorAll<HTMLVideoElement>(
    '[data-testid="videoPlayer"] video, video[poster]',
  );
  for (const video of videos) {
    const poster = video.getAttribute('poster');
    if (poster && poster.includes('pbs.twimg.com')) {
      urls.push(toHighRes(poster));
    }
  }

  // GIF thumbnails — X renders GIFs as video elements
  // Also check for thumbnail images inside video containers
  const videoContainers = tweetEl.querySelectorAll<HTMLElement>(
    '[data-testid="videoPlayer"]',
  );
  for (const container of videoContainers) {
    const img = container.querySelector<HTMLImageElement>(
      'img[src*="pbs.twimg.com"]',
    );
    if (img) {
      const src = img.getAttribute('src') ?? '';
      if (src) urls.push(toHighRes(src));
    }
  }

  return urls;
}

/**
 * Extracts all media URLs from a tweet element.
 * Includes images (full resolution), video thumbnails, and GIF thumbnails.
 * Excludes media from quote tweets (those are inside a nested article).
 *
 * Returns empty array when tweet has no media.
 */
export function extractTweetMedia(tweetEl: HTMLElement): string[] {
  // Exclude quote tweet media: find the quote tweet container and skip it
  const quoteTweet = getQuoteTweet(tweetEl);

  // If there's a quote tweet, we need to only extract from the main tweet area
  // Create a working copy approach: collect from main tweet, then subtract quote media
  const allImages = extractImageUrls(tweetEl);
  const allVideos = extractVideoThumbnails(tweetEl);

  if (!quoteTweet) {
    return [...allImages, ...allVideos];
  }

  // Get quote tweet media to exclude
  const quoteImages = new Set(extractImageUrls(quoteTweet).map(baseUrl));
  const quoteVideos = new Set(extractVideoThumbnails(quoteTweet).map(baseUrl));

  const mainImages = allImages.filter((u) => !quoteImages.has(baseUrl(u)));
  const mainVideos = allVideos.filter((u) => !quoteVideos.has(baseUrl(u)));

  return [...mainImages, ...mainVideos];
}

/**
 * Extracts media URLs from a quote tweet element specifically.
 */
export function extractQuoteTweetMedia(tweetEl: HTMLElement): string[] {
  const quoteTweet = getQuoteTweet(tweetEl);
  if (!quoteTweet) return [];

  return [
    ...extractImageUrls(quoteTweet),
    ...extractVideoThumbnails(quoteTweet),
  ];
}
