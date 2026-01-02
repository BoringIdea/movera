-- Volume Task Examples with Protocol Filtering
-- This demonstrates different ways to configure volume tasks

-- Example 1: Protocol-Specific APT Volume (Panora)
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
    is_active
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
        "data_source": "database"
    }',
    300,
    2,
    true
);

-- Example 2: Protocol-Specific USD Volume (Decibel)
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
    is_active
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
        "total_volume_usd": 1000,
        "data_source": "api"
    }',
    500,
    3,
    true
);

-- Example 3: Cross-Protocol APT Volume
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
    is_active
) VALUES (
    'cross_protocol_1000_apt',
    'Cross-Protocol APT Whale',
    'Complete total trading volume of 1000 APT across all protocols',
    'volume',
    'milestone',
    NULL,
    NULL,
    '{
        "total_volume_apt": 1000,
        "data_source": "database"
    }',
    1500,
    4,
    true
);

-- Example 4: Echelon Lending Volume
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
    is_active
) VALUES (
    'echelon_lending_500_apt',
    'Echelon Lending Power User',
    'Complete lending operations with total volume greater than 500 APT on Echelon',
    'volume',
    'milestone',
    '0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba',
    'Echelon',
    '{
        "protocol_address": "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba",
        "transaction_type": ["borrow", "supply"],
        "total_volume_apt": 500,
        "data_source": "database"
    }',
    700,
    3,
    true
);

-- Example 5: Hyperion DEX Volume (Swap specific)
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
    is_active
) VALUES (
    'hyperion_swap_100_apt',
    'Hyperion Swap Enthusiast',
    'Complete swap volume of 100 APT on Hyperion DEX',
    'volume',
    'milestone',
    '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c',
    'Hyperion',
    '{
        "protocol_address": "0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c",
        "transaction_type": "swap",
        "total_volume_apt": 100,
        "data_source": "database"
    }',
    250,
    2,
    true
);

-- Example 6: Protocol-Specific with Multiple Transaction Types
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
    is_active
) VALUES (
    'amnis_staking_300_apt',
    'Amnis Staking Master',
    'Complete staking operations with total volume of 300 APT on Amnis',
    'volume',
    'milestone',
    '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a',
    'Amnis',
    '{
        "protocol_address": "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a",
        "transaction_type": ["deposit_and_stake_entry", "stake_entry"],
        "total_volume_apt": 300,
        "data_source": "database"
    }',
    600,
    3,
    true
);
