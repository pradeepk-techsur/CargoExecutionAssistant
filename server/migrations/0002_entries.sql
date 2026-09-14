-- Up Migration
CREATE SEQUENCE case_reference_seq;

CREATE TABLE cargo_entries (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_reference         text NOT NULL,
  created_by             uuid NOT NULL REFERENCES specialists (id),
  received_at            timestamptz NOT NULL DEFAULT now(),
  receipt_outcome        text NOT NULL,

  -- The fourteen submitted fields, stored exactly as typed (trimmed only).
  entry_number           text,
  importer_of_record_id  text,
  port_of_entry_code     text,
  mode_of_transport      text,
  carrier_code           text,
  conveyance_name        text,
  bill_of_lading_number  text,
  air_waybill_number     text,
  country_of_origin_code text,
  goods_description      text,
  quantity               numeric(14,3),
  quantity_uom           text,
  declared_value_usd     numeric(14,2),
  arrival_date           date,

  CONSTRAINT cargo_entries_case_reference_fmt_chk
    CHECK (case_reference ~ '^CE-[0-9]{4}-[0-9]{6}$'),
  CONSTRAINT cargo_entries_receipt_outcome_chk
    CHECK (receipt_outcome IN ('VALIDATED_CLEAN','EXCEPTION_OPENED')),
  CONSTRAINT cargo_entries_len_chk CHECK (
    coalesce(char_length(entry_number),0)           <= 20 AND
    coalesce(char_length(importer_of_record_id),0)  <= 20 AND
    coalesce(char_length(port_of_entry_code),0)     <= 8  AND
    coalesce(char_length(mode_of_transport),0)      <= 16 AND
    coalesce(char_length(carrier_code),0)           <= 8  AND
    coalesce(char_length(conveyance_name),0)        <= 100 AND
    coalesce(char_length(bill_of_lading_number),0)  <= 40 AND
    coalesce(char_length(air_waybill_number),0)     <= 20 AND
    coalesce(char_length(country_of_origin_code),0) <= 4  AND
    coalesce(char_length(goods_description),0)      <= 2000 AND
    coalesce(char_length(quantity_uom),0)           <= 8
  )
);
CREATE UNIQUE INDEX uq_cargo_entries_case_reference ON cargo_entries (case_reference);
CREATE UNIQUE INDEX uq_cargo_entries_entry_number
  ON cargo_entries (entry_number) WHERE entry_number IS NOT NULL;   -- F3 FR-3.9
CREATE INDEX idx_cargo_entries_received_at ON cargo_entries (received_at);
-- receipt_outcome is written in the single INSERT (D-3); the application role
-- holds no UPDATE privilege on this table, so the entry of record is physically
-- immutable. Corrections live on decision_values, never as an overwrite.

-- Per-value provenance baseline: one row per field the specialist actually
-- provided (absent and whitespace-only fields get no row -- F3 FR-3.8).
CREATE TABLE cargo_entry_field_origins (
  entry_id     uuid NOT NULL REFERENCES cargo_entries (id),
  field_name   text NOT NULL,
  origin       text NOT NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, field_name),
  CONSTRAINT cefo_origin_human_chk CHECK (origin = 'HUMAN'),          -- F0 FR-0.3
  CONSTRAINT cefo_field_name_chk CHECK (field_name IN (
    'entry_number','importer_of_record_id','port_of_entry_code','mode_of_transport',
    'carrier_code','conveyance_name','bill_of_lading_number','air_waybill_number',
    'country_of_origin_code','goods_description','quantity','quantity_uom',
    'declared_value_usd','arrival_date'))
);
-- A manually typed value is HUMAN by construction: the CHECK is a constant, so
-- no code path -- including a compromised one -- can mark an entry value as AI.
