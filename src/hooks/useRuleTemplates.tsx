import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { RuleType } from "./useRules";
import type { Json } from "@/integrations/supabase/types";

export interface RuleTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  type: RuleType;
  config: Json;
  trigger_condition: string | null;
  scope: string | null;
  action: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  type: RuleType;
  config?: Json;
  trigger_condition?: string;
  scope?: string;
  action?: string;
  is_public?: boolean;
}

export function useRuleTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["rule_templates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("rule_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data as RuleTemplate[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("rule_templates")
        .insert({
          name: input.name,
          description: input.description,
          type: input.type,
          config: input.config ?? {},
          trigger_condition: input.trigger_condition,
          scope: input.scope,
          action: input.action,
          is_public: input.is_public ?? false,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as RuleTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rule_templates", user?.id] });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rule_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rule_templates", user?.id] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    createTemplate,
    deleteTemplate,
  };
}
