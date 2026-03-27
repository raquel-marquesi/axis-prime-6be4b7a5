import { Client } from '@/hooks/useClients';
import { ReportExportButton } from '@/components/relatorios/ReportExportButton';

interface ClientDataExportButtonProps {
  clients: Client[];
}

const columns = [
  { key: 'tipo', label: 'Tipo', format: (v: string) => v === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica' },
  { key: 'razao_social', label: 'Razão Social / Nome', format: (v: string) => v || '' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'cpf', label: 'CPF' },
  { key: 'nome_fantasia', label: 'Nome Fantasia' },
  { key: 'centro_custo', label: 'Centro de Custo' },
  { key: 'economic_group_nome', label: 'Grupo Econômico' },
  { key: 'contract_key_nome', label: 'Contrato-Chave' },
  { key: 'cep', label: 'CEP' },
  { key: 'logradouro', label: 'Logradouro' },
  { key: 'numero', label: 'Número' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'is_active', label: 'Status', format: (v: boolean) => v ? 'Ativo' : 'Inativo' },
  { key: 'branch_nomes', label: 'Filial', format: (v: string[]) => Array.isArray(v) ? v.join(', ') : '' },
  { key: 'tipo_cadastro', label: 'Tipo Cadastro', format: (v: string) => v === 'cliente' ? 'Cliente' : 'Fornecedor' },
];

export function ClientDataExportButton({ clients }: ClientDataExportButtonProps) {
  const exportData = clients.map((c) => ({
    ...c,
    razao_social: c.tipo === 'fisica' ? c.nome : c.razao_social,
  }));

  return (
    <ReportExportButton
      data={exportData}
      columns={columns}
      filename="clientes_cadastro"
      title="Relatório de Dados Cadastrais de Clientes"
    />
  );
}

export default ClientDataExportButton;
