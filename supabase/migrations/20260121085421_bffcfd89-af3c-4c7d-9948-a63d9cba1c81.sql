-- Add new columns to rule_sets table to support Template Management requirements
ALTER TABLE public.rule_sets 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'archived', 'rolled_back')),
ADD COLUMN IF NOT EXISTS use_case TEXT,
ADD COLUMN IF NOT EXISTS active_version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS client TEXT,
ADD COLUMN IF NOT EXISTS correspondent TEXT,
ADD COLUMN IF NOT EXISTS scope TEXT,
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id);

-- Create a template_versions table for version history
CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.rule_sets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  change_summary TEXT,
  rules_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on template_versions
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_versions using the existing owns_rule_set function
CREATE POLICY "Users can view versions of their own templates"
ON public.template_versions
FOR SELECT
USING (owns_rule_set(template_id));

CREATE POLICY "Users can create versions for their own templates"
ON public.template_versions
FOR INSERT
WITH CHECK (owns_rule_set(template_id));

-- Create template_audit_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.template_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.rule_sets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id UUID,
  details JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on template_audit_logs
ALTER TABLE public.template_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_audit_logs
CREATE POLICY "Users can view audit logs of their own templates"
ON public.template_audit_logs
FOR SELECT
USING (owns_rule_set(template_id));

CREATE POLICY "Users can create audit logs for their own templates"
ON public.template_audit_logs
FOR INSERT
WITH CHECK (owns_rule_set(template_id));

-- Add last_tested_at and test_result to rule_set_rules for tracking test status
ALTER TABLE public.rule_set_rules
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS test_result TEXT CHECK (test_result IS NULL OR test_result IN ('passed', 'failed', 'untested')),
ADD COLUMN IF NOT EXISTS parameter_overrides JSONB DEFAULT '{}'::jsonb;