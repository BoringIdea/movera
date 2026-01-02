-- Achievement System Database Drop Script
-- This script removes all tables related to the achievement system
-- WARNING: This will permanently delete all achievement data!

-- Drop achievement system tables in reverse dependency order
-- (Drop dependent tables first, then parent tables)

-- 1. Drop data sync logs table (depends on data_sources)
DROP TABLE IF EXISTS data_sync_logs CASCADE;

-- 2. Drop point transactions table (depends on tasks)
DROP TABLE IF EXISTS point_transactions CASCADE;

-- 3. Drop task completions table (depends on tasks)
DROP TABLE IF EXISTS task_completions CASCADE;

-- 4. Drop user task progress table (depends on tasks)
DROP TABLE IF EXISTS user_task_progress CASCADE;

-- 5. Drop user points table (no dependencies)
DROP TABLE IF EXISTS user_points CASCADE;

-- 6. Drop data sources configuration table (no dependencies)
DROP TABLE IF EXISTS data_sources CASCADE;

-- 7. Drop scheduled tasks configuration table (no dependencies)
DROP TABLE IF EXISTS scheduled_tasks CASCADE;

-- 8. Drop tasks definition table (parent table, no dependencies)
DROP TABLE IF EXISTS tasks CASCADE;

-- Drop all related indexes (they should be automatically dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_user_task_progress_user_chain;
DROP INDEX IF EXISTS idx_user_task_progress_task_id;
DROP INDEX IF EXISTS idx_user_points_user_chain;
DROP INDEX IF EXISTS idx_user_points_protocol;
DROP INDEX IF EXISTS idx_point_transactions_user_chain;
DROP INDEX IF EXISTS idx_task_completions_user_chain;
DROP INDEX IF EXISTS idx_data_sources_chain;
DROP INDEX IF EXISTS idx_data_sync_logs_source_id;

-- Drop sequences (if they exist and are not automatically dropped)
DROP SEQUENCE IF EXISTS tasks_id_seq CASCADE;
DROP SEQUENCE IF EXISTS user_task_progress_id_seq CASCADE;
DROP SEQUENCE IF EXISTS user_points_id_seq CASCADE;
DROP SEQUENCE IF EXISTS point_transactions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS task_completions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS data_sources_id_seq CASCADE;
DROP SEQUENCE IF EXISTS scheduled_tasks_id_seq CASCADE;
DROP SEQUENCE IF EXISTS data_sync_logs_id_seq CASCADE;

-- Verification queries (commented out - uncomment to verify tables are dropped)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%task%' OR table_name LIKE '%point%' OR table_name LIKE '%data_sync%';
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('tasks', 'user_task_progress', 'user_points', 'point_transactions', 'task_completions', 'data_sources', 'scheduled_tasks', 'data_sync_logs');

-- Success message
SELECT 'Achievement system tables have been successfully dropped!' as status;
