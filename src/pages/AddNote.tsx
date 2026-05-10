import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addNote } from "../store";
import { useRefresh } from "../App";

export default function AddNote({ mode }: { mode: "property" | "loan" | "general" }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const [form, setForm] = useState({
    noteDate: new Date().toISOString().split("T")[0],
    noteText: "",
    reminderDate: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  const goBack = () => {
    if (mode === "property" && id) navigate(`/properties/${id}`);
    else if (mode === "loan" && id) navigate(`/loans/${id}`);
    else navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.noteText.trim()) {
      alert("Please enter a note.");
      return;
    }
    try {
      setSaving(true);
      await addNote({
        relatedType: mode,
        relatedId: id || "",
        noteDate: form.noteDate,
        noteText: form.noteText.trim(),
        reminderDate: form.reminderDate,
      });
      refresh();
      alert("Saved. Note added.");
      goBack();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button className="back-link" onClick={goBack}>
        ← Back
      </button>
      <div className="page-header">
        <h2>📝 Add Note</h2>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.noteDate} onChange={(e) => set("noteDate", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Reminder Date (optional)</label>
              <input type="date" value={form.reminderDate} onChange={(e) => set("reminderDate", e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Note *</label>
            <textarea value={form.noteText} onChange={(e) => set("noteText", e.target.value)} placeholder="Write your note here..." />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? "Saving…" : "Save Note"}
            </button>
            <button type="button" className="btn btn-outline" onClick={goBack}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
