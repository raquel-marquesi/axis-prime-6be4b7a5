import { useState, useMemo } from 'react';
import { Link2, Check, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LinkClientPopoverProps { aliasName: string; }

export function LinkClientPopover({ aliasName }: LinkClientPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [linked, setLinked] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ['clients-for-alias'],
    queryFn: async () => { const { data } = await supabase.from('clients').select('id, razao_social, nome_fantasia, nome').eq('is_active', true).order('razao_social'); return data || []; },
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async (clientId: string) => { const { error } = await supabase.from('client_aliases' as any).insert({ alias: aliasName.toUpperCase(), client_id: clientId } as any); if (error) throw error; },
    onSuccess: () => { setLinked(true); toast.success('Alias vinculado!'); queryClient.invalidateQueries({ queryKey: ['sync-history'] }); setTimeout(() => setOpen(false), 1500); },
    onError: (err: any) => { toast.error(err.message?.includes('duplicate key') ? 'Esse nome já está vinculado a um cliente.' : 'Erro ao vincular: ' + err.message); },
  });

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    return clients.filter(c => { const display = c.nome_fantasia || c.razao_social || c.nome || ''; return display.toLowerCase().includes(q) || (c.razao_social || '').toLowerCase().includes(q) || (c.nome || '').toLowerCase().includes(q); }).slice(0, 50);
  }, [clients, search]);

  if (linked) return <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300"><Check className="h-3 w-3" /> Vinculado</Badge>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2"><Link2 className="h-3 w-3" />Vincular</Button></PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Vincular <strong>"{aliasName}"</strong> a um cliente existente:</p>
          <div className="relative"><Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" autoFocus /></div>
          <ScrollArea className="max-h-48">
            <div className="space-y-0.5">
              {filtered.length === 0 ? <p className="text-xs text-muted-foreground p-2 text-center">{clients ? 'Nenhum cliente encontrado' : 'Carregando...'}</p> : filtered.map(c => {
                const display = c.nome_fantasia || c.razao_social || c.nome || '—';
                const secondary = c.nome_fantasia && c.razao_social ? c.razao_social : null;
                return (<button key={c.id} onClick={() => linkMutation.mutate(c.id)} disabled={linkMutation.isPending} className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors disabled:opacity-50"><span className="font-medium">{display}</span>{secondary && <span className="block text-[10px] text-muted-foreground truncate">{secondary}</span>}</button>);
              })}
            </div>
          </ScrollArea>
          {linkMutation.isPending && <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Vinculando...</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}