import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createChildSchema,
  type ChildDto,
  type CreateChildInput,
  type ParentDto,
  type UserDto,
  type UserStatus,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { MultiSelect, type Option } from '../ui/MultiSelect';
import { api } from '../../lib/api';

interface Props {
  initial?: ChildDto;
  submitting?: boolean;
  onSubmit: (values: CreateChildInput) => void;
  onCancel: () => void;
}

interface UsersResp {
  data: UserDto[];
}
interface ParentsResp {
  data: ParentDto[];
}

export function ChildForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [specialistIds, setSpecialistIds] = useState<string[]>(
    initial?.specialists.map((s) => s.id) ?? [],
  );
  const [teacherIds, setTeacherIds] = useState<string[]>(
    initial?.teachers.map((t) => t.id) ?? [],
  );
  const [parentIds, setParentIds] = useState<string[]>(initial?.parents.map((p) => p.id) ?? []);
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? 'active');
  const [specialists, setSpecialists] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [parents, setParents] = useState<Option[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      // /users/staff is accessible by both admin and specialist roles.
      // It returns only active specialists + teachers — exactly what we need for dropdowns.
      const [usResult, psResult] = await Promise.allSettled([
        api.get<UsersResp>('/users/staff'),
        api.get<ParentsResp>('/parents?pageSize=100'),
      ]);

      if (usResult.status === 'fulfilled') {
        setSpecialists(
          usResult.value.data
            .filter((u) => u.role === 'specialist')
            .map((u) => ({ value: u.id, label: u.name })),
        );
        setTeachers(
          usResult.value.data
            .filter((u) => u.role === 'teacher')
            .map((u) => ({ value: u.id, label: u.name })),
        );
      }

      if (psResult.status === 'fulfilled') {
        setParents(
          psResult.value.data
            .filter((p) => p.status === 'active')
            .map((p) => ({ value: p.id, label: p.name })),
        );
      }
    })();
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const candidate = {
      name,
      dateOfBirth,
      notes: notes || null,
      specialistIds,
      teacherIds,
      parentIds,
      status,
    };
    const result = createChildSchema.safeParse(candidate);
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
        label={t('forms.childName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label={t('forms.dateOfBirth')}
        type="date"
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
        error={errors.dateOfBirth}
        required
      />
      <MultiSelect
        label={t('forms.specialists')}
        options={specialists}
        value={specialistIds}
        onChange={setSpecialistIds}
        emptyLabel={t('forms.noSpecialists')}
      />
      <MultiSelect
        label={t('forms.teachers')}
        options={teachers}
        value={teacherIds}
        onChange={setTeacherIds}
        emptyLabel={t('forms.noTeachers')}
      />
      <MultiSelect
        label={t('forms.parents')}
        options={parents}
        value={parentIds}
        onChange={setParentIds}
        emptyLabel={t('forms.noParents')}
      />
      <Textarea
        label={t('common.notes')}
        value={notes ?? ''}
        onChange={(e) => setNotes(e.target.value)}
        error={errors.notes}
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
          {initial ? t('forms.saveChanges') : t('forms.addChild')}
        </Button>
      </div>
    </form>
  );
}
