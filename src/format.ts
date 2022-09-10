import { Currency } from "./types";


export default {
    number: (value:any, decimals:number = 10) => {
        if (typeof value !== "number") {
            return value;
        }
        var formatter = new Intl.NumberFormat('en-US', {
            maximumSignificantDigits: decimals,
        });
        return formatter.format(value);
    },
    currency: (value:any, currency:any) => {
        if (typeof value !== "number") {
            return value;
        }
        var formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumSignificantDigits: currency === Currency.BTC ? 10 : undefined,
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
