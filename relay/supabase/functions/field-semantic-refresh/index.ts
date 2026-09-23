import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const model = new Supabase.ai.Session("gte-small");

type RefreshBody = {
  limit?: number;
  threshold?: number;
  neighbors?: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !anonKey || !serviceRoleKey) {
    return json({ error: "Supabase function environment is incomplete." }, 500);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) {
    return json({ error: "Invalid Relay session." }, 401);
  }

  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: RefreshBody = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const limit = clampInteger(body.limit, 1, 20, 10);
  const threshold = clampNumber(body.threshold, 0.6, 0.95, 0.72);
  const neighbors = clampInteger(body.neighbors, 1, 12, 8);

  const { data: pendingRows, error: pendingError } = await service
    .from("field_embeddings")
    .select("node_id,status,updated_at")
    .eq("user_id", user.id)
    .in("status", ["pending", "failed"])
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (pendingError) {
    console.error("Field semantic queue load failed", pendingError);
    return json({ error: "Could not load the semantic queue." }, 500);
  }

  let processed = 0;
  let failed = 0;
  let neighborLinks = 0;
  const errors: Array<{ nodeId: string; message: string }> = [];

  for (const row of pendingRows ?? []) {
    const nodeId = String(row.node_id);

    try {
      const { error: processingError } = await service
        .from("field_embeddings")
        .update({
          status: "processing",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("node_id", nodeId);

      if (processingError) throw processingError;

      const [{ data: node, error: nodeError }, { data: content, error: contentError }] = await Promise.all([
        service
          .from("field_nodes")
          .select("id,title,searchable_text,type,source_product,source_type")
          .eq("user_id", user.id)
          .eq("id", nodeId)
          .maybeSingle(),
        service
          .from("field_node_content")
          .select("content_kind,text_content,structured_content")
          .eq("user_id", user.id)
          .eq("node_id", nodeId)
          .maybeSingle(),
      ]);

      if (nodeError) throw nodeError;
      if (contentError) throw contentError;
      if (!node) throw new Error("Field node no longer exists.");

      const input = buildEmbeddingInput(node, content);
      if (!input) throw new Error("Field node has no embeddable text.");

      const embedding = await model.run(input, {
        mean_pool: true,
        normalize: true,
      });

      const { error: embeddingError } = await service
        .from("field_embeddings")
        .update({
          embedding: JSON.stringify(embedding),
          model: "gte-small",
          status: "ready",
          last_error: null,
          embedded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("node_id", nodeId);

      if (embeddingError) throw embeddingError;

      const { data: relatedCount, error: neighborError } = await service.rpc(
        "field_rebuild_semantic_neighbors",
        {
          p_user_id: user.id,
          p_node_id: nodeId,
          p_threshold: threshold,
          p_limit: neighbors,
        },
      );

      if (neighborError) throw neighborError;

      neighborLinks += Number(relatedCount ?? 0);
      processed += 1;
    } catch (error) {
      const message = toMessage(error).slice(0, 1800);
      failed += 1;
      errors.push({ nodeId, message });
      console.error("Field semantic node failed", { nodeId, message });

      await service
        .from("field_embeddings")
        .update({
          status: "failed",
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("node_id", nodeId);
    }
  }

  let semanticEdges = 0;
  if (processed > 0 || (pendingRows?.length ?? 0) > 0) {
    const { data, error } = await service.rpc("field_materialize_semantic_edges", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Field semantic materialization failed", error);
      return json({
        error: "Embeddings were generated, but semantic graph materialization failed.",
        processed,
        failed,
      }, 500);
    }

    semanticEdges = Number(data ?? 0);
  }

  const { count: remaining } = await service
    .from("field_embeddings")
    .select("node_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["pending", "failed"]);

  return json({
    ok: true,
    model: "gte-small",
    dimensions: 384,
    threshold,
    processed,
    failed,
    neighborLinks,
    semanticEdges,
    remaining: remaining ?? 0,
    errors: errors.slice(0, 5),
  });
});

function buildEmbeddingInput(node: any, content: any): string {
  const parts: string[] = [];
  push(parts, node?.title);
  push(parts, node?.searchable_text);

  if (content) {
    push(parts, content.text_content);
    collectStrings(content.structured_content, parts);
  }

  const deduped = [...new Set(parts.map((part) => part.trim()).filter(Boolean))];
  return deduped.join("\n").slice(0, 2600);
}

function collectStrings(value: unknown, output: string[], key = ""): void {
  if (output.join(" ").length > 3200 || value == null) return;

  if (typeof value === "string") {
    if (!["id", "type", "mime_type", "source_id"].includes(key) && value.trim()) {
      output.push(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) collectStrings(item, output);
    return;
  }

  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      collectStrings(childValue, output, childKey);
    }
  }
}

function push(output: string[], value: unknown): void {
  if (typeof value === "string" && value.trim()) output.push(value);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown semantic processing error.";
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
