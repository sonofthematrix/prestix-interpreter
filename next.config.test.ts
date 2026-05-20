import { describe, expect, it } from "vitest";
import nextConfig from "./next.config.mjs";

describe("next root routing", () => {
  it("does not redirect root via next.config (handled in src/app/page.tsx)", async () => {
    const redirects =
      typeof nextConfig.redirects === "function" ? await nextConfig.redirects() : [];

    expect(redirects).toEqual([]);
  });
});
