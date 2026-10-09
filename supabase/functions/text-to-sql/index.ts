// Supabase Edge Function: text-to-sql
// POST { prompt } -> Gemini 2.5 Flash -> validated read-only SQL -> run_hotel_analytics RPC.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { validateSql } from "./sql_guard.ts";

const RATE_LIMIT_PER_HOUR = 20;
const MAX_PROMPT_CHARS = 500;
const GEMINI_TIMEOUT_MS = 20_000;
const RPC_TIMEOUT_MS = 10_000;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

const CHARTS = ["bar", "line", "kpi", "table"] as const;

const SYSTEM_PROMPT =
  `You translate hospitality analytics questions into one read-only PostgreSQL query.

Schema (schema public):
  properties(id uuid pk, name text, location text, total_rooms int)
  daily_metrics(id uuid pk, property_id uuid references properties(id), metric_date date,
    rooms_sold int, total_revenue numeric(10,2), adr numeric(10,2), occupancy_pct numeric(5,2),
    revpar numeric(10,2), unique(property_id, metric_date))
  adr = total_revenue / rooms_sold; occupancy_pct is a percentage (0-100); revpar = revenue per available room.

Rules:
- Output exactly one SELECT or WITH ... SELECT statement. Never end with a semicolon and never use semicolons anywhere.
- Never use double quotes. Use lowercase unquoted identifiers only. Use single quotes for string literals.
- Reference only the tables properties and daily_metrics. Read-only; no DDL/DML, no functions with side effects.
- Join daily_metrics to properties on daily_metrics.property_id = properties.id when property names are needed.
- Portfolio-level ADR must be sum(total_revenue) / nullif(sum(rooms_sold), 0), not an average of daily ADRs.
- Portfolio-level occupancy must be sum(rooms_sold) / nullif(sum(total_rooms), 0) * 100 over matching rows; RevPAR = sum(total_revenue) / nullif(sum(total_rooms), 0).
- Use current_date for relative dates (e.g. last 30 days: metric_date >= current_date - 30).
- Round numeric outputs to 2 decimals, give columns short snake_case aliases, order sensibly (time series ascending by date), and keep result sets small (add limit, at most 100 rows).
- recommended_chart: line for time series, bar for category comparisons, kpi for a single-row single-value answer, table otherwise.
- report_title: a short human-readable title.
- caveat: optional single sentence a reader needs before trusting the result, e.g. a requested metric is not tracked so a proxy is used, or the period is partial (month-to-date). Leave empty when there is none.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sql: { type: "STRING" },
    recommended_chart: { type: "STRING", enum: [...CHARTS] },
    report_title: { type: "STRING" },
    caveat: { type: "STRING" },
  },
  required: ["sql", "recommended_chart", "report_title"],
};

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function allowedOrigins(): string[] {
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(
  body: unknown,
  status: number,
  cors: Record<string, string>,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...extra, "Content-Type": "application/json" },
  });
}

function errorResponse(
  e: ApiError,
  cors: Record<string, string>,
  extra: Record<string, string> = {},
) {
  return json(
    { error: { code: e.code, message: e.message } },
    e.status,
    cors,
    extra,
  );
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(
    new Uint8Array(digest),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

async function readPrompt(req: Request): Promise<string> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "invalid_input", "Request body must be valid JSON");
  }
  const prompt = (body as { prompt?: unknown } | null)?.prompt;
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new ApiError(
      400,
      "invalid_input",
      "prompt must be a non-empty string",
    );
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new ApiError(
      400,
      "invalid_input",
      `prompt must be at most ${MAX_PROMPT_CHARS} characters`,
    );
  }
  return prompt.trim();
}

type GeminiOutput = {
  sql: string;
  recommended_chart: (typeof CHARTS)[number];
  report_title: string;
  caveat?: string;
};

async function callGemini(
  prompt: string,
  apiKey: string,
): Promise<GeminiOutput> {
  let res: Response;
  try {
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(
      502,
      "llm_unavailable",
      "Model request failed or timed out",
    );
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new ApiError(502, "llm_error", `Model returned HTTP ${res.status}`);
  }
  try {
    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    const out = JSON.parse(text);
    if (
      typeof out?.sql !== "string" ||
      typeof out?.report_title !== "string" ||
      !CHARTS.includes(out?.recommended_chart)
    ) {
      throw new Error("shape");
    }
    out.caveat = typeof out.caveat === "string" ? out.caveat.trim() : "";
    return out as GeminiOutput;
  } catch {
    throw new ApiError(
      502,
      "llm_bad_response",
      "Model returned an unusable response",
    );
  }
}

async function handle(
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  if (req.method !== "POST") {
    return errorResponse(
      new ApiError(405, "method_not_allowed", "Use POST"),
      cors,
      { Allow: "POST, OPTIONS" },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const salt = Deno.env.get("IP_HASH_SALT");
  if (!supabaseUrl || !serviceKey || !geminiKey || !salt) {
    console.error("missing required environment configuration");
    throw new ApiError(500, "server_misconfigured", "Server is not configured");
  }

  const prompt = await readPrompt(req);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rate limit
  const ipHash = await hashIp(clientIp(req), salt);
  const { data: count, error: countErr } = await supabase.rpc(
    "count_recent_queries",
    { p_ip_hash: ipHash },
  );
  if (countErr) {
    console.error("count_recent_queries failed", countErr.code);
    throw new ApiError(
      500,
      "rate_limit_check_failed",
      "Could not verify rate limit",
    );
  }
  if (typeof count === "number" && count >= RATE_LIMIT_PER_HOUR) {
    throw new ApiError(
      429,
      "rate_limited",
      `Rate limit of ${RATE_LIMIT_PER_HOUR} queries per hour exceeded`,
    );
  }
  const { error: logErr } = await supabase.from("ai_query_log").insert({
    ip_hash: ipHash,
  });
  if (logErr) {
    console.error("ai_query_log insert failed", logErr.code);
    throw new ApiError(
      500,
      "rate_limit_check_failed",
      "Could not record request",
    );
  }

  // LLM
  const gen = await callGemini(prompt, geminiKey);
  const check = validateSql(gen.sql);
  if (!check.ok) {
    console.warn("rejected generated SQL:", check.reason);
    throw new ApiError(
      400,
      "unsafe_sql",
      `Generated query was rejected: ${check.reason}`,
    );
  }

  // Execute (own timeout; the RPC's statement_timeout does not cover itself)
  const rpcStart = performance.now();
  const { data: rows, error: rpcErr } = await supabase
    .rpc("run_hotel_analytics", { sql_query: check.sql })
    .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));
  const durationMs = Math.round(performance.now() - rpcStart);
  if (rpcErr) {
    console.error("run_hotel_analytics failed", rpcErr.code, rpcErr.message);
    const timedOut = /abort|timeout/i.test(rpcErr.message ?? "");
    throw new ApiError(
      500,
      timedOut ? "query_timeout" : "query_failed",
      "The generated query could not be executed",
    );
  }

  return json(
    {
      sql: check.sql,
      chart: gen.recommended_chart,
      title: gen.report_title,
      rows: rows ?? [],
      caveat: gen.caveat || null,
      duration_ms: durationMs,
    },
    200,
    cors,
  );
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    if (origin && !cors["Access-Control-Allow-Origin"]) {
      return new Response(null, { status: 403, headers: cors });
    }
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    return await handle(req, cors);
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e, cors);
    console.error(
      "unhandled error",
      e instanceof Error ? e.message : "unknown",
    );
    return errorResponse(
      new ApiError(500, "internal_error", "Internal error"),
      cors,
    );
  }
});
