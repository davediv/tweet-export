/**
 * Reactive toast state management for content script notifications.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  onRetry?: () => void;
}

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
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
 * Auto-dismisses after a type-dependent duration (success: 3s, error: 5s, info: 4s).
 */
export function showToast(
  type: ToastType,
  message: string,
  options?: { onRetry?: () => void },
): number {
  const id = nextId++;
  toasts = [...toasts, { id, type, message, onRetry: options?.onRetry }];
  timers.set(
    id,
    setTimeout(() => removeToast(id), AUTO_DISMISS_MS[type]),
  );
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
