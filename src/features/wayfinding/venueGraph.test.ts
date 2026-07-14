import { describe, it, expect } from 'vitest';
import { findShortestPath } from './venueGraph';

describe('Venue Graph Dijkstra Pathfinder', () => {
  it('should find the shortest path between start and end node', () => {
    const startNode = 'gate-a';
    const endNode = 'gate-b';

    const path = findShortestPath(startNode, endNode);
    expect(path).not.toBeNull();
    
    if (path) {
      expect(path.length).toBeGreaterThan(1);
      expect(path[0].id).toBe(startNode);
      expect(path[path.length - 1].id).toBe(endNode);
    }
  });

  it('should return null for non-existent start or end nodes', () => {
    const invalidPath = findShortestPath('non-existent-start', 'gate-b');
    expect(invalidPath).toBeNull();

    const invalidPath2 = findShortestPath('gate-a', 'non-existent-end');
    expect(invalidPath2).toBeNull();
  });

  it('should return a path containing only the start node if start and end are equal', () => {
    const path = findShortestPath('gate-a', 'gate-a');
    expect(path).not.toBeNull();
    if (path) {
      expect(path.length).toBe(1);
      expect(path[0].id).toBe('gate-a');
    }
  });
});
