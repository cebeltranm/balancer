import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

// RT-027: the local dev server must create `.tmp/` when it is missing.
// The server has no exports and listens on a fixed port, so these tests run a
// copy of `server/index.js` in a temporary project layout (`<root>/server`,
// `<root>/.tmp`) with the repo's node_modules linked in.
const BASE_URL = "http://localhost:8181";
const AUTH = { Authorization: "Bearer balancer-local-dev-token" };

let root: string;
let tmpDir: string;
let child: ChildProcess | undefined;

async function waitForPing() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${BASE_URL}/_ping`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("dev server did not start");
}

async function startServer() {
  child = spawn(process.execPath, [path.join(root, "server", "index.js")], {
    stdio: "ignore",
  });
  await waitForPing();
}

async function stopServer() {
  if (!child) return;
  const proc = child;
  child = undefined;
  await new Promise<void>((resolve) => {
    proc.once("exit", () => resolve());
    proc.kill();
  });
}

// Sends the request path as-is (fetch would normalize `..` segments).
function rawPost(
  rawPath: string,
  body = "{}",
  headers: Record<string, string> = AUTH,
) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.request(
      {
        host: "localhost",
        port: 8181,
        method: "POST",
        path: rawPath,
        headers: { ...headers, "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

function listAll(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true }).map(String).sort();
}

describe("local dev server (RT-027, RT-028)", () => {
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "balancer-dev-server-"));
    tmpDir = path.join(root, ".tmp");
    fs.mkdirSync(path.join(root, "server"));
    fs.copyFileSync(
      path.resolve(__dirname, "../../../server/index.js"),
      path.join(root, "server", "index.js"),
    );
    fs.symlinkSync(
      path.resolve(__dirname, "../../../node_modules"),
      path.join(root, "node_modules"),
    );
  });

  afterEach(async () => {
    await stopServer();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("creates a missing .tmp/ on startup", async () => {
    expect(fs.existsSync(tmpDir)).toBe(false);
    await startServer();
    expect(fs.statSync(tmpDir).isDirectory()).toBe(true);
  });

  it("keeps existing .tmp/ files untouched on startup", async () => {
    fs.mkdirSync(tmpDir);
    fs.writeFileSync(path.join(tmpDir, "existing.json"), '{"a":1}');
    await startServer();
    expect(fs.readFileSync(path.join(tmpDir, "existing.json"), "utf8")).toBe(
      '{"a":1}',
    );
    const res = await fetch(`${BASE_URL}/list`, { headers: AUTH });
    expect(res.status).toBe(200);
    expect((await res.json()).map((f: { name: string }) => f.name)).toEqual([
      "existing.json",
    ]);
  });

  it("GET /list creates .tmp/ and returns [] when it was removed while running", async () => {
    await startServer();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const res = await fetch(`${BASE_URL}/list`, { headers: AUTH });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(fs.statSync(tmpDir).isDirectory()).toBe(true);
  });

  it("POST /<name>.json creates .tmp/ and writes the file when it was removed while running", async () => {
    await startServer();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const res = await fetch(`${BASE_URL}/data.json`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    expect(res.status).toBe(200);
    expect(
      JSON.parse(fs.readFileSync(path.join(tmpDir, "data.json"), "utf8")),
    ).toEqual({ hello: "world" });
  });

  it("returns 401 and does not create .tmp/ for unauthorized requests", async () => {
    await startServer();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const list = await fetch(`${BASE_URL}/list`);
    expect(list.status).toBe(401);
    const write = await fetch(`${BASE_URL}/data.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(write.status).toBe(401);
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  describe("JSON write path safety (RT-028)", () => {
    // Anything outside `.tmp/` that a traversal could create.
    const outside = () => listAll(root).filter((f) => !f.startsWith(".tmp"));
    const serverFiles = ["node_modules", "server", "server/index.js"];

    async function expectRejected(rawPath: string) {
      await startServer();
      const before = listAll(tmpDir);
      const res = await rawPost(rawPath);
      expect(res.status).toBe(400);
      expect(JSON.parse(res.body)).toHaveProperty("error");
      expect(listAll(tmpDir)).toEqual(before);
      expect(outside().filter((f) => !serverFiles.includes(f))).toEqual([]);
      expect(fs.existsSync(path.join(path.dirname(root), "escape.json"))).toBe(
        false,
      );
    }

    it("still writes a safe flat name under .tmp/", async () => {
      await startServer();
      const res = await rawPost("/values_2025.json", '{"a":1}');
      expect(res.status).toBe(200);
      expect(
        JSON.parse(
          fs.readFileSync(path.join(tmpDir, "values_2025.json"), "utf8"),
        ),
      ).toEqual({ a: 1 });
    });

    it("rejects a percent-encoded traversal", async () => {
      await expectRejected("/..%2f..%2fescape.json");
    });

    it("rejects a raw traversal path", async () => {
      await expectRejected("/../escape.json");
    });

    it("rejects a nested path", async () => {
      await expectRejected("/sub/x.json");
    });

    it("rejects an encoded nested path", async () => {
      await expectRejected("/sub%2fx.json");
    });

    it("rejects a backslash name", async () => {
      await expectRejected("/..%5Cescape.json");
    });

    it("rejects a malformed percent-encoding", async () => {
      await expectRejected("/%E0%A4%A.json");
    });

    it("rejects a NUL byte in the name", async () => {
      await expectRejected("/x%00.json");
    });

    it("returns 401 and writes nothing for an unauthorized traversal", async () => {
      await startServer();
      const before = listAll(tmpDir);
      const res = await rawPost("/..%2f..%2fescape.json", "{}", {});
      expect(res.status).toBe(401);
      expect(listAll(tmpDir)).toEqual(before);
      expect(fs.existsSync(path.join(path.dirname(root), "escape.json"))).toBe(
        false,
      );
    });

    it("leaves existing .tmp/ files unchanged after a rejected request", async () => {
      fs.mkdirSync(tmpDir);
      fs.writeFileSync(path.join(tmpDir, "existing.json"), '{"a":1}');
      await expectRejected("/sub/existing.json");
      expect(fs.readFileSync(path.join(tmpDir, "existing.json"), "utf8")).toBe(
        '{"a":1}',
      );
    });
  });
});
