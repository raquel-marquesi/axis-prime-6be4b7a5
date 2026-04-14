import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { RoleSimulationBanner } from './RoleSimulationBanner';
import { AIAgentFAB } from '@/components/ai/AIAgentFAB';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { roles, user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <RoleSimulationBanner />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
      <AIAgentFAB />
    </div>
  );
}
