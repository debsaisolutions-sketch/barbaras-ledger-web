import { visibleDocuSealFolder } from "../../src/contractFolders.js";
import { signingHtmlFromText } from "../../src/signingDocument.js";

const DOCUSEAL_API_URL = "https://api.docuseal.com";

export type ContractTemplate = {
  id: number;
  name: string;
  roles: string[];
};

export type ContractSigner = {
  role: string;
  name: string;
  email: string;
};

type DocuSealResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function apiKey(): string {
  return (process.env.DOCUSEAL_API_KEY || "").trim();
}

function folderFilter(): string {
  return (process.env.DOCUSEAL_FOLDER || "").trim();
}

async function docuseal(path: string, init?: RequestInit): Promise<Response> {
  const key = apiKey();
  return fetch(`${DOCUSEAL_API_URL}${path}`, {
    ...init,
    headers: {
      "X-Auth-Token": key,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

function rowsFrom(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter((row) => row && typeof row === "object") as Record<string, unknown>[];
  if (body && typeof body === "object") {
    const data = (body as { data?: unknown }).data;
    if (Array.isArray(data)) return data.filter((row) => row && typeof row === "object") as Record<string, unknown>[];
  }
  return [];
}

function rolesFrom(template: Record<string, unknown>): string[] {
  const submitters = template.submitters;
  if (!Array.isArray(submitters)) return ["First Party"];
  const roles = submitters
    .map((row) => (row && typeof row === "object" ? String((row as { name?: string }).name || "").trim() : ""))
    .filter(Boolean);
  return roles.length > 0 ? roles : ["First Party"];
}

export async function listContractTemplates(): Promise<DocuSealResult<ContractTemplate[]>> {
  if (!apiKey()) return { ok: false, status: 500, error: "DocuSeal is not configured yet." };
  const res = await docuseal("/templates?limit=100");
  if (!res.ok) return { ok: false, status: res.status, error: "Could not load contract templates." };
  const body = await res.json();
  const allowed = folderFilter();
  const templates = rowsFrom(body)
    .filter((row) => visibleDocuSealFolder(String(row.folder_name || ""), allowed))
    .filter((row) => row.archived !== true)
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name || "Contract"),
      roles: rolesFrom(row),
    }))
    .filter((row) => Number.isFinite(row.id));
  return { ok: true, data: templates };
}

export async function templateRoles(templateId: number): Promise<DocuSealResult<string[]>> {
  if (!apiKey()) return { ok: false, status: 500, error: "DocuSeal is not configured yet." };
  const res = await docuseal(`/templates/${templateId}`);
  if (!res.ok) return { ok: false, status: res.status, error: "That contract template was not found." };
  const template = (await res.json()) as Record<string, unknown>;
  if (!visibleDocuSealFolder(String(template.folder_name || ""), folderFilter())) {
    return { ok: false, status: 403, error: "That contract template is not available in EasyLedger." };
  }
  return { ok: true, data: rolesFrom(template) };
}

function expireAt(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

export async function sendContract(opts: {
  templateId: number;
  signers: ContractSigner[];
}): Promise<DocuSealResult<{ submissionId: string }>> {
  if (!apiKey()) return { ok: false, status: 500, error: "DocuSeal is not configured yet." };
  const res = await docuseal("/submissions", {
    method: "POST",
    body: JSON.stringify({
      template_id: opts.templateId,
      send_email: true,
      expire_at: expireAt(30),
      submitters: opts.signers.map((signer) => ({
        role: signer.role,
        name: signer.name,
        email: signer.email,
      })),
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: "DocuSeal could not send this contract." };
  const body = await res.json();
  const first = rowsFrom(body)[0] || (body && typeof body === "object" ? (body as Record<string, unknown>) : {});
  const submissionId = first.submission_id ?? first.id;
  if (submissionId == null || submissionId === "") {
    return { ok: false, status: 502, error: "DocuSeal did not return a contract id." };
  }
  return { ok: true, data: { submissionId: String(submissionId) } };
}

export async function sendHtmlContract(opts: {
  name: string;
  text: string;
  signerName: string;
  signerEmail: string;
}): Promise<DocuSealResult<{ submissionId: string }>> {
  if (!apiKey()) return { ok: false, status: 500, error: "DocuSeal is not configured yet." };
  const res = await docuseal("/submissions/html", {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      send_email: true,
      expire_at: expireAt(30),
      documents: [
        {
          name: opts.name,
          html: signingHtmlFromText(opts.text),
          size: "Letter",
        },
      ],
      submitters: [
        {
          role: "Signer",
          name: opts.signerName,
          email: opts.signerEmail,
        },
      ],
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: "DocuSeal could not send this contract." };
  const body = await res.json();
  const first = rowsFrom(body)[0] || (body && typeof body === "object" ? (body as Record<string, unknown>) : {});
  const submissionId = first.submission_id ?? first.id;
  if (submissionId == null || submissionId === "") {
    return { ok: false, status: 502, error: "DocuSeal did not return a contract id." };
  }
  return { ok: true, data: { submissionId: String(submissionId) } };
}

function documentUrl(body: unknown): string {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const pools = [root.documents, ...rowsFrom(root.submitters).map((row) => row.documents)];
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    for (const doc of pool) {
      if (doc && typeof doc === "object" && typeof (doc as { url?: string }).url === "string") {
        return (doc as { url: string }).url;
      }
    }
  }
  if (typeof root.combined_document_url === "string") return root.combined_document_url;
  return "";
}

export async function completedContractPdf(submissionId: string): Promise<
  DocuSealResult<{ status: string; completed: boolean; pdf?: Uint8Array; fileName?: string }>
> {
  if (!apiKey()) return { ok: false, status: 500, error: "DocuSeal is not configured yet." };
  const res = await docuseal(`/submissions/${encodeURIComponent(submissionId)}`);
  if (!res.ok) return { ok: false, status: res.status, error: "Could not check this contract." };
  const body = (await res.json()) as Record<string, unknown>;
  const status = String(body.status || "pending");
  const submitters = rowsFrom(body.submitters);
  const completed =
    status.toLowerCase() === "completed" ||
    (submitters.length > 0 && submitters.every((row) => String(row.status || "").toLowerCase() === "completed"));
  if (!completed) return { ok: true, data: { status, completed: false } };

  const url = documentUrl(body);
  if (!url) return { ok: false, status: 502, error: "The signed contract file is not ready yet." };
  const fileRes = await fetch(url, { headers: { "X-Auth-Token": apiKey() } });
  if (!fileRes.ok) return { ok: false, status: fileRes.status, error: "Could not download the signed contract." };
  const pdf = new Uint8Array(await fileRes.arrayBuffer());
  if (pdf.byteLength < 5) return { ok: false, status: 502, error: "The signed contract file was empty." };
  const template = body.template && typeof body.template === "object" ? (body.template as { name?: string }) : {};
  const name = String(body.name || template.name || "Signed contract");
  return { ok: true, data: { status: "completed", completed: true, pdf, fileName: `${name}.pdf` } };
}
