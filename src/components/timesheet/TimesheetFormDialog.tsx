import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProcesses, Process } from '@/hooks/useProcesses';
import { useActivityTypes } from '@/hooks/useActivityTypes';
import { useTimesheet, TimesheetFormData, TimesheetEntry } from '@/hooks/useTimesheet';
import { useCollectiveProcessParticipants } from '@/hooks/useCollectiveProcessParticipants';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, AlertTriangle, Users, User, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  process_id: z.string().min(1, 'Selecione um processo'),
  activity_type_id: z.string().min(1, 'Selecione o tipo de atividade'),
  data_atividade: z.string().min(1, 'Selecione a data'),
  descricao: z.string().min(1, 'A descrição é obrigatória'),
  deadline_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TimesheetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimesheetEntry | null;
}

export function TimesheetFormDialog({ open, onOpenChange, entry }: TimesheetFormDialogProps) {
  const { toast } = useToast();
  const { processes } = useProcesses();
  const { activityTypes } = useActivityTypes();
  const { checkDuplicate, checkBatchDuplicates, createEntry, createBatchEntries, updateEntry } = useTimesheet();
  
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean; existingEntry?: TimesheetEntry }>({ show: false });
  const [collectiveChoice, setCollectiveChoice] = useState<'all' | 'single'>('single');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showCollectiveDialog, setShowCollectiveDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormValues | null>(null);
  const [duplicateReclamantes, setDuplicateReclamantes] = useState<string[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const { participants, isLoading: loadingParticipants } = useCollectiveProcessParticipants(
    selectedProcess?.id || null,
    selectedProcess?.tipo_acao || null
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      process_id: entry?.process_id || '',
      activity_type_id: entry?.activity_type_id || '',
      data_atividade: entry?.data_atividade || new Date().toISOString().split('T')[0],
      descricao: entry?.descricao || '',
      deadline_id: entry?.deadline_id || '',
    },
  });

  const watchedActivityTypeId = form.watch('activity_type_id');
  const selectedActivityType = activityTypes.find(t => t.id === watchedActivityTypeId);

  useEffect(() => {
    const checkDuplicatesForParticipants = async () => {
      if (!showCollectiveDialog || !pendingFormData || participants.length === 0) return;
      setIsCheckingDuplicates(true);
      try {
        const duplicates = await checkBatchDuplicates(pendingFormData.process_id, pendingFormData.activity_type_id, pendingFormData.data_atividade, participants.map(p => p.reclamante_nome));
        setDuplicateReclamantes(duplicates);
      } catch (error) {
        console.error('Error checking duplicates:', error);
      } finally {
        setIsCheckingDuplicates(false);
      }
    };
    checkDuplicatesForParticipants();
  }, [showCollectiveDialog, pendingFormData, participants, checkBatchDuplicates]);

  const handleProcessChange = (processId: string) => {
    const process = processes.find(p => p.id === processId);
    setSelectedProcess(process || null);
    setSelectedParticipants([]);
    setCollectiveChoice('single');
    setDuplicateReclamantes([]);
  };

  const openDriveFolder = (folderId: string | null | undefined) => {
    if (folderId) {
      window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
    } else {
      toast({ title: 'Pasta não encontrada', description: 'Este processo ainda não possui uma pasta no Google Drive.', variant: 'destructive' });
    }
  };

  const handleSubmit = async (values: FormValues) => {
    const today = new Date().toISOString().split('T')[0];
    if (values.data_atividade > today) {
      toast({ title: 'Data inválida', description: 'Não é permitido registrar atividades com data futura.', variant: 'destructive' });
      return;
    }
    if (selectedProcess?.tipo_acao === 'coletiva' && !entry) {
      setPendingFormData(values);
      setShowCollectiveDialog(true);
      return;
    }
    await processSubmission(values);
  };

  const processSubmission = async (values: FormValues, forceNew = false) => {
    try {
      if (!forceNew && !entry) {
        const duplicateCheck = await checkDuplicate(values.process_id, values.activity_type_id, values.data_atividade);
        if (duplicateCheck.isDuplicate) {
          // Strict block if description is also the same
          if (duplicateCheck.existingEntry?.descricao === values.descricao) {
            toast({ 
              title: 'Duplicidade Bloqueada', 
              description: 'Já existe um lançamento identico (mesmo processo, atividade, data e descrição).', 
              variant: 'destructive' 
            });
            return;
          }
          setDuplicateWarning({ show: true, existingEntry: duplicateCheck.existingEntry });
          return;
        }
      }

      // Requirement: Documents for deadlines
      if (values.deadline_id && !selectedProcess?.drive_folder_id) {
        toast({ 
          title: 'Atenção: Documento Obrigatório', 
          description: 'Para concluir um prazo, o processo deve ter uma pasta vinculada e o documento deve estar anexado.', 
          variant: 'destructive' 
        });
        // We open the folder if it exists but here it doesn't
        return;
      }

      const formData: TimesheetFormData = { 
        process_id: values.process_id, 
        activity_type_id: values.activity_type_id, 
        data_atividade: values.data_atividade, 
        descricao: values.descricao, 
        deadline_id: values.deadline_id || null 
      };
      if (entry) { await updateEntry.mutateAsync({ ...formData, id: entry.id }); } else { await createEntry.mutateAsync(formData); }
      if (selectedProcess?.drive_folder_id) { openDriveFolder(selectedProcess.drive_folder_id); }
      handleClose();
    } catch (error) { /* handled by mutation */ }
  };

  const handleCollectiveSubmit = async () => {
    if (!pendingFormData) return;
    if (collectiveChoice === 'single') {
      await processSubmission(pendingFormData);
      setShowCollectiveDialog(false);
      setPendingFormData(null);
      return;
    }
    const validParticipants = selectedParticipants.filter(name => !duplicateReclamantes.includes(name));
    if (validParticipants.length === 0) {
      toast({ title: 'Nenhum participante válido', description: 'Todos os reclamantes selecionados já possuem lançamento para esta atividade/data.', variant: 'destructive' });
      return;
    }
    const entriesToCreate: TimesheetFormData[] = validParticipants.map(reclamante => ({
      process_id: pendingFormData.process_id, activity_type_id: pendingFormData.activity_type_id, data_atividade: pendingFormData.data_atividade, descricao: pendingFormData.descricao, reclamante_nome: reclamante, deadline_id: pendingFormData.deadline_id || null,
    }));
    try {
      setBatchProgress({ current: 0, total: entriesToCreate.length });
      await createBatchEntries.mutateAsync(entriesToCreate);
      setBatchProgress({ current: entriesToCreate.length, total: entriesToCreate.length });
      if (selectedProcess?.drive_folder_id) { openDriveFolder(selectedProcess.drive_folder_id); }
      handleClose();
    } catch (error) { /* handled */ } finally { setBatchProgress(null); }
    setShowCollectiveDialog(false);
    setPendingFormData(null);
  };

  const handleDuplicateConfirm = async () => {
    setDuplicateWarning({ show: false });
    await processSubmission(form.getValues(), true);
  };

  const handleClose = () => {
    form.reset();
    setSelectedProcess(null);
    setDuplicateWarning({ show: false });
    setCollectiveChoice('single');
    setSelectedParticipants([]);
    setPendingFormData(null);
    setDuplicateReclamantes([]);
    setBatchProgress(null);
    onOpenChange(false);
  };

  const toggleParticipant = (name: string) => {
    if (duplicateReclamantes.includes(name)) return;
    setSelectedParticipants(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const selectAllWithoutDuplicates = () => {
    setSelectedParticipants(participants.map(p => p.reclamante_nome).filter(name => !duplicateReclamantes.includes(name)));
  };

  const isLoading = createEntry.isPending || updateEntry.isPending || createBatchEntries.isPending;
  const validSelectedCount = selectedParticipants.filter(name => !duplicateReclamantes.includes(name)).length;
  const totalPoints = selectedActivityType ? validSelectedCount * selectedActivityType.weight : 0;
  const confirmButtonText = collectiveChoice === 'single' ? 'Confirmar' : validSelectedCount > 0 ? `Confirmar (${validSelectedCount} ${validSelectedCount === 1 ? 'atividade' : 'atividades'})` : 'Confirmar';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{entry ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
            <DialogDescription>Registre uma atividade realizada em um processo.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField control={form.control} name="process_id" render={({ field }) => (
                <FormItem><FormLabel>Processo *</FormLabel>
                  <Select value={field.value} onValueChange={(value) => { field.onChange(value); handleProcessChange(value); }}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger></FormControl>
                    <SelectContent>{processes.map((process) => (
                      <SelectItem key={process.id} value={process.id}>
                        <span className="tabular-nums tracking-wide text-xs mr-2">{process.numero_pasta}</span>
                        {process.numero_processo} - {process.reclamante_nome}
                        {process.tipo_acao === 'coletiva' && <span className="ml-2 text-xs text-primary">(Coletiva)</span>}
                      </SelectItem>
                    ))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />

              {selectedProcess?.tipo_acao === 'coletiva' && !entry && (
                <Alert className="border-primary/50 bg-primary/5">
                  <Users className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <div className="flex items-center gap-2 font-medium text-foreground">Ação Coletiva <Badge variant="secondary" className="text-xs">{participants.length} reclamantes</Badge></div>
                    <p className="text-muted-foreground mt-1">Ao salvar, você poderá escolher aplicar a atividade para todos ou apenas um.</p>
                  </AlertDescription>
                </Alert>
              )}

              {selectedProcess?.drive_folder_id && (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => openDriveFolder(selectedProcess.drive_folder_id)}>
                  <ExternalLink className="w-4 h-4 mr-2" />Abrir pasta no Google Drive
                </Button>
              )}

              <FormField control={form.control} name="activity_type_id" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Atividade *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                    <SelectContent>{activityTypes.map((type) => (<SelectItem key={type.id} value={type.id}>{type.name}<span className="ml-2 text-xs text-muted-foreground">(Peso: {type.weight})</span></SelectItem>))}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="data_atividade" render={({ field }) => (
                <FormItem><FormLabel>Data da Atividade *</FormLabel><FormControl><Input type="date" {...field} max={new Date().toISOString().split('T')[0]} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem><FormLabel>Descrição *</FormLabel><FormControl><Textarea placeholder="Descreva a atividade realizada..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : entry ? 'Atualizar' : 'Salvar'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={duplicateWarning.show} onOpenChange={() => setDuplicateWarning({ show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" />Atividade duplicada detectada</AlertDialogTitle>
            <AlertDialogDescription>Já existe um lançamento para este processo, tipo de atividade e data.<br /><br /><strong>Descrição existente:</strong> {duplicateWarning.existingEntry?.descricao}<br /><br />Deseja continuar com uma nova descrição diferente?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDuplicateConfirm}>Continuar mesmo assim</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCollectiveDialog} onOpenChange={setShowCollectiveDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Confirmar Lançamento em Lote</DialogTitle>
            <DialogDescription>Este é um processo de ação coletiva. Escolha como deseja registrar a atividade.</DialogDescription>
          </DialogHeader>

          {pendingFormData && selectedActivityType && (
            <Card className="bg-muted/50"><CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span className="font-medium">{selectedActivityType.name}<Badge variant="outline" className="ml-2 text-xs">Peso: {selectedActivityType.weight}</Badge></span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Data:</span><span className="font-medium">{new Date(pendingFormData.data_atividade + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
              {collectiveChoice === 'all' && validSelectedCount > 0 && (<>
                <div className="flex justify-between"><span className="text-muted-foreground">Reclamantes:</span><span className="font-medium">{validSelectedCount} selecionado(s)</span></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span className="text-muted-foreground">Pontuação total:</span><span className="font-bold text-primary">{totalPoints} pontos</span></div>
              </>)}
            </CardContent></Card>
          )}

          <RadioGroup value={collectiveChoice} onValueChange={(v) => setCollectiveChoice(v as 'all' | 'single')}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"><RadioGroupItem value="single" id="single" /><Label htmlFor="single" className="flex items-center gap-2 cursor-pointer flex-1"><User className="w-4 h-4" />Atividade única (processo geral)</Label></div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"><RadioGroupItem value="all" id="all" /><Label htmlFor="all" className="flex items-center gap-2 cursor-pointer flex-1"><Users className="w-4 h-4" />Uma atividade para cada reclamante</Label></div>
          </RadioGroup>

          {collectiveChoice === 'all' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Selecione os reclamantes:</Label>
                <Button type="button" variant="outline" size="sm" onClick={selectAllWithoutDuplicates} disabled={isCheckingDuplicates}>{duplicateReclamantes.length > 0 ? 'Selecionar todos (sem duplicados)' : 'Selecionar todos'}</Button>
              </div>
              {duplicateReclamantes.length > 0 && (<Alert variant="destructive" className="py-2"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs">{duplicateReclamantes.length} reclamante(s) já possui(em) lançamento para esta atividade/data.</AlertDescription></Alert>)}
              <ScrollArea className="h-48 border rounded-lg p-2">
                {loadingParticipants || isCheckingDuplicates ? (
                  <div className="text-center py-4 text-muted-foreground">{isCheckingDuplicates ? 'Verificando duplicados...' : 'Carregando...'}</div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Nenhum participante encontrado.</div>
                ) : (
                  <div className="space-y-1">
                    {participants.map((participant) => {
                      const isDuplicate = duplicateReclamantes.includes(participant.reclamante_nome);
                      return (
                        <div key={participant.id} className={`flex items-center space-x-2 p-2 rounded ${isDuplicate ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/30'}`}>
                          <Checkbox id={participant.id} checked={selectedParticipants.includes(participant.reclamante_nome)} onCheckedChange={() => toggleParticipant(participant.reclamante_nome)} disabled={isDuplicate} />
                          <Label htmlFor={participant.id} className={`cursor-pointer text-sm flex-1 ${isDuplicate ? 'cursor-not-allowed' : ''}`}>
                            {participant.reclamante_nome}
                            {participant.reclamante_cpf && <span className="text-muted-foreground ml-2">({participant.reclamante_cpf})</span>}
                          </Label>
                          {isDuplicate && <Badge variant="outline" className="text-xs text-destructive border-destructive/50"><AlertTriangle className="w-3 h-3 mr-1" />Já lançado</Badge>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              {validSelectedCount > 0 && <p className="text-sm text-muted-foreground">{validSelectedCount} reclamante(s) selecionado(s){selectedActivityType && <span className="ml-2 text-primary font-medium">({totalPoints} pontos)</span>}</p>}
            </div>
          )}

          {batchProgress && (<div className="space-y-2"><div className="flex justify-between text-sm"><span>Criando atividades...</span><span>{batchProgress.current} / {batchProgress.total}</span></div><Progress value={(batchProgress.current / batchProgress.total) * 100} /></div>)}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCollectiveDialog(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleCollectiveSubmit} disabled={isLoading || (collectiveChoice === 'all' && validSelectedCount === 0)}>{isLoading ? 'Salvando...' : confirmButtonText}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
