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
  };

  function handleRetry(toast: ToastItem): void {
    toast.onRetry?.();
    removeToast(toast.id);
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
      role="alert"
    >
      <!-- Type icon -->
      <span class="{styles.icon} flex-shrink-0 mt-0.5">
        <svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d={styles.iconPath} clip-rule="evenodd" />
        </svg>
      </span>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p class="{styles.text} text-sm font-medium">{toast.message}</p>
        {#if toast.type === 'error' && toast.onRetry}
          <button
            class="text-red-600 text-xs font-semibold hover:text-red-800 hover:underline mt-1"
            onclick={() => handleRetry(toast)}
          >
            Retry
          </button>
        {/if}
      </div>

      <!-- Close button -->
      <button
        class="flex-shrink-0 {styles.text} opacity-50 hover:opacity-100 transition-opacity"
        onclick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
          <path
            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
          />
        </svg>
      </button>
    </div>
  {/each}
</div>
