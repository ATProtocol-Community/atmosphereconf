import type { Page } from "@playwright/test";

export function slugTheme(theme: string) {
  return theme.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export function withTheme(pathname: string, theme: string) {
  const url = new URL(pathname, "http://127.0.0.1");
  url.searchParams.set("theme", theme);
  return `${url.pathname}${url.search}`;
}

export async function waitForAllImages(page: Page) {
  await page.evaluate(() => {
    for (const image of document.images) {
      if (image.loading === "lazy") {
        image.loading = "eager";
      }
    }
  });

  await page.waitForFunction(() =>
    [...document.images]
      .filter((image) => image.offsetParent !== null || image.getClientRects().length > 0)
      .every((image) => image.complete),
  );
}

export async function waitForFonts(page: Page) {
  await page.waitForFunction(async () => {
    if (!("fonts" in document)) {
      return true;
    }

    await document.fonts.ready;
    return document.fonts.status === "loaded";
  });
}

export async function waitForVisualReady(page: Page) {
  await page.waitForLoadState("networkidle");
  await waitForFonts(page);
  await waitForAllImages(page);

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        caret-color: transparent !important;
      }
    `,
  });

  await page.evaluate(() => window.scrollTo(0, 0));
}

async function applyVisualStabilizers(
  page: Page,
  pathname: string,
  theme: string,
) {
  if (pathname === "/") {
    await page.waitForTimeout(2000);
  }

  if (theme === "fujocoded") {
    await page.addStyleTag({
      content: `
        [data-theme="fujocoded"] [data-header-bar] {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        [data-theme="fujocoded"] [data-header-bar]::before,
        [data-theme="fujocoded"] .ticket-stub,
        [data-theme="fujocoded"] .ticket-tab,
        [data-theme="fujocoded"] .ticket-body,
        [data-theme="fujocoded"] .nav-ticket-tape,
        [data-theme="fujocoded"] .nav-ticket-peel {
          animation: none !important;
          filter: none !important;
          background-position: 0 0 !important;
        }
      `,
    });
  }
}

export async function gotoTheme(page: Page, pathname: string, theme: string) {
  await page.goto(withTheme(pathname, theme), {
    waitUntil: "domcontentloaded",
  });
  await waitForVisualReady(page);
  await applyVisualStabilizers(page, pathname, theme);
}

export async function getFirstEventPath(page: Page, theme: string) {
  await gotoTheme(page, "/talks", theme);

  const href = await page.locator('a[href^="/event/"]').first().getAttribute("href");
  if (!href) {
    throw new Error("No public event detail link was found on /talks.");
  }

  return href;
}
