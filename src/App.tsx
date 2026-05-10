import { useState, createContext, useContext, useCallback } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import Loans from "./pages/Loans";
import LoanDetail from "./pages/LoanDetail";
import LoanForm from "./pages/LoanForm";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AddRentalPayment from "./pages/AddRentalPayment";
import AddLateFee from "./pages/AddLateFee";
import AddLoanPayment from "./pages/AddLoanPayment";
import AddLoanCharge from "./pages/AddLoanCharge";
import AddNote from "./pages/AddNote";
import TemplateView from "./pages/TemplateView";
import CustomTemplateView from "./pages/CustomTemplateView";

const RefreshCtx = createContext<{ key: number; refresh: () => void }>({ key: 0, refresh: () => {} });
export function useRefresh() { return useContext(RefreshCtx); }

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <RefreshCtx.Provider value={{ key: refreshKey, refresh }}>
      <div className="app-layout">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={closeSidebar} />
        <nav className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-brand">
            <h1>Barbara's Ledger</h1>
            <p>Your Personal Record Book</p>
          </div>
          <ul className="sidebar-nav">
            <li><NavLink to="/" end onClick={closeSidebar}><span className="nav-icon">🏠</span> Dashboard</NavLink></li>
            <li><NavLink to="/properties" onClick={closeSidebar}><span className="nav-icon">🏢</span> Properties</NavLink></li>
            <li><NavLink to="/loans" onClick={closeSidebar}><span className="nav-icon">🤝</span> Loans</NavLink></li>
            <li><NavLink to="/documents" onClick={closeSidebar}><span className="nav-icon">📄</span> Documents</NavLink></li>
            <li><NavLink to="/reports" onClick={closeSidebar}><span className="nav-icon">📊</span> Tax Reports</NavLink></li>
            <li><NavLink to="/settings" onClick={closeSidebar}><span className="nav-icon">⚙️</span> Settings</NavLink></li>
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/new" element={<PropertyForm />} />
            <Route path="/properties/:id/edit" element={<PropertyForm />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/properties/:id/payment" element={<AddRentalPayment />} />
            <Route path="/properties/:id/late-fee" element={<AddLateFee />} />
            <Route path="/properties/:id/note" element={<AddNote mode="property" />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/new" element={<LoanForm />} />
            <Route path="/loans/:id/edit" element={<LoanForm />} />
            <Route path="/loans/:id" element={<LoanDetail />} />
            <Route path="/loans/:id/payment" element={<AddLoanPayment />} />
            <Route path="/loans/:id/charge" element={<AddLoanCharge />} />
            <Route path="/loans/:id/note" element={<AddNote mode="loan" />} />
            <Route path="/add-payment" element={<AddRentalPayment />} />
            <Route path="/add-loan-payment" element={<AddLoanPayment />} />
            <Route path="/add-note" element={<AddNote mode="general" />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/template/:id" element={<TemplateView />} />
            <Route path="/custom-template/:id" element={<CustomTemplateView />} />
          </Routes>
        </main>
      </div>
    </RefreshCtx.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
