-- Inser 
INSERT INTO protocols (address, name, chain, type, module, function_name_list) VALUES
('0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba', 'Echelon', 'aptos', 'lending', 'scripts', 'borrow,supply,borrow_fa'),
('0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a', 'Amnis', 'aptos', 'staking', 'router', 'deposit_and_stake_direct_entry,deposit_and_stake_entry,deposit_direct_entry,deposit_entry,stake_entry'),
('0xeab7ea4d635b6b6add79d5045c4a45d8148d88287b1cfa1c3b6a4b56f46839ed', 'Echo', 'aptos', 'lending', 'router_fa', 'borrow,supply'),
('0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c', 'Panora', 'aptos', 'dex', 'panora_swap', 'router_entry,swap_exact_in_entry'),
('0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c', 'Hyperion', 'aptos', 'dex', 'router_v3', 'swap_batch,swap_batch_coin_directly_deposit_entry,swap_batch_coin_entry,swap_batch_directly_deposit'),
('0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3', 'Aries', 'aptos', 'lending', 'controller', 'deposit,deposit_fa');

INSERT INTO protocols (address, name, chain, type, module, function_name_list) VALUES
('0x1ddda82f0491ef60282a1ae8c4c82908723f945f1f10b809dcf1b5b085f77b92', 'Yield', 'aptos', 'yield', 'gateway', 'deposit_entry,stake_entry,deposit_and_stake_entry'),
('0x2cc52445acc4c5e5817a0ac475976fbef966fedb6e30e7db792e10619c76181f', 'Staking', 'aptos', 'yield', 'zap', 'zap_in_with_pair,zap_in_with_pair_both_coin,zap_in_with_pair_coin,zap_in_with_single,zap_in_with_single_coin');