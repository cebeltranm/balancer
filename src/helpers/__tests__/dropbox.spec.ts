import { beforeEach, describe, expect, it, vi } from "vitest";

// RT-020: Dropbox token-refresh and authorization-code failures must surface a
// StorageAuthError instead of being logged or silently redirecting.

const mocks = vi.hoisted(() => ({
  filesGetMetadata: vi.fn(),
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
  }
  return { Dropbox, DropboxAuth, DropboxResponseError };
});

import { DropboxResponseError } from "dropbox";
import DropboxStore from "@/helpers/storage/dropbox";

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
