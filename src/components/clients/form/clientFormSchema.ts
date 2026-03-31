import { z } from 'zod';
import { validateCPF, validateCNPJ } from '@/lib/validators';

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO'
];

export const contactSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cargo: z.string().optional(),
  tipo: z.enum(['principal', 'financeiro', 'alternativo']),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().optional(),
});

const baseSchema = {
  is_active: z.boolean().default(true),
  tipo_cadastro: z.enum(['cliente', 'fornecedor']).default('cliente'),
  branch_ids: z.array(z.string()).min(1, 'Selecione ao menos uma filial'),
  centro_custo: z.string().optional(),
  cep: z.string().min(9, 'CEP é obrigatório'),
  logradouro: z.string().min(3, 'Logradouro é obrigatório'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado é obrigatório'),
  indicacao_por: z.string().optional(),
  indicacao_tipo: z.enum(['percentual', 'fixo']).optional(),
  indicacao_valor: z.coerce.number().optional(),
  indicacao_responsavel: z.string().optional(),
  indicacao_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  indicacao_banco: z.string().optional(),
  indicacao_agencia: z.string().optional(),
  indicacao_conta_corrente: z.string().optional(),
  metodo_pagamento: z.enum(['pix', 'boleto', 'transferencia_bancaria']).optional(),
  pix_chave: z.string().optional(),
  dados_bancarios_banco: z.string().optional(),
  dados_bancarios_agencia: z.string().optional(),
  dados_bancarios_conta: z.string().optional(),
  contrato_objeto: z.string().optional(),
  contrato_data_inicio: z.string().optional(),
  contrato_data_vencimento: z.string().optional(),
  contrato_condicoes_faturamento: z.string().optional(),
  billing_reminder_enabled: z.boolean().optional().default(false),
  billing_reminder_days: z.coerce.number().optional(),
  observacoes: z.string().optional(),
  canal_importacao: z.string().optional(),
  economic_group_id: z.string().optional(),
  contract_key_id: z.string().optional(),
  contacts: z.array(contactSchema).min(1, 'Pelo menos um contato é obrigatório'),
  // New fields - Phase 1
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  dia_emissao_nf: z.coerce.number().min(1).max(31).optional().or(z.literal('')),
  dia_vencimento: z.coerce.number().min(1).max(31).optional().or(z.literal('')),
  aplicar_grossup: z.boolean().optional().default(false),
  tipo_grossup: z.string().optional(),
};

export const pessoaFisicaSchema = z.object({
  tipo: z.literal('fisica'),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().refine((val) => validateCPF(val), { message: 'CPF inválido' }),
  data_nascimento: z.string().optional(),
  rg: z.string().optional(),
  ...baseSchema,
});

export const pessoaJuridicaSchema = z.object({
  tipo: z.literal('juridica'),
  razao_social: z.string().min(3, 'Razão Social deve ter pelo menos 3 caracteres'),
  cnpj: z.string().refine((val) => validateCNPJ(val), { message: 'CNPJ inválido' }),
  nome_fantasia: z.string().optional(),
  representante_legal: z.string().optional(),
  ...baseSchema,
});

export const formSchema = z.discriminatedUnion('tipo', [
  pessoaFisicaSchema,
  pessoaJuridicaSchema,
]).superRefine((data, ctx) => {
  if (data.tipo_cadastro === 'fornecedor' && data.metodo_pagamento === 'pix' && !data.pix_chave) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Chave PIX é obrigatória quando método de pagamento é PIX', path: ['pix_chave'] });
  }
  data.contacts.forEach((contact, index) => {
    if ((contact.tipo === 'principal' || contact.tipo === 'financeiro') && !contact.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'E-mail é obrigatório para contato principal e financeiro', path: ['contacts', index, 'email'] });
    }
  });
  const hasPrincipal = data.contacts.some(c => c.tipo === 'principal');
  if (!hasPrincipal) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'É obrigatório ter pelo menos um contato principal', path: ['contacts'] });
  }
});

export type ClientFormData = z.infer<typeof formSchema>;

export const getDefaultValues = (tipo: 'fisica' | 'juridica' = 'fisica'): ClientFormData => ({
  tipo,
  nome: '',
  cpf: '',
  is_active: true,
  tipo_cadastro: 'cliente',
  branch_ids: [],
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  contacts: [{ nome: '', tipo: 'principal', email: '' }],
  inscricao_estadual: '',
  inscricao_municipal: '',
  aplicar_grossup: false,
} as ClientFormData);

export const formatIndicacaoInputValue = (value: unknown, tipoIndicacao?: 'percentual' | 'fixo') => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return '';
  if (tipoIndicacao === 'fixo') return num.toFixed(2).replace('.', ',');
  return String(num).replace('.', ',');
};

export const parseIndicacaoInputValue = (raw: string, tipoIndicacao?: 'percentual' | 'fixo') => {
  const cleaned = raw.replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (cleaned.trim() === '') return undefined;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return undefined;
  if (tipoIndicacao === 'percentual') return Math.max(0, Math.min(100, num));
  return num;
};
