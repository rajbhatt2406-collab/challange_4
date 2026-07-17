import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OpsDashboard from './OpsDashboard';
import { AccessibilityProvider } from '@/features/accessibility/AccessibilityContext';

const mockGetIncidents = vi.fn().mockResolvedValue({
  data: [
    {
      id: 'inc-1',
      description: 'Water leak Section 120',
      classification: 'facility_damage',
      recommended_action: 'Dispatch plumber',
      severity: 'medium',
      confidence: 0.89,
      created_at: new Date().toISOString(),
      status: 'open'
    }
  ],
  error: null
});

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  return {
    getIncidents: () => mockGetIncidents(),
    insertIncident: vi.fn()
  };
});

describe('OpsDashboard Additional Operations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        incident: {
          classification: 'medical_emergency',
          severity: 'high',
          recommended_action: 'Send medics'
        }
      })
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('validates incident description length on submission', async () => {
    render(
      <AccessibilityProvider>
        <OpsDashboard />
      </AccessibilityProvider>
    );

    const textarea = screen.getByPlaceholderText(/Describe incident/i) as HTMLTextAreaElement;
    const form = textarea.closest('form')!;

    // Type short text and submit form directly
    fireEvent.change(textarea, { target: { value: 'Spil' } });
    fireEvent.submit(form);

    // Verify error message is rendered
    const errorMsg = await screen.findByText(/Please enter at least 5 characters to triage./i);
    expect(errorMsg).toBeInTheDocument();

    // Verify aria-describedby is connected to error message
    expect(textarea.getAttribute('aria-describedby')).toBe('triage-form-error');
  });

  it('submits valid incident successfully and updates state', async () => {
    render(
      <AccessibilityProvider>
        <OpsDashboard />
      </AccessibilityProvider>
    );

    const textarea = screen.getByPlaceholderText(/Describe incident/i) as HTMLTextAreaElement;
    const form = textarea.closest('form')!;

    // Type valid text
    fireEvent.change(textarea, { target: { value: 'Large fire in Section 102 food stalls' } });
    
    await act(async () => {
      fireEvent.submit(form);
      // Wait for fetch promises to resolve
      await Promise.resolve();
    });

    const successMsg = await screen.findByText(/Incident triaged successfully: \[MEDICAL_EMERGENCY\]/i);
    expect(successMsg).toBeInTheDocument();

    // Verify textarea is cleared
    expect(textarea.value).toBe('');
  });

  it('handles submission fetch failures gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Network overload' })
    }));

    render(
      <AccessibilityProvider>
        <OpsDashboard />
      </AccessibilityProvider>
    );

    const textarea = screen.getByPlaceholderText(/Describe incident/i) as HTMLTextAreaElement;
    const form = textarea.closest('form')!;

    fireEvent.change(textarea, { target: { value: 'Ticket scanner is broken at Gate C' } });
    
    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });

    const errorMsg = await screen.findByText('Network overload');
    expect(errorMsg).toBeInTheDocument();
  });
});
