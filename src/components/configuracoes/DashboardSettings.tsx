import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RotateCcw, Save } from 'lucide-react';
import { getAvailableWidgets, getDefaultWidgetIds } from '@/lib/dashboardWidgets';

export function DashboardSettings() {
  const { profile, roles, session } = useAuth();
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const availableWidgets = getAvailableWidgets(roles);
  const defaultIds = getDefaultWidgetIds(roles);

  useEffect(() => {
    const config = (profile as any)?.dashboard_config as { widgets?: string[] } | null;
    if (config?.widgets) {
      // Filter to only widgets the user still has access to
      const validIds = new Set(availableWidgets.map(w => w.id));
      setSelectedWidgets(config.widgets.filter(id => validIds.has(id)));
    } else {
      setSelectedWidgets(defaultIds);
    }
    setLoaded(true);
  }, [profile, roles]);

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev =>
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ dashboard_config: { widgets: selectedWidgets } } as any)
        .eq('user_id', session.user.id);
      if (error) throw error;
      toast.success('Configuração do dashboard salva com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar configuração: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = () => {
    setSelectedWidgets(defaultIds);
    toast.info('Restaurado para a configuração padrão. Clique em Salvar para confirmar.');
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalizar Dashboard</CardTitle>
        <CardDescription>
          Escolha quais widgets aparecem na sua visão geral do dashboard. As opções disponíveis dependem do seu perfil de acesso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableWidgets.map(widget => (
            <label
              key={widget.id}
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={selectedWidgets.includes(widget.id)}
                onCheckedChange={() => toggleWidget(widget.id)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium leading-none">{widget.label}</span>
                <p className="text-xs text-muted-foreground">{widget.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="outline" onClick={handleRestore} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
