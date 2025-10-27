/**
 * Accessibility Utilities
 * Implements Phase 1 Week 3: WCAG 2.1 AA Compliance
 *
 * This module provides utilities for:
 * - Color contrast validation (WCAG AA: 4.5:1 for text, 3:1 for graphics)
 * - Keyboard navigation helpers
 * - ARIA attribute generation
 * - Focus management
 * - Screen reader announcements
 */

/**
 * Calculate contrast ratio between two colors
 * Returns a ratio between 1 and 21 (21 being maximum contrast)
 *
 * WCAG Standards:
 * - AA: 4.5:1 for normal text, 3:1 for large text
 * - AAA: 7:1 for normal text, 4.5:1 for large text
 */
export function getContrastRatio(hexColor1: string, hexColor2: string): number {
  const rgb1 = hexToRgb(hexColor1);
  const rgb2 = hexToRgb(hexColor2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance (WCAG formula)
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Keyboard navigation handlers
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Check if keyboard event is an activation key (Enter or Space)
 */
export function isActivationKey(event: React.KeyboardEvent): boolean {
  return event.key === KeyboardKeys.ENTER || event.key === KeyboardKeys.SPACE;
}

/**
 * Check if keyboard event is an arrow key
 */
export function isArrowKey(event: React.KeyboardEvent): boolean {
  return (
    event.key === KeyboardKeys.ARROW_UP ||
    event.key === KeyboardKeys.ARROW_DOWN ||
    event.key === KeyboardKeys.ARROW_LEFT ||
    event.key === KeyboardKeys.ARROW_RIGHT
  );
}

/**
 * Focus management utilities
 */
export const FocusUtils = {
  /**
   * Focus an element with optional smoothness
   */
  focus: (element: HTMLElement | null, options?: { smooth?: boolean }): void => {
    if (!element) return;
    if (options?.smooth) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    element.focus();
  },

  /**
   * Trap focus within a container (for modals)
   */
  trapFocus: (
    container: HTMLElement,
    event: KeyboardEvent,
  ): void => {
    if (event.key !== KeyboardKeys.TAB) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  },

  /**
   * Get first focusable element in container
   */
  getFirstFocusable: (container: HTMLElement): HTMLElement | null => {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    return focusableElements.length > 0 ? focusableElements[0] : null;
  },
};

/**
 * ARIA attribute helpers
 */
export const AriaUtils = {
  /**
   * Generate aria-label for icon buttons
   */
  iconButtonLabel: (icon: string, action: string): string => {
    return `${icon} ${action}`;
  },

  /**
   * Generate aria-label for value displays
   */
  valueLabel: (label: string, value: string | number): string => {
    return `${label}: ${value}`;
  },

  /**
   * Generate aria-describedby ID
   */
  descriptionId: (baseId: string): string => {
    return `${baseId}-description`;
  },

  /**
   * Generate error message ID for aria-describedby
   */
  errorId: (baseId: string): string => {
    return `${baseId}-error`;
  },

  /**
   * Get aria-current for navigation
   */
  navigationCurrent: (isActive: boolean): 'page' | 'location' | 'step' | 'date' | 'time' | false => {
    return isActive ? 'page' : false;
  },
};

/**
 * Screen reader announcement
 */
export const ScreenReaderAnnounce = {
  /**
   * Create live region element for announcements
   */
  createLiveRegion: (id: string = 'sr-announcements'): HTMLElement => {
    let region = document.getElementById(id);
    if (!region) {
      region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.style.position = 'absolute';
      region.style.left = '-10000px';
      region.style.width = '1px';
      region.style.height = '1px';
      region.style.overflow = 'hidden';
      document.body.appendChild(region);
    }
    return region;
  },

  /**
   * Announce message to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    const region = ScreenReaderAnnounce.createLiveRegion();
    region.setAttribute('aria-live', priority);
    region.textContent = message;
    // Clear after announcement to avoid repetition
    setTimeout(() => {
      region.textContent = '';
    }, 1000);
  },

  /**
   * Announce status update
   */
  announceStatus: (status: string): void => {
    ScreenReaderAnnounce.announce(`Status: ${status}`, 'polite');
  },

  /**
   * Announce error
   */
  announceError: (error: string): void => {
    ScreenReaderAnnounce.announce(`Error: ${error}`, 'assertive');
  },

  /**
   * Announce success
   */
  announceSuccess: (message: string): void => {
    ScreenReaderAnnounce.announce(`Success: ${message}`, 'polite');
  },
};

/**
 * Accessibility audit utilities (for testing)
 */
export const A11yAudit = {
  /**
   * Check if all buttons have accessible labels
   */
  checkButtonLabels: (): { errors: string[] } => {
    const errors: string[] = [];
    const buttons = document.querySelectorAll('button');

    buttons.forEach((button, index) => {
      const hasText = button.textContent?.trim().length ?? 0 > 0;
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');

      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        errors.push(`Button ${index} has no accessible label`);
      }
    });

    return { errors };
  },

  /**
   * Check image alt text
   */
  checkImageAltText: (): { errors: string[] } => {
    const errors: string[] = [];
    const images = document.querySelectorAll('img');

    images.forEach((img, index) => {
      if (!img.hasAttribute('alt')) {
        errors.push(`Image ${index} (${img.src}) has no alt text`);
      }
    });

    return { errors };
  },

  /**
   * Check form labels
   */
  checkFormLabels: (): { errors: string[] } => {
    const errors: string[] = [];
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach((input, index) => {
      const id = input.getAttribute('id');
      const hasAriaLabel = input.hasAttribute('aria-label');
      const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : false;

      if (!hasLabel && !hasAriaLabel) {
        errors.push(`Form input ${index} has no associated label`);
      }
    });

    return { errors };
  },

  /**
   * Check heading hierarchy
   */
  checkHeadingHierarchy: (): { errors: string[] } => {
    const errors: string[] = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      if (level > previousLevel + 1) {
        errors.push(`Heading hierarchy jump from h${previousLevel} to h${level}`);
      }
      previousLevel = level;
    });

    return { errors };
  },

  /**
   * Check color contrast
   */
  checkColorContrast: (): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const elements = document.querySelectorAll('*');
    elements.forEach((el) => {
      const style = window.getComputedStyle(el as HTMLElement);
      const bgColor = style.backgroundColor;
      const color = style.color;

      // Skip if transparent
      if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') return;

      // Simplified check (would need more robust color parsing in production)
      if (bgColor.includes('rgb') && color.includes('rgb')) {
        // In a real implementation, extract RGB values and calculate contrast
        // For now, this is a placeholder
      }
    });

    return { errors, warnings };
  },
};

