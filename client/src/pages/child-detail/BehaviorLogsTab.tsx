import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { BehaviorLogDto, CreateBehaviorLogInput, Paginated } from '@kids/shared';
import { api, toQuery } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';
import { BehaviorLogForm } from '../../components/forms/BehaviorLogForm';
import { formatRelativeTime } from '../../lib/utils';
import { messageFor, GENERIC_SAVE_ERROR } from '../../lib/errors';

export function BehaviorLogsTab({ childId }: { childId: string }) {
  const { role } = useAuth();
  const { t } = useTranslation();
  const canCreate = role === 'teacher';
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const listQ = useQuery({
    queryKey: ['behavior-logs', childId, page],
    queryFn: () =>
      api.get<Paginated<BehaviorLogDto>>(
        `/children/${childId}/behavior-logs${toQuery({ page, pageSize: 10 })}`,
      ),
  });

  const createMut = useMutation({
    mutationFn: (input: CreateBehaviorLogInput) =>
      api.post<BehaviorLogDto>(`/children/${childId}/behavior-logs`, input),
    onSuccess: (created) => {
      const time = new Date(created.occurredAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      toast.success({ title: t('logs.loggedAt', { time }) });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['behavior-logs', childId] });
    },
    onError: (e) =>
      toast.error({
        title: t('logs.cannotRecord'),
        body: messageFor(e, GENERIC_SAVE_ERROR),
      }),
  });

  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>{t('logs.record')}</Button>
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
        <EmptyState
          title={t('logs.noLogs')}
          body={t('logs.noLogsHint')}
        />
      ) : (
        <ol className="space-y-3">
          {listQ.data!.data.map((log) => (
            <li
              key={log.id}
              className="rounded-md border border-line bg-white p-4 shadow-card"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-body-strong text-ink">{log.eventType}</div>
                <div className="text-small text-ink-muted">
                  {formatRelativeTime(log.occurredAt)}
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-small text-ink sm:grid-cols-4">
                {log.response && (
                  <>
                    <dt className="font-medium text-ink-muted">{t('forms.response')}</dt>
                    <dd>{log.response}</dd>
                  </>
                )}
                {log.promptLevel && (
                  <>
                    <dt className="font-medium text-ink-muted">{t('forms.promptLevel')}</dt>
                    <dd>{log.promptLevel}</dd>
                  </>
                )}
                {log.intensity && (
                  <>
                    <dt className="font-medium text-ink-muted">{t('forms.intensity')}</dt>
                    <dd>{log.intensity}</dd>
                  </>
                )}
                {log.durationSec != null && (
                  <>
                    <dt className="font-medium text-ink-muted">{t('forms.duration')}</dt>
                    <dd>{log.durationSec}s</dd>
                  </>
                )}
                {log.location && (
                  <>
                    <dt className="font-medium text-ink-muted">{t('forms.location')}</dt>
                    <dd>{log.location}</dd>
                  </>
                )}
              </dl>
              {log.notes && <p className="mt-2 text-body text-ink">{log.notes}</p>}
            </li>
          ))}
        </ol>
      )}
      <Pagination
        page={listQ.data?.page ?? 1}
        totalPages={listQ.data?.totalPages ?? 1}
        total={listQ.data?.total}
        pageSize={listQ.data?.pageSize}
        onPageChange={setPage}
      />

      <Modal open={creating} title={t('logs.addModal')} onClose={() => setCreating(false)}>
        <BehaviorLogForm
          childId={childId}
          submitting={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}
