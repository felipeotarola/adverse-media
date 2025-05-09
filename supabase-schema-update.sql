-- Add columns to search_results table for raw data
ALTER TABLE public.search_results 
ADD COLUMN IF NOT EXISTS raw_search_data JSONB,
ADD COLUMN IF NOT EXISTS raw_crawl_data JSONB;

-- Create a new table for source tracking
CREATE TABLE IF NOT EXISTS public.search_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_type TEXT NOT NULL, -- 'search' or 'crawl'
    url TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'skipped'
    raw_data JSONB,
    metadata JSONB
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS search_sources_search_id_idx ON public.search_sources(search_id);
CREATE INDEX IF NOT EXISTS search_sources_source_type_idx ON public.search_sources(source_type);

-- Set up RLS (Row Level Security) policies
ALTER TABLE public.search_sources ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON public.search_sources
    USING (true)
    WITH CHECK (true);

-- Create policies for anonymous users (if needed)
CREATE POLICY "Allow read access to anonymous users" ON public.search_sources
    FOR SELECT USING (true);
