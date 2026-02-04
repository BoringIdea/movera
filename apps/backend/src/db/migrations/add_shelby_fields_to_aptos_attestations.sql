-- Migration: Add Shelby off-chain fields to aptos_attestations table
-- Description: Adds off-chain storage metadata for Shelby and makes data nullable

ALTER TABLE aptos_attestations
ALTER COLUMN data DROP NOT NULL;

ALTER TABLE aptos_attestations
ADD COLUMN IF NOT EXISTS storage_type INTEGER DEFAULT 0;

ALTER TABLE aptos_attestations
ADD COLUMN IF NOT EXISTS data_hash TEXT;

ALTER TABLE aptos_attestations
ADD COLUMN IF NOT EXISTS shelby_account TEXT;

ALTER TABLE aptos_attestations
ADD COLUMN IF NOT EXISTS shelby_blob_name TEXT;

CREATE INDEX IF NOT EXISTS idx_aptos_attestations_storage_type
ON aptos_attestations(storage_type);

CREATE INDEX IF NOT EXISTS idx_aptos_attestations_shelby_blob_name
ON aptos_attestations(shelby_blob_name)
WHERE shelby_blob_name IS NOT NULL;
