import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import type { AppRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, profile, roles, loading } = useAuth();
  const location = useLocation();

  // Wait for both auth and profile to finish loading to avoid race conditions
  if (loading || (user && !profile)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Authenticated but not approved
  if (!profile?.approved) {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  // Authenticated and approved, but missing required role
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = roles.some((r) => requiredRoles.includes(r));
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <MainLayout>
      <ErrorBoundary isFullPage>{children}</ErrorBoundary>
    </MainLayout>
  );
}
