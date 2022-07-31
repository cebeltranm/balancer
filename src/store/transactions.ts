import type { Transaction } from '@/types';
import * as idb from '../helpers/idb';
import {readJsonFile} from '@/helpers/files';

export default {
    namespaced: true,    
    state: {
      values: {},
    },
    mutations: {
      values (state: any, {year, month, values}) {
        if (!state.values[year]) {
          state.values[year] = {}
        }
        state.values[year][month] = values;
      } 
    },
    getters: {
    },
    actions: {
      async getTransactionsForMonth(context: any, {year, month, reload} ) {
        if ( !reload && context.state.values[ year ] && context.state.values[ year ][ month] ) {
            return context.state.values[ year ][ month];
        }
        var values = await readJsonFile(`transactions_${year}_${month}.json`);
        const pendingTransactions = await idb.getAllTransactions();
        if (pendingTransactions.length > 0 ) {
          const filtered = pendingTransactions.filter( t => new Date(t.date).getFullYear() === year && new Date(t.date).getMonth() + 1 === month ).map( t => ({...t, 'to_sync': true}));
          if (values) {
            values = values.filter( (t: any) => !pendingTransactions.find( t2 => t2.id === t.id) );
            values.push( ...filtered )
          } else {
            values = filtered;
          }
        }
        
        if (values) {
          values.sort((a, b) => b.date.localeCompare(a.date) )
          context.commit('values', {year, month, values});
        }
        return values;
      },
      async saveTransaction (context:any, transaction: Transaction) {
        await idb.saveTransaction(transaction);
        context.dispatch('getTransactionsForMonth', {year: new Date(transaction.date).getFullYear(), month: new Date(transaction.date).getMonth() + 1, reload: true })
      },
    }
  };