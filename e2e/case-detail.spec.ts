// The F9/F10 case-detail & recommendation-presentation browser walkthrough
// (F10 FR-10.1 … FR-10.16; F9 the real, wired generation mechanism; Phase 5
// success criteria 1, 2, 3, 4, 5; TechArch §7.8, §8.3).
//
// FUNCTIONAL, keyboard-oriented, in a real browser against a REAL running
// server. It asserts NO WCAG rule and uses NO accessibility scanner (§7.8) — it
// proves, in an actual browser, that:
//   - a real, unmocked exception's AI recommendation appears within the polling
//     budget with NO reload and NO focus movement (FR-10.7),
//   - every FakeProvider failure branch renders a stated "no recommendation
//     available" condition, never an error, never an unbounded spinner (FR-10.8),
//   - provenance is distinguishable by TEXT/SHAPE alone in monochrome (crit 2),
//   - the heading order and the "On this page" in-page nav are real and each nav
//     link genuinely resolves to its target heading (FR-10.10),
//   - uuid canonicalisation, case-not-found, and the inert Phase-6 stubs.
// Conformance is the signed §7.7 review (docs/a11y/case-detail.md).
//
// THE AI PROVIDER IS `fake:deterministic` (e2e/env.ts → the webServer's env):
// createFakeProvider runs the FULL generation pipeline with no network. A
// submitted field carrying a FAKE_AI_TRIGGERS marker forces a chosen FAILURE
// branch; with no marker the default SUCCESS path fires. This is the ONLY place
// F9's real mechanism is proven end to end in a browser.
//
// DATA STRATEGY (as in queue.spec.ts): the persisted dev database accumulates
// cargo_entries across runs, so NO test asserts an exact total row count.
// Fixtures are created through the real API (POST /api/entries), mirroring the
// "/entries/new is not yet built" reality; the authoritative findings for a
// created case are read back via GET /api/exceptions/{id}.

import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { E2E_ENV } from './env.js';
// The exact sentinel strings that force each FakeProvider FAILURE branch. Import
// the real constant so the e2e suite can never drift from the provider's markers
// (server/src/ai/fakeProvider.ts). Type-only import of the reason union is not
// needed; we use the string values directly.
import { FAKE_AI_TRIGGERS } from '../server/src/ai/fakeProvider.js';

const BASE = 'http://127.0.0.1:3000';

/** The five normative <h2> sections and their fragment ids, in order. */
const H2_SECTIONS: ReadonlyArray<{ readonly name: string; readonly id: string }> = [
  { name: 'Why this case is open', id: 'why-open' },
  { name: 'Submitted entry', id: 'submitted-entry' },
  { name: 'AI recommendation', id: 'ai-recommendation' },
  { name: 'Your decision', id: 'your-decision' },
  { name: 'Audit trail', id: 'audit-trail' },
];

/**
 * Sign in through the API and attach the session cookie to the browser context
 * (the queue/shell suites' proven pattern). Returns the CSRF token so a test can
 * create fixtures via a state-changing POST before any page navigation.
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
  expect(
    res.status(),
    'POST /api/session should sign in the bootstrap account',
  ).toBe(201);
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

/** The created case, with everything a test needs about it. */
interface CreatedCase {
  readonly caseReference: string;
  readonly exceptionId: string;
}

/**
 * Create a real exception through the API. `values` seed the entry body — an
 * empty body opens an exception (fails required-information validation) and, if
 * no FAKE_AI_TRIGGERS marker is present, the FakeProvider's default SUCCESS
 * fires; a marker in any field forces that FAILURE branch. Returns the case
 * reference AND the raw exception uuid (from the receipt's exception.id).
 */
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
  return {
    caseReference: body.case_reference,
    exceptionId: body.exception!.id,
  };
}

