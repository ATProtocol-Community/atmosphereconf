import type { APIRoute } from "astro";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  AUTH_CONFIG,
  SECURE_COOKIE_OPTIONS,
} from "../../../lib/auth";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const handle = url.searchParams.get("handle");

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // We use "secure" cookies rather than strict as this is a cross site
  // request
  cookies.set("pkce_verifier", codeVerifier, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: 600,
  });

  cookies.set("oauth_state", state, {
    ...SECURE_COOKIE_OPTIONS,
    maxAge: 600,
  });

  const authUrl = new URL(`${AUTH_CONFIG.SERVER_URL}/oauth/authorize`);
  const params: Record<string, string> = {
    client_id: AUTH_CONFIG.CLIENT_ID,
    redirect_uri: AUTH_CONFIG.REDIRECT_URI,
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    scope: "atproto transition:generic",
    ...(handle && { login_hint: handle }),
  };
  Object.entries(params).forEach(([k, v]) => authUrl.searchParams.set(k, v));

  return redirect(authUrl.toString(), 302);
};
