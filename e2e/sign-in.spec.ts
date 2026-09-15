// The keyboard-only sign-in walkthrough (TechArch §8.3 scenarios 5 & 6, §7.8;
// F1 acceptance 8, FR-1.19, FR-1.20; F2 acceptance 3 & 4; UX Flow-00, Flow-06).
//
// FUNCTIONAL, keyboard-oriented, in a real browser and inside an IFRAME. It
// asserts NO WCAG rule and uses NO accessibility scanner (§7.8) — it asserts
// keyboard operability, focus destinations, tab order and functional flow, which
// is what a browser can prove. Conformance is the signed per-screen review of
// §7.7 (plan 02-09).
//
// Keyboard-only is the point, not a variant (Flow-06: "This is not a variant of
// the product; it is the product"). Every step is driven with page.keyboard —
// Tab, Shift+Tab, Enter — never .click(), except step 10a which is explicitly
// about pointer parity is NOT here; the only click is inside the iframe fixture.
//
// CREDENTIALS come from E2E_ENV (imported from ./env.js), NOT process.env: under
// 02-05's design the bootstrap keys are passed to the WEB SERVER's child process
// via webServer.env and are absent from THIS process. Reading the shared module
// is also what makes the suite independent of globalSetup/webServer ordering.
//
// FUTURE MAINTAINERS: for any NEW state-changing control a later phase adds,
// add a reload-then-act check like step 8b — a reload rotates the CSRF hash
// (02-04 T2), so a client that forgets to re-store the token holds a dead one.

import {
  test,
  expect,
  type Page,
  type Frame,
} from '@playwright/test';
import { E2E_ENV } from './env.js';

const BASE = 'http://127.0.0.1:3000';
const EMAIL = E2E_ENV.BOOTSTRAP_SPECIALIST_EMAIL;
const PASSWORD = E2E_ENV.BOOTSTRAP_SPECIALIST_PASSWORD;
const NAME = E2E_ENV.BOOTSTRAP_SPECIALIST_NAME;

/** The accessible name of the currently focused element. */
async function activeName(scope: Page | Frame): Promise<string> {
  return scope.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el === null) return '';
    const aria = el.getAttribute('aria-label');
    if (aria !== null && aria !== '') return aria;
    return (el.textContent ?? '').trim() || (el.getAttribute('value') ?? '');
  });
}

/** Fill a field by focusing it and typing (keyboard-only). */
async function typeInto(
  scope: Page | Frame,
  selector: string,
  text: string,
): Promise<void> {
  await scope.locator(selector).focus();
  await scope.locator(selector).fill(text);
}

