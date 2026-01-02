# Contributing to Movera

Thank you for your interest in improving Movera! This document describes the contribution workflow, coding conventions, and review expectations for this monorepo.

## Code of Conduct

By participating you agree to foster a respectful and inclusive community. Please act professionally in all communications.

## Project Structure

- `apps/frontend`: Next.js application (`movera-website` workspace).
- `apps/backend`: NestJS API service (`movera-backend` workspace).
- `packages/contracts`: Move packages (`movera-contracts` workspace).
- `packages/sdk`: TypeScript SDK (`movera-sdk` workspace).

Each workspace has its own documentation and scripts; consult those READMEs for deeper details.

## Getting Started

1. Fork the repository and create a feature branch off `main`.
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Create environment files as needed:
   ```bash
   cp apps/frontend/.env.example apps/frontend/.env.local
   cp apps/backend/.env.example apps/backend/.env
   ```
4. Run the relevant dev servers or tests before you begin making changes.

## Branching and Commit Guidelines

- Branch naming: `feature/<topic>`, `fix/<issue>`, or `chore/<task>`.
- Keep commits focused. Reference GitHub issues with `#<number>` when applicable.
- Commit message format:
  ```
  type(scope?): short summary

  Optional body with context, motivation, and references.
  ```
  Recommended types include `feat`, `fix`, `chore`, `docs`, `test`, and `refactor`.

## Coding Standards

- Follow existing linting rules (`eslint`, `prettier`, `tsconfig` settings).
- Prefer TypeScript over JavaScript for new code in apps and SDK.
- For Move code, match the formatting of the surrounding module and run `move fmt`.
- Keep API and SDK changes typed and documented.
- Add comments for complex logic. Avoid adding TODO comments without creating a follow-up issue.

## Testing Requirements

- Frontend: `yarn workspace movera-website lint` and `test`.
- Backend: `yarn workspace movera-backend lint`, `test`, and `test:e2e` when API behavior changes.
- Contracts: `yarn workspace movera-contracts test` (Move CLI) after modifying Move sources.
- SDK: `yarn workspace movera-sdk test`.
- Add new unit or integration tests for all features and bug fixes.

## Documentation

- Update relevant README files when behavior or setup changes.
- Document public APIs and environment variables.
- Note any contract migrations or schema updates in the release checklist.

## Pull Request Process

1. Rebase your branch onto the latest `main` before opening a PR.
2. Fill in the PR template (coming soon) with summary, testing evidence, screenshots, and release notes.
3. Ensure CI passes (lint, test, build).
4. Request review from at least one maintainer.
5. Address review feedback promptly; prefer follow-up commits over force pushes to keep history clear.

## After Merge

Maintainers will handle tagging, releases, and deployment. Contributor branches may be deleted after merge.

## Questions

If you need help, open a GitHub discussion or reach out to the maintainers listed in `README.md`. We appreciate your contributions!

