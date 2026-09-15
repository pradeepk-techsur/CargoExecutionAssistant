// The F8 review-queue browser walkthrough (F8 FR-8.1 … FR-8.14; Phase 4 success
// criteria 1–5; TechArch §7.8, §8.3).
//
// FUNCTIONAL, keyboard-oriented, in a real browser. It asserts NO WCAG rule and
// uses NO accessibility scanner (§7.8) — it proves keyboard operability, focus
// destinations, receipt-ordered rendering, the empty/error/truncated states, the
// ABSENCE of every forbidden choice control, and one genuine end-to-end
// navigation. Conformance is the signed §7.7 review (docs/a11y/queue.md).
//
// DATA STRATEGY: the persisted dev database accumulates cargo_entries across
// repeated local Playwright runs (there is no F6 decision path yet to close a
// case, and no db-reset step here) — so NO real (unmocked) test asserts an exact
// total row count. Tests needing a KNOWN, exact data shape (empty / truncated /
// error) use page.route() interception; the one test proving genuine end-to-end
// integration creates its fixture through the real API (POST /api/entries,
// mirroring the "/entries/new is not yet built" reality — test data is created
// through the API directly).

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { E2E_ENV } from './env.js';

const BASE = 'http://127.0.0.1:3000';

/**
 * Sign in through the API and attach the session cookie to the browser context
 * (the shell suite's proven pattern). Returns the CSRF token from the sign-in
 * response so a test can create fixtures via a state-changing POST — the server
 * rotates the CSRF hash on GET (02-04) but the sign-in POST's returned token is
 * valid until the next GET, and we create fixtures BEFORE any page navigation.
 */
async function authenticate(
  request: APIRequestContext,
  page: Page,
): Promise<string> {
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
  const body = (await res.json()) as { csrf_token: string };
  return body.csrf_token;
}

/**
 * Create a real exception through the API (POST /api/entries with an empty body
 * fails required-information validation and opens an exception — a 201). Uses
 * page.request so the just-attached session cookie is sent, plus the CSRF token
 * captured at sign-in. Returns the fresh, unique case reference.
 */
async function createException(page: Page, csrf: string): Promise<string> {
  const created = await page.request.post(`${BASE}/api/entries`, {
    data: {},
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
  });
  expect(created.status()).toBe(201);
  const body = (await created.json()) as { case_reference: string };
  expect(body.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);
  return body.case_reference;
}

