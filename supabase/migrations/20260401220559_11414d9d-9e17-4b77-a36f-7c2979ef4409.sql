CREATE OR REPLACE FUNCTION public.get_process_counts_by_client()
RETURNS TABLE(client_id uuid, process_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id_cliente, count(*) 
  FROM processes 
  WHERE id_cliente IS NOT NULL 
  GROUP BY id_cliente;
$$;