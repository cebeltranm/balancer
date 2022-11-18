<template>
  <div :class="{
        'layout-wrapper': true,
        'layout-static': true,
        'layout-static-sidebar-inactive': staticMenuInactive,
        'layout-mobile-sidebar-active': mobileMenuActive,
        'p-input-filled': $primevue.config.inputStyle === 'filled',
        'p-ripple-disabled': $primevue.config.ripple === false
      }"
      @click="onWrapperClick"
    >
      <AppTopbar  @menu-toggle="onMenuToggle"/>
      <div class="layout-sidebar" @click="onSidebarClick">
        <div class="layout-menu-container"> 
            <AppMenu :items="menu" :root="true" class="layout-menu"/>
        </div>
      </div>

      <div class="layout-main-container">
        <div class="layout-main">
            <router-view />
        </div>
      </div>
      <ConfirmPopup></ConfirmPopup>
      <Toast />
      <Auth ref="authDialog"></Auth>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, onMounted, provide } from 'vue'
  // import { initPWA } from '@/helpers/pwa';
  import { useStore } from 'vuex';
  import { isDesktop } from './helpers/browser';
  import { useToast } from "primevue/usetoast";
  import { EVENTS, CHECK_AUTHENTICATE } from '@/helpers/events';

  import AppTopbar from './layout/AppTopbar.vue';
  import AppMenu from './layout/AppMenu.vue';
  import Auth from '@/components/Auth.vue';
  import { Currency } from './types';

  const store = useStore();
  const toast = useToast();

  const authDialog = ref<InstanceType<typeof Auth> | null>(null);

  const CURRENCY = ref(Currency.COP);
  provide('CURRENCY', CURRENCY)

  // replaced dyanmicaly
  // const reloadSW: any = '__RELOAD_SW__'

  // const {
  //   offlineReady,
  //   needRefresh,
  //   updateServiceWorker,
  // } = initPWA();

  const menu = [
    {
        label: 'Home',
        items: [
          { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' },
          { label: 'Expenses', icon: 'pi pi-fw pi-shopping-cart', to: '/expenses' },
          { label: 'Assets', icon: 'pi pi-fw pi-credit-card', to: '/assets' },
          { label: 'Investments', icon: 'pi pi-fw pi-bars', to: '/investments' },
          { label: 'Transactions', icon: 'pi pi-fw pi-bars', to: '/transactions' },
          { label: 'Balance', icon: 'pi pi-fw pi-bars', to: '/balance' },
        ]
    },
    {
        label: 'Settings',
        items: [
          { label: 'Values', icon: 'pi pi-fw pi-cog', to: '/settings/values' },
          { label: 'Budget', icon: 'pi pi-fw pi-cog', to: '/settings/budget' },
          { label: 'General', icon: 'pi pi-fw pi-cog', to: '/' }
        ]
    },
  ]


  const mobileMenuActive = ref(false);
  const staticMenuInactive = ref(false);

  EVENTS.on('message', (msg:any) => {
    toast.add({
      severity: msg.severity || 'info', 
      summary: msg.summary || '', 
      detail: msg.message || '', 
      life: 3000
    });
  });

  EVENTS.on(CHECK_AUTHENTICATE, (msg:any) => {
    if (!store.state.storage.status.authenticated) {
      authDialog.value?.show();
    }
  });

  function onMenuToggle() {
    if (isDesktop()) {
        staticMenuInactive.value = !staticMenuInactive.value;
    }
    else {
        mobileMenuActive.value = !mobileMenuActive.value;
    }
  }

  function  onWrapperClick() {
    mobileMenuActive.value = false;
  }


  onMounted(() => {
    store.dispatch('storage/pendingToSync');
    setTimeout(async () => {
      // await store.dispatch('balance/recalculateBalance', { year: 2020, month: 1, save: true });
    }, 2000)
  })

</script>

<style lang="scss">
@import './assets/styles/index.scss';
</style>