<script lang="ts">
  import { fly } from 'svelte/transition';
  import {
    getToasts,
    removeToast,
    type ToastItem,
    type ToastType,
  } from '@/lib/toast.svelte';

  const TYPE_STYLES: Record<
    ToastType,
    {
      bg: string;
      border: string;
      text: string;
      icon: string;
      iconPath: string;
    }
  > = {
    success: {
      bg: 'bg-green-50',
      border: 'border-l-green-500',
      text: 'text-green-800',
      icon: 'text-green-500',
      iconPath:
        'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-l-red-500',
      text: 'text-red-800',
      icon: 'text-red-500',
      iconPath:
        'M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-l-blue-500',
      text: 'text-blue-800',
      icon: 'text-blue-500',
      iconPath:
        'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z',
    },
    preview: {
      bg: 'bg-gray-50',
      border: 'border-l-blue-500',
      text: 'text-gray-800',
      icon: 'text-blue-500',
      iconPath:
        'M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75zM3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z',
    },
  };

  function handleAction(
    toast: ToastItem,
    action: 'onRetry' | 'onConfirm' | 'onCancel',
  ): void {
    removeToast(toast.id);
    toast[action]?.();
  }
</script>

<div
  class="fixed bottom-4 right-4 z-[2147483647] flex flex-col gap-2 items-end font-sans"
>
  {#each getToasts() as toast (toast.id)}
    {@const styles = TYPE_STYLES[toast.type]}
    <div
      class="{styles.bg} {styles.border} border-l-4 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 max-w-sm"
      transition:fly={{ x: 100, duration: 200 }}
      role={toast.type === 'error'
        ? 'alert'
        : toast.type === 'preview'
          ? 'alertdialog'
          : 'status'}
      aria-label={toast.type === 'preview' ? 'Export preview' : undefined}
    >
      <!-- Type icon -->
      <span class="{styles.icon} shrink-0 mt-0.5" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d={styles.iconPath} clip-rule="evenodd" />
        </svg>
      </span>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        {#if toast.type === 'preview' && toast.preview}
          <p class="text-sm font-semibold text-gray-900 truncate">
            {toast.preview.author}
          </p>
          <p class="text-xs text-gray-600 mt-0.5 line-clamp-2">
            {toast.preview.text}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {toast.preview.commentCount} comment{toast.preview.commentCount !==
            1
              ? 's'
              : ''} found
          </p>
          <div class="flex gap-2 mt-2">
            <button
              class="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none transition-colors"
              onclick={() => handleAction(toast, 'onConfirm')}
            >
              Download
            </button>
            <button
              class="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded hover:bg-gray-300 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 focus-visible:outline-none transition-colors"
              onclick={() => handleAction(toast, 'onCancel')}
            >
              Cancel
            </button>
          </div>
        {:else}
          <p class="{styles.text} text-sm font-medium">{toast.message}</p>
          {#if toast.type === 'error' && toast.onRetry}
            <button
              class="text-red-600 text-xs font-semibold hover:text-red-800 hover:underline focus-visible:text-red-800 focus-visible:underline focus-visible:outline-none mt-1"
              onclick={() => handleAction(toast, 'onRetry')}
            >
              Retry
            </button>
          {/if}
        {/if}
      </div>

      <!-- Close button -->
      <button
        class="shrink-0 {styles.text} opacity-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none transition-opacity"
        onclick={() =>
          toast.type === 'preview'
            ? handleAction(toast, 'onCancel')
            : removeToast(toast.id)}
        aria-label="Dismiss notification"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          class="w-4 h-4"
          aria-hidden="true"
        >
          <path
            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
          />
        </svg>
      </button>
    </div>
  {/each}
</div>
