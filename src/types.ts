export interface Transaction {
  id?: number;
  date?: string;
  description: string;
  tags?: string[];
  values: {
    value?: number;
    accountId: string;
    accountValue?: number;
    units?: number;
  }[];
  deleted?: boolean;
  to_sync?: boolean;
}

export enum Period {
  Month,
  Quarter,
  Year,
}

export interface PeriodParams {
  year: number;
  month: number;
  quarter: number;
}

export interface PeriodOption {
  type: Period;
  value: PeriodParams;
}

export enum AccountType {
  Expense = "Expense",
  Income = "Income",
  Category = "Category",
  Cash = "Cash",
  CreditCard = "CreditCard",
  BankAccount = "BankAccount",
  AccountReceivable = "AccountReceivable",
  AccountPayable = "AccountPayable",
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
  AccountsReceivable = "AccountsReceivable",
  Liabilities = "Liabilities",
  Incomes = "Incomes",
}

export enum Currency {
  COP = "cop",
  USD = "usd",
  EUR = "eur",
  BTC = "btc",
}

export enum StockApiType {
  RapidApi = "rapidapi",
  MarketStack = "marketstack",
  AlphaVantage = "alphavantage",
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  category?: string[];
  entity?: string;
  activeFrom?: Date;
  hideSince?: Date;
  symbol?: string;
  logo?: string;
  risk?: number;
  class?: Record<string, Record<string, number>>;
}

export enum AssetClass {
  Equities = "Equities",
  FixedIncome = "FixedIncome",
  Cash = "Cash",
  RealEstate = "RealEstate",
  Alternative = "Alternative",
}

export const ASSET_CLASS_OPTIONS = Object.values(AssetClass);

export enum GeographicExposure {
  US = "US",
  Europe = "Europe",
  Asia = "Asia",
  Latam = "Latam",
}

export const GEOGRAPHIC_EXPOSURE_OPTIONS = Object.values(GeographicExposure);

export interface BalanceEntry {
  value: number;
  expenses: number;
  in: number;
  out: number;
  in_local: number;
  out_local: number;
  units: number;
}
