-- Add columns to search_results table for entity match data
ALTER TABLE public.search_results 
ADD COLUMN IF NOT EXISTS entity_match_confidence INTEGER,
ADD COLUMN IF NOT EXISTS entity_match_is_exact BOOLEAN,
ADD COLUMN IF NOT EXISTS entity_match_reason TEXT;

-- Add columns to searches table for entity match stats
ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS entity_match_total INTEGER,
ADD COLUMN IF NOT EXISTS entity_match_valid INTEGER;
