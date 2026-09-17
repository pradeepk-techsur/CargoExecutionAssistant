// The F14 per-case audit-trail browser walkthrough (F14 FR-14.1 … FR-14.19;
// Phase 6 success criterion 3 — "who decided this, what did the AI say, what did
// the human change" answered IN PLACE). FUNCTIONAL and keyboard-oriented, in a
// real browser against a REAL running server whose AI provider is
// `fake:deterministic` (e2e/env.ts) — the same posture as case-detail.spec.ts
// and decision.spec.ts. It asserts NO WCAG rule and installs no accessibility
// scanner (§7.8); conformance is the signed §7.7 review.
//
// This suite proves the region's OWN behaviours: the full chronological event
// list in server order, the decision event's verbatim detail with per-value
// provenance, the AI event never rendered as a person, colour-independent
// provenance, the read-only-by-construction absence of any mutation/export
// control, the three oversight questions answerable in place, the tampered-chain
// integrity-failure rendering (via a direct database tamper), the post-decision
// live refresh with no reload, real <ol>/<li>/<h3> list semantics, and the
// deep-link focus. F13's read endpoint is proven at the api/db tier by 06-02's
// audit.spec.ts; this suite proves the browser rendering.
//
// DATA STRATEGY (as in decision.spec.ts): the persisted dev database accumulates
// cargo_entries across runs, so no test asserts an exact total row count.
// Fixtures are created through the real API (POST /api/entries) — an empty body
// opens an exception and, with no FAKE_AI_TRIGGERS marker, the FakeProvider's
// default SUCCESS fires, proposing one value per distinct finding field.

import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
// pg is CommonJS: under native ESM a named value import fails at runtime
// ("does not provide an export named 'Client'"). Use the interop-default form,
// the same pattern the server's pool modules use.
import pg from 'pg';
import { E2E_ENV } from './env.js';

const { Client } = pg;

const BASE = 'http://127.0.0.1:3000';

/** A satisfying (≥10-char) reason for edit/reject decisions. */
const REASON =
  'The declared value is documented in the attached commercial invoice.';

/**
 * Sign in through the API and attach the session cookie to the browser context.
 * Returns the CSRF token (case-detail.spec.ts's proven pattern).
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
 *  chooser is present and the AI recommendation event is in the trail. */
async function openAvailableCase(
  page: Page,
  caseReference: string,
): Promise<void> {
  await page.goto(`${BASE}/cases/${caseReference}`);
  await expect(
    page.getByText('The AI suggests:', { exact: false }),
  ).toBeVisible({ timeout: 10_000 });
}

/** Drive the UI's edit-and-approve flow to completion (changing the first
 *  proposed field), so the case closes with a RECOMMENDATION_EDITED_AND_APPROVED
 *  decision that has HUMAN-origin value rows. Returns the value typed into the
 *  first field so a test can assert it appears verbatim in the trail. */
async function editApproveViaUi(page: Page): Promise<string> {
  await page
    .getByRole('button', { name: 'Edit and approve', exact: true })
    .click();
  const inputs = page.locator('input[id^="decision-field-"]');
  await expect(inputs.first()).toBeVisible();
  const changed = 'A specialist-corrected description';
  await inputs.nth(0).fill(changed);
  await page.getByLabel('Reason for your changes').fill(REASON);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'This is what will be recorded' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Record decision', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Decision recorded' }),
  ).toBeVisible();
  return changed;
}

/** The audit region locator: the <ol> that follows the "Audit trail" heading. */
function trailList(page: Page) {
  return page.locator('#audit-trail ~ ol').first();
}

