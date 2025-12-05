<template>
  <Dialog v-model:visible="visible" header="Authentication" :closable="localCredentials" :modal="true" class="p-fluid">
    <div>
      <template v-if="storeInfo?.loggedIn">
        <span v-if="storeInfo.type === 'HttpServer'">
          Logged In to {{ storeInfo.url }}
        </span>
        <span v-if="storeInfo.type === 'Dropbox'">
          Logged In to Dropbox
        </span>
      </template>
      <template v-else>
        <Button label="Logged In" @click="doLoginStore" />
      </template>
    </div>
    <Divider />
    <div>
      <Button v-if="localCredentials && !storageStore.status.authenticated" label="Authenticate with credentials"
        @click="authenticate" />
      <Button v-else-if="!storageStore.status.authenticated" :disabled="!storeInfo?.loggedIn"
        label="Register Credentials" @click="register" />
      <span v-else> Authenticated </span>
    </div>
  </Dialog>
</template>
<script lang="ts" setup>
import { ref, onMounted, computed } from "vue";
import { getStorage } from '@/helpers/storage';
import { useRoute, useRouter } from 'vue-router';
import * as files from '@/helpers/files';
import * as sync from '@/helpers/sync';
import { useStorageStore } from '@/stores/storage';
import { useAccountsStore } from '@/stores/accounts';
import { useConfigStore } from '@/stores/config';
import { useValuesStore } from '@/stores/values';
import { useBalanceStore } from '@/stores/balance';
import { useBudgetStore } from '@/stores/budget';
import { useTransactionsStore } from '@/stores/transactions';
import { Period } from '@/types';

const visible = ref(false);
const storeInfo = ref();
const localCredentials = ref(false);

const bufferToBase64 = (buffer: any) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuffer = (base64: any) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

const storageStore = useStorageStore();
const accountsStore = useAccountsStore();
const configStore = useConfigStore();
const valuesStore = useValuesStore();
const balanceStore = useBalanceStore();
const budgetStore = useBudgetStore();
const transactionsStore = useTransactionsStore();
const route = useRoute();
const router = useRouter();



function show() {
  visible.value = true;
  if (storeInfo.value?.loggedIn && localCredentials.value && !storageStore.status.authenticated) {
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
  storageStore.status.loggedIn = storeInfo.value.loggedIn;
  storageStore.status.offline = storeInfo.value.offline;
  if (storeInfo.value.loggedIn) {
    loadBasicFiles();
  }
  if (storeInfo.value.loggedIn && !storeInfo.value.offline) {
    setTimeout(() => syncCachedFiles(), 200);
  }
  if (storeInfo.value.type === 'Dropbox' && route.query.code) {
    doLoginStore();
  }

  if (!storeInfo.value.loggedIn || !localCredentials.value) {
    visible.value = true;
  }

  if (storeInfo.value.loggedIn && storeInfo.value.type === 'HttpServer') {
    storageStore.status.authenticated = true;
    visible.value = false;
  }
  if (storeInfo.value?.loggedIn && localCredentials.value && !storageStore.status.authenticated && visible.value) {
    authenticate();
  }

});

function register() {
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
    .catch(function (err) {
      console.log(err);
    });
}

async function authenticate() {
  const storedAuth = JSON.parse(localStorage.getItem('crlocal'));
  const publicKey = {
    challenge: new Uint8Array(base64ToBuffer(storedAuth.challenge)),
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
    storageStore.status.authenticated = true;
    visible.value = false;
  }
}

async function doLoginStore() {
  const storage = getStorage();
  await storage.doAuth(route.query.code);
  if (route.query.code) {
    router.replace({ 'query': null });
  }
  storeInfo.value = await storage.getInfo();
  await checkStore();
  storageStore.status.loggedIn = true;
  storageStore.status.offline = false;
  await loadBasicFiles();
  setTimeout(() => syncCachedFiles(), 5000);
}

async function checkStore() {
  var accounts = await files.readJsonFile('accounts.json', false);
  if (!accounts) {
    accounts = await fetch('./accounts.json');
    await files.writeJsonFile('accounts.json', await accounts.json());
  }
}


async function syncCachedFiles() {
  storageStore.executeInSync((async () => {
    const storage = getStorage();
    const listFiles = (await storage.listFiles()).reduce((acc: any, e: any) => {
      acc[e.name] = e.lastModified;
      return acc;
    }, {})

    const cached = await sync.getAllFilesInCache();
    Object.keys(cached).forEach(async (e: string) => {
      if (listFiles[e] && listFiles[e] > cached[e]) {
        const fileNameData = e.split('.')[0].split('_');
        switch (fileNameData[0]) {
          case 'accounts':
            await files.readJsonFile(e, false);
            accountsStore.loadAccounts(true);
            break;
          case 'config':
            configStore.loadConfig(true);
            break;
          case 'transactions':
            await files.readJsonFile(e, false);
            transactionsStore.loadTransactionsForMonth(fileNameData[1], fileNameData[2], true);
            break;
          case 'values':
            await files.readJsonFile(e, false);
            valuesStore.loadValuesForYear(fileNameData[1], true);
            break;
          case 'budget':
            await files.readJsonFile(e, false);
            budgetStore.loadBudgetForYear(fileNameData[1], true);
            break;
          case 'balance':
            await files.readJsonFile(e, false);
            balanceStore.loadBalanceForYear(fileNameData[1], true);
            break;
          default:
            console.log('Needs to reload the file: ', e);
        }
      }
    });
  })());
}

async function loadBasicFiles() {
  accountsStore.loadAccounts(false);
  configStore.loadConfig(false);
  const date = new Date();
  [date.getFullYear(), date.getFullYear() - 1].forEach((year) => {
    valuesStore.loadValuesForYear(year, false);
    balanceStore.loadBalanceForYear(year, false);
    budgetStore.loadBudgetForYear(year, false);
  })

  for (var i = 0; i < 3; i++) {
    transactionsStore.loadTransactionsForMonth(date.getFullYear(), date.getMonth() + 1, false);
    date.setMonth(date.getMonth() - 1);
  }
}

</script>
