import { requireLedgerUser } from "../../lib/server/ledgerAuth";
import { listContractTemplates } from "../../lib/server/docuseal";

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const auth = await requireLedgerUser(request);
  if (auth instanceof Response) return auth;
  const listed = await listContractTemplates();
  if (!listed.ok) return Response.json({ error: listed.error }, { status: listed.status });
  return Response.json({ templates: listed.data });
}
