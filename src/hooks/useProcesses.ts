import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Process = any;
export type AreaProcesso = "civel" | "trabalhista";

export const useProcesses = () => {
  const [filters, setFilters] = useState<any>({});
  
  const { data: processes, isLoading, refetch } = useQuery({
    queryKey: ["processes", filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("*, clients(nome, razao_social)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({ ...p, client: p.clients }));
    },
  });
  return { processes: processes || [], isLoading, refetch, filters, setFilters };
};

export const useProcessesSummary = () => {
  return { summary: { total: 0, ativos: 0, encerrados: 0 }, isLoading: false };
};
