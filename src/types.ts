export interface Account {
    id: string;
    name: string;
    description?: string;
    value?: number;
    currency?: string;
    budget?: number;
}

export interface Transaction {
    id?: number;
    date: string;
    description: string;
    values: [{
        value?: number;
        accountId: string;
        accountValue?: number;
    }];
}

export enum Period {
    Month,
    Quarter,
    Year
}

export enum AccountType {
    Expenses = "Expenses",
}