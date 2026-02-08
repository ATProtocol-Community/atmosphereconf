import type { APIRoute } from "astro";
import { refreshAccessToken, setTokenCookies } from "../../../lib/auth";

export const POST: APIRoute = async ({ cookies }) => {
  const refreshToken = cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return new Response(JSON.stringify({ error: "No refresh token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = await refreshAccessToken(refreshToken);

  if (!tokens) {
    cookies.delete("access_token", { path: "/" });
    cookies.delete("refresh_token", { path: "/" });
    cookies.delete("user_did", { path: "/" });
    return new Response(JSON.stringify({ error: "Refresh failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  setTokenCookies(cookies, tokens);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
