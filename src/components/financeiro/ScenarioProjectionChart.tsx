import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
interface ScenarioData { month: string; conservador: number; base: number; otimista: number; }
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function ScenarioProjectionChart({ data }: { data: ScenarioData[] }) {
  return (<Card><CardHeader><CardTitle className="text-sm">Projeção de Cenários</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" className="text-xs" /><YAxis tickFormatter={fmt} className="text-xs" /><Tooltip formatter={(v: number) => fmt(v)} /><Legend /><Bar dataKey="conservador" name="Conservador" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} /><Bar dataKey="base" name="Base" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} /><Bar dataKey="otimista" name="Otimista" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>);
}