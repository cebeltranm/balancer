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
      getLastTags(state: any) {
        const tags: string[] = [];
        var year = new Date().getFullYear();
        var month = new Date().getMonth() + 1;
        var steps = 0;
        while (steps < 3) {
          if (state.values && state.values[year] && state.values[year][month]) {
            state.values[year][month].filter(t => t.tags && t.tags.length > 0).forEach( (t) => {
              tags.push(...t.tags.filter( s => !tags.includes(s)));              
            })
          }
          steps++;
          year = month === 1 ? year - 1 : year;
          month = month === 1 ? 12 : month - 1;
        }
        return tags;
      }
    },
    actions: {
      async getTransactionsForMonth(context: any, {year, month, reload} ) {
        if ( !reload && context.state.values[ year ] && context.state.values[ year ][ month] ) {
            return context.state.values[ year ][ month].filter( t => !t.deleted);
        }
        var values = await readJsonFile(`transactions_${year}_${month}.json`, !reload);
        const pendingTransactions = await idb.getAllTransactions();
        if (pendingTransactions.length > 0 ) {
          const filtered = pendingTransactions.filter( t => new Date(`${t.date}T00:00:00.00`).getFullYear() === year && new Date(`${t.date}T00:00:00.00`).getMonth() + 1 === month ).map( t => ({...t, 'to_sync': true}));
          if (values) {
            values = values.filter( (t: any) => !pendingTransactions.find( t2 => t2.id === t.id) );
            values.push( ...filtered.filter( t  => !t.deleted) )
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
        await idb.saveTransaction(Object.keys(transaction).filter(key => key !== 'to_sync').reduce((obj: any, key) => {
          obj[key] = transaction[key];
          return obj;
        }, {}));
        context.dispatch('storage/pendingToSync', null, {root: true});
        context.dispatch('getTransactionsForMonth', {year: new Date(`${transaction.date}T00:00:00.00`).getFullYear(), month: new Date(`${transaction.date}T00:00:00.00`).getMonth() + 1, reload: true })
      },
      async deleteTransaction (context:any, transaction: Transaction) {
        await idb.saveTransaction({...transaction, deleted: true});
        context.dispatch('storage/pendingToSync', null, {root: true});
      }
    }
  };