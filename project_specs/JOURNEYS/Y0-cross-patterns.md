
## Cross-Journey Patterns

### Common Pain Points

- **The silent interval between submitting and knowing** appears in JRN-01.1 (Submit), JRN-01.2 (Submit a deficient entry), JRN-01.6 (Wait, briefly) and JRN-01.7 (Hear the receipt outcome). In every one, the friction is the same: a system that does not state its outcome is a system a specialist stops trusting, and the compensating behaviour — a private side-list, a re-check of the queue — is the exact pain point the product exists to remove. Solved once by explicit, announced outcome messaging at the shell level (F2 live regions) and inherited by F6, F10 and F12.
- **Provenance carried by colour alone** would break JRN-01.3 (Verify the provenance), JRN-01.5 (Answer *AI versus human*), JRN-01.7 (Read the case in order) and — indirectly, since he hears it read — JRN-02.1 (Hear *what the AI said versus what the human chose*). One design rule fixes all four: origin conveyed programmatically and textually as well as visually, everywhere it appears (NFR-4).
- **A required reason with no visible consumer degrades into a formality** across JRN-01.3, JRN-01.4, JRN-01.6 and, as a consequence, JRN-02.1 and JRN-03.1 (R-8). The structural defence is not a longer minimum length but rendering the reason in the audit trail where it is actually read (F14), plus walkthrough review of decision-usefulness (SM-5, SM-9).
- **The absence of cross-case search** is felt at JRN-01.5 (Locate the case) and JRN-02.1 (Receive the question). Both journeys begin holding a case reference or they do not begin at all. This is a deliberate cost of PRD §10 and must be paid by making the case reference the durable identifier on every screen and in every receipt message — never by adding a search surface.
- **Mediated access is a single point of failure for oversight.** JRN-02.1 is conducted entirely through another human because Marcus has no account. Every thinness in the per-case trail becomes a thinness in his answer, with nothing downstream to compensate. This is why F14 is specified to be sufficient on its own rather than adequate-plus-export.
- **The lowest-effort path is the most dangerous one.** Approval is cheaper than editing and far cheaper than rejecting (JRN-01.2, JRN-01.3, JRN-01.4). Only the absence of a default and the equal weighting of the three actions keeps approval an act rather than an omission (R-1, JTBD-01.4).

### Shared Opportunities

- **Establish accessibility once, inherit it six times.** Landmarks, heading order, label/error association, focus management, live-region status and visible focus are built into the shell (F2) and inherited by F6, F8, F10, F12 and F14. This single investment carries JRN-01.7 end to end and removes the same class of pain point from all six PER-01 journeys — with no automated CI gate, per-screen manual and assistive-technology review is the gate (excluded by `.planning/PROJECT.md`; R-3).
- **Make the case reference the currency of the whole product.** It appears in the receipt outcome (F6), the queue row (F8), the case header (F10), the decision confirmation (F12) and the trail (F14). Strengthening it serves JRN-01.1, 01.2, 01.5, and JRN-02.1's opening stage simultaneously.
- **Answer in place rather than relocating the answer.** NFR-7 serves JRN-01.5, JRN-02.1 and JRN-03.1's closing stage with one property. An export would appear to help all three and would in fact weaken all three, by making the trail's sufficiency optional — which is why PRD §10 #5 excludes it.
- **State degraded conditions positively.** JRN-01.6's degraded-mode presentation and JRN-01.1's clean-pass message are the same design move: naming a condition rather than leaving it to be inferred from an absence. Both prevent the specialist from going to look somewhere else.
- **Transactional coupling removes a whole class of journey failure.** Because a state change and its audit entry commit together (NFR-6), no journey in this document can end in a resolved case with no history — the failure mode simply has no representation.

### Convergence Points

- **The per-case audit trail (F14) is where all three personas meet.** PER-01 reads it directly (JRN-01.2 Close the loop, JRN-01.3 Verify the provenance, JRN-01.5 in full, JRN-01.6 Verify the record, JRN-01.7 Read the trail back). PER-02 hears it read to him (JRN-02.1). PER-03 watches it being read (JRN-03.1 Watch audit close the loop). One screen, three relationships — operator, beneficiary, witness — and only one of them is a user.
- **The decision controls (F12) carry the product's central claim for everyone.** Dana's deliberateness (JRN-01.2, 01.3, 01.4, 01.6, 01.7), Marcus's certainty that a named human decided (JRN-02.1), and Priya's structural answer on accountability (JRN-03.1) all rest on the same undefaulted three-action control and its mandatory reason.
- **Validation findings (F4 → F5) converge at the start of every exception journey.** They are the basis Dana reasons from (JRN-01.2, 01.6), the answer to Marcus's "why was this case open at all" (JRN-02.1), and the visible proof to Priya that exceptions are derived rather than authored (JRN-03.1).
- **The non-user journeys converge on PER-01's session, never on a surface of their own.** JRN-02.1 depends on JRN-01.5 being complete; JRN-03.1 is JRN-01.2 and JRN-01.3 observed. Strengthening PER-01's record and screens is the only mechanism by which PER-02 and PER-03 are served — and the only one permitted.

---
