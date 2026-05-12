import type { ReactNode } from 'react';
import type { Role, UserStatus } from '@kids/shared';
import { useTranslation } from 'react-i18next';
import { cx } from '../../lib/utils';

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium leading-4 tracking-[0.02em]',
        tone,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const { t } = useTranslation();
  return status === 'active' ? (
    <Pill tone="bg-success-50 text-success-600">{t('badges.active')}</Pill>
  ) : (
    <Pill tone="bg-[#F1EEF6] text-ink-muted">{t('badges.inactive')}</Pill>
  );
}

const roleTones: Record<Role, string> = {
  admin: 'bg-purple-50 text-purple-700',
  specialist: 'bg-[#E6F4F1] text-[#0E6B5C]',
  teacher: 'bg-[#FFF3E0] text-[#8A4B00]',
  parent: 'bg-[#EEF0FA] text-[#33408A]',
};

export function RoleBadge({ role }: { role: Role }) {
  const { t } = useTranslation();
  return <Pill tone={roleTones[role]}>{t(`badges.${role}`)}</Pill>;
}
