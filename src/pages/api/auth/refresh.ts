import type { APIRoute } from "astro";
import { AUTH_CONFIG, STRICT_COOKIE_OPTIONS } from "../../../lib/auth";

export const POST: APIRoute = async ({ cookies }) => {
  const refreshToken = cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return new Response(JSON.stringify({ error: "No refresh token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokenUrl = `${AUTH_CONFIG.SERVER_URL}/oauth/token`;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: AUTH_CONFIG.CLIENT_ID,
      client_secret: AUTH_CONFIG.CLIENT_SECRET!,
    }),
  });

  if (!tokenResponse.ok) {
    cookies.delete("access_token", { path: "/" });
    cookies.delete("refresh_token", { path: "/" });
    cookies.delete("user_did", { path: "/" });
    return new Response(JSON.stringify({ error: "Refresh failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = await tokenResponse.json();

  cookies.set("access_token", tokens.access_token, {
    ...STRICT_COOKIE_OPTIONS,
    maxAge: tokens.expires_in,
  });

  if (tokens.refresh_token) {
    cookies.set("refresh_token", tokens.refresh_token, {
      ...STRICT_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
