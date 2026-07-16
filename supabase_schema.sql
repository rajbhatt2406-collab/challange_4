-- Supabase SQL Schema setup for PulseOps
-- Target Database: PostgreSQL + PostgREST

-- Create incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    classification VARCHAR(100) NOT NULL,
    recommended_action TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    confidence FLOAT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- 1. Permit anonymous users to read incidents (command dashboard is public for demo view)
CREATE POLICY "Allow public read access to incidents"
    ON public.incidents
    FOR SELECT
    TO anon
    USING (true);

-- 2. Permit anonymous users to insert incidents (staff triage dashboard posts incidents)
CREATE POLICY "Allow public insert access to incidents"
    ON public.incidents
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);

-- ALTER TABLE migration to add CHECK constraints mirroring Zod validations (defense-in-depth)
ALTER TABLE public.incidents
    ADD CONSTRAINT chk_description_length CHECK (length(description) >= 5 AND length(description) <= 1000),
    ADD CONSTRAINT chk_confidence_range CHECK (confidence >= 0.0 AND confidence <= 1.0),
    ADD CONSTRAINT chk_classification_enum CHECK (classification IN ('medical_emergency', 'crowd_hazard', 'facility_damage', 'security_breach', 'logistics'));
