import { openDB, deleteDB, wrap, unwrap } from 'idb';
import {  toRaw } from 'vue';

async function getDb() {
    return openDB('balancer', 1, {
        upgrade(db, oldVersion, newVersion, transaction) {
            db.createObjectStore("transactions", { keyPath: "id" });
        },
    });
}

export async function saveTransaction(item: any) {
    const db = await getDb();
    return db.add('transactions', toRaw(item));
}

export async function countTransactions() {
    const db = await getDb();
    return (await db.getAllKeys('transactions')).length;
}

export async function getAllTransactions() {
    const db = await getDb();
    return await db.getAll('transactions');
}

export async function removeTransactions( ids: string[]) {
    const db = await getDb();
    return Promise.all(ids.map( k => db.delete('transactions', k) ));
}
