# Open-source scope

## Public source

The public repository contains the canonical native WeChat Mini Program entrypoint, the `native/` runtime, provider-neutral contracts, cloud-function source without credentials, mock fixtures, tests, and maintainer documentation.

The repository does not treat `dist/`, the historical Taro experiment under `src/`, or deploy archives as the product's canonical release source.

## Never commit

- API keys, CloudBase environment IDs used for production, private domains, access tokens, and deployment credentials.
- `project.private.config.json`, `.env`, user photographs, personal notes, local backups, private generated images, and account identifiers.
- Generated archives under `cloudfunction-packages/`, build outputs, local test results, or device exports.
- Images, fonts, species references, or model outputs whose license or provenance has not been recorded.

## Repeatable local checks

Run from the repository root:

```bash
git diff --check
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' \
  -e 'sk-[A-Za-z0-9]{20,}' -e 'AKIA[0-9A-Z]{16}' -e 'BEGIN [A-Z ]+ PRIVATE KEY' \
  -e 'DASHSCOPE_API_KEY=[^$<[:space:]]{12,}' -e 'BAIDU_SECRET_KEY=[^$<[:space:]]{12,}' \
  app.js app.json config native cloudfunctions scripts
```

The scan should return no real credential values. Empty variable names in `.env.example` are intentional placeholders.

## Photo and recognition boundary

Photos stay local until the user explicitly accepts the recognition action. Recognition output is a candidate result, not scientific certainty. Unknown, low-confidence, non-biological, unavailable, and failed states remain visible and can be handled manually. The public mock flow never uploads a photo or contacts a provider.

## Asset rule

Every public image, font, data file, and generated asset must be listed in `docs/ASSET_PROVENANCE.md` with its source, license, and allowed use. Assets without a recorded basis are excluded from the public release.
