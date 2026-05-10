import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProperty, addProperty, updateProperty, type PropertyStatus } from "../store";
import { useRefresh } from "../App";

export default function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useRefresh();
  const isEdit = !!id;

  const [form, setForm] = useState({
    propertyName: "",
    address: "",
    tenantName: "",
    tenantContact: "",
    tenantPhone: "",
    tenantEmail: "",
    monthlyRent: "",
    rentDueDay: "1",
    leaseStartDate: "",
    leaseEndDate: "",
    securityDeposit: "",
    status: "Active" as PropertyStatus,
    notes: "",
    soldDate: "",
    salePrice: "",
    buyerName: "",
    saleNotes: "",
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const p = await getProperty(id);
        if (cancelled || !p) return;
        setForm({
          propertyName: p.propertyName,
          address: p.address,
          tenantName: p.tenantName,
          tenantContact: p.tenantContact,
          tenantPhone: p.tenantPhone,
          tenantEmail: p.tenantEmail,
          monthlyRent: p.monthlyRent.toString(),
          rentDueDay: p.rentDueDay.toString(),
          leaseStartDate: p.leaseStartDate,
          leaseEndDate: p.leaseEndDate,
          securityDeposit: p.securityDeposit.toString(),
          status: p.status,
          notes: p.notes,
          soldDate: p.soldDate,
          salePrice: p.salePrice != null ? String(p.salePrice) : "",
          buyerName: p.buyerName,
          saleNotes: p.saleNotes,
        });
      } catch (e) {
        if (!cancelled) alert((e as Error).message || "Could not load property.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyName.trim()) {
      alert("Property name is required.");
      return;
    }
    const salePriceNum =
      form.salePrice.trim() === "" ? null : parseFloat(form.salePrice);
    const data = {
      propertyName: form.propertyName.trim(),
      address: form.address.trim(),
      tenantName: form.tenantName.trim(),
      tenantContact: form.tenantContact.trim(),
      tenantPhone: form.tenantPhone.trim(),
      tenantEmail: form.tenantEmail.trim(),
      monthlyRent: parseFloat(form.monthlyRent) || 0,
      rentDueDay: parseInt(form.rentDueDay) || 1,
      leaseStartDate: form.leaseStartDate,
      leaseEndDate: form.leaseEndDate,
      securityDeposit: parseFloat(form.securityDeposit) || 0,
      status: form.status,
      notes: form.notes.trim(),
      soldDate: form.soldDate,
      salePrice: salePriceNum !== null && !Number.isNaN(salePriceNum) ? salePriceNum : null,
      buyerName: form.buyerName.trim(),
      saleNotes: form.saleNotes.trim(),
    };
    try {
      setSaving(true);
      if (isEdit) await updateProperty(id!, data);
      else await addProperty(data);
      refresh();
      alert(isEdit ? "Saved. Your property was updated." : "Saved. Your property was added.");
      navigate(isEdit ? `/properties/${id}` : "/properties");
    } catch (err) {
      alert((err as Error).message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <button
        className="back-link"
        onClick={() => navigate(isEdit ? `/properties/${id}` : "/properties")}
      >
        ← Back
      </button>
      <div className="page-header">
        <h2>{isEdit ? "Edit Property" : "Add New Property"}</h2>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Property Name *</label>
            <input
              value={form.propertyName}
              onChange={(e) => set("propertyName", e.target.value)}
              placeholder="e.g., 123 Main Street House"
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Full address"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tenant Name</label>
              <input value={form.tenantName} onChange={(e) => set("tenantName", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tenant Phone</label>
              <input value={form.tenantPhone} onChange={(e) => set("tenantPhone", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tenant Email</label>
              <input
                type="email"
                value={form.tenantEmail}
                onChange={(e) => set("tenantEmail", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Tenant Contact Info</label>
              <input
                value={form.tenantContact}
                onChange={(e) => set("tenantContact", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Monthly Rent ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.monthlyRent}
                onChange={(e) => set("monthlyRent", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Rent Due Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.rentDueDay}
                onChange={(e) => set("rentDueDay", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Lease Start Date</label>
              <input
                type="date"
                value={form.leaseStartDate}
                onChange={(e) => set("leaseStartDate", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Lease End Date</label>
              <input
                type="date"
                value={form.leaseEndDate}
                onChange={(e) => set("leaseEndDate", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Security Deposit ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.securityDeposit}
                onChange={(e) => set("securityDeposit", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as PropertyStatus)}>
                <option>Active</option>
                <option>Vacant</option>
                <option>Past Due</option>
                <option>Sold</option>
                <option>Closed</option>
              </select>
            </div>
          </div>
          {form.status === "Sold" && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Sold date</label>
                  <input type="date" value={form.soldDate} onChange={(e) => set("soldDate", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sale price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.salePrice}
                    onChange={(e) => set("salePrice", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Buyer name</label>
                  <input value={form.buyerName} onChange={(e) => set("buyerName", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sale notes</label>
                  <input value={form.saleNotes} onChange={(e) => set("saleNotes", e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes..."
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Property"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(isEdit ? `/properties/${id}` : "/properties")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
