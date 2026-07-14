import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WayfindingConcierge from './WayfindingConcierge';
import { AccessibilityProvider } from '@/features/accessibility/AccessibilityContext';

// Mock useWayfinding hook to prevent hitting the real network
vi.mock('./useWayfinding', () => {
  return {
    useWayfinding: () => ({
      messages: [
        { id: '1', role: 'user', content: 'Where is Gate B?' },
        { id: '2', role: 'assistant', content: 'Gate B is located on the East Side.', intent: 'FIND_GATE', destinationId: 'gate-b', languageDetected: 'en' }
      ],
      startNode: 'gate-a',
      setStartNode: vi.fn(),
      activePath: [
        { id: 'gate-a', name: 'Gate A (North Entrance)', type: 'gate', description: 'North general entrance', x: 50, y: 10 },
        { id: 'gate-b', name: 'Gate B (East Entrance)', type: 'gate', description: 'East entrance', x: 90, y: 50 }
      ],
      isStreaming: false,
      streamText: '',
      askQuestion: vi.fn(),
      clearChat: vi.fn()
    })
  };
});

describe('WayfindingConcierge Component', () => {
  it('renders chat message log and start location selector', () => {
    render(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    // Verify header exists
    expect(screen.getByText('AI WAYFINDING ASSISTANT')).toBeInTheDocument();
    
    // Verify initial start node select option is rendered
    expect(screen.getByLabelText(/Start Location:/i)).toBeInTheDocument();

    // Verify mock messages are rendered
    expect(screen.getByText('Where is Gate B?')).toBeInTheDocument();
    expect(screen.getByText('Gate B is located on the East Side.')).toBeInTheDocument();
  });

  it('renders the SVG map overlay and routing path instructions', () => {
    render(
      <AccessibilityProvider>
        <WayfindingConcierge />
      </AccessibilityProvider>
    );

    expect(screen.getByText('Path Instructions')).toBeInTheDocument();
    expect(screen.getAllByText('Gate A (North Entrance)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Gate B (East Entrance)')[0]).toBeInTheDocument();
  });
});
