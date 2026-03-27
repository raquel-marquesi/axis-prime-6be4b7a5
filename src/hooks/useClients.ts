import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Client = any;

export const useClients = () => {
  const { data: clients, isLoading, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({ ...c, branch_ids: [] }));
    },
  });
  return { clients: clients || [], isLoading, refetch };
};
