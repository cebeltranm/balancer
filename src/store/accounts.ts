import {readJsonFile} from '@/helpers/files';
import {AccountGroupType, AccountType } from "@/types"

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
  [AccountGroupType.Investments]: [AccountType.Investment, AccountType.ETF],
  [AccountGroupType.Receivables]: [AccountType.Receivable],
  [AccountGroupType.Liabilities]: [ AccountType.CreditCard ],
  [AccountGroupType.Incomes]: [],
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
        return [AccountType.ETF].includes( state.accounts[id].type );
      },
      getAccountGroupType: ( state: any) => (id: string) => { 
        return state.accounts[id] && Object.keys(ACCOUNT_GROUP_TYPES).find( (k: string) => ACCOUNT_GROUP_TYPES[k].includes( state.accounts[id].type ))
      },
      activeAccounts: ( state: any) => (date: Date) => { 
        return Object.keys(state.accounts)
            .filter( (a: string) => (!state.accounts[a].activeFrom || state.accounts[a].activeFrom >= date) && 
                                (!state.accounts[a].hideSince || state.accounts[a].hideSince > date) )
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
      accountsGroupByCategories: (state: any, getters: any) => ( groupTypes? : AccountGroupType[], date: Date = new Date() )  => {
        return getters.activeAccounts( date )
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