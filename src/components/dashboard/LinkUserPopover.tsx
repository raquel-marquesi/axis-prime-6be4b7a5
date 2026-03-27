import { useState, useMemo } from 'react';
import { Link2, Check, Search, Loader2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LinkUserPopoverProps { aliasName: string; }

export function LinkUserPopover({ aliasName }: LinkUserPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [linked, setLinked] = useState<'user' | 'old' | false>(false);
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-user-alias'],
    queryFn: async () => { const { data } = await supabase.from('profiles_safe' as any).select('user_id, full_name, email, sigla'); return (data as any[]) || []; },
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async ({ userId, isOldUser }: { userId: string; isOldUser: boolean }) => {
      const { error } = await supabase.from('user_aliases' as any).insert({ alias: aliasName.toUpperCase(), user_id: userId, is_old_user: isOldUser } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => { setLinked(vars.isOldUser ? 'old' : 'user'); toast.success(vars.isOldUser ? 'Marcado como usuário antigo.' : 'Alias vinculado!'); queryClient.invalidateQueries({ queryKey: ['sync-history'] }); setTimeout(() => setOpen(false), 1500); },
    onError: (err: any) => { toast.error(err.message?.includes('duplicate key') ? 'Esse nome já está vinculado.' : 'Erro ao vincular: ' + err.message); },
  });

  const markAsOld = useMutation({
    mutationFn: async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Não autenticado'); const { error } = await supabase.from('user_aliases' as any).insert({ alias: aliasName.toUpperCase(), user_id: user.id, is_old_user: true } as any); if (error) throw error; },
    onSuccess: () => { setLinked('old'); toast.success('Marcado como usuário antigo.'); queryClient.invalidateQueries({ queryKey: ['sync-history'] }); setTimeout(() => setOpen(false), 1500); },
    onError: (err: any) => { toast.error(err.message?.includes('duplicate key') ? 'Esse nome já está vinculado.' : 'Erro: ' + err.message); },
  });

  const filtered = useMemo(() => {
    if (!profiles) return [];
    const q = search.toLowerCase();
    return profiles.filter((p: any) => (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q) || (p.sigla || '').toLowerCase().includes(q)).slice(0, 50);
  }, [profiles, search]);

  if (linked === 'user') return <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-300"><Check className="h-3 w-3" /> Vinculado</Badge>;
  if (linked === 'old') return <Badge variant="outline" className="text-xs gap-1 text-muted-foreground border-border"><UserX className="h-3 w-3" /> Antigo</Badge>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2"><Link2 className="h-3 w-3" />Corrigir</Button></PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Resolver <strong>"{aliasName}"</strong>:</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => markAsOld.mutate()} disabled={markAsOld.isPending}><UserX className="h-3.5 w-3.5" />Marcar como usuário antigo (ex-funcionário)</Button>
          <Separator />
          <p className="text-[10px] text-muted-foreground font-medium">Vincular a usuário existente:</p>
          <div className="relative"><Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar por nome, e-mail ou sigla..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs" autoFocus /></div>
          <ScrollArea className="max-h-48">
            <div className="space-y-0.5">
              {filtered.length === 0 ? <p className="text-xs text-muted-foreground p-2 text-center">{profiles ? 'Nenhum usuário encontrado' : 'Carregando...'}</p> : filtered.map((p: any) => (
                <button key={p.user_id} onClick={() => linkMutation.mutate({ userId: p.user_id, isOldUser: false })} disabled={linkMutation.isPending} className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors disabled:opacity-50">
                  <span className="font-medium">{p.full_name}</span>{p.sigla && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1">{p.sigla}</Badge>}{p.email && <span className="block text-[10px] text-muted-foreground truncate">{p.email}</span>}
                </button>
              ))}
            </div>
          </ScrollArea>
          {(linkMutation.isPending || markAsOld.isPending) && <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Processando...</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}