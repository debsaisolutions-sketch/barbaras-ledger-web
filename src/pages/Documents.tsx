import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDocuments,
  addDocument,
  addDocumentWithFile,
  type Document as Doc,
  type DocumentType,
} from "../store";
import { fmtDate } from "../helpers";
import { useRefresh } from "../App";
import { downloadDocumentFile, openDocumentInNewTab } from "../documentFiles";

const TEMPLATES = [
  { id: "rental-agreement", name: "Rental Agreement Template", icon: "📋" },
  { id: "loan-agreement", name: "Loan Agreement Template", icon: "🤝" },
  { id: "receipt", name: "Payment Receipt Template", icon: "🧾" },
];

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/heic,image/heif,image/webp";

export default function Documents() {
  const navigate = useNavigate();
  const { key, refresh } = useRefresh();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Doc[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "Other" as DocumentType,
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const all = await getDocuments();
        if (cancelled) return;
        setDocs(all.filter((d) => d.relatedType !== "template"));
        setCustomTemplates(await getDocuments("template"));
      } catch (e) {
        if (!cancelled) alert((e as Error).message || "Could not load documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const filters = [
    "All",
    "Rental Agreement",
    "Lease",
    "Loan Agreement",
    "Receipt",
    "Tax Document",
    "Other",
  ];
  const filtered = docs
    .filter((d) => filter === "All" || d.documentType === filter)
    .filter(
      (d) =>
        !search ||
        [d.documentName, d.notes, d.documentType].some((f) =>
          f?.toLowerCase().includes(search.toLowerCase())
        )
    );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name.trim()) {
      alert("Please enter a document name.");
      return;
    }
    try {
      setSaving(true);
      if (file) {
        await addDocumentWithFile(file, {
          documentName: uploadForm.name.trim(),
          documentType: uploadForm.type,
          relatedType: "general",
          relatedId: "",
          notes: uploadForm.notes.trim(),
        });
        setBanner("Upload complete. Your file is saved.");
      } else {
        await addDocument({
          documentName: uploadForm.name.trim(),
          documentType: uploadForm.type,
          relatedType: "general",
          relatedId: "",
          fileUri: "",
          notes: uploadForm.notes.trim(),
        });
        setBanner("Saved. Document record added (no file attached).");
      }
      refresh();
      setShowUpload(false);
      setUploadForm({ name: "", type: "Other", notes: "" });
      setFile(null);
    } catch (err) {
      alert((err as Error).message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customContent.trim()) {
      alert("Please enter both a name and content.");
      return;
    }
    try {
      setSaving(true);
      await addDocument({
        documentName: customName.trim(),
        documentType: "Template",
        relatedType: "template",
        relatedId: "",
        fileUri: customContent,
        notes: "Custom template",
      });
      refresh();
      setShowCustom(false);
      setCustomName("");
      setCustomContent("");
      setBanner("Saved. Your custom template is stored.");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {banner && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: "var(--success-bg)",
            border: "1px solid var(--success)",
            color: "var(--success)",
          }}
        >
          {banner}{" "}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="page-header">
        <h2>Documents & Templates</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            + Add Document
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ padding: 24 }}>Loading documents…</p>
      ) : (
        <>
          <h3 className="section-title">Built-in Templates</h3>
          {TEMPLATES.map((t) => (
            <div key={t.id} className="template-card" onClick={() => navigate(`/template/${t.id}`)}>
              <span style={{ fontSize: 28 }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 17 }}>{t.name}</div>
                <div style={{ fontSize: 14, color: "var(--muted)" }}>Tap to view</div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 20 }}>›</span>
            </div>
          ))}

          <h3 className="section-title">Your Custom Templates</h3>
          <button
            className="btn btn-secondary"
            style={{ marginBottom: 12 }}
            onClick={() => setShowCustom(true)}
          >
            + Add Your Own Template (paste text)
          </button>
          {customTemplates.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>
              No custom templates yet. Add one above or upload files in Saved Documents.
            </div>
          ) : (
            customTemplates.map((ct) => (
              <div
                key={ct.id}
                className="template-card"
                onClick={() => navigate(`/custom-template/${ct.id}`)}
              >
                <span style={{ fontSize: 28 }}>📎</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{ct.documentName}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)" }}>
                    Saved {fmtDate(ct.uploadedAt.split("T")[0])}
                  </div>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 20 }}>›</span>
              </div>
            ))
          )}

          <h3 className="section-title">Saved Documents</h3>
          <p style={{ color: "var(--muted)", marginBottom: 12, fontSize: 14 }}>
            Upload leases, receipts, tax papers, check photos, payment proof, and screenshots. Files stay
            private in your account.
          </p>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-row">
            {filters.map((f) => (
              <button
                key={f}
                className={`chip ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No Documents Found</h3>
              <p>Add documents to keep records organized.</p>
            </div>
          ) : (
            filtered.map((d) => (
              <div key={d.id} className="list-item" style={{ flexWrap: "wrap", gap: 12 }}>
                <span className="item-icon">📄</span>
                <div className="item-content" style={{ flex: 1, minWidth: 200 }}>
                  <div className="item-title">{d.documentName}</div>
                  <div className="item-subtitle">
                    {d.documentType} · {fmtDate(d.uploadedAt.split("T")[0])}
                    {d.originalFileName ? ` · ${d.originalFileName}` : ""}
                  </div>
                </div>
                {d.storagePath ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={async (ev) => {
                        ev.stopPropagation();
                        const ok = await openDocumentInNewTab(d.storagePath!);
                        if (!ok) alert("Could not open file.");
                      }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={async (ev) => {
                        ev.stopPropagation();
                        const ok = await downloadDocumentFile(
                          d.storagePath!,
                          d.originalFileName || d.documentName
                        );
                        if (!ok) alert("Could not download.");
                      }}
                    >
                      Download
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => !saving && setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Document</h3>
            <p style={{ color: "var(--muted)", marginBottom: 12, fontSize: 14 }}>
              Choose a file (PDF, Word, images including HEIC and WEBP), or save name and notes only.
            </p>
            <form onSubmit={(e) => void handleUpload(e)}>
              <div className="form-group">
                <label>Document Name *</label>
                <input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, type: e.target.value as DocumentType }))
                  }
                >
                  <option>Rental Agreement</option>
                  <option>Lease</option>
                  <option>Loan Agreement</option>
                  <option>Receipt</option>
                  <option>Tax Document</option>
                  <option>Other</option>
                </select>
              </div>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: 16,
                  lineHeight: 1.6,
                  margin: "0 0 16px 0",
                }}
              >
                To upload a document, first save the file, photo, or screenshot to your computer or phone. Then
                click Choose File and select it. You can upload rental agreements, leases, receipts, tax papers,
                check images, screenshots, or payment proof.
              </p>
              <div className="form-group">
                <label>Attach file (optional)</label>
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : file ? "Upload & Save" : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCustom && (
        <div className="modal-overlay" onClick={() => !saving && setShowCustom(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Your Own Template</h3>
            <p style={{ color: "var(--muted)", marginBottom: 16 }}>
              Paste the text of your rental agreement or other template below. You can open it anytime from
              this section.
            </p>
            <form onSubmit={(e) => void handleCustomTemplate(e)}>
              <div className="form-group">
                <label>Template Name *</label>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., My Rental Agreement"
                />
              </div>
              <div className="form-group">
                <label>Template Content *</label>
                <textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Paste the full text of your template here..."
                  style={{ minHeight: 250 }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCustom(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
