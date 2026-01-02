# Movera Contracts

Move Attestation Service Smart Contracts - Move language contracts for creating, managing, and verifying attestations on Sui and Aptos blockchains.

## Overview

Movera Contracts provide a comprehensive set of smart contracts for attestation services across multiple Move-based blockchains. The contracts support:

- **Schema Registration**: Define and register data schemas for attestations
- **Attestation Creation**: Issue attestations with flexible storage options
- **Privacy Protection**: Seal encryption integration for sensitive data (Sui only)
- **Decentralized Storage**: Off-chain storage support via Walrus (Sui only)
- **Resolver Pattern**: Custom access control and validation logic
- **Registry Management**: Centralized registries for schemas and attestations

## Supported Chains

| Chain | Status | Features |
|-------|--------|----------|
| [Sui](./sas/README.md) | Testnet ✅ | On-chain storage, Off-chain storage (Walrus), Seal encryption, Resolver pattern |
| [Aptos](./aas/README.md) | Testnet ✅ | On-chain storage, Resolver pattern |

**Note**: Off-chain storage and Seal encryption are currently only available for Sui.

## Sui Attestation Service (SAS)

### Architecture

The Sui Attestation Service is built on Sui's object-centric model and supports dual storage mechanisms:

#### Storage Types

1. **On-Chain Storage** (`STORAGE_TYPE_ON_CHAIN = 0`)
   - Data stored directly on-chain
   - Fully transparent and verifiable
   - Suitable for small data

2. **Off-Chain Storage** (`STORAGE_TYPE_OFF_CHAIN = 1`)
   - Data stored in Walrus decentralized storage
   - Only metadata and hash stored on-chain
   - Supports Seal encryption for privacy protection
   - Suitable for large or sensitive data

### Core Modules

#### 1. `sas::sas`
Main entry point for attestation operations.

**Key Functions**:
- `register_schema()`: Register a new schema
- `register_schema_with_resolver()`: Register schema with resolver for custom validation
- `attest()`: Create on-chain attestation
- `attest_off_chain()`: Create off-chain attestation with Walrus storage
- `attest_with_resolver()`: Create attestation with resolver validation
- `attest_multi()`: Batch create multiple attestations
- `revoke()`: Revoke an attestation
- `revoke_with_resolver()`: Revoke with resolver validation

**Example**:
```move
// Register schema
let admin_cap = sas::register_schema(
    &mut schema_registry,
    schema_bytes,
    name_bytes,
    description_bytes,
    url_bytes,
    true, // revokable
    ctx
);

// Create on-chain attestation
let attestation_id = sas::attest(
    &mut schema_record,
    &mut attestation_registry,
    @0x0, // ref_attestation
    recipient,
    expiration_time,
    data,
    name_bytes,
    description_bytes,
    url_bytes,
    &clock,
    ctx
);

// Create off-chain attestation (with Walrus)
let attestation_id = sas::attest_off_chain(
    &mut schema_record,
    &mut attestation_registry,
    @0x0, // ref_attestation
    recipient,
    expiration_time,
    walrus_sui_object_id, // Walrus Sui Object ID
    walrus_blob_id,       // Walrus Blob ID (base64url as bytes)
    data_hash,            // Blake2b-256 hash of original data
    encrypted,            // Whether data is encrypted
    seal_nonce,           // Option<vector<u8>>: Seal nonce for encrypted data
    seal_policy_id,       // Option<address>: Seal policy ID (optional)
    name_bytes,
    description_bytes,
    url_bytes,
    &clock,
    ctx
);
```

#### 2. `sas::attestation`
Core attestation data structure and operations.

**Struct Fields**:
- `storage_type: u8`: Storage type identifier (0 = ON_CHAIN, 1 = OFF_CHAIN)
- `data: vector<u8>`: On-chain data (used when `storage_type == ON_CHAIN`)
- `walrus_sui_object_id: address`: Walrus Sui Object ID (for OFF_CHAIN)
- `walrus_blob_id: vector<u8>`: Walrus Blob ID as bytes (for OFF_CHAIN)
- `data_hash: vector<u8>`: Blake2b-256 hash of original data (for integrity verification)
- `encrypted: bool`: Whether data is encrypted (for OFF_CHAIN)
- `seal_nonce: Option<vector<u8>>`: Seal encryption nonce (for encrypted OFF_CHAIN)
- `seal_policy_id: Option<address>`: Seal access policy ID (optional)

**Key Functions**:
- `create_attestation_on_chain()`: Create on-chain attestation (internal)
- `create_attestation_off_chain()`: Create off-chain attestation (internal)
- `verify_data_integrity()`: Verify data hash matches stored hash
- `is_encrypted()`: Check if attestation data is encrypted
- `seal_nonce()`: Get Seal nonce for encrypted attestations
- Public view functions: `schema()`, `attestor()`, `recipient()`, `time()`, etc.

