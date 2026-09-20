# Release checklist

## Source and privacy

- [ ] `project.private.config.json`, `.env`, provider credentials, user photos, private backups, and deployment archives are ignored and absent from the release.
- [ ] `docs/ASSET_PROVENANCE.md` lists every public image, font, data file, and generated asset.
- [ ] README separates implemented, provider-dependent, console-dependent, and future behavior.

## Verification

- [ ] `npm ci` succeeds from a clean clone.
- [ ] `node --test tests/*.cjs` passes.
- [ ] `npm run build:weapp` passes.
- [ ] WXML/WXSS compilation passes for the canonical native source.
- [ ] `git diff --check` passes.
- [ ] Credential scan returns no real secret.

## Maintainer evidence

- [ ] Changelog entry is written.
- [ ] Version is tagged only after the public clone can run mock mode.
- [ ] Known device, provider, and accuracy limitations are recorded.
- [ ] Any public stars, downloads, issues, or user feedback cited in applications can be verified from a public source.
