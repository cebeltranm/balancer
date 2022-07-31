import {readJsonFile} from '@/helpers/files';

export default {
    namespaced: true,    
    state: {
      budget: {},
    },
    mutations: {
        budget (state: any, {year, budget}) {
            state.budget[year] = budget;
        }
    },
    getters: {
    },
    actions: {
      async getBudgetForYear (context: any, {year, reload }) {
        if (!reload && context.state.budget[ year ]) {
          return context.state.budget[ year ];
        }
        const budget = await readJsonFile(`budget_${year}.json`);
        context.commit('budget', {year, budget:budget});
  
        return budget;
      }
    }
  };