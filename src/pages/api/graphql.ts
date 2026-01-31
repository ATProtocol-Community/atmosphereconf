import type { APIRoute } from "astro";
import { AUTH_CONFIG } from "../../lib/auth";

const GRAPHQL_URL = `${AUTH_CONFIG.SERVER_URL}/graphql`;

export const POST: APIRoute = async ({ request, cookies }) => {
  const accessToken = cookies.get("access_token")?.value;

  const body = await request.json();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // If unauthorized, try refreshing the token
  if (response.status === 401) {
    const refreshResult = await refreshAndRetry(cookies, body);
    if (refreshResult) return refreshResult;
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
};

async function refreshAndRetry(
  cookies: Parameters<APIRoute>[0]["cookies"],
  body: unknown,
): Promise<Response | null> {
  const refreshToken = cookies.get("refresh_token")?.value;
  if (!refreshToken) return null;

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
    }),
  });

  if (!tokenResponse.ok) return null;

  const tokens = await tokenResponse.json();

  cookies.set("access_token", tokens.access_token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "strict",
    path: "/",
    maxAge: tokens.expires_in,
  });

  if (tokens.refresh_token) {
    cookies.set("refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  // Retry the GraphQL request with new token
  const retryResponse = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await retryResponse.json();
  return new Response(JSON.stringify(data), {
    status: retryResponse.status,
    headers: { "Content-Type": "application/json" },
  });
}
