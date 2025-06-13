import * as idb from './idb';
import { getStorage } from './storage';

export async function readJsonFile(fileName: any, cache: boolean = true) {
    if (cache) {
        const file: any = await idb.getJsonFile(fileName);
        if (file) {
            return file.data;
        }
    }
    const storage = getStorage();

    // if (file) {
    //     const last_mod = await storage.getLastModification(fileName);
    //     if (last_mod?.getTime() < file.date_cached) {
    //         return file.data;
    //     }
    // }
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
