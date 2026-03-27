import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { RoleSimulationBanner } from './RoleSimulationBanner';
import { AIAgentFAB } from '@/components/ai/AIAgentFAB';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleSimulationBanner />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <AIAgentFAB />
    </div>
  );
}
