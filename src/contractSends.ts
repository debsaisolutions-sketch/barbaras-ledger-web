import { supabase } from "./lib/supabase";

export type ContractSend = {
  id: string;
  propertyId: string;
  templateId: string;
  templateName: string;
  signerName: string;
  signerEmail: string;
  submissionId: string;
  status: "sent" | "signed";
  documentId: string | null;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): ContractSend {
  return {
    id: String(row.id),
    propertyId: String(row.property_id || ""),
    templateId: String(row.template_id || ""),
    templateName: String(row.template_name || ""),
    signerName: String(row.signer_name || ""),
    signerEmail: String(row.signer_email || ""),
    submissionId: String(row.submission_id || ""),
    status: row.status === "signed" ? "signed" : "sent",
    documentId: row.document_id ? String(row.document_id) : null,
    createdAt: String(row.created_at || ""),
  };
}

async function userId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in required.");
  return data.user.id;
}

export async function listContractSends(propertyId: string): Promise<ContractSend[]> {
  const uid = await userId();
  const { data, error } = await supabase
    .from("barbara_contract_sends")
    .select("*")
    .eq("user_id", uid)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function insertContractSend(input: {
  propertyId: string;
  templateId: string;
  templateName: string;
  signerName: string;
  signerEmail: string;
  submissionId: string;
}): Promise<void> {
  const uid = await userId();
  const { error } = await supabase.from("barbara_contract_sends").insert({
    user_id: uid,
    property_id: input.propertyId,
    template_id: input.templateId,
    template_name: input.templateName,
    signer_name: input.signerName,
    signer_email: input.signerEmail,
    submission_id: input.submissionId,
    status: "sent",
  });
  if (error) throw new Error(error.message);
}

export async function markContractSigned(id: string, documentId: string): Promise<void> {
  const uid = await userId();
  const { error } = await supabase
    .from("barbara_contract_sends")
    .update({ status: "signed", document_id: documentId })
    .eq("user_id", uid)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
