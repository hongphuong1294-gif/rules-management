-- Add new columns to the rules table based on Excel schema
ALTER TABLE public.rules
ADD COLUMN IF NOT EXISTS rule_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
ADD COLUMN IF NOT EXISTS subcategory2 VARCHAR(100),
ADD COLUMN IF NOT EXISTS elements JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS image_mode_prompt TEXT,
ADD COLUMN IF NOT EXISTS docling_mode_prompt TEXT,
ADD COLUMN IF NOT EXISTS docling_table_mode_prompt TEXT,
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create unique index on rule_code (nullable unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_rule_code ON public.rules(rule_code) WHERE rule_code IS NOT NULL;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_rules_category ON public.rules(category);
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON public.rules(is_active);

-- Create document_types table for categorizing documents
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code VARCHAR(50) UNIQUE NOT NULL,
  document_type_full VARCHAR(255) NOT NULL,
  document_type_short VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on document_types (public read, admin write)
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Everyone can view document types
CREATE POLICY "Document types are viewable by everyone"
ON public.document_types FOR SELECT
USING (true);

-- Add trigger for document_types updated_at
CREATE TRIGGER update_document_types_updated_at
BEFORE UPDATE ON public.document_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();