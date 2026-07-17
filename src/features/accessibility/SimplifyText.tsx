'use client';

// Problem statement: Accessibility (Cognitive) — Gemini streams plain-language rewrites
// of dense operations text for fans with cognitive disabilities or non-native speakers.
import React, { useState } from 'react';
import { Sparkles, ArrowLeftRight } from 'lucide-react';
import { useAccessibility } from './AccessibilityContext';
import AiGeneratedBadge from '@/components/AiGeneratedBadge';

interface SimplifyTextProps {
  children: string;
  className?: string;
}

/**
 * Accessibility helper component. Wraps dense text blocks with a "Simplify Text" trigger
 * that calls Gemini to stream a plain-language rewrite.
 */
export default function SimplifyText({ children, className = '' }: SimplifyTextProps) {
  const { announce } = useAccessibility();
  const [isSimplified, setIsSimplified] = useState(false);
  const [simplifiedText, setSimplifiedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSimplify = async () => {
    if (isSimplified) {
      // Toggle back to original
      setIsSimplified(false);
      announce('Restored original technical text description.');
      return;
    }

    setIsLoading(true);
    setSimplifiedText('');
    announce('Simplifying text to plain language...');

    try {
      const response = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: children })
      });

      if (!response.ok) throw new Error('Simplify failed');

      setIsSimplified(true);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let resultText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          resultText += chunk;
          setSimplifiedText(resultText);
        }
      }
      announce('Text simplified successfully.');
    } catch (err) {
      console.error('Error simplifying text:', err);
      announce('Failed to simplify text. Restoring original.');
      setIsSimplified(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-2 border-l-2 border-emerald-900/40 pl-3 ${className}`}>
      <div className="font-sans leading-relaxed text-sm">
        {isLoading ? (
          <span className="text-emerald-500 animate-pulse font-mono text-xs">
            [REWRITING TEXT TO PLAIN LANGUAGE: STREAMING CHUNKS...]
          </span>
        ) : isSimplified ? (
          <>
            <span className="text-emerald-200">{simplifiedText}</span>
            <AiGeneratedBadge className="mt-1" label="Simplified by Gemini AI" />
          </>
        ) : (
          <span>{children}</span>
        )}
      </div>

      <button
        onClick={handleSimplify}
        disabled={isLoading}
        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-900/60 rounded focus-visible:ring-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
        aria-label={isSimplified ? "Show original dense text" : "Simplify this text to plain language"}
      >
        {isSimplified ? (
          <>
            <ArrowLeftRight className="w-3 h-3 text-emerald-400" aria-hidden="true" />
            SHOW ORIGINAL
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 text-scoreboard-green animate-pulse" aria-hidden="true" />
            SIMPLIFY THIS TEXT
          </>
        )}
      </button>
    </div>
  );
}
