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


  <!-- <v-app>
  <v-layout>
    <v-app-bar
        color="ligth"
        density="compact"
        prominent
      >

       <v-app-bar-nav-icon variant="text" @click.stop="drawer = !drawer"></v-app-bar-nav-icon>

        <v-app-bar-title>Test</v-app-bar-title>

        <template v-slot:append>
          <v-btn 
            icon="mdi-arrow-down-bold-circle"
            color="primary"
            @click="updateServiceWorker()"
            v-if='needRefresh'
          ></v-btn>

          <v-progress-circular
            :rotate="360"
            :model-value="storagUsed"
            :color="offlineReady ? 'green' : 'red'"
          >
            {{ storagUsed }}
          </v-progress-circular>
        </template>


    </v-app-bar>
    <v-navigation-drawer v-model="drawer" 
        bottom
        temporary
    ></v-navigation-drawer>
    <v-main >
      <router-view/>
    </v-main>
  </v-layout>
  </v-app> -->
</template>

<script lang="ts" setup>
  import { computed, ref, onMounted } from 'vue'
  import { initPWA } from '@/helpers/pwa';
  import { useStore } from 'vuex';
  import { isDesktop } from './helpers/browser';

  import AppTopbar from './layout/AppTopbar.vue';
  import AppMenu from './layout/AppMenu.vue';

  const store = useStore();

  // replaced dyanmicaly
  const reloadSW: any = '__RELOAD_SW__'

  const {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  } = initPWA();
  
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
  ]


  const mobileMenuActive = ref(false);
  const staticMenuInactive = ref(false);

  function onMenuToggle() {
    console.log('onMenuToggle');
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
    store.dispatch('storage/calculateStorage');
    store.dispatch('accounts/loadAccounts');
  })

</script>

<style lang="scss">
@import './assets/styles/index.scss';
</style>