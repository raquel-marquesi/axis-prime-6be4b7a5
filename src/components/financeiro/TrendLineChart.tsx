import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
interface TrendLineChartProps { title: string; data: { name: string; value: number }[]; color?: string; formatter?: (value: number) => string; }
const currencyFormatter = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function TrendLineChart({ title, data, color = 'hsl(var(--primary))', formatter = currencyFormatter }: TrendLineChartProps) {
  return (<Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="name" className="text-xs" /><YAxis tickFormatter={formatter} className="text-xs" /><Tooltip formatter={(v: number) => formatter(v)} /><Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></CardContent></Card>);
}