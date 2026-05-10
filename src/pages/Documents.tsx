import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDocuments, addDocument, type Document as Doc, type DocumentType } from "../store";
import { fmtDate } from "../helpers";
import { useRefresh } from "../App";

const TEMPLATES = [
  { id: "rental-agreement", name: "Rental Agreement Template", icon: "📋" },
  { id: "loan-agreement", name: "Loan Agreement Template", icon: "🤝" },
  { id: "receipt", name: "Payment Receipt Template", icon: "🧾" },
];

export default function Documents() {
  const navigate = useNavigate();
  const { key, refresh } = useRefresh();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [uploadForm, setUploadForm] = useState({ name: "", type: "Other" as DocumentType, notes: "" });

  useEffect(() => { setDocs(getDocuments().filter(d => d.relatedType !== "template")); }, [key]);

  const customTemplates = getDocuments("template");
  const filters = ["All", "Rental Agreement", "Lease", "Loan Agreement", "Receipt", "Tax Document", "Other"];
  const filtered = docs
    .filter(d => filter === "All" || d.documentType === filter)
    .filter(d => !search || [d.documentName, d.notes, d.documentType].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name.trim()) { alert("Please enter a document name."); return; }
    addDocument({
      documentName: uploadForm.name.trim(), documentType: uploadForm.type,
      relatedType: "general", relatedId: "", fileUri: "", notes: uploadForm.notes.trim(),
    });
    refresh(); setShowUpload(false); setUploadForm({ name: "", type: "Other", notes: "" });
    alert("Document saved!");
  };

  const handleCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customContent.trim()) { alert("Please enter both a name and content."); return; }
    addDocument({
      documentName: customName.trim(), documentType: "Template",
      relatedType: "template", relatedId: "", fileUri: customContent, notes: "Custom template",
    });
    refresh(); setShowCustom(false); setCustomName(""); setCustomContent("");
    alert("Custom template saved!");
  };

  return (
    <div>
      <div className="page-header">
        <h2>Documents & Templates</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Add Document</button>
        </div>
      </div>

      {/* Templates Section */}
      <h3 className="section-title">Built-in Templates</h3>
      {TEMPLATES.map(t => (
        <div key={t.id} className="template-card" onClick={() => navigate(`/template/${t.id}`)}>
          <span style={{ fontSize: 28 }}>{t.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{t.name}</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Tap to view</div>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 20 }}>›</span>
        </div>
      ))}

      {/* Custom Templates */}
      <h3 className="section-title">Your Custom Templates</h3>
      <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={() => setShowCustom(true)}>+ Upload Your Own Template</button>
      {customTemplates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>No custom templates yet. Upload your own rental agreement or other template above.</div>
      ) : customTemplates.map(ct => (
        <div key={ct.id} className="template-card" onClick={() => navigate(`/custom-template/${ct.id}`)}>
          <span style={{ fontSize: 28 }}>📎</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{ct.documentName}</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Uploaded {fmtDate(ct.uploadedAt.split("T")[0])}</div>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 20 }}>›</span>
        </div>
      ))}

      {/* Documents Section */}
      <h3 className="section-title">Saved Documents</h3>
      <div className="form-group" style={{ marginBottom: 16 }}>
        <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="filter-row">
        {filters.map(f => <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No Documents Found</h3>
          <p>Add documents to keep records organized.</p>
        </div>
      ) : filtered.map(d => (
        <div key={d.id} className="list-item">
          <span className="item-icon">📄</span>
          <div className="item-content">
            <div className="item-title">{d.documentName}</div>
            <div className="item-subtitle">{d.documentType} · {fmtDate(d.uploadedAt.split("T")[0])}</div>
          </div>
        </div>
      ))}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Document</h3>
            <form onSubmit={handleUpload}>
              <div className="form-group"><label>Document Name *</label><input value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label>Type</label>
                <select value={uploadForm.type} onChange={e => setUploadForm(f => ({ ...f, type: e.target.value as DocumentType }))}>
                  <option>Rental Agreement</option><option>Lease</option><option>Loan Agreement</option><option>Receipt</option><option>Tax Document</option><option>Other</option>
                </select>
              </div>
              <div className="form-group"><label>Notes</label><textarea value={uploadForm.notes} onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Template Modal */}
      {showCustom && (
        <div className="modal-overlay" onClick={() => setShowCustom(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Upload Your Own Template</h3>
            <p style={{ color: "var(--muted)", marginBottom: 16 }}>Paste the text of your rental agreement or other template below. Barbara can view and use it anytime from the Documents section.</p>
            <form onSubmit={handleCustomTemplate}>
              <div className="form-group"><label>Template Name *</label><input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g., My Rental Agreement" /></div>
              <div className="form-group"><label>Template Content *</label><textarea value={customContent} onChange={e => setCustomContent(e.target.value)} placeholder="Paste the full text of your template here..." style={{ minHeight: 250 }} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCustom(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
