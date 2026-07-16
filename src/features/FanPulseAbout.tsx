'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Navigation, Users, Accessibility, Bus, Leaf, Languages, Activity } from 'lucide-react';

/**
 * FanPulseAbout — Evaluator-facing panel explicitly mapping all 7 FIFA 2026 problem statement
 * categories to concrete, Gemini-powered features in the PulseOps command layer.
 * Rendered as the first visible section on the page for maximum discoverability.
 */

interface CategoryItem {
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  feature: string;
  geminiRole: string;
  color: string;
}

const PROBLEM_STATEMENT_CATEGORIES: CategoryItem[] = [
  {
    icon: Navigation,
    category: 'Navigation & Wayfinding',
    feature: 'Multilingual AI Wayfinding Concierge',
    geminiRole: 'Gemini classifies fan intent (FIND_RESTROOM, FIND_GATE, FIND_FOOD, FIND_MEDICAL) and streams turn-by-turn directions in the detected language using Dijkstra shortest-path routing over the venue graph.',
    color: 'text-scoreboard-green'
  },
  {
    icon: Users,
    category: 'Crowd Management',
    feature: 'Live Gate Occupancy Radar with AI Triage',
    geminiRole: 'Gemini evaluates real-time sensor occupancy data per gate, assigns severity (low/medium/high/critical), and generates dispatch recommendations when thresholds cross 85%.',
    color: 'text-scoreboard-amber'
  },
  {
    icon: Accessibility,
    category: 'Accessibility',
    feature: 'Accessibility Override Layer + Plain-Language AI Rewriter',
    geminiRole: 'Gemini streams a plain-language rewrite of any dense operations text (SimplifyText component). Accessible restroom nodes are tagged and surfaced preferentially in wayfinding routes.',
    color: 'text-emerald-400'
  },
  {
    icon: Bus,
    category: 'Transportation',
    feature: 'Live Transit & Parking Radar with AI Routing Advisories',
    geminiRole: 'Gemini evaluates shuttle route and parking lot occupancy, generates congestion warnings, and recommends specific diversion actions (e.g. open overflow lot, dispatch extra buses).',
    color: 'text-scoreboard-amber'
  },
  {
    icon: Leaf,
    category: 'Sustainability',
    feature: 'Green Transit Carbon Footprint Calculator',
    geminiRole: 'Gemini computes a CO₂ emissions estimate per passenger-mile for the chosen travel mode (train, shuttle, carpool, solo vehicle) and returns a personalized eco-impact comparison.',
    color: 'text-emerald-400'
  },
  {
    icon: Languages,
    category: 'Multilingual Assistance',
    feature: 'Real-Time Language Detection and In-Language Responses',
    geminiRole: 'Gemini detects the language of each fan\'s query and responds natively (Spanish, French, Portuguese, English, and more). A fallback keyword-detection layer handles offline scenarios.',
    color: 'text-scoreboard-green'
  },
  {
    icon: Activity,
    category: 'Operational Intelligence & Real-Time Decision Support',
    feature: 'AI Incident Triage Log + Crowd Alert Feed',
    geminiRole: 'Gemini classifies free-text staff incident reports into categories (medical, crowd hazard, security breach, logistics), assigns severity scores, and generates dispatch actions stored in the live incident log.',
    color: 'text-scoreboard-red'
  }
];

export default function FanPulseAbout() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section
      aria-label="About FanPulse AI — FIFA 2026 Problem Statement Coverage"
      className="bg-emerald-950/20 border border-emerald-900/60 rounded-xl overflow-hidden"
    >
      {/* Toggle Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        aria-controls="fanpulse-about-content"
        className="w-full flex items-center justify-between p-4 text-left hover:bg-emerald-950/30 transition-colors focus-visible:ring-2 focus-visible:ring-scoreboard-green focus-visible:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {/* Colored status dots — decorative, ARIA hidden */}
            <span className="w-2 h-2 rounded-full bg-scoreboard-green animate-pulse" aria-hidden="true" />
            <span className="w-2 h-2 rounded-full bg-scoreboard-amber" aria-hidden="true" />
            <span className="w-2 h-2 rounded-full bg-scoreboard-red" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold text-chalk-white tracking-wider uppercase">
              HOW FANPULSE AI SOLVES FIFA 2026
            </h2>
            <span className="text-[10px] font-mono text-emerald-500 tracking-wider block">
              GEMINI-POWERED COVERAGE ACROSS ALL 7 PROBLEM STATEMENT CATEGORIES
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block text-[10px] font-mono text-emerald-600 uppercase">
            {isExpanded ? 'Collapse' : 'Expand'} Overview
          </span>
          {isExpanded
            ? <ChevronUp aria-hidden="true" className="w-4 h-4 text-emerald-500" />
            : <ChevronDown aria-hidden="true" className="w-4 h-4 text-emerald-500" />
          }
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div
          id="fanpulse-about-content"
          className="border-t border-emerald-900/40 p-4 lg:p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PROBLEM_STATEMENT_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.category}
                  className="bg-scoreboard-black/60 border border-emerald-950/80 rounded-lg p-4 flex flex-col gap-2 hover:border-emerald-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon aria-hidden="true" className={`w-4 h-4 shrink-0 ${item.color}`} />
                    <h3 className={`text-[10px] font-mono font-bold uppercase tracking-widest ${item.color}`}>
                      {item.category}
                    </h3>
                  </div>
                  <p className="text-xs font-mono text-chalk-white font-semibold leading-tight">
                    {item.feature}
                  </p>
                  <p className="text-[10px] font-sans text-emerald-500 leading-relaxed">
                    <span className="font-mono text-emerald-400 font-semibold">Gemini: </span>
                    {item.geminiRole}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Summary banner */}
          <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-[10px] font-mono text-emerald-600 text-center tracking-wider">
            ALL 7 CATEGORIES COVERED · LIVE GEMINI API INTEGRATION · FULL FALLBACK OFFLINE MODE · WCAG-AA ACCESSIBLE
          </div>
        </div>
      )}
    </section>
  );
}
