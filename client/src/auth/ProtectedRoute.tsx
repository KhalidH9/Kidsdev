import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from '@kids/shared';
import { useAuth } from './AuthProvider';
import { LoadingState } from '../components/ui/LoadingState';

interface Props {
  roles?: Role[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: Props) {
  const { loading, session, role } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Loading session…" />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
