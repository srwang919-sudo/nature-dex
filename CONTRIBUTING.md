# Contributing to Nature Dex

Thank you for helping improve Nature Dex. The project prioritizes privacy, truthful recognition states, and a local workflow that does not require provider credentials.

## Before opening an issue or pull request

1. Reproduce the problem in mock mode when possible.
2. Do not attach user photographs, private notes, access tokens, or production logs.
3. Explain the expected behavior, actual behavior, steps to reproduce, and whether a provider or device was involved.
4. Add or update a deterministic test for behavior changes.

## Local checks

```bash
npm ci
node --test tests/*.cjs
npm run build:weapp
git diff --check
```

Provider-backed tests require owner-managed configuration and are not required for ordinary contributions.

## Privacy and recognition changes

Any change that uploads, stores, shares, deletes, or derives information from a photo must document consent, ownership checks, retention, failure behavior, and the affected tests. Recognition output must remain a candidate until the user confirms it.
