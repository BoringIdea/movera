import { pgTable, serial, text, boolean, varchar, decimal, integer, timestamp, bigint, jsonb, unique } from 'drizzle-orm/pg-core';

export const aptos_schemas = pgTable('aptos_schemas', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  name: text('name'),
  description: text('description'),
  url: text('url'),
  creator: text('creator').notNull(),
  created_at: text('created_at').notNull(),
  schema: text('schema').notNull(),
  revokable: boolean('revokable').default(false),
  resolver: text('resolver').default('0x0'),
  tx_hash: text('tx_hash').notNull(),
});

export const aptos_attestations = pgTable('aptos_attestations', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  schema: text('schema').notNull().references(() => aptos_schemas.address),
  ref_attestation: text('ref_attestation').default('0x0'),
  time: text('time').notNull(),
  expiration_time: text('expiration_time').notNull(),
  revocation_time: text('revocation_time').notNull(),
  revokable: boolean('revokable').default(false),
  attestor: text('attestor').notNull(),
  recipient: text('recipient').notNull(),
  data: text('data').notNull(),
  tx_hash: text('tx_hash').notNull(),
});

export const sui_schemas = pgTable('sui_schemas', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  name: text('name'),
  description: text('description'),
  url: text('url'),
  creator: text('creator').notNull(),
  created_at: text('created_at').notNull(),
  schema: text('schema').notNull(),
  revokable: boolean('revokable').default(false),
  resolver: boolean('resolver').default(false),
  admin_cap: text('admin_cap').default('0x0'),
  tx_hash: text('tx_hash').notNull(),
});

export const sui_attestations = pgTable('sui_attestations', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  schema: text('schema').notNull().references(() => sui_schemas.address),
  ref_attestation: text('ref_attestation').default('0x0'),
  time: text('time').notNull(),
  expiration_time: text('expiration_time').notNull(),
  revocation_time: text('revocation_time'),
  revokable: boolean('revokable').default(false),
  attestor: text('attestor').notNull(),
  recipient: text('recipient').notNull(),
  
  // Storage type: 0 = ON_CHAIN, 1 = OFF_CHAIN (default: Walrus)
  storage_type: integer('storage_type').default(0),
  
  // Method 1: On-chain storage (backward compatible)
  data: text('data'), // Can be null for OFF_CHAIN storage
  
  // Method 2: Off-chain storage (new, default: Walrus)
  walrus_sui_object_id: text('walrus_sui_object_id'), // Sui object ID of Walrus blob
  walrus_blob_id: text('walrus_blob_id'), // Walrus blob ID (base64url string)
  data_hash: text('data_hash'), // Original data hash (for integrity verification)
  encrypted: boolean('encrypted').default(false), // Whether data is encrypted
  seal_nonce: text('seal_nonce'), // Seal encryption nonce (for encrypted OFF_CHAIN)
  seal_policy_id: text('seal_policy_id'), // Seal access policy ID (for other patterns, optional)
  
  // Metadata (preserved)
  name: text('name'),
  description: text('description'),
  url: text('url'),
  tx_hash: text('tx_hash').notNull(),
});

export const movement_schemas = pgTable('movement_schemas', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  name: text('name'),
  description: text('description'),
  url: text('url'),
  creator: text('creator').notNull(),
  created_at: text('created_at').notNull(),
  schema: text('schema').notNull(),
  revokable: boolean('revokable').default(false),
  resolver: text('resolver').default('0x0'),
  tx_hash: text('tx_hash').notNull(),
});

export const movement_attestations = pgTable('movement_attestations', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  schema: text('schema').notNull().references(() => movement_schemas.address),
  ref_attestation: text('ref_attestation').default('0x0'),
  time: text('time').notNull(),
  expiration_time: text('expiration_time').notNull(),
  revocation_time: text('revocation_time').notNull(),
  revokable: boolean('revokable').default(false),
  attestor: text('attestor').notNull(),
  recipient: text('recipient').notNull(),
  data: text('data').notNull(),
  tx_hash: text('tx_hash').notNull(),
});

// User tables for Passport system
export const aptos_users = pgTable('aptos_users', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  created_at: text('created_at').notNull(),
});

export const sui_users = pgTable('sui_users', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  created_at: text('created_at').notNull(),
});

export const movement_users = pgTable('movement_users', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  created_at: text('created_at').notNull(),
});

// Passport Scores Table
export const passport_scores = pgTable('passport_scores', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  total_score: decimal('total_score', { precision: 5, scale: 2 }).notNull(),
  grade: varchar('grade', { length: 2 }).notNull(),
  longevity_score: decimal('longevity_score', { precision: 5, scale: 2 }).notNull(),
  balance_score: decimal('balance_score', { precision: 5, scale: 2 }).notNull(),
  activity_score: decimal('activity_score', { precision: 5, scale: 2 }).notNull(),
  diversity_score: decimal('diversity_score', { precision: 5, scale: 2 }).notNull(),
  volume_score: decimal('volume_score', { precision: 5, scale: 2 }).notNull(),
  complexity_score: decimal('complexity_score', { precision: 5, scale: 2 }).notNull(),
  social_score: decimal('social_score', { precision: 5, scale: 2 }).notNull(),
  calculated_at: timestamp('calculated_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChain: unique().on(table.user_address, table.chain),
}));

