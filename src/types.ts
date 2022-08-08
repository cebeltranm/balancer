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
    deleted?: boolean
}

export enum Period {
    Month,
    Quarter,
    Year
}

export enum AccountType {
    Expense = "Expense",
    Category = "Category",
    Cash = "Cash",
    CreditCard = "CreditCard",
}

export enum AccountGroupType {
    Expenses = "Expenses",
    Assets = "Assets",
    Investments = "Investments",
    Receivables = "Receivables",
    Liabilities = "Liabilities",
    Incomes = "Incomes",
}