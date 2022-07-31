import {readJsonFile} from '@/helpers/files';

export default {
    namespaced: true,    
    state: {
      values: {},
    },
    mutations: {
        values (state: any, {year, values}) {
            state.values[year] = values;
        }
    },
    getters: {
    },
    actions: {
      async getValuesForYear(context: any, {year, reload } ) {
        if (!reload && context.state.values[ year ]) {
            return context.state.values[ year ];
        }
        const values = await readJsonFile(`values_${year}.json`);
        context.commit('values', {year, values:values});
  
        return values;
      },

      async getValue (context: any, {date, asset, currency}) {
        const values = await context.dispatch('getValuesForYear', date.getFullYear());
        var month = date.getMonth() + 1;
        while (month>0) {
            if (month in values) {
                if (asset in values[month] && currency in values[month][asset] ) {
                    return values[month][asset][currency]
                }
                if (currency in values[month] && asset in values[month][currency] ) {
                    return 1 / values[month][currency][asset]
                }
            }
            month--;
        }
        return 1;
      }
    }
  };