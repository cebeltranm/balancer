import { describe, expect, it } from 'vitest';
import { accountsGrupedByAttribute, mapInvestmentsBySubCategory } from '@/helpers/investments';

describe('investments helper', () => {
  it('maps nested investments with expected values', () => {
    const mapped = mapInvestmentsBySubCategory(
      {
        Equities: {
          US: {
            a1: { id: 'a1', name: 'SPY', type: 'ETF' },
          },
        },
      },
      {
        Equities: {
          value: 60,
          US: {
            value: 60,
            ETF: { value: 60 },
          },
        },
      }
    );

    expect(mapped[0].name).toBe('Equities');
    expect(mapped[0].expected).toBe(60);
    expect(mapped[0].children[0].children[0].expected).toBe(60);
  });

  it('groups accounts by selected attribute', () => {
    const grouped = accountsGrupedByAttribute(
      [
        { id: 'a', name: 'A', currency: 'usd', type: 'Cash', category: [], entity: 'BrokerA' } as any,
        { id: 'b', name: 'B', currency: 'usd', type: 'Cash', category: [] } as any,
      ],
      'entity',
      'Unknown'
    );

    expect(Object.keys(grouped)).toEqual(['BrokerA', 'Unknown']);
    expect(grouped.BrokerA.a.name).toBe('A');
    expect(grouped.Unknown.b.name).toBe('B');
  });
});
