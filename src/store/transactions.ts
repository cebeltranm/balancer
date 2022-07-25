import type { Transaction } from '@/types';
import * as idb from './idb';

export default {
    namespaced: true,    
    state: {
      
    },
    mutations: {
     
    },
    getters: {

    },
    actions: {
      async saveTransaction ({commit}, transaction: Transaction) {
        return idb.saveTransaction(transaction);
      }
    }
  };