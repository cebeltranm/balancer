import { useRegisterSW } from 'virtual:pwa-register/vue'
// replaced dyanmicaly
const reloadSW: any = '__RELOAD_SW__'

export function initPWA() {
    return useRegisterSW({
        immediate: true,
        onRegistered(r) {
          if (reloadSW === 'true') {
              r && setInterval(async () => {
              // eslint-disable-next-line no-console
              console.log('Checking for sw update')
              await r.update()
            }, 20000 /* 20s for testing purposes */)
          }
          else {
          // eslint-disable-next-line no-console
            console.log(`SW Registered: ${r}`)
          }
        },
      })
}
