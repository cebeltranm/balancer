import { describe, expect, it } from 'vitest';
import { isDesktop } from '@/helpers/browser';

describe('browser helper', () => {
  it('detects desktop by width threshold', () => {
    (window as any).innerWidth = 991;
    expect(isDesktop()).toBe(false);

    (window as any).innerWidth = 992;
    expect(isDesktop()).toBe(true);
  });
});
