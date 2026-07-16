'use client';

import React, { useCallback } from 'react';
import { useTransportOccupancy, TransportAlert } from './useTransportOccupancy';
import { useAccessibility } from '@/features/accessibility/AccessibilityContext';
import { Bus, AlertTriangle, Car, RefreshCw } from 'lucide-react';

export default function TransportAdvisory() {
  const { announce } = useAccessibility();

  // Alert Callback - Announce to Screen Readers via accessibility context
  const handleAlertTriggered = useCallback((alert: TransportAlert) => {
    announce(`TRANSPORT ALERT: ${alert.severity.toUpperCase()} congestion at ${alert.transportName}. ${alert.message}`);
  }, [announce]);

  const { sectors, alerts, isAlertLoading } = useTransportOccupancy(handleAlertTriggered);

  return (
    <div 
      className="bg-scoreboard-black/40 border border-emerald-950/80 rounded-xl p-4 lg:p-6 space-y-6" 
      role="region" 
      aria-label="Transportation and Congestion Advisory Panel"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-emerald-950/80 pb-4">
        <div>
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bus className="w-4 h-4 text-scoreboard-green" />
            LIVE TRANSIT & PARKING RADAR
          </h3>
          <p className="text-[10px] font-mono text-emerald-600 block mt-0.5 tracking-wider">
            SHUTTLES // OVERFLOW PARKING // TRANSIT ROUTING
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-500 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-950">
          <span className="w-1.5 h-1.5 rounded-full bg-scoreboard-green animate-pulse" />
          MONITORING ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sectors Occupancy List */}
        <div className="md:col-span-7 space-y-4">
          <h4 className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider">
            Capacity Monitor (Threshold: 85%)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sectors.map((sector) => {
              const isOverLimit = sector.occupancy >= 85;
              const Icon = sector.type === 'shuttle' ? Bus : Car;
              return (
                <div 
                  key={sector.id}
                  className={`bg-scoreboard-black/80 rounded-lg p-4 border transition-all ${
                    isOverLimit 
                      ? 'border-scoreboard-red/60 shadow-lg glow-border-red bg-scoreboard-red/5' 
                      : 'border-emerald-950 hover:border-emerald-900'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono font-semibold text-chalk-white flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-emerald-500" />
                      {sector.name}
                    </span>
                    <span className={`text-sm font-mono font-bold ${
                      isOverLimit ? 'text-scoreboard-red' : 'text-scoreboard-green'
                    }`}>
                      {sector.occupancy}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-emerald-950/40 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverLimit ? 'bg-scoreboard-red' : 'bg-scoreboard-green'
                      }`}
                      style={{ width: `${sector.occupancy}%` }}
                    />
                  </div>

                  {isAlertLoading[sector.id] && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <RefreshCw className="w-2.5 h-2.5 text-scoreboard-amber animate-spin" />
                      <span className="text-[9px] font-mono text-scoreboard-amber block animate-pulse">
                        EVALUATING ROUTING PATH...
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Transit Alerts Feed */}
        <div className="md:col-span-5 flex flex-col">
          <h4 className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-scoreboard-amber" />
            TRANSIT WARNING LOG
          </h4>

          <div className="flex-1 space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="h-32 flex items-center justify-center border border-dashed border-emerald-950 rounded text-center text-xs text-emerald-800 font-mono">
                NO SECTOR ALERTS ACTIVE
              </div>
            ) : (
              alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="p-3 bg-scoreboard-black border border-scoreboard-red/30 rounded-lg flex flex-col gap-1 text-xs font-mono"
                  role="status"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-scoreboard-red uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-scoreboard-red animate-pulse" />
                      CONGESTION: {alert.transportName}
                    </span>
                    <span className="text-[9px] text-emerald-600">{alert.timestamp}</span>
                  </div>
                  <p className="text-chalk-white mt-1 leading-relaxed text-[11px]">{alert.message}</p>
                  <div className="mt-2 bg-scoreboard-red/10 border border-scoreboard-red/20 rounded p-1.5 text-[10px] text-scoreboard-red">
                    <span className="font-bold block">RECOMMENDED REDIRECT:</span>
                    {alert.recommended_action}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
