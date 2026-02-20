import { beforeEach, describe, expect, it, vi } from 'vitest';
import HttpServerStore from '@/helpers/storage/http_server';

describe('http server storage helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads info and toggles offline when ping succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));

    const store = new HttpServerStore();
    const info = await store.getInfo();

    expect(info.type).toBe('HttpServer');
    expect(info.offline).toBe(false);
  });

  it('reads and writes json files through fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ status: 200, json: vi.fn().mockResolvedValue({ a: 1 }) })
        .mockResolvedValueOnce({ status: 200 })
    );

    const store = new HttpServerStore();
    const data = await store.readJsonFile('x.json');
    const wrote = await store.writeJsonFile('x.json', { a: 1 });

    expect(data).toEqual({ a: 1 });
    expect(wrote).toBe(true);
  });
});
