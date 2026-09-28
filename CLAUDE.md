# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OBS Bible Stream Verses is an OBS Studio plugin that displays Bible verses as a Browser Source overlay, controlled via a Custom Browser Dock. It runs 100% offline using bundled SQLite databases (SQL.js) and communicates between the panel and overlay via the `BroadcastChannel` API.

## Commands

```bash
pnpm install          # Install dependencies (always use pnpm, not npm/yarn)
pnpm dev              # One-off development build
pnpm start            # Webpack dev server at http://localhost:8080/
pnpm build            # Production bundle to dist/
pnpm build:analyze    # Production build with stats.json for bundle analysis
pnpm typecheck        # TypeScript type check (tsc --noEmit)
pnpm lint             # ESLint on .js and .ts files
pnpm format           # Prettier format all files
pnpm format:check     # Prettier check without writing
pnpm package          # build + minimal release ZIP (scripts/package-release.sh)
pnpm package:full     # build + full release ZIP (scripts/package-release-full.sh)
pnpm release-pr       # Open a release PR (patch); also :minor / :major variants
pnpm export:bible     # Export a bundled SQLite Bible to XML (scripts/exportBibleToXml.js)
```

**Testing.** There is no Jest/Vitest harness and no automated test command. `testing/` currently only contains `README.md` and `index.html`; the Node scripts the README describes (`testDirect.js`, `testAlgorithm.js`, etc.) are not in the tree. If you add regression scripts, put them in `testing/` and document them in `testing/README.md`. Manual validation in OBS remains the source of truth.

## Architecture

The app has two independent entry points that communicate via `BroadcastChannel`. Webpack builds them as separate bundles with shared chunks:

| Entry Point    | HTML template                   | TS entry                        | Output                             |
| -------------- | ------------------------------- | ------------------------------- | ---------------------------------- |
| Control Panel  | `src/public/panel/index.html`   | `src/public/panel/panel.ts`     | `dist/panel.html` + `panel.js`     |
| Browser Source | `src/public/browser/index.html` | `src/public/browser/browser.ts` | `dist/browser.html` + `browser.js` |

**Three broadcast channels** (`src/core/broadcastChannels.js`):

- `myChannel` — verse content updates
- `bgContent` — overlay visibility
- `settings` — configuration sync

**Source layout:**

- `src/core/` — UI controllers (`control_app.js`, `browser_app.js`) and shared logic: `broadcastChannels.js`, `settings.js`, `sendMessage.js`, `styleManager.js`, `panelStyleManager.js`, `obsWebSocket.js`, `appState.js`, `searchBible.js`, `suggestBibleBooks.js`, `resumeManager.js` (the Resume tab that timestamps displayed verses).
- `src/api/` — database access (`connectDb.js`, `getData.js`).
- `src/config/` — `bibleConfig.js` (lazy-loader mappings for each Bible) and `obsWebSocketConfig.js`.
- `src/db/` — SQLite Bible files loaded as arraybuffers via `arraybuffer-loader`. **Only `RVR60.sqlite` is checked in**; all other `.sqlite` files are gitignored (see `TESTING.md`). Users add their own translations locally.
- `src/lib/sql-asm.js` — SQL.js asm.js build; split into its own `sql-library` chunk by webpack.
- `src/styles/` — SCSS: `cp_style.scss`, `browser_style.scss`, plus `dynamic-styles.scss` / `panel-dynamic-styles.scss` driven by `styleManager.js` / `panelStyleManager.js`.
- `src/types/` — TypeScript ambient declarations (e.g., `styles.d.ts`).
- `src/utils/parseBibles.js` — shared helpers.
- `dist/` — generated output, never edit directly.

**Webpack chunking** (`webpack.config.js`): each `.sqlite` becomes its own `bible-<name>` chunk, `sql-asm.js` becomes `sql-library`, and a single `runtime` chunk is shared. This is what enables the lazy-loading model — Bibles load only when selected.

**Adding a Bible:** drop `NAME.sqlite` into `src/db/` and add an entry to `BIBLE_CONFIG` in `src/config/bibleConfig.js` (`name`, `displayName`, `fullName`, `requiresTagCleaning`, `loader: () => import('../db/NAME.sqlite')`). The selector is built from this map.

## Code Style

- ES modules everywhere (`import ... from '...'`).
- Prettier: 2-space indent, **single quotes**, semicolons, 100-char width, trailing commas `es5` (see `.prettierrc`).
- camelCase variables/functions, PascalCase classes/types, UPPER_SNAKE_CASE constants, kebab-case DOM ids/classes.
- TypeScript: avoid `any`; keep function signatures explicit. `ts-loader` runs with `transpileOnly: true`, so `pnpm typecheck` is what actually catches type errors — run it before claiming a TS change is done.
- `async/await` over `.then()` chains; always handle rejections, especially around OBS WebSocket and SQL.js calls.
- Query DOM elements once and null-check before use.
- Target modern Chromium (OBS docks); Babel preset-env targets `chrome: 88`. No Node-only globals in browser code.

## OBS Validation

After code changes, manually verify both the control panel dock and the browser source in OBS with real passages before considering the change complete. Type checking and lint don't catch overlay regressions.
