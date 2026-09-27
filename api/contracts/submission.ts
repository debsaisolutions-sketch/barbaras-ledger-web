import { requireLedgerUser } from "../../lib/server/ledgerAuth";
import { completedContractPdf } from "../../lib/server/docuseal";

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }
  const auth = await requireLedgerUser(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  let submissionId = url.searchParams.get("submissionId") || "";
  if (request.method === "POST") {
    const body = (await request.json().catch(() => null)) as { submissionId?: string } | null;
    submissionId = body?.submissionId || submissionId;
  }
  submissionId = submissionId.trim();
  if (!submissionId) return Response.json({ error: "Missing contract." }, { status: 400 });

  const result = await completedContractPdf(submissionId);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  if (!result.data.completed || !result.data.pdf) {
    return Response.json({ status: result.data.status, completed: false });
  }
  if (request.method === "GET") {
    return Response.json({ status: "completed", completed: true, fileName: result.data.fileName });
  }
  return new Response(new Blob([result.data.pdf], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(result.data.fileName || "signed-contract.pdf").replace(/"/g, "")}"`,
    },
  });
}
