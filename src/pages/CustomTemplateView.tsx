import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDocuments } from "../store";

export default function CustomTemplateView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<{ documentName: string; fileUri: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const templates = await getDocuments("template");
        if (cancelled) return;
        const t = templates.find((x) => x.id === id);
        setTemplate(t ? { documentName: t.documentName, fileUri: t.fileUri } : null);
      } catch {
        if (!cancelled) setTemplate(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading template…</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="empty-state">
        <h3>Template not found</h3>
        <button className="btn btn-primary" onClick={() => navigate("/documents")}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="back-link" onClick={() => navigate("/documents")}>
        ← Back to Documents
      </button>
      <div className="page-header">
        <h2>{template.documentName}</h2>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ Print
        </button>
      </div>
      <div
        className="card"
        style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 15, lineHeight: 1.8 }}
      >
        {template.fileUri}
      </div>
    </div>
  );
}
