import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const apiRoot = join(process.cwd(), "app", "api");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(path) : entry.name === "route.ts" ? [path] : [];
  });
}

function routeName(path: string) {
  return relative(process.cwd(), path).split(sep).join("/");
}

describe("API mutation protection", () => {
  it("requires same-origin protection for every browser mutation", () => {
    const uncovered = routeFiles(apiRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      if (!/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(source)) return [];

      const name = routeName(path);
      if (name === "app/api/webhooks/automation/route.ts") {
        return source.includes("verifyWebhookSignature") && source.includes("reserveWebhook") ? [] : [name];
      }
      if (name === "app/api/security/csp-report/route.ts") {
        return source.includes("MAX_REPORT_BYTES") && source.includes("CONTENT_TYPES") ? [] : [name];
      }
      return source.includes("isSameOrigin") ? [] : [name];
    });

    expect(uncovered).toEqual([]);
  });

  it("keeps rate limits on authentication, chat, upload and search endpoints", () => {
    const protectedRoutes = [
      "app/api/admin/login/route.ts",
      "app/api/admin/search/route.ts",
      "app/api/admin/media/route.ts",
      "app/api/admin/clients/[id]/messages/route.ts",
      "app/api/admin/projects/[id]/images/route.ts",
      "app/api/admin/projects/[id]/messages/route.ts",
      "app/api/client/auth/login/route.ts",
      "app/api/client/auth/recover/route.ts",
      "app/api/client/auth/register/route.ts",
      "app/api/client/auth/reset-password/route.ts",
      "app/api/client/messages/route.ts",
      "app/api/client/projects/[id]/images/route.ts",
      "app/api/client/projects/[id]/messages/route.ts",
    ];

    const uncovered = protectedRoutes.filter((name) => {
      const source = readFileSync(join(process.cwd(), ...name.split("/")), "utf8");
      return !source.includes("rateLimit(") || !source.includes("tooManyRequests(");
    });

    expect(uncovered).toEqual([]);
  });
});
