import {readJsonFile} from '@/helpers/files';

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
      accountsGroupedByTypes(state: any) {
        return Object.keys(state.accounts)
          .filter( (id:string) => ['cash'].includes( state.accounts[id].type ))
          .reduce( (ant: any, id:string) => {
            if (!ant[ state.accounts[id].type ] ) {
              ant[ state.accounts[id].type ] = [];
            }
            ant[ state.accounts[id].type ].push( state.accounts[id] );
            return ant;
          }, {});
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
          .filter( (id:string) => state.accounts[id].type !== 'Expense' )
          .map ( (id:string) => {
            return {
              id,
              name: `${state.accounts[id].entity} / ${state.accounts[id].name}`,
              currency: state.accounts[id].currency
            };
          } );
      },
      listExpenses(state: any) {
        return Object.keys(state.accounts)
          .filter( (id:string) => state.accounts[id].type === 'Expense' )
          .map ( (id:string) => {
            const account = state.accounts[id];
            const category = state.accounts[id].category.reduce( (ant: string, val: string) => `${ant} ${val}/`, '' );
            return {
              id,
              name: `${category} ${account.name}`,
              currency: state.accounts[id].currency
            };
          } );
      }
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
            id
          }
          return ant;
        }, {} );
        context.commit('accounts', nAccounts);
        return nAccounts;
      }
    }
  };