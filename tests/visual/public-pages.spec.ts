import { expect, test } from "@playwright/test";
import { CLIENT_THEMES } from "../../src/components/profile/client-themes";
import { getFirstEventPath, gotoTheme, slugTheme } from "./utils";

const publicPages = [
  { name: "home", path: "/" },
  { name: "talks", path: "/talks" },
  { name: "faqs", path: "/faqs" },
  { name: "remote", path: "/remote" },
  { name: "login", path: "/login" },
] as const;

test.describe.configure({ mode: "parallel" });

for (const theme of CLIENT_THEMES) {
  const themeSlug = slugTheme(theme);

  test.describe(`${theme} theme`, () => {
    for (const route of publicPages) {
      test(`${route.name} page`, async ({ page }) => {
        await gotoTheme(page, route.path, theme);

        await expect(page).toHaveScreenshot(`${route.name}-${themeSlug}.png`, {
          fullPage: true,
        });
      });
    }

    test("event detail page", async ({ page }) => {
      const eventPath = await getFirstEventPath(page, theme);

      await gotoTheme(page, eventPath, theme);

      await expect(page).toHaveScreenshot(`event-detail-${themeSlug}.png`, {
        fullPage: true,
      });
    });
  });
}
