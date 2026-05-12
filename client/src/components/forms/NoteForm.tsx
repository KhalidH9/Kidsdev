import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createNoteSchema,
  NOTE_VISIBILITIES,
  type CreateNoteInput,
  type NoteDto,
  type NoteVisibility,
  type UserStatus,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface Props {
  childId: string;
  initial?: NoteDto;
  submitting?: boolean;
  onSubmit: (values: CreateNoteInput) => void;
  onCancel: () => void;
}

export function NoteForm({ childId, initial, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [visibility, setVisibility] = useState<NoteVisibility>(initial?.visibility ?? 'staff');
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createNoteSchema.safeParse({ childId, title, body, visibility, status });
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
        label={t('forms.noteTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />
      <Textarea
        label={t('forms.noteBody')}
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        error={errors.body}
        required
      />
      <Select
        label={t('forms.noteVisibility')}
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as NoteVisibility)}
      >
        {NOTE_VISIBILITIES.map((v) => (
          <option key={v} value={v}>
            {v === 'staff' ? t('forms.visibilityStaff') : t('forms.visibilityParents')}
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
          {initial ? t('forms.saveChanges') : t('forms.createNote')}
        </Button>
      </div>
    </form>
  );
}
