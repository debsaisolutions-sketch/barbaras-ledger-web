type Authed = { userId: string };

export async function requireLedgerUser(request: Request): Promise<Authed | Response> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return Response.json({ error: "Sign in required." }, { status: 401 });

  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) {
    return Response.json({ error: "EasyLedger sign-in is not configured on the server." }, { status: 500 });
  }

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!res.ok) return Response.json({ error: "Sign in required." }, { status: 401 });
  const user = (await res.json()) as { id?: string };
  if (!user.id) return Response.json({ error: "Sign in required." }, { status: 401 });
  return { userId: user.id };
}
