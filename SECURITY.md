# Security Policy

## Supported versions

IELTS WordFlow is a small web application under active development. Security fixes are made on the latest `main` branch; older commits and third-party forks are not maintained releases.

## Public repository security setup

After making the repository public, a repository administrator must immediately enable **Private vulnerability reporting** under **Settings → Security → Code security and analysis**. Confirm that **Report a vulnerability** is available in the repository's **Security** tab and opens a private GitHub Security Advisory. Complete and verify this setup before announcing or publishing a release, sharing the repository broadly, or accepting external traffic; do not substitute a public issue or personal email address.

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public issue, discussion, or pull request. Use this repository's **Security** tab to open a **private vulnerability report** backed by GitHub Security Advisories. This gives maintainers a private place to investigate and coordinate a fix without publishing personal contact information.

Include the affected route or component, reproduction steps, impact, browser and operating-system versions, and a minimal proof of concept when safe. Remove credentials, real learning backups, and other personal data from all evidence.

Maintainers will acknowledge the GitHub advisory, assess severity and scope, and post updates in that private thread. A fix and public advisory will be coordinated when the issue is confirmed. Please allow reasonable time for remediation before public disclosure.

## Scope notes

The application intentionally stores learning data in the current browser's IndexedDB and provides local JSON export/import. Loss caused by clearing local browser storage is a data-durability limitation, not a security vulnerability. Reports about dependency vulnerabilities, unsafe backup handling, cross-site scripting, service-worker scope, or unintended data transmission are in scope.
