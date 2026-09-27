import { describe, expect, it } from "vitest";
import { fillContractFromOccupants, occupantLabel } from "./occupants";

const rental = `LANDLORD: _____________________________________________
Address: ______________________________________________
Phone: _______________________________________________

TENANT: ______________________________________________
Address: ______________________________________________
Phone: _______________________________________________`;

const chrisAndMadesyn = {
  tenantName: "Chris Campbell",
  tenantEmail: "chris@example.com",
  tenantPhone: "555-0100",
  coTenantName: "Madesyn Campbell",
  coTenantEmail: "madesyn@example.com",
  coTenantPhone: "555-0199",
};

describe("lease occupants", () => {
  it("shows both names", () => {
    expect(occupantLabel(chrisAndMadesyn)).toBe("Chris Campbell and Madesyn Campbell");
  });

  it("fills both people into the tenant lines and leaves the landlord phone blank", () => {
    const filled = fillContractFromOccupants(rental, chrisAndMadesyn);
    expect(filled).toContain("TENANT: Chris Campbell and Madesyn Campbell");
    expect(filled).toContain("Phone: Chris Campbell 555-0100; Madesyn Campbell 555-0199");
    expect(filled).toContain("Email: Chris Campbell chris@example.com; Madesyn Campbell madesyn@example.com");
    expect(filled).toContain("Phone: _______________________________________________");
  });
});
