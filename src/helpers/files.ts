import * as idb from "./idb";
import { EVENTS } from "./events";
import { isPersistedFileError } from "./persistedFileErrors";
import { getStorage } from "./storage";

const invalidRemoteFiles = new Set<string>();

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
  let data;
  try {
    data = await storage.readJsonFile(fileName);
  } catch (error) {
    if (isPersistedFileError(error)) {
      invalidRemoteFiles.add(fileName);
      EVENTS.emit("message", {
        severity: "error",
        summary: "Invalid file",
        message: `${error.fileName} could not be loaded. The remote file was not overwritten and needs recovery before saving.`,
        life: 0,
      });
    }
    throw error;
  }
  if (data) {
    invalidRemoteFiles.delete(fileName);
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

export async function writeJsonFile(fileName: any, data: object) {
  try {
    if (invalidRemoteFiles.has(fileName)) {
      return false;
    }
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
