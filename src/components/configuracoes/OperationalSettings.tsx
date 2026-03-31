import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Activity, Target, Calculator, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { AREA_LABELS, type AreaSetor } from '@/types/auth';

export const OperationalSettings = () => {
  const queryClient = useQueryClient();

  // ── Activity Types ──
  const { data: activityTypes = [], isLoading: loadingAT } = useQuery({
    queryKey: ['activity-types-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_types').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const [atDialog, setAtDialog] = useState(false);
  const [atForm, setAtForm] = useState({ name: '', weight: '1', area: '', description: '' });

  const createAT = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('activity_types').insert({
        name: atForm.name,
        weight: parseFloat(atForm.weight),
        area: (atForm.area || null) as any,
        description: atForm.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-types-config'] });
      toast.success('Tipo de atividade criado');
      setAtDialog(false);
      setAtForm({ name: '', weight: '1', area: '', description: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Area Goals ──
  const { data: areaGoals = [], isLoading: loadingAG } = useQuery({
    queryKey: ['area-goals-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('area_goals').select('*').order('area');
      if (error) throw error;
      return data;
    },
  });

  const [agDialog, setAgDialog] = useState(false);
  const [agForm, setAgForm] = useState({ area: '', monthly_goal: '', extra_value: '30' });

  const createAG = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('area_goals').insert({
        area: agForm.area as any,
        monthly_goal: parseInt(agForm.monthly_goal),
        extra_value_per_calculation: parseFloat(agForm.extra_value),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-goals-config'] });
      toast.success('Meta criada');
      setAgDialog(false);
      setAgForm({ area: '', monthly_goal: '', extra_value: '30' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Calculation Types ──
  const { data: calcTypes = [], isLoading: loadingCT } = useQuery({
    queryKey: ['calculation-types-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('calculation_types').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const [ctDialog, setCtDialog] = useState(false);
  const [ctForm, setCtForm] = useState({ name: '', estimated_complexity: '1' });

  const createCT = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('calculation_types').insert({
        name: ctForm.name,
        estimated_complexity: parseInt(ctForm.estimated_complexity),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-types-config'] });
      toast.success('Tipo de cálculo criado');
      setCtDialog(false);
      setCtForm({ name: '', estimated_complexity: '1' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Phase Area Mapping ──
  const { data: phaseMappings = [], isLoading: loadingPM } = useQuery({
    queryKey: ['phase-area-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase.from('phase_area_mapping' as any).select('*').order('fase_keyword');
      if (error) throw error;
      return data as any[];
    },
  });

  const [pmDialog, setPmDialog] = useState(false);
  const [pmForm, setPmForm] = useState({ fase_keyword: '', area_setor: '' });

  const createPM = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('phase_area_mapping' as any).insert({
        fase_keyword: pmForm.fase_keyword,
        area_setor: pmForm.area_setor,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase-area-mapping'] });
      toast.success('Mapeamento criado');
      setPmDialog(false);
      setPmForm({ fase_keyword: '', area_setor: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const areaOptions = Object.entries(AREA_LABELS);

  return (
    <div className="space-y-6">
      {/* Activity Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Tipos de Atividade</CardTitle>
            <CardDescription>Atividades do timesheet com peso para premiação ({activityTypes.length} registros).</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAtDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </CardHeader>
        <CardContent>
          {loadingAT ? <Skeleton className="h-32 w-full" /> : (
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Peso</TableHead><TableHead>Área</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {activityTypes.map((at: any) => (
                    <TableRow key={at.id}>
                      <TableCell className="font-medium">{at.name}</TableCell>
                      <TableCell>{at.weight}</TableCell>
                      <TableCell>{at.area ? AREA_LABELS[at.area as AreaSetor] || at.area : '—'}</TableCell>
                      <TableCell><Badge variant={at.is_active ? 'default' : 'secondary'}>{at.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Area Goals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Metas por Área</CardTitle>
            <CardDescription>Meta mensal e valor extra por cálculo excedente.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAgDialog(true)}><Plus className="h-4 w-4 mr-2" />Nova</Button>
        </CardHeader>
        <CardContent>
          {loadingAG ? <Skeleton className="h-32 w-full" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Área</TableHead><TableHead>Meta Mensal</TableHead><TableHead>Valor Extra/Cálculo</TableHead></TableRow></TableHeader>
              <TableBody>
                {areaGoals.map((ag: any) => (
                  <TableRow key={ag.id}>
                    <TableCell className="font-medium">{AREA_LABELS[ag.area as AreaSetor] || ag.area}</TableCell>
                    <TableCell>{ag.monthly_goal}</TableCell>
                    <TableCell>R$ {Number(ag.extra_value_per_calculation).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Calculation Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Tipos de Cálculo</CardTitle>
            <CardDescription>Categorias de cálculo com complexidade estimada.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCtDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </CardHeader>
        <CardContent>
          {loadingCT ? <Skeleton className="h-32 w-full" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Complexidade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {calcTypes.map((ct: any) => (
                  <TableRow key={ct.id}>
                    <TableCell className="font-medium">{ct.name}</TableCell>
                    <TableCell>{ct.estimated_complexity}</TableCell>
                    <TableCell><Badge variant={ct.is_active ? 'default' : 'secondary'}>{ct.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Phase Area Mapping */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />Mapeamento Fase → Área</CardTitle>
            <CardDescription>Keywords de fase para distribuição automática por área.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setPmDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </CardHeader>
        <CardContent>
          {loadingPM ? <Skeleton className="h-32 w-full" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Keyword da Fase</TableHead><TableHead>Área/Setor</TableHead></TableRow></TableHeader>
              <TableBody>
                {phaseMappings.map((pm: any) => (
                  <TableRow key={pm.id}>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{pm.fase_keyword}</code></TableCell>
                    <TableCell>{AREA_LABELS[pm.area_setor as AreaSetor] || pm.area_setor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={atDialog} onOpenChange={setAtDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Tipo de Atividade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={atForm.name} onChange={e => setAtForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Peso</Label><Input type="number" step="0.1" value={atForm.weight} onChange={e => setAtForm(p => ({ ...p, weight: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={atForm.area} onValueChange={v => setAtForm(p => ({ ...p, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{areaOptions.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={atForm.description} onChange={e => setAtForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtDialog(false)}>Cancelar</Button>
            <Button onClick={() => createAT.mutate()} disabled={!atForm.name || createAT.isPending}>{createAT.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={agDialog} onOpenChange={setAgDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Meta por Área</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={agForm.area} onValueChange={v => setAgForm(p => ({ ...p, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{areaOptions.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Meta Mensal</Label><Input type="number" value={agForm.monthly_goal} onChange={e => setAgForm(p => ({ ...p, monthly_goal: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Valor Extra/Cálculo (R$)</Label><Input type="number" step="0.01" value={agForm.extra_value} onChange={e => setAgForm(p => ({ ...p, extra_value: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgDialog(false)}>Cancelar</Button>
            <Button onClick={() => createAG.mutate()} disabled={!agForm.area || !agForm.monthly_goal || createAG.isPending}>{createAG.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ctDialog} onOpenChange={setCtDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Tipo de Cálculo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={ctForm.name} onChange={e => setCtForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Complexidade Estimada</Label><Input type="number" value={ctForm.estimated_complexity} onChange={e => setCtForm(p => ({ ...p, estimated_complexity: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCtDialog(false)}>Cancelar</Button>
            <Button onClick={() => createCT.mutate()} disabled={!ctForm.name || createCT.isPending}>{createCT.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Mapeamento Fase → Área</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Keyword da Fase</Label><Input placeholder="ex: Execução, Conhecimento" value={pmForm.fase_keyword} onChange={e => setPmForm(p => ({ ...p, fase_keyword: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Área/Setor</Label>
              <Select value={pmForm.area_setor} onValueChange={v => setPmForm(p => ({ ...p, area_setor: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{areaOptions.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPmDialog(false)}>Cancelar</Button>
            <Button onClick={() => createPM.mutate()} disabled={!pmForm.fase_keyword || !pmForm.area_setor || createPM.isPending}>{createPM.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
