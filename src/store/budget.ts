import {readJsonFile} from '@/helpers/files';
import * as idb from '@/helpers/idb';
import { AccountType, Period } from '@/types';
import { toRaw } from 'vue';

export default {
    namespaced: true,    
    state: {
      budget: {},
      comments: {}
    },
    mutations: {
        budget (state: any, {year, budget, comments}) {
            state.budget[year] = budget;
            state.comments[year] = comments;
        },
    },
    getters: {
      getBudgetGrupedByPeriod: (state: any, getters: any, rootState: any ) => (type: Period, numPeriods: number, { year, month, quarter}) => {
        const budget:any = Object.keys(rootState.accounts.accounts).reduce( (ant: any, key: any) => {
          ant[key] = [];
          return ant;
        }, {});

        const comments:any = Object.keys(rootState.accounts.accounts).reduce( (ant: any, key: any) => {
          ant[key] = [];
          return ant;
        }, {});

        for (var period = 1; period<=numPeriods; period++){
          var months = [month];
          switch(type) {
            case Period.Quarter:
              months = [quarter * 3 - 2, quarter * 3 - 1, quarter * 3 ];
              break;
            case Period.Year:
              months = Array.from(new Array(period === 1 ? month : 12), (val, index) => index + 1)
              break;
          }
          Object.keys(budget).forEach( (key:string) => {
            budget[key].push( months
                .map( (m) => (state.budget[year] && state.budget[year][key] && state.budget[year][key][m]) ? state.budget[year][key][m] : undefined )
                .reduce( (ant, v) => ant + ( v === undefined ? 0 : v) , 0 ) );
          });

          Object.keys(comments).forEach( (key:string) => {
            comments[key].push( months
                .map( (m) => (state.comments[year] && state.comments[year][key] && state.comments[year][key][m]) ? state.comments[year][key][m] : undefined )
                .filter( (m) => m )
                .reduce( (ant, v) => [...ant,...v] , [] ) );
          });

          switch(type) {
            case Period.Month:
              year = year - (month === 1 ? 1 : 0);
              month = month === 1 ? 12 : month - 1;
              break;
            case Period.Quarter:
              year = year - (quarter === 1 ? 1 : 0);
              quarter = quarter === 1 ? 4 : quarter - 1;
              break;
            case Period.Year:
              year = year - 1;
              break;
          }
        }
        return {budget, comments};
      }
    },
    actions: {
      async getBudgetForYear (context: any, {year, reload }) {
        if (!reload && context.state.budget[ year ]) {
          return context.state.budget[ year ];
        }
        const budget = await readJsonFile(`budget_${year}.json`);
        context.commit('budget', {year, budget:budget.values, comments: budget.comments});
  
        return budget.values;
      },
      async getBudgetCommentsForYear (context: any, {year}) {
        if (context.state.budget[ year ]) {
          return context.state.comments[ year ];
        }
        const budget = await readJsonFile(`budget_${year}.json`);
        context.commit('budget', {year, budget:budget.values, comments: budget.comments});
  
        return budget.comments;
      },
      async setBudgetForYear(context: any, {year, values, comments}) {
        idb.saveJsonFile({
          id: `budget_${year}.json`,
          data: {values: toRaw(values), comments:toRaw(comments)},
          date_cached: Date.now(),
          to_sync: true,
        });
        context.commit('budget', {year, budget:values, comments});
        context.dispatch('storage/pendingToSync', null, {root: true});
      },
    }
  };