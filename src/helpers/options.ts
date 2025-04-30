import { useIntl } from 'vue-intl';
import { AccountType, Period, Currency } from '@/types';
import format from '@/format';


export const BACKGROUNDS_COLOR_GRAPH = ["#75bef8", "#90cd93", "#fbc02d", "#61d5e4", "#f1749e", "8893d1", "#61beb5", "#f57c00", "#9caeb7", "#c279ce", "#E0E0E0", "#ff8980"];

export const CURRENCY_ICONS = {
    usd: {'pi': true, 'pi-dollar': true},
    eur: {'pi': true, 'pi-euro': true},
    btc: {'pi': true, 'pi-bitcoin': true},
}

export function getCurrentPeriod() {
    var year = new Date().getFullYear();
    var month = new Date().getMonth() + 1;
    var quarter = month <= 3 ? 1 : month <=6 ? 2 : month <=9 ? 3 : 4;
    return {year, month, quarter};
}

export function rowPendingSyncClass(data:any) {
    return data.to_sync ? 'bg-red-900': null;
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

export function increasePeriod(type: Period, period: any, value: number) {
    if (value === 0) {
        return period;
    }
    let diff, year, month;
    const current = getCurrentPeriod();
    switch(type) {
        case Period.Month:
            diff = parseInt(`${value/12}`);
            year = period.year + diff;
            month = period.month + (value % 12);
            if (month <= 0) {
                month = 12 + month;
                year = year - 1;
            }
            if (month > 12) {
                month = month - 12;
                year = year + 1;
            }
            return {year, month, quarter: 4};
        case Period.Quarter:
            diff = parseInt(`${value/4}`);
            year = period.year + diff;
            let quarter = period.quarter + (value % 4);
            if (quarter <= 0) {
                quarter = 4 + quarter;
                year = year - 1;
            }
            if (quarter > 4) {
                quarter = quarter - 4;
                year = year + 1;
            }
            return {
                year, 
                quarter, 
                month: current.year === year && quarter === current.quarter ? current.month : quarter * 3
            };
        case Period.Year:
            return { 
                year: period.year + value, 
                quarter: current.year === period.year + value ? current.quarter : 4, 
                month: current.year === period.year + value ? current.month : 12 
            };
    }
}

export function periodLabel(type: Period, period: any) {
    return `${period.year}` + (
        type === Period.Month ? ` / ${format.month(period.month)}` : 
        type === Period.Quarter ? ` / Q${period.quarter}` : '');
}

export function getPeriodDate(type: Period, period: any) {
    const current = getCurrentPeriod();
    var day = new Date().getDate();
    var month = period.month;
    var year = period.year;
    switch(type) {
        case Period.Year:
            if (year < current.year) {
                month = 12;
                day = 2;
            }
            break;
        case Period.Month:
            if (year < current.year || month < current.month) {
                day = 2;
            }
            break;
        case Period.Quarter:
            if (year < current.year || period.quarter < current.quarter) {
                month = period.quarter*3;
                day = 2;
            }
            break;
    }    

    return new Date( year, month -1, day );

}