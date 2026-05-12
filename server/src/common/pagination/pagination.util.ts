import type { Paginated, ListQuery } from '@kids/shared';

export interface RangeBounds {
  from: number;
  to: number;
}

export function rangeFor(query: Pick<ListQuery, 'page' | 'pageSize'>): RangeBounds {
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  return { from, to };
}

export function paginate<T>(
  data: T[],
  total: number,
  query: Pick<ListQuery, 'page' | 'pageSize'>,
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  return { data, page: query.page, pageSize: query.pageSize, total, totalPages };
}
