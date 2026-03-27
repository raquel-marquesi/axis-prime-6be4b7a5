import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, DollarSign } from 'lucide-react';
import { useBonus } from '@/hooks/useBonus';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AREA_LABELS: Record<string, string> = {
  execucao: 'Execução',
  contingencia: 'Contingência Decisão',
  decisao: 'Contingência Inicial',
  acoes_coletivas: 'Ações Coletivas',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

function GaugeSVG({ percentage }: { percentage: number }) {
  const clamped = Math.min(Math.max(percentage, 0), 150);
  const radius = 80;
  const strokeWidth = 14;
  const cx = 100;
  const cy = 95;
  const startAngle = Math.PI;
  const totalSweep = Math.PI;
  const polarToCartesian = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });
  const bgStart = polarToCartesian(startAngle, radius);
  const bgEnd = polarToCartesian(0, radius);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;
  const valueSweep = Math.min(clamped / 100, 1) * totalSweep;
  const valueEndAngle = startAngle - valueSweep;
  const valueEnd = polarToCartesian(valueEndAngle, radius);
  const largeArc = valueSweep > Math.PI ? 1 : 0;
  const valuePath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${valueEnd.x} ${valueEnd.y}`;
  const needleAngle = startAngle - Math.min(clamped / 100, 1.5) * totalSweep;
  const needleLength = radius - 20;
  const needleTip = polarToCartesian(needleAngle, needleLength);
  let arcColor = 'hsl(var(--destructive))';
  if (clamped >= 100) arcColor = 'hsl(142 71% 45%)';
  else if (clamped >= 80) arcColor = 'hsl(48 96% 53%)';
  else if (clamped >= 50) arcColor = 'hsl(38 92% 50%)';
  return (
    <svg viewBox="0 0 200 115" className="w-full max-w-[240px] mx-auto">
      <path d={bgPath} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} strokeLinecap="round" />
      {clamped > 0 && <path d={valuePath} fill="none" stroke={arcColor} strokeWidth={strokeWidth} strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="hsl(var(--foreground))" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill="hsl(var(--foreground))" />
      <text x={cx} y={cy - 18} textAnchor="middle" className="fill-foreground" fontSize="22" fontWeight="700">{clamped.toFixed(0)}%</text>
      <text x={cx - radius + 5} y={cy + 14} textAnchor="start" className="fill-muted-foreground" fontSize="9">0</text>
      <text x={cx} y={15} textAnchor="middle" className="fill-muted-foreground" fontSize="9">50</text>
      <text x={cx + radius - 5} y={cy + 14} textAnchor="end" className="fill-muted-foreground" fontSize="9">100</text>
    </svg>
  );
}

export function BonusGaugeWidget() {
  const { myBonus, areaGoals, isLoadingMyBonus } = useBonus();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const currentGoal = areaGoals.find((g) => g.area === profile?.area);
  const latestBonus = myBonus[0];
  const production = latestBonus ? Number(latestBonus.total_weighted) : 0;
  const goal = currentGoal?.monthly_goal ?? 0;
  const pct = goal > 0 ? (production / goal) * 100 : 0;
  const bonus = latestBonus ? Number(latestBonus.bonus_amount) : 0;
  if (isLoadingMyBonus) {
    return (
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" />Premiação do Mês</CardTitle></CardHeader>
        <CardContent><div className="text-muted-foreground text-sm text-center py-8">Carregando...</div></CardContent></Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5 text-yellow-500" />Premiação do Mês</CardTitle>
        <p className="text-xs text-muted-foreground">{AREA_LABELS[profile?.area || ''] || 'Área não definida'}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <GaugeSVG percentage={pct} />
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Produção ponderada</span><span className="font-semibold tabular-nums">{production.toFixed(1)} / {goal}</span></div>
          <div className="flex items-center justify-between"><div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-green-600" /><span className="text-muted-foreground">Bônus projetado</span></div><span className="font-semibold text-green-600 tabular-nums">R$ {bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          {latestBonus && (<div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><Badge variant={latestBonus.status === 'paid' ? 'outline' : latestBonus.status === 'approved' ? 'default' : 'secondary'}>{STATUS_LABELS[latestBonus.status] || latestBonus.status}</Badge></div>)}
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/premiacao')}><TrendingUp className="h-4 w-4 mr-2" />Ver detalhes</Button>
      </CardContent>
    </Card>
  );
}