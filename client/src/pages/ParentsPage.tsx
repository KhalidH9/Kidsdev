import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type {
  CreateParentInput,
  Paginated,
  ParentDto,
  UpdateParentInput,
} from '@kids/shared';
import { api, toQuery } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/Badges';
import { KebabMenu } from '../components/ui/KebabMenu';
import { Avatar } from '../components/ui/Avatar';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';
import { ParentForm } from '../components/forms/ParentForm';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { messageFor } from '../lib/errors';

export function ParentsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ParentDto | null>(null);
  const [deleting, setDeleting] = useState<ParentDto | null>(null);
  const [inviting, setInviting] = useState<ParentDto | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['parents', { page, debounced }],
    queryFn: () =>
      api.get<Paginated<ParentDto>>(
        `/parents${toQuery({ page, pageSize: 10, search: debounced })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateParentInput) => api.post<ParentDto>('/parents', input),
    onSuccess: (created) => {
      toast.success({ title: t('parents.added', { name: created.name }) });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateParentInput }) =>
      api.patch<ParentDto>(`/parents/${id}`, patch),
    onSuccess: () => {
      toast.success({ title: t('parents.saved') });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del<void>(`/parents/${id}`),
    onSuccess: () => {
      toast.success({ title: t('parents.removed') });
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const inviteMut = useMutation({
    mutationFn: (id: string) =>
      api.post<{ parent: ParentDto; tempPassword: string }>(`/parents/${id}/invite`, {}),
    onSuccess: (res) => {
      setInviting(null);
      setTempPassword(res.tempPassword);
      qc.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (e) =>
      toast.error({
        title: t('parents.inviteError'),
        body: messageFor(e),
      }),
  });

  const columns: Column<ParentDto>[] = [
    {
      key: 'name',
      header: t('common.name'),
      cell: (p) => (
        <div className="flex items-center gap-3">
          <Avatar name={p.name} size={36} />
          <div className="min-w-0">
            <div className="text-body-strong text-ink">{p.name}</div>
            <div className="truncate text-small text-ink-muted">{p.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: t('common.phone'), hideBelow: 'md', cell: (p) => p.phone },
    { key: 'status', header: t('common.status'), cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-end w-16',
      cell: (p) => (
        <div className="flex justify-end">
          <KebabMenu
            actions={[
              { label: t('parents.invitePortal'), onClick: () => setInviting(p) },
              { label: t('parents.editDetails'), onClick: () => setEditing(p) },
              { label: t('parents.removeParent'), onClick: () => setDeleting(p), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('parents.title')}
        description={t('parents.description')}
        actions={<Button onClick={() => setCreating(true)}>{t('parents.addParent')}</Button>}
      />
      <Input
        name="search-parents"
        placeholder={t('parents.searchPlaceholder')}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        iconStart={<Search className="h-4 w-4" aria-hidden />}
      />
      {listQ.error ? (
        <ErrorState message={messageFor(listQ.error)} onRetry={() => listQ.refetch()} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={listQ.data?.data ?? []}
            rowKey={(p) => p.id}
            loading={listQ.isLoading}
            emptyLabel={t('parents.title')}
            emptyAction={<Button onClick={() => setCreating(true)}>{t('parents.addParent')}</Button>}
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

      <Modal open={creating} title={t('parents.addModal')} onClose={() => setCreating(false)}>
        <ParentForm
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal
        open={!!editing}
        title={editing ? t('parents.editModal', { name: editing.name }) : ''}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <ParentForm
            initial={editing}
            submitting={updateMut.isPending}
            onSubmit={(v) => updateMut.mutate({ id: editing.id, patch: v })}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? t('parents.removeTitle', { name: deleting.name }) : ''}
        message={deleting ? t('parents.removeMessage', { name: deleting.name }) : ''}
        destructive
        confirmLabel={
          deleting
            ? t('parents.removeConfirm', { firstName: deleting.name.split(' ')[0] })
            : t('common.delete')
        }
        loading={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
      />
      <ConfirmDialog
        open={!!inviting}
        title={t('parents.inviteTitle')}
        message={
          inviting
            ? t('parents.inviteMessage', { name: inviting.name, email: inviting.email })
            : ''
        }
        confirmLabel={t('parents.inviteConfirm')}
        loading={inviteMut.isPending}
        onCancel={() => setInviting(null)}
        onConfirm={() => inviting && inviteMut.mutate(inviting.id)}
      />
      <Modal
        open={!!tempPassword}
        title={t('parents.otpTitle')}
        onClose={() => setTempPassword(null)}
        size="sm"
        footer={<Button onClick={() => setTempPassword(null)}>{t('common.done')}</Button>}
      >
        <p className="text-body text-ink">{t('parents.otpBody')}</p>
        <code className="mt-3 block break-all rounded-sm bg-surface-sunken px-3 py-3 font-mono text-body text-ink">
          {tempPassword}
        </code>
      </Modal>
    </div>
  );
}
