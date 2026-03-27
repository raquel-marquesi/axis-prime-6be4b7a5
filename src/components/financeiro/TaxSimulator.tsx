import { useState } from 'react';
import { useTaxRules, type TaxRule } from '@/hooks/useTaxRules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateTaxesLucroPresumido } from '@/lib/taxCalculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TaxSimulator() {
  const [revenue, setRevenue] = useState(100000);
  const [issRate, setIssRate] = useState(5);
  const result = calculateTaxesLucroPresumido(revenue, issRate / 100);

  const rows = [
    { label: 'Receita Bruta', value: result.receita_bruta },
    { label: 'Base Presumida (32%)', value: result.base_presumida },
    { label: 'IRPJ (15%)', value: result.irpj },
    { label: 'IRPJ Adicional (10%)', value: result.irpj_adicional },
    { label: 'CSLL (9%)', value: result.csll },
    { label: 'PIS (0,65%)', value: result.pis },
    { label: 'COFINS (3%)', value: result.cofins },
    { label: `ISS (${issRate}%)`, value: result.iss },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Simulador de Impostos - Lucro Presumido</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Receita Bruta Mensal (R$)</Label><Input type="number" value={revenue} onChange={e => setRevenue(Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Alíquota ISS: {issRate}%</Label><Slider value={[issRate]} onValueChange={([v]) => setIssRate(v)} min={2} max={5} step={0.5} /></div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Imposto</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (<TableRow key={r.label}><TableCell>{r.label}</TableCell><TableCell className="text-right">{fmt(r.value)}</TableCell></TableRow>))}
            <TableRow className="font-bold border-t-2"><TableCell>Total de Impostos</TableCell><TableCell className="text-right text-destructive">{fmt(result.total_impostos)}</TableCell></TableRow>
            <TableRow className="font-bold"><TableCell>Alíquota Efetiva</TableCell><TableCell className="text-right">{(result.aliquota_efetiva * 100).toFixed(2)}%</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}