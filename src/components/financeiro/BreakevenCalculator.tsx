import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BreakevenCalculator() {
  const [fixedCosts, setFixedCosts] = useState(50000);
  const [marginPercent, setMarginPercent] = useState(30);
  const breakeven = marginPercent > 0 ? fixedCosts / (marginPercent / 100) : 0;
  return (
    <Card><CardHeader><CardTitle className="text-sm">Calculadora Break-even</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2"><Label>Custos Fixos Mensais</Label><Input type="number" value={fixedCosts} onChange={(e) => setFixedCosts(Number(e.target.value))} /></div>
        <div className="space-y-2"><Label>Margem de Contribuição: {marginPercent}%</Label><Slider value={[marginPercent]} onValueChange={([v]) => setMarginPercent(v)} min={1} max={100} step={1} /></div>
        <div className="rounded-lg bg-muted p-4 text-center"><p className="text-sm text-muted-foreground">Receita necessária para Break-even</p><p className="text-2xl font-bold text-primary">{fmt(breakeven)}</p><p className="text-xs text-muted-foreground mt-1">Com margem de {marginPercent}%, você precisa faturar {fmt(breakeven)} para cobrir {fmt(fixedCosts)} em custos fixos.</p></div>
      </CardContent></Card>
  );
}