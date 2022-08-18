import {readJsonFile} from '@/helpers/files';
import * as idb from '@/helpers/idb';
import { toRaw } from 'vue';

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
      getValue: (state: any) => (date: Date, asset: string, currency: string) => {
        if (asset !== currency) {
          var year = date.getFullYear();
          const values = state.values[ year ] || [];
          var month = date.getMonth() + 1;
          while (month > 0) {
            if (month in values) {
              if (asset in values[month] && currency in values[month][asset] ) {
                return values[month][asset][currency]
              }
              if (currency in values[month] && asset in values[month][currency] ) {
                return 1 / values[month][currency][asset]
              }
            }
            month--;
            if (month === 0 && year === date.getFullYear() ) {
              month = 12;
              year--;
            }
          }
        }
        return 1;
      },
      joinValues: (state: any, getters: any) => (date: DataTransfer, currency: string, values: [{value: number, asset: string, entity?:string }]) => {
        return values.reduce ( (ant: number, v: any) => {
          return ant + (
            v.asset === currency ? v.value : v.value * getters.getValue(date, currency, v.asset)
          );
        }, 0 )
      }
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
      async setValuesForMonth(context: any, {year, month, values}) {
        const data = await context.dispatch('getValuesForYear', {year}) || {};
        data[month] = values;
        idb.saveJsonFile({
          id: `values_${year}.json`,
          data: toRaw(data),
          date_cached: Date.now(),
          to_sync: true,
        });
        context.commit('values', {year, values:data});
        context.dispatch('balance/recalculateBalance', {year, month, save: true}, {root: true});
      }
    }
  };