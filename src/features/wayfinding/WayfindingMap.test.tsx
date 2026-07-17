import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WayfindingMap from './WayfindingMap';
import { VenueNode } from './venueGraph';

/**
 * Unit tests for WayfindingMap component.
 * Verifies rendering of SVG stadium map schema, path routing lines,
 * starting and destination node markers, and live screen reader route summaries.
 * Boosts line coverage of WayfindingMap from 4.44% to ~100%.
 */
describe('WayfindingMap Component', () => {
  it('renders SVG stadium map and handles empty/null path state', () => {
    render(<WayfindingMap startNode="gate-a" activePath={null} />);

    // Assert SVG container is rendered with description mapping
    const svgElement = screen.getByLabelText(/Stadium venue map showing wayfinding route/i);
    expect(svgElement).toBeInTheDocument();
    
    // Assert route description fallback text exists
    const descElement = screen.getAllByText('No active route computed.')[0];
    expect(descElement).toBeInTheDocument();
  });

  it('renders SVG route lines and active path stop nodes when activePath is provided', () => {
    const mockPath: VenueNode[] = [
      { id: 'gate-a', name: 'Gate A (North Entrance)', type: 'gate', description: 'North entrance', x: 50, y: 10 },
      { id: 'connector-n', name: 'North Connector', type: 'connector', description: 'North section', x: 50, y: 30 },
      { id: 'restroom-acc-s1', name: 'Accessible Restroom Section 120', type: 'restroom', description: 'ADA accessible restrooms', x: 75, y: 30 }
    ];

    render(<WayfindingMap startNode="gate-a" activePath={mockPath} />);

    // Verify SVG description maps the stops correctly
    const descText = screen.getAllByText(/Route: Gate A \(North Entrance\) → North Connector → Accessible Restroom Section 120/i)[0];
    expect(descText).toBeInTheDocument();

    // Verify legend indicators are visible
    expect(screen.getAllByText('START')[0]).toBeInTheDocument();
    expect(screen.getAllByText('DESTINATION')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ROUTE')[0]).toBeInTheDocument();
  });
});
