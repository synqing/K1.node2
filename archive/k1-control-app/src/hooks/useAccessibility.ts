/**
 * Accessibility Hook
 * Implements Phase 1 Week 3: Easy-to-use accessibility features for components
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  AriaUtils,
  KeyboardKeys,
  isActivationKey,
  FocusUtils,
  ScreenReaderAnnounce,
  sendA11yNotification,
  A11yNotification,
} from '../utils/accessibility';

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, (event: React.KeyboardEvent) => void>,
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for specific key combinations
      const key = event.key;

      // Check Ctrl/Cmd combinations
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        const [mod, k] = shortcut.split('+');

        // Match simple keys
        if (shortcut === key) {
          callback(event as any);
          return;
        }

        // Match modified keys (e.g., "Ctrl+S")
        if (
          shortcut === `Ctrl+${key}` ||
          shortcut === `Cmd+${key}` ||
          shortcut === `Alt+${key}`
        ) {
          if (
            (shortcut.startsWith('Ctrl+') && (event.ctrlKey && !event.metaKey)) ||
            (shortcut.startsWith('Cmd+') && event.metaKey) ||
            (shortcut.startsWith('Alt+') && event.altKey)
          ) {
            event.preventDefault();
            callback(event as any);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Hook for managing focus within a component
 */
export function useFocusManagement() {
  const containerRef = useRef<HTMLDivElement>(null);

  const focus = useCallback((selector: string) => {
    if (!containerRef.current) return;
    const element = containerRef.current.querySelector<HTMLElement>(selector);
    FocusUtils.focus(element);
  }, []);

  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;
    const firstFocusable = FocusUtils.getFirstFocusable(containerRef.current);
    FocusUtils.focus(firstFocusable);
  }, []);

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return;
    FocusUtils.trapFocus(containerRef.current, event);
  }, []);

  return {
    containerRef,
    focus,
    focusFirst,
    trapFocus,
  };
}

/**
 * Hook for managing ARIA live regions and announcements
 */
export function useAriaLive() {
  const announceStatus = useCallback((status: string) => {
    ScreenReaderAnnounce.announceStatus(status);
  }, []);

  const announceError = useCallback((error: string) => {
    ScreenReaderAnnounce.announceError(error);
  }, []);

  const announceSuccess = useCallback((message: string) => {
    ScreenReaderAnnounce.announceSuccess(message);
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReaderAnnounce.announce(message, priority);
  }, []);

  return {
    announceStatus,
    announceError,
    announceSuccess,
    announce,
  };
}

/**
 * Hook for accessible notifications
 */
export function useA11yNotification() {
  const notify = useCallback((notification: A11yNotification) => {
    sendA11yNotification(notification);
  }, []);

  const notifySuccess = useCallback((message: string) => {
    notify({
      type: 'success',
      message,
      ariaLive: 'polite',
    });
  }, [notify]);

  const notifyError = useCallback((message: string) => {
    notify({
      type: 'error',
      message,
      ariaLive: 'assertive',
    });
  }, [notify]);

  const notifyInfo = useCallback((message: string) => {
    notify({
      type: 'info',
      message,
      ariaLive: 'polite',
    });
  }, [notify]);

  const notifyWarning = useCallback((message: string) => {
    notify({
      type: 'warning',
      message,
      ariaLive: 'assertive',
    });
  }, [notify]);

  return {
    notify,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
  };
}

/**
 * Hook for managing accessible form inputs
 */
export function useAccessibleInput(
  inputId: string,
  {
    label,
    description,
    error,
    required = false,
  }: { label?: string; description?: string; error?: string; required?: boolean },
) {
  const ariaLabelledBy = label ? inputId + '-label' : undefined;
  const ariaDescribedBy = [
    description ? AriaUtils.descriptionId(inputId) : undefined,
    error ? AriaUtils.errorId(inputId) : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return {
    inputProps: {
      id: inputId,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      'aria-required': required,
      'aria-invalid': !!error,
    },
    labelProps: {
      id: inputId + '-label',
      htmlFor: inputId,
    },
    descriptionProps: {
      id: AriaUtils.descriptionId(inputId),
    },
    errorProps: {
      id: AriaUtils.errorId(inputId),
      role: 'alert',
    },
  };
}

/**
 * Hook for accessible button with keyboard support
 */
export function useAccessibleButton() {
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Allow Enter and Space to trigger click
    if (isActivationKey(event)) {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }, []);

  return {
    handleKeyDown,
  };
}

/**
 * Hook for managing focus on mount
 */
export function useFocusOnMount(ref: React.RefObject<HTMLElement>, shouldFocus = true): void {
  useEffect(() => {
    if (shouldFocus && ref.current) {
      // Use setTimeout to ensure DOM has fully rendered
      setTimeout(() => {
        ref.current?.focus();
      }, 0);
    }
  }, [shouldFocus]);
}

/**
 * Hook for managing focus restoration (e.g., when closing modals)
 */
export function useFocusRestoration() {
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
      lastFocusedElement.current = null;
    }
  }, []);

  return {
    saveFocus,
    restoreFocus,
  };
}

/**
 * Hook for skip links (accessibility feature)
 */
export function useSkipLink(
  targetId: string,
): {
  skipLink: React.ReactElement;
} {
  const skipLink = React.createElement('a', {
    href: `#${targetId}`,
    className: 'absolute left-0 top-0 bg-blue-600 text-white px-4 py-2 -translate-y-full focus:translate-y-0 transition-transform',
  }, 'Skip to main content');

  return { skipLink };
}