**Events**:
- `AttestationCreated`: Emitted when a new attestation is created

#### 3. `sas::seal_access`
Seal access control for encrypted attestations (Private Data pattern).

**Key Functions**:
- `compute_key_id(attestor: address, nonce: vector<u8>): vector<u8>`
  - Computes Seal key ID: `[attestor bytes][nonce bytes]`
  - Must match SDK's `computeSealKeyId` function
  - Full Seal ID: `[package_id][attestor][nonce]`

- `seal_approve(id: vector<u8>, attestation: &Attestation)` (entry)
  - Called by Seal key servers to verify access permissions
  - Access control: Only the owner of the `Attestation` object (recipient) can call
  - Validates that Seal ID matches computed key ID: `[attestor][nonce]`

**Access Control**:
- Only the **recipient** (owner of the Attestation object) can authorize decryption
- Seal key servers verify access by calling `seal_approve` via `dry_run_transaction_block`
- Sui's object ownership ensures only the owner can pass the object in a transaction

**Example**:
```move
// Seal key server verifies access (called via dry_run_transaction_block)
entry public fun seal_approve(
    id: vector<u8>, // Seal ID: [attestor][nonce]
    attestation: &attestation::Attestation // Must be owned by recipient
) {
    assert!(check_policy(id, attestation), ENoAccess);
    // If this succeeds, Seal key server will return decryption keys
}
```

#### 4. `sas::schema`
Schema registration and management.

**Key Functions**:
- `new()`: Create new schema
- `new_with_resolver()`: Create schema with resolver
- `start_attest()`: Start attestation request (resolver pattern)
- `finish_attest()`: Finish attestation request (resolver pattern)
- `start_revoke()`: Start revocation request (resolver pattern)
- `finish_revoke()`: Finish revocation request (resolver pattern)

**Structs**:
- `Schema`: Schema data structure
- `Resolver`: Resolver configuration and rules
- `ResolverBuilder`: Builder for creating resolvers
- `Request`: Attestation/revocation request for resolver validation

#### 5. `sas::attestation_registry`
Centralized registry for all attestations.

**Key Functions**:
- `registry()`: Register an attestation
- `revoke()`: Mark attestation as revoked
- `is_exist()`: Check if attestation exists
- `is_revoked()`: Check if attestation is revoked
- `update_allowed_versions()`: Update registry version

**Structs**:
- `AttestationRegistry`: Main registry object
- `Status`: Attestation status (schema, revoked flag, timestamp)

#### 6. `sas::schema_registry`
Centralized registry for all schemas.

**Key Functions**:
- `register()`: Register a schema
- `is_exist()`: Check if schema exists
- `update_allowed_versions()`: Update registry version

#### 7. `sas::admin`
Administrative capabilities for schema management.

**Key Functions**:
- Schema creators receive `Admin` capability
- Used to revoke attestations (if schema is revokable)

### Resolver Pattern

SAS supports a resolver pattern for custom validation logic:

1. **Create Schema with Resolver**:
```move
let (resolver_builder, admin_cap, schema) = sas::register_schema_with_resolver(
    &mut schema_registry,
    schema_bytes,
    name_bytes,
    description_bytes,
    url_bytes,
    true, // revokable
    ctx
);

// Configure resolver rules and module
// ...
```

2. **Attest with Resolver**:
```move
// Step 1: Start attestation request
let request = schema::start_attest(&schema);

// Step 2: Call resolver module to approve
resolver_module::approve(&schema, request);

// Step 3: Finish attestation
schema::finish_attest(&mut schema, request);
let attestation_id = sas::attest_with_resolver(
    &mut schema,
    &mut attestation_registry,
    // ... other parameters
    request
);
```

3. **Example Resolvers**: See `sas/resolvers/` directory:
   - `blocklist`: Blocklist-based access control
   - `whitelist`: Whitelist-based access control

### Data Integrity Verification

For off-chain storage, data integrity is verified using Blake2b-256 hashes:

```move
// Hash calculation (matches Sui's hash::blake2b256)
let data_hash = hash::blake2b256(&data);

// Verification (in attestation module)
public fun verify_data_integrity(
    self: &Attestation,
    data: vector<u8>
): bool {
    assert!(self.storage_type == STORAGE_TYPE_OFF_CHAIN, 0);
    let computed_hash = hash::blake2b256(&data);
    computed_hash == *&self.data_hash
}
```

### Testing

Run tests:
```bash
cd sas
sui move test
```

Test files:
- `tests/sas_tests.move`: Comprehensive tests for on-chain, off-chain, and encrypted storage

## Aptos Attestation Service (AAS)

### Architecture

The Aptos Attestation Service uses Aptos's account-based model with object support.

### Core Modules

#### 1. `aas::aas`
Main entry point for attestation operations.

