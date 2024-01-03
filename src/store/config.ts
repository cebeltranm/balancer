import {readJsonFile} from '@/helpers/files';
import { StockApiType } from "@/types"


export default {
    namespaced: true,    
    state: {
      config: {},
    },
    mutations: {
      config (state: any, config: any) {
        state.config = config;
      }
    },
    getters: {
      stockApi: ( state: any) => (id: string) => { 
        return state.config && state.config.stock_api;
      },
    },
    actions: {
      async getConfig (context: any, reload: boolean) {
        if (!reload && context.state.config && Object.keys(context.state.config).length > 0){
          return context.state.config;
        }
        const config = await readJsonFile('config.json', !reload);
        context.commit('config', config);
        return config;
      }
    }
  };