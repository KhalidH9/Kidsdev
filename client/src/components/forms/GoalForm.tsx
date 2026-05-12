import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createGoalSchema,
  type CreateGoalInput,
  type GoalDto,
  type UserStatus,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface Props {
  childId: string;
  initial?: GoalDto;
  submitting?: boolean;
  onSubmit: (values: CreateGoalInput) => void;
  onCancel: () => void;
}

export function GoalForm({ childId, initial, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createGoalSchema.safeParse({
      childId,
      title,
      description: description || null,
      target: target || null,
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
      <Input
        label={t('forms.goalTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />
      <Textarea
        label={t('forms.goalDescription')}
        value={description ?? ''}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Input
        label={t('forms.goalTarget')}
        value={target ?? ''}
        onChange={(e) => setTarget(e.target.value)}
      />
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
        <Button type="submit" loading={submitting}>
          {initial ? t('forms.saveChanges') : t('forms.createGoal')}
        </Button>
      </div>
    </form>
  );
}
