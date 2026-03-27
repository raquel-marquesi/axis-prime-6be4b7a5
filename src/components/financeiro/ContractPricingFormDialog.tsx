import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContractPricing, ContractPricingFormData } from "@/hooks/useContractPricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricing?: ContractPricing | null;
  onSubmit: (data: ContractPricingFormData) => void;
}

const TIPOS_CALCULO = ["Valor fixo", "Percentual", "Por processo", "Misto"];

export function ContractPricingFormDialog({ open, onOpenChange, pricing, onSubmit }: Props) {
  const [clienteNome, setClienteNome] = useState("");
  const [contrato, setContrato] = useState("");
  const [tipoCalculo, setTipoCalculo] = useState("Valor fixo");
  const [valor, setValor] = useState("");
  const [percentual, setPercentual] = useState("");
  const [moeda, setMoeda] = useState("BRL");
  const [monitoramento, setMonitoramento] = useState("");

  useEffect(() => {
    if (pricing) {
      setClienteNome(pricing.cliente_nome || "");
      setContrato(pricing.contrato || "");
      setTipoCalculo(pricing.tipo_calculo || "Valor fixo");
      setValor(pricing.valor?.toString() || "");
      setPercentual(pricing.percentual?.toString() || "");
      setMoeda(pricing.moeda || "BRL");
      setMonitoramento(pricing.monitoramento || "");
    } else {
      setClienteNome(""); setContrato(""); setTipoCalculo("Valor fixo");
      setValor(""); setPercentual(""); setMoeda("BRL"); setMonitoramento("");
    }
  }, [pricing, open]);

  const handleSubmit = () => {
    onSubmit({
      cliente_nome: clienteNome,
      contrato,
      tipo_calculo: tipoCalculo,
      valor: valor ? parseFloat(valor) : null,
      percentual: percentual ? parseFloat(percentual) : null,
      moeda,
      monitoramento: monitoramento || null,
      tipo_valor: null,
      proc_andamento: null,
      proc_encerrado: null,
      cod_cliente: null,
      cod_contrato: null,
      client_id: pricing?.client_id || null,
      is_active: true,
    });
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{pricing ? "Editar Valor Contratual" : "Novo Valor Contratual"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contrato *</Label>
              <Input value={contrato} onChange={(e) => setContrato(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Cálculo</Label>
              <Select value={tipoCalculo} onValueChange={setTipoCalculo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_CALCULO.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Percentual (%)</Label>
              <Input type="number" step="0.01" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={moeda} onValueChange={setMoeda}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monitoramento</Label>
              <Input value={monitoramento} onChange={(e) => setMonitoramento(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!clienteNome || !contrato}>
            {pricing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
