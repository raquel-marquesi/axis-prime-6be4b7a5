import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface BankStatementUploadProps { open: boolean; onOpenChange: (open: boolean) => void; onUpload: (file: File, bankName: string) => Promise<void>; isUploading: boolean; }

export function BankStatementUpload({ open, onOpenChange, onUpload, isUploading }: BankStatementUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [preview, setPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const selectedFile = e.target.files?.[0]; if (!selectedFile) return; setFile(selectedFile); const text = await selectedFile.text(); setPreview(text.split('\n').slice(0, 5).join('\n')); };
  const handleSubmit = async () => { if (!file || !bankName.trim()) return; await onUpload(file, bankName.trim()); setFile(null); setBankName(''); setPreview(''); onOpenChange(false); };
  const handleClose = (open: boolean) => { if (!open) { setFile(null); setBankName(''); setPreview(''); } onOpenChange(open); };
  return (
    <Dialog open={open} onOpenChange={handleClose}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Importar Extrato Bancário</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="bank-name">Nome do Banco</Label><Input id="bank-name" placeholder="Ex: Banco do Brasil, Itaú, Bradesco..." value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Arquivo (.csv ou .ofx)</Label><div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>{file ? (<div className="flex items-center justify-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" /><span className="text-sm">{file.name}</span><span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span></div>) : (<div className="flex flex-col items-center gap-2"><Upload className="h-8 w-8 text-muted-foreground" /><span className="text-sm text-muted-foreground">Clique para selecionar arquivo</span></div>)}<input ref={fileInputRef} type="file" accept=".csv,.ofx" className="hidden" onChange={handleFileChange} /></div></div>
        {preview && (<div className="space-y-2"><Label>Preview</Label><pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-32 whitespace-pre-wrap">{preview}</pre></div>)}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => handleClose(false)} disabled={isUploading}>Cancelar</Button><Button onClick={handleSubmit} disabled={!file || !bankName.trim() || isUploading}>{isUploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>) : 'Processar'}</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}