'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontScale = 'normal' | 'large' | 'xlarge';
export type ContrastTheme = 'normal' | 'high';

interface AccessibilityContextType {
  fontScale: FontScale;
  contrastTheme: ContrastTheme;
  motionReduction: boolean;
  plainLanguageMode: boolean;
  announcement: string;
  setFontScale: (scale: FontScale) => void;
  setContrastTheme: (theme: ContrastTheme) => void;
  setMotionReduction: (reduce: boolean) => void;
  setPlainLanguageMode: (active: boolean) => void;
  announce: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScale] = useState<FontScale>('normal');
  const [contrastTheme, setContrastTheme] = useState<ContrastTheme>('normal');
  const [motionReduction, setMotionReduction] = useState<boolean>(false);
  const [plainLanguageMode, setPlainLanguageMode] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  // Synchronize motionReduction state with system preferences
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionReduction(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setMotionReduction(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, []);

  // Handle document class modifications for global settings
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Apply high contrast class
    if (contrastTheme === 'high') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply motion reduction class
    if (motionReduction) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Apply font scale class
    root.classList.remove('font-scale-lg', 'font-scale-xl');
    if (fontScale === 'large') {
      root.classList.add('font-scale-lg');
    } else if (fontScale === 'xlarge') {
      root.classList.add('font-scale-xl');
    }
  }, [fontScale, contrastTheme, motionReduction]);

  // Method to announce messages to screen readers using aria-live
  const announce = (message: string) => {
    setAnnouncement(message);
    // Clear announcement after screen readers read it so it can be re-triggered
    setTimeout(() => {
      setAnnouncement((prev) => (prev === message ? '' : prev));
    }, 3000);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontScale,
        contrastTheme,
        motionReduction,
        plainLanguageMode,
        announcement,
        setFontScale,
        setContrastTheme,
        setMotionReduction,
        setPlainLanguageMode,
        announce
      }}
    >
      {children}
      {/* Screen Reader Live Region - Visually Hidden */}
      <div
        id="sr-live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only absolute w-px h-px p-0 -m-px overflow-hidden clip-rect-0 border-0"
        style={{
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap'
        }}
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
