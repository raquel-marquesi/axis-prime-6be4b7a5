import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useBranches = () => {
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
  return { branches: branches || [], isLoading };
};
