import {readJsonFile} from '@/helpers/files';
import type { Transaction } from '@/types';
import * as idb from '../helpers/idb';
import { toRaw } from 'vue';

import { Period, AccountType } from '@/types';

export default {
    namespaced: true,    
    state: {
      balance: {},
    },
    mutations: {
      balance (state: any, {year, balance}) {
          state.balance[year] = balance;
        }
    },
    getters: {
      getBalanceGroupedByPeriods: (state: any, getters: any, rootState: any) => (type: Period, numPeriods: number, { year, month, quarter}) => {

        const balance:any = Object.keys(rootState.accounts.accounts).reduce( (ant: any, key: any) => {
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
              months = Array.from(new Array(month), (val, index) => index + 1)
              break;
          }
          Object.keys(balance).forEach( (key:string) => {
              balance[key].push( months
                .map( (m) => (state.balance[year] && state.balance[year][key] && state.balance[year][key][m] && state.balance[year][key][m].value ) ? state.balance[year][key][m].value : undefined )
                .reduce( (ant, v) => rootState.accounts.accounts[key].type === AccountType.Expenses ? ant + ( v === undefined ? 0 : v) : ( v === undefined ? ant : v), 0 ) );
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

        return balance;
        // return Object.keys(state.accounts)
        //   .filter( (id:string) => ['cash'].includes( state.accounts[id].type ))
        //   .reduce( (ant: any, id:string) => {
        //     if (!ant[ state.accounts[id].type ] ) {
        //       ant[ state.accounts[id].type ] = [];
        //     }
        //     ant[ state.accounts[id].type ].push( state.accounts[id] );
        //     return ant;
        //   }, {});
      },
    },
    actions: {
      async getBalanceForYear (context: any, {year, reload }) {
        if (!reload && context.state.balance[ year ]) {
          return context.state.balance[ year ];
        }
        var balance = await readJsonFile(`balance_${year}.json`);
        if (balance === false) {
          balance = {};
        }
        context.commit('balance', {year, balance});
        return balance;
      },

      async recalculateBalance ( context: any, {year, month, save}) {
        const accounts = await context.dispatch('accounts/getAccounts', false, {root: true});
        const balance = await context.dispatch('getBalanceForYear', { year });
        const prevBalance = month === 1 ? balance : await context.dispatch('getBalanceForYear', { year: year - 1 });
        const prevMonth = month === 1 ? 12 : month - 1;

        const transactions = await context.dispatch('transactions/getTransactionsForMonth', {year, month }, {root: true});
        const res = transactions ? transactions.reduce( (prev: any, t: Transaction) => {
          return t.values.reduce( (ant: any, value) => {
            if (!ant[value.accountId]) {
              ant[value.accountId] = value.accountValue;
            } else {
              ant[value.accountId] = ant[value.accountId] + value.accountValue;
            }
            return ant;
  
          }, prev );
        }, {} ) : {};

        Object.keys(accounts).forEach( (a:any) => {
          if (!balance[accounts[a].id]) {
            balance[accounts[a].id] = {}
          }
          if (!balance[accounts[a].id][month]) {
            balance[accounts[a].id][month] = { value: 0 };
          }
          switch(accounts[a].type) {
            case AccountType.Expense:
              balance[accounts[a].id][month].value = res[accounts[a].id] || 0;
              break;
            case AccountType.Cash:
            case AccountType.CreditCard:
              var initValue = accounts[a].initBalance || 0;
              if (prevBalance[accounts[a].id] && prevBalance[accounts[a].id][prevMonth]) {
                initValue = prevBalance[accounts[a].id][prevMonth].value;
              }
              balance[accounts[a].id][month].value = initValue +  (res[accounts[a].id] || 0);
              break;
          }
        });
        context.commit('balance', {year, balance});

        // recalculate the next month
        if (year < new Date().getFullYear() || month < new Date().getMonth() + 1) {
          await context.dispatch('recalculateBalance', {
            year: month === 12 ? year + 1 : year,
            month: month === 12 ? 1 : month + 1,
            save, 
          })
        }
        if (save && (
            month === 12 || 
            (  month === new Date().getMonth() + 1 && year === new Date().getFullYear() )
            )) {
              idb.saveJsonFile({
                id: `balance_${year}.json`,
                data: toRaw(balance),
                date_cached: Date.now(),
                to_sync: true,
            });

        }
        return balance;
      }
    }
  };