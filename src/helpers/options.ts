import { useIntl } from 'vue-intl';

export const PERIODS = ['Month', 'Quarter', 'Year' ];

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