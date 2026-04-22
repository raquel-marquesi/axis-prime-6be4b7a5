import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import * as forge from 'https://esm.sh/node-forge@1.3.1';
import { SignedXml } from 'https://esm.sh/xml-crypto@3.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore: Deno is available in Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { invoice_id, codigo_servico, discriminacao, aliquota_iss, deducoes } = await req.json();

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, billing_contacts(*), accounts(nome)')
      .eq('id', invoice_id)
      .single();
      
    const { data: config, error: cfgError } = await supabase
      .from('nfse_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!invoice || !config) throw new Error('Invoice ou Configuração não encontrada');

    // Paulistana Direct Integration
    if (config.provider === 'paulistana') {
      const pfxBase64 = Deno.env.get('PFX_CERT_BASE64');
      const pfxPass = Deno.env.get('PFX_PASSWORD');
      
      if (!pfxBase64 || !pfxPass) throw new Error('Certificado Digital não configurado (PFX_CERT_BASE64/PFX_PASSWORD).');

      const xml = buildPaulistanaXML(invoice, config, { codigo_servico, discriminacao, aliquota_iss, deducoes });
      const signedXml = signPaulistanaXML(xml, pfxBase64, pfxPass);
      
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <EnvioLoteRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
      <VersaoSchema>1</VersaoSchema>
      <MensagemXML>${signedXml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</MensagemXML>
    </EnvioLoteRPS>
  </soap:Body>
</soap:Envelope>`;

      const response = await fetch('https://nfe.prefeitura.sp.gov.br/ws/lote.asmx', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://www.prefeitura.sp.gov.br/nfe/EnvioLoteRPS',
        },
        body: soapEnvelope,
      });

      const responseText = await response.text();
      const protocolMatch = responseText.match(/<Protocolo>(.*?)<\/Protocolo>/);
      
      if (protocolMatch) {
         await supabase.from('invoices').update({ 
           nfe_status: 'processando',
           nfe_protocol: protocolMatch[1],
           updated_at: new Date().toISOString()
         }).eq('id', invoice_id);
         return new Response(JSON.stringify({ success: true, protocol: protocolMatch[1] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
         const errorMatch = responseText.match(/<Descricao>(.*?)<\/Descricao>/);
         throw new Error(errorMatch ? errorMatch[1] : 'Erro na comunicação com a Prefeitura de SP. Valide o XML ou Certificado.');
      }
    }

    // Default provider logic (Webmania/Focus/etc)
    const apiKey = Deno.env.get('NFSE_PROVIDER_API_KEY');
    const providerUrl = config.provider_api_url || getDefaultProviderUrl(config.provider);

    const payload = {
      prestador: { cnpj: config.cnpj.replace(/\D/g, ''), inscricao_municipal: config.inscricao_municipal },
      tomador: {
        cpf_cnpj: invoice.billing_contacts?.cpf_cnpj.replace(/\D/g, ''),
        razao_social: invoice.billing_contacts?.razao_social,
        email: invoice.billing_contacts?.email_nf,
      },
      servico: {
        codigo_servico: codigo_servico || config.codigo_servico,
        discriminacao: discriminacao || invoice.descricao,
        valor_servicos: invoice.valor,
        aliquota_iss: aliquota_iss || config.aliquota_iss,
      }
    };

    const providerResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });

    const result = await providerResponse.json();
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function buildPaulistanaXML(invoice: any, config: any, overrides: any) {
  const cnpj = config.cnpj.replace(/\D/g, '');
  const tomadorCpfCnpj = invoice.billing_contacts?.cpf_cnpj.replace(/\D/g, '') || '';
  const valor = invoice.valor || 0;
  
  return `<PedidoEnvioLoteRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente><CNPJ>${cnpj}</CNPJ></CPFCNPJRemetente>
    <transacao>false</transacao>
    <dtInicio>${new Date().toISOString().split('T')[0]}</dtInicio>
    <dtFim>${new Date().toISOString().split('T')[0]}</dtFim>
    <QtdRPS>1</QtdRPS>
    <ValorTotalServicos>${valor.toFixed(2)}</ValorTotalServicos>
    <ValorTotalDeducoes>${(overrides.deducoes || 0).toFixed(2)}</ValorTotalDeducoes>
  </Cabecalho>
  <LoteRPS ID="L1">
    <RPS>
      <ChaveRPS>
        <InscricaoPrestador>${config.inscricao_municipal.replace(/\D/g, '')}</InscricaoPrestador>
        <SerieRPS>1</SerieRPS>
        <NumeroRPS>${Math.floor(Date.now()/1000)}</NumeroRPS>
      </ChaveRPS>
      <TipoRPS>RPS</TipoRPS>
      <DataEmissao>${new Date().toISOString().split('T')[0]}</DataEmissao>
      <StatusRPS>N</StatusRPS>
      <TributacaoRPS>T</TributacaoRPS>
      <ValorServicos>${valor.toFixed(2)}</ValorServicos>
      <ValorDeducoes>${(overrides.deducoes || 0).toFixed(2)}</ValorDeducoes>
      <CodigoServico>${overrides.codigo_servico || config.codigo_servico}</CodigoServico>
      <AliquotaServicos>${(overrides.aliquota_iss || config.aliquota_iss || 0.05).toFixed(4)}</AliquotaServicos>
      <ISSRetido>false</ISSRetido>
      <CPFCNPJTomador>
        ${tomadorCpfCnpj.length <= 11 ? `<CPF>${tomadorCpfCnpj}</CPF>` : `<CNPJ>${tomadorCpfCnpj}</CNPJ>`}
      </CPFCNPJTomador>
      <RazaoSocialTomador>${invoice.billing_contacts?.razao_social}</RazaoSocialTomador>
      <Discriminacao>${overrides.discriminacao || invoice.descricao}</Discriminacao>
    </RPS>
  </LoteRPS>
</PedidoEnvioLoteRPS>`;
}

function signPaulistanaXML(xml: string, pfxBase64: string, pfxPass: string) {
  const pfxDer = forge.util.decode64(pfxBase64);
  const p12Asn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pfxPass);
  
  const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  const privateKey = keyBag.key;
  const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  const certPem = forge.pki.certificateToPem(certBag.cert);

  const sig = new SignedXml();
  sig.addReference("//*[local-name(.)='LoteRPS']");
  sig.addReference("//*[local-name(.)='PedidoEnvioLoteRPS']");
  sig.signingKey = privateKeyPem;
  sig.keyInfoProvider = { 
    getKeyInfo: () => `<X509Data><X509Certificate>${certPem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '')}</X509Certificate></X509Data>` 
  };
  sig.computeSignature(xml);
  return sig.getSignedXml();
}

function getDefaultProviderUrl(provider: string): string {
  switch (provider) {
    case 'webmania': return 'https://webmaniabr.com/api/2/nfse/emissao';
    case 'focus_nfe': return 'https://api.focusnfe.com.br/v2/nfse';
    default: return 'https://webmaniabr.com/api/2/nfse/emissao';
  }
}
