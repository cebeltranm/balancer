import * as idb from './idb';
import * as files from './files';
import { toRaw } from 'vue';

export async function syncTransactions() {
    const transactions = await idb.getAllTransactions();
    if (transactions.length > 0 ) {
        const byMonth = transactions.reduce( (ant, v) => {
            const date = new Date(`${v.date}T00:00:00.00`);
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
                // if (await files.writeJsonFile(`transactions_${year}_${month}.json`, trans )) {
                await idb.saveJsonFile({
                    id: `transactions_${year}_${month}.json`,
                    data: toRaw(trans),
                    date_cached: Date.now(),
                    to_sync: true,
                });
              
                await idb.removeTransactions( byMonth[year][month].map( t => t.id) );
                // }
                return { year: Number(year), month: Number(month) };
            }));
        }));

        return res.reduce( (ant, r) => [...ant, ...r], [] );
    }   
}

export async function getAllFilesInCache( ) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const fileKeys = await idb.getAllFilesInCache();
    return fileKeys.reduce( async (ant, fileName) => {
        const data: any = await ant;
        const file = await idb.getJsonFile(fileName);
        data[fileName] = file.date_cached;
        return data;
    }, {} );
}

export async function syncFiles( ) {
    const fileKeys = await idb.getAllFilesInCache();
    if (fileKeys.length > 0 ) {
        const data = await Promise.all(fileKeys.map(async (fileName) => {
            const file = await idb.getJsonFile(fileName);
            if (file.to_sync) {
                return {
                    stored: await files.writeJsonFile(fileName, file.data),
                    fileName: fileName,
                };
            }
        }));
        const fileSaved = data.filter( d => d && d.stored && d.fileName !== 'config.json');
        if (fileSaved.length > 0) {
            const config = (await files.readJsonFile('config.json')) || { files: {} };
            for (var i in fileSaved) {
                config.files[fileSaved[i].fileName] = Date.now();
            }
            idb.saveJsonFile({
                id: `config.json`,
                data: toRaw(config),
                date_cached: Date.now(),
                to_sync: true,
              });      
        }
        return data;
    }   
}