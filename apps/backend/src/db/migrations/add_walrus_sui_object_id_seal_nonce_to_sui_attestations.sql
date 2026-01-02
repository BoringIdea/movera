-- Migration: Add walrus_sui_object_id and seal_nonce fields to sui_attestations table
-- Date: 2025-11-20
-- Description: 
--   - Adds walrus_sui_object_id field to store Sui object ID of Walrus blob
--   - Changes walrus_blob_id to store base64url string (instead of address)
--   - Adds seal_nonce field for Seal encryption nonce

-- Add walrus_sui_object_id column (Sui object ID of Walrus blob)
ALTER TABLE sui_attestations 
ADD COLUMN IF NOT EXISTS walrus_sui_object_id TEXT;

-- Add seal_nonce column (Seal encryption nonce, stored as hex string)
ALTER TABLE sui_attestations 
ADD COLUMN IF NOT EXISTS seal_nonce TEXT;

-- Create index for walrus_sui_object_id
CREATE INDEX IF NOT EXISTS idx_sui_attestations_walrus_sui_object_id 
ON sui_attestations(walrus_sui_object_id) 
WHERE walrus_sui_object_id IS NOT NULL;

-- Create index for seal_nonce
CREATE INDEX IF NOT EXISTS idx_sui_attestations_seal_nonce 
ON sui_attestations(seal_nonce) 
WHERE seal_nonce IS NOT NULL;

-- Comments
COMMENT ON COLUMN sui_attestations.walrus_sui_object_id IS 'Sui object ID of Walrus blob (for OFF_CHAIN storage)';
COMMENT ON COLUMN sui_attestations.walrus_blob_id IS 'Walrus blob ID (base64url string, for OFF_CHAIN storage)';
COMMENT ON COLUMN sui_attestations.seal_nonce IS 'Seal encryption nonce (hex string, for encrypted OFF_CHAIN storage)';

