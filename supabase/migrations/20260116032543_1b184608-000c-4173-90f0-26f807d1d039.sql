-- Create enum for rule types
CREATE TYPE public.rule_type AS ENUM ('threshold', 'calculation', 'cross_table', 'data_presence', 'pattern_match', 'custom');

-- Create enum for rule status
CREATE TYPE public.rule_status AS ENUM ('draft', 'active', 'inactive', 'archived');

-- =============================================
-- BASE TABLES
-- =============================================

-- Rules table - stores individual validation rules
CREATE TABLE public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type rule_type NOT NULL DEFAULT 'custom',
  config JSONB NOT NULL DEFAULT '{}',
  trigger_condition TEXT,
  scope TEXT,
  action TEXT,
  status rule_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rule templates table - reusable templates (public or private)
CREATE TABLE public.rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = public template
  name TEXT NOT NULL,
  description TEXT,
  type rule_type NOT NULL DEFAULT 'custom',
  config JSONB NOT NULL DEFAULT '{}',
  trigger_condition TEXT,
  scope TEXT,
  action TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  default_view TEXT NOT NULL DEFAULT 'dashboard',
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rule sets table - groups of rules
CREATE TABLE public.rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table for rule sets and rules
CREATE TABLE public.rule_set_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES public.rule_sets(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.rules(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rule_set_id, rule_id)
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user owns a rule set
CREATE OR REPLACE FUNCTION public.owns_rule_set(p_rule_set_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rule_sets
    WHERE id = p_rule_set_id AND user_id = auth.uid()
  );
$$;

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_set_rules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - RULES
-- =============================================

CREATE POLICY "Users can view their own rules"
  ON public.rules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own rules"
  ON public.rules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rules"
  ON public.rules FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own rules"
  ON public.rules FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - RULE TEMPLATES
-- =============================================

CREATE POLICY "Users can view public templates or their own"
  ON public.rule_templates FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON public.rule_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON public.rule_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.rule_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - USER PREFERENCES
-- =============================================

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - RULE SETS
-- =============================================

CREATE POLICY "Users can view their own rule sets"
  ON public.rule_sets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own rule sets"
  ON public.rule_sets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rule sets"
  ON public.rule_sets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own rule sets"
  ON public.rule_sets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - RULE SET RULES (Junction)
-- =============================================

CREATE POLICY "Users can view rules in their own rule sets"
  ON public.rule_set_rules FOR SELECT
  TO authenticated
  USING (public.owns_rule_set(rule_set_id));

CREATE POLICY "Users can add rules to their own rule sets"
  ON public.rule_set_rules FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_rule_set(rule_set_id));

CREATE POLICY "Users can update rules in their own rule sets"
  ON public.rule_set_rules FOR UPDATE
  TO authenticated
  USING (public.owns_rule_set(rule_set_id))
  WITH CHECK (public.owns_rule_set(rule_set_id));

CREATE POLICY "Users can remove rules from their own rule sets"
  ON public.rule_set_rules FOR DELETE
  TO authenticated
  USING (public.owns_rule_set(rule_set_id));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON public.rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rule_templates_updated_at
  BEFORE UPDATE ON public.rule_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rule_sets_updated_at
  BEFORE UPDATE ON public.rule_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_rules_user_id ON public.rules(user_id);
CREATE INDEX idx_rules_status ON public.rules(status);
CREATE INDEX idx_rules_type ON public.rules(type);
CREATE INDEX idx_rule_templates_user_id ON public.rule_templates(user_id);
CREATE INDEX idx_rule_templates_is_public ON public.rule_templates(is_public);
CREATE INDEX idx_rule_sets_user_id ON public.rule_sets(user_id);
CREATE INDEX idx_rule_set_rules_rule_set_id ON public.rule_set_rules(rule_set_id);
CREATE INDEX idx_rule_set_rules_rule_id ON public.rule_set_rules(rule_id);