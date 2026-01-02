-- Sample Tasks Insert Script
-- Insert Panora and Decibel protocol tasks based on design document

-- 1. Panora Protocol Task: Get data from database transactions, complete swap with total volume > 200 APT
INSERT INTO tasks (
    task_code, 
    name, 
    description, 
    category, 
    task_type, 
    protocol_address, 
    protocol_name, 
    conditions, 
    reward_points, 
    difficulty_level,
    is_active,
    created_at,
    updated_at
) VALUES (
    'panora_swap_200_apt',
    'Panora Big Trader',
    'Complete swap operations with total volume greater than 200 APT on Panora protocol',
    'volume',
    'milestone',
    '0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c',
    'Panora',
    '{
        "protocol_address": "0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c",
        "transaction_type": "swap",
        "total_volume_apt": 200,
        "data_source": "database",
        "min_interactions": 1
    }',
    300,
    2,
    true,
    NOW(),
    NOW()
);

-- 2. Decibel Protocol Task: Get data from API, complete trading volume > 1000 USD
INSERT INTO tasks (
    task_code, 
    name, 
    description, 
    category, 
    task_type, 
    protocol_address, 
    protocol_name, 
    conditions, 
    reward_points, 
    difficulty_level,
    is_active,
    created_at,
    updated_at
) VALUES (
    'decibel_trade_1000_usd',
    'Decibel 1K Trader',
    'Complete trading volume greater than 1000 USD on Decibel protocol',
    'volume',
    'milestone',
    '0xdecibel_protocol_address',
    'Decibel',
    '{
        "protocol_name": "Decibel",
        "transaction_type": "trade",
        "total_volume_usd": 1000,
        "data_source": "api",
        "min_interactions": 1
    }',
    500,
    3,
    true,
    NOW(),
    NOW()
);

-- 3. Data Source Configuration: Database data source
INSERT INTO data_sources (
    source_name,
    source_type,
    chain,
    protocol_address,
    protocol_name,
    api_endpoint,
    api_auth_type,
    api_auth_config,
    data_mapping,
    update_frequency,
    is_active,
    created_at,
    updated_at
) VALUES (
    'aptos_transactions_db',
    'database',
    'aptos',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{
        "transaction_table": "user_transactions",
        "fields": {
            "tx_hash": "tx_hash",
            "user_address": "user_address",
            "protocol_address": "protocol_address",
            "protocol_name": "protocol_name",
            "amount": "amount",
            "timestamp": "timestamp",
            "operation_type": "operation_type",
            "token_symbol": "token_symbol",
            "success": "success"
        }
    }',
    300,
    true,
    NOW(),
    NOW()
);

-- 4. Data Source Configuration: Decibel API data source
INSERT INTO data_sources (
    source_name,
    source_type,
    chain,
    protocol_address,
    protocol_name,
    api_endpoint,
    api_auth_type,
    api_auth_config,
    data_mapping,
    update_frequency,
    is_active,
    created_at,
    updated_at
) VALUES (
    'decibel_api',
    'api',
    'aptos',
    '0xdecibel_protocol_address',
    'Decibel',
    'https://api.netna.aptoslabs.com/decibel/api/v1/user/transactions',
    'api_key',
    '{
        "api_key": "${DECIBEL_API_KEY}",
        "header_name": "Authorization"
    }',
    '{
        "user_param": "user_address",
        "response_fields": {
            "tx_hash": "tx_hash",
            "amount": "amount",
            "timestamp": "timestamp",
            "operation_type": "operation_type",
            "protocol_name": "protocol_name",
            "token_symbol": "token_symbol",
            "success": "success"
        }
    }',
    600,
    true,
    NOW(),
    NOW()
);

-- 5. Scheduled Task Configuration: Achievement check task
INSERT INTO scheduled_tasks (
    task_name,
    task_type,
    cron_expression,
    is_active,
    config,
    created_at,
    updated_at
) VALUES (
    'achievement_check_daily',
    'achievement_check',
    '0 2 * * *',
    true,
    '{
        "batch_size": 100,
        "parallel_workers": 5,
        "data_sources": ["database", "api"],
        "chains": ["aptos", "sui", "movement"],
        "timeout": 3600000
    }',
    NOW(),
    NOW()
);

-- 6. Scheduled Task Configuration: Data sync task
INSERT INTO scheduled_tasks (
    task_name,
    task_type,
    cron_expression,
    is_active,
    config,
    created_at,
    updated_at
) VALUES (
    'data_sync_hourly',
    'data_sync',
    '0 * * * *',
    true,
    '{
        "sync_type": "incremental",
        "retention_days": 90,
        "error_retry_count": 3,
        "batch_size": 50
    }',
    NOW(),
    NOW()
);

-- 7. Scheduled Task Configuration: Cleanup task
INSERT INTO scheduled_tasks (
    task_name,
    task_type,
    cron_expression,
    is_active,
    config,
    created_at,
    updated_at
) VALUES (
    'cleanup_weekly',
    'cleanup',
    '0 3 * * 0',
    true,
    '{
        "cleanup_logs": true,
        "log_retention_days": 30,
        "cleanup_temp_data": true,
        "vacuum_database": true
    }',
    NOW(),
    NOW()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_task_progress_user_chain ON user_task_progress(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_user_task_progress_task_id ON user_task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_chain ON user_points(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_chain ON point_transactions(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_chain ON task_completions(user_address, chain);
CREATE INDEX IF NOT EXISTS idx_data_sources_chain ON data_sources(chain);
CREATE INDEX IF NOT EXISTS idx_data_sync_logs_source_id ON data_sync_logs(source_id);

-- 9. Verify inserted data
SELECT 'Tasks' as table_name, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'Data Sources' as table_name, COUNT(*) as count FROM data_sources
UNION ALL
SELECT 'Scheduled Tasks' as table_name, COUNT(*) as count FROM scheduled_tasks;

-- 10. View inserted sample tasks
SELECT 
    task_code,
    name,
    protocol_name,
    reward_points,
    difficulty_level,
    is_active
FROM tasks 
WHERE task_code IN ('panora_swap_200_apt', 'decibel_trade_1000_usd');