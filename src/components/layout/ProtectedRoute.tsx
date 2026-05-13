import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireProfessor?: boolean;
}

export function ProtectedRoute({ children, requireProfessor = false }: ProtectedRouteProps) {
  const { user, loading, isProfessor, isPending } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect pending users to approval page (except for admin routes check)
  if (isPending && location.pathname !== '/aguardando-aprovacao') {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  if (requireProfessor && !isProfessor) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
