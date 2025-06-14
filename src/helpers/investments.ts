import { AccountType } from '@/types';

function groupInvestmentsByType(subClassObj: any): any {
  const grouped: Record<string, { type: string; name: string; children: any }> = {};
  Object.keys(subClassObj).forEach(id => {
    const item = subClassObj[id];
    if (!grouped[item.type]) {
      grouped[item.type] = {
        type: AccountType.Category,
        name: item.type,
        children: {}
      };
    }
    grouped[item.type].children[id] = item;
  });
  return Object.values(grouped);
}

export function mapInvestmentsBySubCategory(inv: any): any[] {
  if (!inv) return [];
  return Object.keys(inv).map(assetClass => ({
    type: AccountType.Category,
    name: assetClass,
    children: Object.keys(inv[assetClass]).map(subClass => ({
      type: AccountType.Category,
      name: subClass,
      children: groupInvestmentsByType(inv[assetClass][subClass])
    }))
  }));
}
