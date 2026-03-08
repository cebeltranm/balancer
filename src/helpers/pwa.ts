import { useRegisterSW } from "virtual:pwa-register/vue";
// replaced dyanmicaly
const reloadSW: any = "__RELOAD_SW__";

export function initPWA() {
  return useRegisterSW({
    immediate: true,
    onRegistered(r) {
      if (reloadSW === "true") {
        if (r) {
          setInterval(async () => {
            console.log("Checking for sw update");
            await r.update();
          }, 120000);
        }
      } else {
        console.log(`SW Registered: ${r}`);
      }
    },
    onOfflineReady() {
      console.log("onOfflineReady");
    },
  });
}
