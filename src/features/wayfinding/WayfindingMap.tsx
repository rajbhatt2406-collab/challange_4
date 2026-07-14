'use client';

import React from 'react';
import { VENUE_NODES, VenueNode } from './venueGraph';

interface WayfindingMapProps {
  startNode: string;
  activePath: VenueNode[] | null;
}

export default function WayfindingMap({ startNode, activePath }: WayfindingMapProps) {
  return (
    <div className="w-full relative flex items-center justify-center min-h-[300px]">
      <svg className="w-full h-full max-h-[300px] select-none" viewBox="0 0 100 100">
        {/* Outer ring */}
        <ellipse cx="50" cy="50" rx="45" ry="40" fill="none" stroke="#0B4F2E" strokeWidth="0.5" strokeDasharray="2,2" />
        {/* Center circle representing football pitch */}
        <rect x="35" y="38" width="30" height="24" fill="none" stroke="#0B4F2E" strokeWidth="0.5" />
        <line x1="50" y1="38" x2="50" y2="62" stroke="#0B4F2E" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="4" fill="none" stroke="#0B4F2E" strokeWidth="0.5" />

        {/* Edge lines */}
        {VENUE_NODES.map((fromNode) => {
          const connections = [
            ...VENUE_NODES.filter(toNode => {
              const pathIndex = activePath ? activePath.findIndex(n => n.id === fromNode.id) : -1;
              return pathIndex !== -1 && activePath && activePath[pathIndex + 1]?.id === toNode.id;
            })
          ];

          return connections.map(toNode => (
            <line
              key={`${fromNode.id}-${toNode.id}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="#00ff66"
              strokeWidth="1.5"
              className="glow-border-green"
              strokeDasharray="1.5,1.5"
            />
          ));
        })}

        {/* Node markers */}
        {VENUE_NODES.map((node) => {
          const isStart = node.id === startNode;
          const isEnd = activePath ? activePath[activePath.length - 1]?.id === node.id : false;
          const isPath = activePath ? activePath.some(n => n.id === node.id) : false;

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
              />
              <text
                x={node.x}
                y={node.y - radius - 1}
                fill="#a7f3d0"
                fontSize="2.2"
                textAnchor="middle"
                className="font-mono pointer-events-none select-none font-semibold"
              >
                {isStart ? 'START' : isEnd ? 'DEST' : isPath ? node.name.split(' ')[0] : ''}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Map legend */}
      <div className="absolute bottom-2 left-2 flex gap-3 bg-scoreboard-black/90 px-2 py-1 rounded border border-emerald-950/85 text-[9px] font-mono">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-scoreboard-amber" />
          <span>START</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-scoreboard-green" />
          <span>DESTINATION</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-scoreboard-green block" />
          <span>ROUTE</span>
        </div>
      </div>
    </div>
  );
}
