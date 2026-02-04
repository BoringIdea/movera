-- Migration: Add new Shelby fields to aptos_attestations table
-- Description: Adds blob_merkle_root and register_tx_hash fields for Shelby off-chain storage

-- Add shelby_blob_merkle_root column
ALTER TABLE aptos_attestations
ADD COLUMN IF NOT EXISTS shelby_blob_merkle_root TEXT;

-- Add shelby_register_tx_hash column
ALTER TABLE aptos_attestations
ADD COLUMN IF NOT EXISTS shelby_register_tx_hash TEXT;

-- Add comments for documentation
COMMENT ON COLUMN aptos_attestations.shelby_blob_merkle_root IS 'Shelby blob merkle root (commitment hash)';
COMMENT ON COLUMN aptos_attestations.shelby_register_tx_hash IS 'Shelby blob registration transaction hash';
