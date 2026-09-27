function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain wording plus a DocuSeal signature and date for the signer. */
export function signingHtmlFromText(text: string): string {
  const body = escapeHtml(text.trim()).replace(/\n/g, "<br>\n");
  return `<div style="font-family: Georgia, serif; font-size: 14px; line-height: 1.5;">${body}</div>
<p style="margin-top: 28px;">Signature</p>
<signature-field name="Signature" role="Signer" required="true" style="width: 220px; height: 70px; display: inline-block;"></signature-field>
<p>Date</p>
<date-field name="Date signed" role="Signer" required="true" style="width: 140px; height: 22px; display: inline-block;"></date-field>`;
}
