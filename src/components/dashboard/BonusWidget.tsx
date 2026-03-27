import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, DollarSign } from 'lucide-react';
import { useBonus } from '@/hooks/useBonus';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AREA_LABELS: Record<string, string> = {
  execucao: 'Execução', contingencia: 'Contingência', decisao: 'Decisão', acoes_coletivas: 'Ações Coletivas',
};

export function BonusWidget() {
  const { myBonus, areaGoals, isLoadingMyBonus } = useBonus();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const currentGoal = areaGoals.find((g) => g.area === profile?.area);
  const latestBonus = myBonus[0];
  const production = latestBonus ? Number(latestBonus.total_weighted) : 0;
  const goal = currentGoal?.monthly_goal ?? 0;
  const pct = goal > 0 ? Math.min((production / goal) * 100, 150) : 0;
  const bonus = latestBonus ? Number(latestBonus.bonus_amount) : 0;
  if (isLoadingMyBonus) {
    return (<Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" />Premiação do Mês</CardTitle></CardHeader><CardContent><div className="text-muted-foreground text-sm text-center py-4">Carregando...</div></CardContent></Card>);
  }
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" />Premiação do Mês</CardTitle><CardDescription>{AREA_LABELS[profile?.area || ''] || 'Área não definida'}</CardDescription></CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Produção ponderada</span><span className="font-semibold">{production.toFixed(1)} / {goal}</span></div>
          <div className="space-y-1"><Progress value={Math.min(pct, 100)} className="h-2" /><p className="text-xs text-muted-foreground text-right">{pct.toFixed(0)}% da meta</p></div>
          <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-green-600" /><span className="text-muted-foreground">Bônus projetado</span></div><span className="font-semibold text-green-600">R$ {bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          {latestBonus && (<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant={latestBonus.status === 'paid' ? 'outline' : latestBonus.status === 'approved' ? 'default' : 'secondary'}>{latestBonus.status === 'pending' ? 'Pendente' : latestBonus.status === 'approved' ? 'Aprovado' : latestBonus.status === 'paid' ? 'Pago' : 'Cancelado'}</Badge></div>)}
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate('/premiacao')}><TrendingUp className="h-4 w-4 mr-2" />Ver detalhes</Button>
        </div>
      </CardContent>
    </Card>
  );
}