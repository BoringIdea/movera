-- Aptos Schemas Table
CREATE TABLE IF NOT EXISTS aptos_schemas (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    name TEXT,
    description TEXT,
    url TEXT,
    creator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    schema TEXT NOT NULL,
    revokable BOOLEAN DEFAULT false,
    resolver TEXT DEFAULT '0x0',
    tx_hash TEXT NOT NULL
);

-- Aptos Attestations Table
CREATE TABLE IF NOT EXISTS aptos_attestations (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    schema TEXT NOT NULL REFERENCES aptos_schemas(address),
    ref_attestation TEXT DEFAULT '0x0',
    time TEXT NOT NULL,
    expiration_time TEXT NOT NULL,
    revocation_time TEXT NOT NULL,
    revokable BOOLEAN DEFAULT false,
    attestor TEXT NOT NULL,
    recipient TEXT NOT NULL,
    data TEXT NOT NULL,
    tx_hash TEXT NOT NULL
);

-- Aptos Users Table
CREATE TABLE IF NOT EXISTS aptos_users (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE, -- user address
    created_at TEXT NOT NULL
);

-- Sui Users Table
CREATE TABLE IF NOT EXISTS sui_users (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE, -- user address
    created_at TEXT NOT NULL
);

-- Movement Users Table
CREATE TABLE IF NOT EXISTS movement_users (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE, -- user address
    created_at TEXT NOT NULL
);

-- Sui Schemas Table
CREATE TABLE IF NOT EXISTS sui_schemas (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    name TEXT,
    description TEXT,
    url TEXT,
    creator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    schema TEXT NOT NULL,
    revokable BOOLEAN DEFAULT false,
    resolver BOOLEAN DEFAULT false,
    admin_cap TEXT DEFAULT '0x0',
    tx_hash TEXT NOT NULL
);

-- Sui Attestations Table
CREATE TABLE IF NOT EXISTS sui_attestations (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    schema TEXT NOT NULL REFERENCES sui_schemas(address),
    ref_attestation TEXT DEFAULT '0x0',
    time TEXT NOT NULL,
    expiration_time TEXT NOT NULL,
    revocation_time TEXT,
    revokable BOOLEAN DEFAULT false,
    attestor TEXT NOT NULL,
    recipient TEXT NOT NULL,
    
    -- Storage type: 0 = ON_CHAIN, 1 = OFF_CHAIN (default: Walrus)
    storage_type INTEGER DEFAULT 0,
    
    -- Method 1: On-chain storage (backward compatible)
    data TEXT, -- Can be NULL for OFF_CHAIN storage
    
    -- Method 2: Off-chain storage (new, default: Walrus)
    walrus_sui_object_id TEXT, -- Sui object ID of Walrus blob (for OFF_CHAIN)
    walrus_blob_id TEXT, -- Walrus blob ID (base64url string, for OFF_CHAIN)
    data_hash TEXT, -- Original data hash (for integrity verification)
    encrypted BOOLEAN DEFAULT false, -- Whether data is encrypted
    seal_nonce TEXT, -- Seal encryption nonce (hex string, for encrypted OFF_CHAIN)
    seal_policy_id TEXT, -- Seal access policy ID (for other patterns, optional)
    
    -- Metadata (preserved)
    name TEXT,
    description TEXT,
    url TEXT,
    tx_hash TEXT NOT NULL
);

-- Movement Aptos Schemas Table
CREATE TABLE IF NOT EXISTS movement_schemas (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    name TEXT,
    description TEXT,
    url TEXT,
    creator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    schema TEXT NOT NULL,
    revokable BOOLEAN DEFAULT false,
    resolver TEXT DEFAULT '0x0',
    tx_hash TEXT NOT NULL
);

-- Movement Aptos Attestations Table
CREATE TABLE IF NOT EXISTS movement_attestations (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    schema TEXT NOT NULL REFERENCES movement_schemas(address),
    ref_attestation TEXT DEFAULT '0x0',
    time TEXT NOT NULL,
    expiration_time TEXT NOT NULL,
    revocation_time TEXT NOT NULL,
    revokable BOOLEAN DEFAULT false,
    attestor TEXT NOT NULL,
    recipient TEXT NOT NULL,
    data TEXT NOT NULL,
    tx_hash TEXT NOT NULL
);

-- Passport Scores Table
CREATE TABLE IF NOT EXISTS passport_scores (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  total_score DECIMAL(5,2) NOT NULL,
  grade VARCHAR(2) NOT NULL,
  longevity_score DECIMAL(5,2) NOT NULL,
  balance_score DECIMAL(5,2) NOT NULL,
  activity_score DECIMAL(5,2) NOT NULL,
  diversity_score DECIMAL(5,2) NOT NULL,
  volume_score DECIMAL(5,2) NOT NULL,
  complexity_score DECIMAL(5,2) NOT NULL,
  social_score DECIMAL(5,2) NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_address, chain, calculated_at)
);

