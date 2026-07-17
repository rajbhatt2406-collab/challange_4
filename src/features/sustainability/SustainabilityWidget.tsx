'use client';

// Problem statement: Sustainability & Eco Nudge — Gemini computes CO₂ emissions per
// passenger-mile for the fan's chosen travel mode and returns a personalized eco-comparison.
import React, { useState } from 'react';
import { Leaf, Train, Bus, Users, Car, Sparkles } from 'lucide-react';
import { useAccessibility } from '@/features/accessibility/AccessibilityContext';
import AiGeneratedBadge from '@/components/AiGeneratedBadge';

type TransportMode = 'train' | 'shuttle' | 'carpool' | 'solo_vehicle';

const MODE_DETAILS = {
  train: { label: 'Metrolink Train', icon: Train, desc: 'High-speed mass transit direct to the gates.' },
  shuttle: { label: 'Electric Shuttle', icon: Bus, desc: 'Eco-friendly shuttles running from nearby lots.' },
  carpool: { label: 'Carpool (3+)', icon: Users, desc: 'Shared ride with parking priority tags.' },
  solo_vehicle: { label: 'Single Occupancy Vehicle', icon: Car, desc: 'Standard parking with standard lane transit.' }
};

export default function SustainabilityWidget() {
  const { announce } = useAccessibility();
  const [selectedMode, setSelectedMode] = useState<TransportMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ estimate: string; comparison: string } | null>(null);

  const handleSelectMode = async (mode: TransportMode) => {
    setSelectedMode(mode);
    setIsLoading(true);
    setResult(null);
    announce(`Calculating carbon footprints for choice: ${MODE_DETAILS[mode].label}`);

    try {
      const res = await fetch('/api/sustainability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transportMode: mode })
      });

      if (!res.ok) throw new Error('Sustainability check failed');

      const data = await res.json();
      setResult(data);
      announce(`Calculation done. Estimate: ${data.estimate}. Description: ${data.comparison}`);
    } catch (err) {
      console.error('Sustainability check error:', err);
      announce('Unable to fetch eco audit. Please try again shortly.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="bg-scoreboard-black/40 border border-emerald-950/80 rounded-xl p-4 lg:p-6"
      role="region"
      aria-label="Sustainability Nudge Widget"
    >
      <h3 className="text-xs font-mono text-scoreboard-green uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Leaf className="w-4 h-4 text-scoreboard-green" aria-hidden="true" />
        GREEN TRANSIT CALCULATOR
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Selection Column */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block mb-1">
            Choose Your Matchday Travel Mode:
          </span>
          
          <div className="grid grid-cols-1 gap-2.5">
            {(Object.keys(MODE_DETAILS) as TransportMode[]).map((mode) => {
              const info = MODE_DETAILS[mode];
              const Icon = info.icon;
              const isSelected = selectedMode === mode;

              return (
                <button
                  key={mode}
                  onClick={() => handleSelectMode(mode)}
                  disabled={isLoading}
                  className={`p-3 rounded-lg border text-left flex gap-3 items-start transition-all cursor-pointer focus-visible:ring-2 disabled:opacity-60 ${
                    isSelected
                      ? 'bg-pitch-green-dark border-scoreboard-green/60 glow-border-green'
                      : 'bg-scoreboard-black/60 border-emerald-950 hover:border-emerald-900/60'
                  }`}
                  aria-label={`Calculate footprint for transit mode: ${info.label}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-scoreboard-green' : 'text-emerald-500'}`} aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-bold text-chalk-white">{info.label}</span>
                    <span className="text-[10px] text-emerald-400 mt-0.5">{info.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Column */}
        <div className="bg-scoreboard-black/80 rounded-lg border border-emerald-950 p-4 flex flex-col justify-center min-h-[180px]">
          {isLoading ? (
            <div className="space-y-2 text-center">
              <Leaf className="w-8 h-8 text-scoreboard-green animate-spin mx-auto" aria-hidden="true" />
              <span className="text-xs font-mono text-emerald-400 animate-pulse block">
                COMPUTING ECO FOOTPRINT ESTIMATE...
              </span>
            </div>
          ) : result ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="border-b border-emerald-950 pb-2">
                <span className="text-[9px] text-emerald-400 uppercase block">Estimated Carbon Impact:</span>
                <span className="text-xl font-bold text-scoreboard-green glow-green block mt-1">
                  {result.estimate} <span className="text-xs font-normal text-emerald-400">/ mile</span>
                </span>
              </div>
              <div>
                <span className="text-[9px] text-emerald-400 uppercase block flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-scoreboard-green animate-pulse" aria-hidden="true" />
                  Eco Suggestion:
                </span>
                <p className="font-sans text-xs text-chalk-white leading-relaxed mt-1">
                  {result.comparison}
                </p>
              </div>
              <AiGeneratedBadge label="Carbon estimate by Gemini AI" />
            </div>
          ) : (
            <div className="text-center text-xs text-emerald-400/80 font-mono py-8">
              Select a transportation mode to calculate emissions and view ecological comparisons.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
