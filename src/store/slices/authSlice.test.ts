import { describe, it, expect } from "vitest";
import authReducer, { setUser, setNdaAccepted, setLoading, reset } from "./authSlice";

describe("authSlice", () => {
  it("initial state", () => {
    expect(authReducer(undefined, { type: "unknown" })).toEqual({
      user: null,
      ndaAccepted: null,
      loading: true,
      isAuthenticated: false,
      roles: [],
      appkitWalletEmail: null,
    });
  });

  it("setUser", () => {
    const state = authReducer(
      undefined,
      setUser({ id: "1", email: "a@b.com", name: "A" })
    );
    expect(state.user).toEqual({ id: "1", email: "a@b.com", name: "A" });
  });

  it("setNdaAccepted", () => {
    const state = authReducer(undefined, setNdaAccepted(true));
    expect(state.ndaAccepted).toBe(true);
  });

  it("setLoading", () => {
    const state = authReducer(undefined, setLoading(false));
    expect(state.loading).toBe(false);
  });

  it("reset clears user and ndaAccepted", () => {
    const state = authReducer(
      {
        user: { id: "1", email: "a@b.com" },
        ndaAccepted: true,
        loading: false,
        isAuthenticated: true,
        roles: [],
        appkitWalletEmail: null,
      },
      reset()
    );
    expect(state.user).toBeNull();
    expect(state.ndaAccepted).toBeNull();
    expect(state.loading).toBe(false);
  });
});
