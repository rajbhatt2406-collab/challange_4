'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GateOccupancy {
  id: string;
  name: string;
  occupancy: number;
}

export interface GateAlert {
  id: string;
  gateId: string;
  gateName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommended_action: string;
  confidence: number;
  timestamp: string;
}

/**
 * SIMULATED DEMO DATA - Hook to simulate live sensor feed of stadium gate occupancies.
 * Emits updates every 6 seconds, and evaluates them.
 * Triggers Gemini alert requests when gates cross the 85% crowd density threshold.
 */
export function useGateOccupancy(onAlertTriggered?: (alert: GateAlert) => void) {
  const [gates, setGates] = useState<GateOccupancy[]>([
    { id: 'gate-a', name: 'Gate A (North Entrance)', occupancy: 65 },
    { id: 'gate-b', name: 'Gate B (East Entrance)', occupancy: 82 },
    { id: 'gate-c', name: 'Gate C (South Entrance)', occupancy: 70 },
    { id: 'gate-d', name: 'Gate D (West Entrance)', occupancy: 40 }
  ]);

  const [alerts, setAlerts] = useState<GateAlert[]>([]);
  const [isAlertLoading, setIsAlertLoading] = useState<Record<string, boolean>>({});
  
  // Track which gates have active alerts to prevent duplicate triggers while they remain high
  const activeAlertGatesRef = useRef<Set<string>>(new Set());

  // Call the Gemini API to analyze the crowd warning
  const triggerAlertAPI = useCallback(async (gateId: string, gateName: string, occupancy: number) => {
    // Prevent double requests
    setIsAlertLoading(prev => ({ ...prev, [gateId]: true }));
    activeAlertGatesRef.current.add(gateId);

    try {
      const response = await fetch('/api/ops-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gateId, occupancy })
      });

      if (!response.ok) throw new Error('Failed to evaluate crowd alert');

      const data = await response.json();
      const newAlert: GateAlert = {
        id: `alert-${Date.now()}-${gateId}`,
        gateId,
        gateName,
        severity: data.severity,
        message: data.message,
        recommended_action: data.recommended_action,
        confidence: data.confidence,
        timestamp: new Date().toLocaleTimeString()
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 15)); // Keep last 15 alerts
      if (onAlertTriggered) {
        onAlertTriggered(newAlert);
      }
    } catch (err) {
      console.error('Error generating gate alert:', err);
      // Remove from active so we can try again on next sensor reading
      activeAlertGatesRef.current.delete(gateId);
    } finally {
      setIsAlertLoading(prev => ({ ...prev, [gateId]: false }));
    }
  }, [onAlertTriggered]);

  useEffect(() => {
    // Throttled sensor simulation tick (runs every 6 seconds to keep rate limits healthy)
    const intervalId = setInterval(() => {
      setGates((currentGates) => {
        return currentGates.map((gate) => {
          // Calculate random shift - simulated fan flow entering/exiting
          const shift = Math.floor((Math.random() - 0.4) * 8); // slight upward bias
          const newOccupancy = Math.min(100, Math.max(15, gate.occupancy + shift));

          // Threshold evaluated at 85%
          if (newOccupancy >= 85) {
            if (!activeAlertGatesRef.current.has(gate.id) && !isAlertLoading[gate.id]) {
              triggerAlertAPI(gate.id, gate.name, newOccupancy);
            }
          } else {
            // Clear flag when gate clears below 85%
            if (activeAlertGatesRef.current.has(gate.id)) {
              activeAlertGatesRef.current.delete(gate.id);
            }
          }

          return { ...gate, occupancy: newOccupancy };
        });
      });
    }, 6000);

    return () => clearInterval(intervalId);
  }, [isAlertLoading, triggerAlertAPI]);

  return {
    gates,
    alerts,
    isAlertLoading
  };
}
