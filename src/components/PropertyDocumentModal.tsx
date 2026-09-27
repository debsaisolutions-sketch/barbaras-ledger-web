import { useEffect, useState, type FormEvent } from "react";
import mammoth from "mammoth";
import { BUILTIN_TEMPLATES } from "../builtinTemplates";
import { fillContractFromProperty } from "../contractFill";
import { leaseOccupants } from "../occupants";
import { sendEditedContract } from "../contractApi";
import { insertContractSend } from "../contractSends";
import {
  addDocumentWithFile,
  getDocuments,
  getDocumentSignedUrl,
  type Document,
  type DocumentType,
  type Property,
} from "../store";

type Source =
  | { kind: "builtin"; id: string; name: string; text: string }
  | { kind: "saved"; id: string; name: string; doc: Document };

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,image/*,application/pdf";

function typeFromName(name: string, current: DocumentType): DocumentType {
  const lower = name.toLowerCase();
  if (lower.includes("receipt")) return "Receipt";
  if (lower.includes("loan")) return "Loan Agreement";
  if (lower.includes("rent") || lower.includes("lease")) return "Rental Agreement";
  if (current !== "Template") return current;
  return "Other";
}

function withPropertyDetails(text: string, property: Property): string {
  return fillContractFromProperty(text, property);
}

function startingSigners(property: Property): { name: string; email: string }[] {
  const people = leaseOccupants(property).filter((person) => person.name || person.email);
  if (people.length === 0) return [{ name: "", email: "" }];
  return people.map((person) => ({ name: person.name, email: person.email }));
}

async function textFromSaved(doc: Document): Promise<string> {
  if (doc.relatedType === "template" && doc.fileUri.trim()) return doc.fileUri;
  if (!doc.storagePath) throw new Error("This saved item has no file to edit.");
  const url = await getDocumentSignedUrl(doc.storagePath);
  if (!url) throw new Error("Could not open that saved document.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not open that saved document.");
  const name = `${doc.originalFileName || ""} ${doc.documentName}`.toLowerCase();
  const mime = (doc.mimeType || "").toLowerCase();
  const buffer = await response.arrayBuffer();
  if (name.includes(".docx") || mime.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value.trim();
    if (!text) throw new Error("That Word file did not contain text to edit.");
    return text;
  }
  if (name.includes(".txt") || mime.startsWith("text/")) {
    return new TextDecoder().decode(buffer).trim();
  }
  throw new Error("Pick a Word document (.docx) or a template. PDFs and photos stay as file uploads.");
}

export default function PropertyDocumentModal({
  property,
  onClose,
  onSaved,
}: {
  property: Property;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceKey, setSourceKey] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<DocumentType>("Other");
  const [notes, setNotes] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [signers, setSigners] = useState(() => startingSigners(property));
  const [loadingSource, setLoadingSource] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getDocuments()
      .then((docs) => {
        if (cancelled) return;
        const saved: Source[] = docs
          .filter((doc) => doc.documentName.trim())
          .map((doc) => ({
            kind: "saved",
            id: doc.id,
            name: doc.relatedType === "template" ? `${doc.documentName} (your template)` : doc.documentName,
            doc,
          }));
        setSources(saved);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function chooseSource(key: string) {
    setSourceKey(key);
    setError("");
    setFile(null);
    if (!key) {
      setText("");
      return;
    }
    setLoadingSource(true);
    try {
      if (key.startsWith("builtin:")) {
        const template = BUILTIN_TEMPLATES.find((item) => item.id === key.slice("builtin:".length));
        if (!template) return;
        setName(template.title.replace(/ Template$/, ""));
        setType(typeFromName(template.title, "Other"));
        setText(withPropertyDetails(template.content, property));
        return;
      }
      const source = sources.find((item) => `saved:${item.id}` === key);
      if (!source || source.kind !== "saved") return;
      setName(source.doc.documentName);
      setType(typeFromName(source.doc.documentName, source.doc.documentType));
      setText(withPropertyDetails(await textFromSaved(source.doc), property));
    } catch (err) {
      setText("");
      setError((err as Error).message);
    } finally {
      setLoadingSource(false);
    }
  }

  async function saveFile(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !file) {
      setError("Enter a name and choose a file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addDocumentWithFile(file, {
        documentName: name.trim(),
        documentType: type,
        relatedType: "property",
        relatedId: property.id,
        notes: notes.trim(),
      });
      onSaved();
      onClose();
      alert("Document saved.");
    } catch (err) {
      setError((err as Error).message || "Could not save document.");
    } finally {
      setBusy(false);
    }
  }

  async function sendToSign() {
    if (!name.trim() || text.trim().length < 20) {
      setError("Pull in a document and check the wording before sending.");
      return;
    }
    const ready = signers.map((signer) => ({ name: signer.name.trim(), email: signer.email.trim() })).filter((signer) => signer.name || signer.email);
    if (ready.length === 0 || ready.some((signer) => !signer.name || !signer.email.includes("@"))) {
      setError("Enter a name and email for each person who should sign.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const submissionId = await sendEditedContract({
        name: name.trim(),
        text,
        signers: ready,
      });
      const copy = new File([text], `${name.trim()}.txt`, { type: "text/plain" });
      await addDocumentWithFile(copy, {
        documentName: `${name.trim()} — sent for signature`,
        documentType: type === "Other" ? "Rental Agreement" : type,
        relatedType: "property",
        relatedId: property.id,
        notes: `Sent to ${ready.map((signer) => signer.email).join(", ")} to sign. ${notes.trim()}`.trim(),
      });
      await insertContractSend({
        propertyId: property.id,
        templateId: sourceKey || "edited",
        templateName: name.trim(),
        signerName: ready.map((signer) => signer.name).join(", "),
        signerEmail: ready.map((signer) => signer.email).join(", "),
        submissionId,
      });
      onSaved();
      onClose();
      alert(`Sent to ${ready.map((signer) => signer.email).join(" and ")}. They will each get an email from DocuSeal to sign. After they sign, use Save signed copy on this property.`);
    } catch (err) {
      setError((err as Error).message || "Could not send this contract.");
    } finally {
      setBusy(false);
    }
  }

  const editing = Boolean(sourceKey);

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>Upload Document</h3>
        <form onSubmit={(event) => void saveFile(event)}>
          {error ? <p style={{ color: "var(--error)" }}>{error}</p> : null}
          <div className="form-group">
            <label>Start from a saved document or template</label>
            <select value={sourceKey} onChange={(event) => void chooseSource(event.target.value)}>
              <option value="">Upload a new file</option>
              <optgroup label="Templates">
                {BUILTIN_TEMPLATES.map((template) => (
                  <option key={template.id} value={`builtin:${template.id}`}>
                    {template.title}
                  </option>
                ))}
                {sources
                  .filter((source) => source.kind === "saved" && source.doc.relatedType === "template")
                  .map((source) => (
                    <option key={source.id} value={`saved:${source.id}`}>
                      {source.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Saved documents">
                {sources
                  .filter((source) => source.kind === "saved" && source.doc.relatedType !== "template")
                  .map((source) => (
                    <option key={source.id} value={`saved:${source.id}`}>
                      {source.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
          <div className="form-group">
            <label>Document Name *</label>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="form-group">
            <label>Document Type</label>
            <select value={type} onChange={(event) => setType(event.target.value as DocumentType)}>
              <option>Rental Agreement</option>
              <option>Lease</option>
              <option>Receipt</option>
              <option>Check Image</option>
              <option>Payment Proof</option>
              <option>Tax Document</option>
              <option>Other</option>
            </select>
          </div>
          {editing ? (
            <>
              <div className="form-group">
                <label>Wording</label>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  style={{ minHeight: 220, fontFamily: "Georgia, serif" }}
                  disabled={loadingSource}
                />
                <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 0 }}>
                  {loadingSource
                    ? "Opening the document…"
                    : "Names, address, lease dates, rent, and deposit are filled from this property when they are saved. Change anything before sending. DocuSeal emails this to the signer."}
                </p>
              </div>
              {signers.map((signer, index) => (
                <div key={index}>
                  <div className="form-group">
                    <label>{signers.length > 1 ? `Signer ${index + 1} name` : "Signer name"}</label>
                    <input
                      value={signer.name}
                      onChange={(event) =>
                        setSigners((rows) => rows.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>{signers.length > 1 ? `Signer ${index + 1} email` : "Signer email"}</label>
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
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} style={{ minHeight: 90 }} />
              </div>
              <div className="form-group">
                <label>File upload *</label>
                <input type="file" accept={FILE_ACCEPT} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </div>
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline btn-lg" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            {editing ? (
              <button type="button" className="btn btn-primary btn-lg" disabled={busy || loadingSource} onClick={() => void sendToSign()}>
                {busy ? "Sending…" : "Send to sign"}
              </button>
            ) : (
              <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                {busy ? "Saving…" : "Save Document"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
