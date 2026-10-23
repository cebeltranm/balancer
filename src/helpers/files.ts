import * as idb from "./idb";
import { CLEAR_MESSAGES, EVENTS } from "./events";
import { isPersistedFileError } from "./persistedFileErrors";
import { getStorage } from "./storage";

const invalidRemoteFiles = new Set<string>();
// RT-051: files whose invalid remote copy the user agreed to replace with a
// rebuilt version (derived balance files only; the caller enforces that).
const approvedOverwrites = new Set<string>();

// One toast group per file: a repeat for the same file replaces the earlier
// toast, while two invalid files each keep their own.
const invalidFileGroup = (fileName: string) => `invalid-file:${fileName}`;

export function isInvalidRemoteFile(fileName: string) {
  return invalidRemoteFiles.has(fileName);
}

// RT-051: lets the next write replace the invalid remote file. An uncached
// read of that file reports it as missing so it can be rebuilt.
export function approveInvalidFileOverwrite(fileName: string) {
  approvedOverwrites.add(fileName);
  if (invalidRemoteFiles.delete(fileName)) {
    EVENTS.emit(CLEAR_MESSAGES, invalidFileGroup(fileName));
  }
}

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
    if (isPersistedFileError(error) && approvedOverwrites.has(fileName)) {
      return false;
    }
    if (isPersistedFileError(error)) {
      invalidRemoteFiles.add(fileName);
      EVENTS.emit("message", {
        severity: "error",
        summary: "Invalid file",
        message: `${error.fileName} could not be loaded. The remote file was not overwritten and needs recovery before saving.`,
        life: 0,
        closable: true,
        group: invalidFileGroup(fileName),
        fileName,
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
    approvedOverwrites.delete(fileName);
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
      approvedOverwrites.delete(fileName);
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
