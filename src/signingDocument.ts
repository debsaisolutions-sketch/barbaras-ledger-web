function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SigningParty = { name: string; role: string };

/** Plain wording plus a DocuSeal signature and date for each signer. */
export function signingHtmlFromText(
  text: string,
  signers: SigningParty[] = [{ name: "Signer", role: "Signer" }]
): string {
  const body = escapeHtml(text.trim()).replace(/\n/g, "<br>\n");
  const blocks = signers
    .map((signer) => {
      const heading = signer.role === "Signer" ? "Signature" : `${signer.name} signature`;
      return `<p style="margin-top: 28px;">${escapeHtml(heading)}</p>
<signature-field name="${escapeHtml(signer.role)} signature" role="${escapeHtml(signer.role)}" required="true" style="width: 220px; height: 70px; display: inline-block;"></signature-field>
<p>Date</p>
<date-field name="${escapeHtml(signer.role)} date" role="${escapeHtml(signer.role)}" required="true" style="width: 140px; height: 22px; display: inline-block;"></date-field>`;
    })
    .join("\n");
  return `<div style="font-family: Georgia, serif; font-size: 14px; line-height: 1.5;">${body}</div>
${blocks}`;
}
