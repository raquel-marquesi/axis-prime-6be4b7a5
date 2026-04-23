import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Plus, User, Users, Scale, Briefcase, Link2, History, FileText, ArrowLeft } from 'lucide-react';
import { ProcessFormData, useProcesses, useProcessById } from '@/hooks/useProcesses';
import { useProcessWithFolder } from '@/hooks/useProcessWithFolder';
import { RelatedProcessesTab } from '@/components/processes/RelatedProcessesTab';
import { DeadlinesTab } from '@/components/processes/DeadlinesTab';
import { useClients } from '@/hooks/useClients';
import { formatCPF, cleanDocument } from '@/lib/validators';

function formatCNJ(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 20);
  return clean.replace(/(\d{7})(\d)/, '$1-$2').replace(/(\d{7}-\d{2})(\d)/, '$1.$2').replace(/(\d{7}-\d{2}\.\d{4})(\d)/, '$1.$2').replace(/(\d{7}-\d{2}\.\d{4}\.\d)(\d)/, '$1.$2').replace(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2})(\d)/, '$1.$2');
}

export default function ProcessFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'novo';
  
  const { createProcess, createProcessesBatch, updateProcess } = useProcesses();
  const { createProcessWithFolder } = useProcessWithFolder();
  const { clients } = useClients();

  const { data: process } = useProcessById(isEditing ? id : null);
  
  const [reclamadas, setReclamadas] = useState<string[]>(['']);
  const [novaReclamada, setNovaReclamada] = useState('');

  const form = useForm<ProcessFormData>({
    defaultValues: { area: 'trabalhista', tipo_acao: 'individual', numero_processo: '', codigo_externo: '', id_cliente: '', reclamante_nome: '', reclamante_nascimento: null, reclamante_cpf: null, reclamadas: [] },
  });

  const tipoAcao = form.watch('tipo_acao');
  const area = form.watch('area');
  const labels = area === 'civel' ? { claimant: 'Autor', defendants: 'Réus' } : { claimant: 'Reclamante', defendants: 'Reclamadas' };

  useEffect(() => {
    if (isEditing && process) {
      form.reset({ area: process.area, tipo_acao: process.tipo_acao, numero_processo: process.numero_processo, codigo_externo: process.codigo_externo || '', id_cliente: process.id_cliente, reclamante_nome: process.reclamante_nome, reclamante_nascimento: process.reclamante_nascimento, reclamante_cpf: process.reclamante_cpf, reclamadas: process.reclamadas || [] });
      setReclamadas(process.reclamadas?.length ? process.reclamadas : ['']);
    }
  }, [process, isEditing, form]);

  const handleAddReclamada = () => { if (novaReclamada.trim() && reclamadas.length < 4) { setReclamadas([...reclamadas.filter(r => r.trim()), novaReclamada.trim()]); setNovaReclamada(''); } };
  const handleRemoveReclamada = (index: number) => { const u = reclamadas.filter((_, i) => i !== index); setReclamadas(u.length ? u : ['']); };

  const onSubmit = async (data: ProcessFormData) => {
    const cleanReclamadas = reclamadas.filter(r => r.trim());
    if (isEditing && process) {
      await updateProcess.mutateAsync({ id: process.id, ...data, reclamante_cpf: area === 'trabalhista' && data.reclamante_cpf ? cleanDocument(data.reclamante_cpf) : null, reclamante_nascimento: area === 'trabalhista' ? data.reclamante_nascimento : null, reclamadas: cleanReclamadas });
    } else {
      await createProcessWithFolder.mutateAsync({ formData: { ...data, reclamante_cpf: area === 'trabalhista' && data.reclamante_cpf ? cleanDocument(data.reclamante_cpf) : null, reclamante_nascimento: area === 'trabalhista' ? data.reclamante_nascimento : null, reclamadas: cleanReclamadas } });
    }
    navigate('/processos');
  };

  const isSubmitting = createProcess.isPending || createProcessesBatch.isPending || updateProcess.isPending || createProcessWithFolder.isPending;
  const showPersonalFields = area === 'trabalhista' && tipoAcao === 'individual';

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl bg-white p-6 rounded-lg border shadow-sm">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="numero_processo" rules={{ required: 'Número obrigatório' }} render={({ field }) => (
            <FormItem><FormLabel>Número do Processo (CNJ) *</FormLabel><FormControl>
              <Input {...field} placeholder="XXXXXXX-XX.XXXX.5.XX.XXXX" onChange={(e) => field.onChange(formatCNJ(e.target.value))} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="codigo_externo" render={({ field }) => (
            <FormItem><FormLabel>Código Externo</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Código de referência" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
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
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <FormLabel className="text-lg">{labels.defendants} (máx. 4)</FormLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {reclamadas.filter(r => r.trim()).map((r, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1 text-sm py-1">{r}
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => handleRemoveReclamada(i)}><X className="h-4 w-4" /></Button>
              </Badge>
            ))}
          </div>
          {reclamadas.filter(r => r.trim()).length < 4 && (
            <div className="flex gap-2 max-w-md">
              <Input value={novaReclamada} onChange={(e) => setNovaReclamada(e.target.value)} placeholder={`Adicionar ${area === 'civel' ? 'réu' : 'empresa reclamada'}`}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddReclamada(); } }} />
              <Button type="button" variant="outline" onClick={handleAddReclamada}><Plus className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => navigate('/processos')}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Processo'}</Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/processos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Processo' : 'Novo Processo'}</h1>
          <p className="text-sm text-muted-foreground">{isEditing ? 'Atualize os dados e anexos do processo' : 'Preencha os dados primários para abrir e criar a pasta sincronizada no Drive'}</p>
        </div>
      </div>
      
      {isEditing && process ? (
        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="data" className="gap-1"><FileText className="w-4 h-4" /> Dados</TabsTrigger>
            <TabsTrigger value="related" className="gap-1"><Link2 className="w-4 h-4" /> Relacionados</TabsTrigger>
            <TabsTrigger value="deadlines" className="gap-1"><History className="w-4 h-4" /> Prazos</TabsTrigger>
          </TabsList>
          <TabsContent value="data" className="pt-4">{formContent}</TabsContent>
          <TabsContent value="related" className="pt-4"><div className="bg-white p-6 rounded-lg border max-w-4xl shadow-sm"><RelatedProcessesTab processId={process.id} /></div></TabsContent>
          <TabsContent value="deadlines" className="pt-4"><div className="bg-white p-6 rounded-lg border max-w-4xl shadow-sm"><DeadlinesTab processId={process.id} driveFolderUrl={process.drive_folder_id ? `https://drive.google.com/drive/folders/${process.drive_folder_id}` : undefined} /></div></TabsContent>
        </Tabs>
      ) : formContent}
    </div>
  );
}
