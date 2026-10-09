import { mkdtempSync, readdirSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// RT-025: generated manifest / service-worker output assertions.
describe("generated PWA output", () => {
  let outDir: string;
  let manifest: any;
  let sw: string;

  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), "balancer-pwa-"));
    await build({
      configFile: join(process.cwd(), "vite.config.ts"),
      logLevel: "silent",
      build: { outDir, emptyOutDir: true },
    });
    manifest = JSON.parse(
      readFileSync(join(outDir, "manifest.webmanifest"), "utf8"),
    );
    sw = readFileSync(join(outDir, "sw.js"), "utf8");
  }, 240000);

  afterAll(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("generates a manifest with app identity and icons", () => {
    expect(manifest.name).toBe("Balancer");
    expect(manifest.short_name).toBe("Balancer");
    expect(manifest.theme_color).toBe("#ffffff");
    const icons = manifest.icons.map((i: any) => [i.sizes, i.type, i.purpose]);
    expect(icons).toEqual(
      expect.arrayContaining([
        ["192x192", "image/png", undefined],
        ["512x512", "image/png", undefined],
        ["512x512", "image/png", "any maskable"],
      ]),
    );
  });

  it("generates a service worker that precaches the app shell and assets", () => {
    expect(sw).toContain("index.html");
    expect(
      readdirSync(join(outDir, "assets")).some((f) => f.endsWith(".js")),
    ).toBe(true);
    expect(sw).toMatch(/assets\/[^"']+\.js/);
    expect(sw).toMatch(/assets\/[^"']+\.css/);
  });

  it("enables outdated cache cleanup", () => {
    expect(sw).toMatch(/cleanupOutdatedCaches/);
  });
});