// Passport Score History Table
export const passport_score_history = pgTable('passport_score_history', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  score: decimal('score', { precision: 5, scale: 2 }).notNull(),
  grade: varchar('grade', { length: 2 }).notNull(),
  breakdown: jsonb('breakdown').notNull(), // Details of each dimension score
  calculated_at: timestamp('calculated_at').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// User Activities Table
export const user_activities = pgTable('user_activities', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  total_transactions: integer('total_transactions').notNull().default(0),
  active_days: integer('active_days').notNull().default(0),
  longest_streak: integer('longest_streak').notNull().default(0),
  last_activity_at: timestamp('last_activity_at'),
  last_activity_at_index: bigint('last_activity_at_index', { mode: 'number' }).notNull().default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChain: unique().on(table.user_address, table.chain),
}));

// User Protocols Table
export const user_protocols = pgTable('user_protocols', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  protocol_address: varchar('protocol_address', { length: 66 }).notNull(),
  protocol_name: varchar('protocol_name', { length: 100 }),
  protocol_category: varchar('protocol_category', { length: 50 }), // DeFi, NFT, DAO, etc.
  interaction_count: integer('interaction_count').notNull().default(0),
  total_volume: decimal('total_volume', { precision: 20, scale: 8 }).notNull().default('0'),
  first_interaction_at: timestamp('first_interaction_at').notNull(),
  last_interaction_at: timestamp('last_interaction_at').notNull(),
  is_deep_interaction: boolean('is_deep_interaction').default(false), // >=5 times and >=$100
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChainProtocol: unique().on(table.user_address, table.chain, table.protocol_address),
}));

// User Transactions Table
export const user_transactions = pgTable('user_transactions', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  tx_hash: varchar('tx_hash', { length: 66 }).notNull().unique(),
  tx_version: bigint('tx_version', { mode: 'bigint' }).notNull(),
  function_name: varchar('function_name', { length: 200 }),
  protocol_address: varchar('protocol_address', { length: 66 }),
  protocol_name: varchar('protocol_name', { length: 100 }),
  amount: decimal('amount', { precision: 20, scale: 8 }),
  token_symbol: varchar('token_symbol', { length: 20 }),
  operation_type: varchar('operation_type', { length: 50 }), // basic, advanced, complex
  complexity_level: integer('complexity_level').default(1), // 1=basic, 2=advanced, 3=complex
  gas_used: bigint('gas_used', { mode: 'number' }),
  success: boolean('success').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// User Social Data Table
export const user_social_data = pgTable('user_social_data', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  has_ens: boolean('has_ens').default(false),
  ens_name: varchar('ens_name', { length: 100 }),
  social_connections: integer('social_connections').default(0),
  attestation_count: integer('attestation_count').default(0),
  badge_count: integer('badge_count').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChain: unique().on(table.user_address, table.chain),
}));

// User Badges Table
export const user_badges = pgTable('user_badges', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  badge_id: varchar('badge_id', { length: 50 }).notNull(),
  badge_name: varchar('badge_name', { length: 100 }).notNull(),
  badge_description: text('badge_description'),
  badge_icon: varchar('badge_icon', { length: 20 }),
  badge_category: varchar('badge_category', { length: 50 }), // official, protocol, community
  earned: boolean('earned').default(false),
  progress: integer('progress').default(0), // 0-100
  earned_at: timestamp('earned_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChainBadge: unique().on(table.user_address, table.chain, table.badge_id),
}));

// Protocols Table
export const protocols = pgTable('protocols', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  url: text('url'),
  chain: varchar('chain', { length: 20 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  module: varchar('module', { length: 200 }), // module name
  function_name_list: varchar('function_name_list', { length: 200 }), // swap, mint, burn, etc.
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// User Attestations Table
export const user_attestations = pgTable('user_attestations', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  attestation_id: varchar('attestation_id', { length: 66 }).notNull().unique(),
  attestor_address: varchar('attestor_address', { length: 66 }).notNull(),
  schema_id: varchar('schema_id', { length: 66 }).notNull(),
  data: text('data'), // JSON formatted authentication data
  attestation_type: varchar('attestation_type', { length: 50 }), // ENS, Gitcoin, BrightID, etc.
  score_weight: decimal('score_weight', { precision: 3, scale: 2 }).default('1.0'), // Weight
  created_at: timestamp('created_at').notNull(),
  expires_at: timestamp('expires_at'),
  is_valid: boolean('is_valid').default(true),
});

// Score Cache Table
export const score_cache = pgTable('score_cache', {
  id: serial('id').primaryKey(),
  cache_key: varchar('cache_key', { length: 100 }).notNull().unique(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  cache_data: jsonb('cache_data').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// Data Sync Status Table
export const data_sync_status = pgTable('data_sync_status', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  data_type: varchar('data_type', { length: 50 }).notNull(), // score, activity, protocols, etc.
  last_sync_at: timestamp('last_sync_at').notNull(),
  sync_status: varchar('sync_status', { length: 20 }).notNull(), // pending, completed, failed
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChainDataType: unique().on(table.user_address, table.chain, table.data_type),
}));