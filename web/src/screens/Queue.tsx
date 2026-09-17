// The F8 review-queue screen (UX Screen; F8 FR-8.1 … FR-8.14; Phase 4 goal),
// rebuilt on the **Carbon Design System** (`@carbon/react`) in place of USWDS
// (Phase 7, plan 07-08). Every behavioural detail is UNCHANGED — only the
// rendered DOM moved from `usa-*` markup to Carbon components.
//
// This is the phase's user-facing deliverable: "she spends her attention
// deciding cases rather than deciding which case to decide." Every open
// exception is one accessible table in RECEIPT ORDER — the exact order the API
// returns, never re-sorted, re-grouped or re-ordered on the client (FR-8.1).
//
// DELIBERATELY ABSENT (FR-8.3, phase criterion 4, PRD §10): there is NO filter,
// NO sortable column, NO assignment, NO ageing/priority control, NO search box
// anywhere in the rendered DOM. The only interactive elements are the per-row
// case links, the Refresh button, and the "New cargo entry" link.
//
// THE CARBON-TABLE RISK (T-07-22): Carbon's table family defaults toward a
// SORTABLE affordance when driven through `DataTable`. This screen therefore
// composes Carbon's PLAIN table primitives BY HAND — `Table`, `TableHead`,
// `TableRow`, `TableHeader`, `TableBody`, `TableCell` — and NEVER `DataTable`.
// Crucially, `TableHeader` is rendered with NO `isSortable`/`onClick` prop: in
// that configuration (verified against @carbon/react's TableHeader source, which
// early-returns a bare `<th scope>` when `isSortable` is false) it emits a plain
// `<th scope="col">` with NO button, NO `aria-sort`, and NO sort icon — exactly
// the non-sortable column FR-8.3 requires. Passing `isSortable` here would inject
// a sort button and would be a defect. See docs/carbon-conformance-register.md.
//
// Focus is moved by useScreenFocus on mount only (moment 1 of the four). React
// Router unmounts/remounts this component on every navigation to /queue —
// including a browser-back from /cases/:ref — so "returning to the queue
// re-fetches and refocuses the h1" (success criterion 2) falls out of the
// mount-time fetch below plus useScreenFocus's mount-time h1 focus, with no
// special "return" handling.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import type { QueueResponse } from '@cargoexec/contract';
import { useScreenFocus } from '../shell/useScreenFocus.js';
import { useAnnounce } from '../shell/LiveRegions.js';
import { api } from '../api/client.js';
import { formatDateTime } from '../lib/formatDateTime.js';
import { Empty, ErrorState, Loading } from '../components/states.js';

type QueueState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'loaded'; readonly data: QueueResponse };

/** The FR-8.9 announcement for a loaded/refreshed queue (restates "Review queue"
 *  alongside the count — a deliberate FR-8.9 exception to the no-duplicate rule). */
function loadedAnnouncement(n: number): string {
  return `Review queue. ${n} open exception${n === 1 ? '' : 's'}.`;
}

export function Queue(): JSX.Element {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useScreenFocus({ title: 'Review queue', h1Ref });
  const { announceStatus, announceError } = useAnnounce();

  const [state, setState] = useState<QueueState>({ status: 'loading' });

  // The one fetch function, used by the mount effect AND the Refresh button, so
  // the two paths cannot diverge. On success announce the FR-8.9 count sentence;
  // on failure announce assertively (FR-8.9 "load failure ⇒ assertive").
  const load = useCallback(async (): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const data = await api.getQueue();
      setState({ status: 'loaded', data });
      announceStatus(loadedAnnouncement(data.returned_count));
    } catch {
      setState({ status: 'error' });
      announceError('We could not load the review queue.');
    }
  }, [announceStatus, announceError]);

  // Fetch once on mount. A remount (every navigation to /queue, including
  // browser-back) re-runs this — that IS the "return re-fetches" behaviour.
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="cds--content-prose">
      <h1 tabIndex={-1} ref={h1Ref}>
        Review queue
      </h1>
      <p>
        Open exceptions, oldest first by receipt. Open a case to review its AI
        recommendation and record your decision.
      </p>

      {state.status === 'loading' && (
        <div aria-busy="true">
          <Loading region="Review queue" />
        </div>
      )}

      {state.status === 'error' && (
        <ErrorState
          cause="We could not load the review queue."
          onRetry={() => {
            void load();
          }}
        />
      )}

      {state.status === 'loaded' && (
        <QueueLoaded
          data={state.data}
          onRefresh={() => {
            void load();
          }}
        />
      )}

      {/* Layout item 4 — the secondary action, present regardless of state,
          EXCEPT the empty branch which already renders its own "New cargo entry"
          action via <Empty>. Rendered as a Carbon Button in the outline-
          equivalent tertiary weight, polymorphic-as a react-router Link so
          navigation stays client-side. */}
      {!(
        state.status === 'loaded' && state.data.exceptions.length === 0
      ) && (
        <p>
          <Button as={Link} to="/entries/new" kind="tertiary">
            New cargo entry
          </Button>
        </p>
      )}
    </div>
  );
}

