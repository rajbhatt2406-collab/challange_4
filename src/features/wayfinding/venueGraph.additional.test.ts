import { describe, it, expect } from 'vitest';
import { findShortestPath, VENUE_NODES } from './venueGraph';

describe('Venue Graph — Additional Edge Cases', () => {
  it('all 13 venue nodes are reachable from gate-a', () => {
    const nodeIds = VENUE_NODES.map(n => n.id);
    for (const targetId of nodeIds) {
      const path = findShortestPath('gate-a', targetId);
      expect(path, `Expected path from gate-a to ${targetId} to exist`).not.toBeNull();
    }
  });

  it('finds path from gate-a to accessible restroom (restroom-acc-s1)', () => {
    const path = findShortestPath('gate-a', 'restroom-acc-s1');
    expect(path).not.toBeNull();
    if (path) {
      expect(path[0].id).toBe('gate-a');
      expect(path[path.length - 1].id).toBe('restroom-acc-s1');
      expect(path[path.length - 1].accessible).toBe(true);
    }
  });

  it('finds path from gate-b to medical station east', () => {
    const path = findShortestPath('gate-b', 'medical-east');
    expect(path).not.toBeNull();
    if (path) {
      expect(path[0].id).toBe('gate-b');
      expect(path[path.length - 1].id).toBe('medical-east');
    }
  });

  it('finds path from gate-c to food concession (food-taco)', () => {
    const path = findShortestPath('gate-c', 'food-taco');
    expect(path).not.toBeNull();
    if (path) {
      expect(path[0].id).toBe('gate-c');
      expect(path[path.length - 1].id).toBe('food-taco');
    }
  });

  it('finds path from gate-d to medical station west', () => {
    const path = findShortestPath('gate-d', 'medical-west');
    expect(path).not.toBeNull();
    if (path) {
      expect(path[0].id).toBe('gate-d');
      expect(path[path.length - 1].id).toBe('medical-west');
    }
  });

  it('path length is always at least 1 (even same-node paths)', () => {
    const nodeIds = VENUE_NODES.map(n => n.id);
    for (const nodeId of nodeIds) {
      const path = findShortestPath(nodeId, nodeId);
      if (path) {
        expect(path.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('accessible nodes are correctly tagged in VENUE_NODES', () => {
    const accessibleNodes = VENUE_NODES.filter(n => n.accessible === true);
    // restroom-acc-s1 and restroom-w1 have accessible: true
    expect(accessibleNodes.length).toBeGreaterThanOrEqual(2);
    const accessibleIds = accessibleNodes.map(n => n.id);
    expect(accessibleIds).toContain('restroom-acc-s1');
    expect(accessibleIds).toContain('restroom-w1');
  });

  it('VENUE_NODES has entries for all expected node types', () => {
    const types = new Set(VENUE_NODES.map(n => n.type));
    expect(types.has('gate')).toBe(true);
    expect(types.has('restroom')).toBe(true);
    expect(types.has('concession')).toBe(true);
    expect(types.has('medical')).toBe(true);
  });

  it('all node coordinates are within 0-100 percentage range', () => {
    VENUE_NODES.forEach(node => {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(100);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(100);
    });
  });

  it('returns null for one invalid node regardless of direction', () => {
    expect(findShortestPath('gate-a', 'non-existent')).toBeNull();
    expect(findShortestPath('non-existent', 'gate-a')).toBeNull();
    expect(findShortestPath('', '')).toBeNull();
  });
});
