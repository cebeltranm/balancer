/// <reference types="vite/client" />

import "vue";

declare global {
  interface Window {
    google: any;
  }
}

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $format: any;
    $confirm: any;
  }
}

declare module "vuetify";
declare module "vuetify/iconsets/md";

export {};
