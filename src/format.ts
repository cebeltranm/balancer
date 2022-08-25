

export default {
    currency: (value:any, currency:any) => {
        if (typeof value !== "number") {
            return value;
        }
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        });
        return formatter.format(value);
    },
    percent: (value:any) => {
        if (typeof value !== "number") {
            return value;
        }
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'percent',
            maximumFractionDigits: 2,
        });
        return formatter.format(value);
    }, 
    date: (value: any) => {
        var date = value;
        if (typeof value === "string") {
            date = new Date(`${value}T00:00:00.00`);
        }
        return new Intl.DateTimeFormat('en-US').format(date);
    },
    month: (value: number) => {
        var date = new Date();
        date.setMonth(value - 1);
        return date.toLocaleString('default', { month: 'long' });        
    },
}
