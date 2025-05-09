-- Add a table for storing relationships
CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target_name TEXT NOT NULL,
  related_name TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  description TEXT,
  confidence INTEGER,
  source_url TEXT,
  source_title TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS entity_relationships_search_id_idx ON public.entity_relationships(search_id);
CREATE INDEX IF NOT EXISTS entity_relationships_target_name_idx ON public.entity_relationships(target_name);
CREATE INDEX IF NOT EXISTS entity_relationships_related_name_idx ON public.entity_relationships(related_name);
