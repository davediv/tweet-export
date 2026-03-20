/**
 * Injects an export button into a tweet's action bar with visual state management.
 */

import { getActionBar } from '@/lib/selectors';
const BUTTON_MARKER = 'data-tweetexport-btn';

/** DM and non-tweet page patterns where buttons should NOT appear. */
const EXCLUDED_PATHS = ['/messages'];

function isExcludedPage(): boolean {
  return EXCLUDED_PATHS.some((path) => location.pathname.startsWith(path));
}

// --- SVG Icons (matching X's 1.5px stroke style at 18.75px) ---

function icon(content: string, extra = 'stroke-linejoin="round"'): string {
  return `<svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ${extra}>${content}</svg>`;
}

const ICON_EXPORT = icon(
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
);

const ICON_LOADING = icon(
  '<path d="M12 2a10 10 0 0 1 10 10" opacity="0.8"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path>',
  '',
);

const ICON_SUCCESS = icon('<polyline points="20 6 9 17 4 12"/>');

const ICON_ERROR = icon(
  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
);

// --- Colors ---

const COLOR_DEFAULT = 'rgb(113, 118, 123)';
const COLOR_HOVER = '#1D9BF0';
const COLOR_HOVER_BG = 'rgba(29, 155, 240, 0.1)';

// --- State management ---

export type ButtonState = 'default' | 'loading' | 'success' | 'error';

interface StateConfig {
  icon: string;
  color: string;
  bg: string;
  disabled: boolean;
  resetMs?: number;
}

const STATE_CONFIG: Record<ButtonState, StateConfig> = {
  default: {
    icon: ICON_EXPORT,
    color: COLOR_DEFAULT,
    bg: 'transparent',
    disabled: false,
  },
  loading: {
    icon: ICON_LOADING,
    color: COLOR_HOVER,
    bg: 'transparent',
    disabled: true,
  },
  success: {
    icon: ICON_SUCCESS,
    color: 'rgb(0, 186, 124)',
    bg: 'rgba(0, 186, 124, 0.1)',
    disabled: false,
    resetMs: 2000,
  },
  error: {
    icon: ICON_ERROR,
    color: 'rgb(249, 24, 128)',
    bg: 'rgba(249, 24, 128, 0.1)',
    disabled: false,
    resetMs: 3000,
  },
};

const buttonStates = new WeakMap<HTMLButtonElement, ButtonState>();
const resetTimers = new WeakMap<
  HTMLButtonElement,
  ReturnType<typeof setTimeout>
>();

/**
 * Sets the visual state of an export button.
 * - `loading`: spinner, disables click
 * - `success`: green checkmark, auto-resets after 2s
 * - `error`: red X, auto-resets after 3s
 * - `default`: normal export icon
 */
export function setButtonState(
  button: HTMLButtonElement,
  state: ButtonState,
): void {
  const timer = resetTimers.get(button);
  if (timer) clearTimeout(timer);

  buttonStates.set(button, state);

  const cfg = STATE_CONFIG[state];
  button.innerHTML = cfg.icon;
  button.style.color = cfg.color;
  button.style.backgroundColor = cfg.bg;
  button.disabled = cfg.disabled;
  button.style.cursor = cfg.disabled ? 'default' : 'pointer';

  if (cfg.resetMs) {
    resetTimers.set(
      button,
      setTimeout(() => setButtonState(button, 'default'), cfg.resetMs),
    );
  }
}

export function getButtonState(button: HTMLButtonElement): ButtonState {
  return buttonStates.get(button) ?? 'default';
}

// --- Button creation ---

function createExportButton(): {
  wrapper: HTMLElement;
  button: HTMLButtonElement;
} {
  const wrapper = document.createElement('div');
  wrapper.setAttribute(BUTTON_MARKER, '');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Export tweet as JSON');
  button.title = 'Export tweet as JSON';

  Object.assign(button.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34.75px',
    height: '34.75px',
    borderRadius: '9999px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '0',
    transition: 'background-color 0.2s, color 0.2s',
    color: COLOR_DEFAULT,
  });

  // Hover effect
  button.addEventListener('mouseenter', () => {
    if (getButtonState(button) === 'default') {
      button.style.color = COLOR_HOVER;
      button.style.backgroundColor = COLOR_HOVER_BG;
    }
  });

  button.addEventListener('mouseleave', () => {
    if (getButtonState(button) === 'default') {
      button.style.color = COLOR_DEFAULT;
      button.style.backgroundColor = 'transparent';
    }
  });

  button.innerHTML = ICON_EXPORT;
  buttonStates.set(button, 'default');

  wrapper.appendChild(button);
  return { wrapper, button };
}

// --- Public API ---

export type ExportButtonClickHandler = (
  tweetEl: HTMLElement,
  button: HTMLButtonElement,
) => void;

/**
 * Injects an export button into a tweet's action bar.
 *
 * - Skips injection on excluded pages (DMs).
 * - Prevents duplicate injection via marker attribute.
 * - Appends after the last native action button.
 *
 * Returns the button element, or null if injection was skipped.
 */
export function injectExportButton(
  tweetEl: HTMLElement,
  onClick: ExportButtonClickHandler,
): HTMLButtonElement | null {
  if (isExcludedPage()) return null;

  const actionBar = getActionBar(tweetEl);
  if (!actionBar) return null;

  // Prevent duplicate injection
  if (actionBar.querySelector(`[${BUTTON_MARKER}]`)) return null;

  const { wrapper, button } = createExportButton();

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(tweetEl, button);
  });

  actionBar.appendChild(wrapper);
  return button;
}
