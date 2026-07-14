'use client';

import React from 'react';
import { useAccessibility } from './AccessibilityContext';
import { Type, Eye, ShieldAlert, ZapOff } from 'lucide-react';

/**
 * Settings panel control widget for accessibility adjustments.
 * Integrates directly with AccessibilityContext.
 */
export default function AccessibilityControls() {
  const {
    fontScale,
    setFontScale,
    contrastTheme,
    setContrastTheme,
    motionReduction,
    setMotionReduction,
    plainLanguageMode,
    setPlainLanguageMode,
    announce
  } = useAccessibility();

  return (
    <div 
      className="bg-scoreboard-black border border-emerald-950 rounded-xl p-4 space-y-4"
      role="region"
      aria-label="Accessibility Settings Panel"
    >
      <h3 className="text-xs font-mono text-scoreboard-green uppercase tracking-widest flex items-center gap-1.5 border-b border-emerald-950/80 pb-2">
        <ShieldAlert className="w-4 h-4 text-scoreboard-green" />
        Accessibility Override Layer
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        
        {/* 1. Font Scale */}
        <div className="space-y-2">
          <span className="text-[10px] text-emerald-600 uppercase flex items-center gap-1">
            <Type className="w-3.5 h-3.5" />
            Font Scale
          </span>
          <div className="flex gap-1 bg-emerald-950/20 p-1 border border-emerald-900/60 rounded">
            {(['normal', 'large', 'xlarge'] as const).map((scale) => (
              <button
                key={scale}
                onClick={() => {
                  setFontScale(scale);
                  announce(`Font scale set to ${scale}`);
                }}
                className={`flex-1 py-1 rounded text-[10px] text-center font-bold transition-colors cursor-pointer uppercase ${
                  fontScale === scale
                    ? 'bg-scoreboard-green text-scoreboard-black'
                    : 'text-emerald-400 hover:bg-emerald-900/40'
                }`}
                aria-label={`Set font scale to ${scale}`}
              >
                {scale === 'xlarge' ? 'XL' : scale === 'large' ? 'LG' : 'MD'}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Contrast Theme */}
        <div className="space-y-2">
          <span className="text-[10px] text-emerald-600 uppercase flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            Contrast
          </span>
          <div className="flex gap-1 bg-emerald-950/20 p-1 border border-emerald-900/60 rounded">
            {(['normal', 'high'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => {
                  setContrastTheme(theme);
                  announce(`Contrast set to ${theme}`);
                }}
                className={`flex-1 py-1 rounded text-[10px] text-center font-bold transition-colors cursor-pointer uppercase ${
                  contrastTheme === theme
                    ? 'bg-scoreboard-green text-scoreboard-black'
                    : 'text-emerald-400 hover:bg-emerald-900/40'
                }`}
                aria-label={`Set contrast to ${theme}`}
              >
                {theme === 'high' ? 'High' : 'Normal'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Reduced Motion */}
        <div className="space-y-2">
          <span className="text-[10px] text-emerald-600 uppercase flex items-center gap-1">
            <ZapOff className="w-3.5 h-3.5" />
            Motion Reducer
          </span>
          <button
            onClick={() => {
              setMotionReduction(!motionReduction);
              announce(`Motion reduction turned ${!motionReduction ? 'on' : 'off'}`);
            }}
            className={`w-full py-1.5 border rounded text-[10px] font-bold transition-colors cursor-pointer uppercase ${
              motionReduction
                ? 'bg-scoreboard-green text-scoreboard-black border-scoreboard-green'
                : 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400 hover:bg-emerald-900/40'
            }`}
            aria-label={motionReduction ? "Disable motion reduction" : "Enable motion reduction"}
          >
            {motionReduction ? 'REDUCED' : 'ACTIVE'}
          </button>
        </div>

        {/* 4. Plain Language Global Filter */}
        <div className="space-y-2">
          <span className="text-[10px] text-emerald-600 uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Plain Language
          </span>
          <button
            onClick={() => {
              setPlainLanguageMode(!plainLanguageMode);
              announce(`Plain language filter turned ${!plainLanguageMode ? 'on' : 'off'}`);
            }}
            className={`w-full py-1.5 border rounded text-[10px] font-bold transition-colors cursor-pointer uppercase ${
              plainLanguageMode
                ? 'bg-scoreboard-green text-scoreboard-black border-scoreboard-green'
                : 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400 hover:bg-emerald-900/40'
            }`}
            aria-label={plainLanguageMode ? "Disable plain language filter" : "Enable plain language filter"}
          >
            {plainLanguageMode ? 'SIMPLIFIED' : 'DETAILED'}
          </button>
        </div>

      </div>
    </div>
  );
}
