import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Globe,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { Role } from '@kids/shared';
import { useAuth } from '../../auth/AuthProvider';
import { Avatar } from '../ui/Avatar';
import { cx } from '../../lib/utils';

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ['admin', 'specialist', 'teacher'] },
  { to: '/children', labelKey: 'nav.children', icon: Sparkles, roles: ['admin', 'specialist', 'teacher'] },
  { to: '/parents', labelKey: 'nav.parents', icon: Heart, roles: ['admin', 'specialist'] },
  { to: '/users', labelKey: 'nav.users', icon: Users, roles: ['admin'] },
  { to: '/portal', labelKey: 'nav.myChildren', icon: BookOpen, roles: ['parent'] },
  { to: '/audit', labelKey: 'nav.auditLog', icon: ScrollText, roles: ['admin', 'specialist'] },
];

const PAGE_TITLE_KEYS: Record<string, string> = {
  '/': 'nav.dashboard',
  '/children': 'nav.children',
  '/parents': 'nav.parents',
  '/users': 'nav.users',
  '/portal': 'nav.myChildren',
  '/audit': 'nav.auditLog',
};

export function AppLayout() {
  const { profile, role, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const items = NAV.filter((n) => !role || n.roles.includes(role));
  const pageTitleKey =
    PAGE_TITLE_KEYS[location.pathname] ??
    (location.pathname.startsWith('/children/') ? 'nav.children' : undefined);
  const pageTitle = pageTitleKey ? t(pageTitleKey) : 'Kids ABA';

  const toggleLang = () => {
    const next = i18n.language.startsWith('ar') ? 'en' : 'ar';
    void i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-full bg-white">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white px-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label={t('nav.dashboard')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="truncate text-h3 text-ink">{pageTitle}</h1>
        <div className="ms-auto flex items-center gap-1">
          <button
            onClick={toggleLang}
            aria-label="Switch language"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring"
          >
            <Globe className="h-4 w-4" aria-hidden />
          </button>
          {profile && <Avatar name={profile.name} size={36} />}
        </div>
      </header>

      <div className="md:flex">
        {/* Desktop / tablet sidebar */}
        <aside
          className={cx(
            'hidden md:flex md:flex-col md:shrink-0',
            'md:h-screen md:sticky md:top-0',
            'border-e border-line bg-white',
            'md:w-[72px] lg:w-64',
          )}
        >
          <SidebarBrand collapsedBreakpoint="lg" />
          <nav className="flex-1 space-y-1 px-2 py-2 lg:px-3">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cx(
                    'group relative flex h-11 items-center rounded-md px-3 transition-colors duration-fast ease-soft',
                    'focus-visible:focus-ring',
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-ink-muted hover:bg-purple-50 hover:text-ink',
                  )
                }
                title={t(item.labelKey)}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute start-1 top-2 bottom-2 w-[3px] rounded-sm bg-purple-600"
                      />
                    )}
                    <item.icon
                      className={cx(
                        'h-5 w-5 shrink-0 lg:me-3',
                        isActive ? 'text-purple-600' : 'text-ink-muted group-hover:text-purple-600',
                      )}
                      aria-hidden
                    />
                    <span
                      className={cx(
                        'hidden lg:inline text-body',
                        isActive ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {t(item.labelKey)}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <SidebarFooter
            profileName={profile?.name}
            profileEmail={profile?.email}
            role={role}
            onSignOut={() => void signOut()}
            onToggleLang={toggleLang}
          />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              aria-label="Close navigation"
              className="absolute inset-0 bg-ink/40 animate-fade-in"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-[320px] flex-col border-e border-line bg-white shadow-raised animate-slide-from-left rtl:ms-auto rtl:border-s rtl:border-e-0">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <Link
                  to="/"
                  className="text-h3 text-ink"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="text-purple-600">Kids</span> ABA
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 p-3">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cx(
                        'flex h-11 items-center gap-3 rounded-md px-3 transition-colors duration-fast ease-soft',
                        isActive
                          ? 'bg-purple-50 text-purple-700 font-semibold'
                          : 'text-ink hover:bg-purple-50 hover:text-purple-700',
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" aria-hidden />
                    <span className="text-body">{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </nav>
              <SidebarFooter
                profileName={profile?.name}
                profileEmail={profile?.email}
                role={role}
                onSignOut={() => void signOut()}
                onToggleLang={toggleLang}
              />
            </aside>
          </div>
        )}

        <main className="min-h-screen flex-1 px-5 pb-20 pt-5 md:px-8 md:pt-8 md:pb-16 lg:px-10 lg:pb-16 lg:pt-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarBrand({ collapsedBreakpoint }: { collapsedBreakpoint: 'lg' | 'md' }) {
  const _ = collapsedBreakpoint;
  void _;
  return (
    <div className="px-3 pb-6 pt-5 lg:px-5">
      <Link to="/" className="inline-flex items-center text-h3">
        <span className="text-purple-600">Kids</span>
        <span className="hidden lg:inline text-ink">&nbsp;ABA</span>
      </Link>
    </div>
  );
}

function SidebarFooter({
  profileName,
  profileEmail,
  role,
  onSignOut,
  onToggleLang,
}: {
  profileName?: string;
  profileEmail?: string;
  role: Role | null;
  onSignOut: () => void;
  onToggleLang: () => void;
}) {
  const { t, i18n } = useTranslation();
  const langLabel = i18n.language.startsWith('ar')
    ? t('lang.switchToEn')
    : t('lang.switchToAr');

  return (
    <div className="border-t border-line p-3 lg:p-4">
      <div className="flex items-center gap-3">
        <Avatar name={profileName ?? '?'} size={36} />
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-body font-medium text-ink">{profileName ?? '—'}</p>
          <p className="truncate text-small text-ink-muted">{profileEmail ?? ''}</p>
        </div>
      </div>
      {/* Language switcher */}
      <button
        onClick={onToggleLang}
        className={cx(
          'mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-small font-medium text-ink-muted',
          'hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring',
          'lg:justify-start justify-center',
        )}
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden lg:inline">{langLabel}</span>
      </button>
      <button
        onClick={onSignOut}
        className={cx(
          'mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-small font-medium text-ink-muted',
          'hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring',
          'lg:justify-start justify-center',
        )}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="hidden lg:inline">{t('common.signOut')}</span>
        <span className="hidden lg:inline text-[10px] uppercase tracking-wider text-ink-subtle ms-auto">
          {role}
        </span>
      </button>
    </div>
  );
}
