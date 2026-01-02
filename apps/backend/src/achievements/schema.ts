import { pgTable, serial, text, boolean, varchar, decimal, integer, timestamp, bigint, jsonb, unique } from 'drizzle-orm/pg-core';

// 1. Tasks Definition Table
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  task_code: varchar('task_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  task_type: varchar('task_type', { length: 50 }).notNull(),
  protocol_address: varchar('protocol_address', { length: 66 }),
  protocol_name: varchar('protocol_name', { length: 100 }),
  conditions: jsonb('conditions').notNull(),
  reward_points: integer('reward_points').notNull().default(0),
  max_rewards: integer('max_rewards').default(1),
  difficulty_level: integer('difficulty_level').default(1),
  is_active: boolean('is_active').default(true),
  start_date: timestamp('start_date'),
  end_date: timestamp('end_date'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 2. User Task Progress Table
export const user_task_progress = pgTable('user_task_progress', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  task_id: integer('task_id').references(() => tasks.id),
  current_progress: integer('current_progress').default(0),
  target_progress: integer('target_progress').notNull(),
  is_completed: boolean('is_completed').default(false),
  completed_at: timestamp('completed_at'),
  reward_claimed: boolean('reward_claimed').default(false),
  reward_claimed_at: timestamp('reward_claimed_at'),
  progress_data: jsonb('progress_data'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChainTask: unique().on(table.user_address, table.chain, table.task_id),
}));

// 3. User Points Table
export const user_points = pgTable('user_points', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  protocol_address: varchar('protocol_address', { length: 66 }),
  protocol_name: varchar('protocol_name', { length: 100 }),
  total_points: integer('total_points').default(0),
  available_points: integer('available_points').default(0),
  claimed_points: integer('claimed_points').default(0),
  last_updated: timestamp('last_updated').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChainProtocol: unique().on(table.user_address, table.chain, table.protocol_address),
}));

// 4. Point Transactions Table
export const point_transactions = pgTable('point_transactions', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  task_id: integer('task_id').references(() => tasks.id),
  points: integer('points').notNull(),
  transaction_type: varchar('transaction_type', { length: 20 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow(),
});

// 5. Task Completions Table
export const task_completions = pgTable('task_completions', {
  id: serial('id').primaryKey(),
  user_address: varchar('user_address', { length: 66 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  task_id: integer('task_id').references(() => tasks.id),
  completion_count: integer('completion_count').default(1),
  first_completed_at: timestamp('first_completed_at').notNull(),
  last_completed_at: timestamp('last_completed_at').notNull(),
  completion_data: jsonb('completion_data'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 6. Data Sources Configuration Table
export const data_sources = pgTable('data_sources', {
  id: serial('id').primaryKey(),
  source_name: varchar('source_name', { length: 100 }).notNull(),
  source_type: varchar('source_type', { length: 50 }).notNull(),
  chain: varchar('chain', { length: 20 }).notNull(),
  protocol_address: varchar('protocol_address', { length: 66 }),
  protocol_name: varchar('protocol_name', { length: 100 }),
  api_endpoint: varchar('api_endpoint', { length: 500 }),
  api_auth_type: varchar('api_auth_type', { length: 50 }),
  api_auth_config: jsonb('api_auth_config'),
  data_mapping: jsonb('data_mapping'),
  update_frequency: integer('update_frequency').default(300),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 7. Scheduled Tasks Configuration Table
export const scheduled_tasks = pgTable('scheduled_tasks', {
  id: serial('id').primaryKey(),
  task_name: varchar('task_name', { length: 100 }).notNull(),
  task_type: varchar('task_type', { length: 50 }).notNull(),
  cron_expression: varchar('cron_expression', { length: 100 }).notNull(),
  is_active: boolean('is_active').default(true),
  last_executed: timestamp('last_executed'),
  next_execution: timestamp('next_execution'),
  execution_count: integer('execution_count').default(0),
  success_count: integer('success_count').default(0),
  error_count: integer('error_count').default(0),
  last_error: text('last_error'),
  config: jsonb('config'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 8. Data Sync Logs Table
export const data_sync_logs = pgTable('data_sync_logs', {
  id: serial('id').primaryKey(),
  source_id: integer('source_id').references(() => data_sources.id),
  user_address: varchar('user_address', { length: 66 }),
  chain: varchar('chain', { length: 20 }),
  sync_type: varchar('sync_type', { length: 50 }),
  sync_status: varchar('sync_status', { length: 20 }),
  records_processed: integer('records_processed').default(0),
  records_updated: integer('records_updated').default(0),
  sync_duration: integer('sync_duration'),
  error_message: text('error_message'),
  sync_data: jsonb('sync_data'),
  started_at: timestamp('started_at').notNull(),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow(),
});

// Export all tables
export const achievementTables = {
  tasks,
  user_task_progress,
  user_points,
  point_transactions,
  task_completions,
  data_sources,
  scheduled_tasks,
  data_sync_logs,
};
