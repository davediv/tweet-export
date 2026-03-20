/**
 * Assembles scraped tweet and comment data into the PRD-defined JSON export format.
 * Produces a UTF-8, 2-space indented JSON string ready for file download.
 */

import type { CommentData } from '@/lib/scrape-comments';
import type { TweetData } from '@/lib/scrape-tweet';

export interface ExportMetadata {
  exported_at: string;
  extension_version: string;
  top_comments_requested: number;
  top_comments_returned: number;
}

export interface TweetExportJson {
  export_metadata: ExportMetadata;
  tweet: Pick<
    TweetData,
    'id' | 'url' | 'author' | 'text' | 'timestamp' | 'images'
  >;
  comments: CommentData[];
}

/**
 * Assembles the final JSON export object from scraped tweet and comment data.
 *
 * @param tweet - Scraped tweet data
 * @param comments - Scraped top comments sorted by engagement
 * @param topCommentsRequested - Number of comments the user requested
 */
export function assembleExportData(
  tweet: TweetData,
  comments: CommentData[],
  topCommentsRequested: number,
): TweetExportJson {
  return {
    export_metadata: {
      exported_at: new Date().toISOString(),
      extension_version: browser.runtime.getManifest().version,
      top_comments_requested: topCommentsRequested,
      top_comments_returned: comments.length,
    },
    tweet: {
      id: tweet.id,
      url: tweet.url,
      author: tweet.author,
      text: tweet.text,
      timestamp: tweet.timestamp,
      images: tweet.images,
    },
    comments,
  };
}

/**
 * Serializes the export data to a formatted JSON string.
 * UTF-8 encoded with 2-space indentation per PRD requirements.
 */
export function serializeExport(data: TweetExportJson): string {
  return JSON.stringify(data, null, 2);
}
