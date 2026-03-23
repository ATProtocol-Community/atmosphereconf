import { expect, test } from "@playwright/test";
import { CLIENT_THEMES } from "../../src/components/profile/client-themes";
import {
  getFirstEventPath,
  gotoPage,
  applyTheme,
  slugTheme,
} from "./utils";

const publicPages = [
  { name: "home", path: "/" },
  { name: "talks", path: "/talks" },
  { name: "faqs", path: "/faqs" },
  { name: "remote", path: "/remote" },
  { name: "login", path: "/login" },
] as const;

test.describe.configure({ mode: "parallel" });
test.setTimeout(120_000);

for (const route of publicPages) {
  test(`${route.name} page – all themes`, async ({ page }) => {
    await gotoPage(page, route.path);

    for (const theme of CLIENT_THEMES) {
      await applyTheme(page, route.path, theme);

      await expect(page).toHaveScreenshot(
        `${route.name}-${slugTheme(theme)}.png`,
        { fullPage: true },
      );
    }
  });
}

test("event detail page – all themes", async ({ page }) => {
  const eventPath = await getFirstEventPath(page);

  await gotoPage(page, eventPath);

  for (const theme of CLIENT_THEMES) {
    await applyTheme(page, eventPath, theme);

    await expect(page).toHaveScreenshot(
      `event-detail-${slugTheme(theme)}.png`,
      { fullPage: true },
    );
  }
});
