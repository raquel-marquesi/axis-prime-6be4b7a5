import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
  isFullPage?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const errorCard = (
        <Card className="border-destructive/30 bg-destructive/5 m-2 shadow-sm animate-in fade-in duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              {this.props.fallbackMessage || 'Ocorreu uma falha na renderização'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground break-all line-clamp-3 bg-background/50 p-2 rounded border border-border/50">
              {this.state.error?.message || 'Erro desconhecido'}
            </p>
            <Button size="sm" variant="outline" onClick={this.handleReset} className="w-fit h-7 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors">
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Recarregar Componente
            </Button>
          </CardContent>
        </Card>
      );

      if (this.props.isFullPage) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive/50" />
            <h2 className="text-xl font-semibold text-foreground">A página encontrou um problema</h2>
            <p className="text-muted-foreground text-sm max-w-md">Uma falha inesperada aconteceu. Nossa proteção estrutural blindou o restante do sistema.</p>
            <Button variant="default" onClick={this.handleReset} className="mt-4">Tentar Restaurar a Tela</Button>
          </div>
        );
      }

      return errorCard;
    }

    return this.props.children;
  }
}
