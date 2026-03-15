import { beforeEach, describe, expect, it, vi } from "vitest";
import HttpServerStore from "@/helpers/storage/http_server";

describe("http server storage helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    });
    Object.defineProperty(window, "localStorage", {
      value: globalThis.localStorage,
      configurable: true,
    });
  });

  it("reads info and toggles offline when ping succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 401 }),
    );

    window.localStorage.setItem("http_server_token", "fake-token");

    const store = new HttpServerStore();
    const info = await store.getInfo();

    expect(info.type).toBe("HttpServer");
    expect(info.offline).toBe(false);
    expect(info.loggedIn).toBe(false);
    expect(window.localStorage.getItem("http_server_token")).toBeNull();
  });

  it("stores the fake token and sends it in authenticated requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          json: vi.fn().mockResolvedValue({ token: "fake-token" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          json: vi.fn().mockResolvedValue({ a: 1 }),
        })
        .mockResolvedValueOnce({ status: 200 }),
    );

    const store = new HttpServerStore();
    const loggedIn = await store.doAuth();
    const data = await store.readJsonFile("x.json");
    const wrote = await store.writeJsonFile("x.json", { a: 1 });

    expect(loggedIn).toBe(true);
    expect(window.localStorage.getItem("http_server_token")).toBe("fake-token");
    expect(data).toEqual({ a: 1 });
    expect(wrote).toBe(true);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8181/x.json",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token",
        }),
      }),
    );
  });

  it("removes the token on logout", async () => {
    window.localStorage.setItem("http_server_token", "fake-token");

    const store = new HttpServerStore();
    await store.logout();

    expect(window.localStorage.getItem("http_server_token")).toBeNull();
  });
});
