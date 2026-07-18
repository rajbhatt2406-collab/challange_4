import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WayfindingConcierge from './WayfindingConcierge';
import { AccessibilityProvider } from '@/features/accessibility/AccessibilityContext';

// Mutable closure variables to dynamically change hook response within tests
let mockMessages = [
  { id: '1', role: 'user', content: 'Where is Gate B?' },
  { id: '2', role: 'assistant', content: 'Gate B is located on the East Side.', intent: 'FIND_GATE', destinationId: 'gate-b', languageDetected: 'en' }
];

const mockAskQuestion = vi.fn();
const mockClearChat = vi.fn();
const mockSetStartNode = vi.fn();

/**
 * Mocks useWayfinding hook to verify specific concierge button operations
 * and DOM interactions.
 */
vi.mock('./useWayfinding', () => {
  return {
    useWayfinding: (initialStartNode: string) => ({
      messages: mockMessages,
      startNode: initialStartNode || 'gate-a',
      setStartNode: mockSetStartNode,
      activePath: [
        { id: 'gate-a', name: 'Gate A (North Entrance)', type: 'gate', description: 'North general entrance', x: 50, y: 10 },
        { id: 'gate-b', name: 'Gate B (East Entrance)', type: 'gate', description: 'East entrance', x: 90, y: 50 }
      ],
      isStreaming: false,
      streamText: '',
      askQuestion: mockAskQuestion,
      clearChat: mockClearChat
    })
  };
});

describe('WayfindingConcierge Additional Operations & Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [
      { id: '1', role: 'user', content: 'Where is Gate B?' },
      { id: '2', role: 'assistant', content: 'Gate B is located on the East Side.', intent: 'FIND_GATE', destinationId: 'gate-b', languageDetected: 'en' }
    ];
  });

  it('handles clicking the RESET button to clear chat history', () => {
    render(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    const resetBtn = screen.getByRole('button', { name: /clear chat history/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(mockClearChat).toHaveBeenCalled();
  });

  it('handles start location selector dropdown changes', () => {
    render(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    const select = screen.getByLabelText(/Start Location:/i);
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'gate-b' } });
    expect(mockSetStartNode).toHaveBeenCalledWith('gate-b');
  });

  it('simulates voice recognition input when Mic is clicked', async () => {
    vi.useFakeTimers();
    render(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    const micBtn = screen.getByRole('button', { name: /simulate voice command translation input/i });
    expect(micBtn).toBeInTheDocument();

    fireEvent.click(micBtn);

    // Wait for voice simulation timer (1500ms) inside act() to process state updates
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const input = screen.getByLabelText(/Concierge query input/i) as HTMLInputElement;
    expect(input.value).not.toBe('');
    vi.useRealTimers();
  });

  it('submits a text query correctly', () => {
    render(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    const input = screen.getByLabelText(/Concierge query input/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Where is the restroom?' } });

    const submitBtn = screen.getByRole('button', { name: /send query/i });
    fireEvent.click(submitBtn);

    expect(mockAskQuestion).toHaveBeenCalledWith('Where is the restroom?');
  });

  it('announces new messages to screen readers and dynamically updates html lang and dir attributes on language detection', () => {
    // 1. Render with English response
    const { rerender } = render(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    // 2. Change response to Spanish (LTR)
    mockMessages = [
      { id: '1', role: 'user', content: '¿Dónde está el baño?' },
      { id: '2', role: 'assistant', content: 'El baño está cerca.', intent: 'FIND_RESTROOM', destinationId: 'restroom-acc-s1', languageDetected: 'es' }
    ];

    // Re-render using returned rerender function to trigger dynamic useEffect updates
    rerender(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    // Verify document lang is updated to 'es' and dir is 'ltr'
    expect(document.documentElement.lang).toBe('es');
    expect(document.documentElement.dir).toBe('ltr');

    // Verify announcement is dispatched to the sr-live-region
    const srLiveRegion = document.getElementById('sr-live-region');
    expect(srLiveRegion).toHaveTextContent(/Assistant response: El baño está cerca./i);

    // 3. Change response to Arabic (RTL)
    mockMessages = [
      { id: '1', role: 'user', content: 'أين دورة المياه؟' },
      { id: '2', role: 'assistant', content: 'دورة المياه قريبة.', intent: 'FIND_RESTROOM', destinationId: 'restroom-acc-s1', languageDetected: 'ar' }
    ];

    rerender(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    // Verify document lang is updated to 'ar' and dir is 'rtl'
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });
});
