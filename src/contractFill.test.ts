import { describe, expect, it } from "vitest";
import { builtinTemplate } from "./builtinTemplates";
import { fillContractFromProperty, type ContractProfile } from "./contractFill";

const blankPeople = {
  tenantName: "",
  tenantEmail: "",
  tenantPhone: "",
  coTenantName: "",
  coTenantEmail: "",
  coTenantPhone: "",
  address: "",
  propertyName: "",
  monthlyRent: 0,
  rentDueDay: 1,
  leaseStartDate: "",
  leaseEndDate: "",
  securityDeposit: 0,
  rentFrequency: "monthly" as const,
  rentAnchorDate: "",
  rentIntervalDays: null,
};

function profile(overrides: Partial<ContractProfile>): ContractProfile {
  return { ...blankPeople, ...overrides };
}

describe("fill a rental agreement from the property", () => {
  const rental = builtinTemplate("rental-agreement")?.content ?? "";

  it("copies names, address, lease dates, rent, and deposit", () => {
    const filled = fillContractFromProperty(
      rental,
      profile({
        tenantName: "Chris Campbell",
        tenantEmail: "chris@example.com",
        tenantPhone: "555-0100",
        coTenantName: "Madesyn Campbell",
        coTenantEmail: "madesyn@example.com",
        coTenantPhone: "555-0199",
        address: "100 River Road",
        propertyName: "RV",
        monthlyRent: 1000,
        rentDueDay: 1,
        leaseStartDate: "2026-05-01",
        leaseEndDate: "2027-04-30",
        securityDeposit: 500,
      })
    );

    expect(filled).toContain("entered into on May 1, 2026");
    expect(filled).toContain("TENANT: Chris Campbell and Madesyn Campbell");
    expect(filled).toContain("Address: 100 River Road");
    expect(filled).toContain("PROPERTY ADDRESS: 100 River Road");
    expect(filled).toContain("This lease begins on May 1, 2026 and ends on Apr 30, 2027.");
    expect(filled).toContain("pay $1,000.00 per month, due on the 1st day of each month.");
    expect(filled).toContain("deposited $500.00 as a security deposit");
    expect(filled).toContain("LANDLORD: _____________________________________________");
    expect(filled).toContain("DATE: _____________");
  });

  it("uses the saved every-two-weeks amount instead of calling it monthly", () => {
    const filled = fillContractFromProperty(
      rental,
      profile({
        tenantName: "Chris Campbell",
        monthlyRent: 400,
        rentFrequency: "biweekly",
        rentAnchorDate: "2026-09-23",
        leaseStartDate: "2026-09-19",
      })
    );

    expect(filled).toContain("pay $400.00 every two weeks, starting Sep 23, 2026.");
    expect(filled).not.toContain("per month");
    expect(filled).toContain("ends on _____________");
  });

  it("leaves money and date blanks empty when the property does not have them", () => {
    const filled = fillContractFromProperty(rental, profile({ tenantName: "Connie Williams" }));
    expect(filled).toContain("TENANT: Connie Williams");
    expect(filled).toContain("pay $__________ per month");
    expect(filled).toContain("deposited $__________");
    expect(filled).toContain("begins on _____________");
  });
});