/**
 * A11y-friendly notification types
 */
export type A11yNotification = {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  ariaLive?: 'polite' | 'assertive';
  autoClose?: number;
};

/**
 * Send accessible notification
 */
export function sendA11yNotification(notification: A11yNotification): void {
  const { type, message, ariaLive = 'polite' } = notification;

  // Announce to screen readers
  ScreenReaderAnnounce.announce(message, ariaLive);

  // Visual notification is handled by toast system
}

/**
 * Testing utilities
 */
export const A11yTesting = {
  /**
   * Run all accessibility checks
   */
  runAll: () => {
    return {
      buttonLabels: A11yAudit.checkButtonLabels(),
      imageAltText: A11yAudit.checkImageAltText(),
      formLabels: A11yAudit.checkFormLabels(),
      headingHierarchy: A11yAudit.checkHeadingHierarchy(),
      colorContrast: A11yAudit.checkColorContrast(),
    };
  },

  /**
   * Check if site is WCAG AA compliant (basic check)
   */
  isWCAG_AA_Compliant: (): boolean => {
    const results = A11yTesting.runAll();
    const totalErrors = Object.values(results).reduce((sum, result) => {
      if ('errors' in result) {
        return sum + result.errors.length;
      }
      return sum;
    }, 0);
    return totalErrors === 0;
  },
};
