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
pnpm typecheck        # TypeScript type check (tsc --noEmit)
pnpm lint             # ESLint on .js and .ts files
pnpm format           # Prettier format all files
pnpm format:check     # Prettier check without writing
pnpm package          # build + package minimal release ZIP
pnpm package:full     # build + package full release ZIP
```

**Testing** (no Jest — Node regression scripts):
```bash
node testing/testAlgorithm.js [--quick]
node testing/testBibleSelection.js
node testing/testSnapshot.js [--update]
```
New scripts go in `testing/testFeature.js` and must be documented in `testing/README.md`.

## Architecture

The app has two independent entry points that communicate via `BroadcastChannel`:

| Entry Point | HTML | TypeScript Entry | Purpose |
|---|---|---|---|
| Control Panel | `src/public/control_panel.html` | `src/public/panel/panel.ts` | OBS Custom Browser Dock for searching/selecting verses |
| Browser Source | `src/public/browser_source.html` | `src/public/browser/browser.ts` | OBS overlay that displays verses in the stream |

**Three broadcast channels:**
- `myChannel` — verse content updates
- `bgContent` — overlay visibility
- `settings` — configuration sync

**Source layout:**
- `src/core/` — UI controllers (`control_app.js`, `browser_app.js`) and shared logic (`broadcastChannels.js`, `settings.js`, `sendMessage.js`, `styleManager.js`, `panelStyleManager.js`, `obsWebSocket.js`)
- `src/api/` — database access (`connectDb.js`, `getData.js`)
- `src/db/` — bundled SQLite Bible translations (loaded as arraybuffers via `arraybuffer-loader`)
- `src/config/` — Bible lazy-loader mappings (`bibleConfig.js`) and OBS WebSocket config
- `src/styles/` — SCSS (`cp_style.scss`, `browser_style.scss`); JS-driven dynamic styles go through `styleManager.js` / `panelStyleManager.js`
- `src/utils/` — shared utilities
- `dist/` — generated output, never edit directly
- `testing/` — Node regression scripts

**Bible databases:** 10 SQLite files in `src/db/` (BTX, KDSH, LBLA, NTV, NVI, NVIC, RVR60, TLA, etc.). New translations require entries in `src/config/bibleConfig.js` and a corresponding `.sqlite` file.

## Code Style

- ES modules everywhere (`import ... from "..."`)
- Two-space indentation, double quotes for strings
- camelCase variables/functions, PascalCase classes/types, UPPER_SNAKE_CASE constants, kebab-case DOM ids/classes
- Avoid `any` in TypeScript; keep function signatures explicit
- `async/await` over `.then()` chains; always handle rejections
- Query DOM elements once, null-check before use
- Target modern Chromium (OBS docks); no Node-only globals in browser code

## OBS Validation

After code changes, manually verify both the control panel dock and browser source in OBS with real passages before considering the change complete.
