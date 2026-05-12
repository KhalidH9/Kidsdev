import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type {
  ChildDto,
  CreateChildInput,
  Paginated,
  UpdateChildInput,
  UserStatus,
} from '@kids/shared';
import { api, toQuery } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import { KebabMenu } from '../components/ui/KebabMenu';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';
import { ChildForm } from '../components/forms/ChildForm';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatHumanAge } from '../lib/utils';
import { messageFor, GENERIC_SAVE_ERROR } from '../lib/errors';

type Filter = 'all' | UserStatus;

export function ChildrenPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t } = useTranslation();
  const canWrite = role === 'admin' || role === 'specialist';
  const toast = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ChildDto | null>(null);
  const [archiving, setArchiving] = useState<ChildDto | null>(null);

  const statusParam = filter === 'all' ? undefined : filter;

  const listQ = useQuery({
    queryKey: ['children', { page, debounced, filter }],
    queryFn: () =>
      api.get<Paginated<ChildDto>>(
        `/children${toQuery({ page, pageSize: 10, search: debounced, status: statusParam })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateChildInput) => api.post<ChildDto>('/children', input),
    onSuccess: (created) => {
      toast.success({ title: `${created.name}` });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['children'] });
    },
    onError: (e) =>
      toast.error({
        title: t('errors.save'),
        body: messageFor(e, GENERIC_SAVE_ERROR),
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateChildInput }) =>
      api.patch<ChildDto>(`/children/${id}`, patch),
    onSuccess: () => {
      toast.success({ title: t('users.saved') });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['children'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const archiveMut = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      api.patch<ChildDto>(`/children/${id}`, { status: 'inactive' }),
    onSuccess: (_data, vars) => {
      toast.success({
        title: `${vars.name} — ${t('children.archived')}`,
        body: t('children.archiveRestoreHint'),
      });
      setArchiving(null);
      qc.invalidateQueries({ queryKey: ['children'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const columns: Column<ChildDto>[] = [
    {
      key: 'name',
      header: t('common.name'),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} size={36} />
          <div className="min-w-0">
            <div className="text-body-strong text-ink">{c.name}</div>
            <div className="text-small text-ink-muted">
              {formatHumanAge(c.dateOfBirth)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'specialists',
      header: t('children.columnSpecialists'),
      hideBelow: 'md',
      cell: (c) =>
        c.specialists.length === 0 ? (
          <span className="text-ink-subtle">—</span>
        ) : (
          <span className="text-body text-ink">
            {c.specialists.map((s) => s.name).join(', ')}
          </span>
        ),
    },
    {
      key: 'teachers',
      header: t('children.columnTeachers'),
      hideBelow: 'lg',
      cell: (c) =>
        c.teachers.length === 0 ? (
          <span className="text-ink-subtle">—</span>
        ) : (
          <span className="text-body text-ink">
            {c.teachers.map((t) => t.name).join(', ')}
          </span>
        ),
    },
    {
      key: 'parents',
      header: t('children.columnParents'),
      hideBelow: 'lg',
      cell: (c) =>
        c.parents.length === 0 ? (
          <span className="text-ink-subtle">—</span>
        ) : (
          <span className="text-body text-ink">
            {c.parents.map((p) => p.name).join(', ')}
          </span>
        ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end w-16',
      cell: (c) =>
        canWrite ? (
          <div className="flex justify-end">
            <KebabMenu
              actions={[
                { label: t('children.editDetails'), onClick: () => setEditing(c) },
                {
                  label: t('children.archiveChild'),
                  onClick: () => setArchiving(c),
                  danger: true,
                },
              ]}
            />
          </div>
        ) : (
          <span />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('children.title')}
        description={t('children.description')}
        actions={
          canWrite ? (
            <Button onClick={() => setCreating(true)}>{t('children.addChild')}</Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1">
          <Input
            name="search"
            placeholder={t('children.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            iconStart={<Search className="h-4 w-4" aria-hidden />}
          />
        </div>
        <FilterChips
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
        />
      </div>

      {listQ.error ? (
        <ErrorState message={messageFor(listQ.error)} onRetry={() => listQ.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={listQ.data?.data ?? []}
            rowKey={(c) => c.id}
            loading={listQ.isLoading}
            onRowClick={(c) => navigate(`/children/${c.id}`)}
            emptyLabel={t('children.noChildren')}
            emptyHint={
              canWrite
                ? t('children.noChildrenHint')
                : t('children.noChildrenStaff')
            }
            emptyAction={
              canWrite ? (
                <Button onClick={() => setCreating(true)}>{t('children.addChild')}</Button>
              ) : undefined
            }
          />
          <Pagination
            page={listQ.data?.page ?? 1}
            totalPages={listQ.data?.totalPages ?? 1}
            total={listQ.data?.total}
            pageSize={listQ.data?.pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal open={creating} title={t('children.addModal')} onClose={() => setCreating(false)} size="lg">
        <ChildForm
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal
        open={!!editing}
        title={editing ? t('children.editModal', { name: editing.name }) : ''}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing && (
          <ChildForm
            initial={editing}
            submitting={updateMut.isPending}
            onSubmit={(v) => updateMut.mutate({ id: editing.id, patch: v })}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!archiving}
        title={archiving ? t('children.archiveTitle', { name: archiving.name }) : ''}
        message={
          archiving
            ? t('children.archiveMessage', { name: archiving.name })
            : ''
        }
        destructive
        confirmLabel={
          archiving
            ? t('children.archiveConfirm', { firstName: archiving.name.split(' ')[0] })
            : t('common.archive')
        }
        loading={archiveMut.isPending}
        onCancel={() => setArchiving(null)}
        onConfirm={() =>
          archiving && archiveMut.mutate({ id: archiving.id, name: archiving.name })
        }
      />
    </div>
  );
}

function FilterChips({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  const { t } = useTranslation();
  const opts: { value: Filter; labelKey: string }[] = [
    { value: 'all', labelKey: 'common.all' },
    { value: 'active', labelKey: 'common.active' },
    { value: 'inactive', labelKey: 'common.archived' },
  ];
  return (
    <div className="inline-flex rounded-md border border-line-strong bg-white p-1" role="tablist">
      {opts.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={
              on
                ? 'rounded-sm bg-purple-600 px-3 py-1.5 text-small font-medium text-white'
                : 'rounded-sm px-3 py-1.5 text-small font-medium text-ink-muted hover:text-ink'
            }
          >
            {t(o.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
