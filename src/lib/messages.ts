/**
 * Shared message types for communication between content script and background worker.
 */

import type { Settings } from '@/lib/storage';

export interface DownloadJsonMessage {
  type: 'downloadJson';
  filename: string;
  json: string;
}

export interface DownloadJsonResponse {
  success: boolean;
  error?: string;
}

export interface SettingsUpdatedMessage {
  type: 'settingsUpdated';
  settings: Settings;
}

export type ExtensionMessage = DownloadJsonMessage | SettingsUpdatedMessage;
