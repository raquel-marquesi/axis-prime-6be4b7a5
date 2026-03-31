import { PrazosProcessuaisTab } from '@/components/solicitacoes/PrazosProcessuaisTab';

const Solicitacoes = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Prazos Processuais</h1>
        <p className="text-sm text-muted-foreground">Gerencie os prazos processuais vinculados aos processos do sistema.</p>
      </div>
      <PrazosProcessuaisTab />
    </div>
  );
};

export default Solicitacoes;
