import { sendHtmlContract } from "../../lib/server/docuseal.js";
import { userIdFromAuthorization } from "../../lib/server/ledgerAuth.js";

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { name?: string; text?: string; signers?: { name?: string; email?: string }[] };
};
type Res = { status: (code: number) => { json: (body: unknown) => void } };

function header(req: Req, name: string): string {
  const value = req.headers[name.toLowerCase()] ?? req.headers[name];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  const auth = await userIdFromAuthorization(header(req, "authorization"));
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const name = req.body?.name?.trim() || "";
  const text = req.body?.text?.trim() || "";
  const signers = (req.body?.signers || [])
    .map((signer) => ({ name: signer.name?.trim() || "", email: signer.email?.trim() || "" }))
    .filter((signer) => signer.name || signer.email);
  if (!name) {
    res.status(400).json({ error: "Enter a document name." });
    return;
  }
  if (text.length < 20) {
    res.status(400).json({ error: "Add the contract wording before sending." });
    return;
  }
  if (text.length > 200000) {
    res.status(400).json({ error: "This document is too long to send." });
    return;
  }
  if (signers.length === 0 || signers.some((signer) => !signer.name || !isEmail(signer.email))) {
    res.status(400).json({ error: "Enter a name and email for each person who should sign." });
    return;
  }

  const sent = await sendHtmlContract({ name, text, signers });
  if (!sent.ok) {
    res.status(sent.status).json({ error: sent.error });
    return;
  }
  res.status(200).json({ submissionId: sent.data.submissionId });
}
