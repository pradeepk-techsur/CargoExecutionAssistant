// The shell browser suite (TechArch §7.8, §8.3 scenario 5; F2 acceptance 1,2,5,7).
//
// This is a FUNCTIONAL, keyboard-oriented suite. It asserts NO WCAG rule and
// uses NO accessibility scanner (§7.8); it asserts structure, focus and keyboard
// behaviour — landmark counts, focus destinations, tab order, nav cardinality —
// which is what a browser can actually prove. The conformance mechanism is the
// signed per-screen review of §7.7 (plan 02-09), not this file.

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { E2E_ENV } from './env.js';

const BASE = 'http://127.0.0.1:3000';

// The canonical excluded-affordance term list (see <excluded_affordance_scan>).
// The same list the 02-09 architecture spec uses; both derive from the plan.
// Word-boundary anchored where the word is also ordinary English, so `reports`
// does not match `reporter` and a legitimate destination is not false-failed.
const EXCLUDED = new RegExp(
  [
    'dashboard',
    '\\breports?\\b',
    '\\bmetrics?\\b',
    'analytics',
    'settings',
    'preferences',
    '\\badmin(istration)?\\b',
    'user management',
    '\\bexport\\b',
    'download',
    '\\bsearch\\b',
    '\\bfilter\\b',
    'sort by',
    'assign',
    'priority',
  ].join('|'),
  'i',
);

/**
 * Sign in THROUGH THE API (not the sign-in screen, which plan 02-07 builds):
 * POST /api/session with the bootstrap credentials, then add the returned
 * cargoexec_sid cookie to the browser context.
 */
async function authenticate(
  request: APIRequestContext,
  page: Page,
): Promise<void> {
  const res = await request.post(`${BASE}/api/session`, {
    data: {
      email: E2E_ENV.BOOTSTRAP_SPECIALIST_EMAIL,
      password: E2E_ENV.BOOTSTRAP_SPECIALIST_PASSWORD,
    },
    headers: { 'content-type': 'application/json' },
  });
  expect(res.status(), 'POST /api/session should sign in the bootstrap account').toBe(
    201,
  );
  const setCookie = res.headers()['set-cookie'] ?? '';
  const match = /cargoexec_sid=([^;]+)/.exec(setCookie);
  expect(match, 'a cargoexec_sid cookie should be returned').not.toBeNull();
  const sid = match![1];

  await page.context().addCookies([
    {
      name: 'cargoexec_sid',
      value: sid,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

// ── The reduced (unauthenticated) shell, at /sign-in ─────────────────────────

test.describe('reduced shell (/sign-in, unauthenticated)', () => {
  test('0. GET /sign-in returns 200 serving the SPA document; /assets/app.css is reachable unauthenticated', async ({
    request,
  }) => {
    // Owned here (moved from plan 02-06 Task 1): 02-06's withApi harness runs
    // with serveStatic:false and web/dist does not exist in wave 4, so it can
    // only prove the negative half. This suite runs the real static-serving
    // server and proves the positive half.
    const doc = await request.get(`${BASE}/sign-in`);
    expect(doc.status()).toBe(200);
    expect(await doc.text()).toContain('id="root"');

    const css = await request.get(`${BASE}/assets/app.css`);
    expect(css.status()).toBe(200);
    expect([401, 302]).not.toContain(css.status());
  });

  test('1. exactly one banner/main/contentinfo and ZERO primary nav', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    await expect(page.locator('header[role="banner"]')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('footer[role="contentinfo"]')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(0);
  });

  test('2. no Sign out control anywhere', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(0);
  });

  test('3. the government banner disclosure toggles with the keyboard', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    // Role/label-based locator (not a class name) so this assertion survives the
    // next visual-system swap: the Carbon banner disclosure is a <button> named
    // "Here's how you know".
    const toggle = page.getByRole('button', { name: /here.s how you know/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('4. the skip link is first in tab order and moves focus into main', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);

    // The skip link is the FIRST focusable element in the DOM (tab order). We
    // assert its position directly rather than simulating "Tab from document
    // start": useScreenFocus moves focus to the h1 on load (FR-2.24), and
    // headless Chromium does not reliably reset the sequential-focus starting
    // point via body.blur() — so a Tab here would flakily start from the h1, not
    // the top. DOM tab-order position is the faithful, deterministic assertion.
    const firstTabbableClass = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]',
        ),
      ).filter((el) => el.tabIndex >= 0);
      return candidates[0]?.className ?? '';
    });
    // Carbon's SkipToContent renders a.cds--skip-to-content as the first
    // focusable element (the Carbon equivalent of USWDS's usa-skipnav).
    expect(firstTabbableClass).toContain('cds--skip-to-content');

    // Activating the skip link moves focus INTO main.
    const skip = page.locator('a.cds--skip-to-content');
    await skip.focus();
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    // Give the hash-navigation + focus a tick.
    await page.waitForTimeout(100);
    const insideMain = await page.evaluate(() => {
      const active = document.activeElement;
      const main = document.getElementById('main-content');
      return main !== null && (main === active || main.contains(active));
    });
    expect(insideMain).toBe(true);
  });

  test('5. lang="en" and the title ends "— CargoExec"', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/— CargoExec$/);
  });

  test('6. exactly one h1', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});

// ── The authenticated shell ──────────────────────────────────────────────────

