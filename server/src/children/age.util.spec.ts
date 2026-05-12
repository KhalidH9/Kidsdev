import { formatAge } from './age.util';

describe('formatAge', () => {
  it('formats exact years', () => {
    expect(formatAge('2020-05-11', new Date('2026-05-11T00:00:00Z'))).toBe('06-00-00');
  });
  it('handles month/day rollover', () => {
    expect(formatAge('2020-06-15', new Date('2026-05-11T00:00:00Z'))).toBe('05-10-26');
  });
  it('zero-pads single digits', () => {
    expect(formatAge('2025-03-01', new Date('2026-05-11T00:00:00Z'))).toBe('01-02-10');
  });
});
