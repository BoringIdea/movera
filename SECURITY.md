# Security Policy

## Reporting a Vulnerability

Please report suspected vulnerabilities privately to `lukema95@gmail.com`. Include as much detail as possible (affected components, reproduction steps, potential impact). We aim to acknowledge reports within 3 business days and provide a remediation plan or status update within 10 business days.

If encrypted communication is preferred, request our PGP key in your initial email.

## Disclosure Process

1. The security team triages the report and confirms scope and severity.
2. We coordinate privately on fixes and may ask for additional information.
3. A patch or mitigation is prepared, tested, and released.
4. We publish advisories summarizing the impact, fixes, and credits once users have a reasonable window to upgrade.

Please refrain from publicly disclosing issues until we have issued a fix or agreed on a coordinated disclosure date.

## Smart Contract Status

All Move smart contracts in `packages/contracts` are currently **unaudited**. Treat them as experimental and perform independent reviews before deploying to production environments.

## Dependence on Third-Party Infrastructure

The project integrates with Aptos and Sui networks as well as external wallet providers. Issues originating from those platforms should be reported to their respective maintainers. If a vulnerability involves Movera integration code, please notify us as described above.

