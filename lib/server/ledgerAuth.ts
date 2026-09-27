type Authed = { ok: true; userId: string } | { ok: false; status: number; error: string };

export async function userIdFromAuthorization(authorization: string): Promise<Authed> {
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Sign in required." };

  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) {
    return { ok: false, status: 500, error: "EasyLedger sign-in is not configured on the server." };
  }

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!res.ok) return { ok: false, status: 401, error: "Sign in required." };
  const user = (await res.json()) as { id?: string };
  if (!user.id) return { ok: false, status: 401, error: "Sign in required." };
  return { ok: true, userId: user.id };
}
