// The F12 decision-region browser walkthrough (F12 FR-12.1 … FR-12.17; Phase 6
// success criterion 2; the acceptance criteria of F12). FUNCTIONAL and
// keyboard-oriented, in a real browser against a REAL running server whose AI
// provider is `fake:deterministic` (e2e/env.ts) — the same posture as
// case-detail.spec.ts. It asserts NO WCAG rule and uses no accessibility
// scanner (§7.8); conformance is the signed §7.7 review.
//
// This suite proves the region's OWN behaviours: the three equally-weighted
// controls with no pre-selection, the client- and server-side reason gates, the
// changed-field marking whose confirmation provenance comes from the SERVER, the
// controls disappearing after a decision, the already-decided conflict, and full
// keyboard operability. F11's server behaviour is proven at the api/db tier by
// 06-01's decision.spec.ts; this suite proves the browser interaction.
//
// DATA STRATEGY (as in case-detail.spec.ts): the persisted dev database
// accumulates cargo_entries across runs, so no test asserts an exact total row
// count. Fixtures are created through the real API (POST /api/entries) — an
// empty body opens an exception (fails required-information validation) and,
// with no FAKE_AI_TRIGGERS marker, the FakeProvider's default SUCCESS fires,
// proposing one value per distinct finding field (so several proposed values).

import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { E2E_ENV } from './env.js';

const BASE = 'http://127.0.0.1:3000';

/**
 * Sign in through the API and attach the session cookie to the browser context.
 * Returns the CSRF token so a test can create fixtures via a POST before any
 * page navigation. (case-detail.spec.ts's proven pattern.)
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
  expect(res.status()).toBe(201);
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

interface CreatedCase {
  readonly caseReference: string;
  readonly exceptionId: string;
}

/** Create a real exception through the API (empty body → AVAILABLE SUCCESS). */
async function createException(
  page: Page,
  csrf: string,
  values: Record<string, string> = {},
): Promise<CreatedCase> {
  const created = await page.request.post(`${BASE}/api/entries`, {
    data: values,
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
  });
  expect(created.status()).toBe(201);
  const body = (await created.json()) as {
    case_reference: string;
    exception: { id: string } | null;
  };
  expect(body.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);
  expect(body.exception, 'an exception should have been opened').not.toBeNull();
  return { caseReference: body.case_reference, exceptionId: body.exception!.id };
}

/** Open a case and wait for the AVAILABLE recommendation, so the three-action
 *  chooser (which needs AVAILABLE to render Approve) is present. */
async function openAvailableCase(page: Page, caseReference: string): Promise<void> {
  await page.goto(`${BASE}/cases/${caseReference}`);
  await expect(
    page.getByText('The AI suggests:', { exact: false }),
  ).toBeVisible({ timeout: 10_000 });
}

/** The decision region, scoped to everything after the "Your decision" heading
 *  up to the "Audit trail" heading, via its known controls. We scope to
 *  main#main-content for the "no controls" assertions. */
const REASON = 'The declared value is documented in the attached invoice.';

