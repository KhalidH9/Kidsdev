import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createParentSchema,
  type CreateParentInput,
  type ParentDto,
  type UserStatus,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  initial?: ParentDto;
  submitting?: boolean;
  onSubmit: (values: CreateParentInput) => void;
  onCancel: () => void;
}

export function ParentForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createParentSchema.safeParse({ name, email, phone, status });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label={t('common.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label={t('common.email')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />
      <Input
        label={t('auth.phone')}
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        error={errors.phone}
        inputMode="numeric"
        maxLength={10}
        required
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
          {initial ? t('forms.saveChanges') : t('forms.addParent')}
        </Button>
      </div>
    </form>
  );
}
