import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!email.trim() || !password) {
      setMessage("Please enter email and password.");
      return;
    }
    setBusy(true);
    try {
      const fn = mode === "signin" ? signIn : signUp;
      const { error } = await fn(email, password);
      if (error) {
        // AuthContext logs detailed Supabase auth errors for sign-in; keep UI message readable.
        if (import.meta.env.DEV && mode === "signin") {
          console.error("[Barbara Login Debug] Login.tsx UI error message:", error.message);
        }
        setMessage(error.message);
        return;
      }
      setMessage(
        mode === "signup"
          ? "Account created. Check your email if confirmation is required, then sign in."
          : "Signed in successfully."
      );
      if (mode === "signup") setMode("signin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", padding: "0 16px" }}>
      <div className="sidebar-brand" style={{ marginBottom: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 28 }}>Barbara&apos;s Ledger</h1>
        <p style={{ color: "var(--muted)" }}>Sign in to view your records</p>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>{mode === "signin" ? "Sign in" : "Create account"}</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message && (
            <p style={{ color: message.includes("Successfully") || message.includes("created") ? "var(--success)" : "var(--error)", marginBottom: 12 }}>
              {message}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: "center", color: "var(--muted)" }}>
          {mode === "signin" ? (
            <>
              Need an account?{" "}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setMode("signup"); setMessage(null); }}>
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setMode("signin"); setMessage(null); }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
