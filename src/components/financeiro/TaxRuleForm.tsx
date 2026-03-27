import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { TaxRule } from '@/hooks/useTaxRules';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; rule?: TaxRule | null; onSubmit: (data: Omit<TaxRule, 'id' | 'created_at' | 'updated_at'>) => void; }

export function TaxRuleForm({ open, onOpenChange, rule, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [regime, setRegime] = useState('lucro_presumido');
  const [aliquot, setAliquot] = useState(0);
  const [minRevenue, setMinRevenue] = useState('');
  const [maxRevenue, setMaxRevenue] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { if (rule) { setName(rule.name); setRegime(rule.regime); setAliquot(rule.aliquot_percentage); setMinRevenue(rule.min_revenue?.toString() || ''); setMaxRevenue(rule.max_revenue?.toString() || ''); setIsActive(rule.is_active); } else { setName(''); setRegime('lucro_presumido'); setAliquot(0); setMinRevenue(''); setMaxRevenue(''); setIsActive(true); } }, [rule, open]);

  const handleSubmit = () => { onSubmit({ name, regime, aliquot_percentage: aliquot, min_revenue: minRevenue ? Number(minRevenue) : null, max_revenue: maxRevenue ? Number(maxRevenue) : null, is_active: isActive }); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{rule ? 'Editar Regra' : 'Nova Regra Tributária'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Regime</Label><Select value={regime} onValueChange={setRegime}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="simples_nacional">Simples Nacional</SelectItem><SelectItem value="lucro_presumido">Lucro Presumido</SelectItem><SelectItem value="lucro_real">Lucro Real</SelectItem></SelectContent></Select></div>
          <div><Label>Alíquota (%)</Label><Input type="number" value={aliquot} onChange={e => setAliquot(Number(e.target.value))} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Receita Mín (R$)</Label><Input type="number" value={minRevenue} onChange={e => setMinRevenue(e.target.value)} /></div><div><Label>Receita Máx (R$)</Label><Input type="number" value={maxRevenue} onChange={e => setMaxRevenue(e.target.value)} /></div></div>
          <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Ativa</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={!name}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}