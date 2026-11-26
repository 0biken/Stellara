-- jsonb reorders keys, invalidating signatures and payload hashes after retrieval.
-- Older packs fail client verification and can be downloaded again.
alter table stellara_private.practice_packs alter column document type text using document::text;
alter table stellara_private.practice_packs add constraint pack_document_json
  check (json_typeof(document::json)='object');
