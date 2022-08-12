import * as idb from '../helpers/idb';
import bounced from 'lodash-es/debounce';
import * as sync from '../helpers/sync';

const syncAll = bounced(async (context:any)=> {
  try {
    context.commit('inSync', true);
    const trans = await sync.syncTransactions();
    if (trans) {
      await Promise.all(trans.map( t => {
        return context.dispatch('transactions/getTransactionsForMonth', {year: t.year, month: t.month, reload: true}, { root: true })
      }));
  
      const firstMonth = trans.reduce( 
        (ant: any, t: any) =>  ant.year < t.year || ant.month < t.month ? ant : t , 
        { year: new Date().getFullYear(), month: new Date().getMonth() + 1});
      
      await context.dispatch('balance/recalculateBalance', { year: firstMonth.year, month: firstMonth.month, save: true }, { root: true })
    }
    await sync.syncFiles();
  } finally {
    context.commit('inSync', false);
    await context.dispatch('pendingToSync');
  }
}, 5000);

export default {
    namespaced: true,    
    state: {
      used: 0,
      pendingToSync: {
        transactions: 0,
        files: 0,
      },
      status: {
        inSync: false,
        offline: false,
        loggedIn: false,
      },
    },
    mutations: {
      used (state: any, used: number) {
        state.used = used;
      },
      pendingToSync (state: any, pendingToSync: any) {
        state.pendingToSync = pendingToSync;
      },
      inSync (state: any, inSync: any) {
        state.status.inSync = inSync;
      },
      status (state: any,  {loggedIn, offline} ) {
        state.status.loggedIn = loggedIn;
        state.status.offline = offline;
      }
    },
    getters: {
      isPendingToSync(state: any) {
        return state.pendingToSync.transactions > 0 || state.pendingToSync.files > 0
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
        const files = await idb.countFilesToSync();

        if ( (context.state.pendingToSync.transactions !== transactions && transactions) || 
          (context.state.pendingToSync.files !== files && files)) {
          context.dispatch('sync');
        }
        context.commit('pendingToSync', {
          transactions,
          files
        });
      },
      async sync(context: any) {
        if (!context.state.status.offline) {
          context.commit('inSync', true);
          syncAll(context);
        }
      },
      async setStatus(context: any, {loggedIn, offline}) {
        context.commit('status', { loggedIn, offline } );
      },
    }
  };