import { defineMiddleware } from "astro:middleware";
import { refreshAccessToken, setTokenCookies } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  // Only protect the logged-in user's own profile pages, not public /profile/[handle] routes
  const isProtected =
    pathname === "/profile" ||
    pathname === "/profile/" ||
    pathname.startsWith("/profile/settings");
  if (!isProtected) {
    return next();
  }

  if (context.cookies.get("access_token")?.value) {
    return next();
  }

  const refreshToken = context.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    const tokens = await refreshAccessToken(refreshToken);
    if (tokens) {
      setTokenCookies(context.cookies, tokens);
      return next();
    }
  }

  return context.redirect("/login");
});
