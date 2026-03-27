import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export type AIModule = 'prazos' | 'solicitacoes' | 'geral';

interface AIAgentChatProps {
  module: AIModule;
  context?: Record<string, string>;
  className?: string;
  compact?: boolean;
}

const MODULE_LABELS: Record<AIModule, string> = {
  prazos: 'Assistente de Prazos',
  solicitacoes: 'Assistente de Tarefas',
  geral: 'Assistente Geral',
};

const MODULE_SUGGESTIONS: Record<AIModule, string[]> = {
  prazos: ['Meus prazos estão em dia?', 'A sincronização funcionou?', 'Quem tem mais atrasos?'],
  solicitacoes: ['O que fazer aqui?', 'Checklist de revisão', 'Resumo das pendências'],
  geral: ['Resumo do meu dia', 'O que preciso priorizar?'],
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;

export function AIAgentChat({ module, context, className, compact }: AIAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
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
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ module, user_message: text.trim(), context }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }
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
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }
    } catch (e: any) {
      toast({ title: 'Erro na consulta', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, module, context, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const suggestions = MODULE_SUGGESTIONS[module] || MODULE_SUGGESTIONS.geral;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{MODULE_LABELS[module]}</span>
      </div>
      <ScrollArea className={cn('flex-1 px-3 py-2', compact ? 'min-h-[180px] max-h-[280px]' : 'min-h-[250px] max-h-[400px]')}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm mb-3">Pergunte sobre {module === 'prazos' ? 'seus prazos' : module === 'solicitacoes' ? 'esta tarefa' : 'o sistema'}</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {suggestions.map(q => (
                <Button key={q} variant="outline" size="sm" className="text-xs h-7" onClick={() => sendMessage(q)}>{q}</Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2 mb-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={cn('rounded-lg px-3 py-2 text-sm max-w-[85%]', msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-0.5">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2 mb-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </ScrollArea>
      <div className="flex gap-2 p-3 border-t">
        <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunte algo..." className="min-h-[40px] max-h-[80px] resize-none text-sm" rows={1} />
        <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} className="flex-shrink-0">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
