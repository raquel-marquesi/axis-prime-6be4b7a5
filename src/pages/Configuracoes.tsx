import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Building2, ShieldCheck, Bell, Database, Cog, LayoutDashboard } from "lucide-react";
import { GeneralSettings } from "@/components/configuracoes/GeneralSettings";
import { UserRolesSettings } from "@/components/configuracoes/UserRolesSettings";
import { CompanySettings } from "@/components/configuracoes/CompanySettings";
import { NotificationSettings } from "@/components/configuracoes/NotificationSettings";
import { BackupSettings } from "@/components/configuracoes/BackupSettings";
import { OperationalSettings } from "@/components/configuracoes/OperationalSettings";
import { DashboardSettings } from "@/components/configuracoes/DashboardSettings";
import UserManagement from "@/pages/UserManagement";

const Configuracoes = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações do sistema e preferências da empresa.
        </p>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="bg-background border p-1 h-auto flex-wrap justify-start gap-2">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="operacional" className="flex items-center gap-2">
            <Cog className="w-4 h-4" />
            Operacional
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup e Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="dashboard">
          <DashboardSettings />
        </TabsContent>

        <TabsContent value="empresa">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="usuarios">
          <UserManagement />
        </TabsContent>

        <TabsContent value="permissoes">
          <UserRolesSettings />
        </TabsContent>

        <TabsContent value="operacional">
          <OperationalSettings />
        </TabsContent>

        <TabsContent value="notificacoes">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="backup">
          <BackupSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
