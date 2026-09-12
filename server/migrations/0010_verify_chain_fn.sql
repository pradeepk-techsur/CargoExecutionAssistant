-- Up Migration
CREATE OR REPLACE FUNCTION verify_audit_chain(p_case_id uuid)
RETURNS TABLE (chain_verified boolean, first_divergence_sequence integer, entry_count integer)
LANGUAGE plpgsql STABLE AS $$
DECLARE r record; expected bytea := decode(repeat('00', 32), 'hex'); n integer := 0;
BEGIN
  FOR r IN SELECT case_sequence, prev_entry_hash, entry_hash FROM audit_entries
            WHERE case_id = p_case_id ORDER BY case_sequence LOOP
    n := n + 1;
    IF r.case_sequence <> n OR r.prev_entry_hash <> expected THEN
      RETURN QUERY SELECT false, r.case_sequence, n; RETURN;
    END IF;
    expected := r.entry_hash;
  END LOOP;
  RETURN QUERY SELECT true, NULL::integer, n;
END $$;
-- STABLE and read-only by construction: it reports divergence and never
-- repairs, rewrites, or annotates the chain (F0 FR-0.8). The UI surfaces the
-- result and offers no repair action (F14).

-- EXECUTE is granted to PUBLIC by default for functions, so this is a statement
-- of intent rather than a change -- kept, matching the style of migration 0008.
GRANT EXECUTE ON FUNCTION verify_audit_chain(uuid) TO cargoexec_app, cargoexec_ai;
