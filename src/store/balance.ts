import {readJsonFile} from '@/helpers/files';

export default {
    namespaced: true,    
    state: {
      balance: {},
    },
    mutations: {
      balance (state: any, {year, balance}) {
            state.balance[year] = balance;
        }
    },
    getters: {
    },
    actions: {
      async getBalanceForYear (context: any, {year, reload }) {
        if (!reload && context.state.balance[ year ]) {
          return context.state.balance[ year ];
        }
        const balance = await readJsonFile(`balancet_${year}.json`);
        context.commit('balance', {year, balance});
  
        return balance;
      }
    }
  };