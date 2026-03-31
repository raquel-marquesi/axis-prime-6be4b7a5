import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ImportarPautas() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Logic for processing the file would go here
      // For now, we simulate an upload process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      toast({
        title: "Sucesso",
        description: "Pautas importadas com sucesso!",
      });
      setFile(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao importar pautas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Importar Pautas</h1>
        <p className="text-sm text-muted-foreground">
          Faça o upload do arquivo de pautas para atualizar o sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Selecionar Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="pautas">Arquivo de Pautas (.xlsx, .csv)</Label>
            <Input 
              id="pautas" 
              type="file" 
              onChange={handleFileChange}
              accept=".xlsx,.csv"
            />
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
          >
            {loading ? "Processando..." : "Importar Dados"}
          </Button>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 p-3 bg-muted rounded-md">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Atenção</p>
          <p>Certifique-se de que o arquivo segue o formato padrão definido pela Marquesi Consultoria para evitar erros na importação.</p>
        </div>
      </div>
    </div>
  );
}
