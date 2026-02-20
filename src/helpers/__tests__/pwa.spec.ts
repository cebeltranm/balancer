import { describe, expect, it, vi } from 'vitest';

const { useRegisterSW } = vi.hoisted(() => ({
  useRegisterSW: vi.fn().mockReturnValue({ updateServiceWorker: vi.fn() }),
}));
vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW,
}));

import { initPWA } from '@/helpers/pwa';

describe('pwa helper', () => {
  it('registers service worker with expected options', () => {
    initPWA();

    expect(useRegisterSW).toHaveBeenCalledTimes(1);
    expect(useRegisterSW).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onRegistered: expect.any(Function),
        onOfflineReady: expect.any(Function),
      })
    );
  });
});
