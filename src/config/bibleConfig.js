// Bible configuration with lazy loading.
//
// Only RVR60.sqlite is checked into git; every other .sqlite file is
// gitignored and added locally by each user/dev (see TESTING.md). Because of
// that, BIBLE_CONFIG is built from whatever .sqlite files actually exist in
// src/db/ at build time (via require.context), not from a fixed list — a
// bible you haven't downloaded yet is simply absent from the selector
// instead of making `pnpm build`/`pnpm start` fail outright.
//
// Metadata below is optional per code: a .sqlite file with no matching entry
// still gets picked up automatically (with a generic display name derived
// from its filename), so adding a new translation is just "drop the file in
// src/db/" — no code change required. Add an entry here only when you want
// a nicer display name, a full name, or requiresTagCleaning: true.
const BIBLE_METADATA = {
  kdsh: {
    name: 'Kadosh Israelita',
    displayName: 'Kadosh Israelita',
    fullName: 'Kadosh Israelita Mesiánica',
    requiresTagCleaning: false,
  },
  lbla: {
    name: 'lbla',
    displayName: 'Americas',
    fullName: 'La Biblia de las Américas',
    requiresTagCleaning: true,
  },
  nvi: {
    name: 'nvi',
    displayName: 'Nueva V. Inter',
    fullName: 'Nueva Versión Internacional',
    requiresTagCleaning: false,
  },
  ntv: {
    name: 'ntv',
    displayName: 'Nueva Trad. Viv.',
    fullName: 'Nueva Traducción Viviente',
    requiresTagCleaning: false,
  },
  btx: {
    name: 'btx',
    displayName: 'Textual',
    fullName: 'Biblia Textual',
    requiresTagCleaning: false,
  },
  tla: {
    name: 'tla',
    displayName: 'Lenguaje actual',
    fullName: 'Biblia Lenguaje actual',
    requiresTagCleaning: false,
  },
  rvr60: {
    name: 'rvr60',
    displayName: 'Reina Valera 60',
    fullName: 'Reina Valera 1960',
    requiresTagCleaning: false,
  },
  pesh: {
    name: 'pesh',
    displayName: 'Peshita',
    fullName: 'Peshita',
    requiresTagCleaning: false,
  },
  rvc: {
    name: 'rvc',
    displayName: 'Reina Valera Cont.',
    fullName: 'Reina Valera Contemporánea',
    requiresTagCleaning: false,
  },
  nvic: {
    name: 'nvic',
    displayName: 'NVI 2017',
    fullName: 'Nueva Versión Internacional 2017',
    requiresTagCleaning: true,
  },
};

function fallbackMetadata(code, filenameBase) {
  return {
    name: code,
    displayName: filenameBase,
    fullName: filenameBase,
    requiresTagCleaning: false,
  };
}

// `'lazy'` mode keeps each match as its own on-demand chunk (bible-<code>),
// same as the previous per-file `import('../db/X.sqlite')` calls — this is
// what makes the lazy-loading architecture (only the selected translation
// is ever downloaded) keep working.
const sqliteContext = require.context('../db', false, /\.sqlite$/i, 'lazy');

function buildBibleConfig() {
  const config = {};

  sqliteContext.keys().forEach((key) => {
    const filenameBase = key.replace(/^\.[\\/]/, '').replace(/\.sqlite$/i, '');
    const code = filenameBase.toLowerCase();
    const metadata = BIBLE_METADATA[code] || fallbackMetadata(code, filenameBase);

    config[code] = {
      ...metadata,
      loader: () => sqliteContext(key),
    };
  });

  return config;
}

const BIBLE_CONFIG = buildBibleConfig();

export function getBibleList() {
  return Object.keys(BIBLE_CONFIG);
}

export function getBibleDisplayName(code) {
  return BIBLE_CONFIG[code]?.displayName || code.toUpperCase();
}

export function getBibleFullName(code) {
  return BIBLE_CONFIG[code]?.fullName || code.toUpperCase();
}

export function requiresTagCleaning(code) {
  return BIBLE_CONFIG[code]?.requiresTagCleaning || false;
}

export async function getBibleFile(code) {
  const config = BIBLE_CONFIG[code];
  if (!config?.loader) return null;

  const module = await config.loader();
  return module?.default ?? module;
}

export function getBibleLoader(code) {
  return BIBLE_CONFIG[code]?.loader;
}

export function getBibleOptions() {
  return Object.entries(BIBLE_CONFIG).map(([code, config]) => ({
    value: code,
    label: config.displayName,
  }));
}

// Generate BIBLE_MAP dynamically from configuration
// Note: file is loaded lazily via loader function
export function getBibleMap() {
  return Object.keys(BIBLE_CONFIG).reduce((map, key) => {
    map[key] = {
      loader: BIBLE_CONFIG[key].loader,
      name: BIBLE_CONFIG[key].name,
    };
    return map;
  }, {});
}

export { BIBLE_CONFIG };
