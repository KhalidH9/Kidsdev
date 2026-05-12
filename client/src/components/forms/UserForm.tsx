import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createUserSchema,
  STAFF_ROLES,
  type CreateUserInput,
  type StaffRole,
  type UserDto,
  type UserStatus,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface Props {
  initial?: UserDto;
  submitting?: boolean;
  onSubmit: (values: CreateUserInput) => void;
  onCancel: () => void;
}

export function UserForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [role, setRole] = useState<StaffRole>(initial?.role ?? 'teacher');
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createUserSchema.safeParse({ name, email, phone, role, status });
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
        disabled={!!initial}
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
      <Select label={t('common.role')} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
        {STAFF_ROLES.map((r) => (
          <option key={r} value={r}>
            {t(`badges.${r}`)}
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
        <Button type="submit" loading={submitting}>
          {initial ? t('forms.saveChanges') : t('forms.addUser')}
        </Button>
      </div>
    </form>
  );
}
