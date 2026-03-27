import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useActivityTypes } from '@/hooks/useActivityTypes';
import { useDeadlineCompletion } from '@/hooks/useDeadlineCompletion';
import { ProcessDeadline } from '@/hooks/useProcessDeadlines';
import { format } from 'date-fns';
import { FileText, Link as LinkIcon, Loader2, Upload, X, File as FileIcon } from 'lucide-react';

const DRIVE_LINK_REGEX = /^https:\/\/(drive|docs)\.google\.com\/.+/;

const completionSchema = z.object({
  activity_type_id: z.string().min(1, 'Selecione um tipo de atividade'),
  data_atividade: z.string().min(1, 'Data obrigatória'),
  descricao: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  document_url: z.string().optional(),
});

type CompletionFormData = z.infer<typeof completionSchema>;

interface DeadlineCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deadline: ProcessDeadline | null;
  processId: string;
  reclamante_nome?: string;
  drive_folder_url?: string;
  onSuccess?: () => void;
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.odt,.txt';
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function DeadlineCompletionDialog({
  open, onOpenChange, deadline, processId,
  reclamante_nome, drive_folder_url, onSuccess,
}: DeadlineCompletionDialogProps) {
  const { activityTypes, isLoading: isLoadingTypes } = useActivityTypes();
  const { completeDeadline } = useDeadlineCompletion();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<CompletionFormData>({
    resolver: zodResolver(completionSchema),
    defaultValues: { activity_type_id: '', data_atividade: today, descricao: '', document_url: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ activity_type_id: '', data_atividade: today, descricao: '', document_url: '' });
      setSelectedFile(null);
      setAttachError(null);
    }
  }, [open, form, today]);

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) { setAttachError('Arquivo muito grande (máximo 20MB)'); return; }
    setSelectedFile(file);
    setAttachError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const onSubmit = async (data: CompletionFormData) => {
    if (!deadline) return;
    const hasLink = data.document_url && DRIVE_LINK_REGEX.test(data.document_url);
    const hasFile = !!selectedFile;
    if (!hasLink && !hasFile) { setAttachError('Envie um arquivo ou insira um link válido do Google Drive'); return; }
    if (data.document_url && data.document_url.trim() && !DRIVE_LINK_REGEX.test(data.document_url)) {
      setAttachError('Link inválido. Use um link do Google Drive ou Docs'); return;
    }
    setAttachError(null);
    await completeDeadline.mutateAsync({
      deadline_id: deadline.id, process_id: processId, activity_type_id: data.activity_type_id,
      data_atividade: data.data_atividade, descricao: data.descricao,
      document_url: hasLink ? data.document_url : undefined,
      file: hasFile ? selectedFile! : undefined, reclamante_nome, drive_folder_url,
    });
    onOpenChange(false);
    if (drive_folder_url) window.open(drive_folder_url, '_blank');
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Concluir Prazo</DialogTitle>
          <DialogDescription>{deadline?.ocorrencia}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="activity_type_id" render={({ field }) => (
              <FormItem><FormLabel>Tipo de Atividade *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo de atividade" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {isLoadingTypes ? <SelectItem value="loading" disabled>Carregando...</SelectItem> :
                      activityTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="data_atividade" render={({ field }) => (
              <FormItem><FormLabel>Data da Atividade *</FormLabel><FormControl><Input type="date" max={today} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem><FormLabel>Descrição do que foi realizado *</FormLabel><FormControl>
                <Textarea placeholder="Descreva as ações realizadas (mínimo 10 caracteres)" rows={3} {...field} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2"><Upload className="h-4 w-4" />Anexo Comprobatório *</FormLabel>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-primary bg-primary/5' : selectedFile ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-primary/50'
              }`} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
                {selectedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <FileIcon className="h-4 w-4 text-green-600" />
                      <span className="font-medium truncate max-w-[300px]">{selectedFile.name}</span>
                      <span className="text-muted-foreground">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Arraste um arquivo ou <span className="text-primary font-medium">clique para selecionar</span></p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, imagens (máx. 20MB)</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" /><span>ou</span><div className="flex-1 h-px bg-border" />
              </div>
              <FormField control={form.control} name="document_url" render={({ field }) => (
                <FormItem><FormControl>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input type="url" placeholder="https://drive.google.com/..." {...field} />
                  </div>
                </FormControl></FormItem>
              )} />
              {attachError && <p className="text-sm text-destructive">{attachError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={completeDeadline.isPending}>
                {completeDeadline.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Concluir Prazo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
