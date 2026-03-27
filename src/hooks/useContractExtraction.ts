import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExtractedContractData {
  tipo_pessoa: 'fisica' | 'juridica';
  nome: string | null;
  razao_social: string | null;
  cpf: string | null;
  cnpj: string | null;
  nome_fantasia: string | null;
  representante_legal: string | null;
  endereco: { cep: string | null; logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; estado: string | null; };
  contato: { nome: string | null; email: string | null; telefone: string | null; celular: string | null; };
  contrato: { objeto: string | null; data_inicio: string | null; data_vencimento: string | null; condicoes_faturamento: string | null; };
  confianca: number;
}

export interface ExtractionResult {
  success: boolean;
  extraction_id?: string;
  extracted_data?: ExtractedContractData;
  confidence?: number;
  missing_fields?: string[];
  error?: string;
}

export function useContractExtraction() {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  const extractContract = async (fileUrl: string, documentId?: string, clientId?: string): Promise<ExtractionResult> => {
    setIsExtracting(true);
    setExtractionResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('extract-contract', { body: { file_url: fileUrl, document_id: documentId, client_id: clientId } });
      if (error) throw new Error(error.message);
      const result = data as ExtractionResult;
      setExtractionResult(result);
      if (result.success) {
        toast({ title: 'Extração concluída', description: `Confiança: ${result.confidence}% - ${result.missing_fields?.length || 0} campos não encontrados` });
      } else {
        toast({ title: 'Erro na extração', description: result.error || 'Falha ao extrair dados do contrato', variant: 'destructive' });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: 'Erro na extração', description: errorMessage, variant: 'destructive' });
      const result: ExtractionResult = { success: false, error: errorMessage };
      setExtractionResult(result);
      return result;
    } finally {
      setIsExtracting(false);
    }
  };

  const clearExtractionResult = () => { setExtractionResult(null); };

  return { extractContract, isExtracting, extractionResult, clearExtractionResult };
}
