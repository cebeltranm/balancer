import * as idb from "./idb";
import { CLEAR_MESSAGES, EVENTS } from "./events";
import { isPersistedFileError } from "./persistedFileErrors";
import { getStorage } from "./storage";

const invalidRemoteFiles = new Set<string>();

// One toast group per file: a repeat for the same file replaces the earlier
// toast, while two invalid files each keep their own.
const invalidFileGroup = (fileName: string) => `invalid-file:${fileName}`;

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
        closable: true,
        group: invalidFileGroup(fileName),
      });
    }
    // Uncached read while the provider is unreachable (network failure): report
    // the file as unavailable instead of failing. Uncached reads that bypass
    // the cache (sync, onboarding) keep throwing so they never act on missing data.
    if (cache && error instanceof TypeError) {
      return false;
    }
    throw error;
  }
  if (data) {
    if (invalidRemoteFiles.delete(fileName)) {
      EVENTS.emit(CLEAR_MESSAGES, invalidFileGroup(fileName));
    }
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
    console.error(`Could not write ${fileName}`, e);
  }
  return false;
}
