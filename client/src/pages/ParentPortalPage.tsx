import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  ChildDto,
  NoteDto,
  Paginated,
  ParentTaskDto,
  TaskStatus,
} from '@kids/shared';
import { TASK_STATUSES } from '@kids/shared';
import { api, toQuery } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { Avatar } from '../components/ui/Avatar';
import { useToast } from '../components/ui/Toast';
import { formatHumanAge, formatRelativeTime, firstName, timeOfDayGreeting } from '../lib/utils';
import { messageFor } from '../lib/errors';

export function ParentPortalPage() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const name = firstName(profile?.name);
  const greeting = name ? `${timeOfDayGreeting()}، ${name}` : timeOfDayGreeting();

  const childrenQ = useQuery({
    queryKey: ['portal-children'],
    queryFn: () => api.get<Paginated<ChildDto>>('/children?pageSize=50'),
  });

  if (childrenQ.isLoading) return <LoadingState />;
  if (childrenQ.error) {
    return (
      <ErrorState message={messageFor(childrenQ.error)} onRetry={() => childrenQ.refetch()} />
    );
  }

  const kids = childrenQ.data?.data ?? [];
  if (kids.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={greeting} description={t('portal.welcomeDesc')} />
        <EmptyState
          title={t('portal.notLinked')}
          body={t('portal.notLinkedHint')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={greeting} description={t('portal.welcomeDesc')} />
      {kids.map((c) => (
        <ChildSection key={c.id} child={c} lang={i18n.language} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ChildSection({ child, lang }: { child: ChildDto; lang: string }) {
  const { t } = useTranslation();
  const dobLong = new Date(child.dateOfBirth + 'T00:00:00Z').toLocaleDateString(
    lang.startsWith('ar') ? 'ar-SA' : undefined,
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  return (
    <section className="space-y-6 rounded-md border border-line bg-white p-6 shadow-card">
      <header className="flex items-center gap-4 border-b border-line pb-4">
        <Avatar name={child.name} size={48} />
        <div>
          <h2 className="text-h2 text-ink">{child.name}</h2>
          <p className="text-small text-ink-muted">
            {formatHumanAge(child.dateOfBirth)} · {t('childDetail.born')} {dobLong}
          </p>
        </div>
      </header>
      <div className="grid gap-8 lg:grid-cols-2">
        <ParentVisibleNotes childId={child.id} />
        <MyTasksForChild childId={child.id} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
function ParentVisibleNotes({ childId }: { childId: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['portal-notes', childId, page],
    queryFn: () =>
      api.get<Paginated<NoteDto>>(
        `/children/${childId}/notes${toQuery({ page, pageSize: 10 })}`,
      ),
  });

  return (
    <div>
      <h3 className="mb-3 text-h3 text-ink">{t('portal.updatesFromSchool')}</h3>
      {q.error ? (
        <ErrorState message={messageFor(q.error)} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <LoadingState />
      ) : (q.data?.data ?? []).length === 0 ? (
        <EmptyState title={t('portal.noNotes')} />
      ) : (
        <ul className="space-y-3">
          {q.data!.data.map((n) => (
            <li key={n.id} className="rounded-md border border-line p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-body-strong text-ink">{n.title}</h4>
                <span className="text-small text-ink-muted">
                  {formatRelativeTime(n.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-body text-ink">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={q.data?.page ?? 1}
        totalPages={q.data?.totalPages ?? 1}
        total={q.data?.total}
        pageSize={q.data?.pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
function MyTasksForChild({ childId }: { childId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ['portal-tasks', page],
    queryFn: () =>
      api.get<Paginated<ParentTaskDto>>(`/parent-tasks/mine${toQuery({ page, pageSize: 10 })}`),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, taskStatus }: { id: string; taskStatus: TaskStatus }) =>
      api.patch<ParentTaskDto>(`/parent-tasks/${id}`, { taskStatus }),
    onSuccess: () => {
      toast.success({ title: t('users.saved') });
      qc.invalidateQueries({ queryKey: ['portal-tasks'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const tasksForChild = (q.data?.data ?? []).filter((task) => task.childId === childId);

  return (
    <div>
      <h3 className="mb-3 text-h3 text-ink">{t('portal.myTasks')}</h3>
      {q.error ? (
        <ErrorState message={messageFor(q.error)} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <LoadingState />
      ) : tasksForChild.length === 0 ? (
        <EmptyState title={t('portal.noTasks')} />
      ) : (
        <ul className="space-y-3">
          {tasksForChild.map((task) => (
            <li key={task.id} className="rounded-md border border-line p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-body-strong text-ink">{task.title}</h4>
                {task.dueAt && (
                  <span className="text-small text-ink-muted">
                    {formatRelativeTime(task.dueAt)}
                  </span>
                )}
              </div>
              {task.description && (
                <p className="mt-1 text-body text-ink">{task.description}</p>
              )}
              <div className="mt-3 max-w-xs">
                <Select
                  name={`task-${task.id}`}
                  label={t('forms.taskStatus')}
                  value={task.taskStatus}
                  onChange={(e) =>
                    updateMut.mutate({ id: task.id, taskStatus: e.target.value as TaskStatus })
                  }
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {labelFor(s, t)}
                    </option>
                  ))}
                </Select>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={q.data?.page ?? 1}
        totalPages={q.data?.totalPages ?? 1}
        total={q.data?.total}
        pageSize={q.data?.pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

function labelFor(status: TaskStatus, t: (key: string) => string): string {
  switch (status) {
    case 'pending':
      return t('common.inactive');
    case 'in_progress':
      return t('common.active');
    case 'done':
      return t('common.done');
    case 'cancelled':
      return t('common.archived');
  }
}
