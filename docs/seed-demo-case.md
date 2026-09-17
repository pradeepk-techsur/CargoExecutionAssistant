# Seeded demonstration case (F15) — operator runbook

This document is the FR-15.9 **fixture label**. Read the "This is fixture data,
not production history" section below before you rely on anything the seeded
case shows.

## What it is

`seed-demo-case` pre-loads **exactly one** demonstration cargo case that has
already been carried through the entire governed loop:

- a demonstration specialist account (so you can sign in),
- one cargo entry (`DEMO-0000001`) that is deliberately incomplete and therefore
  **fails validation**,
- the exception that failure opens,
- an AI **recommendation** for how to resolve it,
- a human **decision** (`EDIT_APPROVE`) that adopts the recommendation with one
  specialist edit — so the case carries **mixed AI and HUMAN provenance**, and
- the complete **audit trail** for all of the above.

It exists so that every later-loop scenario (reviewing a recommendation, making
a decision, reading an audit trail) is demonstrable **on demand**, without a
specialist first having to hand-type an incomplete entry and watch validation
fail live. This is Phase 7's deliberate, reviewed reversal of the original v1
decision to ship no seed data (PRD §10 #7, superseded by F15).

## How it produces the case — not a shortcut

The script does **not** `INSERT` demonstration rows directly, and it is **not** a
migration. It calls the **same service functions the running application calls
for a live request**:

- `receiveEntry` — the atomic F3/F4/F5 receipt transaction,
- `runGenerationJob` — the F9 per-exception AI recommendation job,
- `recordDecision` — the F11 governed decision transaction,
- `createSpecialist` — the F1 FR-1.13 account-provisioning path.

Because of that, the seeded case is **structurally indistinguishable** from an
organically produced one: its rows are the same shape, and its audit chain
passes the same integrity verification (`chain_verified: true`) as any other
case's. That is the whole point — and it is exactly why the labelling in this
document matters.

## This is fixture data, not production history (FR-15.9)

**The seeded case is demonstration fixture data, not organic production
history.** No `is_seed` column exists anywhere in the schema to carry that label
at the data level (adding one would weaken the guarantee that a seeded case is
indistinguishable from a real one), so **this document is the label**. When you
show the seeded case to anyone, state that it is a demonstration fixture: no real
cargo was received, no real specialist made that decision, and the timestamps are
whenever the seed ran, not when any real event occurred.

The reserved demonstration specialist you will see on the sign-in screen and as
the decision-maker in the audit trail is:

- **email:** `demo.specialist@cbp.example.gov`
- **display name:** `Demo Specialist (Seeded)`

Recognise that account as the fixture account.

## Running it

The seed runs **after** the database has been migrated. It is operator-invoked
tooling only: no HTTP route, UI control, or scheduled job ever invokes it, and it
takes no arguments (it cannot be turned into a general fixture factory — FR-15.11).

Against a locally-run build (after `npm run migrate`):

```bash
npm run seed:demo-case
```

Against a running `docker compose` stack:

```bash
docker compose exec web node server/dist/cli/seed-demo-case.js
```

It is **idempotent** and safe to re-run: a second run creates nothing, logs that
each stage is already present, and exits `0`. It is also **stage-resumable** — if
a previous run stopped partway (for example, the AI provider was unreachable when
it reached the recommendation stage), a later run resumes from the first
unfinished stage.

## Cost note (real provider)

If your deployment is configured to talk to a **real hosted LLM** (rather than
the deterministic `fake:deterministic` provider), the recommendation stage makes
**one real generation call** to that provider. This is expected, operator-
triggered, and out of the automated test path. For local demonstrations, run with
`AI_PROVIDER_URL=fake:deterministic` to avoid any external call.

## After a data reset

Resetting the database means destroying and recreating the volume
(`docker compose down -v`) — the audit tables cannot be truncated (README §9,
TechArch §8.8). To get the demonstration case back after a reset, migrate and then
re-run `npm run seed:demo-case`.
