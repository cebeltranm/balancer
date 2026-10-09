import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
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

describe("local dev server .tmp handling (RT-027)", () => {
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
});
