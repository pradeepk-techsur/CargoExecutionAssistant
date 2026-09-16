// The whole-loop, keyboard-only browser walkthrough — the phase's own closing
// statement and roadmap success criterion 5, proven twice in one unbroken
// browser session per pass (healthy, then AI-stopped). F11 + F12 + F14 together;
// TechArch §7.8, §8.3; the roadmap's "the governed loop first closes end to end
// in Phase 6" decision.
//
// FUNCTIONAL and KEYBOARD-ONLY, in a real browser against a REAL running server
// whose AI provider is `fake:deterministic` (e2e/env.ts). It asserts NO WCAG
// rule and installs no accessibility scanner (§7.8) — conformance is the signed
// §7.7 review (docs/a11y/case-detail.md). What THIS file uniquely proves is that
// a specialist, in ONE continuous keyboard-only session, walks the complete
// governed loop: sign in → an entry fails validation → find the case in the
// queue → read the recommendation → decide with a reason → read the audit trail
// — each PROGRESSION action (button activation, link follow, form submit) driven
// by the keyboard, never a load-bearing `.click()`.
//
// KEYBOARD-ONLY DISCIPLINE (this file specifically): every progression action is
// a `keyboard.press('Enter')`/`press('Tab')` on a focused control, or a form
// submit via Enter — never `locator.click()`. `locator.fill(...)` is used only
// to TYPE into an already-focused field (filling is not clicking); the
// keyboard-completeness the file tests is about ACTIVATIONS, and each activation
// here is a real key press on a control we assert is focused first.
//
// THE AI PROVIDER IS `fake:deterministic`. That IS "the AI provider stopped" in
// this codebase's own terms: `AI_PROVIDER_URL=fake:deterministic` is what runs
// in every automated suite and the e2e demo (T-05-16 accepts it as the project's
// own non-production/demonstration posture); there is no separate real provider
// to literally halt. Scenario 2 forces the recommendation to resolve UNAVAILABLE
// by placing a FAKE_AI_TRIGGERS marker in the created entry — the observable
// equivalent of "the AI is unavailable, and the case is STILL fully decidable".
//
// DATA STRATEGY (as in every other e2e suite): the persisted dev database
// accumulates cargo_entries across runs, so no test asserts an exact total row
// count. The "hand-created" entry is created through the real API
// (POST /api/entries) — still "hand-created data" in the FRD's sense, since this
// product ships NO seed/fixture loader and the /entries/new form is still the
// NotBuiltYet placeholder (see .planning/.../deferred-items.md: Phase 3's
// 03-09/03-10 form was never authored). A code comment at the creation site
// makes swapping in the real form a trivial change once it exists.

import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { E2E_ENV } from './env.js';
// The exact sentinel that forces the FakeProvider's PROVIDER_UNAVAILABLE branch.
// Importing the real constant means this suite can never drift from the
// provider's markers (server/src/ai/fakeProvider.ts).
import { FAKE_AI_TRIGGERS } from '../server/src/ai/fakeProvider.js';

const BASE = 'http://127.0.0.1:3000';
const EMAIL = E2E_ENV.BOOTSTRAP_SPECIALIST_EMAIL;
const PASSWORD = E2E_ENV.BOOTSTRAP_SPECIALIST_PASSWORD;
const NAME = E2E_ENV.BOOTSTRAP_SPECIALIST_NAME;

/** A satisfying (≥10-char) decision reason. */
const REASON =
  'The declared value is documented in the attached commercial invoice.';

/** The accessible name of the currently focused element (sign-in.spec's helper). */
async function activeName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el === null) return '';
    const aria = el.getAttribute('aria-label');
    if (aria !== null && aria !== '') return aria;
    return (el.textContent ?? '').trim() || (el.getAttribute('value') ?? '');
  });
}

interface CreatedCase {
  readonly caseReference: string;
  readonly exceptionId: string;
}

/**
 * Sign in through the API purely to obtain a CSRF token + session cookie, so the
 * "hand-created" entry can be POSTed BEFORE the browser journey begins. This is
 * account/fixture bootstrap ONLY — the journey itself signs in through the real
 * FORM, keyboard-only (that is the point of this file). Mirrors
 * case-detail.spec.ts's proven pattern.
 *
 * NOTE (deferred item, Phase 3 03-09/03-10): were the /entries/new screen built,
 * scenario steps 1–3 could create the entry by TYPING into that real form and
 * submitting it with Enter. It is still the NotBuiltYet placeholder, so we create
 * the entry via a real API call here — a real, human-shaped request carrying a
 * body that fails required-information validation, not a database fixture. Swap
 * the POST below for a form walkthrough once the form exists.
 */
