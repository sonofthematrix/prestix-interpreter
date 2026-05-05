import { describe, it, expect } from "vitest";
import { getSignInUrl } from "@/lib/api";

describe("api client", () => {
  it("getSignInUrl returns URL with callbackUrl", () => {
    const url = getSignInUrl("https://example.com/callback");
    expect(url).toContain("/api/auth/signin");
    expect(url).toContain("callbackUrl=");
    expect(decodeURIComponent(url)).toContain("https://example.com/callback");
  });

  it("getSignInUrl with empty string still produces valid URL", () => {
    const url = getSignInUrl("");
    expect(url).toMatch(/\/api\/auth\/signin\?callbackUrl=/);
  });
});
