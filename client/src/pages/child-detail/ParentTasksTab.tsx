import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CreateParentTaskInput, Paginated, ParentTaskDto } from '@kids/shared';
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
import { ParentTaskForm } from '../../components/forms/ParentTaskForm';
import { formatDateTime } from '../../lib/utils';
import { messageFor, GENERIC_SAVE_ERROR } from '../../lib/errors';

export function ParentTasksTab({ childId }: { childId: string }) {
  const { role } = useAuth();
  const { t } = useTranslation();
  const canWrite = role === 'admin' || role === 'specialist';
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ParentTaskDto | null>(null);
  const [deleting, setDeleting] = useState<ParentTaskDto | null>(null);

  const listQ = useQuery({
    queryKey: ['parent-tasks', childId, page],
    queryFn: () =>
      api.get<Paginated<ParentTaskDto>>(
        `/parent-tasks/child/${childId}${toQuery({ page, pageSize: 10 })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateParentTaskInput) =>
      api.post<ParentTaskDto>('/parent-tasks', input),
    onSuccess: () => {
      toast.success({ title: t('tasks.sent') });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['parent-tasks', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateParentTaskInput> }) =>
      api.patch<ParentTaskDto>(`/parent-tasks/${id}`, patch),
    onSuccess: () => {
      toast.success({ title: t('tasks.saved') });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['parent-tasks', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del<void>(`/parent-tasks/${id}`),
    onSuccess: () => {
      toast.success({ title: t('tasks.removed') });
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['parent-tasks', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const columns: Column<ParentTaskDto>[] = [
    {
      key: 'title',
      header: t('tasks.titleCol'),
      cell: (task) => <span className="font-medium">{task.title}</span>,
    },
    {
      key: 'taskStatus',
      header: t('tasks.progressCol'),
      cell: (task) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {task.taskStatus}
        </span>
      ),
    },
    {
      key: 'due',
      header: t('tasks.dueCol'),
      cell: (task) => (task.dueAt ? formatDateTime(task.dueAt) : '—'),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (task) => <StatusBadge status={task.status} />,
    },
    {
      key: 'meta',
      header: t('common.actions'),
      cell: (task) => <AuditMeta createdAt={task.createdAt} />,
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            cell: (task: ParentTaskDto) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(task)}>
                  {t('common.edit')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(task)}>
                  {t('common.delete')}
                </Button>
              </div>
            ),
          } satisfies Column<ParentTaskDto>,
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>{t('tasks.add')}</Button>
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
            rowKey={(task) => task.id}
            loading={listQ.isLoading}
            emptyLabel={t('tasks.noTasks')}
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

      <Modal open={creating} title={t('tasks.addModal')} onClose={() => setCreating(false)}>
        <ParentTaskForm
          childId={childId}
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal open={!!editing} title={t('tasks.editModal')} onClose={() => setEditing(null)}>
        {editing && (
          <ParentTaskForm
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
        title={t('tasks.deleteTitle')}
        message={deleting ? `"${deleting.title}" — ${t('tasks.deleteMsg')}` : ''}
        destructive
        confirmLabel={t('tasks.deleteConfirm')}
        loading={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
      />
    </div>
  );
}
