import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles } from '@/hooks/useCustomRoles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

export function RoleSimulationBanner() {
  const { realRoles, isSimulating, simulatedRole, startSimulation, stopSimulation } = useAuth();
  const { roles, isLoading } = useCustomRoles();

  const isPreview = window.location.hostname.includes('preview') || window.location.hostname === 'localhost';
  if (!isPreview) return null;

  const isRealAdmin = realRoles.some(r => ['admin', 'socio', 'gerente'].includes(r));
  if (!isRealAdmin) return null;

  const simulatedLabel = roles.find(r => r.name === simulatedRole)?.label ?? simulatedRole;

  return (
    <>
      {!isSimulating && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/50">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Simular perfil:</span>
          <Select disabled={isLoading} onValueChange={(value) => startSimulation(value)}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue placeholder="Selecionar perfil..." />
            </SelectTrigger>
            <SelectContent>
              {roles.filter(r => r.name !== 'admin').map(role => (
                <SelectItem key={role.id} value={role.name}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isSimulating && (
        <div className="flex items-center justify-between px-4 py-2 bg-yellow-100 dark:bg-yellow-900/40 border-b border-yellow-300 dark:border-yellow-700">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Simulando perfil: <strong>{simulatedLabel}</strong>
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800/50" onClick={stopSimulation}>
            <X className="h-3.5 w-3.5 mr-1" />
            Encerrar simulação
          </Button>
        </div>
      )}
    </>
  );
}
