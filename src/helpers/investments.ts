import { AccountType, type Account } from '@/types';

type groupType = Record<string, { type: string; name: string; expected: number, children: any }>;

function groupInvestmentsByType(subClassObj: any, expected: any): any {
  const grouped: groupType = {};
  Object.keys(subClassObj).forEach(id => {
    const item = subClassObj[id];
    if (!grouped[item.type]) {
      grouped[item.type] = {
        type: AccountType.Category,
        name: item.type,
        expected: expected && expected[item.type] && expected[item.type].value || 0,
        children: {}
      };
    }
    grouped[item.type].children[id] = item;
  });
  return Object.values(grouped);
}

export function mapInvestmentsBySubCategory(inv: any, expected: any): any[] {
  if (!inv) return [];
  return Object.keys(inv).map(assetClass => ({
    type: AccountType.Category,
    name: assetClass,
    expected: expected[assetClass] && expected[assetClass].value || 0,
    children: Object.keys(inv[assetClass]).map(subClass => ({
      type: AccountType.Category,
      name: subClass,
      expected: expected[assetClass] && expected[assetClass][subClass] && expected[assetClass][subClass].value || 0,
      children: groupInvestmentsByType(inv[assetClass][subClass], expected[assetClass] && expected[assetClass][subClass])
    }))
  }));
}

export function accountsGrupedByAttribute(accounts: Account[], att: string, def: any | undefined) {
  return accounts.reduce((ant: any, account: any) => {
    if (!ant[account[att] || def]) {
      ant[account[att] || def] = {}
    }
    ant[account[att] || def][account.id] = { ...account };
    return ant;
  }, {});
}