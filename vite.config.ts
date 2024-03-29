import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa'
import { VitePWA } from 'vite-plugin-pwa';
// import EnvironmentPlugin from 'vite-plugin-environment';
import replace from '@rollup/plugin-replace';
// import vuetify from 'vite-plugin-vuetify'


const pwaOptions: Partial<VitePWAOptions> = {
  mode: 'development',
  includeAssets: ['favicon.svg','assets/primeicons.*'],
  registerType: 'autoUpdate',
  manifest: {
    name: 'Balancer',
    short_name: 'Balancer',
    theme_color: '#ffffff',
    icons: [
      {
        src: 'pwa-192x192.png', // <== don't add slash, for testing
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png', // <== don't remove slash, for testing
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: 'pwa-512x512.png', // <== don't add slash, for testing
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  },
  devOptions: {
    enabled: true,
    /* when using generateSW the PWA plugin will switch to classic */
    type: 'module',
    navigateFallback: 'index.html',
  },
  workbox: {
    cleanupOutdatedCaches: false,
    globPatterns: [
      "**/*.js",
      "**/*.css", 
      "**/*.html",
      "**/*.woff",
    ],
  }
}
const replaceOptions = { __DATE__: new Date().toISOString() }
const claims = false // process.env.CLAIMS === 'true'
const reload = true // process.env.RELOAD_SW === 'true'

// if (process.env.SW === 'true') {
  // pwaOptions.srcDir = 'src'
  // pwaOptions.filename = 'prompt-sw.ts'
  // pwaOptions.strategies = 'injectManifest'
  // ;(pwaOptions.manifest as Partial<ManifestOptions>).name = 'PWA Inject Manifest'
  // ;(pwaOptions.manifest as Partial<ManifestOptions>).short_name = 'PWA Inject'
// }


if (reload) {
  // @ts-expect-error overrides
  replaceOptions.__RELOAD_SW__ = 'true'
}


export default defineConfig({
  define: {
    'process.env': {}
  },
  plugins: [
    vue(),
    VitePWA(pwaOptions),
    // EnvironmentPlugin({NODE_ENV: 'development'}),
    replace(replaceOptions),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000
  }
})
