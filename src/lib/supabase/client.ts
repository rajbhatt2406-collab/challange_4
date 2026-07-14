import { createClient } from '@supabase/supabase-js';

export interface Incident {
  id?: string;
  description: string;
  classification: string;
  recommended_action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status?: string;
  created_at?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Instantiate real supabase if keys are present
export const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here'
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Mock database in-memory fallback for local dev & testing
class InMemoryDatabase {
  private incidents: Incident[] = [];

  constructor() {
    // Populate with some default mock incidents
    this.incidents = [
      {
        id: 'inc-1',
        description: 'Large crowd buildup near North Gate A.',
        classification: 'crowd_buildup',
        recommended_action: 'Open auxiliary gate A2 and redirect fans.',
        severity: 'high',
        confidence: 0.92,
        created_at: new Date(Date.now() - 600000).toISOString(),
        status: 'open'
      },
      {
        id: 'inc-2',
        description: 'Water spill on staircase in Section 120.',
        classification: 'hazard',
        recommended_action: 'Dispatch facilities team for clean-up.',
        severity: 'medium',
        confidence: 0.88,
        created_at: new Date(Date.now() - 1200000).toISOString(),
        status: 'open'
      }
    ];
  }

  async getIncidents(): Promise<{ data: Incident[]; error: Error | null }> {
    const sorted = [...this.incidents].sort((a, b) => {
      const aDate = a.created_at || '';
      const bDate = b.created_at || '';
      return bDate.localeCompare(aDate);
    });
    return { data: sorted, error: null };
  }

  async insertIncident(incident: Incident): Promise<{ data: Incident[]; error: Error | null }> {
    const newInc: Incident = {
      id: `inc-${Math.random().toString(36).substring(2, 11)}`,
      created_at: new Date().toISOString(),
      status: 'open',
      ...incident
    };
    this.incidents.push(newInc);
    return { data: [newInc], error: null };
  }

  async updateIncidentStatus(id: string, status: string): Promise<{ data: Incident[] | null; error: Error | null }> {
    const inc = this.incidents.find(i => i.id === id);
    if (inc) {
      inc.status = status;
      return { data: [inc], error: null };
    }
    return { data: null, error: new Error('Incident not found') };
  }
}

export const mockDb = new InMemoryDatabase();

/**
 * Wrapper to fetch incidents. Uses Supabase if initialized, otherwise falls back to local memory.
 */
export async function getIncidents(): Promise<{ data: Incident[] | null; error: Error | null }> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) return { data: data as Incident[], error: null };
      console.error('Supabase fetch error, falling back to mock DB:', error);
    } catch (e: unknown) {
      console.error('Supabase exception, falling back to mock DB:', e);
    }
  }
  return mockDb.getIncidents();
}

/**
 * Wrapper to log an incident.
 */
export async function insertIncident(incident: Incident): Promise<{ data: Incident[] | null; error: Error | null }> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .insert([incident])
        .select();
      if (!error) return { data: data as Incident[], error: null };
      console.error('Supabase insert error, falling back to mock DB:', error);
    } catch (e: unknown) {
      console.error('Supabase insert exception, falling back to mock DB:', e);
    }
  }
  return mockDb.insertIncident(incident);
}