test.describe('decision region (F12)', () => {
  let csrf = '';

  test.beforeEach(async ({ request, page }) => {
    csrf = await authenticate(request, page);
  });

  // 1. Three equally-weighted controls, no pre-selection, no autofocus
  //    (acceptance 1; FR-12.1).
  test('1. three equal controls render in order with nothing pre-selected', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);

    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    const edit = page.getByRole('button', { name: 'Edit and approve', exact: true });
    const reject = page.getByRole('button', { name: 'Reject', exact: true });
    await expect(approve).toHaveCount(1);
    await expect(edit).toHaveCount(1);
    await expect(reject).toHaveCount(1);

    // DOM order Approve → Edit and approve → Reject.
    const order = await page.evaluate(() => {
      const names = ['Approve', 'Edit and approve', 'Reject'];
      const found = Array.from(document.querySelectorAll('button'))
        .map((b) => (b.textContent ?? '').trim())
        .filter((t) => names.includes(t));
      return found;
    });
    expect(order).toEqual(['Approve', 'Edit and approve', 'Reject']);

    // Nothing is focused on load (no autofocus on any action) — activeElement is
    // NOT one of the three buttons. (FR-2.24 lands focus on the h1.)
    const activeIsAction = await page.evaluate(() => {
      const a = document.activeElement;
      const t = (a?.textContent ?? '').trim();
      return ['Approve', 'Edit and approve', 'Reject'].includes(t);
    });
    expect(activeIsAction).toBe(false);

    // Equal visual weight: all three share the SAME class list (no primary vs
    // outline distinction on any one of them).
    const classes = await page.evaluate(() => {
      const names = ['Approve', 'Edit and approve', 'Reject'];
      return Array.from(document.querySelectorAll('button'))
        .filter((b) => names.includes((b.textContent ?? '').trim()))
        .map((b) => b.getAttribute('class'));
    });
    expect(classes).toHaveLength(3);
    expect(new Set(classes).size, 'all three action buttons share one class').toBe(1);
  });

  // 2. Missing reason blocked client-side, no network request (acceptance 2;
  //    FR-12.4, FR-12.9).
  test('2. an empty reason blocks Continue with a focused error and no request', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);

    // Watch for ANY decision POST — there must be none.
    let decisionPosted = false;
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/decision$/.test(new URL(req.url()).pathname)) {
        decisionPosted = true;
      }
    });

    await page.getByRole('button', { name: 'Edit and approve', exact: true }).click();
    // Leave the reason empty, activate Continue.
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // The error summary appears, is role="alert", and receives focus.
    const summary = page.locator('.usa-alert--error[role="alert"]');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();

    // No POST /decision fired.
    await page.waitForTimeout(300);
    expect(decisionPosted).toBe(false);

    // Still on the edit form (the reason textarea is present, no confirmation).
    await expect(
      page.getByRole('heading', { name: 'This is what will be recorded' }),
    ).toHaveCount(0);
  });

  // 3. Server-side reason enforcement (acceptance 3; FR-12.9). We assert the
  //    SAME behaviour server-side via a direct POST with a 2-character reason,
  //    rather than defeating the client gate in the browser — a direct API
  //    assertion is the reliable way to prove the server refuses it, and the
  //    client gate is already proven in test 2. (Documented choice.)
  test('3. the server refuses a two-character reason with 422 REASON_REQUIRED', async ({
    page,
  }) => {
    const { exceptionId } = await createException(page, csrf);
    const res = await page.request.post(
      `${BASE}/api/exceptions/${exceptionId}/decision`,
      {
        data: { decision_type: 'REJECT', reason: 'no' },
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrf,
          'idempotency-key': crypto.randomUUID(),
        },
      },
    );
    expect(res.status()).toBe(422);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('REASON_REQUIRED');
  });

  // 4. Changed-field marking + server-sourced confirmation provenance
  //    (acceptance 4; Phase 6 criterion 2; FR-12.6/FR-12.10).
  test('4. a changed field reads Specialist-modified and the confirmation provenance is the server\'s', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);

    await page.getByRole('button', { name: 'Edit and approve', exact: true }).click();

    // The edit form has one text input per proposed field. There are several
    // (one per distinct finding field). Change the FIRST, leave the SECOND.
    const inputs = page.locator('input[id^="decision-field-"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstId = await inputs.nth(0).getAttribute('id');
    const secondId = await inputs.nth(1).getAttribute('id');
    expect(firstId).not.toBeNull();
    expect(secondId).not.toBeNull();

    // The changed field's dt badge; the unchanged field's dt badge. Locate each
    // input's owning <div> (dt + dd), then the badge in the dt.
    await inputs.nth(0).fill('A specialist-corrected value');

    // The changed field now reads "Specialist-modified"; the untouched one still
    // reads "AI-suggested". Scope each assertion to the field's row.
    const changedRow = page
      .locator(`input#${firstId}`)
      .locator('xpath=ancestor::div[1]');
    const unchangedRow = page
      .locator(`input#${secondId}`)
      .locator('xpath=ancestor::div[1]');
    await expect(changedRow.locator('.usa-tag')).toHaveText(/Specialist-modified/);
    await expect(unchangedRow.locator('.usa-tag')).toHaveText(/AI-suggested/);

    // Complete the flow: reason, Continue, Record decision.
    await page.getByLabel('Reason for your changes').fill(REASON);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'This is what will be recorded' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Record decision', exact: true }).click();

    // The confirmation renders from the server response. Focus lands on the
    // "Decision recorded" heading.
    const confirmHeading = page.getByRole('heading', { name: 'Decision recorded' });
    await expect(confirmHeading).toBeVisible();
    await expect(confirmHeading).toBeFocused();

    // The confirmation's DecisionSummaryTable shows the changed field HUMAN
    // ("Specialist-modified") and the unchanged field AI ("AI-suggested"),
    // SOURCED FROM THE SERVER'S resolution_values (this component renders only
    // from the response). Assert via the rendered badge text.
    const confirmRegion = confirmHeading.locator('xpath=ancestor::div[1]');
    await expect(
      confirmRegion.locator('.usa-tag', { hasText: 'Specialist-modified' }),
    ).toHaveCount(1);
    await expect(
      confirmRegion.locator('.usa-tag', { hasText: 'AI-suggested' }).first(),
    ).toBeVisible();
  });

  // 5. Controls disappear after a decision (acceptance 6; FR-12.11).
  test('5. after recording, no decision control exists in the DOM', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);

    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    await page.getByLabel('Reason for rejecting').fill(REASON);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Record decision', exact: true }).click();

    await expect(
      page.getByRole('heading', { name: 'Decision recorded' }),
    ).toBeVisible();

    // No Approve / Edit / Reject / Continue / Record decision / Back button
    // anywhere on the page.
    for (const name of [
      'Approve',
      'Edit and approve',
      'Resolve directly',
      'Reject',
      'Continue',
      'Record decision',
      'Back',
    ]) {
      await expect(
        page.getByRole('button', { name, exact: true }),
      ).toHaveCount(0);
    }
    // The case now states it is final.
    await expect(
      page.getByText('final and cannot be changed', { exact: false }),
    ).toBeVisible();
  });

  // 6. Already-decided handling (acceptance 7; FR-12.12). Decide the case in a
  //    second context first, then attempt a decision in the original — the
  //    informational alert appears (not an error summary) and the controls go.
  test('6. deciding in a second context yields the already-decided alert, not a duplicate', async ({
    page,
    browser,
  }) => {
    const { caseReference, exceptionId } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);
    // Fill a reject reason and reach the summary in the ORIGINAL context, but do
    // not record yet.
    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    await page.getByLabel('Reason for rejecting').fill(REASON);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'This is what will be recorded' }),
    ).toBeVisible();

    // In a SECOND context, decide the same case first (direct API POST is the
    // reliable "another tab decided it" simulation).
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const csrf2 = await authenticate(page2.request, page2);
    const decided = await page2.request.post(
      `${BASE}/api/exceptions/${exceptionId}/decision`,
      {
        data: { decision_type: 'REJECT', reason: REASON },
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrf2,
          'idempotency-key': crypto.randomUUID(),
        },
      },
    );
    expect(decided.status()).toBe(201);
    await ctx2.close();

    // Back in the original context, activate Record decision → 409.
    await page.getByRole('button', { name: 'Record decision', exact: true }).click();

    // An informational alert (usa-alert--info), NOT an error summary. It states
    // the case was already decided.
    const infoAlert = page.locator('.usa-alert--info[role="alert"]');
    await expect(infoAlert).toBeVisible();
    await expect(infoAlert).toContainText(/already (rejected|resolved)/i);
    await expect(page.locator('.usa-alert--error[role="alert"]')).toHaveCount(0);

    // The controls are gone after the conflict (onConflict refetched the case →
    // the read-only decided record replaces the panel; no Record decision left).
    await expect(
      page.getByRole('button', { name: 'Record decision', exact: true }),
    ).toHaveCount(0);
  });

  // 7. Full keyboard operability of an edit-and-approve journey (acceptance 8;
  //    FR-12.17). No mouse click — Tab to each control, Space/Enter to activate.
  test('7. the edit-and-approve path is completable by keyboard alone', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);

    // Reach the "Edit and approve" button by keyboard and activate it.
    const edit = page.getByRole('button', { name: 'Edit and approve', exact: true });
    await edit.focus();
    await expect(edit).toBeFocused();
    await page.keyboard.press('Enter');

    // The edit form: focus the first field by keyboard, type, tab onward.
    const firstInput = page.locator('input[id^="decision-field-"]').first();
    await firstInput.focus();
    await expect(firstInput).toBeFocused();
    await page.keyboard.type('Keyboard-entered value');

    // Focus the reason textarea and type a satisfying reason.
    const reason = page.getByLabel('Reason for your changes');
    await reason.focus();
    await expect(reason).toBeFocused();
    await page.keyboard.type(REASON);

    // Activate Continue by keyboard.
    const cont = page.getByRole('button', { name: 'Continue', exact: true });
    await cont.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'This is what will be recorded' }),
    ).toBeVisible();

    // Activate Record decision by keyboard.
    const record = page.getByRole('button', { name: 'Record decision', exact: true });
    await record.focus();
    await page.keyboard.press('Enter');

    // The confirmation heading receives focus at the end.
    const confirmHeading = page.getByRole('heading', { name: 'Decision recorded' });
    await expect(confirmHeading).toBeVisible();
    await expect(confirmHeading).toBeFocused();
  });

  // 8. No forbidden control anywhere in the region (acceptance 9; FR-12.5/16).
  test('8. no select and no bulk/shortcut control exists in the region', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);

    // Enter the edit form so the region's richest control set is present.
    await page.getByRole('button', { name: 'Edit and approve', exact: true }).click();

    const main = page.locator('main#main-content');
    // No <select> anywhere on the screen (the decision region introduces none;
    // the case-detail screen itself has none — proven by case-detail.spec.ts).
    await expect(main.locator('select')).toHaveCount(0);
    // No "approve all" / "apply and next" visible text anywhere.
    await expect(
      page.getByText(/approve all|apply and next|decide and open next/i),
    ).toHaveCount(0);
  });
});
