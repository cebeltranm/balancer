export interface Transaction {
    id?: number;
    date: string;
    description: string;
    tags?: string[],
    values: [{
        value?: number;
        accountId: string;
        accountValue?: number;
        units?: number;
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
    Income = "Income",
    Category = "Category",
    Cash = "Cash",
    CreditCard = "CreditCard",
    BankAccount = "BankAccount",
    Receivable = "Receivable",
    Investment = "Investment",
    ETF = "ETF",
    Stock = "Stock",
    CD = "CD",
    Crypto = "Crypto",
    Loan = "Loan",
    Property = "Property",
    OpenBalance = "OpenBalance",
    MutualFund = "MutualFund",
}

export enum AccountGroupType {
    Expenses = "Expenses",
    Assets = "Assets",
    FixedAssets = "FixedAssets",
    Investments = "Investments",
    Receivables = "Receivables",
    Liabilities = "Liabilities",
    Incomes = "Incomes",
}

export enum Currency {
    COP = "cop",
    USD = "usd",
    EUR = "eur",
    BTC = "btc",
}

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    currency: string;
    category: string[];
    entity?: string;
    activeFrom?: string;
    hideSince?: string;
}
