import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CreateNoteInput, NoteDto, Paginated } from '@kids/shared';
import { api, toQuery } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { NoteForm } from '../../components/forms/NoteForm';
import { KebabMenu } from '../../components/ui/KebabMenu';
import { formatRelativeTime, cx } from '../../lib/utils';
import { messageFor, GENERIC_SAVE_ERROR } from '../../lib/errors';

interface Props {
  childId: string;
  childName?: string;
}

export function NotesTab({ childId }: Props) {
  const { role } = useAuth();
  const { t } = useTranslation();
  const canWrite = role === 'admin' || role === 'specialist';
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<NoteDto | null>(null);
  const [deleting, setDeleting] = useState<NoteDto | null>(null);

  const listQ = useQuery({
    queryKey: ['notes', childId, page],
    queryFn: () =>
      api.get<Paginated<NoteDto>>(
        `/children/${childId}/notes${toQuery({ page, pageSize: 10 })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateNoteInput) =>
      api.post<NoteDto>(`/children/${childId}/notes`, input),
    onSuccess: () => {
      toast.success({ title: t('notes.saved') });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['notes', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateNoteInput> }) =>
      api.patch<NoteDto>(`/children/${childId}/notes/${id}`, patch),
    onSuccess: () => {
      toast.success({ title: t('notes.saved') });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['notes', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del<void>(`/children/${childId}/notes/${id}`),
    onSuccess: () => {
      toast.success({ title: t('notes.removed') });
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['notes', childId] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e, GENERIC_SAVE_ERROR) }),
  });

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>{t('notes.add')}</Button>
        </div>
      )}
      {listQ.error ? (
        <ErrorState
          message={listQ.error instanceof Error ? listQ.error.message : undefined}
          onRetry={() => listQ.refetch()}
        />
      ) : listQ.isLoading ? (
        <LoadingState />
      ) : (listQ.data?.data ?? []).length === 0 ? (
        <EmptyState title={t('notes.noNotes')} />
      ) : (
        <div className="space-y-3">
          {listQ.data!.data.map((n) => (
            <article
              key={n.id}
              className="rounded-md border border-line bg-white p-4 shadow-card"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-body-strong text-ink">{n.title}</h3>
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-[12px] font-medium',
                      n.visibility === 'parent'
                        ? 'bg-warning-50 text-warning-600'
                        : 'bg-purple-50 text-purple-700',
                    )}
                  >
                    {n.visibility === 'parent'
                      ? t('forms.visibilityParents')
                      : t('forms.visibilityStaff')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-small text-ink-muted">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                  {canWrite && (
                    <KebabMenu
                      actions={[
                        { label: t('notes.edit'), onClick: () => setEditing(n) },
                        { label: t('common.delete'), onClick: () => setDeleting(n), danger: true },
                      ]}
                    />
                  )}
                </div>
              </header>
              <p className="mt-2 whitespace-pre-wrap text-body text-ink">{n.body}</p>
            </article>
          ))}
        </div>
      )}
      <Pagination
        page={listQ.data?.page ?? 1}
        totalPages={listQ.data?.totalPages ?? 1}
        total={listQ.data?.total}
        pageSize={listQ.data?.pageSize}
        onPageChange={setPage}
      />

      <Modal open={creating} title={t('notes.addModal')} onClose={() => setCreating(false)}>
        <NoteForm
          childId={childId}
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal open={!!editing} title={t('notes.editModal')} onClose={() => setEditing(null)}>
        {editing && (
          <NoteForm
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
        title={t('notes.deleteTitle')}
        message={deleting ? `"${deleting.title}" — ${t('notes.deleteMsg')}` : ''}
        destructive
        confirmLabel={t('notes.deleteConfirm')}
        loading={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
      />
    </div>
  );
}
