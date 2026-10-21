// In-memory stand-ins for the IndexedDB helpers and the remote storage
// provider, used by integration tests that run several real stores and
// helpers together (see specs/testing-strategy.md, Integration layer).

interface CachedFile {
  id: string;
  data: any;
  date_cached: number;
  to_sync?: boolean;
  [key: string]: unknown;
}

const clone = <T>(value: T): T =>
  value === undefined ? value : JSON.parse(JSON.stringify(value));

const cachedFiles = new Map<string, CachedFile>();
const pendingTransactions = new Map<string | number, any>();

export const remote = {
  files: new Map<string, any>(),
  modified: new Map<string, number>(),
  reads: [] as string[],
  writes: [] as string[],
};

export function resetFakeBackend() {
  cachedFiles.clear();
  pendingTransactions.clear();
  remote.files.clear();
  remote.modified.clear();
  remote.reads.length = 0;
  remote.writes.length = 0;
}

export function seedRemote(fileName: string, data: unknown, modified = 1) {
  remote.files.set(fileName, clone(data));
  remote.modified.set(fileName, modified);
}

export function seedCache(fileName: string, data: unknown, dateCached: number) {
  cachedFiles.set(fileName, {
    id: fileName,
    data: clone(data),
    date_cached: dateCached,
    to_sync: false,
  });
}

export function cachedFile(fileName: string) {
  return cachedFiles.get(fileName);
}

export const idbFake = {
  saveTransaction: async (item: any) => {
    pendingTransactions.set(item.id, clone(item));
  },
  countTransactions: async () => pendingTransactions.size,
  getAllTransactions: async () => clone([...pendingTransactions.values()]),
  removeTransactions: async (ids: (string | number)[]) => {
    ids.forEach((id) => pendingTransactions.delete(id));
  },
  saveJsonFile: async (file: CachedFile) => {
    cachedFiles.set(file.id, { ...file, data: clone(file.data) });
  },
  getJsonFile: async (fileName: string) => {
    const file = cachedFiles.get(fileName);
    return file ? { ...file, data: clone(file.data) } : undefined;
  },
  getAllFilesInCache: async () => [...cachedFiles.keys()],
  removeFile: async (fileName: string) => {
    cachedFiles.delete(fileName);
  },
  countFilesToSync: async () =>
    [...cachedFiles.values()].filter((file) => file.to_sync).length,
  clearDatabase: async () => {
    cachedFiles.clear();
    pendingTransactions.clear();
  },
};

export const fakeStorage = {
  getInfo: async () => ({
    type: "HttpServer",
    loggedIn: true,
    offline: false,
    user: {},
  }),
  readJsonFile: async (fileName: string) => {
    remote.reads.push(fileName);
    return clone(remote.files.get(fileName)) ?? false;
  },
  writeJsonFile: async (fileName: string, data: unknown) => {
    remote.writes.push(fileName);
    remote.files.set(fileName, clone(data));
    remote.modified.set(fileName, Date.now());
    return true;
  },
  listFiles: async () =>
    [...remote.files.keys()].map((name) => ({
      name,
      lastModified: remote.modified.get(name) ?? 0,
    })),
  getLastModification: async (fileName: string) => {
    const modified = remote.modified.get(fileName);
    return modified === undefined ? undefined : new Date(modified);
  },
};

export const storageModuleFake = {
  getStorage: () => fakeStorage,
  getAvailableStorageProviders: () => [],
  getSelectedStorageProvider: () => "httpServer",
  setSelectedStorageProvider: () => {},
  isLocalDevHost: () => false,
};
