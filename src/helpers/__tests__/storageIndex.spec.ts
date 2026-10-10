import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DropboxCtor = vi.fn(function DropboxMock(this: any) {
  this.kind = "dropbox";
});
const HttpCtor = vi.fn(function HttpMock(this: any) {
  this.kind = "http";
});

vi.mock("@/helpers/storage/dropbox", () => ({
  default: DropboxCtor,
}));

vi.mock("@/helpers/storage/http_server", () => ({
  default: HttpCtor,
}));

describe("storage index helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("uses http server storage for localhost", async () => {
    window.location.host = "localhost:3000";
    const { getStorage } = await import("@/helpers/storage");

    const storage = getStorage();
    expect((storage as any).kind).toBe("http");
    expect(HttpCtor).toHaveBeenCalledTimes(1);
  });

  it("uses dropbox storage for non-localhost host", async () => {
    window.location.host = "example.com";
    const { getStorage } = await import("@/helpers/storage");

    const storage = getStorage();
    expect((storage as any).kind).toBe("dropbox");
    expect(DropboxCtor).toHaveBeenCalledTimes(1);
  });

  it("ignores a stored local http selection outside localhost", async () => {
    window.location.host = "example.com";
    window.localStorage?.setItem("storage_provider", "httpServer");
    const { getStorage, getAvailableStorageProviders } = await import(
      "@/helpers/storage"
    );

    const storage = getStorage();

    expect(
      getAvailableStorageProviders().some((p) => p.id === "httpServer"),
    ).toBe(false);
    expect((storage as any).kind).toBe("dropbox");
    expect(DropboxCtor).toHaveBeenCalledTimes(1);
  });

  describe("Google Drive is out of scope (RT-029)", () => {
    // The shared test setup's window mock has no localStorage, so provide one.
    beforeEach(() => {
      const data = new Map<string, string>();
      (window as any).localStorage = {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
      };
    });

    afterEach(() => {
      delete (window as any).localStorage;
    });

    it.each(["localhost:3000", "example.com"])(
      "lists Google Drive as unavailable and planned on %s",
      async (host) => {
        window.location.host = host;
        const { getAvailableStorageProviders } = await import(
          "@/helpers/storage"
        );

        const options = getAvailableStorageProviders();
        const drive = options.find((p) => p.id === "googleDrive");
        expect(drive).toMatchObject({ available: false, planned: true });
        expect(options.find((p) => p.id === "dropbox")?.available).toBe(true);
      },
    );

    it("falls back to the host default when googleDrive is stored", async () => {
      window.location.host = "example.com";
      window.localStorage?.setItem("storage_provider", "googleDrive");
      const { getSelectedStorageProvider, getStorage } = await import(
        "@/helpers/storage"
      );

      expect(getSelectedStorageProvider()).toBe("dropbox");
      expect((getStorage() as any).kind).toBe("dropbox");
      expect(DropboxCtor).toHaveBeenCalledTimes(1);
    });

    it("falls back to http server on localhost when googleDrive is stored", async () => {
      window.location.host = "localhost:3000";
      window.localStorage?.setItem("storage_provider", "googleDrive");
      const { getSelectedStorageProvider } = await import("@/helpers/storage");

      expect(getSelectedStorageProvider()).toBe("httpServer");
    });

    it("does not persist googleDrive when it is selected", async () => {
      window.location.host = "example.com";
      const { setSelectedStorageProvider, getSelectedStorageProvider } =
        await import("@/helpers/storage");

      setSelectedStorageProvider("googleDrive");

      expect(window.localStorage?.getItem("storage_provider")).toBe("dropbox");
      expect(getSelectedStorageProvider()).toBe("dropbox");
    });
  });
});