-- Indexes
CREATE INDEX idx_passport_scores_user ON passport_scores(user_address, chain);
CREATE INDEX idx_passport_scores_calculated ON passport_scores(calculated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_passport_scores_user_chain_unique 
ON passport_scores (user_address, chain);

-- Passport Score History Table
CREATE TABLE IF NOT EXISTS passport_score_history (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  grade VARCHAR(2) NOT NULL,
  breakdown JSONB NOT NULL, -- Details of each dimension score
  calculated_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_score_history_user ON passport_score_history(user_address, chain);
CREATE INDEX idx_score_history_date ON passport_score_history(calculated_at);


-- User Activities Table
CREATE TABLE IF NOT EXISTS user_activities (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP,
  last_activity_at_index BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_address, chain)
);

-- Indexes
CREATE INDEX idx_user_activities_user ON user_activities(user_address, chain);

-- User Protocols Table
CREATE TABLE IF NOT EXISTS user_protocols (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  protocol_address VARCHAR(66) NOT NULL,
  protocol_name VARCHAR(100),
  protocol_category VARCHAR(50), -- DeFi, NFT, DAO, etc.
  interaction_count INTEGER NOT NULL DEFAULT 0,
  total_volume DECIMAL(20,8) NOT NULL DEFAULT 0,
  first_interaction_at TIMESTAMP NOT NULL,
  last_interaction_at TIMESTAMP NOT NULL,
  is_deep_interaction BOOLEAN DEFAULT FALSE, -- >=5 times and >=$100
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_address, chain, protocol_address)
);

-- Indexes
CREATE INDEX idx_user_protocols_user ON user_protocols(user_address, chain);
CREATE INDEX idx_user_protocols_category ON user_protocols(protocol_category);

-- User Transactions Table
CREATE TABLE IF NOT EXISTS user_transactions (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  tx_version BIGINT NOT NULL,
  function_name VARCHAR(200),
  protocol_address VARCHAR(66),
  protocol_name VARCHAR(100),
  amount DECIMAL(20,8),
  token_symbol VARCHAR(20),
  operation_type VARCHAR(50), -- basic, advanced, complex
  complexity_level INTEGER DEFAULT 1, -- 1=basic, 2=advanced, 3=complex
  gas_used BIGINT,
  success BOOLEAN NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tx_hash)
);

-- Indexes
CREATE INDEX idx_user_transactions_user ON user_transactions(user_address, chain);
CREATE INDEX idx_user_transactions_timestamp ON user_transactions(timestamp);
CREATE INDEX idx_user_transactions_protocol ON user_transactions(protocol_address);

-- User Social Data Table
CREATE TABLE IF NOT EXISTS user_social_data (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  has_ens BOOLEAN DEFAULT FALSE,
  ens_name VARCHAR(100),
  social_connections INTEGER DEFAULT 0,
  attestation_count INTEGER DEFAULT 0,
  badge_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_address, chain)
);

-- Indexes
CREATE INDEX idx_user_social_user ON user_social_data(user_address, chain);

-- User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  badge_id VARCHAR(50) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_description TEXT,
  badge_icon VARCHAR(20),
  badge_category VARCHAR(50), -- official, protocol, community
  earned BOOLEAN DEFAULT FALSE,
  progress INTEGER DEFAULT 0, -- 0-100
  earned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_address, chain, badge_id)
);

-- Indexes
CREATE INDEX idx_user_badges_user ON user_badges(user_address, chain);
CREATE INDEX idx_user_badges_earned ON user_badges(earned);

-- Protocols Table
CREATE TABLE IF NOT EXISTS protocols (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  chain VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  module VARCHAR(200), -- module name
  function_name_list VARCHAR(200), -- swap, mint, burn, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_protocols_address ON protocols(address);
CREATE INDEX idx_protocols_chain ON protocols(chain);
CREATE INDEX idx_protocols_type ON protocols(type);
CREATE INDEX idx_protocols_function_name_list ON protocols(function_name_list);

-- User Attestations Table
CREATE TABLE IF NOT EXISTS user_attestations (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  attestation_id VARCHAR(66) NOT NULL UNIQUE,
  attestor_address VARCHAR(66) NOT NULL,
  schema_id VARCHAR(66) NOT NULL,
  data TEXT NOT NULL,
  attestation_type VARCHAR(50), -- ENS, Gitcoin, BrightID, etc.
  score_weight DECIMAL(3,2) DEFAULT '1.0', -- 权重
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  is_valid BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_user_attestations_user ON user_attestations(user_address, chain);
CREATE INDEX idx_user_attestations_attestation_id ON user_attestations(attestation_id);
CREATE INDEX idx_user_attestations_attestor_address ON user_attestations(attestor_address);
CREATE INDEX idx_user_attestations_schema_id ON user_attestations(schema_id);
CREATE INDEX idx_user_attestations_attestation_type ON user_attestations(attestation_type);
CREATE INDEX idx_user_attestations_expires_at ON user_attestations(expires_at);
CREATE INDEX idx_user_attestations_is_valid ON user_attestations(is_valid);

-- Score Cache Table
CREATE TABLE IF NOT EXISTS score_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(100) NOT NULL UNIQUE,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_score_cache_user ON score_cache(user_address, chain);
CREATE INDEX idx_score_cache_expires_at ON score_cache(expires_at);

-- Data Sync Status Table
CREATE TABLE IF NOT EXISTS data_sync_status (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  data_type VARCHAR(50) NOT NULL, -- score, activity, protocols, etc.
  last_sync_at TIMESTAMP NOT NULL,
  sync_status VARCHAR(20) NOT NULL, -- pending, completed, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

