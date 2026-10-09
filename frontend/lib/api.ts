import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type QueryResult = {
  sql: string;
  chart: "bar" | "line" | "kpi" | "table";
  title: string;
  rows: Record<string, unknown>[];
  caveat?: string | null;
  duration_ms?: number;
};

export class QueryError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

function mapError(code: string): string {
  if (code === "rate_limited") {
    return "Rate limit reached — 20 queries per hour. Try again later.";
  }
  if (code === "unsafe_sql") {
    return "That question produced a query we couldn't safely run — try rephrasing.";
  }
  if (code.startsWith("llm_")) {
    return "The model is unavailable right now — try again shortly.";
  }
  return "Something went wrong — try again.";
}

export async function runQuery(prompt: string): Promise<QueryResult> {
  const { data, error } = await supabase.functions.invoke("text-to-sql", {
    body: { prompt },
  });
  if (error) {
    let code = "network";
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        code = body?.error?.code ?? "unknown";
      } catch {
        code = "unknown";
      }
    }
    throw new QueryError(mapError(code), code);
  }
  return data as QueryResult;
}
