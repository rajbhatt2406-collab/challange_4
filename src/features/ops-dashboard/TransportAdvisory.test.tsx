import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TransportAdvisory from './TransportAdvisory';
import { AccessibilityProvider } from '@/features/accessibility/AccessibilityContext';

// Mock the transport occupancy hook
vi.mock('./useTransportOccupancy', () => {
  return {
    useTransportOccupancy: () => ({
      sectors: [
        { id: 'shuttle-express', name: 'Lot A Shuttle (Express)', type: 'shuttle', occupancy: 45 },
        { id: 'lot-west', name: 'Parking Lot C (West Deck)', type: 'parking', occupancy: 92 }
      ],
      alerts: [
        { 
          id: 'alert-1', 
          transportId: 'lot-west', 
          transportName: 'Parking Lot C (West Deck)', 
          severity: 'high', 
          message: 'Parking Lot C is nearly full!', 
          recommended_action: 'Redirect incoming traffic to Lot E.', 
          confidence: 0.95, 
          timestamp: '12:00:00' 
        }
      ],
      isAlertLoading: { 'shuttle-express': false, 'lot-west': false }
    })
  };
});

describe('TransportAdvisory Component', () => {
  it('renders the transit radar header, sector names, and active warnings feed', () => {
    render(
      <AccessibilityProvider>
        <TransportAdvisory />
      </AccessibilityProvider>
    );

    // Verify header and section titles are present
    expect(screen.getByText('LIVE TRANSIT & PARKING RADAR')).toBeInTheDocument();
    expect(screen.getByText('SHUTTLES // OVERFLOW PARKING // TRANSIT ROUTING')).toBeInTheDocument();

    // Verify mock sectors are rendered with correct occupancy values
    expect(screen.getByText('Lot A Shuttle (Express)')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    
    expect(screen.getByText('Parking Lot C (West Deck)')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();

    // Verify warning logs and recommendation messages are displayed
    expect(screen.getByText('CONGESTION: Parking Lot C (West Deck)')).toBeInTheDocument();
    expect(screen.getByText('Parking Lot C is nearly full!')).toBeInTheDocument();
    expect(screen.getByText('Redirect incoming traffic to Lot E.')).toBeInTheDocument();
  });
});
