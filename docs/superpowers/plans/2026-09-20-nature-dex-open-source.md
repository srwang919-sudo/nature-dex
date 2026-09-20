# Nature Dex Open Source Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Nature Dex 整理为可公开、可复现、可持续维护的自然物种识别开源项目，并准备 Codex for Open Source 申请所需证据。

**Architecture:** 保留原生微信小程序作为运行入口，把物种识别抽象为本地 mock 与云函数适配器共享的数据契约。公开源码和维护文档，隔离所有运行时凭据、用户数据、生产配置和未授权素材。

**Tech Stack:** 原生微信小程序、Node.js 云函数、CommonJS 测试脚本、现有 npm/Taro 工具链、GitHub Actions。

**Spec:** `docs/plans/2026-09-20-nature-dex-open-source-design.md`

## Global Constraints

- 不把 API key、云环境 ID、用户照片、个人笔记或私有备份提交到 Git。
- 根目录原生入口和 `native/` 是发布源；历史 `src/`、`dist/` 和 Taro 实验不作为发布入口。
- 真实识别必须在用户明确同意后触发，低可信和未知结果不得伪装为成功。
- 本地 mock 流程不得依赖真实识别供应商、微信云环境或生产配置。
- 所有 README、测试和申请文案只陈述已实现且可由仓库验证的事实。

---

### Task 1: Establish a safe repository baseline

**Files:**
- Create: `.gitignore` additions for private configs, environment files, generated archives, build output, and local artifacts.
- Create: `.env.example` with placeholder variable names only.
- Create: `docs/OPEN_SOURCE_SCOPE.md` describing public/private boundaries and asset provenance requirements.
- Modify: `README.md` to identify the canonical source tree and current limitations.
- Test: repository scan commands recorded in `docs/OPEN_SOURCE_SCOPE.md`.

**Interfaces:**
- Produces a clean repository root that later documentation and CI tasks can validate.

- [ ] **Step 1: Enumerate tracked and candidate-sensitive files**

Run:

```bash
find . -type f -not -path './node_modules/*' -not -path './.git/*' | sort
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!dist/**' '(API[_-]?KEY|SECRET|TOKEN|PRIVATE_KEY|DASHSCOPE|BAIDU_|project\.private|\.env)' .
```

Expected: every hit is classified as documentation, placeholder, or private material before adding files.

- [ ] **Step 2: Add ignore rules and placeholder configuration**

Ignore `project.private.config.json`, `.env`, `.env.*` except `.env.example`, cloud deployment archives, `node_modules/`, `dist/`, local logs, and generated test artifacts. Put only names and non-secret descriptions in `.env.example`.

- [ ] **Step 3: Write the public/private scope document**

Document that public code includes the app, cloud-function source, contracts, tests, mock mode, and deployment instructions; private material includes keys, user photos, cloud IDs, private backups, and unlicensed assets. Include exact commands for a maintainer to repeat the secret scan.

- [ ] **Step 4: Verify the baseline**

Run:

```bash
git diff --check
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!dist/**' '(sk-[A-Za-z0-9]|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]+ PRIVATE KEY|DASHSCOPE_API_KEY=|BAIDU_SECRET_KEY=)' .
```

