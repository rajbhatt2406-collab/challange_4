import { describe, it, expect, vi } from 'vitest';
import { mockDb, getIncidents, insertIncident } from './client';

// Mock the createClient module globally for this test file
vi.mock('@supabase/supabase-js', () => {
  const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'inc-supabase', description: 'Supabase test' }], error: null });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelectInsert = vi.fn().mockResolvedValue({ data: [{ id: 'inc-supabase-insert', description: 'Supabase test insert' }], error: null });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

  return {
    createClient: () => ({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: mockSelect,
            insert: mockInsert
          };
        }
        return {};
      })
    })
  };
});

/**
 * Unit tests for the local/in-memory database fallback of the Supabase client wrapper.
 * Boosts line coverage of src/lib/supabase/client.ts.
 */
describe('Supabase Client Local DB Fallback & InMemoryDatabase', () => {
  it('InMemoryDatabase: getIncidents returns sorted incidents list', async () => {
    const res = await mockDb.getIncidents();
    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();
    expect(res.data.length).toBeGreaterThanOrEqual(2);

    // Verify incidents are sorted descending by created_at
    const firstTime = new Date(res.data[0].created_at || '').getTime();
    const secondTime = new Date(res.data[1].created_at || '').getTime();
    expect(firstTime).toBeGreaterThanOrEqual(secondTime);
  });

  it('InMemoryDatabase: insertIncident successfully appends new item', async () => {
    const initialRes = await mockDb.getIncidents();
    const count = initialRes.data?.length || 0;

    const newInc = {
      description: 'Test Spill near concession Section 112',
      classification: 'hazard',
      recommended_action: 'Clean spill immediately',
      severity: 'low' as const,
      confidence: 0.95
    };

    const insertRes = await mockDb.insertIncident(newInc);
    expect(insertRes.error).toBeNull();
    expect(insertRes.data?.[0].description).toBe(newInc.description);

    const finalRes = await mockDb.getIncidents();
    expect(finalRes.data?.length).toBe(count + 1);
  });

  it('InMemoryDatabase: updateIncidentStatus modifies existing status or returns error', async () => {
    const getRes = await mockDb.getIncidents();
    const targetId = getRes.data?.[0].id || 'inc-1';

    const updateRes = await mockDb.updateIncidentStatus(targetId, 'resolved');
    expect(updateRes.error).toBeNull();
    expect(updateRes.data?.[0].status).toBe('resolved');

    const errUpdate = await mockDb.updateIncidentStatus('non-existent-id-999', 'resolved');
    expect(errUpdate.data).toBeNull();
    expect(errUpdate.error?.message).toBe('Incident not found');
  });

  it('Wrapper: getIncidents and insertIncident fall back to mockDb when supabase is uninitialized', async () => {
    const fetchRes = await getIncidents();
    expect(fetchRes.data).toBeDefined();

    const insertRes = await insertIncident({
      description: 'Medical distressSection 144',
      classification: 'medical_emergency',
      recommended_action: 'Deploy emergency responders',
      severity: 'high' as const,
      confidence: 0.91
    });
    expect(insertRes.data).toBeDefined();
  });

  it('Wrapper: getIncidents and insertIncident interact with mock Supabase client when env keys are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://actual-mock-url.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'actual-mock-anon-key');

    // Load a fresh copy of client.ts to initialize supabase client
    const { getIncidents: getIncidentsSupabase, insertIncident: insertIncidentSupabase } = await import(
      './client?t=' + Date.now()
    );

    const getRes = await getIncidentsSupabase();
    expect(getRes.data).toBeDefined();

    const insertRes = await insertIncidentSupabase({
      description: 'Test incident description',
      classification: 'security_breach',
      recommended_action: 'Lock down gates',
      severity: 'critical',
      confidence: 0.99
    });
    expect(insertRes.data).toBeDefined();
    
    vi.unstubAllEnvs();
  });
});
