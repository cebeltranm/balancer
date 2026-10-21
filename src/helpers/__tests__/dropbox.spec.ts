import { beforeEach, describe, expect, it, vi } from "vitest";

// RT-020: Dropbox token-refresh and authorization-code failures must surface a
// StorageAuthError instead of being logged or silently redirecting.

const mocks = vi.hoisted(() => ({
  filesGetMetadata: vi.fn(),
  filesDownload: vi.fn(),
  refreshAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
  getAccessTokenFromCode: vi.fn(),
  getAuthenticationUrl: vi.fn(),
}));

vi.mock("dropbox", () => {
  class DropboxResponseError extends Error {
    status: number;
    constructor(status: number) {
      super(`status ${status}`);
      this.status = status;
    }
  }
  class DropboxAuth {
    codeVerifier = "verifier";
    refreshAccessToken = mocks.refreshAccessToken;
    getAccessToken = mocks.getAccessToken;
    getAccessTokenFromCode = mocks.getAccessTokenFromCode;
    getAuthenticationUrl = mocks.getAuthenticationUrl;
    setCodeVerifier() {}
  }
  class Dropbox {
    filesGetMetadata = mocks.filesGetMetadata;
    filesDownload = mocks.filesDownload;
  }
  return { Dropbox, DropboxAuth, DropboxResponseError };
});

import { DropboxResponseError } from "dropbox";
import DropboxStore from "@/helpers/storage/dropbox";
import { PersistedFileError } from "@/helpers/persistedFileErrors";

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe("dropbox storage helper auth failures (RT-020)", () => {
  let local: ReturnType<typeof makeStorage>;
  let session: ReturnType<typeof makeStorage>;
  let location: { href: string };

  beforeEach(() => {
    vi.clearAllMocks();
    local = makeStorage();
    session = makeStorage();
    location = { href: "http://localhost/" };
    Object.assign((globalThis as any).window, {
      localStorage: local,
      sessionStorage: session,
      location: {
        protocol: "http:",
        host: "localhost",
        pathname: "/",
        get href() {
          return location.href;
        },
        set href(value: string) {
          location.href = value;
        },
      },
    });
    mocks.getAuthenticationUrl.mockResolvedValue("https://dropbox.test/auth");
  });

  it("stores the refreshed access token when a 401 is recovered by refresh", async () => {
    local.setItem("dbx_token", "old");
    local.setItem("dbx__refresh_token", "refresh");
    mocks.filesGetMetadata
      .mockRejectedValueOnce(new (DropboxResponseError as any)(401))
      .mockResolvedValueOnce({ status: 200 });
    mocks.refreshAccessToken.mockResolvedValue(undefined);
    mocks.getAccessToken.mockReturnValue("new");

    const info = await new DropboxStore().getInfo();

    expect(local.getItem("dbx_token")).toBe("new");
    expect(info).toMatchObject({ loggedIn: true, offline: false });
  });

  it("logs a failed token refresh with console.error and no token value", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    local.setItem("dbx_token", "old-access-secret");
    local.setItem("dbx__refresh_token", "refresh-secret");
    mocks.filesGetMetadata.mockRejectedValue(
      new (DropboxResponseError as any)(401),
    );
    mocks.refreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

    await expect(new DropboxStore().getInfo()).rejects.toBeTruthy();

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("token refresh"),
      expect.any(Error),
    );
    expect(log).not.toHaveBeenCalled();
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain("old-access-secret");
    expect(logged).not.toContain("refresh-secret");
  });

  it("throws a Dropbox StorageAuthError without redirecting when the token refresh fails", async () => {
    local.setItem("dbx_token", "old");
    local.setItem("dbx__refresh_token", "revoked");
    mocks.filesGetMetadata.mockRejectedValue(
      new (DropboxResponseError as any)(401),
    );
    mocks.refreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

    await expect(new DropboxStore().getInfo()).rejects.toMatchObject({
      name: "StorageAuthError",
      provider: "Dropbox",
    });
    expect(location.href).toBe("http://localhost/");
    expect(local.getItem("dbx__refresh_token")).toBe("revoked");
  });

  it("throws a Dropbox StorageAuthError and clears the verifier when the authorization code is rejected", async () => {
    session.setItem("__codeVerifier", "verifier");
    mocks.getAccessTokenFromCode.mockRejectedValue(new Error("invalid_grant"));

    await expect(new DropboxStore().doAuth("bad-code")).rejects.toMatchObject({
      name: "StorageAuthError",
      provider: "Dropbox",
    });
    expect(session.getItem("__codeVerifier")).toBeNull();
    expect(local.getItem("dbx_token")).toBeNull();
  });

  it("still redirects to Dropbox for an explicit user-initiated login without a refresh token", async () => {
    const result = await new DropboxStore().doAuth();

    expect(result).toBe(false);
    expect(location.href).toBe("https://dropbox.test/auth");
  });
});

describe("dropbox storage helper invalid files (data-model.md)", () => {
  const download = (text: string) => ({
    status: 200,
    result: { fileBlob: { text: async () => text } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws an invalid_file PersistedFileError for a downloaded file that is not valid JSON", async () => {
    mocks.filesDownload.mockResolvedValue(download("{not json"));

    const error = await new DropboxStore()
      .readJsonFile("values_2025.json")
      .catch((e) => e);

    expect(error).toBeInstanceOf(PersistedFileError);
    expect(error).toMatchObject({
      code: "invalid_file",
      fileName: "values_2025.json",
      recoverable: true,
    });
  });

  it("returns undefined, not an error, for a missing file", async () => {
    mocks.filesDownload.mockRejectedValue(
      new (DropboxResponseError as any)(409),
    );

    await expect(
      new DropboxStore().readJsonFile("values_2025.json"),
    ).resolves.toBeUndefined();
  });

  it("parses a valid downloaded file", async () => {
    mocks.filesDownload.mockResolvedValue(download('{"a":1}'));

    await expect(
      new DropboxStore().readJsonFile("config.json"),
    ).resolves.toEqual({ a: 1 });
  });
});
