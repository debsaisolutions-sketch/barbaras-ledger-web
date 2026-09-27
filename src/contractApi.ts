import { supabase } from "./lib/supabase";

export type ContractTemplateOption = {
  id: number;
  name: string;
  roles: string[];
};

async function authHeaders(json = false): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required.");
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || "Something went wrong with the contract.";
}

export async function fetchContractTemplates(): Promise<ContractTemplateOption[]> {
  const res = await fetch("/api/contracts/templates", { headers: await authHeaders() });
  if (!res.ok) throw new Error(await errorMessage(res));
  const body = (await res.json()) as { templates?: ContractTemplateOption[] };
  return body.templates || [];
}

export async function sendContractForSignature(input: {
  templateId: number;
  signers: { role: string; name: string; email: string }[];
}): Promise<string> {
  const res = await fetch("/api/contracts/send", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const body = (await res.json()) as { submissionId?: string };
  if (!body.submissionId) throw new Error("The contract was not sent.");
  return body.submissionId;
}

export async function contractSignatureStatus(submissionId: string): Promise<boolean> {
  const res = await fetch(`/api/contracts/submission?submissionId=${encodeURIComponent(submissionId)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const body = (await res.json()) as { completed?: boolean };
  return Boolean(body.completed);
}

export async function downloadSignedContract(submissionId: string): Promise<Blob> {
  const res = await fetch("/api/contracts/submission", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ submissionId }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  if (res.headers.get("content-type")?.includes("application/json")) {
    throw new Error("This contract is not signed yet.");
  }
  return res.blob();
}
