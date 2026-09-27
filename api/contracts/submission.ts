import { completedContractPdf } from "../../lib/server/docuseal.js";
import { userIdFromAuthorization } from "../../lib/server/ledgerAuth.js";

type Req = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { submissionId?: string };
};
type Res = {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
  send: (body: Buffer) => void;
};

function header(req: Req, name: string): string {
  const value = req.headers[name.toLowerCase()] ?? req.headers[name];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  const auth = await userIdFromAuthorization(header(req, "authorization"));
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const url = new URL(req.url || "/", "https://easyledger.app");
  let submissionId = url.searchParams.get("submissionId") || "";
  if (req.method === "POST") submissionId = req.body?.submissionId || submissionId;
  submissionId = submissionId.trim();
  if (!submissionId) {
    res.status(400).json({ error: "Missing contract." });
    return;
  }

  const result = await completedContractPdf(submissionId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  if (!result.data.completed || !result.data.pdf) {
    res.status(200).json({ status: result.data.status, completed: false });
    return;
  }
  if (req.method === "GET") {
    res.status(200).json({ status: "completed", completed: true, fileName: result.data.fileName });
    return;
  }
  const fileName = (result.data.fileName || "signed-contract.pdf").replace(/"/g, "");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.status(200);
  res.send(Buffer.from(result.data.pdf));
}
