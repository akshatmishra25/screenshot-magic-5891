/**
 * Resolves the trusted origin of an incoming request across local dev,
 * Vercel Serverless Functions, reverse proxies, and Lovable previews.
 */
export function resolveRequestOrigin(request: Request, clientOrigin?: string): string {
  // If client provided its window.location.origin, validate that it is a safe web origin
  if (clientOrigin) {
    try {
      const parsed = new URL(clientOrigin);
      if (
        (parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        !parsed.username &&
        !parsed.password
      ) {
        return parsed.origin;
      }
    } catch {
      // Ignore invalid client origin and proceed with request headers
    }
  }

  // 1. Check Origin header sent by browser
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      if (
        (parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        !parsed.username &&
        !parsed.password
      ) {
        return parsed.origin;
      }
    } catch {
      // Ignore and continue
    }
  }

  // 2. Check Referer header
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (
        (parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        !parsed.username &&
        !parsed.password
      ) {
        return parsed.origin;
      }
    } catch {
      // Ignore and continue
    }
  }

  // 3. Check proxy/Vercel forwarded headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
  if (host) {
    return `${proto}://${host}`;
  }

  // 4. Environment variable overrides (Vercel production and preview domains)
  if (process.env["APP_URL"]) {
    try {
      return new URL(process.env["APP_URL"]).origin;
    } catch {
      // Ignore
    }
  }
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"]) {
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  }
  if (process.env["VERCEL_URL"]) {
    return `https://${process.env["VERCEL_URL"]}`;
  }

  // 5. Fallback to request.url
  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

/**
 * Validates whether a request originates from the same site/origin,
 * taking into account Sec-Fetch-Site and forwarded headers on Vercel.
 */
export function isAllowedSameOrigin(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin") {
    return true;
  }

  const trustedOrigin = resolveRequestOrigin(request);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (origin === trustedOrigin || new URL(origin).origin === new URL(request.url).origin) {
        return true;
      }
    } catch {
      // Ignore
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin === trustedOrigin || new URL(referer).origin === new URL(request.url).origin) {
        return true;
      }
    } catch {
      // Ignore
    }
  }

  return false;
}
