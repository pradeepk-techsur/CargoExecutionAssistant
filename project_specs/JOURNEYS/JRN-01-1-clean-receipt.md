
## PER-01: Dana Reyes

**Access: authenticated cargo specialist — the only role in CargoExec v1.** Every journey in this section is an interactive journey across the six screens named in the Scope Boundary above. Where a stage names a system behaviour, it is the behaviour of the feature listed in the touchpoint column.

---

### JRN-01.1: Sign In and File a Clean Entry

**Persona:** PER-01 (Dana Reyes)
**Scenario:** It is the start of Dana's shift. She has a paper cargo entry in front of her that she believes is complete, and she wants it into the system before she starts working the queue. She signs in, types the entry into the cargo entry form, and submits it. Validation runs on receipt and every required-information rule is satisfied, so no exception is opened. What Dana needs from this journey is not speed — it is to be told, without interpretation, that the entry passed, so she does not spend the next hour wondering whether something is quietly sitting unassessed. This is the branch of the loop where *receive → validate* completes and stops.

**Related Jobs:** JTBD-01.1, JTBD-01.7

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|-------|--------|------------|----------|---------|------------|-------------|
| Arrive | Opens the browser to the application root; the server finds no session and redirects her to sign-in rather than showing her anything behind it | Sign-in (F1 on F2) | "Nothing should be visible before I say who I am." | Neutral, settled | She is one redirect away from work she has not started yet; a slow sign-in is felt as the whole product being slow | Land her on sign-in with focus already in the first field and the official-site banner already rendered, so the shell does not reflow under her |
| Authenticate | Types her credentials and submits; the system establishes a server-side session and binds her identity as the actor the audit writer will consume | Sign-in (F1 on F2) | "This is the name that ends up next to every decision I make today." | Slightly formal, accountable | Authentication here looks like a security gate but is actually an accountability gate; nothing on screen says so, so the stakes are invisible | State on the signed-in shell whose session is active, so the identity that will be attributed is visible the whole time rather than assumed |
| Compose | Navigates to the entry form and types the cargo entry field by field from the paper in front of her, using labels, hints and required-field markers to keep her place | Entry form (F6 on F2) | "Required fields are marked — I can see what this thing insists on before I submit it." | Focused, methodical | Hand-typing is the only way in — there is no upload and no import (PROJECT.md excludes both) — so a long form is a long form | Clear required-field indication and hint text so the shape of a complete entry is legible before submission rather than discovered by failing |
| Submit | Presses Submit; the system persists the entry, runs required-information validation and — because nothing failed — commits a clean-pass receipt in a single transaction | Entry form (F6 on F2) → F3 → F4 | "Did that land, or did it just look like it landed?" | Momentary suspense | The gap between pressing Submit and knowing the outcome is where she has historically lost entries; silence reads as failure | Return the receipt outcome inside the 2-second interactive budget (NFR-10) so the suspense never becomes doubt |
| Read outcome | Reads the explicit receipt message — *validated clean, no exception opened* — announced to assistive technology as well as shown | Entry form (F6 on F2) | "Validated clean. There is no case. I am done with this one." | Relieved, certain | An absence of errors is not the same as a statement of success; if the screen only *fails* to complain she will re-check the queue anyway | State the clean outcome positively and name it, so "no news" is never the thing she has to interpret |
| Move on | Follows the offered route from the receipt outcome to the review queue to start her actual working session | Entry form (F6 on F2) → Queue (F8) | "Nothing was created here, so nothing of mine is waiting. On to the open ones." | Composed, ready | Without a route onward she re-navigates by hand, which is where a specialist starts keeping side-notes about where she was | One-action continuation from receipt outcome into the queue, so the clean branch ends in the flow rather than in a dead end |

#### Key Moments
- **Decision Point:** Submit — Dana commits an entry she cannot take back; the atomicity of receipt (persist → validate → decide outcome in one transaction, F3) is what makes this safe rather than provisional.
- **Risk of Abandonment:** Read outcome — if the clean result is implied rather than stated, she will go and check the queue to confirm, and from there she will start keeping her own list. The whole value of the explicit receipt message is that it prevents a private side-channel from forming.
- **Delight Opportunity:** Read outcome — a plainly-worded "validated clean" is the smallest possible sentence that ends a task completely, and it is rare enough in federal line-of-business tooling to be noticed.

#### Success Outcome
Dana knows within one screen, and without inference, that her entry was received and assessed and that no exception exists — satisfying JTBD-01.1's requirement that the outcome be stated explicitly rather than inferred from an absence of errors. This is the negative half of SM-8 (zero exceptions exist without a validation failure behind them) demonstrated in the browser, and it is the *receive → validate* half of the SM-1 loop walked without an exception being manufactured to prove it.

#### Feature Touchpoints

| Stage | Features |
|-------|----------|
| Arrive | F1, F2 |
| Authenticate | F1, F2, F13 |
| Compose | F6, F2 |
| Submit | F6, F3, F4, F13 |
| Read outcome | F6, F2, F4 |
| Move on | F6, F8 |

---
