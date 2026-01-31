import type { APIRoute } from "astro";
import { AUTH_CONFIG, STRICT_COOKIE_OPTIONS } from "../../../lib/auth";

const TOKEN_URL = `${AUTH_CONFIG.SERVER_URL}/oauth/token`;

const redirectWithError = (
  description: string,
  redirect: Parameters<APIRoute>[0]["redirect"],
) => {
  return redirect(`/login?error=${encodeURIComponent(description)}`);
};

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    const desc = url.searchParams.get("error_description") || "Unknown error";
    return redirectWithError(desc, redirect);
  }

  if (!code || !state) {
    return redirectWithError("Missing code or state", redirect);
  }

  const savedState = cookies.get("oauth_state")?.value;
  if (state !== savedState) {
    return redirectWithError("State mismatch", redirect);
  }

  const codeVerifier = cookies.get("pkce_verifier")?.value;
  if (!codeVerifier) {
    return redirectWithError("Missing PKCE data", redirect);
  }

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: AUTH_CONFIG.REDIRECT_URI,
      client_id: AUTH_CONFIG.CLIENT_ID,
      client_secret: AUTH_CONFIG.CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token exchange failed:", errorText);
    return redirectWithError("Token exchange failed", redirect);
  }

  const tokens = await tokenResponse.json();

  // Clear PKCE cookies...
  cookies.delete("pkce_verifier", { path: "/" });
  cookies.delete("oauth_state", { path: "/" });

  // ...and add the tokens in new secret ones
  cookies.set("access_token", tokens.access_token, {
    ...STRICT_COOKIE_OPTIONS,
    maxAge: tokens.expires_in,
  });

  cookies.set("refresh_token", tokens.refresh_token, {
    ...STRICT_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 30,
  });

  cookies.set("user_did", tokens.sub, {
    ...STRICT_COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 30,
  });

  return redirect("/profile");
};
