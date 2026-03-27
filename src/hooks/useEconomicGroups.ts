import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useEconomicGroups = () => {
  const { data: economicGroups, isLoading } = useQuery({
    queryKey: ["economic_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("economic_groups").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
  return { economicGroups: economicGroups || [], isLoading };
};
