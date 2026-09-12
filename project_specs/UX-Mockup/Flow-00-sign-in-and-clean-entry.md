## Flow 0: Sign in and file a clean entry

**Journey:** JRN-01.1 · **Trigger:** Specialist opens the application at the start of a shift
holding a paper cargo entry she believes is complete.
**User stories:** US-1.1, US-1.2, US-2.1, US-2.2, US-6.1, US-6.2, US-6.3, US-4.4, US-3.1
**Screens:** Sign in → Cargo entry form → (offered) Review queue
**Loop stages covered:** receive → validate (and stop — no exception is manufactured)

```
[Browser opened at / ]
        │
        ▼
[Server: no session] ──302──▶ [1. Sign in  /sign-in?next=%2Fqueue]
        │
        │ enter email + password, Enter
        ▼
   ┌────────────────────────────────────────────────┐
   │ POST /api/session                              │
   └────────────────────────────────────────────────┘
        ├── 401 AUTH_FAILED ──▶ [Sign-in error state: error summary takes focus,
        │                        generic message, password cleared, email kept]  ──┐
        ├── 403 ACCOUNT_INACTIVE ─▶ [same summary pattern, "This account is not active."]
        ├── 429 TOO_MANY_ATTEMPTS ▶ [same summary pattern, "Try again in about 15 minutes."]
        │                                                                          │
        └── 201 ──▶ [3. Review queue  /queue]  ◀───────── (re-attempt) ────────────┘
                        │
                        │ header nav: "New cargo entry"
                        ▼
                  [2. Cargo entry form  /entries/new]
                        │
                        │ type 14 fields from paper; activate "Submit entry"
                        ▼
              ┌──────────────────────────────────────┐
              │ POST /api/entries  (atomic receipt)  │
              └──────────────────────────────────────┘
                        │
        ┌───────────────┼────────────────────────────┬─────────────────────────┐
        │               │                            │                         │
   201 VALIDATED_  201 EXCEPTION_               409 ENTRY_NUMBER_        500 RECEIPT_FAILED
      CLEAN           OPENED                      DUPLICATE              / network failure
        │           (see Flow 1)                      │                         │
        ▼                                             ▼                         ▼
 [Receipt outcome panel]                    [Error summary + inline       [Error summary:
  h2 "Entry received and validated"          error on entry_number +       "Nothing was saved.
  Case CE-2026-000142                        link to existing case]        Try again."
  "No exception was opened."                 focus → summary               values preserved]
  [Create another entry] [Go to review queue]
        │
        │ focus → panel h2; polite: "Entry received. Validation passed. Case CE-2026-000142."
        ▼
 [3. Review queue  /queue]  ── work begins
```

### Steps

1. **Arrive.** Any unauthenticated navigation is redirected to `/sign-in?next={path}`; no
   protected content renders even momentarily (US-1.2, FR-2.4 "no flash of protected
   content"). The `usa-banner` and shell are painted before the form so the page does not
   reflow under the specialist.
2. **Authenticate.** Tab order is email → password → "Sign in"; `Enter` submits from either
   field (US-1.1). On success the shell header gains the display name and "Sign out", which is
   the standing answer to *whose identity will be attributed today* (JRN-01.1 "Authenticate"
   opportunity).
3. **Compose.** The entry form states the required-field convention above the first field, and
   marks the twelve presence-checked fields with the USWDS required indicator, so the shape of
   a complete entry is legible before submission rather than discovered by failing (US-6.1).
4. **Submit.** The button enters its busy state ("Submitting…", `aria-disabled="true"`) and a
   second activation is ignored (US-6.5, FR-6.9). The client does **not** block submission —
   the form is `novalidate` (US-6.2).
5. **Read outcome.** On `VALIDATED_CLEAN` the form region is replaced by a `usa-summary-box`
   stating the outcome **positively and in words**, with the case reference. The submitted
   values remain readable below as a read-only definition list (not disabled inputs), so a
   screen-reader user can still read them back (FR-6.14). Focus moves to the panel heading;
   the polite region announces the outcome (US-6.3, US-4.4).
6. **Move on.** The panel offers exactly two onward actions — "Create another entry" (resets
   to an empty form, focus on the first field) and "Go to review queue" — so the clean branch
   ends inside the flow rather than in a dead end (JRN-01.1 "Move on").

### Design notes

- The clean outcome is a **positive statement**, never an absence of errors (P1). Copy: *"Entry
  received and validated. Case CE-2026-000142. No exception was opened — there is nothing to
  review for this entry."*
- There is deliberately **no link to a case** on the clean branch, because no case exists;
  `next.case_url` is `null` (Y1-api §2). Offering one would imply a record that does not exist.
- Sign-in offers **no** "remember me", third-party sign-in, self-registration, password-reset
  or invite affordance — their absence is specified, not accidental (US-1.1, FR-1.13).
