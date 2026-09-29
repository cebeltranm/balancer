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

  it("computes the same composition totals for sparse data and explicit zeros (RT-019)", async () => {
    const sparse = {
      Equities: { US: { ETF: 0.6 }, Europe: { ETF: 0.4 } },
    };
    const withZeros = {
      Equities: {
        US: { ETF: 0.6, MutualFund: 0 },
        Europe: { ETF: 0.4, MutualFund: 0 },
        Global: { ETF: 0, MutualFund: 0 },
      },
      Cash: { US: { ETF: 0, MutualFund: 0 } },
    };

    vi.mocked(readJsonFile).mockResolvedValue({ inv_composition: sparse });
    const store = useConfigStore();
    await store.loadConfig(true);
    const sparseByClass = store.invCompositionByAssetClass;
    const sparseByRegion = store.invCompositionByRegion;

    vi.mocked(readJsonFile).mockResolvedValue({ inv_composition: withZeros });
    await store.loadConfig(true);

    expect(sparseByClass.value).toBeCloseTo(1);
    expect(store.invCompositionByAssetClass.value).toBeCloseTo(1);
    expect(store.invCompositionByAssetClass.Equities.value).toBeCloseTo(
      sparseByClass.Equities.value,
    );
    expect(store.invCompositionByRegion.US.value).toBeCloseTo(
      sparseByRegion.US.value,
    );
    expect(store.invCompositionByRegion.Europe.value).toBeCloseTo(
      sparseByRegion.Europe.value,
    );
    expect(sparseByRegion.Global).toBeUndefined();
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
