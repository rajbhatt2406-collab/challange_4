'use client';

import React, { memo, useMemo } from 'react';
import { VENUE_NODES, VenueNode } from './venueGraph';

interface WayfindingMapProps {
  startNode: string;
  activePath: VenueNode[] | null;
}

/**
 * SVG stadium map rendering active route paths between venue nodes.
 * Wrapped with React.memo to prevent unnecessary re-renders when parent state
 * changes but startNode/activePath remain the same (e.g. during chat streaming).
 */
const WayfindingMap = memo(function WayfindingMap({ startNode, activePath }: WayfindingMapProps) {
  // Memoize active-path edge connections — only recomputes when activePath changes
  const activeEdges = useMemo(() => {
    if (!activePath) return new Set<string>();
    const edgeSet = new Set<string>();
    for (let i = 0; i < activePath.length - 1; i++) {
      edgeSet.add(`${activePath[i].id}->${activePath[i + 1].id}`);
    }
    return edgeSet;
  }, [activePath]);

  // Memoize the set of node IDs on the active path for fast lookup
  const activePathIds = useMemo(() => {
    if (!activePath) return new Set<string>();
    return new Set(activePath.map(n => n.id));
  }, [activePath]);

  const destinationId = activePath ? activePath[activePath.length - 1]?.id : null;

  // Build text description of current route for screen readers
  const routeDescription = useMemo(() => {
    if (!activePath || activePath.length < 2) return 'No active route computed.';
    const stops = activePath.map(n => n.name).join(' → ');
    return `Route: ${stops}. ${activePath.length - 1} step${activePath.length - 1 === 1 ? '' : 's'}.`;
  }, [activePath]);

  return (
    <div className="w-full relative flex items-center justify-center min-h-[300px]">
      {/* aria-label gives a brief title; aria-describedby links to the detailed route description */}
      <svg
        className="w-full h-full max-h-[300px] select-none"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Stadium venue map showing wayfinding route"
        aria-describedby="wayfinding-map-desc"
      >
        <title>Stadium Venue Map</title>
        <desc id="wayfinding-map-desc">{routeDescription}</desc>

        {/* Outer ring */}
        <ellipse cx="50" cy="50" rx="45" ry="40" fill="none" stroke="#0B4F2E" strokeWidth="0.5" strokeDasharray="2,2" />
        {/* Center circle representing football pitch */}
        <rect x="35" y="38" width="30" height="24" fill="none" stroke="#0B4F2E" strokeWidth="0.5" />
        <line x1="50" y1="38" x2="50" y2="62" stroke="#0B4F2E" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="4" fill="none" stroke="#0B4F2E" strokeWidth="0.5" />

        {/* Active path edge lines — only the edges on the computed route */}
        {activePath && activePath.map((fromNode, index) => {
          const toNode = activePath[index + 1];
          if (!toNode) return null;
          const edgeKey = `${fromNode.id}->${toNode.id}`;
          if (!activeEdges.has(edgeKey)) return null;
          return (
            <line
              key={edgeKey}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="#00ff66"
              strokeWidth="1.5"
              className="glow-border-green"
              strokeDasharray="1.5,1.5"
              aria-hidden="true"
            />
          );
        })}

        {/* Node markers */}
        {VENUE_NODES.map((node) => {
          const isStart = node.id === startNode;
          const isEnd = node.id === destinationId;
          const isPath = activePathIds.has(node.id);

          let fillColor = '#0B4F2E';
          let radius = 1.8;
          let strokeColor = '#157E4B';
          let strokeW = 0.5;

          if (isStart) {
            fillColor = '#ffbb00';
            radius = 2.5;
            strokeColor = '#fcfdfd';
            strokeW = 0.8;
          } else if (isEnd) {
            fillColor = '#00ff66';
            radius = 2.5;
            strokeColor = '#fcfdfd';
            strokeW = 0.8;
          } else if (isPath) {
            fillColor = '#00ff66';
            radius = 2.0;
            strokeColor = '#052615';
            strokeW = 0.5;
          }

          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeW}
                className={isPath ? 'animate-pulse' : ''}
                aria-hidden="true"
              />
              <text
                x={node.x}
                y={node.y - radius - 1}
                fill="#a7f3d0"
                fontSize="2.2"
                textAnchor="middle"
                className="font-mono pointer-events-none select-none font-semibold"
                aria-hidden="true"
              >
                {isStart ? 'START' : isEnd ? 'DEST' : isPath ? node.name.split(' ')[0] : ''}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Map legend — text labels alongside color indicators (never color-only) */}
      <div className="absolute bottom-2 left-2 flex gap-3 bg-scoreboard-black/90 px-2 py-1 rounded border border-emerald-950/85 text-[9px] font-mono">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-scoreboard-amber" aria-hidden="true" />
          <span>START</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-scoreboard-green" aria-hidden="true" />
          <span>DESTINATION</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-scoreboard-green block" aria-hidden="true" />
          <span>ROUTE</span>
        </div>
      </div>

      {/* Accessible text-based route description for screen readers (aria-live updates when path changes) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {routeDescription}
      </div>
    </div>
  );
});

export default WayfindingMap;
