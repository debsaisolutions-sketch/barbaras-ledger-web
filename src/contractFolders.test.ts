import { describe, expect, it } from "vitest";
import { visibleDocuSealFolder } from "./contractFolders";

describe("visibleDocuSealFolder", () => {
  it("hides TradeDeskPro contractor folders when no EasyLedger folder is set", () => {
    expect(visibleDocuSealFolder("tdp-abc")).toBe(false);
    expect(visibleDocuSealFolder("_platform")).toBe(true);
    expect(visibleDocuSealFolder("easyledger")).toBe(true);
  });

  it("shows only the configured folder", () => {
    expect(visibleDocuSealFolder("easyledger", "easyledger")).toBe(true);
    expect(visibleDocuSealFolder("_platform", "easyledger")).toBe(false);
  });
});
