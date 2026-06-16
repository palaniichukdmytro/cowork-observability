---
name: release-plugin
description: >-
  Cut and publish a new release of the cowork-observability Grafana app plugin:
  pre-flight checks, fetch + diff Grafana publishing policy, bump version, run
  the plugin validator locally, tag to trigger the CI attested-build release
  workflow, verify the draft release assets, and print the exact grafana.com
  submission steps. Use when releasing a new version or updating the Grafana
  catalog submission for this plugin.
---

# Release the Cowork Observability plugin

End-to-end release flow for `palanikus-coworkobservability-app`, encoding the
pitfalls already hit so they don't recur.

## Cost / model

Mechanical multi-step flow — run on **Sonnet**. No extended thinking needed.

## Hard rules (read first — these caused real breakage)

1. **Never create a GitHub release by hand.** The release workflow auto-creates a
   **DRAFT** that carries the attested `…-<version>.zip` **and** `.zip.sha1`. You
   must *publish that draft*. A manually-created release only gets GitHub's
   "Source code (zip/tar.gz)" auto-archives — which are NOT the built plugin and
   are not submittable to Grafana.
2. **`gh` is authed to a different (work) account**, with no write access to this
   personal repo and **cannot see drafts**. Do not use `gh` to publish/delete
   releases or to read the draft. Use it only for *public, read-only* API calls.
   Publishing the draft and updating the grafana.com submission are **manual user
   actions** in the browser.
3. **Plugin id prefix must equal the grafana.com org slug** (`palanikus`). Don't
   change `id` in `src/plugin.json` without changing the slug too.
4. **Public repo — no PII / internal infra.** Run the leak scan (Step 5) every
   time; never commit real emails, tokens, IPs, or internal endpoints.
5. Commits/pushes use the **personal** identity (repo-local `user.email`,
   `core.sshCommand` → `~/.ssh/personal`, `commit.gpgsign false`). Verify, never
   commit as the work account.

## Environment

```bash
REPO=~/Documents/MortalKombat/cowork-observability
export PATH="$HOME/.nvm/versions/node/v22.13.1/bin:$(go env GOPATH)/bin:$PATH"  # node>=22 + plugincheck2
cd "$REPO"
```

Plugin validator (`plugincheck2`) install, if missing:
`go install github.com/grafana/plugin-validator/pkg/cmd/plugincheck2@latest`

## Steps

### 1. Pre-flight
```bash
git config user.email   # must be the personal noreply, NOT the work account
git config core.sshCommand   # must point at ~/.ssh/personal
git status --short      # must be clean; commit/stash first
git rev-parse --abbrev-ref HEAD   # should be main
```
Bail out if the identity is wrong or the tree is dirty.

### 2. Fetch + diff Grafana policy (drift check)
Use WebFetch on:
- https://grafana.com/developers/plugin-tools/publish-a-plugin/publish-a-plugin
- https://grafana.com/legal/plugins/ (plugin policy)

Compare against what this plugin relies on: no usage/user tracking, sponsor link
allowed in `info.links`, signing happens at Grafana review. If the policy changed
in a way that affects us, surface it to the user **before** releasing.

### 3. Bump version
Pick the next semver. Update **both**:
- `package.json` → `version`
- `CHANGELOG.md` → new `## X.Y.Z (Unreleased)` section with the changes
`src/plugin.json` keeps `"version": "%VERSION%"` (build substitutes from package.json).

### 4. Build + local validate
```bash
npm run typecheck && npm run lint && CI=true npm run test:ci
rm -rf dist && npm run build
node -e "console.log('dist version:', require('./dist/plugin.json').info.version)"  # must match the bump
PID=palanikus-coworkobservability-app
rm -rf /tmp/rel && mkdir -p /tmp/rel/$PID && cp -r dist/* /tmp/rel/$PID/
( cd /tmp/rel && zip -qr $PID.zip $PID )
plugincheck2 /tmp/rel/$PID.zip 2>&1 | grep -E '^(error|warning|recommendation):'
```
There must be **0 `error:` lines**. Expected leftovers: `unsigned` (cleared by
Grafana at review) and possibly recommendations. This local zip is only a smoke
test — the *real* artifact is built by CI in Step 7.

### 5. Leak scan (public repo safety)
Concrete employer/infra patterns live in a **local, gitignored** file
(`leak-patterns.local`) so this public-facing skill never enumerates them:
```bash
git grep -nE -f .claude/skills/release-plugin/leak-patterns.local -- . ':!package-lock.json' || echo "clean"
```
Any hit → stop and redact before continuing. Keep `leak-patterns.local` current
(internal IPs, internal hostnames, ticket prefixes, work email domains, token
prefixes); it is never committed.

### 6. Commit + tag (this triggers the release workflow)
```bash
git add -A
git commit -m "Release vX.Y.Z: <summary>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin HEAD
git tag -a vX.Y.Z -m "vX.Y.Z — <summary>"
git push origin vX.Y.Z     # on: push tags 'v*' -> .github/workflows/release.yml
```

### 7. Wait for the attested release workflow
```bash
RUN=$(gh api "repos/palaniichukdmytro/cowork-observability/actions/workflows/release.yml/runs?per_page=1" -q '.workflow_runs[0].id')
# poll every 20s until completed; expect conclusion=success
gh api "repos/palaniichukdmytro/cowork-observability/actions/runs/$RUN" -q '.status+" "+(.conclusion//"-")'
```
The `grafana/plugin-actions/build-plugin` step builds, packages
`<PID>-X.Y.Z.zip` + `.sha1`, runs `actions/attest-build-provenance`, and creates
a **draft** release with those two assets attached.

### 8. Tell the user to publish the draft (manual)
The draft is invisible to `gh` here, so instruct the user:
1. Open https://github.com/palaniichukdmytro/cowork-observability/releases
2. Find the **`Draft`** entry for `vX.Y.Z` (auto-created by Actions; its notes
   start with "This Github draft release has been created for your plugin").
3. Confirm **Assets** has exactly: `<PID>-X.Y.Z.zip` and `<PID>-X.Y.Z.zip.sha1`.
4. Edit → **Publish release**. Do **NOT** click "Draft a new release".

### 9. Verify the published assets (after they publish)
```bash
gh api repos/palaniichukdmytro/cowork-observability/releases/tags/vX.Y.Z -q '.draft, [.assets[].name]'
for f in <PID>-X.Y.Z.zip <PID>-X.Y.Z.zip.sha1; do
  curl -s -o /dev/null -w '%{http_code}\n' -L "https://github.com/palaniichukdmytro/cowork-observability/releases/download/vX.Y.Z/$f"
done   # both must be 200
# optional provenance check:
curl -sL ".../<PID>-X.Y.Z.zip" -o /tmp/v.zip && gh attestation verify /tmp/v.zip --repo palaniichukdmytro/cowork-observability
```

### 10. Print the grafana.com submission values
Give the user, for **My Plugins → update submission**:
| Field | Value |
|---|---|
| Plugin (zip) URL | `…/releases/download/vX.Y.Z/<PID>-X.Y.Z.zip` |
| MD5 or SHA1 | the `…zip.sha1` URL (form accepts a URL) |
| Source code | `https://github.com/palaniichukdmytro/cowork-observability/tree/vX.Y.Z` |

Then remind: only `unsigned` should remain on Grafana's report; they sign it at
review.

## Notes
- Old/junk releases (e.g. a hand-made one missing assets) can be deleted in the
  Releases UI by the user; they don't block anything.
- Paid/Marketplace is a separate track (Commercial signature + Grafana
  Marketplace / Founding Partner program), not part of this skill.
