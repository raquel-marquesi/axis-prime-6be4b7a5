import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload, User, Users, Scale, Briefcase, Link2, History, FileText } from 'lucide-react';
import { Process, ProcessFormData, TipoAcao, AreaProcesso, useProcesses } from '@/hooks/useProcesses';
import { useProcessWithFolder } from '@/hooks/useProcessWithFolder';
import { RelatedProcessesTab } from './RelatedProcessesTab';
import { DeadlinesTab } from './DeadlinesTab';
import { useClients } from '@/hooks/useClients';
import { formatCPF, cleanDocument } from '@/lib/validators';

interface ProcessFormDialogProps { open: boolean; onOpenChange: (open: boolean) => void; process?: Process | null; }

function formatCNJ(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 20);
  return clean.replace(/(\d{7})(\d)/, '$1-$2').replace(/(\d{7}-\d{2})(\d)/, '$1.$2').replace(/(\d{7}-\d{2}\.\d{4})(\d)/, '$1.$2').replace(/(\d{7}-\d{2}\.\d{4}\.\d)(\d)/, '$1.$2').replace(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2})(\d)/, '$1.$2');
}

export function ProcessFormDialog({ open, onOpenChange, process }: ProcessFormDialogProps) {
  const { createProcess, createProcessesBatch, updateProcess } = useProcesses();
  const { createProcessWithFolder } = useProcessWithFolder();
  const { clients } = useClients();
  const [reclamadas, setReclamadas] = useState<string[]>(['']);
  const [novaReclamada, setNovaReclamada] = useState('');
  const [importMode, setImportMode] = useState<'single' | 'batch'>('single');
  const [batchData, setBatchData] = useState<{ nome: string; cpf: string; nascimento: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastResetKeyRef = useRef<string | null>(null);
  const isEditing = !!process;
  const resetKey = process?.id ?? 'new';

  const form = useForm<ProcessFormData>({
    defaultValues: { area: 'trabalhista', tipo_acao: 'individual', numero_processo: '', codigo_externo: '', id_cliente: '', reclamante_nome: '', reclamante_nascimento: null, reclamante_cpf: null, reclamadas: [] },
  });

  const tipoAcao = form.watch('tipo_acao');
  const area = form.watch('area');
  const labels = area === 'civel' ? { claimant: 'Autor', defendants: 'Réus' } : { claimant: 'Reclamante', defendants: 'Reclamadas' };

  useEffect(() => {
    if (!open) { lastResetKeyRef.current = null; return; }
    if (lastResetKeyRef.current === resetKey) return;
    lastResetKeyRef.current = resetKey;
    if (process) {
      form.reset({ area: process.area, tipo_acao: process.tipo_acao, numero_processo: process.numero_processo, codigo_externo: process.codigo_externo || '', id_cliente: process.id_cliente, reclamante_nome: process.reclamante_nome, reclamante_nascimento: process.reclamante_nascimento, reclamante_cpf: process.reclamante_cpf, reclamadas: process.reclamadas || [] });
      setReclamadas(process.reclamadas?.length ? process.reclamadas : ['']);
    } else {
      form.reset({ area: 'trabalhista', tipo_acao: 'individual', numero_processo: '', codigo_externo: '', id_cliente: '', reclamante_nome: '', reclamante_nascimento: null, reclamante_cpf: null, reclamadas: [] });
      setReclamadas(['']); setBatchData([]); setImportMode('single');
    }
  }, [open, resetKey, process, form]);

  const handleAddReclamada = () => { if (novaReclamada.trim() && reclamadas.length < 4) { setReclamadas([...reclamadas.filter(r => r.trim()), novaReclamada.trim()]); setNovaReclamada(''); } };
  const handleRemoveReclamada = (index: number) => { const u = reclamadas.filter((_, i) => i !== index); setReclamadas(u.length ? u : ['']); };

  const onSubmit = async (data: ProcessFormData) => {
    const cleanReclamadas = reclamadas.filter(r => r.trim());
    if (isEditing) {
      await updateProcess.mutateAsync({ id: process!.id, ...data, reclamante_cpf: area === 'trabalhista' && data.reclamante_cpf ? cleanDocument(data.reclamante_cpf) : null, reclamante_nascimento: area === 'trabalhista' ? data.reclamante_nascimento : null, reclamadas: cleanReclamadas });
    } else if (tipoAcao === 'coletiva' && batchData.length > 0) {
      await createProcessesBatch.mutateAsync(batchData.map(item => ({ area: data.area, tipo_acao: 'coletiva' as TipoAcao, numero_processo: data.numero_processo, id_cliente: data.id_cliente, reclamante_nome: item.nome, reclamante_cpf: area === 'trabalhista' && item.cpf ? cleanDocument(item.cpf) : null, reclamante_nascimento: area === 'trabalhista' && item.nascimento ? item.nascimento : null, reclamadas: cleanReclamadas })));
    } else {
      await createProcessWithFolder.mutateAsync({ formData: { ...data, reclamante_cpf: area === 'trabalhista' && data.reclamante_cpf ? cleanDocument(data.reclamante_cpf) : null, reclamante_nascimento: area === 'trabalhista' ? data.reclamante_nascimento : null, reclamadas: cleanReclamadas } });
    }
    onOpenChange(false);
  };

  const isSubmitting = createProcess.isPending || createProcessesBatch.isPending || updateProcess.isPending || createProcessWithFolder.isPending;
  const showPersonalFields = area === 'trabalhista' && tipoAcao === 'individual';

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="area" render={({ field }) => (
          <FormItem><FormLabel>Área *</FormLabel><FormControl>
            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="trabalhista" id="trabalhista" /><Label htmlFor="trabalhista" className="flex items-center gap-1 cursor-pointer"><Briefcase className="w-4 h-4" /> Trabalhista</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="civel" id="civel" /><Label htmlFor="civel" className="flex items-center gap-1 cursor-pointer"><Scale className="w-4 h-4" /> Cível</Label></div>
            </RadioGroup>
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="tipo_acao" render={({ field }) => (
          <FormItem><FormLabel>Tipo de Ação *</FormLabel><FormControl>
            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="individual" id="individual" /><Label htmlFor="individual" className="flex items-center gap-1 cursor-pointer"><User className="w-4 h-4" /> Individual</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="coletiva" id="coletiva" /><Label htmlFor="coletiva" className="flex items-center gap-1 cursor-pointer"><Users className="w-4 h-4" /> Coletiva</Label></div>
            </RadioGroup>
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="numero_processo" rules={{ required: 'Número obrigatório' }} render={({ field }) => (
          <FormItem><FormLabel>Número do Processo (CNJ) *</FormLabel><FormControl>
            <Input {...field} placeholder="XXXXXXX-XX.XXXX.5.XX.XXXX" onChange={(e) => field.onChange(formatCNJ(e.target.value))} />
          </FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="codigo_externo" render={({ field }) => (
          <FormItem><FormLabel>Código Externo</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Código de referência" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="id_cliente" rules={{ required: 'Cliente é obrigatório' }} render={({ field }) => (
          <FormItem><FormLabel>Cliente *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.tipo === 'juridica' ? c.razao_social : c.nome}</SelectItem>)}</SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="reclamante_nome" rules={{ required: `Nome do ${labels.claimant.toLowerCase()} é obrigatório` }} render={({ field }) => (
          <FormItem><FormLabel>Nome do {labels.claimant} *</FormLabel><FormControl><Input {...field} placeholder="Nome completo" /></FormControl><FormMessage /></FormItem>
        )} />
        {showPersonalFields && (
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="reclamante_cpf" render={({ field }) => (
              <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="000.000.000-00" onChange={(e) => field.onChange(formatCPF(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="reclamante_nascimento" render={({ field }) => (
              <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}
        <div className="space-y-3">
          <FormLabel>{labels.defendants} (máx. 4)</FormLabel>
          <div className="flex flex-wrap gap-2">
            {reclamadas.filter(r => r.trim()).map((r, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1">{r}
                <Button type="button" variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => handleRemoveReclamada(i)}><X className="h-3 w-3" /></Button>
              </Badge>
            ))}
          </div>
          {reclamadas.filter(r => r.trim()).length < 4 && (
            <div className="flex gap-2">
              <Input value={novaReclamada} onChange={(e) => setNovaReclamada(e.target.value)} placeholder={`Nome ${area === 'civel' ? 'do réu' : 'da empresa reclamada'}`}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddReclamada(); } }} />
              <Button type="button" variant="outline" onClick={handleAddReclamada}><Plus className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? 'Editar Processo' : 'Novo Processo'}</DialogTitle></DialogHeader>
        {isEditing && process ? (
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="data" className="gap-1"><FileText className="w-4 h-4" /> Dados</TabsTrigger>
              <TabsTrigger value="related" className="gap-1"><Link2 className="w-4 h-4" /> Relacionados</TabsTrigger>
              <TabsTrigger value="deadlines" className="gap-1"><History className="w-4 h-4" /> Prazos</TabsTrigger>
            </TabsList>
            <TabsContent value="data" className="pt-4">{formContent}</TabsContent>
            <TabsContent value="related" className="pt-4"><RelatedProcessesTab processId={process.id} /></TabsContent>
            <TabsContent value="deadlines" className="pt-4">
              <DeadlinesTab processId={process.id} driveFolderUrl={process.drive_folder_id ? `https://drive.google.com/drive/folders/${process.drive_folder_id}` : undefined} />
            </TabsContent>
          </Tabs>
        ) : formContent}
      </DialogContent>
    </Dialog>
  );
}

export default ProcessFormDialog;
