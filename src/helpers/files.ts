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
    } catch (e) {
        console.log(e);
    }
    return false;
}
