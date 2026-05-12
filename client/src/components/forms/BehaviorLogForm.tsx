import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createBehaviorLogSchema,
  type CreateBehaviorLogInput,
} from '@kids/shared';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface Props {
  childId: string;
  submitting?: boolean;
  onSubmit: (values: CreateBehaviorLogInput) => void;
  onCancel: () => void;
}

/**
 * Teacher quick-record form. Optimized for short, in-the-moment entries.
 */
export function BehaviorLogForm({ childId, submitting, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [eventType, setEventType] = useState('');
  const [response, setResponse] = useState('');
  const [promptLevel, setPromptLevel] = useState('');
  const [intensity, setIntensity] = useState('');
  const [durationSec, setDurationSec] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createBehaviorLogSchema.safeParse({
      childId,
      eventType,
      response: response || null,
      promptLevel: promptLevel || null,
      intensity: intensity || null,
      durationSec: durationSec ? Number(durationSec) : null,
      location: location || null,
      notes: notes || null,
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
    <form onSubmit={submit} className="space-y-3">
      <Input
        label={t('forms.eventType')}
        value={eventType}
        onChange={(e) => setEventType(e.target.value)}
        error={errors.eventType}
        placeholder={t('forms.eventTypePlaceholder')}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('forms.response')}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
        <Input
          label={t('forms.promptLevel')}
          value={promptLevel}
          onChange={(e) => setPromptLevel(e.target.value)}
        />
        <Input
          label={t('forms.intensity')}
          value={intensity}
          onChange={(e) => setIntensity(e.target.value)}
        />
        <Input
          label={t('forms.duration')}
          type="number"
          min={0}
          value={durationSec}
          onChange={(e) => setDurationSec(e.target.value)}
        />
      </div>
      <Input
        label={t('forms.location')}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <Textarea
        label={t('common.notes')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {t('logs.record')}
        </Button>
      </div>
    </form>
  );
}
