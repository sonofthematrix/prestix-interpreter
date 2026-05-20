import { describe, expect, it } from "vitest";
import {
  PRIMARY_INTERPRETER_ROUTE,
  getVoiceSurfaceIntro,
} from "./uiEntry";

describe("primary interpreter UI entry", () => {
  it("uses /voice as the primary UI route", () => {
    expect(PRIMARY_INTERPRETER_ROUTE).toBe("/voice");
  });

  it("describes the voice surface as the primary room instead of legacy UI", () => {
    expect(getVoiceSurfaceIntro()).toEqual({
      badge: "Primary voice room",
      hint: "Assistant + interpreter on one screen.",
    });
  });
});
