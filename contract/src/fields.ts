export const ENTRY_FIELDS = [
  'entry_number',
  'importer_of_record_id',
  'port_of_entry_code',
  'mode_of_transport',
  'carrier_code',
  'conveyance_name',
  'bill_of_lading_number',
  'air_waybill_number',
  'country_of_origin_code',
  'goods_description',
  'quantity',
  'quantity_uom',
  'declared_value_usd',
  'arrival_date',
] as const;

export type EntryFieldName = (typeof ENTRY_FIELDS)[number];
