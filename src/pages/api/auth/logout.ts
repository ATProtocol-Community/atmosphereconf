import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete("access_token", { path: "/" });
  cookies.delete("refresh_token", { path: "/" });
  cookies.delete("user_did", { path: "/" });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const GET: APIRoute = async ({ cookies, redirect, request }) => {
  cookies.delete("access_token", { path: "/" });
  cookies.delete("refresh_token", { path: "/" });
  cookies.delete("user_did", { path: "/" });

  let to = "/";
  try {
    const url = new URL(request.url);
    to = url.searchParams.get("to")?.startsWith("/")
      ? (url.searchParams.get("to") ?? to)
      : to;
  } catch (e) {}

  return redirect(to);
};
