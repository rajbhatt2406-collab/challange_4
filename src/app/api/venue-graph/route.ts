import { NextResponse } from 'next/server';
import { VENUE_NODES, VENUE_EDGES } from '@/features/wayfinding/venueGraph';

// Revalidate this static data every 24 hours (86400 seconds)
export const revalidate = 86400;

/**
 * Endpoint to fetch static World Cup 2026 venue layout graph.
 * Configured with caching headers for high efficiency.
 */
export async function GET() {
  return new NextResponse(
    JSON.stringify({
      nodes: VENUE_NODES,
      edges: VENUE_EDGES
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        // Cache in browser and CDN for 1 hour, allow serving stale cache for up to 24 hours
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    }
  );
}
