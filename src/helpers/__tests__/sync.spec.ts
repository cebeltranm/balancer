import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/helpers/idb', () => ({
  getAllTransactions: vi.fn(),
  saveJsonFile: vi.fn(),
  removeTransactions: vi.fn(),
  getAllFilesInCache: vi.fn(),
  getJsonFile: vi.fn(),
}));

vi.mock('@/helpers/files', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

import * as idb from '@/helpers/idb';
import * as files from '@/helpers/files';
import { getAllFilesInCache, syncFiles, syncTransactions } from '@/helpers/sync';

describe('sync helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs pending transactions by month and clears queue', async () => {
    vi.mocked(idb.getAllTransactions).mockResolvedValue([
      { id: 1, date: '2025-02-10', deleted: false },
      { id: 2, date: '2025-02-11', deleted: true },
    ] as any);
    vi.mocked(files.readJsonFile).mockResolvedValue([{ id: 9 }]);

    const res = await syncTransactions();

    expect(res).toEqual([{ year: 2025, month: 2 }]);
    expect(idb.saveJsonFile).toHaveBeenCalledWith(expect.objectContaining({ id: 'transactions_2025_2.json', to_sync: true }));
    expect(idb.removeTransactions).toHaveBeenCalledWith([1, 2]);
  });

  it('lists cached file timestamps and syncs files marked to_sync', async () => {
    vi.mocked(idb.getAllFilesInCache).mockResolvedValue(['a.json', 'b.json'] as any);
    vi.mocked(idb.getJsonFile)
      .mockResolvedValueOnce({ date_cached: 100, to_sync: true, data: { a: 1 } } as any)
      .mockResolvedValueOnce({ date_cached: 200, to_sync: false, data: { b: 2 } } as any)
      .mockResolvedValueOnce({ date_cached: 100, to_sync: true, data: { a: 1 } } as any)
      .mockResolvedValueOnce({ date_cached: 200, to_sync: false, data: { b: 2 } } as any);
    vi.mocked(files.writeJsonFile).mockResolvedValue(true);

    const cache = await getAllFilesInCache();
    const synced = await syncFiles();

    expect(cache).toEqual({ 'a.json': 100, 'b.json': 200 });
    expect(synced).toEqual([{ fileName: 'a.json', stored: true }, undefined]);
  });
});
