function toBase64url(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64url");
}

export function generateCodeVerifier(): string {
  return toBase64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return toBase64url(digest);
}

export function generateState(): string {
  return toBase64url(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export const AUTH_CONFIG = {
  SERVER_URL:
    import.meta.env.QUICKSLICE_SERVER ||
    "https://orgatmosphereconf.slices.network",
  CLIENT_ID: import.meta.env.QUICKSLICE_CLIENT_ID,
  CLIENT_SECRET: import.meta.env.QUICKSLICE_CLIENT_SECRET,
  REDIRECT_URI:
    import.meta.env.QUICKSLICE_REDIRECT_URI ||
    "http://localhost:4321/api/auth/callback",
};

// "lax" — used for PKCE cookies that must survive the cross-site OAuth redirect
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
};

// "strict" — used for token cookies that are only read by same-site requests
export const STRICT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "strict" as const,
  path: "/",
};
