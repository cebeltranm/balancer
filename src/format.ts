

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
    date: (value: any) => {
        var date = value;
        if (typeof value !== "number") {
            date = new Date(value);
        }
        return new Intl.DateTimeFormat('en-US').format(date);
    },
    month: (value: number) => {
        var date = new Date();
        date.setMonth(value - 1);
        return date.toLocaleString('default', { month: 'long' });        
    },
}
