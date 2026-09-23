import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FIELD_URL = "https://link9060.github.io/Resonant-Field/";

const ALLOWED_ORIGINS = new Set([
  "https://resonantrelay.org",
  "https://www.resonantrelay.org",
  "https://link9060.github.io",
  "http://localhost:3000",
]);

function cors(req: Request) {
  const origin = req.headers.get("Origin");
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function namedKey(variable: string, fallback: string) {
  const encoded = Deno.env.get(variable);
  if (encoded) {
    try {
      const values = JSON.parse(encoded) as Record<string, string>;
      if (values.default) return values.default;
    } catch {}
  }
  return Deno.env.get(fallback) ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(req, { error: "Relay sign-in required." }, 401);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = namedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const serviceKey = namedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishableKey || !serviceKey) {
    return json(req, { error: "Account linking is not configured." }, 500);
  }

  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user?.email) {
    return json(req, { error: "Relay could not verify this session." }, 401);
  }

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("banned_at,onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Field handoff profile check failed", profileError);
    return json(req, { error: "Relay could not verify this account." }, 500);
  }
  if (profile?.banned_at) return json(req, { error: "This Relay account is disabled." }, 403);
  if (!profile?.onboarding_completed_at) {
    return json(req, { error: "Finish Relay onboarding before connecting Field." }, 403);
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: { redirectTo: FIELD_URL },
  });

  if (linkError) {
    console.error("Field handoff token generation failed", linkError);
    return json(req, { error: "Relay could not create a Field handoff." }, 500);
  }

  const properties = (linkData as any)?.properties ?? {};
  let tokenHash = String(properties.hashed_token ?? "").trim();

  if (!tokenHash && properties.action_link) {
    try {
      const action = new URL(String(properties.action_link));
      tokenHash = action.searchParams.get("token_hash") ?? "";
    } catch {}
  }

  if (!tokenHash) {
    console.error("Field handoff missing token hash");
    return json(req, { error: "Relay created an invalid Field handoff." }, 500);
  }

  const target = new URL(FIELD_URL);
  target.hash = new URLSearchParams({
    token_hash: tokenHash,
    type: "magiclink",
  }).toString();

  return json(req, { ok: true, field_url: target.toString() });
});

function json(req: Request, value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
