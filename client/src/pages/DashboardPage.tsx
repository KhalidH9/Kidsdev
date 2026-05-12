import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { DashboardSummaryDto } from '@kids/shared';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { formatLongDate, formatRelativeTime, firstName, timeOfDayGreeting } from '../lib/utils';
import { messageFor } from '../lib/errors';

export function DashboardPage() {
  const { profile, role } = useAuth();

  const summaryQ = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummaryDto>('/dashboard/summary'),
    enabled: role !== null && role !== 'parent',
  });

  if (role === 'parent') return <Navigate to="/portal" replace />;

  const name = firstName(profile?.name);
  const greeting = name
    ? `${timeOfDayGreeting()}، ${name}`
    : timeOfDayGreeting();

  return (
    <div className="space-y-8">
      <PageHeader title={greeting} description={formatLongDate()} />

      {summaryQ.isLoading ? (
        <LoadingState />
      ) : summaryQ.error ? (
        <ErrorState message={messageFor(summaryQ.error)} onRetry={() => summaryQ.refetch()} />
      ) : summaryQ.data ? (
        <>
          <StatsRow stats={summaryQ.data.stats} />
          <RecentLogs logs={summaryQ.data.recentLogs} />
        </>
      ) : null}
    </div>
  );
}

function StatsRow({ stats }: { stats: DashboardSummaryDto['stats'] }) {
  const { t } = useTranslation();
  if (stats.length === 0) return null;
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label={t('dashboard.todayOverview')}
    >
      {stats.map((s) => (
        <div
          key={s.key}
          className="rounded-md border border-line bg-white p-5 shadow-card"
        >
          <p className="text-micro text-ink-muted">{s.label}</p>
          <p className="mt-2 font-display text-display tabular-nums text-ink">{s.value}</p>
        </div>
      ))}
    </section>
  );
}

function RecentLogs({ logs }: { logs: DashboardSummaryDto['recentLogs'] }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <section>
      <h2 className="text-h3 text-ink mb-3">{t('dashboard.recentLogs')}</h2>
      {logs.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title={t('dashboard.nothingLogged')}
          body={t('dashboard.logsWillAppear')}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-white">
          <ul className="divide-y divide-line">
            {logs.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => navigate(`/children/${l.childId}`)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors duration-fast ease-soft hover:bg-purple-50 focus-visible:focus-ring"
                >
                  <Avatar name={l.childName} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-strong text-ink">{l.childName}</p>
                    <p className="truncate text-small text-ink-muted">
                      {l.eventType}
                      {l.notes ? ` — ${l.notes}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-small text-ink-muted">
                    {formatRelativeTime(l.occurredAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
