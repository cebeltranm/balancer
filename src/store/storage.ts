export default {
    namespaced: true,    
    state: {
      used: 0
    },
    mutations: {
      used (state: any, used: number) {
        state.used = used;
      }
    },
    actions: {
      async calculateStorage (context: any) {
        if (navigator.storage && navigator.storage.estimate) {
            const quota = await navigator.storage.estimate();
            if (quota && quota.usage && quota.quota) {
                const used = Math.trunc((quota.usage / quota.quota) * 100);
                context.commit('used', used);
            }
        }
      }
    }
  };