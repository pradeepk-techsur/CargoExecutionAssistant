## Story Map Matrix

Each lane below is one step of the governed loop (or one of the cross-cutting foundations).
Every lane table carries the same six columns. **Persona** names the operator first and any
non-user beneficiary or witness second; only PER-01 ever operates a backbone step. **Phase 7
adds one further lane, "Demonstration Enablement" (Epic 15 / F15), placed at the end of the
matrix in 01b** — it is deliberately not interleaved with Steps 1–9 because it is not a step in
the cargo specialist's journey: it has no UI, no specialist-facing surface, and its operator is
not PER-01.

---

### Substrate — The Record the Loop Writes Into

*Cross-cutting. Beneath every backbone step, not after any of them. Epic 0 / F0.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Establish a decision history that cannot be rewritten | PER-01 (operator) · PER-02 (beneficiary, no screen) | Epic 0 (F0) | US-0.1 | JTBD-02.2 → A recorded decision still means what it said when it is questioned a year later; an attempt to revise history is *refused*, not merely discouraged. **(no screen)** | R1 |
| Attribute every stored value to AI or to a human, value by value | PER-01 · PER-02 (beneficiary, no screen) | Epic 0 (F0) | US-0.2 | JTBD-02.3 → A partly-corrected resolution says, field by field, which part was the machine's and which was the specialist's judgement. **(no screen)** | R1 |
| Preserve the submitted entry as the entry of record | PER-01 | Epic 0 (F0) | US-0.3 | JTBD-01.5 → The record shows a genuine before and after, rather than a corrected value with its own history overwritten. | R1 |
| Order events unambiguously and make tampering evident | PER-01 · PER-02 (beneficiary, no screen) | Epic 0 (F0) | US-0.4 | JTBD-02.2 → The chronology of a case is a property of the record rather than an interpretation, and a removed or reordered event is detectable. **(no screen)** | R1 |
| Make a case closing without a human decision structurally impossible | PER-01 · PER-03 (witness, no screen) | Epic 0 (F0) | US-0.5 | JTBD-02.1 → "The AI resolved it" and "nobody knows who decided" are outcomes the system cannot reach, even if the application has a bug. **(no screen)** | R1 |

---

### Step 1 — Sign In: Establish the Identity Decisions Are Attributed To

*Epic 1 / F1. Sign-in exists for a governance reason, not a perimeter reason.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Sign in as a cargo specialist on an accessible USWDS screen | PER-01 | Epic 1 (F1) | US-1.1 | JTBD-02.1 → The specialist starts her session already identified, so every decision she takes afterwards names a real accountable person. | R1 |
| Be kept out of the application until identified | PER-01 | Epic 1 (F1) | US-1.2 | JTBD-02.1 → No case data and no decision surface is reachable by an unidentified user, so no decision can be attributed to nobody. | R1 |
| Have that identity attached to everything she causes | PER-01 · PER-02 (beneficiary, no screen) | Epic 1 (F1) | US-1.3 | JTBD-02.1 → The actor on an audit entry is the signed-in specialist, and cannot be made to name someone else. **(no screen)** | R1 |
| End the session deliberately, or have it end on its own | PER-01 | Epic 1 (F1) | US-1.4 | JTBD-02.1 → An unattended workstation cannot lend the specialist's accountability to whoever sits down next. | R1 |
| Resist repeated guessing at the account | PER-01 | Epic 1 (F1) | US-1.5 | JTBD-02.1 → The identity every decision is attributed to cannot be taken by brute force. | R2 |

---

### Step 2 — Enter a Cargo Entry

*Epics 3 and 6 / F3, F6. Hand-typing is the only way in; there is no seeded dataset, so this step
is the beginning of every demonstration path.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Fill in the entry on a clearly labelled USWDS form | PER-01 | Epic 6 (F6) | US-6.1 | JTBD-01.1 → The shape of a complete entry is legible before submitting it, rather than discovered by failing. | R1 |
| Submit a deliberately incomplete entry without the browser pre-empting the server | PER-01 · PER-03 (witness, no screen) | Epic 6 (F6) | US-6.2 | JTBD-01.1 → An entry can be recorded exactly as it arrived; client-side help assists but never decides the outcome. | R1 |
| Have the entry received and assessed in one indivisible step | PER-01 | Epic 3 (F3) | US-3.1 | JTBD-01.1 → No entry can exist having been received but never assessed. | R1 |
| Record the keystrokes exactly as typed, attributed to the specialist | PER-01 · PER-02 (beneficiary, no screen) | Epic 3 (F3) | US-3.2 | JTBD-02.3 → What the specialist actually typed is the baseline any later AI proposal is compared against. **(no screen)** | R1 |
| Keep manual entry the only way in, with validation unskippable | PER-01 · PER-03 (witness, no screen) | Epic 3 (F3) | US-3.4 | JTBD-02.4 → Every case in the queue has a genuine validation basis behind it; the loop has no back door. **(no screen)** | R1 |
| Create an entry and open the resulting case by keyboard alone | PER-01 | Epic 6 (F6) | US-6.6 | JTBD-01.7 → The receive step completes with no pointer-only stage in it. | R1 |
| Keep the typing when something goes wrong on submission | PER-01 | Epic 6 (F6) | US-6.5 | JTBD-01.1 → A failed submission costs a correction, never the whole entry. | R2 |
| Be told plainly when the entry number already exists | PER-01 | Epic 3 (F3) | US-3.3 | JTBD-01.1 → A shipment already in the system does not quietly acquire a second case. | R2 |

