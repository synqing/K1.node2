/**
 * UI Guards Test Suite
 * 
 * Comprehensive tests for the UI guard system to ensure proper detection
 * and prevention of UI deviations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  validateSpacing, 
  validateComponentSize, 
  validateColor,
  validateTailwindClasses,
  LayoutGuard,
  UI_CONSTANTS,
  clampToSpacing,
  getZIndex,
} from '../utils/ui-guards';

// Mock console methods
const mockConsole = {
  warn: vi.fn(),
  log: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
  vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
  vi.spyOn(console, 'group').mockImplementation(mockConsole.group);
  vi.spyOn(console, 'groupEnd').mockImplementation(mockConsole.groupEnd);
});

afterEach(() => {
  vi.restoreAllMocks();
  mockConsole.warn.mockClear();
  mockConsole.log.mockClear();
  mockConsole.group.mockClear();
  mockConsole.groupEnd.mockClear();
});

describe('UI Guards - Core Validation', () => {
  describe('validateSpacing', () => {
    it('should validate approved spacing values', () => {
      expect(validateSpacing(4)).toBe(true);   // XS
      expect(validateSpacing(8)).toBe(true);   // SM
      expect(validateSpacing(12)).toBe(true);  // MD
      expect(validateSpacing(16)).toBe(true);  // LG
      expect(validateSpacing(24)).toBe(true);  // XL
      expect(validateSpacing(32)).toBe(true);  // XXL
      expect(validateSpacing(48)).toBe(true);  // XXXL
    });
    
    it('should reject non-approved spacing values', () => {
      expect(validateSpacing(5)).toBe(false);
      expect(validateSpacing(10)).toBe(false);
      expect(validateSpacing(15)).toBe(false);
      expect(validateSpacing(20)).toBe(false);
      expect(validateSpacing(100)).toBe(false);
    });
  });
  
  describe('validateComponentSize', () => {
    it('should validate components within size constraints', () => {
      const result = validateComponentSize(300, 200, {
        minWidth: 200,
        maxWidth: 400,
        minHeight: 100,
        maxHeight: 300,
      });
      
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
    
    it('should detect width violations', () => {
      const result = validateComponentSize(100, 200, {
        minWidth: 200,
        maxWidth: 400,
      });
      
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Width 100px is below minimum 200px');
    });
    
    it('should detect height violations', () => {
      const result = validateComponentSize(300, 50, {
        minHeight: 100,
        maxHeight: 300,
      });
      
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Height 50px is below minimum 100px');
    });
    
    it('should detect multiple violations', () => {
      const result = validateComponentSize(50, 400, {
        minWidth: 100,
        maxWidth: 200,
        minHeight: 100,
        maxHeight: 300,
      });
      
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations).toContain('Width 50px is below minimum 100px');
      expect(result.violations).toContain('Height 400px exceeds maximum 300px');
    });
  });
  
  describe('validateColor', () => {
    it('should validate approved K1 colors', () => {
      expect(validateColor('#6EE7F3')).toBe(true);  // K1 accent
      expect(validateColor('#0F1115')).toBe(true);  // Background
      expect(validateColor('#E6E9EF')).toBe(true);  // Text
      expect(validateColor('#22DD88')).toBe(true);  // Success
    });
    
    it('should reject non-approved colors', () => {
      expect(validateColor('#FF0000')).toBe(false); // Pure red
      expect(validateColor('#00FF00')).toBe(false); // Pure green
      expect(validateColor('#FFFFFF')).toBe(false); // Pure white
      expect(validateColor('#123456')).toBe(false); // Random color
    });
    
    it('should be case insensitive', () => {
      expect(validateColor('#6ee7f3')).toBe(true);
      expect(validateColor('#6EE7F3')).toBe(true);
    });
  });
  
  describe('validateTailwindClasses', () => {
    it('should validate approved Tailwind classes', () => {
      const result = validateTailwindClasses('p-4 m-2 w-64 h-32 text-base bg-[var(--k1-bg)] rounded-md flex items-center justify-center gap-2');
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
    
    it('should detect unapproved classes', () => {
      const result = validateTailwindClasses('p-4 custom-class weird-spacing');
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Unapproved Tailwind class: custom-class');
      expect(result.violations).toContain('Unapproved Tailwind class: weird-spacing');
    });
    
    it('should validate K1 CSS variable usage', () => {
      const result = validateTailwindClasses('bg-[var(--k1-accent)] text-[var(--k1-text)] border-[var(--k1-border)]');
      expect(result.valid).toBe(true);
    });
  });
});

describe('UI Guards - Layout Guard', () => {
  beforeEach(() => {
    // Reset violations before each test
    LayoutGuard.validateLayout({});
  });
  
  it('should validate proper sidebar dimensions', () => {
    const result = LayoutGuard.validateLayout({
      sidebarWidth: 320,
    });
    
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
  
  it('should detect sidebar width violations', () => {
    const result = LayoutGuard.validateLayout({
      sidebarWidth: 200, // Below minimum
    });
    
    expect(result.valid).toBe(false);
    expect(result.violations).toContain(`Sidebar width 200px is below minimum ${UI_CONSTANTS.LAYOUT.SIDEBAR_MIN_WIDTH}px`);
  });
  
  it('should detect main content width violations', () => {
    const result = LayoutGuard.validateLayout({
      mainContentWidth: 400, // Below minimum
    });
    
    expect(result.valid).toBe(false);
    expect(result.violations).toContain(`Main content width 400px is below minimum ${UI_CONSTANTS.LAYOUT.MAIN_CONTENT_MIN_WIDTH}px`);
  });
  
  it('should detect card height violations', () => {
    const result = LayoutGuard.validateLayout({
      cardHeight: 50, // Below minimum
    });
    
    expect(result.valid).toBe(false);
    expect(result.violations).toContain(`Card height 50px is below minimum ${UI_CONSTANTS.LAYOUT.CARD_MIN_HEIGHT}px`);
  });
  
  it('should detect invalid padding', () => {
    const result = LayoutGuard.validateLayout({
      padding: 15, // Not in spacing scale
    });
    
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Padding 15px is not from approved spacing scale');
  });
  
  it('should handle multiple violations', () => {
    const result = LayoutGuard.validateLayout({
      sidebarWidth: 200,
      cardHeight: 50,
      padding: 15,
    });
    
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(3);
  });
});

describe('UI Guards - Utility Functions', () => {
  describe('clampToSpacing', () => {
    it('should clamp values to nearest spacing', () => {
      expect(clampToSpacing(5)).toBe(4);   // Closest to XS
      expect(clampToSpacing(10)).toBe(8);  // Closest to SM
      expect(clampToSpacing(14)).toBe(12); // Closest to MD
      expect(clampToSpacing(18)).toBe(16); // Closest to LG
      expect(clampToSpacing(28)).toBe(24); // Closest to XL
      expect(clampToSpacing(35)).toBe(32); // Closest to XXL
      expect(clampToSpacing(50)).toBe(48); // Closest to XXXL
    });
    
    it('should return exact matches', () => {
      expect(clampToSpacing(4)).toBe(4);
      expect(clampToSpacing(8)).toBe(8);
      expect(clampToSpacing(12)).toBe(12);
      expect(clampToSpacing(16)).toBe(16);
    });
  });
  
  describe('getZIndex', () => {
    it('should return correct z-index values', () => {
      expect(getZIndex('BASE')).toBe(0);
      expect(getZIndex('DROPDOWN')).toBe(10);
      expect(getZIndex('MODAL')).toBe(50);
      expect(getZIndex('TOOLTIP')).toBe(70);
      expect(getZIndex('TOAST')).toBe(80);
    });
  });
});

describe('UI Guards - Constants Validation', () => {
  it('should have consistent spacing scale', () => {
    const spacings = Object.values(UI_CONSTANTS.SPACING);
    
    // Should be in ascending order
    for (let i = 1; i < spacings.length; i++) {
      expect(spacings[i]).toBeGreaterThan(spacings[i - 1]);
    }
    
    // Should start with 4px (XS)
    expect(spacings[0]).toBe(4);
  });
  
  it('should have reasonable component constraints', () => {
    expect(UI_CONSTANTS.COMPONENTS.BUTTON_HEIGHT).toBeGreaterThanOrEqual(UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN);
    expect(UI_CONSTANTS.COMPONENTS.INPUT_HEIGHT).toBeGreaterThanOrEqual(UI_CONSTANTS.COMPONENTS.TOUCH_TARGET_MIN);
    expect(UI_CONSTANTS.LAYOUT.SIDEBAR_MIN_WIDTH).toBeLessThan(UI_CONSTANTS.LAYOUT.SIDEBAR_MAX_WIDTH);
  });
  
  it('should have proper z-index hierarchy', () => {
    const zIndexes = Object.values(UI_CONSTANTS.Z_INDEX);
    
    // Should be in ascending order
    for (let i = 1; i < zIndexes.length; i++) {
      expect(zIndexes[i]).toBeGreaterThan(zIndexes[i - 1]);
    }
  });
});

describe('UI Guards - Edge Cases', () => {
  it('should handle zero dimensions', () => {
    const result = validateComponentSize(0, 0, {
      minWidth: 100,
      minHeight: 100,
    });
    
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(2);
  });
  
  it('should handle negative dimensions', () => {
    const result = validateComponentSize(-10, -5, {
      minWidth: 0,
      minHeight: 0,
    });
    
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(2);
  });
  
  it('should handle empty class names', () => {
    const result = validateTailwindClasses('');
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
  
  it('should handle whitespace in class names', () => {
    const result = validateTailwindClasses('  p-4   m-2  ');
    expect(result.valid).toBe(true);
  });
  
  it('should handle layout validation with no constraints', () => {
    const result = LayoutGuard.validateLayout({});
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

describe('UI Guards - Performance', () => {
  it('should validate large numbers of classes efficiently', () => {
    const manyClasses = Array(100).fill('p-4 m-2 w-64 h-32').join(' ');
    const start = performance.now();
    
    const result = validateTailwindClasses(manyClasses);
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
    expect(result.valid).toBe(true);
  });
  
  it('should handle multiple size validations efficiently', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      validateComponentSize(100 + i, 200 + i, {
        minWidth: 50,
        maxWidth: 2000,
        minHeight: 50,
        maxHeight: 2000,
      });
    }
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });
});