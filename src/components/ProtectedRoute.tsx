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

  // Wait only for the auth bootstrap. Don't block on profile fetch — if it's
  // missing we treat the user as pending approval below.
  if (loading) {
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

  // Authenticated but profile not loaded yet OR not approved → pending screen.
  // The /aguardando-aprovacao route is public, so users without an approved
  // profile (or even without a profile row yet) can always reach it.
  if (!profile || profile.approved !== true) {
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
