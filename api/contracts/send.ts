import { sendContract, templateRoles, type ContractSigner } from "../../lib/server/docuseal.js";
import { userIdFromAuthorization } from "../../lib/server/ledgerAuth.js";

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { templateId?: number; signers?: ContractSigner[] };
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

  const body = req.body || {};
  const templateId = Number(body.templateId);
  const signers = Array.isArray(body.signers) ? body.signers : [];
  if (!Number.isFinite(templateId)) {
    res.status(400).json({ error: "Choose a contract." });
    return;
  }

  const roles = await templateRoles(templateId);
  if (!roles.ok) {
    res.status(roles.status).json({ error: roles.error });
    return;
  }

  const prepared: ContractSigner[] = [];
  for (const role of roles.data) {
    const signer = signers.find((row) => row.role === role);
    const name = signer?.name?.trim() || "";
    const email = signer?.email?.trim() || "";
    if (!name || !isEmail(email)) {
      res.status(400).json({ error: `Enter a name and email for ${role}.` });
      return;
    }
    prepared.push({ role, name, email });
  }

  const sent = await sendContract({ templateId, signers: prepared });
  if (!sent.ok) {
    res.status(sent.status).json({ error: sent.error });
    return;
  }
  res.status(200).json({ submissionId: sent.data.submissionId });
}
