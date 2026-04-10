-- Add fields for native SP NF-e integration

ALTER TABLE public.nfse_config
ADD COLUMN IF NOT EXISTS certificado_a1_base64 text,
ADD COLUMN IF NOT EXISTS senha_certificado text,
ADD COLUMN IF NOT EXISTS codigo_tributacao_municipio text,
ADD COLUMN IF NOT EXISTS natureza_operacao integer DEFAULT 1;
