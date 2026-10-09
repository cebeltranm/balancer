import { afterEach, describe, expect, it, vi } from "vitest";

const { useRegisterSW } = vi.hoisted(() => ({
  useRegisterSW: vi.fn().mockReturnValue({ updateServiceWorker: vi.fn() }),
}));
vi.mock("virtual:pwa-register/vue", () => ({
  useRegisterSW,
}));

import { initPWA } from "@/helpers/pwa";

function registerOptions() {
  initPWA();
  return useRegisterSW.mock.calls[useRegisterSW.mock.calls.length - 1][0];
}

describe("pwa helper", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useRegisterSW.mockClear();
  });

  it("registers service worker with expected options", () => {
    initPWA();

    expect(useRegisterSW).toHaveBeenCalledTimes(1);
    expect(useRegisterSW).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onRegistered: expect.any(Function),
        onOfflineReady: expect.any(Function),
        onNeedRefresh: expect.any(Function),
      }),
    );
  });

  // RT-025: registration failure is console-only.
  it("handles registration failure with a console error only", () => {
    const options = registerOptions();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(options.onRegisterError).toEqual(expect.any(Function));
    expect(() => options.onRegisterError(new Error("boom"))).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("checks for service worker updates every 120 seconds", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const update = vi.fn().mockResolvedValue(undefined);
    const options = registerOptions();

    options.onRegistered({ update });
    expect(update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(120000);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
