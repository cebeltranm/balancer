import {readJsonFile} from '@/helpers/files';

function groupComposition(composition: any){
  const data = Object.keys(composition).reduce((data: any, key) => {
    const item = composition[key];
    if (typeof item === 'number') {
      if (data[key]) {
        data[key].value += item;
      } else {
        data[key] = { value: item };
      }
    }
    if (typeof item === 'object' && item !== null) {
      data[key] = groupComposition(item);
    }
    return data;
  }, {});
  data.value = Object.keys(data).reduce((sum: number, key: any) => sum + (data[key].value || 0), 0);
  return data;
}

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
      invCompositionByAssetClass: ( state: any) => (id: string) => { 
        return state.config && state.config.inv_composition && groupComposition(state.config.inv_composition);
      },
      invCompositionByRegion: ( state: any) => (id: string) => { 
        if (state.config && state.config.inv_composition) {
          const data: any = {};
          Object.keys(state.config.inv_composition).forEach((asset: any) => {
            Object.keys(state.config.inv_composition[asset]).forEach((region: any) => {
              if (! data[region]) {
                data[region] = {};
              }
              if (! data[region][asset]) {
                data[region][asset] = {};
              }
              Object.keys(state.config.inv_composition[asset][region]).forEach((type: any) => {
                if (data[region][asset][type]) {
                  data[region][asset][type] = data[region][asset][type] + state.config.inv_composition[asset][region][type];
                } else {
                  data[region][asset][type] = state.config.inv_composition[asset][region][type];
                }
              });
            });
          });
          return groupComposition(data);
        }
        return {};
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