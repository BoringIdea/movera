# 🍪 Architecture

This document describes the system architecture of Movera.

## Overview

Movera is built as a modular, multi-chain platform for attestations, powered by the core MoveAS protocol. The architecture consists of:

1. **Smart Contracts**: Move-based contracts deployed on Sui and Aptos
2. **SDK**: TypeScript SDK for client integration
3. **Backend API**: NestJS backend for indexing and querying
4. **Frontend Explorer**: Next.js web interface
5. **Storage Layer**: Walrus for off-chain data storage
6. **Privacy Layer**: Seal for encryption

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Applications                  │
│  (Web Apps, Mobile Apps, Backend Services, etc.)        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ SDK (TypeScript)
                     │
┌────────────────────┴────────────────────────────────────┐
│                  Movera Platform                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Frontend   │  │    Backend   │  │      SDK     │   │
│  │  (Next.js)   │  │   (NestJS)   │  │ (TypeScript) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │           │
│         └─────────────────┴─────────────────┘           │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
┌────────▼───────┐                  ┌─────────▼─────────┐
│   Sui Chain    │                  │   Aptos Chain     │
│                │                  │                   │
│  ┌──────────┐  │                  │  ┌──────────┐     │
│  │  SAS     │  │                  │  │   AAS    │     │
│  │Contracts │  │                  │  │Contracts │     │
│  └────┬─────┘  │                  │  └────┬─────┘     │
│       │        │                  │       │           │
│       └────────┼──────────────────┴───────┘           │
│                │                                      │
│  ┌──────────┐  │                                      │
│  │ Registry │  │                                      │
│  └──────────┘  │                                      │
└────────────────┘                                      │
                                                        │
┌───────────────────────────────────────────────────────┘
│              External Services                        │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Walrus  │  │   Seal   │  │ Database │             │
│  │ Storage  │  │ Key Svr  │  │  (PG)    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└───────────────────────────────────────────────────────┘
```

## Component Details

### Smart Contracts

**Location**: `packages/contracts/`

**Sui (SAS)**:
- `sas.move`: Main entry point
- `attestation.move`: Attestation data structures
- `schema.move`: Schema management
- `seal_access.move`: Seal access control
- `attestation_registry.move`: Attestation tracking
- `schema_registry.move`: Schema tracking

**Aptos (AAS)**:
- `aas.move`: Main entry point
- `attestation.move`: Attestation data structures
- `schema.move`: Schema management
- `resolver_dispatcher.move`: Resolver pattern

### SDK

**Location**: `packages/sdk/`

**Components**:
- `Sas`: Sui attestation service client
- `Aas`: Aptos attestation service client
- `Codec`: Schema-based encoding/decoding
- `WalrusClient`: Walrus storage integration
- `SealWrapper`: Seal encryption integration

### Backend API

**Location**: `apps/backend/`

**Components**:
- **Indexers**: Listen to blockchain events
- **APIs**: REST endpoints for querying
- **Database**: PostgreSQL for indexing
- **Services**: Business logic for attestations

**Key Features**:
- Event listening for new attestations
- Schema and attestation indexing
- Query APIs with filtering
- Caching for performance

### Frontend Explorer

**Location**: `apps/frontend/`

**Components**:
- **Pages**: Schema and attestation views
- **Components**: Reusable UI components
- **API Integration**: Backend API clients
- **Wallet Integration**: Sui and Aptos wallet support

**Key Features**:
- Browse schemas and attestations
- Create new attestations
- View attestation details
- Decrypt encrypted data

## Data Flow

### Creating an Attestation

1. **Client** encodes data using Codec
2. **Client** optionally encrypts data (Seal)
3. **Client** optionally uploads to Walrus (off-chain)
4. **Client** creates transaction via SDK
5. **SDK** submits transaction to blockchain
6. **Contract** emits `AttestationCreated` event
7. **Backend** indexes attestation from event
8. **Frontend** displays in explorer

### Retrieving an Attestation

1. **Client** queries backend API or blockchain directly
2. **Backend** returns attestation metadata
3. **Client** retrieves data:
   - On-chain: Read from object
   - Off-chain: Download from Walrus
4. **Client** optionally decrypts (Seal)
5. **Client** decodes data using Codec
6. **Client** verifies data integrity (hash)

## Storage Architecture

### On-Chain Storage

```
Attestation Object (Sui)
├── Metadata (attestor, recipient, timestamps)
├── Schema reference
└── Data (vector<u8>) ← Stored directly
```

### Off-Chain Storage

```
Attestation Object (Sui)
├── Metadata (attestor, recipient, timestamps)
├── Schema reference
├── Walrus Sui Object ID
├── Walrus Blob ID
├── Data Hash (Blake2b-256)
└── Encryption metadata (if encrypted)

Walrus Storage
└── Blob Data ← Actual data stored here
```

## Privacy Architecture

### Seal Integration

```
┌─────────────┐
│  Client     │
│  Encrypt    │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
┌──────▼──────┐    ┌──────▼──────┐
│   Seal      │    │   Walrus    │
│   Encrypt   │    │   Upload    │
└──────┬──────┘    └──────┬──────┘
       │                  │
       └────────┬─────────┘
                │
       ┌────────▼─────────┐
       │  Create Attest.  │
       │  On-Chain        │
       └────────┬─────────┘
                │
       ┌────────▼─────────┐
       │  Seal Key        │
       │  Servers         │
       └──────────────────┘
```

**Decryption Flow**:
1. Client creates SessionKey
2. Client builds `seal_approve` transaction
3. Seal key servers verify on-chain policy
4. Key servers return decryption keys
5. Client decrypts data
6. Client verifies hash

## Security Architecture

### Access Control Layers

1. **Contract Level**: Move contracts enforce rules
2. **Object Ownership**: Sui object ownership model
3. **Resolver Validation**: Custom validation logic
4. **Seal Access Control**: On-chain access policies

### Data Integrity

- **On-Chain**: Direct verification on blockchain
- **Off-Chain**: Blake2b-256 hash verification
- **Encrypted**: Hash of original data before encryption

## Scalability

### Horizontal Scaling

- **Backend**: Stateless API servers
- **Database**: Read replicas for queries
- **Indexers**: Multiple indexer instances

### Vertical Scaling

- **Caching**: Redis for frequently accessed data
- **CDN**: Static asset delivery
- **Database Optimization**: Indexing and query optimization

## Future Architecture Improvements

- **Cross-Chain Bridge**: Verify attestations across chains
- **Distributed Storage**: Multiple storage backends
- **Layer 2 Support**: Lower costs for high-volume use cases
- **IPFS Integration**: Additional decentralized storage option

---

**Next**: [Contracts](./Contracts.md) →

