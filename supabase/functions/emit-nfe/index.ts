import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_id, codigo_servico, discriminacao, aliquota_iss, deducoes } = await req.json();

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: 'invoice_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch invoice with billing contact
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, billing_contacts(*), accounts(nome)')
      .eq('id', invoice_id)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch nfse_config
    const { data: config, error: cfgError } = await supabase
      .from('nfse_config')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (cfgError || !config) {
      return new Response(JSON.stringify({ error: 'Configuração NFS-e não encontrada. Configure os dados do emitente primeiro.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get provider credentials from secrets
    const apiKey = Deno.env.get('NFSE_PROVIDER_API_KEY');
    const apiSecret = Deno.env.get('NFSE_PROVIDER_API_SECRET');

    if (!apiKey) {
      // Update status to error if no credentials
      await supabase.from('invoices').update({ nfe_status: 'erro' }).eq('id', invoice_id);
      return new Response(JSON.stringify({ error: 'Credenciais do provedor NFS-e não configuradas. Adicione NFSE_PROVIDER_API_KEY nos secrets.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Build payload based on provider
    const billingContact = invoice.billing_contacts;
    const valorServicos = invoice.valor || 0;
    const ded = deducoes || 0;
    const baseCalculo = valorServicos - ded;
    const aliquota = aliquota_iss || config.aliquota_iss || 5;
    const valorIss = baseCalculo * (aliquota / 100);

    const payload: Record<string, any> = {
      // Prestador
      prestador: {
        cnpj: config.cnpj,
        inscricao_municipal: config.inscricao_municipal,
        razao_social: config.razao_social,
        endereco: {
          logradouro: config.endereco_logradouro,
          numero: config.endereco_numero,
          complemento: config.endereco_complemento,
          bairro: config.endereco_bairro,
          cidade: config.endereco_cidade,
          estado: config.endereco_estado,
          cep: config.endereco_cep,
        },
      },
      // Tomador
      tomador: {
        cpf_cnpj: billingContact?.cpf_cnpj,
        razao_social: billingContact?.razao_social,
        inscricao_municipal: billingContact?.inscricao_municipal,
        email: billingContact?.email_nf,
        endereco: {
          logradouro: billingContact?.endereco_logradouro,
          numero: billingContact?.endereco_numero,
          complemento: billingContact?.endereco_complemento,
          bairro: billingContact?.endereco_bairro,
          cidade: billingContact?.endereco_cidade,
          estado: billingContact?.endereco_estado,
          cep: billingContact?.endereco_cep,
        },
      },
      // Serviço
      servico: {
        codigo_servico: codigo_servico || config.codigo_servico,
        discriminacao: discriminacao || invoice.descricao || '',
        valor_servicos: valorServicos,
        valor_deducoes: ded,
        base_calculo: baseCalculo,
        aliquota_iss: aliquota,
        valor_iss: valorIss,
      },
      // Regime tributário
      regime_tributario: config.regime_tributario,
    };

    // 5. Send to provider API
    const providerUrl = config.provider_api_url || getDefaultProviderUrl(config.provider);

    // Update status to processando before sending
    await supabase.from('invoices').update({ nfe_status: 'processando' }).eq('id', invoice_id);

    try {
      const providerResponse = await fetch(providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(apiSecret ? { 'X-Api-Secret': apiSecret } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await providerResponse.json();

      if (!providerResponse.ok || result.error || result.erro) {
        const errorMsg = result.error || result.erro || result.message || 'Erro desconhecido do provedor';
        await supabase.from('invoices').update({
          nfe_status: 'erro',
        }).eq('id', invoice_id);

        return new Response(JSON.stringify({ error: errorMsg, details: result }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 6. Update invoice with success data
      const updateData: Record<string, any> = {
        nfe_status: result.status === 'processando' ? 'processando' : 'autorizada',
      };
      if (result.protocolo || result.protocol) updateData.nfe_protocol = result.protocolo || result.protocol;
      if (result.pdf_url || result.pdf) updateData.nfe_pdf_url = result.pdf_url || result.pdf;
      if (result.xml_url || result.xml) updateData.nfe_xml_url = result.xml_url || result.xml;
      if (result.numero_nfse) updateData.numero_nf = String(result.numero_nfse);

      await supabase.from('invoices').update(updateData).eq('id', invoice_id);

      return new Response(JSON.stringify({ success: true, ...updateData, provider_response: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError: any) {
      await supabase.from('invoices').update({ nfe_status: 'erro' }).eq('id', invoice_id);
      return new Response(JSON.stringify({ error: `Erro ao conectar com provedor: ${fetchError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDefaultProviderUrl(provider: string): string {
  switch (provider) {
    case 'webmania':
      return 'https://webmaniabr.com/api/2/nfse/emissao';
    case 'focus_nfe':
      return 'https://api.focusnfe.com.br/v2/nfse';
    case 'enotas':
      return 'https://api.enotas.com.br/v2/empresas/nfse';
    default:
      return 'https://webmaniabr.com/api/2/nfse/emissao';
  }
}
