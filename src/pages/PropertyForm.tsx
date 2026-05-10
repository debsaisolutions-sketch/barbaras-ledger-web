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
    propertyName: "", address: "", tenantName: "", tenantContact: "",
    tenantPhone: "", tenantEmail: "", monthlyRent: "", rentDueDay: "1",
    leaseStartDate: "", leaseEndDate: "", securityDeposit: "", status: "Active" as PropertyStatus, notes: "",
  });

  useEffect(() => {
    if (id) {
      const p = getProperty(id);
      if (p) setForm({
        propertyName: p.propertyName, address: p.address, tenantName: p.tenantName,
        tenantContact: p.tenantContact, tenantPhone: p.tenantPhone, tenantEmail: p.tenantEmail,
        monthlyRent: p.monthlyRent.toString(), rentDueDay: p.rentDueDay.toString(),
        leaseStartDate: p.leaseStartDate, leaseEndDate: p.leaseEndDate,
        securityDeposit: p.securityDeposit.toString(), status: p.status, notes: p.notes,
      });
    }
  }, [id]);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyName.trim()) { alert("Property name is required."); return; }
    const data = {
      propertyName: form.propertyName.trim(), address: form.address.trim(),
      tenantName: form.tenantName.trim(), tenantContact: form.tenantContact.trim(),
      tenantPhone: form.tenantPhone.trim(), tenantEmail: form.tenantEmail.trim(),
      monthlyRent: parseFloat(form.monthlyRent) || 0, rentDueDay: parseInt(form.rentDueDay) || 1,
      leaseStartDate: form.leaseStartDate, leaseEndDate: form.leaseEndDate,
      securityDeposit: parseFloat(form.securityDeposit) || 0, status: form.status, notes: form.notes.trim(),
    };
    if (isEdit) { updateProperty(id!, data); } else { addProperty(data); }
    refresh();
    alert(isEdit ? "Property updated!" : "Property added!");
    navigate(isEdit ? `/properties/${id}` : "/properties");
  };

  return (
    <div>
      <button className="back-link" onClick={() => navigate(isEdit ? `/properties/${id}` : "/properties")}>← Back</button>
      <div className="page-header"><h2>{isEdit ? "Edit Property" : "Add New Property"}</h2></div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Property Name *</label><input value={form.propertyName} onChange={e => set("propertyName", e.target.value)} placeholder="e.g., 123 Main Street House" /></div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address" /></div>
          <div className="form-row">
            <div className="form-group"><label>Tenant Name</label><input value={form.tenantName} onChange={e => set("tenantName", e.target.value)} /></div>
            <div className="form-group"><label>Tenant Phone</label><input value={form.tenantPhone} onChange={e => set("tenantPhone", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Tenant Email</label><input type="email" value={form.tenantEmail} onChange={e => set("tenantEmail", e.target.value)} /></div>
            <div className="form-group"><label>Tenant Contact Info</label><input value={form.tenantContact} onChange={e => set("tenantContact", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Monthly Rent ($)</label><input type="number" step="0.01" value={form.monthlyRent} onChange={e => set("monthlyRent", e.target.value)} /></div>
            <div className="form-group"><label>Rent Due Day</label><input type="number" min="1" max="31" value={form.rentDueDay} onChange={e => set("rentDueDay", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Lease Start Date</label><input type="date" value={form.leaseStartDate} onChange={e => set("leaseStartDate", e.target.value)} /></div>
            <div className="form-group"><label>Lease End Date</label><input type="date" value={form.leaseEndDate} onChange={e => set("leaseEndDate", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Security Deposit ($)</label><input type="number" step="0.01" value={form.securityDeposit} onChange={e => set("securityDeposit", e.target.value)} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}>
                <option>Active</option><option>Vacant</option><option>Past Due</option><option>Closed</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg">{isEdit ? "Save Changes" : "Add Property"}</button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(isEdit ? `/properties/${id}` : "/properties")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
