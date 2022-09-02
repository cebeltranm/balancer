import {readJsonFile} from '@/helpers/files';
import { AccountGroupType, type Transaction } from '@/types';
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
              months = Array.from(new Array(12), (val, index) => index + 1)
              break;
          }
          Object.keys(balance).forEach( (key:string) => {
              balance[key].push( months
                .map( (m) => (state.balance[year] && state.balance[year][key] && state.balance[year][key][m] ) ? state.balance[year][key][m] : undefined )
                .reduce( (ant, v) => {
                  return {
                    value: rootState.accounts.accounts[key].type === AccountType.Expense ? ant.value + ( !v || v.value === undefined ? 0 : v.value) : ( !v || v.value === undefined ? ant.value : v.value),
                    ...( [AccountType.Investment, AccountType.CDT, AccountType.ETF].includes(rootState.accounts.accounts[key].type) ? ['in', 'out', 'in_local', 'out_local', 'expenses'].reduce( (p,k) => {
                      p[k] = ant[k] + ( !v || v[k] === undefined ? 0 : v[k])
                      return p;
                    }, {}) : {}),
                    ...( [ AccountType.ETF].includes(rootState.accounts.accounts[key].type) ? {
                      units: !v || v.units === undefined ? ant.units : v.units
                       }: {})
                  }
                }, { value: 0, expenses: 0, in: 0, out: 0, in_local: 0, out_local : 0, units: 0 } ) );
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
        await context.dispatch('values/getValuesForYear', { year }, {root: true});
        const accounts = await context.dispatch('accounts/getAccounts', false, {root: true});
        const balance = await context.dispatch('getBalanceForYear', { year });
        const prevBalance = month === 1 ? await context.dispatch('getBalanceForYear', { year: year - 1 }) : balance;
        const prevMonth = month === 1 ? 12 : month - 1;
        const date = new Date(year, month -1, 1);

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

        const investments = transactions ? transactions
          .filter( (t:Transaction) => t.values.find( v => context.rootGetters['accounts/getAccountGroupType'](v.accountId) === AccountGroupType.Investments ) )
          .reduce( (prev: any, t: Transaction) => {
            const invs = t.values.filter( v => context.rootGetters['accounts/getAccountGroupType'](v.accountId) === AccountGroupType.Investments);
            return invs.reduce( (ant2, inv, indexInv) => {
              if (!ant2[inv.accountId]) {
                ant2[inv.accountId] = {
                  in: 0, out: 0, in_local: 0, out_local: 0, expenses: 0,
                };
              }
              if (inv.units) {
                ant2[inv.accountId].units = (ant2[inv.accountId].units || 0) + inv.units;
              }
              return t.values.reduce( (ant: any, value) => {
                const groupType = context.rootGetters['accounts/getAccountGroupType'](value.accountId)
                if ( groupType === AccountGroupType.Expenses && indexInv === 0) {
                  ant[inv.accountId].expenses += value.accountValue;
                } else if ( value.accountId !== inv.accountId ) {
                  if ( groupType !== AccountGroupType.Investments || !accounts[inv.accountId].entity || !accounts[value.accountId].entity || accounts[inv.accountId].entity !== accounts[value.accountId].entity ) {
                    ant[inv.accountId].in += (inv.accountValue > 0 ? inv.accountValue : 0);
                    ant[inv.accountId].out -= (inv.accountValue < 0 ? inv.accountValue : 0);
                  } else {
                    ant[inv.accountId].in_local += (inv.accountValue > 0 ? inv.accountValue : 0);
                    ant[inv.accountId].out_local -= (inv.accountValue < 0 ? inv.accountValue : 0);
                  }
                }
                return ant;
              }, ant2 );
            }, prev);
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
            case AccountType.Income:
                balance[accounts[a].id][month].value = -res[accounts[a].id] || 0;
              break;
            case AccountType.Cash:
            case AccountType.CreditCard:
            case AccountType.Loan:
            case AccountType.BankAccount:
            case AccountType.Receivable:
              var initValue = 0;
              if (prevBalance[accounts[a].id] && prevBalance[accounts[a].id][prevMonth]) {
                initValue = prevBalance[accounts[a].id][prevMonth].value;
              }
              balance[accounts[a].id][month].value = initValue +  (res[accounts[a].id] || 0);
              break;
            case AccountType.Investment:
            case AccountType.CDT:
              balance[accounts[a].id][month] = {
                ...( investments[accounts[a].id] || {}),
                value: context.rootGetters['values/getValue'](date, accounts[a].id, accounts[a].currency ) || 0
              };
              break;
            case AccountType.ETF:
              var units = ( investments[accounts[a].id] || {}).units || 0;
              if (prevBalance[accounts[a].id] && prevBalance[accounts[a].id][prevMonth] && prevBalance[accounts[a].id][prevMonth].units) {
                units += prevBalance[accounts[a].id][prevMonth].units;
              }
              balance[accounts[a].id][month] = {
                ...( investments[accounts[a].id] || {}),
                units,
                value: units * context.rootGetters['values/getValue'](date, accounts[a].id, accounts[a].currency ) || 0
              };
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
        if (year === new Date().getFullYear() && month === new Date().getMonth() + 1)  {
          context.dispatch('storage/pendingToSync','',{root: true});
        }
        return balance;
      }
    }
  };