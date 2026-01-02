# Movera (powered by MoveAS)

**Movera** is the trust and reputation layer for the Move ecosystem, built on top of the **MoveAS (Move Attestation Service)** protocol. This repository houses the complete platform ecosystem, including the core protocol contracts, SDKs, and the Movera application.

## Overview

- **Applications**: A Next.js frontend for dashboards and account management, and a NestJS backend providing API endpoints, account orchestration, and background jobs.
- **Smart Contracts**: Move packages for Aptos and Sui that implement account abstraction primitives and supporting utilities.
- **SDK**: TypeScript helpers for integrating MoveAS features into external products.

## Repository Layout

- `apps/frontend`: Next.js interface, deployed to Vercel.
- `apps/backend`: NestJS API service, deployed to DigitalOcean Apps.
- `packages/contracts`: Move packages (Aptos/Sui) with scripts and tests.
- `packages/sdk`: TypeScript/JavaScript SDK distributed on npm.
- `tsconfig.base.json`: Shared TypeScript configuration for all workspaces.

## Prerequisites

- Node.js 20+
- Yarn 1 (classic) with workspaces enabled
- Docker (for local databases) if running backend integrations
- Rust toolchain and Move CLI (for contract compilation)

Ensure you have access to Aptos and Sui testnet credentials when exercising blockchain workflows.

## First-Time Setup

Install all dependencies from the monorepo root:

```bash
yarn install
```

Generate environment files as needed (examples are provided in each workspace):

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
```

## Common Tasks

```bash
# Start the frontend on http://localhost:3000
yarn workspace movera-website dev

# Start the backend with live reload
yarn workspace movera-backend start:dev

# Run smart contract tests (Move CLI)
yarn workspace movera-contracts test

# Run SDK unit tests
yarn workspace movera-sdk test

# Build every workspace
yarn build
```

## Testing and Quality

- Frontend: `yarn workspace movera-website test` runs Playwright/UI tests (coming soon).
- Backend: `yarn workspace movera-backend test` executes Jest unit tests; `test:e2e` covers API flows.
- Contracts: The Move CLI tests under `packages/contracts/*/tests` validate on-chain logic.
- SDK: Jest test suites validate codec and integration helpers.

We encourage adding coverage reports whenever new features land. Continuous integration will run lint and test jobs for pull requests.

## Releasing

1. Update smart contract versions and publish Move packages to the appropriate registries.
2. Publish the SDK via `yarn workspace movera-sdk publish`.
3. Tag the repository using `git tag vX.Y.Z`.
4. Draft release notes highlighting contract migrations, backend migrations, and UI changes.

Deployment pipelines are orchestrated per workspace; see `apps/frontend/README.md`, `apps/backend/README.md`, and Move package documentation for environment-specific steps.

## Contributing

We welcome contributions! Please review `CONTRIBUTING.md` for coding standards, branching guidance, and pull request expectations before submitting changes.

## Security

Security disclosures should follow the process outlined in `SECURITY.md`. The smart contracts are currently **unaudited**; use at your own risk.

## License

This repository is distributed under the Business Source License 1.1. Non-production use is permitted, and on `2029-01-01` (or earlier subject to the license terms) the code will transition to Apache License 2.0. See `LICENSE` for the full text.

