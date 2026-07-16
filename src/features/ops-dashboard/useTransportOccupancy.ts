'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface TransportOccupancy {
  id: string;
  name: string;
  type: 'shuttle' | 'parking';
  occupancy: number;
}

export interface TransportAlert {
  id: string;
  transportId: string;
  transportName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommended_action: string;
  confidence: number;
  timestamp: string;
}

/**
 * SIMULATED DEMO DATA - Hook to simulate live sensor feed of transit and parking capacities.
 * Emits updates every 6 seconds, and evaluates them.
 * Triggers Gemini alert requests when occupancy crosses the 85% safety/congestion threshold.
 */
export function useTransportOccupancy(onAlertTriggered?: (alert: TransportAlert) => void) {
  const [sectors, setSectors] = useState<TransportOccupancy[]>([
    { id: 'shuttle-express', name: 'Lot A Shuttle (Express)', type: 'shuttle', occupancy: 60 },
    { id: 'shuttle-regional', name: 'Lot B Shuttle (Regional)', type: 'shuttle', occupancy: 75 },
    { id: 'lot-west', name: 'Parking Lot C (West Deck)', type: 'parking', occupancy: 55 },
    { id: 'lot-east', name: 'Parking Lot D (East Lot)', type: 'parking', occupancy: 70 }
  ]);

  const [alerts, setAlerts] = useState<TransportAlert[]>([]);
  const [isAlertLoading, setIsAlertLoading] = useState<Record<string, boolean>>({});
  
  // Track which sectors have active alerts to prevent duplicate triggers while they remain high
  const activeAlertSectorsRef = useRef<Set<string>>(new Set());

  // Call the Gemini API to analyze the transit alert
  const triggerAlertAPI = useCallback(async (transportId: string, transportName: string, occupancy: number) => {
    // Prevent double requests
    setIsAlertLoading(prev => ({ ...prev, [transportId]: true }));
    activeAlertSectorsRef.current.add(transportId);

    try {
      const response = await fetch('/api/transport-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transportId, occupancy })
      });

      if (!response.ok) throw new Error('Failed to evaluate transit alert');

      const data = await response.json();
      const newAlert: TransportAlert = {
        id: `alert-${Date.now()}-${transportId}`,
        transportId,
        transportName,
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
      console.error('Error generating transit alert:', err);
      // Remove from active so we can try again on next sensor reading
      activeAlertSectorsRef.current.delete(transportId);
    } finally {
      setIsAlertLoading(prev => ({ ...prev, [transportId]: false }));
    }
  }, [onAlertTriggered]);

  useEffect(() => {
    // Throttled sensor simulation tick (runs every 6 seconds to match gate occupancy alerts)
    const intervalId = setInterval(() => {
      setSectors((currentSectors) => {
        return currentSectors.map((sector) => {
          // Calculate random shift - simulated fans arriving/parking
          const shift = Math.floor((Math.random() - 0.4) * 8); // slight upward bias
          const newOccupancy = Math.min(100, Math.max(15, sector.occupancy + shift));

          // Threshold evaluated at 85%
          if (newOccupancy >= 85) {
            if (!activeAlertSectorsRef.current.has(sector.id) && !isAlertLoading[sector.id]) {
              triggerAlertAPI(sector.id, sector.name, newOccupancy);
            }
          } else {
            // Clear flag when occupancy clears below 85%
            if (activeAlertSectorsRef.current.has(sector.id)) {
              activeAlertSectorsRef.current.delete(sector.id);
            }
          }

          return { ...sector, occupancy: newOccupancy };
        });
      });
    }, 6000);

    return () => clearInterval(intervalId);
  }, [isAlertLoading, triggerAlertAPI]);

  return {
    sectors,
    alerts,
    isAlertLoading
  };
}
