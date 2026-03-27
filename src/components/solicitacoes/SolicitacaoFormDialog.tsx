import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useClients } from '@/hooks/useClients';
import { useProcesses } from '@/hooks/useProcesses';
import { useProfiles } from '@/hooks/useProfiles';
import { Solicitacao, PRIORIDADE_LABELS, STATUS_LABELS } from '@/hooks/useSolicitacoes';

const formSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  descricao: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']),
  client_id: z.string().optional().nullable(),
  process_id: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  data_limite: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface SolicitacaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao?: Solicitacao | null;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export function SolicitacaoFormDialog({ open, onOpenChange, solicitacao, onSubmit, isLoading }: SolicitacaoFormDialogProps) {
  const { clients } = useClients();
  const { processes } = useProcesses();
  const { profiles } = useProfiles();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { titulo: '', descricao: '', prioridade: 'media', status: 'pendente', client_id: null, process_id: null, assigned_to: null, data_limite: null },
  });

  useEffect(() => {
    if (solicitacao) {
      form.reset({ titulo: solicitacao.titulo, descricao: solicitacao.descricao || '', prioridade: solicitacao.prioridade, status: solicitacao.status, client_id: solicitacao.client_id, process_id: solicitacao.process_id, assigned_to: solicitacao.assigned_to, data_limite: solicitacao.data_limite });
    } else {
      form.reset({ titulo: '', descricao: '', prioridade: 'media', status: 'pendente', client_id: null, process_id: null, assigned_to: null, data_limite: null });
    }
  }, [solicitacao, form]);

  const isEditing = !!solicitacao;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Solicitação' : 'Nova Solicitação'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Atualize as informações da solicitação.' : 'Preencha os dados para criar uma nova solicitação.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="titulo" render={({ field }) => (<FormItem><FormLabel>Título *</FormLabel><FormControl><Input placeholder="Ex: Novo cálculo trabalhista" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="descricao" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva os detalhes da solicitação..." className="resize-none" rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="prioridade" render={({ field }) => (<FormItem><FormLabel>Prioridade</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{Object.entries(PRIORIDADE_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{Object.entries(STATUS_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="client_id" render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={(v) => field.onChange(v === 'none' ? null : v)} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhum</SelectItem>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.razao_social || c.nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="process_id" render={({ field }) => (<FormItem><FormLabel>Processo</FormLabel><Select onValueChange={(v) => field.onChange(v === 'none' ? null : v)} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um processo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhum</SelectItem>{processes.map((p) => (<SelectItem key={p.id} value={p.id}>{p.numero_pasta} - {p.reclamante_nome}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="assigned_to" render={({ field }) => (<FormItem><FormLabel>Responsável</FormLabel><Select onValueChange={(v) => field.onChange(v === 'none' ? null : v)} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Não atribuído</SelectItem>{profiles.map((p) => (<SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="data_limite" render={({ field }) => (<FormItem><FormLabel>Prazo</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}