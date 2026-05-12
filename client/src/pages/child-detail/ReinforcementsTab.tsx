import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CreateReinforcementInput, Paginated, ReinforcementDto } from '@kids/shared';
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
import { ReinforcementForm } from '../../components/forms/ReinforcementForm';
import { messageFor, GENERIC_SAVE_ERROR } from '../../lib/errors';

export function ReinforcementsTab({
  childId,
}: {
  childId: string;
  childName?: string;
}) {
  const { role } = useAuth();
  const { t } = useTranslation();
  const canWrite = role === 'admin' || role === 'specialist';
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ReinforcementDto | null>(null);
  const [deleting, setDeleting] = useState<ReinforcementDto | null>(null);

  const listQ = useQuery({
    queryKey: ['reinforcements', childId, page],
    queryFn: () =>
      api.get<Paginated<ReinforcementDto>>(
        `/children/${childId}/reinforcements${toQuery({ page, pageSize: 10 })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateReinforcementInput) =>
      api.post<ReinforcementDto>(`/children/${childId}/reinforcements`, input),
    onSuccess: () => {
      toast.success({ title: t('reinforcements.saved') });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['reinforcements', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateReinforcementInput> }) =>
      api.patch<ReinforcementDto>(`/children/${childId}/reinforcements/${id}`, patch),
    onSuccess: () => {
      toast.success({ title: t('reinforcements.saved') });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['reinforcements', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del<void>(`/children/${childId}/reinforcements/${id}`),
    onSuccess: () => {
      toast.success({ title: t('reinforcements.removed') });
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['reinforcements', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const columns: Column<ReinforcementDto>[] = [
    {
      key: 'title',
      header: t('forms.reinforcementTitle'),
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: 'schedule',
      header: t('forms.reinforcementSchedule'),
      cell: (r) =>
        r.scheduleType === 'continuous' ? 'continuous' : `VR ${r.vrMin}–${r.vrMax}`,
    },
    {
      key: 'description',
      header: t('forms.reinforcementDescription'),
      cell: (r) => <span className="text-slate-600">{r.description ?? '—'}</span>,
    },
    { key: 'status', header: t('common.status'), cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'meta', header: t('common.actions'), cell: (r) => <AuditMeta createdAt={r.createdAt} /> },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            cell: (r: ReinforcementDto) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
                  {t('common.edit')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<ReinforcementDto>,
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>{t('reinforcements.add')}</Button>
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
            rowKey={(r) => r.id}
            loading={listQ.isLoading}
            emptyLabel={t('reinforcements.noItems')}
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

      <Modal open={creating} title={t('reinforcements.addModal')} onClose={() => setCreating(false)}>
        <ReinforcementForm
          childId={childId}
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal open={!!editing} title={t('reinforcements.editModal')} onClose={() => setEditing(null)}>
        {editing && (
          <ReinforcementForm
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
        title={t('reinforcements.deleteTitle')}
        message={deleting ? `"${deleting.title}" — ${t('reinforcements.deleteMsg')}` : ''}
        destructive
        confirmLabel={t('reinforcements.deleteConfirm')}
        loading={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
      />
    </div>
  );
}
