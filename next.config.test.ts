import { describe, expect, it } from "vitest";
import nextConfig from "./next.config.mjs";

describe("next root routing", () => {
  it("routes the app root to the live voice dashboard", async () => {
    const redirects =
      typeof nextConfig.redirects === "function" ? await nextConfig.redirects() : [];

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/",
          destination: "/voice",
          permanent: false,
        }),
      ]),
    );
  });
});
