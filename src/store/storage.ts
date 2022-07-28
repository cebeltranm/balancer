import * as idb from '../helpers/idb';
import bounced from 'lodash-es/debounce';
import * as sync from '../helpers/sync';

const syncAll = bounced(async (context:any)=> {
  await sync.syncTransactions();
  await context.dispatch('pendingToSync');
  context.commit('inSync', false);
}, 5000);

export default {
    namespaced: true,    
    state: {
      used: 0,
      pendingToSync: {
        transactions: 0
      },
      inSync: false
    },
    mutations: {
      used (state: any, used: number) {
        state.used = used;
      },
      pendingToSync (state: any, pendingToSync: any) {
        state.pendingToSync = pendingToSync;
      },
      inSync (state: any, inSync: any) {
        state.inSync = inSync;
      }
    },
    getters: {
      isPendingToSync(state: any) {
        return state.pendingToSync.transactions > 0
      }
    },
    actions: {
      async calculateStorage (context: any) {
        if (navigator.storage && navigator.storage.estimate) {
            const quota = await navigator.storage.estimate();
            if (quota && quota.usage && quota.quota) {
                const used = Math.trunc((quota.usage / quota.quota) * 100);
                context.commit('used', used);
            }
        }
      },
      async pendingToSync(context: any) {
        const transactions = await idb.countTransactions();
        context.commit('pendingToSync', {
          transactions
        });
        if (transactions) {
          context.dispatch('sync');
        }
      },
      async sync(context: any) {
        context.commit('inSync', true);
        syncAll(context);
      }
    }
  };