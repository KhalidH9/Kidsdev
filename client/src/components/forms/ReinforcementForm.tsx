import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createReinforcementSchema,
  REINFORCEMENT_SCHEDULE_TYPES,
  type CreateReinforcementInput,
  type ReinforcementDto,
  type ReinforcementScheduleType,
  type UserStatus,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface Props {
  childId: string;
  initial?: ReinforcementDto;
  submitting?: boolean;
  onSubmit: (values: CreateReinforcementInput) => void;
  onCancel: () => void;
}

export function ReinforcementForm({ childId, initial, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [scheduleType, setScheduleType] = useState<ReinforcementScheduleType>(
    initial?.scheduleType ?? 'continuous',
  );
  const [vrMin, setVrMin] = useState<string>(initial?.vrMin?.toString() ?? '');
  const [vrMax, setVrMax] = useState<string>(initial?.vrMax?.toString() ?? '');
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createReinforcementSchema.safeParse({
      childId,
      title,
      description: description || null,
      scheduleType,
      vrMin: scheduleType === 'variable_ratio' && vrMin ? Number(vrMin) : null,
      vrMax: scheduleType === 'variable_ratio' && vrMax ? Number(vrMax) : null,
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
        label={t('forms.reinforcementTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />
      <Textarea
        label={t('forms.reinforcementDescription')}
        value={description ?? ''}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Select
        label={t('forms.reinforcementSchedule')}
        value={scheduleType}
        onChange={(e) => setScheduleType(e.target.value as ReinforcementScheduleType)}
      >
        {REINFORCEMENT_SCHEDULE_TYPES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {scheduleType === 'variable_ratio' && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('forms.vrMin')}
            type="number"
            min={1}
            value={vrMin}
            onChange={(e) => setVrMin(e.target.value)}
            error={errors.vrMin}
            required
          />
          <Input
            label={t('forms.vrMax')}
            type="number"
            min={1}
            value={vrMax}
            onChange={(e) => setVrMax(e.target.value)}
            error={errors.vrMax}
            required
          />
        </div>
      )}
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
          {initial ? t('forms.saveChanges') : t('forms.addReinforcement')}
        </Button>
      </div>
    </form>
  );
}
