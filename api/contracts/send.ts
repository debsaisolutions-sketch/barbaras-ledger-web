import { requireLedgerUser } from "../../lib/server/ledgerAuth";
import { sendContract, templateRoles, type ContractSigner } from "../../lib/server/docuseal";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const auth = await requireLedgerUser(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as {
    templateId?: number;
    signers?: ContractSigner[];
  } | null;
  const templateId = Number(body?.templateId);
  const signers = Array.isArray(body?.signers) ? body.signers : [];
  if (!Number.isFinite(templateId)) return Response.json({ error: "Choose a contract." }, { status: 400 });

  const roles = await templateRoles(templateId);
  if (!roles.ok) return Response.json({ error: roles.error }, { status: roles.status });

  const prepared: ContractSigner[] = [];
  for (const role of roles.data) {
    const signer = signers.find((row) => row.role === role);
    const name = signer?.name?.trim() || "";
    const email = signer?.email?.trim() || "";
    if (!name || !isEmail(email)) {
      return Response.json({ error: `Enter a name and email for ${role}.` }, { status: 400 });
    }
    prepared.push({ role, name, email });
  }

  const sent = await sendContract({ templateId, signers: prepared });
  if (!sent.ok) return Response.json({ error: sent.error }, { status: sent.status });
  return Response.json({ submissionId: sent.data.submissionId });
}
