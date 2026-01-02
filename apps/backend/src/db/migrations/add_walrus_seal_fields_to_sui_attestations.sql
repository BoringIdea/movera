-- Migration: Add Walrus and Seal fields to sui_attestations table
-- Date: 2025-11-20
-- Description: Adds support for off-chain storage (Walrus) and encryption (Seal)

-- Add storage_type column (0 = ON_CHAIN, 1 = OFF_CHAIN)
ALTER TABLE sui_attestations 
ADD COLUMN IF NOT EXISTS storage_type INTEGER DEFAULT 0;

-- Make data column nullable (for OFF_CHAIN storage, data is stored off-chain)
ALTER TABLE sui_attestations 
ALTER COLUMN data DROP NOT NULL;

-- Add off-chain storage fields
ALTER TABLE sui_attestations 
ADD COLUMN IF NOT EXISTS walrus_blob_id TEXT;

ALTER TABLE sui_attestations 
ADD COLUMN IF NOT EXISTS data_hash TEXT;

ALTER TABLE sui_attestations 
ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT false;

ALTER TABLE sui_attestations 
ADD COLUMN IF NOT EXISTS seal_policy_id TEXT;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_sui_attestations_storage_type ON sui_attestations(storage_type);
CREATE INDEX IF NOT EXISTS idx_sui_attestations_encrypted ON sui_attestations(encrypted);
CREATE INDEX IF NOT EXISTS idx_sui_attestations_walrus_blob_id ON sui_attestations(walrus_blob_id) WHERE walrus_blob_id IS NOT NULL;

-- Update existing records: Set storage_type to 0 (ON_CHAIN) for backward compatibility
UPDATE sui_attestations 
SET storage_type = 0 
WHERE storage_type IS NULL;

-- Comments
COMMENT ON COLUMN sui_attestations.storage_type IS 'Storage type: 0 = ON_CHAIN, 1 = OFF_CHAIN (default: Walrus)';
COMMENT ON COLUMN sui_attestations.data IS 'On-chain stored data (NULL for OFF_CHAIN storage)';
COMMENT ON COLUMN sui_attestations.walrus_blob_id IS 'Off-chain storage blob ID (default: Walrus)';
COMMENT ON COLUMN sui_attestations.data_hash IS 'Original data hash (for integrity verification)';
COMMENT ON COLUMN sui_attestations.encrypted IS 'Whether data is encrypted using Seal';
COMMENT ON COLUMN sui_attestations.seal_policy_id IS 'Seal access policy ID (optional)';

