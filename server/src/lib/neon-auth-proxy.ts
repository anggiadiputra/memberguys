/**
 * Neon Auth Proxy Handler for Hono
 *
 * Neon Auth v0.4.x bekerja sebagai PROXY: server-side hanya meneruskan request
 * dari client ke upstream Neon Auth service (yang di-host oleh Neon).
 *
 * Handler ini mengikuti pola yang sama dengan `authApiHandler` dari
 * `@neondatabase/auth/next`, tapi diadaptasi untuk Hono.
 *
 * Required env:
 * - NEON_AUTH_BASE_URL: URL Neon Auth instance Anda (dari Neon Console)
 * - NEON_AUTH_COOKIE_SECRET: secret min 32 karakter untuk sign session cookies
 */

const AUTH_PATH_PREFIX = "/api/auth";

function getUpstreamURL(baseUrl: string, pathFromAuth: string, originalUrl: URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const upstream = new URL(pathFromAuth, base);
  // Pertahankan query string dari original request
  originalUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));
  return upstream.toString();
}

export async function handleAuthRequest(
  baseUrl: string,
  request: Request,
  pathFromAuth: string
): Promise<Response> {
  try {
    const originalUrl = new URL(request.url);
    const upstreamURL = getUpstreamURL(baseUrl, pathFromAuth, originalUrl);

    // Forward body (jika ada)
    let body: BodyInit | null = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
    }

    // Clone headers agar bisa dimodifikasi dengan aman
    const headers = new Headers(request.headers);
    
    // BetterAuth proxy requirements: 
    // Hapus header host asli agar fetch() otomatis menggunakan host upstream
    headers.delete("host");
    
    // Forward original host dan origin agar auth service mengenali domain client
    const origin = headers.get("origin") || headers.get("referer")?.split("/").slice(0, 3).join("/") || originalUrl.origin;
    headers.set("x-forwarded-host", originalUrl.host);
    headers.set("x-forwarded-proto", originalUrl.protocol.replace(":", ""));
    if (!headers.has("origin")) {
      headers.set("origin", origin);
    }

    const response = await fetch(upstreamURL, {
      method: request.method,
      headers,
      body,
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error: any) {
    console.error("[neon-auth] Proxy error:", error?.message ?? error);
    return Response.json(
      { error: "Failed to reach Neon Auth service", code: "INTERNAL_ERROR" },
      { status: 502 }
    );
  }
}

/**
 * Extract path setelah /api/auth dari URL request
 * Contoh: /api/auth/sign-in/email → "sign-in/email"
 */
function extractAuthPath(urlPath: string): string {
  if (urlPath.startsWith(AUTH_PATH_PREFIX)) {
    const after = urlPath.slice(AUTH_PATH_PREFIX.length);
    return after.replace(/^\/+/, ""); // hapus leading slash
  }
  return urlPath.replace(/^\/+/, "");
}

export function createNeonAuthProxy(config: {
  baseUrl: string;
  cookieSecret: string;
}) {
  if (!config.baseUrl) {
    throw new Error(
      "NEON_AUTH_BASE_URL is required. Get it from your Neon Console > Auth section."
    );
  }
  if (!config.cookieSecret || config.cookieSecret.length < 32) {
    throw new Error(
      "NEON_AUTH_COOKIE_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32"
    );
  }

  return async (c: any) => {
    const url = new URL(c.req.url);
    const pathFromAuth = extractAuthPath(url.pathname);
    const request = c.req.raw;
    return await handleAuthRequest(config.baseUrl, request, pathFromAuth);
  };
}
