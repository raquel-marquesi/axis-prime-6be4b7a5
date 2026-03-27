import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message { role: 'user' | 'assistant'; content: string; }
interface TaskContextChatProps { solicitacaoId: string; }

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-task-context`;

export function TaskContextChat({ solicitacaoId }: TaskContextChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };
    try {
      const resp = await fetch(CHAT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ solicitacao_id: solicitacaoId, user_message: text.trim() }) });
      if (!resp.ok) { const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' })); throw new Error(err.error || `Erro ${resp.status}`); }
      if (!resp.body) throw new Error('Sem resposta do servidor');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try { const parsed = JSON.parse(jsonStr); const content = parsed.choices?.[0]?.delta?.content as string | undefined; if (content) upsertAssistant(content); } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }
    } catch (e: any) { toast({ title: 'Erro na consulta', description: e.message, variant: 'destructive' }); } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30"><Sparkles className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Assistente de Tarefas</span></div>
      <ScrollArea className="flex-1 px-3 py-2 min-h-[200px] max-h-[300px]">
        {messages.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground"><MessageCircle className="h-8 w-8 mb-2 opacity-50" /><p className="text-sm">Pergunte sobre esta tarefa</p><div className="flex flex-wrap gap-1 mt-3 justify-center">{['O que fazer aqui?', 'Checklist de revisão', 'Erros comuns'].map(q => (<Button key={q} variant="outline" size="sm" className="text-xs h-7" onClick={() => sendMessage(q)}>{q}</Button>))}</div></div>)}
        {messages.map((msg, i) => (<div key={i} className={cn('flex gap-2 mb-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>{msg.role === 'assistant' && <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5"><Bot className="h-3.5 w-3.5 text-primary" /></div>}<div className={cn('rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{msg.content}</div>{msg.role === 'user' && <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-0.5"><User className="h-3.5 w-3.5 text-primary-foreground" /></div>}</div>))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (<div className="flex gap-2 mb-3"><div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5"><Bot className="h-3.5 w-3.5 text-primary" /></div><div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div></div>)}
        <div ref={scrollRef} />
      </ScrollArea>
      <div className="flex gap-2 p-3 border-t">
        <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunte sobre esta tarefa..." className="min-h-[40px] max-h-[80px] resize-none text-sm" rows={1} />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} className="flex-shrink-0">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      </div>
    </div>
  );
}