import { useEffect, useState, type FormEvent } from "react";
import { addDocumentWithFile, type Property } from "../store";
import {
  contractSignatureStatus,
  downloadSignedContract,
  fetchContractTemplates,
  sendContractForSignature,
  type ContractTemplateOption,
} from "../contractApi";
import { insertContractSend, listContractSends, markContractSigned, type ContractSend } from "../contractSends";
import { leaseOccupants } from "../occupants";
import { fmtDate } from "../helpers";

export default function ContractPanel({
  property,
  onSaved,
}: {
  property: Property;
  onSaved: () => void;
}) {
  const [sends, setSends] = useState<ContractSend[]>([]);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplateOption[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [signers, setSigners] = useState<{ role: string; name: string; email: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadSends() {
    setSends(await listContractSends(property.id));
  }

  useEffect(() => {
    void loadSends().catch((err) => setError((err as Error).message));
  }, [property.id]);

  const people = leaseOccupants(property);

  function signersFor(roles: string[]) {
    return roles.map((role, index) => ({
      role,
      name:
        roles.length === 1 && index === 0
          ? people.map((person) => person.name).filter(Boolean).join(" and ")
          : people[index]?.name || "",
      email: people[index]?.email || "",
    }));
  }

  const selected = templates.find((template) => template.id === templateId);

  async function openSend() {
    setError("");
    setOpen(true);
    setBusy(true);
    try {
      const list = await fetchContractTemplates();
      setTemplates(list);
      const first = list[0];
      setTemplateId(first?.id ?? "");
      setSigners(signersFor(first?.roles || ["First Party"]));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function chooseTemplate(id: number) {
    const template = templates.find((row) => row.id === id);
    setTemplateId(id);
    const next = signersFor(template?.roles || ["First Party"]);
    setSigners(
      next.map((row) => {
        const typed = signers.find((current) => current.role === row.role);
        return typed?.email ? { ...row, email: typed.email, name: typed.name || row.name } : row;
      })
    );
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (templateId === "" || !selected) return;
    setBusy(true);
    setError("");
    try {
      const submissionId = await sendContractForSignature({ templateId, signers });
      await insertContractSend({
        propertyId: property.id,
        templateId: String(templateId),
        templateName: selected.name,
        signerName: signers.map((row) => row.name.trim()).filter(Boolean).join(", "),
        signerEmail: signers.map((row) => row.email.trim()).filter(Boolean).join(", "),
        submissionId,
      });
      setOpen(false);
      await loadSends();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSigned(sendRow: ContractSend) {
    setBusy(true);
    setError("");
    try {
      const ready = await contractSignatureStatus(sendRow.submissionId);
      if (!ready) {
        setError("Not signed yet. EasyLedger will save it here after everyone has signed.");
        return;
      }
      const blob = await downloadSignedContract(sendRow.submissionId);
      const fileName = `${sendRow.templateName || "Signed contract"}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });
      const doc = await addDocumentWithFile(file, {
        documentName: `${sendRow.templateName || "Contract"} — signed`,
        documentType: "Rental Agreement",
        relatedType: "property",
        relatedId: property.id,
        notes: `Signed copy from DocuSeal. Sent to ${sendRow.signerEmail}.`,
      });
      await markContractSigned(sendRow.id, doc.id);
      await loadSends();
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Contract</h3>
        <button type="button" className="btn btn-primary" onClick={() => void openSend()} disabled={busy}>
          Send for signature
        </button>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        Sends through DocuSeal, the same signing service as TradeDeskPro. After it is signed, save the PDF onto this property.
      </p>
      {error && !open ? <p style={{ color: "var(--error)" }}>{error}</p> : null}
      {sends.length === 0 ? (
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>No contract has been sent for this property yet.</p>
      ) : (
        sends.map((row) => (
          <div key={row.id} className="list-item" style={{ cursor: "default", marginBottom: 8 }}>
            <div className="item-content">
              <div className="item-title">{row.templateName || "Contract"}</div>
              <div className="item-subtitle">
                {row.status === "signed" ? "Signed and saved" : "Waiting for signature"} · {row.signerName} ·{" "}
                {row.signerEmail}
                {row.createdAt ? ` · Sent ${fmtDate(row.createdAt.split("T")[0])}` : ""}
              </div>
            </div>
            {row.status !== "signed" && (
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void saveSigned(row)}>
                Save signed copy
              </button>
            )}
          </div>
        ))
      )}

      {open && (
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Send contract</h3>
            <form onSubmit={(event) => void send(event)}>
              {error ? <p style={{ color: "var(--error)" }}>{error}</p> : null}
              <div className="form-group">
                <label>Contract</label>
                <select
                  value={templateId}
                  onChange={(event) => chooseTemplate(Number(event.target.value))}
                  disabled={templates.length === 0}
                >
                  {templates.length === 0 ? <option value="">No templates found</option> : null}
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              {signers.map((signer, index) => (
                <div key={signer.role}>
                  <div className="form-group">
                    <label>{signer.role} name</label>
                    <input
                      value={signer.name}
                      onChange={(event) =>
                        setSigners((rows) => rows.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>{signer.role} email</label>
                    <input
                      type="email"
                      value={signer.email}
                      onChange={(event) =>
                        setSigners((rows) => rows.map((row, i) => (i === index ? { ...row, email: event.target.value } : row)))
                      }
                    />
                  </div>
                </div>
              ))}
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                DocuSeal emails the signing link. It stays open for 30 days.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline btn-lg" disabled={busy} onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={busy || templateId === ""}>
                  {busy ? "Sending…" : "Send contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
