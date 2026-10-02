// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Router } from "vue-router";
import { CHECK_AUTHENTICATE, EVENTS } from "@/helpers/events";

// RT-021: sensitive routes (every route except `/` and `/expenses`) trigger an
// authentication check. See specs/features/authentication.md.

// The shared test setup replaces `window` with a minimal mock without history.
vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return {
    ...actual,
    createWebHistory: () => actual.createMemoryHistory(),
  };
});

vi.mock("@/views/HomeView.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/Transactions.vue", () => ({
  default: { render: () => null },
}));
vi.mock("@/views/Expenses.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/Values.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/Budget.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/Assets.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/portafolio/index.vue", () => ({
  default: { render: () => null },
}));
vi.mock("@/views/Balance.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/Settings.vue", () => ({ default: { render: () => null } }));
vi.mock("@/views/Accounts.vue", () => ({ default: { render: () => null } }));

describe("router authentication guard (RT-021)", () => {
  let router: Router;
  const onCheck = vi.fn();

  beforeAll(async () => {
    router = (await import("@/router")).default;
    await router.push("/");
    EVENTS.on(CHECK_AUTHENTICATE, onCheck);
  });

  afterEach(() => {
    onCheck.mockClear();
  });

  it.each(["/assets", "/investments", "/balance", "/settings/general"])(
    "emits an auth check for sensitive route %s",
    async (path) => {
      await router.push(path);
      expect(onCheck).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["/", "/expenses"])(
    "does not emit an auth check for %s",
    async (path) => {
      await router.push("/assets");
      onCheck.mockClear();
      await router.push(path);
      expect(onCheck).not.toHaveBeenCalled();
    },
  );
});
