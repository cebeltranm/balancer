<template>
    <Dialog v-model:visible="visible" header="Authentication" :closable="localCredentials" :modal="true" class="p-fluid">
      <div>
        <template v-if="storeInfo?.loggedIn" >
            <span v-if="storeInfo.type === 'HttpServer'">
              Logged In to {{ storeInfo.url }}
            </span>
            <span v-if="storeInfo.type === 'Dropbox'">
              Logged In to Dropbox
            </span>
        </template>
        <template v-else>
          <Button label="Logged In" @click="doLoginStore"/>
        </template>
      </div>
      <Divider />
      <div>
        <Button  v-if="localCredentials && !isAuthenticated"  label="Authenticate with credentials" @click="authenticate"/>
        <Button v-else-if="!isAuthenticated" :disabled="!storeInfo?.loggedIn" label="Register Credentials" @click="register"/>
        <span v-else> Authenticated </span>
      </div>
    </Dialog>
</template>
<script lang="ts" setup>
import { ref, onMounted, computed } from "vue";
import { getStorage } from '@/helpers/storage';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from "vuex";
import * as files from '@/helpers/files';
import * as sync from '@/helpers/sync';
import { timeout } from "workbox-core/_private";

const visible = ref(false);
const storeInfo = ref();
const localCredentials = ref(false);

const bufferToBase64 = (buffer: any) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = (base64: any) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

const store = useStore();
const route = useRoute();
const router = useRouter();


const isAuthenticated = computed(() => store.state.storage.status.authenticated);

function show() {
  visible.value = true;
  if (storeInfo.value?.loggedIn && localCredentials.value && !isAuthenticated.value) {
    authenticate();
  }
}

defineExpose({
  show
})

onMounted(async () => {
  const storage = getStorage();
  storeInfo.value = await storage.getInfo()
  localCredentials.value = !!localStorage.getItem('crlocal');

  store.dispatch('storage/setStatus', {loggedIn: storeInfo.value.loggedIn, offline: storeInfo.value.offline} );
  if (storeInfo.value.loggedIn) {
    loadBasicFiles();
  }
  if (storeInfo.value.loggedIn && !storeInfo.value.offline) {
    setTimeout( () => syncCachedFiles(), 200);
  }
  if (storeInfo.value.type === 'Dropbox' && route.query.code) {
    doLoginStore();
  }

  if(!storeInfo.value.loggedIn || !localCredentials.value) {
    visible.value = true;
  }

  if (storeInfo.value.loggedIn && storeInfo.value.type === 'HttpServer') {
    store.dispatch('storage/setAuthenticated', true)
    visible.value = false;
  }
  if (storeInfo.value?.loggedIn && localCredentials.value && !isAuthenticated.value && visible.value) {
    authenticate();
  }

});

function register(){
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 32; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  const utf8Encode = new TextEncoder();

  var publicKey = {
    challenge: new Uint8Array(utf8Encode.encode(text)),
    rp: { name: "Balancer" },
    user: {
      id: Uint8Array.from(
        window.atob("MIIBkzCCATigAwIBAjCCAZMwggE4oAMCAQIwggGTMII="),
        c => c.charCodeAt(0)
      ),
      name: "Tester",
      displayName: "Tester"
    },
    pubKeyCredParams: [ 
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 }
    ],
    authenticatorSelection: {
      userVerification: "preferred"
    },
    timeout: 360000, 
    excludeCredentials: [], 
    extensions: { loc: true } 
  };
  navigator.credentials
    .create({ publicKey })
    .then((credential: any) => {
      localStorage.setItem('crlocal', JSON.stringify({
        id: bufferToBase64(credential.rawId),
        challenge: bufferToBase64(utf8Encode.encode(text)),
      }));
      localCredentials.value = !!localStorage.getItem('crlocal');
    })
    .catch(function(err) {
      console.log(err);
    });
}

async function authenticate() {
  const storedAuth = JSON.parse( localStorage.getItem('crlocal') );
  const publicKey = {
    challenge: new Uint8Array( base64ToBuffer(storedAuth.challenge) ),
    allowCredentials: [
      {
        id: base64ToBuffer(storedAuth.id),
        type: 'public-key',
        transports: ['internal']
      }
    ]
  };
  const credential = await navigator.credentials.get({ publicKey });
  if (credential) {
    await store.dispatch('storage/setAuthenticated', true)
    visible.value = false;
  }  
}

async function doLoginStore(){
  const storage = getStorage();
  await storage.doAuth(route.query.code);
  if (route.query.code) {
      router.replace({'query': null});
  }
  storeInfo.value = await storage.getInfo();
  await checkStore();
  store.dispatch('storage/setStatus', {loggedIn: true, offline: false} );
  await loadBasicFiles();
  setTimeout(() => syncCachedFiles(), 5000);
}

async function checkStore() {
    var accounts = await files.readJsonFile('accounts.json', false);
    if(!accounts) {
        accounts = await fetch('./accounts.json');
        await files.writeJsonFile('accounts.json', await accounts.json());
    }
}

async function syncCachedFiles() {
    try {
        store.commit('storage/inSync', true);
        const storage = getStorage();
        const listFiles = (await storage.listFiles()).reduce( (acc: any, e: any) => {
          acc[e.name] = e.lastModified;
          return acc;
        }, {})

        const cached = await sync.getAllFilesInCache(); 
        Object.keys(cached).forEach(async (e) => {
          if (listFiles[e] &&  listFiles[e] > cached[e]) {
            const fileNameData = e.split('.')[0].split('_');
            switch(fileNameData[0]) {
              case 'accounts':
                  await files.readJsonFile(e, false);
                  store.dispatch('accounts/getAccounts', true)
                break;
              case 'config':
                store.dispatch('config/getConfig', true)
                break;
              case 'transactions':
                  await files.readJsonFile(e, false);
                  store.dispatch('transactions/getTransactionsForMonth', {year: fileNameData[1], month: fileNameData[2], reload: true})
                break;
              case 'values':
                  await files.readJsonFile(e, false);
                  store.dispatch('values/getValuesForYear', { year: fileNameData[1], reload: true })
                break;
              case 'budget':
                  await files.readJsonFile(e, false);
                  store.dispatch('budget/getBudgetForYear', { year: fileNameData[1], reload: true })
                break;
              case 'balance':
                  await files.readJsonFile(e, false);
                  store.dispatch('balance/getBalanceForYear', { year: fileNameData[1], reload: true })
                break;
              default:
                console.log('Needs to reload the file: ', e);
            }            
          }
        });
    } finally {
        store.commit('storage/inSync', false);
    }  
}

async function loadBasicFiles() {
    store.dispatch('accounts/getAccounts');
    store.dispatch('config/getConfig');
    const date = new Date();
    [date.getFullYear() , date.getFullYear() - 1].forEach( (year) => {
        store.dispatch('values/getValuesForYear', {year });
        store.dispatch('balance/getBalanceForYear', {year });
        store.dispatch('budget/getBudgetForYear', {year });
    })

    for(var i = 0; i < 3; i++) {
        store.dispatch('transactions/getTransactionsForMonth', {year: date.getFullYear(), month: date.getMonth() + 1});
        date.setMonth( date.getMonth() - 1);
    }    
}

</script>
