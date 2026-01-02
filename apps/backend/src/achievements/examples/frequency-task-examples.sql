-- Frequency Task Examples with Protocol Filtering
-- This demonstrates how to create frequency tasks for specific protocols

-- Example 1: Panora Protocol - Daily Active Trader (7 consecutive days)
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
    'panora_daily_trader_7d',
    'Panora Daily Trader',
    'Trade on Panora protocol for 7 consecutive days',
    'frequency',
    'time_based',
    '0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c',
    'Panora',
    '{
        "protocol_address": "0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c",
        "protocol_name": "Panora",
        "consecutive_days": 7,
        "min_transactions_per_day": 1,
        "transaction_type": "swap"
    }',
    400,
    3,
    true,
    NOW(),
    NOW()
);

-- Example 2: Decibel Protocol - Active Trader (30 consecutive days)
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
    'decibel_daily_trader_30d',
    'Decibel Active Trader',
    'Trade on Decibel protocol for 30 consecutive days',
    'frequency',
    'time_based',
    '0xdecibel_protocol_address',
    'Decibel',
    '{
        "protocol_name": "Decibel",
        "consecutive_days": 30,
        "min_transactions_per_day": 1,
        "data_source": "api"
    }',
    1000,
    4,
    true,
    NOW(),
    NOW()
);

-- Example 3: Echelon Protocol - High Frequency Trader
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
    'echelon_high_frequency_trader',
    'Echelon High Frequency Trader',
    'Complete at least 5 transactions per day on Echelon for 14 consecutive days',
    'frequency',
    'time_based',
    '0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba',
    'Echelon',
    '{
        "protocol_address": "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba",
        "protocol_name": "Echelon",
        "consecutive_days": 14,
        "min_transactions_per_day": 5,
        "transaction_type": ["borrow", "supply"]
    }',
    800,
    4,
    true,
    NOW(),
    NOW()
);

-- Example 4: Cross-Protocol Frequency (no protocol filter, all protocols)
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
    'cross_protocol_daily_trader_7d',
    'Cross-Protocol Daily Trader',
    'Trade on any protocol for 7 consecutive days',
    'frequency',
    'time_based',
    NULL,
    NULL,
    '{
        "consecutive_days": 7,
        "min_transactions_per_day": 1
    }',
    200,
    2,
    true,
    NOW(),
    NOW()
);
