import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNfse } from '@/hooks/useNfse';
import { Save } from 'lucide-react';

interface NfseConfigDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

export function NfseConfigDialog({ open, onOpenChange }: NfseConfigDialogProps) {
  const { config, saveConfig } = useNfse();
  const [form, setForm] = useState({
    razao_social: '', cnpj: '', inscricao_municipal: '', codigo_servico: '17.01', aliquota_iss: 5, regime_tributario: 'simples_nacional',
    codigo_tributacao_municipio: '', natureza_operacao: 1, certificado_a1_base64: '', senha_certificado: '',
    endereco_logradouro: '', endereco_numero: '', endereco_complemento: '', endereco_bairro: '', endereco_cidade: 'São Paulo', endereco_estado: 'SP', endereco_cep: '',
    email_contato: '', provider: 'nativo_sp', provider_api_url: '',
  });

  useEffect(() => {
    if (config) {
      setForm({
        razao_social: config.razao_social || '', cnpj: config.cnpj || '', inscricao_municipal: config.inscricao_municipal || '',
        codigo_servico: config.codigo_servico || '17.01', aliquota_iss: config.aliquota_iss || 5, regime_tributario: config.regime_tributario || 'simples_nacional',
        codigo_tributacao_municipio: config.codigo_tributacao_municipio || '', natureza_operacao: config.natureza_operacao || 1,
        certificado_a1_base64: config.certificado_a1_base64 || '', senha_certificado: config.senha_certificado || '',
        endereco_logradouro: config.endereco_logradouro || '', endereco_numero: config.endereco_numero || '', endereco_complemento: config.endereco_complemento || '',
        endereco_bairro: config.endereco_bairro || '', endereco_cidade: config.endereco_cidade || 'São Paulo', endereco_estado: config.endereco_estado || 'SP',
        endereco_cep: config.endereco_cep || '', email_contato: config.email_contato || '', provider: config.provider || 'nativo_sp', provider_api_url: config.provider_api_url || '',
      });
    }
  }, [config]);

  const handleSave = () => {
    saveConfig.mutate({ ...form, is_active: true, ...(config?.id ? { id: config.id } : {}) }, { onSuccess: () => onOpenChange(false) });
  };

  const updateField = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Configurações do Emitente NFS-e</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Prestador</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Razão Social</Label><Input value={form.razao_social} onChange={e => updateField('razao_social', e.target.value)} /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => updateField('cnpj', e.target.value)} placeholder="00.000.000/0000-00" /></div>
              <div><Label>Inscrição Municipal</Label><Input value={form.inscricao_municipal} onChange={e => updateField('inscricao_municipal', e.target.value)} /></div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Fiscais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código do Serviço (CNAE Principal)</Label><Input value={form.codigo_servico} onChange={e => updateField('codigo_servico', e.target.value)} /></div>
              <div><Label>Código Tributação Município</Label><Input value={form.codigo_tributacao_municipio} onChange={e => updateField('codigo_tributacao_municipio', e.target.value)} placeholder="Ex: 01015" /></div>
              <div><Label>Natureza Operação</Label><Input type="number" value={form.natureza_operacao} onChange={e => updateField('natureza_operacao', parseInt(e.target.value, 10))} /></div>
              <div><Label>Alíquota ISS (%)</Label><Input type="number" step="0.01" value={form.aliquota_iss} onChange={e => updateField('aliquota_iss', parseFloat(e.target.value) || 0)} /></div>
              <div className="col-span-2">
                <Label>Regime Tributário</Label>
                <Select value={form.regime_tributario} onValueChange={v => updateField('regime_tributario', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Endereço</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><Label>Logradouro</Label><Input value={form.endereco_logradouro} onChange={e => updateField('endereco_logradouro', e.target.value)} /></div>
              <div><Label>Número</Label><Input value={form.endereco_numero} onChange={e => updateField('endereco_numero', e.target.value)} /></div>
              <div><Label>Complemento</Label><Input value={form.endereco_complemento} onChange={e => updateField('endereco_complemento', e.target.value)} /></div>
              <div><Label>Bairro</Label><Input value={form.endereco_bairro} onChange={e => updateField('endereco_bairro', e.target.value)} /></div>
              <div><Label>CEP</Label><Input value={form.endereco_cep} onChange={e => updateField('endereco_cep', e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.endereco_cidade} onChange={e => updateField('endereco_cidade', e.target.value)} /></div>
              <div><Label>Estado</Label><Input value={form.endereco_estado} onChange={e => updateField('endereco_estado', e.target.value)} maxLength={2} /></div>
              <div><Label>Email de Contato</Label><Input value={form.email_contato} onChange={e => updateField('email_contato', e.target.value)} type="email" /></div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Integração Nativa e Certificado A1</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Certificado Digital (String Base64 do PFX)</Label><Input value={form.certificado_a1_base64} onChange={e => updateField('certificado_a1_base64', e.target.value)} type="password" placeholder="MIIJbQIBAzCC..." /></div>
              <div className="col-span-2"><Label>Senha do Certificado</Label><Input value={form.senha_certificado} onChange={e => updateField('senha_certificado', e.target.value)} type="password" /></div>
              <div>
                <Label>Provedor</Label>
                <Select value={form.provider} onValueChange={v => updateField('provider', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nativo_sp">Prefeitura de SP (Nativo SOAP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>URL da API (opcional)</Label><Input value={form.provider_api_url} onChange={e => updateField('provider_api_url', e.target.value)} placeholder="https://..." /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveConfig.isPending}><Save className="h-4 w-4 mr-2" /> Salvar Configuração</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}