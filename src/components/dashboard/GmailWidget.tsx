import { useState, useEffect } from 'react';
import { Mail, Send, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGmail } from '@/hooks/useGmail';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GmailWidgetProps {
  userEmail: string;
  onComposeClick?: () => void;
  onEmailClick?: (email: any) => void;
}

export function GmailWidget({ userEmail, onComposeClick, onEmailClick }: GmailWidgetProps) {
  const [emails, setEmails] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { listMessages, getMessage, loading, error } = useGmail({ userEmail });

  const fetchEmails = async () => {
    try {
      const messages = await listMessages(undefined, 10);
      const detailedEmails = await Promise.all(messages.slice(0, 5).map(async (msg: any) => { try { return await getMessage(msg.id); } catch { return null; } }));
      setEmails(detailedEmails.filter(Boolean));
    } catch (err) { console.error('Erro ao carregar e-mails:', err); }
  };

  useEffect(() => { fetchEmails(); }, [userEmail]);

  const handleRefresh = async () => { setRefreshing(true); await fetchEmails(); setRefreshing(false); };

  const parseFromField = (from?: string) => {
    if (!from) return { name: 'Desconhecido', email: '' };
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    return match ? { name: match[1].trim(), email: match[2] } : { name: from, email: from };
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR }); } catch { return dateStr; }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-destructive" />E-mails Recentes</CardTitle><CardDescription>Últimas mensagens do Gmail</CardDescription></div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></Button>
            <Button variant="default" size="sm" onClick={onComposeClick}><Send className="h-4 w-4 mr-1" />Novo</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && emails.length === 0 ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="p-3 rounded-lg border"><div className="flex items-center gap-2 mb-2"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-48" /></div></div><Skeleton className="h-3 w-full" /></div>))}</div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-destructive"><p className="text-sm">{error}</p></div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground"><p className="text-sm">Nenhum e-mail encontrado</p></div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {emails.map((email: any) => {
              const { name } = parseFromField(email.from);
              const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
              return (
                <div key={email.id} className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => onEmailClick?.(email)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2"><p className="font-medium text-sm truncate">{name}</p><span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(email.date)}</span></div>
                      <p className="text-sm font-medium text-foreground/80 truncate mt-0.5">{email.subject || '(Sem assunto)'}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{email.snippet}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}