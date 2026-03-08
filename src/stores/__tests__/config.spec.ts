import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useConfigStore } from "@/stores/config";
import { readJsonFile } from "@/helpers/files";

vi.mock("@/helpers/files", () => ({
  readJsonFile: vi.fn(),
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
});
