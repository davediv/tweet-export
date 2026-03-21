/**
 * Custom error types for classifying export pipeline failures.
 * Each error carries a user-facing message for toast display.
 */

/** Base class for export errors with user-friendly messages. */
export class ExportError extends Error {
  readonly userMessage: string;

  constructor(message: string, userMessage: string) {
    super(message);
    this.name = 'ExportError';
    this.userMessage = userMessage;
  }
}

/** Thrown when tweet DOM structure cannot be parsed (selectors failed). */
export class DomStructureError extends ExportError {
  constructor() {
    super(
      'Failed to extract tweet data',
      'Export failed. The page structure may have changed.',
    );
    this.name = 'DomStructureError';
  }
}

/** Thrown when the export pipeline exceeds the maximum allowed duration. */
export class ExportTimeoutError extends ExportError {
  constructor(timeoutMs: number = 10000) {
    super(
      `Export timed out after ${timeoutMs / 1000} seconds`,
      'Export timed out. The page may be loading slowly.',
    );
    this.name = 'ExportTimeoutError';
  }
}

/** Thrown when reply loading fails after retry. */
export class ReplyLoadError extends ExportError {
  constructor(cause?: string) {
    super(
      cause ?? 'Failed to load replies',
      'Failed to load replies. Please try again.',
    );
    this.name = 'ReplyLoadError';
  }
}

/** Extracts a message string from an unknown error, or returns the fallback. */
export function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
