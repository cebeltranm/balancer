import * as idb from './idb';
import * as files from './files';

export async function syncTransactions() {
    const transactions = await idb.getAllTransactions();
    if (transactions.length > 0 ) {
        const byMonth = transactions.reduce( (ant, v) => {
            const date = new Date(v.date);
            if(!ant[date.getFullYear()]) {
                ant[date.getFullYear()] = {}
            }
            if (ant[date.getFullYear()][date.getMonth() + 1]) {
                ant[date.getFullYear()][date.getMonth() + 1].push(v);
            } else {
                ant[date.getFullYear()][date.getMonth() + 1] = [v];
            }
            return ant;
        }, {});

        const res = await Promise.all(Object.keys(byMonth).map(async (year) => {
            return Promise.all(Object.keys(byMonth[year]).map(async (month) => {
                const file = await files.readJsonFile(`transactions_${year}_${month}.json`, false);
                var trans = byMonth[year][month];
                if (file) {
                    trans = file.filter( (t: any) => !transactions.find( t2 => t2.id === t.id) );
                    trans.push( ...byMonth[year][month].filter( t => !t.deleted) );
                }
                if (await files.writeJsonFile(`transactions_${year}_${month}.json`, trans )) {
                    await idb.removeTransactions( byMonth[year][month].map( t => t.id) );
                }
                return { year: Number(year), month: Number(month) };
            }));
        }));

        return res.reduce( (ant, r) => [...ant, ...r], [] );
    }   
}

export async function syncCachedFiles( listener: Function ) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const months = [month, month>1 ? month - 1 : 12, month > 2 ? month - 2 : 11];

    const exp = `(accounts|(values_|balance_|budget_)(${year}|${year - 1})|(transactions_(${year}|${year - 1})_(${months[0]}|${months[1]}|${months[2]})))\.json`;
    const re = new RegExp(exp);

    const fileKeys = await idb.getAllFilesInCache();
    if (fileKeys.length > 0 ) {
        await Promise.all(fileKeys.map(async (fileName) => {
            const file = await idb.getJsonFile(fileName);
            if (file && (Date.now() - file.date_cached) > 300000 && !file.to_sync) {
                if (re.test(fileName)) {
                    if(await files.readJsonFile(`transactions_${year}_${month}.json`, false)) {
                        listener(fileName);
                    }
                } else {
                    await idb.removeFile(fileName);
                }
            }
        }));
    }   
}

export async function syncFiles( ) {
    const fileKeys = await idb.getAllFilesInCache();
    if (fileKeys.length > 0 ) {
        return await Promise.all(fileKeys.map(async (fileName) => {
            const file = await idb.getJsonFile(fileName);
            if (file.to_sync) {
                return await files.writeJsonFile(fileName, file.data);
            }
        }));
    }   
}