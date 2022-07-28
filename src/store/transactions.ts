import type { Transaction } from '@/types';
import * as idb from '../helpers/idb';
import {readJsonFile} from '@/helpers/files';

export default {
    namespaced: true,    
    state: {
      values: {},
    },
    mutations: {
      values (state: any, {year, values}) {
        state.values[year] = values;
      } 
    },
    getters: {
    },
    actions: {
      async getTransactionsForYear(context: any, year: number ) {
        if (context.state.values[ year ]) {
            return context.state.values[ year ];
        }
        const values = await readJsonFile(`transactions_${year}.json`);
        context.commit('values', {year, values:values});
  
        return context.state.values[ year ];
      },
      async saveTransaction ({commit}, transaction: Transaction) {
        return idb.saveTransaction(transaction);
      },
    }
  };