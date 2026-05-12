import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import type { ChildDto, KidModeSessionDto } from '@kids/shared';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { StatusBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, type TabDef } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { GoalsTab } from './child-detail/GoalsTab';
import { ReinforcementsTab } from './child-detail/ReinforcementsTab';
import { BehaviorLogsTab } from './child-detail/BehaviorLogsTab';
import { NotesTab } from './child-detail/NotesTab';
import { ParentTasksTab } from './child-detail/ParentTasksTab';
import { ReportsTab } from './child-detail/ReportsTab';
import { formatHumanAge } from '../lib/utils';
import { messageFor } from '../lib/errors';

type TabKey = 'goals' | 'reinforcements' | 'logs' | 'notes' | 'tasks' | 'reports';

export function ChildDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { role } = useAuth();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('goals');

  const childQ = useQuery({
    queryKey: ['child', id],
    queryFn: () => api.get<ChildDto>(`/children/${id}`),
    enabled: !!id,
  });

  const kidModeQ = useQuery({
    queryKey: ['kid-mode', id],
    queryFn: () =>
      api.get<{ session: KidModeSessionDto | null }>(`/kid-mode/child/${id}`),
    enabled: !!id && role !== 'parent',
  });

  const openKidMode = useMutation({
    mutationFn: () => api.post<KidModeSessionDto>('/kid-mode/open', { childId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kid-mode', id] });
      navigate(`/kid-mode/${id}`);
    },
    onError: (e) =>
      toast.error({
        title: t('errors.save'),
        body: messageFor(e),
      }),
  });

  const tabs = useMemo<TabDef[]>(() => {
    const base: TabDef[] = [
      { key: 'goals', label: t('childDetail.tabs.goals') },
      { key: 'reinforcements', label: t('childDetail.tabs.reinforcements') },
      { key: 'logs', label: t('childDetail.tabs.logs') },
      { key: 'notes', label: t('childDetail.tabs.notes') },
    ];
    if (role === 'admin' || role === 'specialist') {
      base.push({ key: 'tasks', label: t('childDetail.tabs.tasks') });
      base.push({ key: 'reports', label: t('childDetail.tabs.reports') });
    }
    return base;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, i18n.language]);

  if (childQ.isLoading) return <LoadingState />;
  if (childQ.error) {
    return (
      <ErrorState
        message={messageFor(childQ.error)}
        onRetry={() => childQ.refetch()}
      />
    );
  }
  const child = childQ.data;
  if (!child) {
    return <ErrorState message={t('childDetail.notFound')} />;
  }

  const hasOpenSession = !!kidModeQ.data?.session;
  const firstNameStr = child.name.split(' ')[0] ?? child.name;
  const ageHuman = formatHumanAge(child.dateOfBirth);
  const dobLong = new Date(child.dateOfBirth + 'T00:00:00Z').toLocaleDateString(
    i18n.language.startsWith('ar') ? 'ar-SA' : undefined,
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-small text-ink-muted" aria-label="Breadcrumb">
        <Link
          to="/children"
          className="inline-flex items-center gap-1 rounded-sm hover:text-purple-700 focus-visible:focus-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          {t('childDetail.backToChildren')}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink font-medium">{child.name}</span>
      </nav>

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={child.name} size={64} />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-display font-display text-ink">{child.name}</h1>
              <StatusBadge status={child.status} />
            </div>
            <p className="mt-1 text-body text-ink-muted">
              {ageHuman} · {t('childDetail.born')} {dobLong}
            </p>
          </div>
        </div>
        {role !== 'parent' && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => openKidMode.mutate()}
              loading={openKidMode.isPending}
            >
              {hasOpenSession ? t('childDetail.resumeKidMode') : t('childDetail.openKidMode')}
            </Button>
          </div>
        )}
      </header>

      {/* Team strip */}
      <section className="grid gap-4 rounded-md border border-line bg-white p-5 sm:grid-cols-3">
        <TeamGroup label={t('childDetail.teamSpecialists')} members={child.specialists.map((s) => s.name)} />
        <TeamGroup label={t('childDetail.teamTeachers')} members={child.teachers.map((t) => t.name)} />
        <TeamGroup label={t('childDetail.teamParents')} members={child.parents.map((p) => p.name)} />
      </section>

      <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} />

      <section className="pt-2">
        {tab === 'goals' && <GoalsTab childId={child.id} childName={firstNameStr} />}
        {tab === 'reinforcements' && (
          <ReinforcementsTab childId={child.id} childName={firstNameStr} />
        )}
        {tab === 'logs' && <BehaviorLogsTab childId={child.id} />}
        {tab === 'notes' && <NotesTab childId={child.id} childName={firstNameStr} />}
        {tab === 'tasks' && (role === 'admin' || role === 'specialist') && (
          <ParentTasksTab childId={child.id} />
        )}
        {tab === 'reports' && (role === 'admin' || role === 'specialist') && (
          <ReportsTab childId={child.id} childName={child.name} />
        )}
      </section>
    </div>
  );
}

function TeamGroup({ label, members }: { label: string; members: string[] }) {
  return (
    <div>
      <p className="text-micro text-ink-muted">{label}</p>
      {members.length === 0 ? (
        <p className="mt-2 text-small text-ink-subtle">—</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {members.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-2.5 py-1"
            >
              <Avatar name={name} size={24} />
              <span className="text-small text-ink">{name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
