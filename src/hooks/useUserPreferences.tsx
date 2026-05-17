import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: string;
  default_view: string;
  sidebar_collapsed: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesInput {
  theme?: string;
  default_view?: string;
  sidebar_collapsed?: boolean;
  notifications_enabled?: boolean;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["user_preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserPreferences | null;
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      if (!user) throw new Error("Not authenticated");
      
      // Upsert - create if doesn't exist, update if it does
      const { data, error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          ...input,
        }, { 
          onConflict: "user_id",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as UserPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_preferences", user?.id] });
    },
    onError: (error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    error: preferencesQuery.error,
    updatePreferences,
  };
}
