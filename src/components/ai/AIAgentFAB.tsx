import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AIAgentChat, type AIModule } from './AIAgentChat';

function detectModule(pathname: string): AIModule {
  if (pathname.startsWith('/solicitacoes')) return 'prazos';
  if (pathname.startsWith('/processos')) return 'geral';
  if (pathname.startsWith('/financeiro')) return 'geral';
  return 'geral';
}

export function AIAgentFAB() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const module = detectModule(location.pathname);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      >
        <Bot className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[440px] p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-primary" />
              Assistente IA
            </SheetTitle>
          </SheetHeader>
          <AIAgentChat module={module} className="flex-1 min-h-0" />
        </SheetContent>
      </Sheet>
    </>
  );
}