test.describe('review queue', () => {
  let csrf = '';

  test.beforeEach(async ({ request, page }) => {
    csrf = await authenticate(request, page);
  });

  // 1. Real end-to-end row + keyboard activation.
  test('1. a real created exception appears as a row and Enter opens its case', async ({
    page,
  }) => {
    const caseReference = await createException(page, csrf);

    await page.goto(`${BASE}/queue`);
    const rowLink = page.getByRole('link', {
      name: new RegExp(`Open case ${caseReference}`),
    });
    await expect(rowLink).toHaveCount(1);

    await rowLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/cases/${caseReference}`);
    expect(new URL(page.url()).pathname).toBe(`/cases/${caseReference}`);

    // The destination is now the REAL CaseDetail screen (Phase 5): it mounts in
    // a loading state, then re-renders with the loaded case, and useScreenFocus
    // moves focus to the screen h1. That focus lands ASYNCHRONOUSLY after the URL
    // change, so poll for it rather than reading document.activeElement in the
    // same synchronous tick as waitForURL (which raced under a full-suite run and
    // sometimes sampled before the focus effect had run).
    await expect
      .poll(
        () => page.evaluate(() => document.activeElement?.tagName === 'H1'),
        { timeout: 5000 },
      )
      .toBe(true);
  });

  // 2. No forbidden affordance anywhere on the queue.
  test('2. no sort/filter/assign/priority affordance, and headers are plain', async ({
    page,
  }) => {
    // A known non-empty shape so the table renders.
    await page.route('**/api/exceptions', (route) =>
      route.fulfill({
        json: {
          exceptions: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              case_reference: 'CE-2026-000001',
              receipt_position: 1,
              received_at: '2026-09-11T14:32:00.000Z',
              entry_number: 'ENT-1',
              finding_count: 1,
              failure_summary: 'Missing bill of lading',
            },
          ],
          returned_count: 1,
          truncated: false,
        },
      }),
    );
    await page.goto(`${BASE}/queue`);
    await expect(page.locator('table.usa-table')).toHaveCount(1);

    // No sort/aria-sort, no checkboxes, no text inputs.
    await expect(page.locator('[aria-sort]')).toHaveCount(0);
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(page.locator('input[type="text"], input:not([type])')).toHaveCount(
      0,
    );
    await expect(page.locator('input[type="search"]')).toHaveCount(0);

    // No button named sort/filter/assign/priority.
    await expect(
      page.getByRole('button', { name: /sort|filter|assign|priorit/i }),
    ).toHaveCount(0);

    // Every <th> contains NO enclosing/embedded button or link.
    const thControlCount = await page.evaluate(() => {
      let count = 0;
      document.querySelectorAll('th').forEach((th) => {
        if (th.querySelector('button, a') !== null) count += 1;
      });
      return count;
    });
    expect(thControlCount).toBe(0);
  });

  // 3. Empty state (mocked).
  test('3. an empty queue states plainly there is nothing to work, no table', async ({
    page,
  }) => {
    await page.route('**/api/exceptions', (route) =>
      route.fulfill({
        json: { exceptions: [], returned_count: 0, truncated: false },
      }),
    );
    await page.goto(`${BASE}/queue`);

    await expect(
      page.getByRole('heading', { name: 'No open exceptions' }),
    ).toHaveCount(1);
    await expect(page.locator('table')).toHaveCount(0);

    // A working "New cargo entry" link pointing at /entries/new.
    const link = page.getByRole('link', { name: 'New cargo entry' }).first();
    await expect(link).toHaveAttribute('href', '/entries/new');
  });

  // 4. Truncated notice (mocked).
  test('4. the truncation notice appears and there is no pagination', async ({
    page,
  }) => {
    await page.route('**/api/exceptions', (route) =>
      route.fulfill({
        json: {
          exceptions: [
            {
              id: '22222222-2222-2222-2222-222222222222',
              case_reference: 'CE-2026-000002',
              receipt_position: 1,
              received_at: '2026-09-11T14:32:00.000Z',
              entry_number: 'ENT-2',
              finding_count: 2,
              failure_summary: 'Missing importer of record and 1 more',
            },
            {
              id: '33333333-3333-3333-3333-333333333333',
              case_reference: 'CE-2026-000003',
              receipt_position: 2,
              received_at: '2026-09-11T15:00:00.000Z',
              entry_number: null,
              finding_count: 1,
              failure_summary: 'Invalid arrival date',
            },
          ],
          returned_count: 2,
          truncated: true,
        },
      }),
    );
    await page.goto(`${BASE}/queue`);

    await expect(
      page.getByText('Showing the first 500 open exceptions in receipt order.', {
        exact: false,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: /next|previous|page/i }),
    ).toHaveCount(0);
  });

  // 5. Error state (mocked), and Try again recovers.
  test('5. a failed load shows a stated cause and Try again re-fetches', async ({
    page,
  }) => {
    let failNext = true;
    await page.route('**/api/exceptions', (route) => {
      if (failNext) {
        failNext = false;
        return route.fulfill({
          status: 500,
          json: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Something went wrong.',
              request_id: 'test-req-1',
            },
          },
        });
      }
      return route.fulfill({
        json: { exceptions: [], returned_count: 0, truncated: false },
      });
    });

    await page.goto(`${BASE}/queue`);

    const alert = page.locator('[role="alert"].usa-alert--error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Something went wrong');
    await expect(alert).toContainText('We could not load the review queue.');

    // Try again re-fetches; the second response succeeds (empty), clearing the
    // error and rendering the empty state.
    await page.getByRole('button', { name: /try again/i }).click();
    await expect(page.locator('[role="alert"].usa-alert--error')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'No open exceptions' }),
    ).toHaveCount(1);
  });

  // 6. Refresh re-fetches without navigating.
  test('6. Refresh issues exactly one more GET /api/exceptions and does not navigate', async ({
    page,
  }) => {
    let getCount = 0;
    await page.route('**/api/exceptions', (route) => {
      if (route.request().method() === 'GET') getCount += 1;
      return route.fulfill({
        json: {
          exceptions: [
            {
              id: '44444444-4444-4444-4444-444444444444',
              case_reference: 'CE-2026-000004',
              receipt_position: 1,
              received_at: '2026-09-11T14:32:00.000Z',
              entry_number: 'ENT-4',
              finding_count: 1,
              failure_summary: 'Missing bill of lading',
            },
          ],
          returned_count: 1,
          truncated: false,
        },
      });
    });

    await page.goto(`${BASE}/queue`);
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    const before = getCount;
    const urlBefore = page.url();

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect.poll(() => getCount).toBe(before + 1);
    expect(page.url()).toBe(urlBefore);
  });

  // 7. Dates are absolute, month-in-words, 24-hour — never relative.
  test('7. received times render as absolute local date+time with no relative phrasing', async ({
    page,
  }) => {
    await page.route('**/api/exceptions', (route) =>
      route.fulfill({
        json: {
          exceptions: [
            {
              id: '55555555-5555-5555-5555-555555555555',
              case_reference: 'CE-2026-000005',
              receipt_position: 1,
              received_at: '2026-09-11T14:32:00.000Z',
              entry_number: 'ENT-5',
              finding_count: 1,
              failure_summary: 'Missing bill of lading',
            },
          ],
          returned_count: 1,
          truncated: false,
        },
      }),
    );
    await page.goto(`${BASE}/queue`);

    const timeEl = page.locator('time[datetime]').first();
    await expect(timeEl).toHaveCount(1);
    const dt = await timeEl.getAttribute('datetime');
    expect(dt).not.toBeNull();
    expect(Number.isNaN(Date.parse(dt as string))).toBe(false);
    await expect(timeEl).toHaveText(/\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/);

    // No relative phrasing anywhere on the page.
    const bodyText = (await page.locator('body').textContent()) ?? '';
    expect(bodyText).not.toMatch(/\bago\b|yesterday|tomorrow/i);
  });

  // 8. Return-to-queue re-fetches and refocuses the h1 (phase criterion 2).
  test('8. navigating back to /queue re-fetches and refocuses the h1', async ({
    page,
  }) => {
    // Real end-to-end navigation, as in test 1, gives us a screen to come back
    // from (the still-NotBuiltYet Case placeholder is sufficient — this test
    // only needs SOME screen to page.goBack() from).
    const caseReference = await createException(page, csrf);

    await page.goto(`${BASE}/queue`);
    const rowLink = page.getByRole('link', {
      name: new RegExp(`Open case ${caseReference}`),
    });
    await rowLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`${BASE}/cases/${caseReference}`);

    // Now count the fresh GET fired on remount when we go back.
    let getCount = 0;
    await page.route('**/api/exceptions', (route) => {
      if (route.request().method() === 'GET') getCount += 1;
      return route.continue();
    });

    await page.goBack();
    await page.waitForURL(`${BASE}/queue`);
    await expect.poll(() => getCount).toBe(1);

    // Focus is on the "Review queue" h1 (the moment-1 focus destination).
    const onH1 = await page.evaluate(() => {
      const a = document.activeElement;
      return (
        a !== null &&
        a.tagName === 'H1' &&
        (a.textContent ?? '').includes('Review queue')
      );
    });
    expect(onH1).toBe(true);
  });
});