---

### Step 3 — Entry Validated on Receipt

*Epics 4 and 6 / F4, F6. Validation runs inside the receipt transaction; its findings become the
substance of the exception and the text the specialist reads.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Evaluate every applicable rule and report every failure | PER-01 · PER-02 (beneficiary, no screen) | Epic 4 (F4) | US-4.1 | JTBD-01.1 → Everything wrong with the entry is learned in one pass, not one problem at a time. | R1 |
| Name the unsatisfied rule and the field it concerns, in plain language | PER-01 · PER-02 (beneficiary, no screen) | Epic 4 (F4) | US-4.2 | JTBD-02.4 → The basis of an exception is never generic, arbitrary, or self-contradictory for the same field. **(no screen)** | R1 |
| Produce the same findings for the same entry, always | PER-01 · PER-02 (beneficiary, no screen) | Epic 4 (F4) | US-4.3 | JTBD-02.4 → A case's stated basis is reproducible when it is questioned a year later, and never looks like it depended on when it ran. **(no screen)** | R1 |
| Record a clean pass as explicitly clean | PER-01 | Epic 4 (F4) | US-4.4 | JTBD-01.1 → The absence of a case is evidenced positively, rather than inferred from missing data. | R1 |
| State the receipt outcome without interpretation | PER-01 · PER-03 (witness, no screen) | Epic 6 (F6) | US-6.3 | JTBD-01.1 → "Validated clean" or "exception opened, and here is the case" is stated and announced — never left to be read out of an absence of errors. | R1 |
| Show which fields failed which rules, with focus moved to the summary | PER-01 | Epic 6 (F6) | US-6.4 | JTBD-01.7 → A screen-reader user is told both what failed and where to fix it, and can go straight to the field. | R1 |

---

### Step 4 — Exception Raised and Queued

*Epics 5 and 7 / F5, F7. An exception is the failure outcome of validation and nothing else —
derived, never authored.*

| Activity | Persona | Epic | Stories | NaC | Release |
|---|---|---|---|---|---|
| Derive one case from one validation failure, carrying its findings as the stated basis | PER-01 · PER-02 (beneficiary, no screen) | Epic 5 (F5) | US-5.1 | JTBD-02.4 → "Why is this case open" is always answerable from the record and never a matter of inference. **(no screen)** | R1 |
| Stamp an immutable receipt position at creation | PER-01 | Epic 5 (F5) | US-5.2 | JTBD-01.2 → The order of work is settled when a case is created and never rearranges itself under the specialist. | R1 |
| Close every door into a case other than a validation failure | PER-01 · PER-03 (witness, no screen) | Epic 5 (F5) | US-5.3 | JTBD-02.4 → Exceptions cannot be authored, parked, or reopened outside the loop. **(no screen)** | R1 |
| Give the case one human-readable reference used everywhere | PER-01 · PER-02 (beneficiary, no screen) | Epic 5 (F5) | US-5.4 | JTBD-01.5 → A question about a case can always be brought with the one identifier that resolves it. | R1 |
| Return open exceptions in strict receipt order | PER-01 | Epic 7 (F7) | US-7.1 | JTBD-01.2 → One list in one settled order, identical across repeated requests, with nothing to choose. | R1 |
| Drop decided cases from the list while keeping them reachable by reference | PER-01 | Epic 7 (F7) | US-7.2 | JTBD-01.2 → What is shown is exactly what still needs a decision, and nothing decided is lost. | R1 |
| Carry no management dimension in the projection at all | PER-01 · PER-03 (witness, no screen) | Epic 7 (F7) | US-7.3 | JTBD-03.4 → The absence of filter, sort, assignment and priority is structural in the data model and API, not a UI omission. **(no screen)** | R3 |

---
