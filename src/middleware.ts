import { defineMiddleware } from "astro:middleware";
import { refreshAccessToken, setTokenCookies } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith("/profile")) {
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
