import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CreateGoalInput, GoalDto, Paginated } from '@kids/shared';
import { api, toQuery } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/Badges';
import { AuditMeta } from '../../components/ui/AuditMeta';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { GoalForm } from '../../components/forms/GoalForm';
import { messageFor, GENERIC_SAVE_ERROR } from '../../lib/errors';

export function GoalsTab({ childId }: { childId: string; childName?: string }) {
  const { role } = useAuth();
  const { t } = useTranslation();
  const canWrite = role === 'admin' || role === 'specialist';
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<GoalDto | null>(null);
  const [deleting, setDeleting] = useState<GoalDto | null>(null);

  const key = ['goals', childId, page] as const;
  const listQ = useQuery({
    queryKey: key,
    queryFn: () =>
      api.get<Paginated<GoalDto>>(
        `/children/${childId}/goals${toQuery({ page, pageSize: 10 })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateGoalInput) =>
      api.post<GoalDto>(`/children/${childId}/goals`, input),
    onSuccess: () => {
      toast.success({ title: t('goals.saved') });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['goals', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateGoalInput> }) =>
      api.patch<GoalDto>(`/children/${childId}/goals/${id}`, patch),
    onSuccess: () => {
      toast.success({ title: t('goals.saved') });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['goals', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del<void>(`/children/${childId}/goals/${id}`),
    onSuccess: () => {
      toast.success({ title: t('goals.goalRemoved') });
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['goals', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const columns: Column<GoalDto>[] = [
    { key: 'title', header: t('goals.title'), cell: (g) => <span className="font-medium">{g.title}</span> },
    {
      key: 'description',
      header: t('goals.description'),
      cell: (g) => <span className="text-slate-600">{g.description ?? '—'}</span>,
    },
    { key: 'target', header: t('goals.target'), cell: (g) => g.target ?? '—' },
    { key: 'status', header: t('common.status'), cell: (g) => <StatusBadge status={g.status} /> },
    { key: 'meta', header: t('common.actions'), cell: (g) => <AuditMeta createdAt={g.createdAt} /> },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            cell: (g: GoalDto) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(g)}>
                  {t('common.edit')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(g)}>
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<GoalDto>,
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>{t('goals.addGoal')}</Button>
        </div>
      )}
      {listQ.error ? (
        <ErrorState
          message={listQ.error instanceof Error ? listQ.error.message : undefined}
          onRetry={() => listQ.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={listQ.data?.data ?? []}
            rowKey={(g) => g.id}
            loading={listQ.isLoading}
            emptyLabel={t('goals.noGoals')}
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

      <Modal open={creating} title={t('goals.addModal')} onClose={() => setCreating(false)}>
        <GoalForm
          childId={childId}
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal open={!!editing} title={t('goals.editModal')} onClose={() => setEditing(null)}>
        {editing && (
          <GoalForm
            childId={childId}
            initial={editing}
            submitting={updateMut.isPending}
            onSubmit={(v) => updateMut.mutate({ id: editing.id, patch: v })}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        title={t('goals.deleteTitle')}
        message={deleting ? `"${deleting.title}" — ${t('goals.deleteMsg')}` : ''}
        destructive
        confirmLabel={t('goals.deleteConfirm')}
        loading={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
      />
    </div>
  );
}
