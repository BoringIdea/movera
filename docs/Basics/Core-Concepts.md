# 🍳 Core Concepts

This document explains the core concepts and terminology used in the Movera platform.

## Attestation Lifecycle

### 1. Schema Definition

A schema defines the structure of attestation data. It acts as a contract between the attestor and applications consuming the attestation.

**Schema Definition**:
```
field_name: type, field_name2: type2, ...
```

**Example**:
```
name: string, age: u64, email: string, verified: bool
```

### 2. Schema Registration

Schemas must be registered on-chain before creating attestations. Registration returns:
- **Schema ID**: Unique identifier for the schema
- **Admin Capability**: Allows schema creator to revoke attestations (if revokable)

### 3. Attestation Creation

An **attestation** is a cryptographically signed statement that verifies a specific piece of information about an entity. In Movera, attestations are first-class objects that can be stored on-chain or off-chain.

Creating an attestation involves:
1. **Encoding Data**: Using Codec to encode data according to schema
2. **Storage Decision**: Choose on-chain or off-chain storage
3. **Optional Encryption**: Apply Seal encryption for sensitive data
4. **Transaction Submission**: Submit transaction to blockchain

### 4. Attestation Retrieval

Retrieving attestation data:
- **Metadata**: Always on-chain (attestor, recipient, timestamps, etc.)
- **Data**: On-chain or off-chain depending on storage type
- **Verification**: Check hash for off-chain data integrity

### 5. Attestation Revocation

If schema is revokable, schema creator can revoke attestations:
- **Revocation**: Marks attestation as revoked with timestamp
- **Immutable**: Cannot undo revocation once issued
- **Verifiable**: Revocation status visible on-chain

## Data Encoding

Movera supports two storage mechanisms:

### Codec Class

The `Codec` class provides type-safe encoding/decoding:

```typescript
const codec = new Codec('name: string, age: u64');

// Encode
const item = { name: "Alice", age: 30n };
const encoded = codec.encodeToBytes(item); // Uint8Array

// Decode
const decoded = codec.decodeFromBytes(encoded); // { name: "Alice", age: 30n }
```

### Type Validation

Codec validates data types:
- **Automatic Type Normalization**: `string` → `String`, `address` → `Address`
- **BigInt Support**: Handles `u64`, `u128`, `u256` types
- **Vector Support**: Arrays and nested structures
- **Error Messages**: Detailed errors for validation failures

## Storage Strategies

### On-Chain Storage

**When to Use**:
- Small data (< 1KB)
- High transparency requirements
- Direct on-chain verification needed
- Low latency requirements

**Characteristics**:
- Data stored directly in attestation object
- Fully transparent and verifiable
- Higher gas costs
- Limited by block size

### Off-Chain Storage (Walrus)

**When to Use**:
- Large data (> 1KB)
- Cost optimization
- Flexible data formats
- Archive data

**Characteristics**:
- Data stored in Walrus decentralized storage
- Only metadata and hash on-chain
- Lower gas costs
- Unlimited size
- Requires additional retrieval step

**Data Integrity**:
- Blake2b-256 hash stored on-chain
- Verify downloaded data matches hash
- Prevents tampering

## Privacy Protection

For sensitive data, Movera integrates with Seal to provide end-to-end encryption with on-chain access control.

**Private Data Pattern**:
- **Owner**: Recipient of attestation
- **Key ID**: `[attestor][nonce]`
- **Access Control**: Only owner can authorize decryption
- **Threshold**: Configurable key server threshold

**Encryption Flow**:
1. Generate random nonce (16-32 bytes)
2. Compute Seal ID: `[attestor][nonce]`
3. Encrypt data using Seal SDK
4. Store encrypted data in Walrus
5. Store hash of original data on-chain

**Decryption Flow**:
1. Create SessionKey as recipient
2. Build transaction calling `seal_approve`
3. Seal key servers verify on-chain access
4. Return decryption keys
5. Decrypt data using keys
6. Verify hash matches

## Resolver Pattern

Resolvers provide custom validation logic for attestation creation/revocation.

### Resolver Components

1. **Resolver Module**: Move module implementing validation
2. **Resolver Address**: Address of resolver module
3. **Validation Rules**: Logic that approves/rejects requests

### Resolver Flow

**For Attestation**:
1. Call `schema::start_attest()` → returns `Request`
2. Call resolver module's `approve()` function
3. Call `schema::finish_attest()` → validates request
4. Create attestation with resolver

**For Revocation**:
1. Call `schema::start_revoke()` → returns `Request`
2. Call resolver module's `approve()` function
3. Call `schema::finish_revoke()` → validates request
4. Revoke attestation

### Example Resolvers

- **Whitelist**: Only allowlisted addresses can create attestations
- **Blacklist**: Blocklisted addresses cannot create attestations
- **Multi-signature**: Require multiple approvals
- **Time-based**: Restrict attestation creation to specific times

## Registry System

### Schema Registry

Tracks all registered schemas:
- Schema addresses
- Creator addresses
- Creation timestamps
- Version information

### Attestation Registry

Tracks all attestations:
- Attestation addresses
- Schema associations
- Status (active/revoked)
- Timestamps

**Benefits**:
- Centralized queries
- Efficient lookups
- Version management
- Upgrade support

## Error Handling

### Common Errors

**Schema Errors**:
- Invalid schema format
- Unsupported types
- Duplicate field names

**Encoding Errors**:
- Type mismatch
- Missing required fields
- Invalid BigInt values

**Transaction Errors**:
- Insufficient gas
- Invalid parameters
- Access denied

**Storage Errors**:
- Walrus upload failures
- Hash mismatch
- Missing data

### Error Recovery

- **Retry Logic**: Implement retries for network errors
- **Validation**: Validate data before encoding
- **Error Messages**: Provide clear error messages
- **Logging**: Log errors for debugging

## Best Practices

### Schema Design

1. **Use Clear Names**: Descriptive field names
2. **Choose Appropriate Types**: Use smallest sufficient type
3. **Avoid Duplicates**: Don't duplicate information
4. **Document Schemas**: Provide clear documentation

### Data Management

1. **Validate Early**: Validate data before encoding
2. **Handle Errors**: Implement proper error handling
3. **Cache Results**: Cache decoded data when possible
4. **Verify Integrity**: Always verify off-chain data hashes

### Security

1. **Use Encryption**: Encrypt sensitive data
2. **Set Expiration**: Always set expiration times
3. **Implement Resolvers**: Use resolvers for access control
4. **Monitor Revocations**: Check revocation status

### Performance

1. **Choose Storage Wisely**: Use off-chain for large data
2. **Batch Operations**: Batch multiple attestations
3. **Optimize Queries**: Use registries for efficient lookups
4. **Cache Data**: Cache frequently accessed data

---

**Next**: [Architecture](./Architecture.md) →

