-- Achievement System Database Schema

-- 1. Tasks Definition Table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    protocol_address VARCHAR(66),
    protocol_name VARCHAR(100),
    conditions JSONB NOT NULL,
    reward_points INTEGER NOT NULL DEFAULT 0,
    max_rewards INTEGER DEFAULT 1,
    difficulty_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. User Task Progress Table
CREATE TABLE IF NOT EXISTS user_task_progress (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(66) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    task_id INTEGER REFERENCES tasks(id),
    current_progress INTEGER DEFAULT 0,
    target_progress INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMP,
    progress_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_address, chain, task_id)
);

-- 3. User Points Table
CREATE TABLE IF NOT EXISTS user_points (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(66) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    protocol_address VARCHAR(66),
    protocol_name VARCHAR(100),
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    claimed_points INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_address, chain, protocol_address)
);

-- 4. Point Transactions Table
CREATE TABLE IF NOT EXISTS point_transactions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(66) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    task_id INTEGER REFERENCES tasks(id),
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Task Completions Table
CREATE TABLE IF NOT EXISTS task_completions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(66) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    task_id INTEGER REFERENCES tasks(id),
    completion_count INTEGER DEFAULT 1,
    first_completed_at TIMESTAMP NOT NULL,
    last_completed_at TIMESTAMP NOT NULL,
    completion_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Data Sources Configuration Table
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    chain VARCHAR(20) NOT NULL,
    protocol_address VARCHAR(66),
    protocol_name VARCHAR(100),
    api_endpoint VARCHAR(500),
    api_auth_type VARCHAR(50),
    api_auth_config JSONB,
    data_mapping JSONB,
    update_frequency INTEGER DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Scheduled Tasks Configuration Table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_executed TIMESTAMP,
    next_execution TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Data Sync Logs Table
CREATE TABLE IF NOT EXISTS data_sync_logs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(id),
    user_address VARCHAR(66),
    chain VARCHAR(20),
    sync_type VARCHAR(50),
    sync_status VARCHAR(20),
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    sync_duration INTEGER,
    error_message TEXT,
    sync_data JSONB,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_task_progress_user_chain ON user_task_progress(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_user_task_progress_task_id ON user_task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_chain ON user_points(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_user_points_protocol ON user_points(protocol_address);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_chain ON point_transactions(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_chain ON task_completions(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_data_sources_chain ON data_sources(chain);
CREATE INDEX IF NOT EXISTS idx_data_sync_logs_source_id ON data_sync_logs(source_id);

-- Insert sample tasks
INSERT INTO tasks (task_code, name, description, category, task_type, protocol_address, protocol_name, conditions, reward_points, difficulty_level) VALUES
('panora_swap_200_apt', 'Panora Big Trader', 'Complete swap operations with total volume greater than 200 APT on Panora protocol', 'volume', 'milestone', '0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c', 'Panora', '{"protocol_address": "0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c", "transaction_type": "swap", "total_volume_apt": 200, "data_source": "database"}', 300, 2),
('decibel_trade_1000_usd', 'Decibel 1K Trader', 'Complete trading volume greater than 1000 USD on Decibel protocol', 'volume', 'milestone', '0xdecibel_protocol_address', 'Decibel', '{"protocol_name": "Decibel", "transaction_type": "trade", "total_volume_usd": 1000, "data_source": "api"}', 500, 3),
('panora_first_swap', 'Panora First Swap', 'Complete your first swap operation on Panora protocol', 'activity', 'milestone', '0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c', 'Panora', '{"protocol_address": "0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c", "transaction_type": "swap", "transaction_count": 1, "data_source": "database"}', 100, 1);

-- Insert data source configurations
INSERT INTO data_sources (source_name, source_type, chain, protocol_address, protocol_name, api_endpoint, api_auth_type, api_auth_config, data_mapping, update_frequency) VALUES
('aptos_transactions_db', 'database', 'aptos', NULL, NULL, NULL, NULL, NULL, '{"transaction_table": "user_transactions", "fields": {"tx_hash": "tx_hash", "user_address": "user_address", "protocol_address": "protocol_address", "protocol_name": "protocol_name", "amount": "amount", "timestamp": "timestamp", "operation_type": "operation_type"}}', 300),
('decibel_api', 'api', 'aptos', '0xdecibel_protocol_address', 'Decibel', 'https://api.netna.aptoslabs.com/decibel/api/v1/user/transactions', 'api_key', '{"api_key": "${DECIBEL_API_KEY}", "header_name": "Authorization"}', '{"user_param": "user_address", "response_fields": {"tx_hash": "tx_hash", "amount": "amount", "timestamp": "timestamp", "operation_type": "operation_type", "protocol_name": "protocol_name"}}', 600);

-- Insert scheduled task configurations
INSERT INTO scheduled_tasks (task_name, task_type, cron_expression, is_active, config) VALUES
('achievement_check_daily', 'achievement_check', '0 2 * * *', true, '{"batch_size": 100, "parallel_workers": 5, "data_sources": ["database", "api"], "chains": ["aptos", "sui", "movement"], "timeout": 3600000}'),
('data_sync_hourly', 'data_sync', '0 * * * *', true, '{"sync_type": "incremental", "retention_days": 90, "error_retry_count": 3, "batch_size": 50}'),
('cleanup_weekly', 'cleanup', '0 3 * * 0', true, '{"cleanup_logs": true, "log_retention_days": 30, "cleanup_temp_data": true, "vacuum_database": true}');