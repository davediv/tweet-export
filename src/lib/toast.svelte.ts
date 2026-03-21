/**
 * Reactive toast state management for content script notifications.
 */

export type ToastType = 'success' | 'error' | 'info' | 'preview';

export interface PreviewData {
  author: string;
  text: string;
  commentCount: number;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  onRetry?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  preview?: PreviewData;
}

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
  preview: 10000,
};

let toasts = $state<ToastItem[]>([]);
let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

/** Returns the current list of active toast notifications. */
export function getToasts(): ToastItem[] {
  return toasts;
}

/**
 * Displays a toast notification and returns its ID.
 * Auto-dismisses after a type-dependent duration.
 * Preview toasts auto-confirm on dismiss.
 */
export function showToast(
  type: ToastType,
  message: string,
  options?: {
    onRetry?: () => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    preview?: PreviewData;
  },
): number {
  const id = nextId++;
  toasts = [
    ...toasts,
    {
      id,
      type,
      message,
      onRetry: options?.onRetry,
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel,
      preview: options?.preview,
    },
  ];

  const onTimeout = () => {
    if (type === 'preview') {
      const toast = toasts.find((t) => t.id === id);
      toast?.onConfirm?.();
    }
    removeToast(id);
  };

  timers.set(id, setTimeout(onTimeout, AUTO_DISMISS_MS[type]));
  return id;
}

/** Removes a toast notification by ID and clears its auto-dismiss timer. */
export function removeToast(id: number): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
}

/** Removes all toasts and clears all auto-dismiss timers. */
export function clearAllToasts(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  toasts = [];
}
