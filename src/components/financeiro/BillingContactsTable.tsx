import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBillingContacts } from '@/hooks/useBillingContacts';
interface BillingContactsTableProps { accountId: string; }
export function BillingContactsTable({ accountId }: BillingContactsTableProps) {
  const { contacts, isLoading } = useBillingContacts(accountId);
  if (isLoading) return <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>;
  if (contacts.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Nenhum contato de faturamento cadastrado</p>;
  return (<div className="border rounded-lg"><Table><TableHeader><TableRow><TableHead>Razão Social</TableHead><TableHead>CPF/CNPJ</TableHead><TableHead>E-mail NF</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{contacts.map((c) => (<TableRow key={c.id}><TableCell className="font-medium">{c.razao_social}</TableCell><TableCell className="text-sm">{c.cpf_cnpj}</TableCell><TableCell className="text-sm">{c.email_nf || '—'}</TableCell><TableCell className="text-sm">{c.endereco_cidade && c.endereco_estado ? `${c.endereco_cidade}/${c.endereco_estado}` : '—'}</TableCell><TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell></TableRow>))}</TableBody></Table></div>);
}