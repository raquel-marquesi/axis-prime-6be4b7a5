import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BatchImportClientsDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke("batch-import-clients", {
        body: { csv: text, fileName: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data?.imported || 0} clientes importados com sucesso`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Clientes em Lote
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Envie um arquivo CSV ou XLSX com as colunas: nome/razao_social, cpf/cnpj, tipo (fisica/juridica), cep, cidade, estado.
          </p>
          <div className="space-y-2">
            <Label>Arquivo</Label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          {file && (
            <p className="text-xs text-muted-foreground">
              Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={loading || !file}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchImportClientsDialog;
