/**
 * Chrome storage.sync wrapper for TweetExport settings persistence.
 */

import type { GetSettingsResponse } from '@/lib/messages';

export interface Settings {
  topCommentCount: number;
  copyToClipboard: boolean;
}

export const MIN_COMMENT_COUNT = 1;
export const MAX_COMMENT_COUNT = 20;

export const DEFAULT_SETTINGS: Settings = {
  topCommentCount: 5,
  copyToClipboard: false,
};

const STORAGE_KEY = 'settings';

/**
 * Retrieves settings from chrome.storage.sync.
 * Returns default settings merged with any stored values.
 */
export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.sync.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * Saves settings to chrome.storage.sync.
 * Merges provided partial settings with current stored settings.
 */
export async function saveSettings(
  updates: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings();
  const merged = { ...current, ...updates };
  await browser.storage.sync.set({ [STORAGE_KEY]: merged });
  return merged;
}

/**
 * Requests current settings from the background service worker via message passing.
 * Falls back to defaults if the background is unavailable.
 */
export async function requestSettings(): Promise<Settings> {
  try {
    const res = (await browser.runtime.sendMessage({
      type: 'getSettings',
    })) as GetSettingsResponse;
    if (res?.success && res.settings) return res.settings;
  } catch {
    // Background may not be ready yet — fall back to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export type SettingsChangeCallback = (
  newSettings: Settings,
  oldSettings: Settings,
) => void;

/**
 * Registers a listener for storage changes.
 * Returns an unsubscribe function to remove the listener.
 */
export function onSettingsChange(callback: SettingsChangeCallback): () => void {
  const listener = (
    changes: Record<string, Browser.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'sync' || !(STORAGE_KEY in changes)) return;

    const change = changes[STORAGE_KEY];
    const newSettings = {
      ...DEFAULT_SETTINGS,
      ...(change.newValue as Partial<Settings>),
    };
    const oldSettings = {
      ...DEFAULT_SETTINGS,
      ...(change.oldValue as Partial<Settings>),
    };
    callback(newSettings, oldSettings);
  };

  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
