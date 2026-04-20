import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const checkDomainAuthorized = async (email: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('is_email_domain_authorized', { p_email: email });
    if (error) {
      console.error('Erro ao validar domínio:', error);
      return false;
    }
    return data === true;
  };

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: error.message,
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: error.message,
      });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Faça login com a conta recém criada ou cheque seu e-mail.',
      });
      setActiveTab('login');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro no Google Login',
          description: `Falha técnica: ${error.message}`,
        });
        setIsLoading(false);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao conectar',
        description: `Falha catastrófica: ${err?.message || 'Desconhecida'}`,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(213,38%,15%)] via-[hsl(213,38%,20%)] to-[hsl(213,40%,12%)] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500" />
        <CardHeader className="text-center space-y-4 pt-10">
          <img src={logo} alt="Marquesi Consultoria" className="mx-auto w-20 h-20 object-contain" />
          <div>
            <CardTitle className="text-2xl font-bold">Marquesi Consultoria</CardTitle>
            <CardDescription>Sistema de Gestão Jurídica</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="outline"
              className="w-full h-11 bg-white hover:bg-gray-50 text-gray-900 border-gray-200 shadow-sm transition-all flex items-center justify-center gap-3 font-medium"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continuar com Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Ou entre com e-mail</span>
              </div>
            </div>

            {forgotPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Informe seu e-mail para receber o link de redefinição de senha.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="seu@email.com"
                    className="pl-10 h-11"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full h-11"
                  disabled={isLoading || !forgotEmail}
                  onClick={async () => {
                    setIsLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) {
                      toast({ variant: 'destructive', title: 'Erro', description: error.message });
                    } else {
                      toast({ title: 'E-mail enviado!', description: 'Verifique sua caixa de entrada.' });
                    }
                    setIsLoading(false);
                  }}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Enviar link
                </Button>
                <Button variant="link" className="w-full text-muted-foreground" onClick={() => setForgotPassword(false)}>
                  Voltar ao login
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="cadastro">Criar Conta</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="seu@email.com" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input type="password" placeholder="••••••" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Entrar
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="w-full text-muted-foreground text-xs"
                        onClick={() => setForgotPassword(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="cadastro">
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-3 text-muted-foreground w-4 h-4 text-sm font-bold">@</span>
                                <Input placeholder="Seu nome" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail Corporativo</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="seu@marquesi.com.br" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Criar Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input type="password" placeholder="••••••" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Cadastrar
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            )}
            
            <Separator className="bg-gray-50" />
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold opacity-60">
              marquesi.com.br | lomaconsultoria.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}