import { useState } from 'react';
import { Calendar, Clock, MapPin, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCalendar } from '@/hooks/useCalendar';
import { useToast } from '@/hooks/use-toast';
import { format, addHours } from 'date-fns';

interface CreateEventDialogProps { open: boolean; onOpenChange: (open: boolean) => void; userEmail: string; onEventCreated?: () => void; }

export function CreateEventDialog({ open, onOpenChange, userEmail, onEventCreated }: CreateEventDialogProps) {
  const now = new Date();
  const defaultStart = format(addHours(now, 1), "yyyy-MM-dd'T'HH:00");
  const defaultEnd = format(addHours(now, 2), "yyyy-MM-dd'T'HH:00");
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime] = useState(defaultEnd);
  const [attendeesInput, setAttendeesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { createEvent } = useCalendar({ userEmail });
  const { toast } = useToast();
  const handleSave = async () => {
    if (!summary.trim()) { toast({ title: 'Erro', description: 'Digite o título do evento', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const attendees = attendeesInput.split(',').map(e => e.trim()).filter(Boolean).map(e => ({ email: e }));
      await createEvent({ summary, description: description || undefined, location: location || undefined, start: { dateTime: new Date(startDateTime).toISOString() }, end: { dateTime: new Date(endDateTime).toISOString() }, attendees: attendees.length > 0 ? attendees : undefined });
      toast({ title: 'Evento criado!', description: `"${summary}" foi adicionado ao calendário` });
      onOpenChange(false); onEventCreated?.(); resetForm();
    } catch (err) { toast({ title: 'Erro ao criar evento', description: err instanceof Error ? err.message : 'Falha ao criar evento', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const resetForm = () => { setSummary(''); setDescription(''); setLocation(''); setStartDateTime(defaultStart); setEndDateTime(defaultEnd); setAttendeesInput(''); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[500px]">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Novo Evento</DialogTitle><DialogDescription>Criar evento no calendário de {userEmail}</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label htmlFor="summary">Título do Evento</Label><Input id="summary" placeholder="Ex: Reunião com cliente" value={summary} onChange={e => setSummary(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="start" className="flex items-center gap-1"><Clock className="h-3 w-3" />Início</Label><Input id="start" type="datetime-local" value={startDateTime} onChange={e => setStartDateTime(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="end">Fim</Label><Input id="end" type="datetime-local" value={endDateTime} onChange={e => setEndDateTime(e.target.value)} /></div></div>
        <div className="space-y-2"><Label htmlFor="location" className="flex items-center gap-1"><MapPin className="h-3 w-3" />Local (opcional)</Label><Input id="location" placeholder="Ex: Sala de reuniões / Link do Google Meet" value={location} onChange={e => setLocation(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="attendees" className="flex items-center gap-1"><Users className="h-3 w-3" />Participantes (opcional)</Label><Input id="attendees" placeholder="email1@exemplo.com, email2@exemplo.com" value={attendeesInput} onChange={e => setAttendeesInput(e.target.value)} /><p className="text-xs text-muted-foreground">Separe os e-mails por vírgula</p></div>
        <div className="space-y-2"><Label htmlFor="description">Descrição (opcional)</Label><Textarea id="description" placeholder="Detalhes do evento..." value={description} onChange={e => setDescription(e.target.value)} rows={3} className="resize-none" /></div>
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}><X className="h-4 w-4 mr-1" />Cancelar</Button><Button onClick={handleSave} disabled={saving}><Calendar className="h-4 w-4 mr-1" />{saving ? 'Salvando...' : 'Criar Evento'}</Button></div>
    </DialogContent></Dialog>
  );
}