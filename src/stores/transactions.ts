import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { readJsonFile } from '@/helpers/files';
import * as idb from '../helpers/idb';
import type { Transaction } from '@/types';
import { useStorageStore } from '@/stores/storage';

type MontlyTransactionData = Transaction[];

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions: Ref<Record<number, Record<number, MontlyTransactionData>>> = ref({});

  const storageStore = useStorageStore();

  function getLastTags() {
    const tags: string[] = [];
    var year = new Date().getFullYear();
    var month = new Date().getMonth() + 1;
    var steps = 0;
    while (steps < 3) {
      if (transactions.value?.[year]?.[month]) {
        transactions.value[year][month].filter(t => t.tags && t.tags.length > 0).forEach( (t) => {
          tags.push(...t.tags.filter( s => !tags.includes(s)));              
        })
      }
      steps++;
      year = month === 1 ? year - 1 : year;
      month = month === 1 ? 12 : month - 1;
    }
    return tags;
  }

  async function loadTransactionsForMonth(year: number, month: number, reload: boolean = false): Promise<MontlyTransactionData> {
    if (!reload && transactions.value[year] && transactions.value[year][month]) {
      return transactions.value[year][month];
    }
    let values = await readJsonFile(`transactions_${year}_${month}.json`, !reload)
    const pendingTransactions = await idb.getAllTransactions();
    if (pendingTransactions.length > 0) {
      const filtered = pendingTransactions.filter(t => new Date(`${t.date}T00:00:00.00`).getFullYear() === year && new Date(`${t.date}T00:00:00.00`).getMonth() + 1 === month).map(t => ({ ...t, 'to_sync': true }));
      if (values) {
        values = values.filter((t: any) => !pendingTransactions.find(t2 => t2.id === t.id));
        values.push(...filtered.filter(t => !t.deleted))
      } else {
        values = filtered;
      }
    }
    if (values) {
      values.sort((a, b) => b.date.localeCompare(a.date))
      transactions.value[year] = transactions.value[year] || {};
      transactions.value[year][month] = values;
    }
    return values;
  }
  async function saveTransaction (transaction: Transaction) {
    await idb.saveTransaction(Object.keys(transaction).filter(key => key !== 'to_sync').reduce((obj: any, key) => {
      obj[key] = transaction[key];
      return obj;
    }, {}));
    await storageStore.updatePendingToSync();
    await loadTransactionsForMonth(new Date(`${transaction.date}T00:00:00.00`).getFullYear(), new Date(`${transaction.date}T00:00:00.00`).getMonth() + 1, true)
  }

  async function deleteTransaction(transaction: Transaction) {
    await idb.saveTransaction({ ...transaction, deleted: true });
    await storageStore.updatePendingToSync();
  }


  return { transactions, loadTransactionsForMonth, deleteTransaction, getLastTags, saveTransaction };
});