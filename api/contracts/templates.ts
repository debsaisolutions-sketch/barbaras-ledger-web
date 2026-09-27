import { listContractTemplates } from "../../lib/server/docuseal";
import { userIdFromAuthorization } from "../../lib/server/ledgerAuth";

type Req = { method?: string; headers: Record<string, string | string[] | undefined> };
type Res = { status: (code: number) => { json: (body: unknown) => void } };

function header(req: Req, name: string): string {
  const value = req.headers[name.toLowerCase()] ?? req.headers[name];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  const auth = await userIdFromAuthorization(header(req, "authorization"));
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }
  const listed = await listContractTemplates();
  if (!listed.ok) {
    res.status(listed.status).json({ error: listed.error });
    return;
  }
  res.status(200).json({ templates: listed.data });
}
