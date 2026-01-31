import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
  if (
    context.url.pathname.startsWith("/profile") &&
    !context.cookies.get("access_token")?.value
  ) {
    return context.redirect("/login");
  }
  return next();
});
