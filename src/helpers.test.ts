import { describe, expect, it } from "vitest";
import { ledgerNameForDisplay } from "./helpers";

describe("ledger name", () => {
  it("shows EasyLedger for a blank name and for the old Barbara name", () => {
    expect(ledgerNameForDisplay("")).toBe("EasyLedger");
    expect(ledgerNameForDisplay("  ")).toBe("EasyLedger");
    expect(ledgerNameForDisplay("Barbara")).toBe("EasyLedger");
    expect(ledgerNameForDisplay("Barbara's Ledger")).toBe("EasyLedger");
    expect(ledgerNameForDisplay("Barbara’s Ledger")).toBe("EasyLedger");
  });

  it("keeps a name the owner typed themselves", () => {
    expect(ledgerNameForDisplay("Deb's Rent Book")).toBe("Deb's Rent Book");
  });
});
