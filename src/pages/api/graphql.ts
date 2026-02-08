import type { APIRoute } from "astro";
import {
  AUTH_CONFIG,
  refreshAccessToken,
  setTokenCookies,
} from "../../lib/auth";

const GRAPHQL_URL = `${AUTH_CONFIG.SERVER_URL}/graphql`;

function makeGraphQLRequest(body: unknown, accessToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();
  const response = await makeGraphQLRequest(body, cookies.get("access_token")?.value);

  if (response.status !== 401) {
    return jsonResponse(await response.json(), response.status);
  }

  const refreshToken = cookies.get("refresh_token")?.value;
  if (!refreshToken) {
    return jsonResponse(await response.json(), response.status);
  }

  const tokens = await refreshAccessToken(refreshToken);
  if (!tokens) {
    return jsonResponse(await response.json(), response.status);
  }

  setTokenCookies(cookies, tokens);
  const retryResponse = await makeGraphQLRequest(body, tokens.access_token);
  return jsonResponse(await retryResponse.json(), retryResponse.status);
};
