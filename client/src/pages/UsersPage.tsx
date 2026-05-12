import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { CreateUserInput, Paginated, UpdateUserInput, UserDto } from '@kids/shared';
import { api, toQuery } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Pagination } from '../components/ui/Pagination';
import { RoleBadge, StatusBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import { KebabMenu } from '../components/ui/KebabMenu';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';
import { UserForm } from '../components/forms/UserForm';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { messageFor } from '../lib/errors';

export function UsersPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [statusToggle, setStatusToggle] = useState<UserDto | null>(null);

  const listQ = useQuery({
    queryKey: ['users', { page, debounced }],
    queryFn: () =>
      api.get<Paginated<UserDto>>(
        `/users${toQuery({ page, pageSize: 10, search: debounced })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateUserInput) => api.post<UserDto>('/users', input),
    onSuccess: (created) => {
      toast.success({ title: t('users.added', { name: created.name }) });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateUserInput }) =>
      api.patch<UserDto>(`/users/${id}`, patch),
    onSuccess: () => {
      toast.success({ title: t('users.saved') });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      api.patch<UserDto>(`/users/${id}/status`, { status }),
    onSuccess: (_d, vars) => {
      toast.success({
        title: vars.status === 'active' ? t('users.reactivated') : t('users.deactivated'),
      });
      setStatusToggle(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error({ title: t('errors.save'), body: messageFor(e) }),
  });

  const columns: Column<UserDto>[] = [
    {
      key: 'name',
      header: t('common.name'),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size={36} />
          <div className="min-w-0">
            <div className="text-body-strong text-ink">{u.name}</div>
            <div className="truncate text-small text-ink-muted">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: t('common.phone'), hideBelow: 'md', cell: (u) => u.phone },
    { key: 'role', header: t('common.role'), cell: (u) => <RoleBadge role={u.role} /> },
    { key: 'status', header: t('common.status'), cell: (u) => <StatusBadge status={u.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'text-end w-16',
      cell: (u) => (
        <div className="flex justify-end">
          <KebabMenu
            actions={[
              { label: t('users.editDetails'), onClick: () => setEditing(u) },
              {
                label: u.status === 'active' ? t('users.deactivate') : t('users.reactivate'),
                onClick: () => setStatusToggle(u),
                danger: u.status === 'active',
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        actions={<Button onClick={() => setCreating(true)}>{t('users.addUser')}</Button>}
      />
      <Input
        name="search-users"
        placeholder={t('users.searchPlaceholder')}
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
            rowKey={(u) => u.id}
            loading={listQ.isLoading}
            emptyLabel={t('users.title')}
            emptyAction={<Button onClick={() => setCreating(true)}>{t('users.addUser')}</Button>}
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

      <Modal open={creating} title={t('users.addModal')} onClose={() => setCreating(false)}>
        <UserForm
          submitting={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={!!editing}
        title={editing ? t('users.editModal', { name: editing.name }) : ''}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <UserForm
            initial={editing}
            submitting={updateMut.isPending}
            onSubmit={(values) =>
              updateMut.mutate({
                id: editing.id,
                patch: {
                  name: values.name,
                  phone: values.phone,
                  role: values.role,
                  status: values.status,
                },
              })
            }
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!statusToggle}
        title={
          statusToggle?.status === 'active'
            ? t('users.deactivateTitle', { name: statusToggle.name })
            : t('users.reactivateTitle', { name: statusToggle?.name ?? '' })
        }
        message={
          statusToggle?.status === 'active'
            ? t('users.deactivateMessage')
            : t('users.reactivateMessage')
        }
        destructive={statusToggle?.status === 'active'}
        confirmLabel={
          statusToggle?.status === 'active'
            ? t('users.deactivateConfirm')
            : t('users.reactivateConfirm')
        }
        loading={statusMut.isPending}
        onCancel={() => setStatusToggle(null)}
        onConfirm={() =>
          statusToggle &&
          statusMut.mutate({
            id: statusToggle.id,
            status: statusToggle.status === 'active' ? 'inactive' : 'active',
          })
        }
      />
    </div>
  );
}