async function bootstrapAndCreateEntry(
  request: APIRequestContext,
  page: Page,
  values: Record<string, string>,
): Promise<CreatedCase> {
  const res = await request.post(`${BASE}/api/session`, {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'content-type': 'application/json' },
  });
  expect(res.status(), 'bootstrap sign-in for fixture creation').toBe(201);
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
  const csrf = body.csrf_token;

  const created = await page.request.post(`${BASE}/api/entries`, {
    data: values,
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
  });
  expect(
    created.status(),
    'an entry with an incomplete required-information set opens an exception',
  ).toBe(201);
  const createdBody = (await created.json()) as {
    case_reference: string;
    exception: { id: string } | null;
  };
  expect(createdBody.case_reference).toMatch(/^CE-\d{4}-\d{6}$/);
  expect(
    createdBody.exception,
    'an exception should have been opened (validation failed)',
  ).not.toBeNull();
  return {
    caseReference: createdBody.case_reference,
    exceptionId: createdBody.exception!.id,
  };
}

/**
 * The keyboard-only sign-in through the real FORM (never a request.post shortcut
 * for the journey itself). Clears any bootstrap cookie first so /sign-in shows
 * the form rather than bouncing an already-authenticated caller to /queue.
 * Lands on /queue.
 */
async function signInThroughFormKeyboardOnly(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });

  // Tab from the top of the document to the email field, asserting we land on it
  // (autocomplete="username") before typing — the keyboard genuinely REACHES the
  // field, not a click-to-focus. Then Tab to password. Enter submits.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelector<HTMLElement>('a.usa-skipnav')?.focus();
  });
  // Tab forward from the top of the document until focus lands on the email
  // field (autocomplete="username"). Asserting the keyboard REACHES the field by
  // Tab — not a click-to-focus — without hardcoding the reduced shell's exact
  // focusable count (skip link → banner disclosure → product-name link → email).
  let reachedEmail = false;
  for (let i = 0; i < 8; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await page.keyboard.press('Tab');
    // eslint-disable-next-line no-await-in-loop
    const autocomplete = await page.evaluate(
      () => document.activeElement?.getAttribute('autocomplete') ?? '',
    );
    if (autocomplete === 'username') {
      reachedEmail = true;
      break;
    }
  }
  expect(reachedEmail, 'Tab order reaches the email field').toBe(true);
  await page.locator('#signin-email').fill(EMAIL); // type into the focused field

  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(
      () => document.activeElement?.getAttribute('autocomplete') ?? '',
    ),
    'Tab reaches the password field',
  ).toBe('current-password');
  await page.locator('#signin-password').fill(PASSWORD);

  await page.keyboard.press('Enter'); // submit from the password field
  await page.waitForURL(`${BASE}/queue`);
  expect(new URL(page.url()).pathname).toBe('/queue');
}

/**
 * From /queue, reach the given case's row link by keyboard and open it with
 * Enter. The queue accumulates rows across runs, so target the specific row by
 * its accessible name ("Open case {ref}"), focus it, assert it is focused
 * (keyboard reachability), then press Enter — a real keyboard activation.
 */
async function openCaseFromQueueKeyboardOnly(
  page: Page,
  caseReference: string,
): Promise<void> {
  const rowLink = page.getByRole('link', {
    name: `Open case ${caseReference}`,
  });
  await expect(rowLink).toHaveCount(1);
  await rowLink.focus();
  await expect(rowLink).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(`${BASE}/cases/${caseReference}`);
  expect(new URL(page.url()).pathname).toBe(`/cases/${caseReference}`);
}