test.describe('authenticated shell', () => {
  test.beforeEach(async ({ request, page }) => {
    await authenticate(request, page);
  });

  test('7. primary nav has exactly two links with the right names', async ({
    page,
  }) => {
    await page.goto(`${BASE}/queue`);
    const links = page.locator('nav[aria-label="Primary"] a');
    await expect(links).toHaveCount(2);
    await expect(
      page.locator('nav[aria-label="Primary"]').getByRole('link', {
        name: 'Review queue',
      }),
    ).toHaveCount(1);
    await expect(
      page.locator('nav[aria-label="Primary"]').getByRole('link', {
        name: 'New cargo entry',
      }),
    ).toHaveCount(1);
  });

  test('8. the active destination carries aria-current="page"', async ({
    page,
  }) => {
    await page.goto(`${BASE}/queue`);
    const current = page.locator('nav[aria-label="Primary"] a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(/Review queue/);
  });

  test('9. no excluded affordance in nav/header/main (NOT the footer)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/queue`);
    // Collect accessible name + href of every interactive element inside the
    // three scanned landmarks. Deliberately NOT page.content(): the footer's
    // agency-identifier required-links row contains the statutory "Performance
    // reports" link, which is federal conformance markup, not a product
    // reporting surface.
    const strings = await page.evaluate(() => {
      const roots = [
        'nav[aria-label="Primary"]',
        'header[role="banner"]',
        'main#main-content',
      ];
      const out: string[] = [];
      for (const sel of roots) {
        const root = document.querySelector(sel);
        if (root === null) continue;
        const els = root.querySelectorAll(
          'a, button, [role="link"], [role="button"]',
        );
        els.forEach((el) => {
          out.push(el.textContent ?? '');
          const href = el.getAttribute('href');
          if (href !== null) out.push(href);
          const label = el.getAttribute('aria-label');
          if (label !== null) out.push(label);
        });
      }
      return out;
    });
    for (const s of strings) {
      expect(
        EXCLUDED.test(s),
        `excluded affordance term found in nav/header/main: ${JSON.stringify(s)}`,
      ).toBe(false);
    }
  });

  test('10. the header shows the display name and a Sign out control', async ({
    page,
  }) => {
    await page.goto(`${BASE}/queue`);
    await expect(
      page.locator('header[role="banner"]').getByText(
        E2E_ENV.BOOTSTRAP_SPECIALIST_NAME,
      ),
    ).toHaveCount(1);
    await expect(
      page.locator('header[role="banner"]').getByRole('button', {
        name: /sign out/i,
      }),
    ).toHaveCount(1);
  });

  test('11. navigating changes the title and moves focus to the screen h1', async ({
    page,
  }) => {
    await page.goto(`${BASE}/queue`);
    await page
      .locator('nav[aria-label="Primary"]')
      .getByRole('link', { name: 'New cargo entry' })
      .click();
    await expect(page).toHaveTitle('New cargo entry — CargoExec');
    const onH1 = await page.evaluate(() => {
      const active = document.activeElement;
      return (
        active !== null &&
        active.tagName === 'H1' &&
        (active.textContent ?? '').includes('New cargo entry')
      );
    });
    expect(onH1).toBe(true);
  });

  test('12. both live regions exist in the DOM', async ({ page }) => {
    await page.goto(`${BASE}/queue`);
    await expect(page.locator('[aria-live="polite"]')).toHaveCount(1);
    await expect(page.locator('[aria-live="assertive"]')).toHaveCount(1);
  });

  test('13. no element has tabindex greater than 0', async ({ page }) => {
    await page.goto(`${BASE}/queue`);
    const maxTabindex = await page.evaluate(() => {
      let max = 0;
      document.querySelectorAll('[tabindex]').forEach((el) => {
        const t = Number(el.getAttribute('tabindex'));
        if (Number.isFinite(t) && t > max) max = t;
      });
      return max;
    });
    expect(maxTabindex).toBeLessThanOrEqual(0);
  });

  test('14. body does not scroll horizontally at 320px or 200%-equivalent zoom', async ({
    page,
  }) => {
    await page.goto(`${BASE}/queue`);
    await page.setViewportSize({ width: 320, height: 800 });
    const overflow320 = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow320, 'no horizontal scroll at 320px').toBe(false);

    // 1280×800 at a 200% device-scale-equivalent zoom → 640 CSS-px content box.
    await page.setViewportSize({ width: 640, height: 800 });
    const overflowZoom = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflowZoom, 'no horizontal scroll at 200%-equivalent zoom').toBe(
      false,
    );
  });

  test('15. an unknown route renders Page not found inside the shell', async ({
    page,
  }) => {
    await page.goto(`${BASE}/nope`);
    await expect(page.locator('h1')).toHaveText('Page not found');
    await expect(page.locator('footer[role="contentinfo"]')).toHaveCount(1);
    // Scope to main: the nav also has a "Review queue" link, so an unscoped
    // by-name query would legitimately match two elements.
    await expect(
      page.locator('main#main-content').getByRole('link', {
        name: /review queue/i,
      }),
    ).toHaveCount(1);
    const onH1 = await page.evaluate(() => {
      const active = document.activeElement;
      return active !== null && active.tagName === 'H1';
    });
    expect(onH1).toBe(true);
  });
});
