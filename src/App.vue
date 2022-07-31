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
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, onMounted } from 'vue'
  import { initPWA } from '@/helpers/pwa';
  import { useStore } from 'vuex';
  import { isDesktop } from './helpers/browser';
  import { checkAuth } from './helpers/auth';
  // import * as dropbox from './helpers/dropbox';

  import AppTopbar from './layout/AppTopbar.vue';
  import AppMenu from './layout/AppMenu.vue';

  const store = useStore();

  // replaced dyanmicaly
  // const reloadSW: any = '__RELOAD_SW__'

  const {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  } = initPWA();

  checkAuth();
  
  // const storagePerc = storagePercentage();

  // const drawer = ref(true);

  // const storagUsed = computed(() => store.state.storage.used);


  const menu = [
    {
        label: 'Home',
        items: [{
            label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/'
        }]
    },
    {
        label: 'Settings',
        items: [{
            label: 'General', icon: 'pi pi-fw pi-cog', to: '/'
        }]
    },
  ]


  const mobileMenuActive = ref(false);
  const staticMenuInactive = ref(false);

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
  })

</script>

<style lang="scss">
@import './assets/styles/index.scss';
</style>