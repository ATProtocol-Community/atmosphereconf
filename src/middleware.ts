import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  if (!context.url.pathname.startsWith("/profile")) {
    return next();
  }

  if (!context.cookies.get("access_token")?.value) {
    // TODO: check if it's still valid (maybe check profile?)
    return context.redirect("/login");
  }
  return next();
});
