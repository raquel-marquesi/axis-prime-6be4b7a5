import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
interface MovingAveragesData { label: string; avg3m: number; avg6m: number; avg12m: number; }
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function MovingAveragesCard({ data }: { data: MovingAveragesData[] }) {
  return (<Card><CardHeader><CardTitle className="text-sm">Médias Móveis</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead className="text-right">3 Meses</TableHead><TableHead className="text-right">6 Meses</TableHead><TableHead className="text-right">12 Meses</TableHead></TableRow></TableHeader><TableBody>{data.map((row) => (<TableRow key={row.label}><TableCell className="font-medium">{row.label}</TableCell><TableCell className="text-right">{fmt(row.avg3m)}</TableCell><TableCell className="text-right">{fmt(row.avg6m)}</TableCell><TableCell className="text-right">{fmt(row.avg12m)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>);
}