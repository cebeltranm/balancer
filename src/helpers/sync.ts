import * as idb from './idb';
import * as files from './files';

export async function syncTransactions() {
    const transactions = await idb.getAllTransactions();
    if (transactions.length > 0 ) {
        const byYears = transactions.reduce( (ant, v) => {
            const date = new Date(v.date);
            if (ant[date.getFullYear()]) {
                ant[date.getFullYear()].push(v);
            } else {
                ant[date.getFullYear()] = [v];
            }
            return ant;
        }, {});

        await Promise.all(Object.keys(byYears).map(async (year) => {
            const file = await files.readJsonFile(`transactions_${year}.json`);
            var trans = byYears[year];
            if (file) {
                trans = file.filter( (t) => !byYears[year].find( t2 => t2.id === t.id) );
                trans.push( ...byYears[year] );
            }
            if (await files.writeJsonFile(`transactions_${year}.json`, trans )) {
                await idb.removeTransactions( byYears[year].map( t => t.id) );
            }
        }));
    }
    
}