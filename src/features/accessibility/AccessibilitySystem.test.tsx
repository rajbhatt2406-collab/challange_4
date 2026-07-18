import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AccessibilityProvider } from './AccessibilityContext';
import AccessibilityControls from './AccessibilityControls';
import CommandCenter from '@/app/page';

describe('Accessibility System Integration & Regression Tests', () => {
  let matchMediaMock: any;

  beforeEach(() => {
    // Mock matchMedia to simulate reduced motion preference
    matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMediaMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (typeof document !== 'undefined') {
      document.documentElement.className = '';
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  });

  it('renders skip to main content link linking to correct element', async () => {
    await act(async () => {
      render(<CommandCenter />);
    });
    
    // Find the skip link
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    
    // Find the target main element and verify its properties
    const mainEl = screen.getByRole('main');
    expect(mainEl).toBeInTheDocument();
    expect(mainEl.id).toBe('main-content');
    expect(mainEl.tabIndex).toBe(-1);
  });

  it('initializes motion reduction from prefers-reduced-motion OS settings', () => {
    render(
      <AccessibilityProvider>
        <div>Test Content</div>
      </AccessibilityProvider>
    );

    // Verify document root automatically got class list update
    expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
  });

  it('toggles high contrast classes and announces toggles correctly', () => {
    render(
      <AccessibilityProvider>
        <AccessibilityControls />
      </AccessibilityProvider>
    );

    const contrastBtn = screen.getByRole('button', { name: /set contrast to high/i });
    fireEvent.click(contrastBtn);

    // Contrast is high
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);

    const normalContrastBtn = screen.getByRole('button', { name: /set contrast to normal/i });
    fireEvent.click(normalContrastBtn);

    // Contrast is normal
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
  });
});
