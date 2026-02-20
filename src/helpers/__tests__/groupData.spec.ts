import { describe, expect, it } from 'vitest';
import { groupDataByPeriods } from '@/helpers/groupData';
import { Period } from '@/types';

describe('groupData helper', () => {
  it('groups by month and walks backward periods', () => {
    const res = groupDataByPeriods(
      Period.Month,
      3,
      { year: 2025, month: 2, quarter: 1 },
      ['a'],
      (_id, year, months) => `${year}-${months[0]}`
    );

    expect(res.a).toEqual(['2025-2', '2025-1', '2024-12']);
  });

  it('groups by quarter with proper month windows', () => {
    const res = groupDataByPeriods(
      Period.Quarter,
      2,
      { year: 2025, month: 6, quarter: 2 },
      ['a', 'b'],
      (id, year, months) => `${id}:${year}:${months.join(',')}`
    );

    expect(res.a).toEqual(['a:2025:4,5,6', 'a:2025:1,2,3']);
    expect(res.b).toEqual(['b:2025:4,5,6', 'b:2025:1,2,3']);
  });
});
