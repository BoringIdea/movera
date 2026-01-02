# 🍏 Concepts

This document explains the core concepts and terminology used in the Movera platform and the underlying MoveAS protocol.

## Core Concepts

### Attestation

An **attestation** is a cryptographically signed statement that verifies a specific piece of information about an entity. In Movera, attestations are first-class objects that can be stored on-chain or off-chain.

**Key Properties**:
- **Attestor**: The entity creating and signing the attestation
- **Recipient**: The entity about whom the attestation is made
- **Schema**: Defines the structure and types of data in the attestation
- **Data**: The actual information being attested
- **Metadata**: Name, description, URL, and other optional fields
- **Status**: Active, expired, or revoked

### Schema

A **schema** defines the structure and data types for attestations. It acts as a template that ensures consistency across attestations of the same type.

**Schema Format**:
```
field1: type1, field2: type2, field3: type3
```

**Supported Types**:
- Integer types: `u8`, `u16`, `u32`, `u64`, `u128`, `u256`
- Boolean: `bool`
- String: `string` or `String`
- Address: `address` or `Address`
- Vectors: `Vector<type>`

**Example**:
```
name: string, age: u64, email: string, verified: bool
```

### Storage Types

Movera supports two storage mechanisms:

#### On-Chain Storage

- **Definition**: Data stored directly on the blockchain
- **Use Case**: Small data, high transparency requirements
- **Advantages**: Fully transparent, verifiable, immutable
- **Disadvantages**: Higher gas costs, limited size

#### Off-Chain Storage (Walrus)

- **Definition**: Data stored in Walrus decentralized storage, with metadata on-chain
- **Use Case**: Large data, cost optimization
- **Advantages**: Lower costs, no size limits
- **Disadvantages**: Requires additional infrastructure
- **Integrity**: Blake2b-256 hash stored on-chain for verification

### Encryption (Seal)

For sensitive data, Movera integrates with Seal to provide end-to-end encryption:

- **Pattern**: Private Data pattern (only recipient can decrypt)
- **Key ID**: `[package_id][attestor][nonce]`
- **Access Control**: On-chain policy enforced via `seal_approve` function
- **Key Servers**: Decentralized key servers for threshold decryption

**Flow**:
1. Generate random nonce
2. Compute Seal key ID: `[attestor][nonce]`
3. Encrypt data using Seal
4. Store encrypted data in Walrus
5. Store hash of original data on-chain
6. Recipient can decrypt with on-chain authorization

### Resolver Pattern

The **resolver pattern** allows custom validation logic before attestation creation or revocation:

1. **Resolver Module**: Custom Move module implementing validation rules
2. **Resolver Address**: Address of the resolver module
3. **Validation Rules**: Logic that approves or rejects requests

**Use Cases**:
- Whitelist/blacklist validation
- KYC/AML checks
- Multi-signature approval
- Time-based restrictions

### Registry

**Registries** are centralized storage for tracking schemas and attestations:

- **Schema Registry**: Tracks all registered schemas
- **Attestation Registry**: Tracks all attestations and their status
- **Versioning**: Supports versioned registries for upgrades

### Codec

The **Codec** class provides type-safe encoding and decoding of attestation data:

- **Encoding**: Converts JavaScript objects to BCS-encoded bytes
- **Decoding**: Converts BCS-encoded bytes back to JavaScript objects
- **Type Safety**: Validates data against schema definition
- **Error Handling**: Detailed error messages for validation failures

## Terminology

### Attestor

The entity that creates and signs an attestation. The attestor is responsible for the accuracy of the attestation data.

### Recipient

The entity about whom an attestation is made. The recipient receives ownership of the attestation object (in Sui) or is referenced in the attestation data.

### Reference Attestation

An optional reference to another attestation, creating a chain or relationship between attestations.

### Revokable

A boolean flag indicating whether an attestation can be revoked by the schema creator after issuance.

### Expiration Time

A timestamp indicating when an attestation expires. Expired attestations are still valid but may be considered stale by applications.

### Revocation Time

A timestamp indicating when an attestation was revoked. Once revoked, an attestation cannot be reactivated.

## Data Flow

### Creating an Attestation

1. **Define Schema**: Create a schema definition
2. **Register Schema**: Register schema on-chain
3. **Encode Data**: Use Codec to encode data according to schema
4. **Create Attestation**: Call `attest()` or `attest_off_chain()` function
5. **Store Data**: Data stored on-chain or off-chain (Walrus)
6. **Emit Event**: `AttestationCreated` event emitted

### Retrieving an Attestation

1. **Query Registry**: Look up attestation in registry
2. **Fetch Metadata**: Get attestation object from chain
3. **Retrieve Data**: 
   - On-chain: Read directly from object
   - Off-chain: Download from Walrus using blob ID
4. **Decode Data**: Use Codec to decode data
5. **Verify Integrity**: Check hash matches (for off-chain)

### Decrypting Encrypted Data

1. **Check Access**: Verify user is recipient (or has permission)
2. **Create Session Key**: Generate temporary session key
3. **Call seal_approve**: Create transaction bytes for access check
4. **Fetch Keys**: Seal key servers verify and return keys
5. **Decrypt**: Use keys to decrypt data
6. **Verify Hash**: Check decrypted data matches on-chain hash

## Security Considerations

### Access Control

- **Schema Ownership**: Only schema creators can revoke attestations
- **Object Ownership**: In Sui, only object owners can use objects in transactions
- **Seal Access**: Only recipients can authorize Seal decryption
- **Resolver Validation**: Custom logic can enforce additional rules

### Data Integrity

- **On-Chain**: Directly verifiable on blockchain
- **Off-Chain**: Blake2b-256 hash stored on-chain
- **Encrypted**: Hash calculated on original data before encryption

### Best Practices

1. Always validate schema before encoding data
2. Set reasonable expiration times
3. Use encryption for sensitive data
4. Implement proper resolver validation
5. Verify data integrity when retrieving off-chain data

---

**Next**: [Roadmap](./Roadmap.md) →

