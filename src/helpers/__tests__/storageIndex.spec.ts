import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
