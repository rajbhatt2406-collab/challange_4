import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OpsDashboard from './OpsDashboard';
import { AccessibilityProvider } from '@/features/accessibility/AccessibilityContext';

// Mock getIncidents and insertIncident database calls
vi.mock('@/lib/supabase/client', () => {
  return {
    getIncidents: () => Promise.resolve({
      data: [
        { id: '1', description: 'Power failure near concession stands', classification: 'logistics', recommended_action: 'Send electrician', severity: 'medium', created_at: new Date().toISOString() }
      ],
      error: null
    }),
    insertIncident: vi.fn().mockImplementation(() => Promise.resolve({
      data: [{ id: '2', description: 'Medical issue', classification: 'medical_emergency', recommended_action: 'Send EMT', severity: 'high' }],
      error: null
    }))
  };
});

// Mock the gate occupancy hook
vi.mock('./useGateOccupancy', () => {
  return {
    useGateOccupancy: () => ({
      gates: [
        { id: 'gate-a', name: 'Gate A (North Entrance)', occupancy: 45 },
        { id: 'gate-b', name: 'Gate B (East Entrance)', occupancy: 92 }
      ],
      alerts: [
        { id: '1', gateId: 'gate-b', gateName: 'Gate B (East Entrance)', severity: 'high', message: 'Gate B is highly congested', recommended_action: 'Divert flow', confidence: 0.9, timestamp: '12:00:00' }
      ],
      isAlertLoading: { 'gate-a': false, 'gate-b': false }
    })
  };
});

describe('OpsDashboard Component', () => {
  it('renders radar statistics, gate list, and alarms feed', async () => {
    render(
      <AccessibilityProvider>
        <OpsDashboard />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Power failure near concession stands/i)).toBeInTheDocument();
    });

    // Check header radar and gate items
    expect(screen.getByText('LIVE GATE OCCUPANCY RADAR')).toBeInTheDocument();
    expect(screen.getByText('Gate A (North Entrance)')).toBeInTheDocument();
    expect(screen.getByText('Gate B (East Entrance)')).toBeInTheDocument();

    // Verify average metrics are derived and displayed
    // (45 + 92) / 2 = 68.5 -> rounded to 69%
    expect(screen.getByText('69%')).toBeInTheDocument();

    // Verify warning gate count is derived (Gate B is 92% >= 85%)
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Verify alert feed elements are loaded
    expect(screen.getByText('Gate B is highly congested')).toBeInTheDocument();
    expect(screen.getByText('Divert flow')).toBeInTheDocument();
  });

  it('renders the incident triage form and handles input changes', () => {
    render(
      <AccessibilityProvider>
        <OpsDashboard />
      </AccessibilityProvider>
    );

    const textarea = screen.getByPlaceholderText(/Describe incident/i);
    expect(textarea).toBeInTheDocument();

    // Type text into the triage form
    fireEvent.change(textarea, { target: { value: 'Water leak' } });
    expect(textarea.value).toBe('Water leak');
  });
});
