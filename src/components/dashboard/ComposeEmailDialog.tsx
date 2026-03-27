import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGmail } from '@/hooks/useGmail';
import { useToast } from '@/hooks/use-toast';

interface ComposeEmailDialogProps { open: boolean; onOpenChange: (open: boolean) => void; userEmail: string; replyTo?: { to: string; subject: string; body?: string }; }

export function ComposeEmailDialog({ open, onOpenChange, userEmail, replyTo }: ComposeEmailDialogProps) {
  const [to, setTo] = useState(replyTo?.to || '');
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { sendMessage } = useGmail({ userEmail });
  const { toast } = useToast();
  const handleSend = async () => {
    if (!to.trim()) { toast({ title: 'Erro', description: 'Digite o e-mail do destinatário', variant: 'destructive' }); return; }
    if (!subject.trim()) { toast({ title: 'Erro', description: 'Digite o assunto do e-mail', variant: 'destructive' }); return; }
    setSending(true);
    try { await sendMessage(to, subject, body); toast({ title: 'E-mail enviado!', description: `Mensagem enviada para ${to}` }); onOpenChange(false); resetForm(); }
    catch (err) { toast({ title: 'Erro ao enviar', description: err instanceof Error ? err.message : 'Falha ao enviar e-mail', variant: 'destructive' }); }
    finally { setSending(false); }
  };
  const resetForm = () => { setTo(''); setSubject(''); setBody(''); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Nova Mensagem</DialogTitle><DialogDescription>Enviar e-mail como {userEmail}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label htmlFor="to">Para</Label><Input id="to" type="email" placeholder="destinatario@exemplo.com" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="subject">Assunto</Label><Input id="subject" placeholder="Assunto do e-mail" value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="body">Mensagem</Label><Textarea id="body" placeholder="Digite sua mensagem..." value={body} onChange={e => setBody(e.target.value)} rows={8} className="resize-none" /></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}><X className="h-4 w-4 mr-1" />Cancelar</Button><Button onClick={handleSend} disabled={sending}><Send className="h-4 w-4 mr-1" />{sending ? 'Enviando...' : 'Enviar'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}