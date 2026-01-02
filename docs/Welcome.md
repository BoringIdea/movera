# 🌕 Welcome to Movera

**Movera** is the premier trust and reputation infrastructure for the Move ecosystem. Built on the powerful **MoveAS (Move Attestation Service)** protocol, Movera provides a unified platform for users and developers to issue, verify, and utilize on-chain attestations.

While **MoveAS** serves as the underlying technical protocol (similar to how HTTP powers the Web), **Movera** is the network and interface that brings trust to life.

## About MoveAS

The significance of MoveAS lies in its potential to transform how reputation and trust are built and maintained in decentralized ecosystems. As blockchain technology continues to evolve, the need for robust and scalable authentication mechanisms becomes increasingly important. MoveAS meets this need by offering a flexible design that can adapt to a wide range of applications.

By enabling secure and verifiable proofs, MoveAS supports a more transparent and trustworthy on-chain environment, paving the way for more sophisticated and decentralized applications. Whether in DeFi, DAOs, or other Web3 applications, MoveAS can serve as the foundation for reputation systems, incentivizing positive behavior and ensuring accountability across networks.

## Key Features

- **Multi-Chain Support**: Deployed on both Sui and Aptos blockchains
- **Dual Storage Options**: Choose between on-chain and off-chain storage (Walrus) for optimal cost and scalability
- **Privacy Protection**: Seal encryption integration for sensitive attestation data (Sui only)
- **Schema-Based**: Flexible schema system for defining attestation data structures
- **Resolver Pattern**: Custom validation logic for access control
- **TypeScript SDK**: Comprehensive SDK for easy integration

## What is an Attestation?

An **attestation** is a cryptographically signed statement that verifies a specific piece of information about an entity. In MoveAS, attestations can represent:

- **Identity Verification**: Proof of identity, credentials, or certifications
- **Behavior Records**: Tracked actions, achievements, or reputation scores
- **Relationships**: Connections between entities, endorsements, or references
- **Metadata**: Additional information linked to on-chain or off-chain resources

Attestations are created by **attestors** (issuers) and assigned to **recipients** (subjects). They include:

- **Schema**: Defines the structure and types of data in the attestation
- **Data**: The actual information being attested (on-chain or off-chain)
- **Metadata**: Name, description, URL, and other optional fields
- **Access Control**: Revocation status, expiration time, and resolver rules

## Why MoveAS?

### Traditional System Limitations

Traditional attestation systems often face several challenges:

1. **Centralization**: Single points of failure and control
2. **Lack of Interoperability**: Closed systems that don't communicate
3. **Privacy Concerns**: All data stored in plaintext
4. **High Costs**: Expensive on-chain storage for large datasets
5. **Limited Flexibility**: Rigid schemas and access control

### How MoveAS Solves These Problems

1. **Decentralization**: Built on blockchain, eliminating single points of failure
2. **Multi-Chain**: Works across Sui and Aptos for broader reach
3. **Privacy-First**: Optional Seal encryption for sensitive data
4. **Cost-Efficient**: Off-chain storage via Walrus for large datasets
5. **Flexible Design**: Custom schemas, resolvers, and access patterns

## Use Cases

MoveAS can be used in various scenarios:

- **Digital Credentials**: Issue and verify educational certificates, professional licenses
- **Reputation Systems**: Build trust scores based on verified interactions
- **Identity Management**: Create self-sovereign identity solutions
- **Supply Chain**: Track provenance and authenticity of products
- **Social Networks**: Verify connections and endorsements
- **DAO Governance**: Track contributions and voting records
- **DeFi**: KYC/AML compliance and credit scoring

## Getting Started

Ready to start using MoveAS? Check out the following resources:

1. **[Quickstart Guide](./Getting-Started/Quickstart.md)**: Get up and running in minutes
2. **[Core Concepts](./Basics/Core-Concepts.md)**: Understand the fundamental concepts
3. **[Architecture](./Basics/Architecture.md)**: Learn about the system design
4. **[SDK Documentation](./SDK)**: Integrate MoveAS into your application
5. **[Contracts Documentation](./Contracts)**: Deep dive into smart contracts

## Resources

- **GitHub**: [Movera Repository](https://github.com/BoringIdea/movera)
- **SDK**: [@movera/sdk](https://www.npmjs.com/package/@movera/sdk) on npm
- **Explorer**: [Movera Explorer](https://www.moveapp.vercel.app)

## Contributing

We welcome contributions! Please see the [CONTRIBUTING.md](https://github.com/BoringIdea/movera/blob/main/CONTRIBUTING.md) file in the repository for guidelines.

## License

This project is licensed under the Business Source License 1.1. See the [LICENSE](https://github.com/BoringIdea/movera/blob/main/LICENSE) file for details.

---

**Next**: [Concepts](./Concepts.md) →

