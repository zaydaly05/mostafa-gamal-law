import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Public self-registration: creates an already-confirmed account (no confirmation email needed).
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const full_name = String(b.full_name ?? "").trim();
  const phone = String(b.phone ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return json({ error: "email" }, 400);
  if (password.length < 6 || password.length > 72) return json({ error: "password" }, 400);
  if (full_name.length < 3 || full_name.length > 100) return json({ error: "name" }, 400);
  if (!/^[0-9+\s-]{8,16}$/.test(phone)) return json({ error: "phone" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone },
  });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) return json({ error: "exists" }, 409);
    return json({ error: "failed" }, 400);
  }
  return json({ ok: true });
});
