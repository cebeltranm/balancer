import { useIntl } from 'vue-intl';
import { AccountType } from '@/types';


export const BACKGROUNDS_COLOR_GRAPH = ["#75bef8", "#90cd93", "#fbc02d", "#61d5e4", "#f1749e", "8893d1", "#61beb5", "#f57c00", "#9caeb7", "#c279ce", "#E0E0E0", "#ff8980"];

export function getCurrentPeriod() {
    var year = new Date().getFullYear();
    var month = new Date().getMonth() + 1;
    var quarter = month <= 3 ? 1 : month <=6 ? 2 : month <=9 ? 3 : 4;
    return {year, month, quarter};
}

// to check
export function getOptionPerPeriod(period: string) {

    if (period === 'Month') {
        const intl = useIntl();
        return [0,1,2,3,4,5,6,7,8,9,10,11,12,13].map( m => {
            const d = new Date();
            d.setMonth(d.getMonth() - m);
            return {name: intl.formatDate(d, {month: 'long', year: 'numeric'}), value: {month: d.getMonth(), year: d.getYear()} }
        });
    }
    return [0,1,2,3,4,5].map( m => {
        const year = (new Date()).getYear() + 1900 - m;
        return { name: year, value: { year } };
    });
}