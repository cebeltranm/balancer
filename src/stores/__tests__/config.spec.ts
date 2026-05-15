import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useConfigStore } from "@/stores/config";
import { readJsonFile, writeJsonFile } from "@/helpers/files";

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

describe("config store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("loads config and computes composition by asset class and region", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({
      inv_composition: {
        Equities: {
          US: { ETF: 60 },
          Europe: { ETF: 20 },
        },
        Cash: {
          US: { MMF: 20 },
        },
      },
    });

    const store = useConfigStore();
    await store.loadConfig(true);

    expect(store.invCompositionByAssetClass.Equities.value).toBe(80);
    expect(store.invCompositionByAssetClass.value).toBe(100);
    expect(store.invCompositionByRegion.US.value).toBe(80);
    expect(store.invCompositionByRegion.Europe.value).toBe(20);
  });

  it("applies default data for missing additive config structures", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({});

    const store = useConfigStore();
    await store.loadConfig(true);

    expect(store.config).toEqual({
      stock_api: {},
      inv_composition: {},
    });
    expect(store.invCompositionByAssetClass).toEqual({});
    expect(store.invCompositionByRegion).toEqual({});
  });

  it("does not rewrite older valid config files just to add default structures", async () => {
    vi.mocked(readJsonFile).mockResolvedValue({});

    const store = useConfigStore();
    await store.loadConfig(true);

    expect(writeJsonFile).not.toHaveBeenCalled();
  });

  it("saves config and updates local state", async () => {
    vi.mocked(writeJsonFile).mockResolvedValue(true);

    const store = useConfigStore();
    const nextConfig = {
      stock_api: { type: "rapidapi", host: "host", key: "key" },
      inv_composition: { Cash: { US: { ETF: 1 } } },
    };

    const result = await store.saveConfig(nextConfig);

    expect(result).toBe(true);
    expect(writeJsonFile).toHaveBeenCalledWith("config.json", nextConfig);
    expect(store.config).toEqual(nextConfig);
  });
});
