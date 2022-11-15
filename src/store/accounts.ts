import {readJsonFile} from '@/helpers/files';
import {AccountGroupType, AccountType, Period } from "@/types"

function getCategoryEntry(group:any, category:string) {
  if (!group[category]) {
    group[category] = {
      name: category,
      type: 'Category',
      children: {}
    }
  }
  return group[category];
}

export const ACCOUNT_GROUP_TYPES = {
  [AccountGroupType.Assets]: [ AccountType.Cash, AccountType.BankAccount ],
  [AccountGroupType.FixedAssets]: [ AccountType.Property ],
  [AccountGroupType.Investments]: [AccountType.Investment, AccountType.ETF, AccountType.CD, AccountType.Stock, AccountType.MutualFund, AccountType.Crypto],
  [AccountGroupType.Receivables]: [AccountType.Receivable],
  [AccountGroupType.Liabilities]: [ AccountType.CreditCard, AccountType.Loan ],
  [AccountGroupType.Incomes]: [ AccountType.Income ],
  [AccountGroupType.Expenses]: [ AccountType.Expense ],
};

export default {
    namespaced: true,    
    state: {
      accounts: {},
    },
    mutations: {
      accounts (state: any, accounts: any) {
        state.accounts = accounts;
      }
    },
    getters: {
      isAccountInUnits: ( state: any) => (id: string) => { 
        return [AccountType.ETF, AccountType.Stock, AccountType.Crypto].includes( state.accounts[id].type );
      },
      getAccountGroupType: ( state: any) => (id: string) => { 
        return state.accounts[id] && Object.keys(ACCOUNT_GROUP_TYPES).find( (k: string) => ACCOUNT_GROUP_TYPES[k].includes( state.accounts[id].type ))
      },
      getAccountFullName: ( state: any) => (id: string) => { 
        const account = state.accounts[id];
        return account && `${account.entity? account.entity + ': ' : ''}${account.type}: ${account.category ? account.category.join(': ') + ': ' : '' }${account.name}`;
      },
      activeAccounts: ( state: any) => (date: Date, period: Period = Period.Month) => { 
        return Object.keys(state.accounts)
            .filter( (a: string) => {
              const fromYear = state.accounts[a].activeFrom && state.accounts[a].activeFrom.getFullYear();
              const fromMonth = state.accounts[a].activeFrom && (period === Period.Month ? state.accounts[a].activeFrom.getMonth() : 0);

              const toYear = state.accounts[a].hideSince && state.accounts[a].hideSince.getFullYear();
              const toMonth = state.accounts[a].hideSince && (period === Period.Month ? state.accounts[a].hideSince.getMonth() : 12);

              return (!fromYear || fromYear < date.getFullYear() || ( fromYear === date.getFullYear() && fromMonth <= date.getMonth() )) && 
                    (!toYear || toYear > date.getFullYear() || ( toYear === date.getFullYear() && toMonth > date.getMonth() ))
            })
            .map( (a: string) => state.accounts[a] );
      },
      expCategories(state: any) {
        return Object.keys(state.accounts)
        .filter( (id:string) => state.accounts[id].type === 'Expense' )
        .reduce( (ant:any, id:string) =>{
          const account = state.accounts[id];
          if (account.category && account.category.length > 0 ) {
            account.category.reduce( (group:any, c:string) => {
              return getCategoryEntry(group, c).children;
            }, ant );
          }
          return ant;
        },{});
      },
      accountsGroupByCategories: (state: any, getters: any) => ( groupTypes? : AccountGroupType[], date: Date = new Date(), period: Period = Period.Month )  => {
        return getters.activeAccounts( date, period )
           .filter( (account:any) => !groupTypes || groupTypes.includes(Object.keys(ACCOUNT_GROUP_TYPES).find( k => ACCOUNT_GROUP_TYPES[k].includes( account.type )) ))
           .reduce( (ant:any, account: any) => {

              const type = Object.keys(ACCOUNT_GROUP_TYPES).find( k => ACCOUNT_GROUP_TYPES[k].includes( account.type ));
              if (!ant[type]) {
                ant[type] = {}
              }

              if (account.category && account.category.length > 0 ) {
                const g = account.category.reduce( (group:any, c:string) => {
                  return getCategoryEntry(group, c).children;
                }, ant[type] );
                if (g[account.id]) {
                  g[account.id] = {
                    children: g[account.id].children,
                    ...account
                  };
                } else {
                  g[account.name] = {...account};
                }
              } else if ( ( account.entity && account.entity.trim() !== '' ) || account.type === AccountType.Expense ) {
                getCategoryEntry(ant[type], account.type === AccountType.Expense ? 'Others' : account.entity ).children[account.id] = {...account};
              } else {
                ant[type][account.id] = {...account};
              }
              return ant;
           }, {} );
      },
      accountsGroupByType: (state: any, getters: any) => ( groupTypes? : AccountGroupType[], date: Date = new Date(), period: Period = Period.Month )  => {
        return getters.activeAccounts( date, period )
           .filter( (account:any) => !groupTypes || groupTypes.includes(Object.keys(ACCOUNT_GROUP_TYPES).find( k => ACCOUNT_GROUP_TYPES[k].includes( account.type )) ))
           .reduce( (ant:any, account: any) => {

              if (!ant[account.type]) {
                ant[account.type] = {}
              }
              ant[account.type][account.id] = {...account};
              return ant;
           }, {} );
      },
      investmentsGroupByRisk: (state: any, getters: any) => ( date: Date = new Date(), period: Period = Period.Month )  => {
        return getters.activeAccounts( date, period )
           .filter( (account:any) => ACCOUNT_GROUP_TYPES[AccountGroupType.Investments].includes( account.type ))
           .reduce( (ant:any, account: any) => {
              if (!ant[account.risk || 3]) {
                ant[account.risk || 3] = {}
              }
              ant[account.risk || 3][account.id] = {...account};
              return ant;
           }, {} );
      },
      investmentsGroupByCurrency: (state: any, getters: any) => ( date: Date = new Date(), period: Period = Period.Month )  => {
        return getters.activeAccounts( date, period )
           .filter( (account:any) => ACCOUNT_GROUP_TYPES[AccountGroupType.Investments].includes( account.type ))
           .reduce( (ant:any, account: any) => {
              if (!ant[account.currency]) {
                ant[account.currency] = {}
              }
              ant[account.currency][account.id] = {...account};
              return ant;
           }, {} );
      },
      expensesByCategories(state: any) {
        return Object.keys(state.accounts)
          .filter( (id:string) => state.accounts[id].type === 'Expense' )
          .reduce( (ant:any, id:string) =>{
            const account = state.accounts[id];
            if (account.category && account.category.length > 0 ) {
              const g = account.category.reduce( (group:any, c:string) => {
                return getCategoryEntry(group, c).children;
              }, ant );
              if (g[account.name]) {
                g[account.name] = {
                  children: g[account.name].children,
                  ...account
                };
              } else {
                g[account.name] = {...account};
              }
            } else {
              getCategoryEntry(ant, 'Others').children[account.name] = {...account};
            }
            return ant;
          },{});  
      },
      listAccounts(state: any) {
        return Object.keys(state.accounts)
          .filter( (id:string) => state.accounts[id].type !== AccountType.Expense )
          .map ( (id:string) => {
            var type = state.accounts[id].entity || '';
            if (state.accounts[id].type === AccountType.Receivable) {
              type = 'Receivable';
            }
            return {
              id,
              name: `${type} / ${state.accounts[id].name}`,
              currency: state.accounts[id].currency,
            };
          } );
      },
      listExpenses(state: any) {
        return Object.keys(state.accounts)
          .filter( (id:string) => state.accounts[id].type === AccountType.Expense )
          .map ( (id:string) => {
            const account = state.accounts[id];
            const category = state.accounts[id].category.reduce( (ant: string, val: string) => `${ant} ${val}/`, '' );
            return {
              id,
              name: `${category} ${account.name}`,
              currency: state.accounts[id].currency
            };
          } );
      },
    },
    actions: {
      async getAccounts (context: any, reload: boolean) {
        if (!reload && context.state.accounts.length > 0){
          return context.state.accounts;
        }
        const accounts = await readJsonFile('accounts.json');
        Object.keys(accounts).forEach( (id: string) => {
          accounts[id].id = id;
        });
        const nAccounts = Object.keys(accounts).filter( id => id != 'default').reduce( (ant:any, id:string) => {
          ant[id] = {
            ...accounts[id],
            activeFrom: accounts[id].activeFrom  && new Date(accounts[id].activeFrom),
            hideSince: accounts[id].hideSince  && new Date(accounts[id].hideSince) ,
            id
          }
          return ant;
        }, {} );
        context.commit('accounts', nAccounts);
        return nAccounts;
      }
    }
  };