export type NodeType = 'gate' | 'restroom' | 'concession' | 'medical' | 'connector';

export interface VenueNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  x: number; // Percentage coordinate (0-100) for visual rendering
  y: number; // Percentage coordinate (0-100) for visual rendering
  accessible?: boolean;
}

export interface VenueEdge {
  from: string;
  to: string;
  weight: number; // travel time or distance
}

// Nodes representing MetLife Stadium - World Cup 2026 Layout
export const VENUE_NODES: VenueNode[] = [
  { id: 'gate-a', name: 'Gate A (North Entrance)', type: 'gate', description: 'Main gates for general public entrance. Level 1.', x: 50, y: 10 },
  { id: 'gate-b', name: 'Gate B (East Entrance)', type: 'gate', description: 'East entrance close to taxi and rideshare drop-offs.', x: 90, y: 50 },
  { id: 'gate-c', name: 'Gate C (South Entrance)', type: 'gate', description: 'South entrance near public transit/train station.', x: 50, y: 90 },
  { id: 'gate-d', name: 'Gate D (West Entrance)', type: 'gate', description: 'West VIP entrance and team arrivals. Level 1.', x: 10, y: 50 },
  
  // Restrooms
  { id: 'restroom-n1', name: 'North Restrooms L1', type: 'restroom', description: 'Men/Women restrooms near Section 112.', x: 45, y: 25 },
  { id: 'restroom-acc-s1', name: 'Accessible Restroom South L1', type: 'restroom', description: 'Gender-neutral accessible restroom. Section 134.', x: 55, y: 75, accessible: true },
  { id: 'restroom-e1', name: 'East Restrooms L1', type: 'restroom', description: 'Men/Women restrooms near Section 120.', x: 75, y: 45 },
  { id: 'restroom-w1', name: 'West Restrooms L1', type: 'restroom', description: 'Accessible & standard restrooms. Section 145.', x: 25, y: 55, accessible: true },

  // Food stalls
  { id: 'food-taco', name: 'Taco Arena', type: 'concession', description: 'Authentic local tacos and cold beverages. Section 118.', x: 65, y: 30 },
  { id: 'food-burger', name: 'Championship Burgers', type: 'concession', description: 'Burgers, vegan sliders, and fries. Section 130.', x: 40, y: 70 },
  { id: 'food-drinks', name: 'Pitch Brews', type: 'concession', description: 'Local craft beers, soft drinks, and snacks. Section 140.', x: 30, y: 40 },

  // Medical Points
  { id: 'medical-east', name: 'Medical Station East', type: 'medical', description: 'First aid point, emergency response staff. Section 124.', x: 80, y: 55 },
  { id: 'medical-west', name: 'Medical Station West', type: 'medical', description: 'First aid & pharmacy services. Section 148.', x: 20, y: 45 }
];

export const VENUE_EDGES: VenueEdge[] = [
  // Outer loop connections
  { from: 'gate-a', to: 'restroom-n1', weight: 3 },
  { from: 'restroom-n1', to: 'food-taco', weight: 4 },
  { from: 'food-taco', to: 'medical-east', weight: 5 },
  { from: 'medical-east', to: 'gate-b', weight: 3 },
  { from: 'gate-b', to: 'restroom-e1', weight: 2 },
  { from: 'restroom-e1', to: 'restroom-acc-s1', weight: 6 },
  { from: 'restroom-acc-s1', to: 'food-burger', weight: 3 },
  { from: 'food-burger', to: 'gate-c', weight: 4 },
  { from: 'gate-c', to: 'food-drinks', weight: 5 },
  { from: 'food-drinks', to: 'medical-west', weight: 3 },
  { from: 'medical-west', to: 'gate-d', weight: 2 },
  { from: 'gate-d', to: 'restroom-w1', weight: 3 },
  { from: 'restroom-w1', to: 'restroom-n1', weight: 6 },

  // Cross-pitch corridors
  { from: 'restroom-n1', to: 'food-drinks', weight: 6 },
  { from: 'food-taco', to: 'restroom-e1', weight: 4 },
  { from: 'restroom-e1', to: 'medical-east', weight: 2 },
  { from: 'food-burger', to: 'restroom-w1', weight: 5 }
];

/**
 * Custom graph pathfinder using Dijkstra's Algorithm
 * Returns an array of VenueNode representing the shortest path from start to end, or null if not found
 */
export function findShortestPath(startId: string, endId: string): VenueNode[] | null {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  // Build adjacency list
  const adjList: Record<string, { to: string; weight: number }[]> = {};
  VENUE_NODES.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
    adjList[node.id] = [];
  });

  VENUE_EDGES.forEach(edge => {
    adjList[edge.from]?.push({ to: edge.to, weight: edge.weight });
    // Bidirectional paths
    adjList[edge.to]?.push({ to: edge.from, weight: edge.weight });
  });

  if (!distances.hasOwnProperty(startId) || !distances.hasOwnProperty(endId)) {
    return null;
  }

  distances[startId] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach(nodeId => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentId = nodeId;
      }
    });

    if (currentId === null || currentId === endId) {
      break;
    }

    unvisited.delete(currentId);

    const neighbors = adjList[currentId] || [];
    for (const neighbor of neighbors) {
      if (unvisited.has(neighbor.to)) {
        const alt = distances[currentId] + neighbor.weight;
        if (alt < distances[neighbor.to]) {
          distances[neighbor.to] = alt;
          previous[neighbor.to] = currentId;
        }
      }
    }
  }

  if (distances[endId] === Infinity) {
    return null; // unreachable
  }

  // Reconstruct path
  const path: VenueNode[] = [];
  let curr: string | null = endId;
  while (curr !== null) {
    const node = VENUE_NODES.find(n => n.id === curr);
    if (node) {
      path.unshift(node);
    }
    curr = previous[curr];
  }

  return path;
}