Expected: no real credential value is found; placeholder names in `.env.example` are allowed.

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.example docs/OPEN_SOURCE_SCOPE.md README.md
git commit -m "chore: establish safe open source baseline"
```

### Task 2: Make local recognition reproducible

**Files:**
- Create: `native/contracts/recognition.js` if the existing contract is not already canonical.
- Create: `native/services/mockRecognition.js`.
- Modify: `native/contracts/services.js` to route development mode through the mock adapter without claiming real recognition.
- Create: `tests/open-source-recognition-contract.cjs`.
- Modify: `README.md` with the exact mock workflow.

**Interfaces:**
- `recognizeObservation(input)` returns `{status:'confirmed'|'candidate'|'unknown'|'unavailable', candidates, confidence, source}`.
- The mock adapter accepts a local fixture identifier and never reads a secret or uploads a photo.

- [ ] **Step 1: Define contract fixtures**

Add fixtures for confirmed candidate, low-confidence candidate, unknown organism, non-biological image, and unavailable provider. Each fixture must include an explicit `source` and must not imply scientific certainty.

- [ ] **Step 2: Write failing contract tests**

Assert that every status has the documented shape, low confidence remains confirmable, unknown stays unknown, and unavailable exposes a manual-selection path.

- [ ] **Step 3: Implement the mock adapter**

Return deterministic fixture data by ID; reject missing IDs with `unavailable`; do not fabricate a species name from arbitrary text.

- [ ] **Step 4: Run the focused test**

Run:

```bash
node --test tests/open-source-recognition-contract.cjs
```

Expected: PASS for all fixture states.

- [ ] **Step 5: Document local execution**

Add a copyable sequence using Node tests and the WeChat developer tool with mock mode. Clearly state that real recognition requires owner-managed provider credentials and is not part of the no-credential quick start.

- [ ] **Step 6: Commit**

```bash
git add native/contracts native/services tests/open-source-recognition-contract.cjs README.md
git commit -m "feat: add reproducible recognition mock contract"
```

### Task 3: Complete maintainer and security documentation

**Files:**
- Create: `LICENSE` using a permissive license only after confirming project-owned code/assets are eligible.
- Create: `CONTRIBUTING.md`.
- Create: `SECURITY.md`.
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`.
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`.
- Create: `.github/PULL_REQUEST_TEMPLATE.md`.
- Create: `docs/PROVIDER_SETUP.md`.
- Create: `docs/ASSET_PROVENANCE.md`.
- Modify: `README.md` with links and a truthful feature matrix.

**Interfaces:**
- Contributors use mock mode for ordinary development; provider setup is optional and never requests secrets in issues or pull requests.

- [ ] **Step 1: Classify licenses and assets**

List every third-party package, generated image, font, species reference, and provider dependency. Mark each as project-owned, compatible open license, provider-owned, or blocked pending permission. Do not place blocked assets in the public release.

- [ ] **Step 2: Add contributor and security policy**

Require reproducible steps, tests, privacy impact notes for photo changes, and no secrets in issues. Route suspected vulnerabilities to a private maintainer contact rather than public issues.

- [ ] **Step 3: Add provider setup without credentials**

Document the exact environment variable names, CloudBase function names, user-consent boundary, deletion limitations, and failure behavior. State that owners enter values only in the provider console.

- [ ] **Step 4: Add truthful feature matrix**

Separate implemented locally, requires configured cloud service, requires WeChat console setup, and not yet implemented. Remove wording that could imply live accuracy, automatic deletion, or production readiness where the repository cannot prove it.

- [ ] **Step 5: Commit**

```bash
git add LICENSE CONTRIBUTING.md SECURITY.md .github docs/PROVIDER_SETUP.md docs/ASSET_PROVENANCE.md README.md
git commit -m "docs: add maintainer and security guidance"
```

### Task 4: Add public CI and release evidence

**Files:**
- Create: `.github/workflows/quality.yml`.
- Create: `CHANGELOG.md`.
- Create: `docs/RELEASE_CHECKLIST.md`.
- Modify: `package.json` scripts only where needed to expose deterministic checks.

**Interfaces:**
- CI runs without secrets and validates repository quality, contract tests, existing Node tests, and build verification.

- [ ] **Step 1: Add deterministic quality command**

Expose one command that runs `node --test tests/*.cjs` plus `npm run build:weapp`. Keep provider-backed tests opt-in and excluded from the public no-secret job.

- [ ] **Step 2: Write CI workflow**

Use a supported Node version, install with the lockfile, run the deterministic quality command, run `git diff --check`, and scan for credential patterns. Do not store or require provider secrets.

- [ ] **Step 3: Write release checklist**

Require tests, WXML/WXSS compilation, secret scan, asset-license review, README status review, changelog entry, version tag, and manual-device limitations before each release.

- [ ] **Step 4: Verify CI locally**

Run the same commands as the workflow and record pass/fail counts in the release checklist.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/quality.yml CHANGELOG.md docs/RELEASE_CHECKLIST.md package.json package-lock.json
git commit -m "ci: add reproducible open source quality checks"
```

### Task 5: Prepare GitHub publication and application materials

**Files:**
- Create: `docs/OPEN_SOURCE_MAINTENANCE_LOG.md`.
- Create: `docs/CODEX_FOR_OPEN_SOURCE_APPLICATION.md`.
- Modify: `README.md` with the eventual public repository URL after publication.

**Interfaces:**
- The maintenance log contains only dated, verifiable releases, fixes, issues, tests, and user feedback.
- The application draft maps each form field to evidence in the public repository.

- [ ] **Step 1: Record the first maintenance milestone**

Record the baseline commit, local test results, known limitations, and the exact date. Do not claim public adoption, downloads, stars, or accuracy until independently observed.

- [ ] **Step 2: Draft application answers**

Prepare concise English answers for role, ecosystem importance, Codex Security interest, API-credit use, and additional context. Leave unknown metrics as explicit fields to fill from the public repository after publication.

- [ ] **Step 3: Create the GitHub repository manually with the user**

Use a public repository owned by the user, then add its remote locally. Do not embed credentials or use a repository whose ownership/maintainer role is unclear.

- [ ] **Step 4: Publish only after final local audit**

Run the full test suite, secret scan, asset review, and `git status --short`. Push the approved branch, create a version tag, and verify the public clone can run mock mode.

- [ ] **Step 5: Submit the official form**

Use the public repository URL, the user’s actual GitHub username, the email associated with ChatGPT, the real maintainer role, the actual OpenAI Organization ID, and only evidence visible in the repository or linked public project activity.

- [ ] **Step 6: Commit the application draft**

```bash
git add docs/OPEN_SOURCE_MAINTENANCE_LOG.md docs/CODEX_FOR_OPEN_SOURCE_APPLICATION.md README.md
git commit -m "docs: prepare open source maintenance and application evidence"
```