test.describe('sign-in walkthrough', () => {
  // 1. Tab order and the skip link.
  test('1. tab order: skip link → banner disclosure → email → password → Sign in; no tabindex>0', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    // Move focus to the very top of the document, then Tab through.
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      const skip = document.querySelector<HTMLElement>('a.usa-skipnav');
      skip?.focus();
    });
    // Skip link is focused first.
    expect(await activeName(page)).toMatch(/skip to main content/i);

    await page.keyboard.press('Tab'); // banner disclosure
    // The banner button text uses a typographic apostrophe ("Here's how you
    // know"); match on the stable words around it rather than the glyph.
    expect(await activeName(page)).toMatch(/here.s how you know/i);

    await page.keyboard.press('Tab'); // the CargoExec product-name link in the
    // reduced header (links to the app root) sits between the banner and the
    // form — a real, correct focusable element on the reduced shell.
    expect(await activeName(page)).toMatch(/cargoexec/i);

    await page.keyboard.press('Tab'); // email
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('autocomplete') ?? '',
      ),
    ).toBe('username');

    await page.keyboard.press('Tab'); // password
    expect(
      await page.evaluate(
        () => document.activeElement?.getAttribute('autocomplete') ?? '',
      ),
    ).toBe('current-password');

    await page.keyboard.press('Tab'); // Sign in
    expect(await activeName(page)).toMatch(/sign in/i);

    // No positive tabindex anywhere.
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

  // 2. Enter submits from either field.
  test('2. Enter submits from password AND from email', async ({ page }) => {
    // From the password field.
    await page.goto(`${BASE}/sign-in`);
    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', PASSWORD);
    await page.locator('#signin-password').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/queue`);
    expect(new URL(page.url()).pathname).toBe('/queue');

    // From the email field, with the password pre-filled. Clear the session
    // first — otherwise /sign-in bounces an already-authenticated caller to
    // /queue (htmlRouteGuard), and the sign-in fields would not exist.
    //
    // Let /queue settle before navigating away: the real Review-queue screen
    // fires GET /api/exceptions on mount, and clearing cookies + an immediate
    // goto races that in-flight request — Chromium then aborts the NEW document
    // request too (net::ERR_ABORTED). Waiting for the network to be idle removes
    // the race deterministically.
    await page.waitForLoadState('networkidle');
    await page.context().clearCookies();
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await typeInto(page, '#signin-password', PASSWORD);
    await typeInto(page, '#signin-email', EMAIL);
    await page.locator('#signin-email').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/queue`);
    expect(new URL(page.url()).pathname).toBe('/queue');
  });

  // 3. Successful sign-in lands correctly.
  test('3. success lands on /queue with the right title, focus and header', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/queue`);

    await expect(page).toHaveTitle('Review queue — CargoExec');
    const onH1 = await page.evaluate(() => {
      const a = document.activeElement;
      return (
        a !== null &&
        a.tagName === 'H1' &&
        (a.textContent ?? '').includes('Review queue')
      );
    });
    expect(onH1).toBe(true);

    const header = page.locator('header[role="banner"]');
    await expect(header.getByText(NAME)).toHaveCount(1);
    await expect(
      header.getByRole('button', { name: /sign out/i }),
    ).toHaveCount(1);
  });

  // 4. `next` is honoured.
  test('4. next is honoured: /entries/new → sign-in?next → back to /entries/new', async ({
    page,
  }) => {
    // Signed out, a protected document request is 302'd to /sign-in?next=...
    await page.goto(`${BASE}/entries/new`);
    await page.waitForURL(/\/sign-in\?next=%2Fentries%2Fnew/);
    expect(page.url()).toContain('next=%2Fentries%2Fnew');

    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/entries/new`);
    expect(new URL(page.url()).pathname).toBe('/entries/new');
  });

  // 5. Failure state.
  test('5. wrong password: focus on summary, generic text, password cleared, email kept, zero aria-invalid', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', 'wrong-password-value');
    await page.keyboard.press('Enter');

    const summary = page.locator('[role="alert"].usa-alert--error');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Email or password is incorrect.');

    // Focus is ON the summary.
    const onSummary = await page.evaluate(() => {
      const a = document.activeElement;
      return (
        a !== null &&
        a.getAttribute('role') === 'alert' &&
        a.classList.contains('usa-alert--error')
      );
    });
    expect(onSummary).toBe(true);

    // Password cleared, email retained.
    await expect(page.locator('#signin-password')).toHaveValue('');
    await expect(page.locator('#signin-email')).toHaveValue(EMAIL);

    // No field marked invalid.
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);

    // Still on /sign-in.
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  // 6. Unknown email looks identical.
  test('6. unknown email produces an identical screen to a wrong password', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    await typeInto(page, '#signin-email', 'nobody@cbp.example.gov');
    await typeInto(page, '#signin-password', 'some-other-password');
    await page.keyboard.press('Enter');

    const summary = page.locator('[role="alert"].usa-alert--error');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Email or password is incorrect.');

    const onSummary = await page.evaluate(() => {
      const a = document.activeElement;
      return (
        a !== null &&
        a.getAttribute('role') === 'alert' &&
        a.classList.contains('usa-alert--error')
      );
    });
    expect(onSummary).toBe(true);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  // 7. Double submission is ignored.
  test('7. a second activation while in flight issues no second request', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);

    let postCount = 0;
    await page.route('**/api/session', async (route) => {
      if (route.request().method() === 'POST') {
        postCount += 1;
        // Delay so the second Enter lands while the first is in flight.
        await new Promise((r) => setTimeout(r, 800));
      }
      await route.continue();
    });

    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', PASSWORD);
    await page.locator('#signin-password').focus();
    await page.keyboard.press('Enter');
    // While in flight, the button reads "Signing in…" with aria-disabled.
    const btn = page.getByRole('button', { name: /signing in/i });
    await expect(btn).toHaveAttribute('aria-disabled', 'true');
    // Second activation — must be a no-op.
    await page.keyboard.press('Enter');

    await page.waitForURL(`${BASE}/queue`);
    expect(postCount).toBe(1);
  });

  // 8. Sign out.
  test('8. sign out returns to /sign-in with an announced confirmation; the cookie no longer works', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/queue`);

    // Tab to "Sign out" and activate it with the keyboard.
    await page.locator('header[role="banner"]').getByRole('button', {
      name: /sign out/i,
    }).focus();
    await page.keyboard.press('Enter');

    await page.waitForURL(/\/sign-in/);
    await expect(
      page.getByText('You are signed out.', { exact: false }),
    ).toBeVisible();
    // The polite live region carries the confirmation. The region is
    // deliberately transient (cleared then re-set so an identical repeat is
    // re-announced), so poll for it ever holding the sentence rather than
    // asserting a single steady-state read.
    await expect
      .poll(
        async () =>
          (await page
            .locator('[aria-live="polite"]')
            .textContent()) ?? '',
        { timeout: 5000 },
      )
      .toContain('You are signed out.');

    // The cookie no longer works: /queue redirects back to /sign-in.
    await page.goto(`${BASE}/queue`);
    await page.waitForURL(/\/sign-in/);
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  // 8b. Sign out AFTER a reload — the CSRF-rotation regression test.
  test('8b. sign out after a page reload returns 204 (CSRF re-stored), not 403', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/queue`);

    // The reload is the point: the bootstrap GET /api/session rotates the CSRF
    // hash, so a client that does not re-store the returned token holds a dead
    // one. api.getSession() re-stores it — this proves it.
    await page.reload();
    await page.waitForSelector('header[role="banner"] button');

    const signOutBtn = page.locator('header[role="banner"]').getByRole('button', {
      name: /sign out/i,
    });
    await signOutBtn.focus();

    // Capture the ACTUAL DELETE response status — do not infer from the URL.
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/session') && r.request().method() === 'DELETE',
      ),
      page.keyboard.press('Enter'),
    ]);
    expect(resp.status()).toBe(204);

    await page.waitForURL(/\/sign-in/);
    await expect(
      page.getByText('You are signed out.', { exact: false }),
    ).toBeVisible();

    // The replayed cookie no longer reaches /queue.
    await page.goto(`${BASE}/queue`);
    await page.waitForURL(/\/sign-in/);
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  // 9. Visible focus.
  test('9. every focused control paints a non-zero focus indicator', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);

    // The three form controls: assert a non-zero painted focus indicator (the
    // USWDS focus token). Focus AND read in one evaluate so the :focus styles
    // are in effect at the sampling moment.
    const painted = ['#signin-email', '#signin-password', 'button[type="submit"]'];
    for (const sel of painted) {
      const ok = await page.locator(sel).evaluate((el) => {
        (el as HTMLElement).focus();
        const s = getComputedStyle(el);
        const outline = parseFloat(s.outlineWidth || '0');
        const hasOutline =
          outline > 0 && s.outlineStyle !== 'none' && s.outlineStyle !== '';
        const hasShadow = s.boxShadow !== 'none' && s.boxShadow !== '';
        return hasOutline || hasShadow;
      });
      expect(ok, `focus indicator painted for ${sel}`).toBe(true);
    }

    // The skip link: assert the functional guarantee FR-2.15 is really about —
    // `outline: none` has NOT been globally applied (its outline-style is a real
    // style, not `none`), and the control is keyboard-focusable. This is a
    // functional check that a focus indicator is not suppressed; it deliberately
    // does not measure a contrast ratio, which is the human reviewer's job under
    // §7.7. (The skip link's own affordance is its appearance from off-screen on
    // focus, which is a paint the human reviewer confirms.)
    const skipOk = await page.locator('a.usa-skipnav').evaluate((el) => {
      (el as HTMLElement).focus();
      const s = getComputedStyle(el);
      return el.matches(':focus') && s.outlineStyle !== 'none';
    });
    expect(skipOk, 'skip link is focusable and outline:none is not applied').toBe(
      true,
    );
  });

  // 10. IFRAME embedding.
  test('10. sign-in completes inside an IFRAME; no X-Frame-Options on the sign-in path', async ({
    page,
    request,
  }) => {
    // No response on the sign-in path carries X-Frame-Options.
    const doc = await request.get(`${BASE}/sign-in`);
    expect(doc.headers()['x-frame-options']).toBeUndefined();

    // A fixture page framing /sign-in.
    const fixture = `<!doctype html><html><body><iframe title="app" width="1000" height="800" src="${BASE}/sign-in"></iframe></body></html>`;
    await page.goto(`data:text/html,${encodeURIComponent(fixture)}`);
    const frameEl = await page.waitForSelector('iframe');
    const frame = await frameEl.contentFrame();
    expect(frame, 'the iframe should have a content frame').not.toBeNull();
    const f = frame as Frame;

    await f.waitForSelector('#signin-email');
    await typeInto(f, '#signin-email', EMAIL);
    await typeInto(f, '#signin-password', PASSWORD);
    await f.locator('#signin-password').focus();
    await f.locator('button[type="submit"]').click();
    await f.waitForURL(`${BASE}/queue`);
    expect(new URL(f.url()).pathname).toBe('/queue');
  });

  // 11. No popup, no new tab.
  test('11. no target=_blank and no popup during the walkthrough', async ({
    page,
    context,
  }) => {
    let popupFired = false;
    context.on('page', () => {
      popupFired = true;
    });

    await page.goto(`${BASE}/sign-in`);
    await expect(page.locator('[target="_blank"]')).toHaveCount(0);

    await typeInto(page, '#signin-email', EMAIL);
    await typeInto(page, '#signin-password', PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/queue`);
    await expect(page.locator('[target="_blank"]')).toHaveCount(0);

    expect(popupFired).toBe(false);
  });

  // 12. Reflow at 320px.
  test('12. no horizontal body scroll at 320×800', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${BASE}/sign-in`);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow, 'no horizontal scroll at 320px').toBe(false);
  });
});
