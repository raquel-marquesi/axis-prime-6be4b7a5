
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS metodo_recepcao TEXT DEFAULT 'email' CHECK (metodo_recepcao IN ('email', 'portal_api', 'manual')),
ADD COLUMN IF NOT EXISTS monitorar_contrato BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.clients.metodo_recepcao IS 'Método preferencial de recebimento de novas solicitações/prazos.';
COMMENT ON COLUMN public.clients.monitorar_contrato IS 'Se verdadeiro, o sistema enviará alertas de vencimento do contrato.';
