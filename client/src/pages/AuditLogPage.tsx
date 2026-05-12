import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { AuditLogDto, Paginated } from '@kids/shared';
import { api, toQuery } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { ErrorState } from '../components/ui/ErrorState';
import { formatDateTime } from '../lib/utils';
import { messageFor } from '../lib/errors';

export function AuditLogPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');

  const ENTITY_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: t('audit.allEntities') },
    { value: 'user', label: t('users.title') },
    { value: 'parent', label: t('parents.title') },
    { value: 'child', label: t('children.title') },
    { value: 'goal', label: t('childDetail.tabs.goals') },
    { value: 'reinforcement', label: t('childDetail.tabs.reinforcements') },
    { value: 'behavior_log', label: t('childDetail.tabs.logs') },
    { value: 'parent_task', label: t('childDetail.tabs.tasks') },
    { value: 'note', label: t('childDetail.tabs.notes') },
    { value: 'kid_mode', label: t('kidMode.closeKidMode') },
    { value: 'report', label: t('childDetail.tabs.reports') },
  ];

  const q = useQuery({
    queryKey: ['audit', page, entity],
    queryFn: () =>
      api.get<Paginated<AuditLogDto>>(
        `/audit${toQuery({ page, pageSize: 10, entity: entity || undefined })}`,
      ),
  });

  const columns: Column<AuditLogDto>[] = [
    {
      key: 'when',
      header: t('audit.when'),
      cell: (r) => <span className="tabular-nums">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'who',
      header: t('audit.who'),
      cell: (r) => <span className="text-body-strong text-ink">{r.actorName ?? '—'}</span>,
    },
    {
      key: 'action',
      header: t('audit.action'),
      cell: (r) => (
        <span className="rounded-sm bg-purple-50 px-2 py-0.5 text-small font-medium text-purple-700">
          {r.action}
        </span>
      ),
    },
    { key: 'entity', header: t('audit.entity'), cell: (r) => r.entity },
    {
      key: 'metadata',
      header: t('audit.detail'),
      hideBelow: 'md',
      cell: (r) =>
        r.metadata ? (
          <code className="rounded-sm bg-surface-sunken px-2 py-0.5 text-small text-ink-muted">
            {JSON.stringify(r.metadata)}
          </code>
        ) : (
          <span className="text-ink-subtle">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('audit.title')} description={t('audit.description')} />
      <div className="max-w-xs">
        <Select
          name="entity"
          label={t('audit.entity')}
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
        >
          {ENTITY_OPTIONS.map((e) => (
            <option key={e.value || 'all'} value={e.value}>
              {e.label}
            </option>
          ))}
        </Select>
      </div>
      {q.error ? (
        <ErrorState message={messageFor(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={q.data?.data ?? []}
            rowKey={(r) => r.id}
            loading={q.isLoading}
            emptyLabel={t('audit.title')}
          />
          <Pagination
            page={q.data?.page ?? 1}
            totalPages={q.data?.totalPages ?? 1}
            total={q.data?.total}
            pageSize={q.data?.pageSize}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
