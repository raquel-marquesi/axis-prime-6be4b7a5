import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao entrar com Google',
          description: error.message,
        });
        setIsLoading(false);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: err.message || 'Ocorreu um erro ao tentar conectar com o Google.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(213,38%,15%)] via-[hsl(213,38%,20%)] to-[hsl(213,40%,12%)] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500" />
        <CardHeader className="text-center space-y-4 pt-10">
          <img src={logo} alt="Marquesi Consultoria" className="mx-auto w-24 h-24 object-contain animate-in zoom-in duration-500" />
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Marquesi Consultoria</CardTitle>
            <CardDescription className="text-base text-muted-foreground">Sistema de Gestão Jurídica</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-12 pt-6 px-10 text-center">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground px-2">
              Utilize sua conta corporativa para acessar a plataforma com segurança.
            </p>
            
            <Button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm transition-all duration-200 flex items-center justify-center gap-3 font-semibold group"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {isLoading ? 'Conectando...' : 'Continuar com Google'}
            </Button>

            <div className="pt-4">
              <Separator className="bg-gray-100" />
              <div className="mt-8 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  Acesso Restrito
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                   <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">marquesi.com.br</span>
                   <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">lomaconsultoria.com</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}