# Development

## Layout

```text
lib/                  Ready-to-load host/client JavaScript
assets/master-1024/   Eight editable full-canvas RGBA masters
assets/png-672/       Generated 3x runtime images
asset-manifest.json   Source/export hashes and dimensions
scripts/              Portable build, audit and local packaging
test/                 Node checks and isolated React browser fixture
docs/images/          Clean fixture screenshots
releases/             Prepared installable archive
```

Node 24 is the reference development runtime. Development packages are pinned in
package-lock.json. They are not runtime dependencies of the DSH plugin.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run check:public
npm run pack:release
```

Browser tests use Playwright Chromium by default. If testing an already installed
Chromium-family browser, set `PLAYWRIGHT_EXECUTABLE_PATH` to that executable's
absolute path in your own shell. No developer's browser path is stored here.
Linux may require `npx playwright install --with-deps chromium`.

## Building artwork

Change the appropriate master, then run `npm run build`. It regenerates 672px
exports and the single marked `WHALE_ART` data-URL object in lib/client.js,
along with asset-manifest.json. Canvas sizes, scale and baseline are shared;
do not independently crop each state. xhigh has the approved short-arm correction.

The client file is intentionally large because all eight PNGs are embedded, so
an installed tgz never needs a user-specific picture path or a remote image host.
The marker is generated content; edit the masters rather than its base64 text.

## Behavioral invariants

- The current model's advertised effort list is authoritative.
- Preview changes artwork and FX while holding the pointer. Commit occurs once on release.
- Pointer cancellation restores the selected level and clears or restores the canvas.
- Old request callbacks cannot replace a newer model/session context.
- Disabled Auto-band/routes do not inspect conversation content.
- The model seat override is a single-slot registration; uninstall must restore the default.
- Reduced motion and closed-state canvas suspension must remain functional.

The test fixture uses simulated model directories and a local HTTP server only;
it does not authenticate to a model provider or send inference requests.
Node host tests create unique temporary directories and clean up only those directories.

## Public source verification

`npm run check:public` uses an explicit file allowlist, checks private-path and
secret-shaped text patterns, checks all image/embedded hashes, and excludes
node_modules, caches, dist and generated test reports. This is a focused project
check, not a guarantee that every possible secret or security defect is detected.

`npm run pack:release` runs the audit and npm pack locally, verifies the archive
against its source and embedded image hashes, and writes dist/SHA256SUMS.
No release command logs in or publishes automatically.
