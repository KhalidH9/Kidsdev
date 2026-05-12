import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface Props {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPageChange: (next: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language.startsWith('ar');

  if (totalPages <= 1 && !total) return null;
  const from = total && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = total && pageSize ? Math.min(page * pageSize, total) : null;

  // In RTL, "previous" visually moves right and "next" moves left
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <nav
      className="flex items-center justify-between gap-3 py-4"
      aria-label="Pagination"
    >
      <p className="text-small text-ink-muted">
        {total != null && from != null && to != null ? (
          <>
            {t('common.showing')}{' '}
            <span className="text-ink">{from}</span>–
            <span className="text-ink">{to}</span>{' '}
            {t('common.of')}{' '}
            <span className="text-ink">{total}</span>
          </>
        ) : (
          <>
            {t('common.page')} <span className="text-ink">{page}</span> {t('common.of')} {totalPages}
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('common.previous')}
          iconStart={<PrevIcon className="h-4 w-4" />}
        >
          {t('common.previous')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('common.next')}
          iconEnd={<NextIcon className="h-4 w-4" />}
        >
          {t('common.next')}
        </Button>
      </div>
    </nav>
  );
}