/** The loaded branch: truncation notice, empty state, or the real table. */
function QueueLoaded(props: {
  readonly data: QueueResponse;
  readonly onRefresh: () => void;
}): JSX.Element {
  const { data, onRefresh } = props;
  const n = data.exceptions.length;

  if (n === 0) {
    return (
      <>
        <h2>No open exceptions</h2>
        <Empty
          message="Every exception has been decided. Create a cargo entry to start a new case."
          action={{ to: '/entries/new', label: 'New cargo entry' }}
        />
      </>
    );
  }

  return (
    <>
      {data.truncated && (
        <InlineNotification
          kind="info"
          role="status"
          lowContrast
          hideCloseButton
          title="Showing the first 500 open exceptions in receipt order."
        />
      )}

      <h2>Open exceptions</h2>
      <Button kind="tertiary" onClick={onRefresh}>
        Refresh
      </Button>
      <p>
        {n} open exception{n === 1 ? '' : 's'}
      </p>

      {/* Scrollable, keyboard-focusable region so a narrow viewport scrolls the
          TABLE within this container (never the document body) at 320px (reflow /
          FR-2 §14). Carbon's `Table` provides no such scroll region of its own,
          so this project-owned wrapper is retained around it. The Carbon
          `cds--data-table_inner-container` class supplies the scroll treatment. */}
      <div
        className="cds--data-table_inner-container"
        style={{ overflowX: 'auto' }}
        tabIndex={0}
        role="region"
        aria-label="Open exceptions table"
      >
        {/* PLAIN Carbon table primitives — NOT DataTable, NO isSortable. Each
            TableHeader with no isSortable/onClick renders a bare `<th scope>`
            with no sort button, no aria-sort, no sort icon (FR-8.3). */}
        <Table useZebraStyles={false}>
          <caption>
            Open exceptions in receipt order — {n} case{n === 1 ? '' : 's'}
          </caption>
          <TableHead>
            <TableRow>
              <TableHeader scope="col">Case</TableHeader>
              <TableHeader scope="col">Received</TableHeader>
              <TableHeader scope="col">Entry number</TableHeader>
              <TableHeader scope="col">Why it is open</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.exceptions.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {row.case_reference ? (
                    <Link
                      to={`/cases/${row.case_reference}`}
                      aria-label={`Open case ${row.case_reference}`}
                    >
                      {row.case_reference}
                    </Link>
                  ) : (
                    <MissingReference id={row.id} />
                  )}
                </TableCell>
                <TableCell>
                  <time dateTime={row.received_at}>
                    {formatDateTime(row.received_at)}
                  </time>
                </TableCell>
                <TableCell>{row.entry_number ?? 'Not provided'}</TableCell>
                <TableCell>{row.failure_summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

/** Defensive: the contract guarantees a case reference, but per the
 *  presentation-validation rule we render plain text and warn rather than build
 *  a broken route — never crash. */
function MissingReference(props: { readonly id: string }): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.warn(
      `Queue row ${props.id} has no case_reference; rendering plain text.`,
    );
  }, [props.id]);
  return <span>Reference unavailable</span>;
}
