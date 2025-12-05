import { Period, type PeriodParams } from '@/types';

function getMonthsForPeriod(type: Period, month: number, quarter: number): number[] {
    switch (type) {
        case Period.Month:
            return [month];
        case Period.Quarter:
            return [quarter * 3 - 2, quarter * 3 - 1, quarter * 3];
        case Period.Year:
            return Array.from({ length: 12 }, (_, index) => index + 1);
        default:
            return [month];
    }
}

function updatePeriodParams(type: Period, params: PeriodParams): PeriodParams {
    const { year, month, quarter } = params;

    switch (type) {
        case Period.Month:
            return {
                year: month === 1 ? year - 1 : year,
                month: month === 1 ? 12 : month - 1,
                quarter
            };
        case Period.Quarter:
            return {
                year: quarter === 1 ? year - 1 : year,
                quarter: quarter === 1 ? 4 : quarter - 1,
                month
            };
        case Period.Year:
            return {
                year: year - 1,
                month,
                quarter
            };
        default:
            return params;
    }
}

export function groupDataByPeriods<T>(
    type: Period, numPeriods: number, params: PeriodParams,
    ids: string[],
    accumulateFn: (id: string, year: number,months: number[]) => T
): Record<string, T[]> {
    const groupedData: Record<string, T[]> = ids.reduce((result, id) => {
        result[id] = [];
        return result;
    }, {} as Record<string, T[]>);

    let currentParams = { ...params };
    
    for (var period = 1; period <= numPeriods; period++) {
        var months = getMonthsForPeriod(type, currentParams.month, currentParams.quarter);
        ids.forEach((id: string) => {
            groupedData[id]?.push(accumulateFn(id, currentParams.year, months));
        });
        currentParams = updatePeriodParams(type, currentParams);
    }

    return groupedData;
}