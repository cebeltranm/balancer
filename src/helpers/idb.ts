import { openDB, deleteDB, wrap, unwrap } from 'idb';
import {  toRaw } from 'vue';

const FILES_DB = 'files';
const TRANSACTIONS_DB = 'transactions';

async function getDb() {
    return openDB('balancer', 1, {
        upgrade(db, oldVersion, newVersion, transaction) {
            db.createObjectStore(TRANSACTIONS_DB, { keyPath: "id" });
            db.createObjectStore(FILES_DB, { keyPath: "id" });
        },
    });
}

export async function saveTransaction(item: any) {
    const db = await getDb();
    return db.put(TRANSACTIONS_DB, toRaw(item));
}

export async function countTransactions() {
    const db = await getDb();
    return (await db.getAllKeys(TRANSACTIONS_DB)).length;
}

export async function getAllTransactions() {
    const db = await getDb();
    return await db.getAll(TRANSACTIONS_DB);
}

export async function removeTransactions( ids: string[]) {
    const db = await getDb();
    return Promise.all(ids.map( k => db.delete(TRANSACTIONS_DB, k) ));
}

export async function saveJsonFile(file: any) {
    const db = await getDb();
    return db.put(FILES_DB, file);
}

export async function getJsonFile(fileName: any) {
    const db = await getDb();
    return db.get(FILES_DB, fileName);
}

export async function getAllFilesInCache() {
    const db = await getDb();
    return db.getAllKeys(FILES_DB);
}

export async function removeFile( fileName: string) {
    const db = await getDb();
    return db.delete(FILES_DB, fileName);
}
