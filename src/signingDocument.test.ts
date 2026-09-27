import { describe, expect, it } from "vitest";
import { signingHtmlFromText } from "./signingDocument";

describe("signingHtmlFromText", () => {
  it("keeps the wording and adds a signature field", () => {
    const html = signingHtmlFromText("Rent is $400\nTenant: Chris");
    expect(html).toContain("Rent is $400");
    expect(html).toContain("Tenant: Chris");
    expect(html).toContain("<br>");
    expect(html).toContain('role="Signer"');
    expect(html).toContain("<signature-field");
  });

  it("escapes wording so it cannot become extra HTML", () => {
    const html = signingHtmlFromText("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
