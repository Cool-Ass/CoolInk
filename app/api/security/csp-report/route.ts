const MAX_REPORT_BYTES = 32 * 1024;
const CONTENT_TYPES = ["application/csp-report", "application/reports+json", "application/json"];

function safeLocation(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return value.slice(0, 200);
  }
}

function compactReport(input: unknown) {
  const envelope = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const body = envelope["csp-report"] && typeof envelope["csp-report"] === "object"
    ? envelope["csp-report"] as Record<string, unknown>
    : envelope.body && typeof envelope.body === "object"
      ? envelope.body as Record<string, unknown>
      : envelope;
  return {
    directive: String(body["effective-directive"] ?? body["violated-directive"] ?? "unknown").slice(0, 120),
    disposition: String(body.disposition ?? "report").slice(0, 40),
    document: safeLocation(body["document-uri"] ?? body.documentURL),
    blocked: safeLocation(body["blocked-uri"] ?? body.blockedURL),
    source: safeLocation(body["source-file"] ?? body.sourceFile),
    line: typeof body["line-number"] === "number" ? body["line-number"] : body.lineNumber,
    column: typeof body["column-number"] === "number" ? body["column-number"] : body.columnNumber,
  };
}

export async function POST(request: Request) {
  const type = request.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? "";
  if (!CONTENT_TYPES.includes(type)) return new Response(null, { status: 415 });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_REPORT_BYTES) return new Response(null, { status: 413 });

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_REPORT_BYTES) return new Response(null, { status: 413 });
  try {
    const parsed = JSON.parse(raw) as unknown;
    const reports = Array.isArray(parsed) ? parsed.slice(0, 20) : [parsed];
    for (const report of reports) console.warn("CSP_REPORT", JSON.stringify(compactReport(report)));
  } catch {
    return new Response(null, { status: 400 });
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
