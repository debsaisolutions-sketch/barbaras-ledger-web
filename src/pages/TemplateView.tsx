import { useParams, useNavigate } from "react-router-dom";
import { builtinTemplate } from "../builtinTemplates";

export default function TemplateView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const template = builtinTemplate(id || "");

  if (!template) return <div className="empty-state"><h3>Template not found</h3><button className="btn btn-primary" onClick={() => navigate("/documents")}>Back</button></div>;

  return (
    <div>
      <button className="back-link" onClick={() => navigate("/documents")}>← Back to Documents</button>
      <div className="page-header">
        <h2>{template.title}</h2>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print</button>
      </div>
      <div className="card" style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 15, lineHeight: 1.8 }}>
        {template.content}
      </div>
    </div>
  );
}
