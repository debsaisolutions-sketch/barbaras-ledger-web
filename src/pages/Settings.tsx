import { useState, useEffect } from "react";
import {
  exportAllData,
  clearAllData,
  getLedgerDisplayName,
  saveLedgerDisplayName,
  DEFAULT_LEDGER_PRODUCT_NAME,
} from "../store";
import { useRefresh } from "../App";

export default function Settings() {
  const { refresh } = useRefresh();
  const [busy, setBusy] = useState(false);
  const [ledgerName, setLedgerName] = useState("");
  const [ledgerSaving, setLedgerSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await getLedgerDisplayName();
        if (!cancelled) setLedgerName(v);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveLedgerName = async () => {
    try {
      setLedgerSaving(true);
      await saveLedgerDisplayName(ledgerName);
      refresh();
      alert("Saved. Your ledger name will show in the side menu.");
    } catch (e) {
      alert((e as Error).message || "Could not save.");
    } finally {
      setLedgerSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      setBusy(true);
      const data = await exportAllData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `easyledger-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert("Saved. Your backup file was downloaded.");
    } catch (e) {
      alert((e as Error).message || "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to delete ALL data? This cannot be undone!")) {
      if (
        window.confirm(
          "This will permanently delete all properties, loans, payments, notes, and documents from your account. Are you absolutely sure?"
        )
      ) {
        try {
          setBusy(true);
          await clearAllData();
          refresh();
          setLedgerName("");
          alert("Done. All EasyLedger data was removed from your account.");
        } catch (e) {
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Ledger Display Name</h3>
        <p style={{ color: "var(--muted)", marginBottom: 12, fontSize: 15 }}>
          The menu normally says <strong>{DEFAULT_LEDGER_PRODUCT_NAME}</strong>. You can enter your own name
          here (for example, a family name) if you prefer.
        </p>
        <div className="form-group">
          <label>Custom name (optional)</label>
          <input
            value={ledgerName}
            onChange={(e) => setLedgerName(e.target.value)}
            placeholder={`Leave blank to use ${DEFAULT_LEDGER_PRODUCT_NAME}`}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={ledgerSaving}
          onClick={() => void handleSaveLedgerName()}
        >
          {ledgerSaving ? "Saving…" : "Save ledger name"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>About EasyLedger</h3>
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>
          A personal record-keeping app for managing rental properties, personal loans, payments, and
          documents. Designed with care for clear, simple bookkeeping.
        </p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>Version 1.0.0</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Data Management</h3>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>
          Your records are saved securely to your account in the cloud. Export regularly to keep a JSON
          backup on your computer.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => void handleExport()} disabled={busy}>
            📥 Export All Data
          </button>
          <button className="btn btn-danger" onClick={() => void handleClear()} disabled={busy}>
            🗑️ Clear All Data
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Tips</h3>
        <ul style={{ paddingLeft: 20, color: "var(--muted)", lineHeight: 2 }}>
          <li>
            Use the <strong>Dashboard</strong> to see your financial overview at a glance
          </li>
          <li>
            Add properties and loans using the <strong>Quick Actions</strong> buttons
          </li>
          <li>
            Record every payment to keep an accurate <strong>running balance</strong>
          </li>
          <li>
            Add <strong>notes</strong> to properties and loans to remember important details
          </li>
          <li>
            Use <strong>Tax Reports</strong> at year-end to see all income and payments
          </li>
          <li>
            Click <strong>Print</strong> on any report or template to make a paper copy
          </li>
          <li>
            <strong>Export your data</strong> regularly as a backup
          </li>
        </ul>
      </div>
    </div>
  );
}
