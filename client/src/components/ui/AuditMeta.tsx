import { formatDateTime } from '../../lib/utils';

interface Props {
  createdAt?: string;
  updatedAt?: string;
}

export function AuditMeta({ createdAt, updatedAt }: Props) {
  return (
    <div className="text-small text-ink-muted">
      {createdAt && <div>Created · {formatDateTime(createdAt)}</div>}
      {updatedAt && updatedAt !== createdAt && (
        <div>Updated · {formatDateTime(updatedAt)}</div>
      )}
    </div>
  );
}
