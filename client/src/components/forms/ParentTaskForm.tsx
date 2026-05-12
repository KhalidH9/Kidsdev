import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createParentTaskSchema,
  TASK_STATUSES,
  type ChildDto,
  type CreateParentTaskInput,
  type ParentTaskDto,
  type TaskStatus,
  type UserStatus,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';

interface Props {
  childId: string;
  initial?: ParentTaskDto;
  submitting?: boolean;
  onSubmit: (values: CreateParentTaskInput) => void;
  onCancel: () => void;
}

export function ParentTaskForm({ childId, initial, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [parents, setParents] = useState<{ id: string; name: string }[]>([]);
  const [parentId, setParentId] = useState(initial?.parentId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueAt, setDueAt] = useState(initial?.dueAt?.slice(0, 16) ?? '');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(initial?.taskStatus ?? 'pending');
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const child = await api.get<ChildDto>(`/children/${childId}`);
        setParents(child.parents.map((p) => ({ id: p.id, name: p.name })));
        if (!initial && child.parents.length > 0 && !parentId) {
          setParentId(child.parents[0]?.id ?? '');
        }
      } catch {
        /* ignored */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createParentTaskSchema.safeParse({
      childId,
      parentId,
      title,
      description: description || null,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      taskStatus,
      status,
    });
    if (!result.success) {
      const fe: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = String(issue.path[0] ?? '');
        if (!fe[k]) fe[k] = issue.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select
        label={t('forms.taskAssign')}
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        error={errors.parentId}
        required
      >
        <option value="">{t('forms.taskSelectParent')}</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      {parents.length === 0 && (
        <p className="text-xs text-amber-600">{t('forms.taskNoParents')}</p>
      )}
      <Input
        label={t('forms.taskTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />
      <Textarea
        label={t('forms.taskDescription')}
        value={description ?? ''}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Input
        label={t('forms.taskDueAt')}
        type="datetime-local"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
      />
      <Select
        label={t('forms.taskStatus')}
        value={taskStatus}
        onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select
        label={t('common.status')}
        value={status}
        onChange={(e) => setStatus(e.target.value as UserStatus)}
      >
        <option value="active">{t('forms.statusActive')}</option>
        <option value="inactive">{t('forms.statusInactive')}</option>
      </Select>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting} disabled={!parentId}>
          {initial ? t('forms.saveChanges') : t('forms.createTask')}
        </Button>
      </div>
    </form>
  );
}
