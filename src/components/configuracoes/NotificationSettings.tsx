import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Clock } from 'lucide-react';

export const NotificationSettings = () => {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [newSolicitacao, setNewSolicitacao] = useState(true);
  const [reminderDays, setReminderDays] = useState('3');

  const handleSave = () => {
    toast({ title: 'Notificações atualizadas', description: 'Suas preferências foram salvas.' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Preferências de Notificação</CardTitle>
          <CardDescription>Configure como e quando deseja receber notificações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Notificações por E-mail</Label>
              <p className="text-sm text-muted-foreground">Receber notificações no e-mail cadastrado</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />Alertas de Prazos</Label>
              <p className="text-sm text-muted-foreground">Notificar sobre prazos próximos ou vencidos</p>
            </div>
            <Switch checked={deadlineAlerts} onCheckedChange={setDeadlineAlerts} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Novos Prazos</Label>
              <p className="text-sm text-muted-foreground">Notificar quando receber novos prazos</p>
            </div>
            <Switch checked={newSolicitacao} onCheckedChange={setNewSolicitacao} />
          </div>
          <div className="space-y-2">
            <Label>Antecedência do Lembrete (dias)</Label>
            <Input type="number" min="1" max="30" value={reminderDays} onChange={e => setReminderDays(e.target.value)} className="w-32" />
            <p className="text-sm text-muted-foreground">Quantos dias antes do vencimento enviar o lembrete</p>
          </div>
          <Button onClick={handleSave}>Salvar Notificações</Button>
        </CardContent>
      </Card>
    </div>
  );
};