test.describe('whole loop (keyboard-only, twice)', () => {
  // ── Scenario 1: the HEALTHY walkthrough (criterion 5, first half) ───────────
  test('1. healthy: sign in → failed entry → queue → recommendation → edit-and-approve → audit trail, keyboard-only, no reload in place', async ({
    request,
    page,
  }) => {
    // Count full document loads: an addInitScript counter (case-detail.spec's
    // pattern). It increments on every REAL navigation (sign-in → queue → case)
    // and must NOT increment during the in-place decision/audit steps.
    await page.addInitScript(() => {
      (window as unknown as { __navCount: number }).__navCount =
        ((window as unknown as { __navCount?: number }).__navCount ?? 0) + 1;
    });

    // Hand-create the entry (real API POST; empty body → required-information
    // failure → exception; NO FAKE_AI_TRIGGERS marker → the recommendation
    // resolves AVAILABLE for this healthy pass).
    const { caseReference } = await bootstrapAndCreateEntry(request, page, {});

    // 1–2. Sign in through the real form, keyboard-only; land on /queue.
    await signInThroughFormKeyboardOnly(page);
    await expect(
      page.getByRole('heading', { name: 'Review queue', level: 1 }),
    ).toBeVisible();

    // 3–4. Open the case from the queue by keyboard (Enter on the focused row
    //      link). NOTE: /entries/new is still NotBuiltYet, so the entry was
    //      hand-created above via the API; the JOURNEY from here is the real
    //      keyboard-driven product.
    await openCaseFromQueueKeyboardOnly(page, caseReference);

    // 5. "Why this case is open" findings render, and the recommendation
    //    resolves to AVAILABLE (poll, reusing case-detail.spec's wait pattern).
    await expect(
      page.getByRole('heading', { name: 'Why this case is open', level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByText('The AI suggests:', { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    // Record the nav count after the three real navigations settle. Sign-in and
    // the queue→case Enter are full document loads; the uuid path is not taken
    // here (we navigated straight to the case reference).
    const navAfterArrival = await page.evaluate(
      () => (window as unknown as { __navCount: number }).__navCount,
    );

    // 6. Edit-and-approve, keyboard-only: focus the button, Enter; type into the
    //    first field (change at least one value); type the reason; Enter on
    //    Continue; Enter on Record decision.
    const editBtn = page.getByRole('button', {
      name: 'Edit and approve',
      exact: true,
    });
    await editBtn.focus();
    await expect(editBtn).toBeFocused();
    await page.keyboard.press('Enter');

    const firstField = page.locator('input[id^="decision-field-"]').first();
    await firstField.focus();
    await expect(firstField).toBeFocused();
    await page.keyboard.type('A specialist-corrected value');

    const reasonField = page.getByLabel('Reason for your changes');
    await reasonField.focus();
    await expect(reasonField).toBeFocused();
    await page.keyboard.type(REASON);

    const continueBtn = page.getByRole('button', {
      name: 'Continue',
      exact: true,
    });
    await continueBtn.focus();
    await expect(continueBtn).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', { name: 'This is what will be recorded' }),
    ).toBeVisible();

    const recordBtn = page.getByRole('button', {
      name: 'Record decision',
      exact: true,
    });
    await recordBtn.focus();
    await expect(recordBtn).toBeFocused();
    await page.keyboard.press('Enter');

    // 7. The confirmation renders and focus lands on its heading (FR-12.10).
    const confirmHeading = page.getByRole('heading', {
      name: 'Decision recorded',
    });
    await expect(confirmHeading).toBeVisible();
    await expect(confirmHeading).toBeFocused();

    // 8. Activate the confirmation's "View the audit trail for this case" link by
    //    keyboard (Enter on the focused link). Assert the audit trail is reached
    //    and shows the full 5-event history including the just-recorded decision,
    //    with the reason verbatim.
    const auditLink = page.getByRole('link', {
      name: 'View the audit trail for this case',
    });
    await auditLink.focus();
    await expect(auditLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.url()).toContain('#audit-trail');

    const trail = page.locator('#audit-trail ~ ol').first();
    const headings = (await trail.locator('li h3').allTextContents()).map((h) =>
      h.trim(),
    );
    expect(headings).toEqual([
      'Cargo entry received',
      'Validated against required-information rules',
      'Exception opened',
      'AI recommendation generated',
      'Recommendation edited and approved by specialist',
    ]);
    // The reason is rendered verbatim in the decision event.
    const decisionEvent = trail.locator('li').last();
    expect((await decisionEvent.textContent()) ?? '').toContain(REASON);
    // The decision is attributed to the signed-in specialist (a human, named).
    expect((await decisionEvent.textContent()) ?? '').toContain(NAME);

    // 9. No full page reload occurred during the in-place decision/audit steps:
    //    the nav counter did not change from its value right after arrival on the
    //    case screen (the decision refetch and audit refresh are in place, and
    //    the #audit-trail fragment is a same-document scroll, not a load).
    const navAfterLoop = await page.evaluate(
      () => (window as unknown as { __navCount: number }).__navCount,
    );
    expect(navAfterLoop).toBe(navAfterArrival);
  });

  // ── Scenario 2: the AI-STOPPED walkthrough (criterion 5, second half) ───────
  test('2. AI stopped: the same loop with the recommendation forced UNAVAILABLE still produces a full, decidable, auditable record', async ({
    request,
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __navCount: number }).__navCount =
        ((window as unknown as { __navCount?: number }).__navCount ?? 0) + 1;
    });

    // Hand-create the entry with a FAKE_AI_TRIGGERS marker in goods_description,
    // forcing the recommendation to resolve UNAVAILABLE — this codebase's own
    // "the AI provider stopped" (see the file header: fake:deterministic is the
    // posture every suite and the demo run under, per T-05-16; there is no
    // separate real provider to halt). goods_description has no format rule that
    // would reject the sentinel, so the entry still opens an exception on the
    // required-information failure.
    const { caseReference } = await bootstrapAndCreateEntry(request, page, {
      goods_description: FAKE_AI_TRIGGERS.PROVIDER_UNAVAILABLE,
    });

    // Sign in through the real form, keyboard-only.
    await signInThroughFormKeyboardOnly(page);
    await openCaseFromQueueKeyboardOnly(page, caseReference);

    // The findings render, and the recommendation resolves to the stated
    // UNAVAILABLE condition (NFR-9: the case is decidable in every recommendation
    // state). The F10 section's literal heading; scope to the first such heading
    // (the audit trail also carries this action label — DOM order puts the
    // recommendation section first).
    await expect(
      page.getByRole('heading', { name: 'Why this case is open', level: 2 }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('heading', {
          name: 'No AI recommendation available',
          level: 3,
        })
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    const navAfterArrival = await page.evaluate(
      () => (window as unknown as { __navCount: number }).__navCount,
    );

    // With no recommendation available, the middle action is "Resolve directly"
    // (DecisionPanel's presentation-states label). Decide via a direct
    // resolution, keyboard-only: fill every entry-field-named-by-a-finding with a
    // substantive value, give a substantive reason.
    const resolveBtn = page.getByRole('button', {
      name: 'Resolve directly',
      exact: true,
    });
    await resolveBtn.focus();
    await expect(resolveBtn).toBeFocused();
    await page.keyboard.press('Enter');

    // Fill EVERY field the direct-resolution form renders (one per finding).
    const fields = page.locator('input[id^="decision-field-"]');
    const fieldCount = await fields.count();
    expect(fieldCount).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < fieldCount; i += 1) {
      const field = fields.nth(i);
      // eslint-disable-next-line no-await-in-loop
      await field.focus();
      // eslint-disable-next-line no-await-in-loop
      await expect(field).toBeFocused();
      // eslint-disable-next-line no-await-in-loop
      await page.keyboard.type(`Resolved value ${i + 1}`);
    }

    const reasonField = page.getByLabel('Reason for your changes');
    await reasonField.focus();
    await expect(reasonField).toBeFocused();
    await page.keyboard.type(
      'Resolved directly from source documentation; the AI recommendation was unavailable.',
    );

    const continueBtn = page.getByRole('button', {
      name: 'Continue',
      exact: true,
    });
    await continueBtn.focus();
    await expect(continueBtn).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', { name: 'This is what will be recorded' }),
    ).toBeVisible();

    const recordBtn = page.getByRole('button', {
      name: 'Record decision',
      exact: true,
    });
    await recordBtn.focus();
    await expect(recordBtn).toBeFocused();
    await page.keyboard.press('Enter');

    const confirmHeading = page.getByRole('heading', {
      name: 'Decision recorded',
    });
    await expect(confirmHeading).toBeVisible();
    await expect(confirmHeading).toBeFocused();

    // Reach the audit trail by keyboard.
    const auditLink = page.getByRole('link', {
      name: 'View the audit trail for this case',
    });
    await auditLink.focus();
    await expect(auditLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.url()).toContain('#audit-trail');

    // The trail shows RECOMMENDATION_UNAVAILABLE followed by the direct
    // resolution — a complete record proving NFR-9's "the case remains fully
    // decidable in every [recommendation] state". A direct resolution against an
    // unavailable recommendation is a RECOMMENDATION_EDITED_AND_APPROVED action
    // (06-01: EDIT_APPROVE with no available recommendation is the direct-
    // resolution path, all values HUMAN-origin).
    const trail = page.locator('#audit-trail ~ ol').first();
    const headings = (await trail.locator('li h3').allTextContents()).map((h) =>
      h.trim(),
    );
    expect(headings).toEqual([
      'Cargo entry received',
      'Validated against required-information rules',
      'Exception opened',
      'No AI recommendation available',
      'Recommendation edited and approved by specialist',
    ]);

    // The case is fully resolved with a complete record: the decision event names
    // the specialist and carries the verbatim reason, and its value table records
    // the human-entered resolution values (all Specialist-origin for a direct
    // resolution).
    const decisionEvent = trail.locator('li').last();
    const decisionText = (await decisionEvent.textContent()) ?? '';
    expect(decisionText).toContain(NAME);
    expect(decisionText).toContain(
      'Resolved directly from source documentation',
    );
    const tableText =
      (await decisionEvent.locator('table').textContent()) ?? '';
    expect(tableText).toContain('Resolved value 1');
    expect(tableText).toMatch(/Specialist-(entered|modified)/);

    // No full reload during the in-place decision/audit steps.
    const navAfterLoop = await page.evaluate(
      () => (window as unknown as { __navCount: number }).__navCount,
    );
    expect(navAfterLoop).toBe(navAfterArrival);
  });
});