test.describe('case detail & recommendation', () => {
  let csrf = '';

  test.beforeEach(async ({ request, page }) => {
    csrf = await authenticate(request, page);
  });

  // 1. Real end-to-end AVAILABLE — genuine PENDING→AVAILABLE (or an already-
  //    resolved AVAILABLE), rendered without a reload and WITHOUT stealing focus
  //    (phase criteria 1 & 3; FR-10.7).
  test('1. a real recommendation becomes AVAILABLE in place without moving focus', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await page.goto(`${BASE}/cases/${caseReference}`);

    // The recommendation section exists under the "AI recommendation" h2.
    await expect(
      page.getByRole('heading', { name: 'AI recommendation', level: 2 }),
    ).toHaveCount(1);

    // Let the completed navigation settle: FR-2.24 lands focus on the screen h1.
    // Poll for it so the "before" reading is the settled destination, not a
    // mid-transition sample. This is the baseline FR-10.7 must preserve.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const a = document.activeElement;
          return a?.tagName === 'H1';
        }),
      )
      .toBe(true);
    const activeBefore = await page.evaluate(() => {
      const a = document.activeElement;
      return { tag: a?.tagName ?? '', text: (a?.textContent ?? '').slice(0, 40) };
    });

    // Whichever is observed first — the PENDING spinner or an already-resolved
    // AVAILABLE — is acceptable; we then wait (up to 10s) for AVAILABLE.
    const aiSuggested = page.getByText('The AI suggests:', { exact: false });
    await expect(aiSuggested).toBeVisible({ timeout: 10_000 });

    // AVAILABLE content: the recommended action text, the full rationale under
    // its h3, the "nothing applied" framing, at least one AI-suggested badge,
    // and the model/prompt/generated footnote.
    await expect(
      page.getByRole('heading', { name: 'Why the AI suggests this', level: 3 }),
    ).toHaveCount(1);
    await expect(
      page.getByText('Nothing here has been applied', { exact: false }),
    ).toBeVisible();
    await expect(
      page.locator('.usa-tag', { hasText: 'AI-suggested' }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Model:.*Prompt:.*Generated:/, { exact: false }),
    ).toBeVisible();

    // FR-10.7: the recommendation transition did NOT steal focus — it is still
    // exactly where the completed navigation left it (the h1), and it is NOT on
    // any element belonging to the recommendation content (the "Why the AI
    // suggests this" h3 or any AI-suggested tag). There is no wrapping container
    // for the recommendation, so scope the "inside recommendation" check to its
    // actual rendered elements.
    const activeAfter = await page.evaluate(() => {
      const a = document.activeElement;
      const h3 = Array.from(document.querySelectorAll('h3')).find(
        (h) => (h.textContent ?? '').trim() === 'Why the AI suggests this',
      );
      const tags = Array.from(document.querySelectorAll('.usa-tag'));
      const inRecommendation =
        (h3?.contains(a) ?? false) || tags.some((t) => t.contains(a) || t === a);
      return {
        tag: a?.tagName ?? '',
        text: (a?.textContent ?? '').slice(0, 40),
        inRecommendation,
      };
    });
    expect(activeAfter.inRecommendation).toBe(false);
    expect(activeAfter.tag).toBe(activeBefore.tag);
    expect(activeAfter.text).toBe(activeBefore.text);
  });

  // 2. Real end-to-end UNAVAILABLE — a forced provider-unavailable branch renders
  //    the stated condition with NO Retry, as role="status" not role="alert"
  //    (phase criterion 5; FR-10.8).
  test('2. a forced provider failure renders UNAVAILABLE as a stated condition, no retry, not an alert', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf, {
      goods_description: FAKE_AI_TRIGGERS.PROVIDER_UNAVAILABLE,
    });
    await page.goto(`${BASE}/cases/${caseReference}`);

    // Wait for the UNAVAILABLE presentation: its literal FRD heading. As of
    // Phase 6 the audit trail also carries a "No AI recommendation available"
    // <h3> for a RECOMMENDATION_UNAVAILABLE audit event (F14's normative action
    // label happens to match the F10 section heading), so this assertion targets
    // the FIRST such heading — the F10 recommendation section, which precedes the
    // audit trail in DOM order.
    await expect(
      page
        .getByRole('heading', {
          name: 'No AI recommendation available',
          level: 3,
        })
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    // The exact mapped cause sentence for PROVIDER_UNAVAILABLE, and the
    // "you can still resolve or reject" sentence.
    await expect(
      page.getByText('The AI service could not be reached.', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText('You can still resolve or reject this case.', {
        exact: false,
      }),
    ).toBeVisible();

    // The degraded block is role="status", NEVER role="alert" (FR-10.8: not an
    // error). Scope to the recommendation region.
    const region = page.locator('#ai-recommendation').locator('..');
    await expect(region.locator('[role="status"].usa-alert--warning')).toHaveCount(
      1,
    );
    await expect(region.locator('[role="alert"]')).toHaveCount(0);

    // No Retry / Regenerate control anywhere on the screen.
    await expect(
      page.getByRole('button', { name: /retry|regenerate|try again/i }),
    ).toHaveCount(0);
  });

  // 3. Provenance is textual, not colour-only (phase criterion 2, WCAG 1.4.1):
  //    with all colour neutralised, every badge still READS its meaning.
  test('3. provenance survives a monochrome rendering — the text is enough', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await page.goto(`${BASE}/cases/${caseReference}`);
    await expect(
      page.getByText('The AI suggests:', { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    // Neutralise colour entirely BEFORE re-reading the badges. The screen's CSP
    // is `style-src 'self'` (no inline stylesheets), so page.addStyleTag is
    // refused — instead set the inline style property directly on every element
    // (DOM manipulation, not a stylesheet, so CSP does not apply). This is the
    // faithful monochrome check: after it, colour carries NO information at all.
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('*').forEach((el) => {
        el.style.setProperty('color', 'black', 'important');
        el.style.setProperty('background', 'white', 'important');
        el.style.setProperty('border-color', 'black', 'important');
        el.style.setProperty('filter', 'grayscale(100%)', 'important');
      });
    });

    // Every ProvenanceBadge renders as a usa-tag whose text is exactly one of
    // the two provenance labels. There is at least one AI badge (the AVAILABLE
    // comparison rows always produce one per proposed value).
    const badges = page.locator('.usa-tag');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    let sawAi = false;
    let sawHuman = false;
    for (let i = 0; i < count; i += 1) {
      const text = ((await badges.nth(i).textContent()) ?? '').trim();
      // The whole-recommendation "AI-suggested resolution" tag also matches
      // /AI-suggested/, which is fine: it is textual provenance too.
      if (/AI-suggested/.test(text)) sawAi = true;
      if (/Specialist-entered/.test(text)) sawHuman = true;
    }
    expect(sawAi, 'at least one AI-suggested badge reads as text').toBe(true);
    // A specialist-entered badge appears only when the submitted value was
    // present; the default empty body submits no values, so HUMAN badges may be
    // absent. The AI text is the load-bearing colour-independence proof; assert
    // HUMAN only conditionally (documented).
    void sawHuman;
  });

  // 4. Heading order (FR-10.10, phase criterion 1): exactly one h1 first, then
  //    the five h2s in normative order; any h3s sit strictly inside their owning
  //    h2's span.
  test('4. the heading order is h1 then the five h2s in normative order', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await page.goto(`${BASE}/cases/${caseReference}`);
    await expect(
      page.getByText('The AI suggests:', { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => ({
        level: Number(h.tagName.slice(1)),
        text: (h.textContent ?? '').trim(),
      })),
    );

    // Exactly one h1, and it is first.
    const h1s = headings.filter((h) => h.level === 1);
    expect(h1s).toHaveLength(1);
    expect(headings[0].level).toBe(1);
    expect(headings[0].text).toMatch(new RegExp(`^Case ${caseReference}`));

    // The h2s, in DOM order, are exactly the five normative sections.
    const h2Texts = headings.filter((h) => h.level === 2).map((h) => h.text);
    expect(h2Texts).toEqual(H2_SECTIONS.map((s) => s.name));

    // No heading level is skipped (h2 never jumps to h4, etc.). Walk the list and
    // assert each step down is by at most one level.
    for (let i = 1; i < headings.length; i += 1) {
      const step = headings[i].level - headings[i - 1].level;
      expect(step, `no skipped heading level at index ${i}`).toBeLessThanOrEqual(1);
    }

    // Any h3 ("Why the AI suggests this") sits between the "AI recommendation"
    // h2 and the next h2 ("Your decision").
    const order = headings.map((h) => `${h.level}:${h.text}`);
    const aiIdx = order.indexOf('2:AI recommendation');
    const decisionIdx = order.indexOf('2:Your decision');
    const whyIdx = order.indexOf('3:Why the AI suggests this');
    expect(whyIdx).toBeGreaterThan(aiIdx);
    expect(whyIdx).toBeLessThan(decisionIdx);
  });

  // 5. Findings and entry values render as submitted (FR-10.6, FR-10.16): the
  //    "Why this case is open" list matches the authoritative findings, and a
  //    submitted value renders verbatim as TEXT (no HTML interpretation).
  test('5. findings match the API and a submitted value renders verbatim as text', async ({
    page,
  }) => {
    // A distinctive, HTML-looking value proves no HTML interpretation. Use a
    // field with no format rule that would reject it: goods_description.
    const rawValue = '<b>plain &amp; verbatim</b>';
    const { caseReference, exceptionId } = await createException(page, csrf, {
      goods_description: rawValue,
    });

    // The authoritative findings for this case, straight from the API.
    const apiRes = await page.request.get(
      `${BASE}/api/exceptions/${exceptionId}`,
    );
    expect(apiRes.status()).toBe(200);
    const apiBody = (await apiRes.json()) as {
      validation: { findings: ReadonlyArray<{ message: string }> };
    };
    const apiMessages = apiBody.validation.findings.map((f) => f.message);
    expect(apiMessages.length).toBeGreaterThan(0);

    await page.goto(`${BASE}/cases/${caseReference}`);
    await expect(
      page.getByRole('heading', { name: 'Why this case is open', level: 2 }),
    ).toBeVisible();

    // Each API finding message appears in the "Why this case is open" list.
    const whyList = page.locator('#why-open ~ ol').first();
    for (const message of apiMessages) {
      await expect(whyList.getByText(message, { exact: false })).toHaveCount(1);
    }

    // The goods_description value renders verbatim as TEXT — asserted via
    // textContent, and no interpreted <b> element carrying that text exists.
    const dd = page
      .locator('#submitted-entry ~ dl dt', { hasText: 'Goods description' })
      .locator('xpath=following-sibling::dd[1]');
    await expect(dd).toContainText(rawValue);
    // No injected bold element was created from the value.
    const injectedBold = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('b')).some((b) =>
          (b.textContent ?? '').includes('plain'),
        ),
    );
    expect(injectedBold).toBe(false);
  });

  // 6. uuid canonicalisation (FR-10.13): navigating to /cases/{uuid} rewrites the
  //    address bar to /cases/{caseReference} WITHOUT a full reload.
  test('6. a uuid URL canonicalises to the case reference with no full reload', async ({
    page,
  }) => {
    const { caseReference, exceptionId } = await createException(page, csrf);

    // Count full document loads via an init script installed before navigation.
    await page.addInitScript(() => {
      (window as unknown as { __navCount: number }).__navCount =
        ((window as unknown as { __navCount?: number }).__navCount ?? 0) + 1;
    });

    await page.goto(`${BASE}/cases/${exceptionId}`);
    // The address bar becomes the canonical case reference.
    await page.waitForURL(`${BASE}/cases/${caseReference}`);
    expect(new URL(page.url()).pathname).toBe(`/cases/${caseReference}`);

    // The canonicalisation was a client-side react-router replace, not a reload:
    // the init script ran exactly once (a second full load would run it again).
    const navCount = await page.evaluate(
      () => (window as unknown as { __navCount: number }).__navCount,
    );
    expect(navCount).toBe(1);
  });

  // 7. Decision / audit-trail sections are present and REAL as of Phase 6: the
  //    "Your decision" section is the live F12 DecisionPanel (06-03) and "Audit
  //    trail" is the F14 AuditTrailRegion (06-04). The old Phase-5 stub text is
  //    gone; the decision region's own behaviour is proven by decision.spec.ts
  //    and the audit region's by audit-trail.spec.ts. Here we assert only that
  //    both real sections have replaced the stubs on the loaded case screen.
  test('7. the decision and audit-trail sections are present and real', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await page.goto(`${BASE}/cases/${caseReference}`);
    await expect(
      page.getByText('The AI suggests:', { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole('heading', { name: 'Your decision', level: 2 }),
    ).toHaveCount(1);
    await expect(
      page.getByRole('heading', { name: 'Audit trail', level: 2 }),
    ).toHaveCount(1);

    // The Phase-5 stub messages are GONE — both sections are now real.
    await expect(
      page.getByText('Decision controls are not yet available', {
        exact: false,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText('The audit trail is not yet available', { exact: false }),
    ).toHaveCount(0);

    // The real F12 decision controls are present on an AVAILABLE, undecided
    // case (proof the "Your decision" section is live, not a stub).
    await expect(
      page.getByRole('button', { name: 'Approve', exact: true }),
    ).toHaveCount(1);

    // The real F14 audit region rendered its introductory statement and at
    // least the receipt event (a trail is never empty — FR-14.17).
    await expect(
      page.getByText('This record cannot be edited or deleted', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Cargo entry received', level: 3 }),
    ).toBeVisible();
  });

  // 8. Case-not-found (FR-10.15): a well-formed but unmatched reference renders a
  //    DEDICATED "Case not found", distinct from a generic error (no "Try again").
  test('8. an unmatched reference renders a dedicated Case not found with a way back', async ({
    page,
  }) => {
    await page.goto(`${BASE}/cases/CE-2099-999999`);

    await expect(
      page.getByRole('heading', { name: 'Case not found', level: 1 }),
    ).toBeVisible();
    // A working "Back to review queue" link.
    const back = page.getByRole('link', { name: 'Back to review queue' });
    await expect(back).toHaveAttribute('href', '/queue');
    // NOT a generic error: no "Try again" and no error alert.
    await expect(
      page.getByRole('button', { name: /try again/i }),
    ).toHaveCount(0);
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  });

  // 9. Keyboard traversal: the "Back to review queue" link is reachable and there
  //    is no positive tabindex anywhere (shell.spec.ts's pattern, on this route).
  test('9. keyboard reachability: Back-to-queue is reachable, no tabindex > 0', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await page.goto(`${BASE}/cases/${caseReference}`);
    await expect(
      page.getByText('The AI suggests:', { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    // The two "Back to review queue" links (header + none for a loaded case is
    // one) are real links to /queue, keyboard-focusable.
    const back = page.getByRole('link', { name: 'Back to review queue' }).first();
    await back.focus();
    await expect(back).toBeFocused();

    // No positive tabindex anywhere (reuse shell.spec.ts's assertion).
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

  // 10. "On this page" in-page navigation (FR-10.10): the nav landmark sits after
  //     the header and before "Why this case is open", holds exactly five links
  //     in order, and EACH link genuinely resolves to its target heading.
  test('10. the "On this page" nav resolves each link to its target heading', async ({
    page,
  }) => {
    const { caseReference } = await createException(page, csrf);
    await page.goto(`${BASE}/cases/${caseReference}`);
    await expect(
      page.getByText('The AI suggests:', { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    const nav = page.getByRole('navigation', { name: 'On this page' });
    await expect(nav).toHaveCount(1);

    // DOM position: the nav precedes the "Why this case is open" heading.
    const navBeforeWhy = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="On this page"]');
      const why = document.getElementById('why-open');
      if (nav === null || why === null) return false;
      // compareDocumentPosition: 4 == FOLLOWING (why follows nav).
      return (nav.compareDocumentPosition(why) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    });
    expect(navBeforeWhy).toBe(true);

    // Exactly five links, with the right accessible names in order.
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(5);
    for (let i = 0; i < H2_SECTIONS.length; i += 1) {
      await expect(links.nth(i)).toHaveText(H2_SECTIONS[i].name);
    }

    // Each link, when activated, sets the fragment AND scrolls its target
    // heading into the viewport — proving it genuinely resolves.
    for (const section of H2_SECTIONS) {
      await nav.getByRole('link', { name: section.name }).click();
      await expect.poll(() => page.url()).toContain(`#${section.id}`);
      await expect(page.locator(`#${section.id}`)).toBeInViewport();
    }
  });
});
