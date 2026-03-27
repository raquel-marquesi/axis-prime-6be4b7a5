import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useNfse } from '@/hooks/useNfse';
import { Send } from 'lucide-react';

interface NfseEmitDialogProps { open: boolean; onOpenChange: (open: boolean) => void; invoice: any | null; }

export function NfseEmitDialog({ open, onOpenChange, invoice }: NfseEmitDialogProps) {
  const { config, emitNfse } = useNfse();
  const [codigoServico, setCodigoServico] = useState('');
  const [discriminacao, setDiscriminacao] = useState('');
  const [aliquotaIss, setAliquotaIss] = useState(0);
  const [deducoes, setDeducoes] = useState(0);

  useEffect(() => {
    if (config) { setCodigoServico(config.codigo_servico || '17.01'); setAliquotaIss(config.aliquota_iss || 5); }
    if (invoice) { setDiscriminacao(invoice.descricao || ''); }
    setDeducoes(0);
  }, [config, invoice]);

  if (!invoice) return null;

  const valorServicos = invoice.valor || 0;
  const baseCalculo = valorServicos - deducoes;
  const valorIss = baseCalculo * (aliquotaIss / 100);
  const billingContact = invoice.billing_contacts;
  const account = invoice.accounts;

  const handleEmit = () => {
    emitNfse.mutate({ invoice_id: invoice.id, codigo_servico: codigoServico, discriminacao, aliquota_iss: aliquotaIss, deducoes }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Emitir NFS-e</DialogTitle></DialogHeader>
        <div className="space-y-6">
          {config && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Prestador</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Razão Social</span><p className="font-medium">{config.razao_social}</p></div>
                <div><span className="text-muted-foreground">CNPJ</span><p className="font-medium">{config.cnpj}</p></div>
                <div><span className="text-muted-foreground">Inscrição Municipal</span><p className="font-medium">{config.inscricao_municipal}</p></div>
              </div>
            </div>
          )}
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Tomador</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Razão Social</span><p className="font-medium">{billingContact?.razao_social || '-'}</p></div>
              <div><span className="text-muted-foreground">CPF/CNPJ</span><p className="font-medium">{billingContact?.cpf_cnpj || '-'}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground">Conta</span><p className="font-medium">{account?.nome || '-'}</p></div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Serviço</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código do Serviço</Label><Input value={codigoServico} onChange={e => setCodigoServico(e.target.value)} /></div>
              <div><Label>Valor Total (R$)</Label><Input value={valorServicos.toFixed(2)} disabled /></div>
              <div className="col-span-2"><Label>Discriminação do Serviço</Label><Textarea value={discriminacao} onChange={e => setDiscriminacao(e.target.value)} rows={3} /></div>
              <div><Label>Alíquota ISS (%)</Label><Input type="number" step="0.01" value={aliquotaIss} onChange={e => setAliquotaIss(parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Deduções (R$)</Label><Input type="number" step="0.01" value={deducoes} onChange={e => setDeducoes(parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Base de Cálculo</span><p className="font-semibold text-lg">R$ {baseCalculo.toFixed(2)}</p></div>
              <div><span className="text-muted-foreground">Valor ISS</span><p className="font-semibold text-lg">R$ {valorIss.toFixed(2)}</p></div>
              <div><span className="text-muted-foreground">Valor Líquido</span><p className="font-semibold text-lg">R$ {(valorServicos - valorIss).toFixed(2)}</p></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleEmit} disabled={emitNfse.isPending}><Send className="h-4 w-4 mr-2" /> Emitir NFS-e</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}