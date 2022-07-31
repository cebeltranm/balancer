import { useRoute, useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { getStorage } from './storage';
import { useStore } from 'vuex';
import * as files from './files';
import * as sync from './sync';
import { timeout } from 'workbox-core/_private';

export function checkAuth() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();

    async function checkStore() {
        var accounts = await files.readJsonFile('accounts.json', false);
        if(!accounts) {
            accounts = await fetch('./accounts.json');
            await files.writeJsonFile('accounts.json', await accounts.json());
        }
    }

    async function loadBasicFiles() {
        store.dispatch('accounts/loadAccounts');
        const date = new Date();
        store.dispatch('values/getValuesForYear', {year: date.getFullYear()});
        store.dispatch('values/getValuesForYear', {year: date.getFullYear() - 1});

        for(var i = 0; i < 3; i++) {
            store.dispatch('transactions/getTransactionsForMonth', {year: date.getFullYear(), month: date.getMonth() + 1});
            date.setMonth( date.getMonth() - 1);
        }    
    }
    async function syncCachedFiles() {
        try {
            store.commit('storage/inSync', true);
            await sync.syncCachedFiles((file:string) => {
              const fileNameData = file.split('.')[0].split('_');
              switch(fileNameData[0]) {
                case 'accounts':
                    store.dispatch('accounts/loadAccounts')
                  break;
                case 'transactions':
                    store.dispatch('transactions/getTransactionsForMonth', {year: fileNameData[1], month: fileNameData[2], reload: true})
                  break;
                case 'values':
                    store.dispatch('values/getValuesForYear', { year: fileNameData[1], reload: true })
                  break;
                case 'budget':
                    store.dispatch('budget/getBudgetForYear', { year: fileNameData[1], reload: true })
                  break;
                case 'balance':
                    store.dispatch('balance/getBalanceForYear', { year: fileNameData[1], reload: true })
                  break;
                default:
                  console.log('Needs to reload the file: ', file);
              }
            });
        } finally {
            store.commit('storage/inSync', false);
        }  
      }

    onMounted(async () => {
        const storage = getStorage();
        const isLoggedIn = await storage.isLoggedIn();
        if (isLoggedIn === false ) {
            setTimeout(async () => {
                await storage.doAuth(route.query.code);
                if (route.query.code) {
                    router.replace({'query': null});
                }
                await checkStore();
                store.dispatch('storage/setStatus', {loggedIn: true, offline: false} );
                await loadBasicFiles();
                setTimeout(() => syncCachedFiles(), 5000);
            }, 1000);
        } else if (isLoggedIn) {
            await loadBasicFiles();
            setTimeout(() => syncCachedFiles(), 5000);
            store.dispatch('storage/setStatus', {loggedIn: true, offline: false} )
        } else {
            await loadBasicFiles();
            store.dispatch('storage/setStatus', {loggedIn: true, offline: true} )
        }
    })
};