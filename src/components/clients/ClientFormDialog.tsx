import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useClients, Client, ClientFormData as HookClientFormData, PessoaTipo, useClientContacts, ContactFormData, ContatoTipo } from '@/hooks/useClients';
import {
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatPhone,
  cleanDocument,
} from '@/lib/validators';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { User, Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  DadosTab,
  EnderecoTab,
  ContatosTab,
  ContratoTab,
  OutrosTab,
  formSchema,
  ClientFormData,
  getDefaultValues,
} from './form';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const { createClient, updateClient, checkDuplicate } = useClients();
  const { toast } = useToast();
  const [tipo, setTipo] = useState<PessoaTipo>('fisica');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastResetKeyRef = useRef<string>('');
  const isEditing = !!client;

  const { contacts: existingContacts, createContact, updateContact, deleteContact } = useClientContacts(client?.id);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues('fisica'),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: 'contacts',
  });

  const contactsDataForEdit = useMemo(() => {
    if (!client) return [{ nome: '', tipo: 'principal' as const, email: '' }];
    if (existingContacts.length === 0) return [{ nome: '', tipo: 'principal' as const, email: '' }];
    return existingContacts.map((c) => ({
      nome: c.nome,
      cargo: c.cargo || '',
      tipo: c.tipo as 'principal' | 'financeiro' | 'alternativo',
      telefone: c.telefone ? formatPhone(c.telefone) : '',
      celular: c.celular ? formatPhone(c.celular) : '',
      email: c.email || '',
    }));
  }, [client, existingContacts]);

  useEffect(() => {
    if (!open) return;

    const resetKey = client ? `edit:${client.id}:${existingContacts.length}` : 'new';
    if (lastResetKeyRef.current === resetKey) return;
    lastResetKeyRef.current = resetKey;

    if (client) {
      setTipo(client.tipo);
      form.reset({
        tipo: client.tipo,
        is_active: client.is_active,
        tipo_cadastro: client.tipo_cadastro || 'cliente',
        branch_ids: client.branch_ids || [],
        ...(client.tipo === 'fisica'
          ? {
              nome: client.nome || '',
              cpf: client.cpf ? formatCPF(client.cpf) : '',
              data_nascimento: client.data_nascimento || '',
              rg: client.rg || '',
            }
          : {
              razao_social: client.razao_social || '',
              cnpj: client.cnpj ? formatCNPJ(client.cnpj) : '',
              nome_fantasia: client.nome_fantasia || '',
              representante_legal: client.representante_legal || '',
            }),
        centro_custo: client.centro_custo || '',
        cep: client.cep ? formatCEP(client.cep) : '',
        logradouro: client.logradouro || '',
        numero: client.numero || '',
        complemento: client.complemento || '',
        bairro: client.bairro || '',
        cidade: client.cidade || '',
        estado: client.estado || '',
        indicacao_tipo: client.indicacao_tipo as 'percentual' | 'fixo' | undefined,
        indicacao_valor: client.indicacao_valor ?? undefined,
        indicacao_responsavel: client.indicacao_responsavel || '',
        indicacao_email: client.indicacao_email || '',
        indicacao_banco: client.indicacao_banco || '',
        indicacao_agencia: client.indicacao_agencia || '',
        indicacao_conta_corrente: client.indicacao_conta_corrente || '',
        contrato_objeto: client.contrato_objeto || '',
        contrato_data_inicio: client.contrato_data_inicio || '',
        contrato_data_vencimento: client.contrato_data_vencimento || '',
        contrato_condicoes_faturamento: client.contrato_condicoes_faturamento || '',
        observacoes: client.observacoes || '',
        metodo_pagamento: (client as any).metodo_pagamento || undefined,
        pix_chave: (client as any).pix_chave || '',
        dados_bancarios_banco: (client as any).dados_bancarios_banco || '',
        dados_bancarios_agencia: (client as any).dados_bancarios_agencia || '',
        dados_bancarios_conta: (client as any).dados_bancarios_conta || '',
        economic_group_id: client.economic_group_id || '',
        contract_key_id: client.contract_key_id || '',
        contacts: contactsDataForEdit,
      } as ClientFormData);
    } else {
      setTipo('fisica');
      form.reset(getDefaultValues('fisica'));
    }
  }, [open, client, existingContacts.length, contactsDataForEdit, form]);

  const handleTipoChange = (newTipo: PessoaTipo) => {
    setTipo(newTipo);
    form.setValue('tipo', newTipo);
    
    if (newTipo === 'fisica') {
      form.setValue('nome' as keyof ClientFormData, '');
      form.setValue('cpf' as keyof ClientFormData, '');
      form.setValue('data_nascimento' as keyof ClientFormData, '');
      form.setValue('rg' as keyof ClientFormData, '');
    } else {
      form.setValue('razao_social' as keyof ClientFormData, '');
      form.setValue('cnpj' as keyof ClientFormData, '');
      form.setValue('nome_fantasia' as keyof ClientFormData, '');
      form.setValue('representante_legal' as keyof ClientFormData, '');
    }
  };

  const handleDocumentChange = async (value: string, field: 'cpf' | 'cnpj') => {
    const formatted = field === 'cpf' ? formatCPF(value) : formatCNPJ(value);
    form.setValue(field as keyof ClientFormData, formatted);

    const cleanDoc = cleanDocument(formatted);
    const expectedLength = field === 'cpf' ? 11 : 14;
    
    if (cleanDoc.length === expectedLength) {
      setIsCheckingDuplicate(true);
      const isDuplicate = await checkDuplicate(cleanDoc, tipo);
      setIsCheckingDuplicate(false);
      
      if (isDuplicate && (!isEditing || (isEditing && client && 
          (field === 'cpf' ? client.cpf !== cleanDoc : client.cnpj !== cleanDoc)))) {
        toast({
          title: 'Documento já cadastrado',
          description: `Já existe um cliente com este ${field.toUpperCase()}.`,
          variant: 'destructive',
        });
        form.setError(field as keyof ClientFormData, {
          type: 'manual',
          message: `${field.toUpperCase()} já cadastrado`,
        });
      }
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    setIsSaving(true);
    
    const branchIds = (data as any).branch_ids || [];

    const baseData = {
      tipo: data.tipo,
      is_active: data.is_active,
      tipo_cadastro: (data as any).tipo_cadastro || 'cliente',
      centro_custo: data.centro_custo,
      cep: data.cep ? cleanDocument(data.cep) : undefined,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      indicacao_por: data.indicacao_por,
      indicacao_tipo: data.indicacao_tipo,
      indicacao_valor: data.indicacao_valor,
      indicacao_responsavel: data.indicacao_responsavel,
      indicacao_email: data.indicacao_email || undefined,
      indicacao_banco: data.indicacao_banco,
      indicacao_agencia: data.indicacao_agencia,
      indicacao_conta_corrente: data.indicacao_conta_corrente,
      contrato_objeto: data.contrato_objeto,
      contrato_data_inicio: data.contrato_data_inicio || undefined,
      contrato_data_vencimento: data.contrato_data_vencimento || undefined,
      contrato_condicoes_faturamento: data.contrato_condicoes_faturamento,
      observacoes: data.observacoes,
      economic_group_id: (data as any).economic_group_id === '_none_' ? null : ((data as any).economic_group_id || null),
      contract_key_id: (data as any).contract_key_id === '_none_' ? null : ((data as any).contract_key_id || null),
      metodo_pagamento: (data as any).metodo_pagamento || undefined,
      pix_chave: (data as any).pix_chave || undefined,
      dados_bancarios_banco: (data as any).dados_bancarios_banco || undefined,
      dados_bancarios_agencia: (data as any).dados_bancarios_agencia || undefined,
      dados_bancarios_conta: (data as any).dados_bancarios_conta || undefined,
    };

    const submitData: HookClientFormData = data.tipo === 'fisica'
      ? {
          ...baseData,
          nome: (data as any).nome,
          cpf: cleanDocument((data as any).cpf || ''),
          data_nascimento: (data as any).data_nascimento,
          rg: (data as any).rg,
        }
      : {
          ...baseData,
          razao_social: (data as any).razao_social,
          cnpj: cleanDocument((data as any).cnpj || ''),
          nome_fantasia: (data as any).nome_fantasia,
          representante_legal: (data as any).representante_legal,
        };

    try {
      let clientId: string;
      
      if (isEditing && client) {
        await updateClient.mutateAsync({ ...submitData, id: client.id, branch_ids: branchIds });
        clientId = client.id;
        
        for (const existingContact of existingContacts) {
          await deleteContact.mutateAsync(existingContact.id);
        }
      } else {
        const newClient = await createClient.mutateAsync({ ...submitData, branch_ids: branchIds });
        clientId = newClient.id;
      }

      for (const contact of data.contacts) {
        const contactData: ContactFormData = {
          client_id: clientId,
          nome: contact.nome,
          cargo: contact.cargo || undefined,
          tipo: contact.tipo as ContatoTipo,
          telefone: contact.telefone?.replace(/\D/g, '') || undefined,
          celular: contact.celular?.replace(/\D/g, '') || undefined,
          email: contact.email || undefined,
        };
        await createContact.mutateAsync(contactData);
      }

      onOpenChange(false);
    } catch (error) {
      // Error is handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de Pessoa */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipo === 'fisica' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleTipoChange('fisica')}
              >
                <User className="w-4 h-4 mr-2" />
                Pessoa Física
              </Button>
              <Button
                type="button"
                variant={tipo === 'juridica' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleTipoChange('juridica')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Pessoa Jurídica
              </Button>
            </div>

            {/* Status Ativo/Inativo */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-base font-medium">Status do Cliente</Label>
                <p className="text-sm text-muted-foreground">
                  Cliente inativo não aparecerá em novas operações
                </p>
              </div>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${!field.value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          Inativo
                        </span>
                        <Switch
                          id="is_active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className={`text-sm ${field.value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          Ativo
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="endereco">Endereço *</TabsTrigger>
                <TabsTrigger value="contatos">Contatos *</TabsTrigger>
                <TabsTrigger value="contrato">Contrato</TabsTrigger>
                <TabsTrigger value="outros">Outros</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-4">
                <DadosTab 
                  form={form} 
                  tipo={tipo} 
                  isCheckingDuplicate={isCheckingDuplicate}
                  onDocumentChange={handleDocumentChange}
                />
              </TabsContent>

              <TabsContent value="endereco" className="mt-4">
                <EnderecoTab form={form} />
              </TabsContent>

              <TabsContent value="contatos" className="mt-4">
                <ContatosTab form={form} fieldArray={fieldArray} />
              </TabsContent>

              <TabsContent value="contrato" className="mt-4">
                <ContratoTab 
                  form={form} 
                  client={client} 
                  isEditing={isEditing} 
                  onTipoChange={handleTipoChange}
                />
              </TabsContent>

              <TabsContent value="outros" className="mt-4">
                <OutrosTab form={form} />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ClientFormDialog;
