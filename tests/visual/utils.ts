import type { Page } from "@playwright/test";

export function slugTheme(theme: string) {
  return theme
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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
      .filter(
        (image) =>
          image.offsetParent !== null || image.getClientRects().length > 0,
      )
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

async function waitForVisualReady(page: Page) {
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

const fujocodedStabilizer = `
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
`;

/**
 * Navigate to a page once. Call this before cycling themes with applyTheme.
 */
export async function gotoPage(page: Page, pathname: string) {
  await page.goto(pathname, { waitUntil: "domcontentloaded" });
  await waitForVisualReady(page);
}

/**
 * Switch theme via DOM (no navigation), apply stabilizers, and scroll to top.
 */
export async function applyTheme(page: Page, pathname: string, theme: string) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);

  // Let theme CSS repaint
  await page.waitForTimeout(500);

  if (theme === "fujocoded") {
    await page.addStyleTag({ content: fujocodedStabilizer });
  }

  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Get the first event detail path from /talks.
 */
export async function getFirstEventPath(page: Page) {
  await gotoPage(page, "/talks");

  const href = await page
    .locator('a[href^="/event/"]')
    .first()
    .getAttribute("href");
  if (!href) {
    throw new Error("No public event detail link was found on /talks.");
  }

  return href;
}