test.describe('audit trail region (F14)', () => {
  let csrf = '';

  test.beforeEach(async ({ request, page }) => {
    csrf = await authenticate(request, page);
  });

  // 1. Full chronological order (acceptance 1): a case decided by
  //    edit-and-approve renders every event in server order, oldest first.
  test('1. events render in full chronological order for an edit-and-approved case', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);
    await editApproveViaUi(page);

    // After the decision, the trail refreshed in place. Read every event
    // heading (<h3> inside the <ol>), in DOM order.
    const headings = await trailList(page)
      .locator('li h3')
      .allTextContents();
    const trimmed = headings.map((h) => h.trim());

    // The five expected events, in order. (Other events cannot appear for this
    // path; assert the exact ordered sequence.)
    expect(trimmed).toEqual([
      'Cargo entry received',
      'Validated against required-information rules',
      'Exception opened',
      'AI recommendation generated',
      'Recommendation edited and approved by specialist',
    ]);
  });

  // 2. Decision event detail (acceptance 2): the last event shows the deciding
  //    specialist, an absolute timestamp, the reason verbatim, and per-value
  //    before/after with the correct AI/HUMAN origin on each side.
  test('2. the decision event shows the specialist, timestamp, verbatim reason, and per-value origins', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);
    const changed = await editApproveViaUi(page);

    // The last <li> in the trail is the decision event.
    const decisionEvent = trailList(page).locator('li').last();
    await expect(
      decisionEvent.getByRole('heading', {
        name: 'Recommendation edited and approved by specialist',
        level: 3,
      }),
    ).toHaveCount(1);

    // Who: the deciding specialist's display name, marked "(specialist)".
    const who = await decisionEvent.textContent();
    expect(who).toContain(E2E_ENV.BOOTSTRAP_SPECIALIST_NAME);
    expect(who).toContain('(specialist)');

    // When: an absolute <time datetime> (never relative phrasing).
    const time = decisionEvent.locator('time[datetime]');
    await expect(time).toHaveCount(1);
    const timeText = ((await time.textContent()) ?? '').trim();
    expect(timeText).not.toMatch(/ago|yesterday|just now/i);
    // The formatted shape "DD Mon YYYY, HH:MM".
    expect(timeText).toMatch(/\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/);

    // Reason: rendered verbatim under "Reason given" (assert via textContent,
    // never innerHTML).
    expect(who).toContain('Reason given');
    expect(who).toContain(REASON);

    // Per-value before/after with origins. The value table shows the changed
    // field HUMAN ("Specialist-entered" / "Specialist-modified") and at least
    // one AI-origin cell; the changed value renders verbatim.
    const table = decisionEvent.locator('table');
    await expect(table).toHaveCount(1);
    const tableText = ((await table.textContent()) ?? '').trim();
    expect(tableText).toContain(changed); // the human-entered value, verbatim
    // Both provenance vocabularies appear across the value rows.
    expect(tableText).toMatch(/Specialist-entered|Specialist-modified/);
    expect(tableText).toMatch(/AI-suggested/);
  });

  // 3. AI never a person (acceptance 3): the "AI recommendation generated"
  //    event's Who line reads AI (model_id) and contains no specialist name.
  test('3. the AI event is attributed to AI (model_id), never to a person', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);

    const aiEvent = trailList(page)
      .locator('li')
      .filter({ has: page.getByRole('heading', { name: 'AI recommendation generated' }) });
    await expect(aiEvent).toHaveCount(1);

    const text = ((await aiEvent.textContent()) ?? '').trim();
    // "AI ({model_id})" — the e2e fake model id.
    expect(text).toContain(`AI (${E2E_ENV.AI_MODEL_ID})`);
    // The specialist's name is NOT in the AI event's Who rendering.
    expect(text).not.toContain(E2E_ENV.BOOTSTRAP_SPECIALIST_NAME);
    // No avatar/person image inside the AI event.
    await expect(aiEvent.locator('img')).toHaveCount(0);
  });

  // 4. Colour-independent provenance (acceptance 4, phase criterion 3): with all
  //    colour neutralised, every provenance badge still READS its meaning.
  test('4. provenance survives a monochrome rendering — the text is enough', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);
    await editApproveViaUi(page);

    // Neutralise colour entirely via inline styles (the CSP forbids inline
    // stylesheets, so set the style property directly — case-detail.spec.ts's
    // proven monochrome technique).
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('*').forEach((el) => {
        el.style.setProperty('color', 'black', 'important');
        el.style.setProperty('background', 'white', 'important');
        el.style.setProperty('border-color', 'black', 'important');
        el.style.setProperty('filter', 'grayscale(100%)', 'important');
      });
    });

    // Every ProvenanceBadge in the trail reads as one of the provenance labels
    // by text alone. There is at least one AI and one Specialist badge on the
    // decision event's value table. As of the Carbon rebuild (07-10) the badge
    // is a Carbon `Tag` (`.cds--tag`).
    const badges = trailList(page).locator('.cds--tag');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
    let sawAi = false;
    let sawHuman = false;
    for (let i = 0; i < count; i += 1) {
      const t = ((await badges.nth(i).textContent()) ?? '').trim();
      if (/AI-suggested/.test(t)) sawAi = true;
      if (/Specialist-(entered|modified)/.test(t)) sawHuman = true;
    }
    expect(sawAi, 'an AI badge reads as text in monochrome').toBe(true);
    expect(sawHuman, 'a Specialist badge reads as text in monochrome').toBe(true);
  });

  // 5. No mutation/export control (acceptance 5): the region holds zero buttons,
  //    zero download attributes, and no print/export/download/copy affordance.
  test('5. the region contains no edit, delete, print, download, or export control', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);
    await editApproveViaUi(page);

    // Scope to the audit region: the "Audit trail" heading and everything after
    // it (it is the last section on the screen). Assert against the <ol> and the
    // heading/intro/integrity nodes that precede it, i.e. the whole region.
    // Simplest faithful scope: the trail <ol> plus the integrity statement.
    const region = page.locator('#audit-trail ~ *');

    // No button anywhere in the region.
    await expect(region.locator('button')).toHaveCount(0);
    // No anchor with a download attribute.
    await expect(region.locator('a[download]')).toHaveCount(0);
    // No visible print/export/download/copy affordance text.
    await expect(
      region.getByText(/print|export|download|copy/i),
    ).toHaveCount(0);
    // No form control of any kind.
    await expect(region.locator('select')).toHaveCount(0);
    await expect(region.locator('textarea')).toHaveCount(0);
    await expect(region.locator('input')).toHaveCount(0);
  });

  // 6. Answerable in place (acceptance 6): from the SAME page, the three
  //    oversight questions are each answerable without navigating away.
  test('6. who-decided / what-the-AI-said / what-the-human-changed are answerable in place', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);
    const changed = await editApproveViaUi(page);

    // No navigation away: the URL is still the case detail.
    expect(new URL(page.url()).pathname).toBe(`/cases/${caseReference}`);

    const list = trailList(page);

    // (a) WHO decided this: the decision event names the specialist.
    const decisionEvent = list.locator('li').last();
    expect((await decisionEvent.textContent()) ?? '').toContain(
      E2E_ENV.BOOTSTRAP_SPECIALIST_NAME,
    );

    // (b) WHAT the AI said: the AI recommendation event is present with its
    //     AI-origin value rows (cross-referenced with case-detail.spec.ts's
    //     recommendation-section proof; here we assert the audit event exists).
    await expect(
      list.getByRole('heading', {
        name: 'AI recommendation generated',
        level: 3,
      }),
    ).toHaveCount(1);

    // (c) WHAT the human changed: the decision event's value table carries the
    //     human-entered value with a Specialist origin.
    const tableText = ((await decisionEvent.locator('table').textContent()) ?? '').trim();
    expect(tableText).toContain(changed);
    expect(tableText).toMatch(/Specialist-(entered|modified)/);
  });

  // 7. Integrity failure rendering (acceptance 7): tamper one case's entry_hash
  //    via a direct database connection and assert the failure alert renders
  //    naming the correct sequence, role="alert", with the events still shown.
  test('7. a tampered hash chain renders the integrity-failure alert at the right sequence', async ({
    page,
  }) => {
    const { caseReference, exceptionId } = await createException(page, csrf);
    // Let the recommendation resolve so the case has ≥4 events before tampering.
    await openAvailableCase(page, caseReference);

    // Tamper the audit chain via a direct owner connection. The immutability
    // triggers refuse a raw UPDATE, so — mirroring chain.spec.ts's technique —
    // drop the two audit_entries immutability triggers, alter one stored
    // entry_hash, then RE-CREATE the triggers in a finally. This is the ONLY
    // tamper in the e2e tier and it restores the guards immediately; the
    // audit_reject_mutation() function itself is never dropped.
    const client = new Client({ connectionString: E2E_ENV.DATABASE_URL_OWNER });
    await client.connect();
    let tamperedSequence = 0;
    try {
      // The case anchor (audit_entries.case_id references cargo_entries.id, and
      // exceptions.entry_id is that same cargo_entries.id) + the stored entry at
      // case_sequence = 2 (VALIDATION_COMPLETED for this path). Altering its
      // entry_hash breaks the link the NEXT entry carries, so the verifier first
      // diverges at sequence 3.
      const caseRow = await client.query<{ entry_id: string }>(
        'SELECT entry_id FROM exceptions WHERE id = $1',
        [exceptionId],
      );
      expect(caseRow.rows.length).toBe(1);
      const caseId = caseRow.rows[0].entry_id;
      tamperedSequence = 3;

      await client.query(
        'DROP TRIGGER trg_audit_entries_immutable ON audit_entries',
      );
      await client.query(
        'DROP TRIGGER trg_audit_entries_immutable_row ON audit_entries',
      );
      try {
        // Overwrite the stored entry_hash at sequence 2 with a fresh RANDOM
        // 32-byte value. It must differ from the original (breaking the chain)
        // AND be globally unique (audit_entries has a UNIQUE constraint on
        // entry_hash, and the dev DB persists across runs — a fixed value would
        // collide on the second run). gen_random_bytes(32) satisfies both.
        await client.query(
          `UPDATE audit_entries
             SET entry_hash = gen_random_bytes(32)
           WHERE case_id = $1 AND case_sequence = 2`,
          [caseId],
        );
      } finally {
        // Restore the guards immediately — the store is append-only for everyone
        // else again the moment this test's tamper is done.
        await client.query(
          `CREATE TRIGGER trg_audit_entries_immutable
             BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_entries
             FOR EACH STATEMENT EXECUTE FUNCTION audit_reject_mutation()`,
        );
        await client.query(
          `CREATE TRIGGER trg_audit_entries_immutable_row
             BEFORE UPDATE OR DELETE ON audit_entries
             FOR EACH ROW EXECUTE FUNCTION audit_reject_mutation()`,
        );
      }
    } finally {
      await client.end();
    }

    // Reload the case: the audit read now reports chain_verified:false with the
    // events still rendered. As of the Carbon rebuild (07-10) the integrity-
    // failure alert is a Carbon `InlineNotification kind="error"` kept
    // `role="alert"` (the class carrier moved from `usa-alert--error` to
    // `cds--inline-notification--error`; the assertive role is unchanged).
    await page.goto(`${BASE}/cases/${caseReference}`);
    const alert = page.locator(
      '#audit-trail ~ .cds--inline-notification--error[role="alert"]',
    );
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(
      `Record integrity check failed at event ${tamperedSequence}`,
    );
    await expect(alert).toContainText('Report this immediately');

    // The events themselves STILL render (the failure is reported, not fatal).
    await expect(
      trailList(page).getByRole('heading', {
        name: 'Cargo entry received',
        level: 3,
      }),
    ).toBeVisible();
  });

  // 8. Live refresh after a decision (acceptance 8): recording a decision
  //    updates the trail in place, WITHOUT a full page reload.
  test('8. recording a decision refreshes the trail in place without a reload', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);

    // Count full document loads via an init script installed before navigation.
    await page.addInitScript(() => {
      (window as unknown as { __navCount: number }).__navCount =
        ((window as unknown as { __navCount?: number }).__navCount ?? 0) + 1;
    });

    await openAvailableCase(page, caseReference);

    // Before deciding: the trail has the pre-decision events; the decision event
    // is absent.
    await expect(
      trailList(page).getByRole('heading', {
        name: 'Recommendation edited and approved by specialist',
      }),
    ).toHaveCount(0);
    const before = await trailList(page).locator('li').count();

    await editApproveViaUi(page);

    // After deciding: the new decision event appears in the trail…
    await expect(
      trailList(page).getByRole('heading', {
        name: 'Recommendation edited and approved by specialist',
      }),
    ).toHaveCount(1);
    const after = await trailList(page).locator('li').count();
    expect(after).toBe(before + 1);

    // …and it was an in-place refresh, NOT a full reload: the init script ran
    // exactly once (a second full load would run it again).
    const navCount = await page.evaluate(
      () => (window as unknown as { __navCount: number }).__navCount,
    );
    expect(navCount).toBe(1);
  });

  // 9. List semantics (acceptance 9): the trail is a real <ol> of <li> events,
  //    each with exactly one <h3>, and any value table has a <caption> and
  //    scope="col" headers.
  test('9. the trail is an ordered list of events with real table semantics', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await openAvailableCase(page, caseReference);
    await editApproveViaUi(page);

    const list = trailList(page);
    // It is an <ol>.
    expect(await list.evaluate((el) => el.tagName)).toBe('OL');

    // Every direct child is an <li>, each with exactly one <h3>.
    const items = list.locator('> li');
    const n = await items.count();
    expect(n).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < n; i += 1) {
      await expect(items.nth(i).locator('h3')).toHaveCount(1);
    }

    // The decision event's value table has a <caption> and scope="col" headers.
    const table = list.locator('table').last();
    await expect(table.locator('caption')).toHaveCount(1);
    await expect(table.locator('caption')).toContainText('Values recorded —');
    await expect(table.locator('thead th[scope="col"]')).toHaveCount(4);
    // No ARIA grid roles (a real table, not a grid).
    await expect(table.locator('[role="grid"]')).toHaveCount(0);
  });

  // 10. Deep-link focus (FR-14.11): navigating directly to
  //     /cases/{caseReference}/audit focuses the "Audit trail" heading.
  test('10. the /audit deep link scrolls to and focuses the Audit trail heading', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await page.goto(`${BASE}/cases/${caseReference}/audit`);

    // The trail must have loaded (the region focuses only on a successful load).
    await expect(
      page.getByRole('heading', { name: 'Audit trail', level: 2 }),
    ).toBeVisible();

    // Focus lands on the <h2 id="audit-trail"> without any manual scroll.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const a = document.activeElement;
          return a?.id === 'audit-trail';
        }),
      )
      .toBe(true);
  });
});
