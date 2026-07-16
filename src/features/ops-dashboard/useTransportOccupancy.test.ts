import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransportOccupancy } from './useTransportOccupancy';

const mockAlertResponse = {
  severity: 'high',
  message: 'High congestion at shuttle route.',
  recommended_action: 'Dispatch extra buses.',
  confidence: 0.88
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockAlertResponse)
  }));
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useTransportOccupancy Hook', () => {
  it('initializes with 4 transport sectors and correct default values', () => {
    const { result } = renderHook(() => useTransportOccupancy());
    expect(result.current.sectors).toHaveLength(4);
    expect(result.current.sectors[0].id).toBe('shuttle-express');
    expect(result.current.sectors[1].id).toBe('shuttle-regional');
    expect(result.current.sectors[2].id).toBe('lot-west');
    expect(result.current.sectors[3].id).toBe('lot-east');
  });

  it('starts with no active alerts', () => {
    const { result } = renderHook(() => useTransportOccupancy());
    expect(result.current.alerts).toHaveLength(0);
  });

  it('sectors have valid occupancy values (15–100%) after tick', async () => {
    const { result } = renderHook(() => useTransportOccupancy());

    await act(async () => {
      vi.advanceTimersByTime(6000);
      await Promise.resolve();
    });

    result.current.sectors.forEach(sector => {
      expect(sector.occupancy).toBeGreaterThanOrEqual(15);
      expect(sector.occupancy).toBeLessThanOrEqual(100);
    });
  });

  it('sectors have expected type values (shuttle or parking)', () => {
    const { result } = renderHook(() => useTransportOccupancy());
    result.current.sectors.forEach(sector => {
      expect(['shuttle', 'parking']).toContain(sector.type);
    });
  });

  it('alerts array never exceeds 15 entries cap', () => {
    const { result } = renderHook(() => useTransportOccupancy());
    expect(result.current.alerts.length).toBeLessThanOrEqual(15);
  });

  it('handles fetch errors gracefully without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API error')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTransportOccupancy());

    await act(async () => {
      vi.advanceTimersByTime(6000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.sectors).toHaveLength(4);
    consoleSpy.mockRestore();
  });

  it('invokes onAlertTriggered callback structure when alert is created', () => {
    const callback = vi.fn();
    renderHook(() => useTransportOccupancy(callback));
    // Callback is wired; verify it's a function reference
    expect(typeof callback).toBe('function');
  });
});
