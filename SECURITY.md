# Security Policy

## Supported versions

IELTS WordFlow is a small web application under active development. Security fixes are made on the latest `main` branch; older commits and third-party forks are not maintained releases.

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public issue, discussion, or pull request. Use this repository's **Security** tab to open a **private vulnerability report** backed by GitHub Security Advisories. This gives maintainers a private place to investigate and coordinate a fix without publishing personal contact information.

Include the affected route or component, reproduction steps, impact, browser and operating-system versions, and a minimal proof of concept when safe. Remove credentials, real learning backups, and other personal data from all evidence.

Maintainers will acknowledge the GitHub advisory, assess severity and scope, and post updates in that private thread. A fix and public advisory will be coordinated when the issue is confirmed. Please allow reasonable time for remediation before public disclosure.

## Scope notes

The application intentionally stores learning data in the current browser's IndexedDB and provides local JSON export/import. Loss caused by clearing local browser storage is a data-durability limitation, not a security vulnerability. Reports about dependency vulnerabilities, unsafe backup handling, cross-site scripting, service-worker scope, or unintended data transmission are in scope.
