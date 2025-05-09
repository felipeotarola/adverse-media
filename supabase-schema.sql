-- Create searches table
CREATE TABLE IF NOT EXISTS public.searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    individual_name TEXT NOT NULL,
    company_name TEXT,
    additional_info TEXT,
    risk_level TEXT NOT NULL,
    adverse_findings INTEGER NOT NULL,
    recommendation TEXT NOT NULL,
    user_id UUID
);

-- Create search_results table
CREATE TABLE IF NOT EXISTS public.search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    adverse_content TEXT[]
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS searches_individual_name_idx ON public.searches(individual_name);
CREATE INDEX IF NOT EXISTS searches_company_name_idx ON public.searches(company_name);
CREATE INDEX IF NOT EXISTS searches_risk_level_idx ON public.searches(risk_level);
CREATE INDEX IF NOT EXISTS search_results_search_id_idx ON public.search_results(search_id);
CREATE INDEX IF NOT EXISTS search_results_risk_score_idx ON public.search_results(risk_score);

-- Set up RLS (Row Level Security) policies
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON public.searches
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON public.search_results
    USING (true)
    WITH CHECK (true);

-- Create policies for anonymous users (if needed)
CREATE POLICY "Allow read access to anonymous users" ON public.searches
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to anonymous users" ON public.search_results
    FOR SELECT USING (true);
