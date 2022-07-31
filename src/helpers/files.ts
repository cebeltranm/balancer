import * as idb from './idb';
import { getStorage } from './storage';

export async function readJsonFile(fileName: any, cache: boolean = true) {
    try {
        if (cache) {
            const file: any = await idb.getJsonFile(fileName);
            if (file) {
                return file.data;
            }
        }
        const storage = getStorage();
        const data = await storage.readJsonFile(fileName);
        if (data) {
            idb.saveJsonFile({
                id: fileName,
                data,
                date_cached: Date.now(),
                to_sync: false,
            });
            return data;
        }

        // const res = await fetch(`http://localhost:8181/${fileName}`);
        // if (res.status === 200) {
        //     const data = await res.json();
        //     idb.saveJsonFile({
        //         id: fileName,
        //         data,
        //         date_cached: Date.now(),
        //         to_sync: false,
        //     });
        //     return data;
        // }
    } catch (e) {
        console.log(e);
    }
    return false;
}

export async function writeJsonFile(fileName: any, data: Object) {
    try {
        const storage = getStorage();
        if (await storage.writeJsonFile(fileName, data)) {
            idb.saveJsonFile({
                id: fileName,
                data,
                date_cached: Date.now(),
                to_sync: false,
            });
            return true;
        }

        // const res = await fetch(`http://localhost:8181/${fileName}`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(data)
        // });
        // if (res.status === 200) {
        //     idb.saveJsonFile({
        //         id: fileName,
        //         data,
        //         date_cached: Date.now(),
        //         to_sync: false,
        //     });
        //     return true;
        // }
    } catch (e) {
        console.log(e);
    }
    return false;
}
