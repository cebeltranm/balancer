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