**Key Functions**:
- `create_schema()`: Create a new schema
- `create_schema_and_get_schema_address()`: Create schema and return address
- `create_attestation()`: Create a new attestation (on-chain only)
- `create_multi_attestations()`: Batch create multiple attestations
- `revoke_attestation()`: Revoke an attestation

**Example**:
```move
// Create schema
aas::create_schema(
    creator,
    schema_bytes,
    name,
    description,
    url,
    revokable,
    resolver_address
);

// Create attestation
aas::create_attestation(
    attestor,
    recipient,
    schema_address,
    ref_attestation,
    expiration_time,
    revokable,
    data
);
```

#### 2. `aas::attestation`
Core attestation data structure and operations.

**Struct Fields**:
- `schema: address`: Schema address
- `attestor: address`: Attestor address
- `recipient: address`: Recipient address
- `data: vector<u8>`: Attestation data (on-chain only)
- `time: u64`: Creation timestamp
- `expiration_time: u64`: Expiration timestamp
- `revocation_time: u64`: Revocation timestamp
- `revokable: bool`: Whether attestation can be revoked

**Events**:
- `AttestationCreated`: Emitted when a new attestation is created
- `AttestationRevoked`: Emitted when an attestation is revoked

#### 3. `aas::schema`
Schema registration and management.

**Structs**:
- `Schema`: Schema data structure

#### 4. `aas::resolver_dispatcher`
Resolver dispatcher for custom validation logic.

**Key Functions**:
- `on_attest()`: Validate attestation request via resolver
- `on_revoke()`: Validate revocation request via resolver
- `register_dispatchable()`: Register resolver module

**Example Resolver**: See `aas/resolver_example/` directory:
- `schema_resolver.move`: Example resolver implementation

#### 5. `aas::package_manager`
Package manager for contract deployment.

### Testing

Run tests:
```bash
cd aas
aptos move test
```

Test files:
- `tests/aas_tests.move`: Tests for schema and attestation operations

## Contract Deployment

### Sui

1. **Build**:
```bash
cd sas
sui move build
```

2. **Publish**:
```bash
sui client publish --gas-budget 100000000
```

3. **Initialize Registries**:
After publishing, initialize the schema and attestation registries.

### Aptos

1. **Build**:
```bash
cd aas
aptos move build
```

2. **Publish**:
```bash
aptos move publish --named-addresses aas=<your_address>
```

## Versioning

Both Sui and Aptos contracts support versioning through registries:

- **Schema Registry**: Tracks allowed package versions
- **Attestation Registry**: Tracks allowed package versions
- **Upgrade Path**: Update registries to allow new versions while maintaining backward compatibility

## Security Considerations

### Access Control

1. **Schema Ownership**: Only schema creators (via `Admin` cap) can revoke attestations
2. **Object Ownership**: In Sui, only object owners can pass objects in transactions
3. **Seal Access**: Only attestation recipients can authorize Seal decryption
4. **Resolver Pattern**: Custom validation logic can enforce additional rules

### Data Integrity

- **On-Chain**: Data is directly stored on-chain and verifiable
- **Off-Chain**: Blake2b-256 hash stored on-chain for integrity verification
- **Encrypted**: Hash is calculated on original data before encryption

### Best Practices

1. **Schema Design**: Use well-defined schemas with appropriate field types
2. **Revocation**: Set `revokable` flag appropriately for your use case
3. **Expiration**: Always set reasonable expiration times
4. **Resolver Validation**: Use resolvers for complex access control requirements
5. **Privacy**: Use Seal encryption for sensitive attestation data (Sui only)

## Development

### Directory Structure

```
contracts/
├── sas/                    # Sui Attestation Service
│   ├── sources/
│   │   ├── sas.move        # Main entry point
│   │   ├── attestation.move # Attestation core logic
│   │   ├── schema.move     # Schema management
│   │   ├── seal_access.move # Seal access control
│   │   └── ...
│   ├── resolvers/          # Example resolvers
│   │   ├── blocklist.move
│   │   └── whitelist.move
│   └── tests/
│       └── sas_tests.move
├── aas/                    # Aptos Attestation Service
│   ├── sources/
│   │   ├── aas.move        # Main entry point
│   │   ├── attestation.move # Attestation core logic
│   │   ├── schema.move     # Schema management
│   │   └── ...
│   └── tests/
│       └── aas_tests.move
└── README.md               # This file
```

### Dependencies

**Sui**:
- Sui Framework (testnet-v1.57.2)
- Move Stdlib

**Aptos**:
- Aptos Framework (mainnet)
- Aptos Token Framework
- Aptos Stdlib

## References

- [Sui Move Documentation](https://docs.sui.io/build/move)
- [Aptos Move Documentation](https://aptos.dev/move/move-on-aptos/)
- [Seal Documentation](https://seal-docs.wal.app/)
- [Walrus Documentation](https://docs.wal.app/)

## License

See LICENSE file in the repository root.
