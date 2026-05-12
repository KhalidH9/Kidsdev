import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingState } from './components/ui/LoadingState';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const ParentsPage = lazy(() =>
  import('./pages/ParentsPage').then((m) => ({ default: m.ParentsPage })),
);
const ChildrenPage = lazy(() =>
  import('./pages/ChildrenPage').then((m) => ({ default: m.ChildrenPage })),
);
const ChildDetailPage = lazy(() =>
  import('./pages/ChildDetailPage').then((m) => ({ default: m.ChildDetailPage })),
);
const ParentPortalPage = lazy(() =>
  import('./pages/ParentPortalPage').then((m) => ({ default: m.ParentPortalPage })),
);
const KidModePage = lazy(() =>
  import('./pages/KidModePage').then((m) => ({ default: m.KidModePage })),
);
const AuditLogPage = lazy(() =>
  import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
);

/** Keeps document.dir and lang in sync with the active i18n language. */
function DirSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const sync = (lng: string) => {
      const isAr = lng.startsWith('ar');
      document.documentElement.dir = isAr ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    };
    sync(i18n.language);
    i18n.on('languageChanged', sync);
    return () => { i18n.off('languageChanged', sync); };
  }, [i18n]);
  return null;
}

export function App() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <DirSync />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Kid Mode runs outside the staff layout (full-screen, child-safe). */}
        <Route
          path="/kid-mode/:childId"
          element={
            <ProtectedRoute roles={['admin', 'specialist', 'teacher']}>
              <KidModePage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="parents"
            element={
              <ProtectedRoute roles={['admin', 'specialist']}>
                <ParentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="children"
            element={
              <ProtectedRoute roles={['admin', 'specialist', 'teacher']}>
                <ChildrenPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="children/:id"
            element={
              <ProtectedRoute roles={['admin', 'specialist', 'teacher']}>
                <ChildDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="portal"
            element={
              <ProtectedRoute roles={['parent']}>
                <ParentPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit"
            element={
              <ProtectedRoute roles={['admin', 'specialist']}>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
