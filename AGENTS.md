# AGENTS.md

## Commands
- **Install**: `pnpm install`
- **Dev server**: `pnpm start` (localhost:8080)
- **Build**: `pnpm build` (production to `dist/`)
- **Lint**: `pnpm lint` | **Format**: `pnpm format`
- **Type check**: `pnpm typecheck`
- **Single test**: `node testing/testAlgorithm.js [--quick]`, `node testing/testBibleSelection.js`, `node testing/testSnapshot.js [--update]`

## Code Style
- ES modules with `import/export`; relative paths (e.g., `"../api/getData"`)
- Prettier: 2-space indent, single quotes, semicolons, 100 char width
- TypeScript: avoid `any`, explicit signatures; JS: follow surrounding file conventions
- Naming: camelCase (vars/funcs), PascalCase (classes/types), UPPER_SNAKE_CASE (constants), kebab-case (DOM ids)
- Error handling: guard null DOM nodes, wrap async in `try/catch`, log with `console.error`
- Use `async/await` over `.then()` chains; always catch OBS/WebSocket/DB calls

## File Organization
- `src/core`: UI controllers | `src/api`: DB access | `src/config`: settings | `src/utils`: helpers
- `src/styles`: CSS/SCSS (use `styleManager.js` for dynamic changes) | `src/public`: HTML entry points
- Never edit `dist/`; tests go in `testing/testFeature.js`

## Validation
After changes, manually verify control panel and browser source in OBS with real passages.
