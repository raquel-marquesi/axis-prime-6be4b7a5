import { Clock, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';

export default function AguardandoAprovacao() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(213,38%,15%)] via-[hsl(213,38%,20%)] to-[hsl(213,40%,12%)] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <CardHeader className="text-center space-y-4 pt-10">
          <img src={logo} alt="Marquesi Consultoria" className="mx-auto w-16 h-16 object-contain opacity-80" />
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-100 p-3">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Aguardando Aprovação</CardTitle>
            <CardDescription className="mt-2 text-sm">
              Seu cadastro foi recebido com sucesso.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-center pb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Um administrador precisa liberar seu acesso ao sistema.
            Você será notificado assim que sua conta for aprovada.
          </p>

          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 py-3 px-4">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{user?.email ?? '—'}</span>
          </div>

          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
