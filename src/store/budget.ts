import {readJsonFile} from '@/helpers/files';

export default {
    namespaced: true,    
    state: {
      budget: {},
    },
    mutations: {
        budget (state: any, budget: any) {
            state.budget = budget;
        }
    },
    getters: {
    },
    actions: {
      async loadBudget (context: any, year:number) {
        const budget = await readJsonFile(`budget_${year}.json`);
        context.commit('budget', Object.keys(budget).filter( id => id != 'default').reduce( (ant:any, id:string) => {
          ant[id] = { ...budget[id] }
          return ant;
        }, {} ));
      }
    }
  };