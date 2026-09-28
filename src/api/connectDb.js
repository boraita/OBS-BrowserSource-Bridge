import initSqlJs from '../lib/sql-asm.js';
import { normalizeForSearch } from '../utils/normalizeText.js';

let sqlEnginePromise = null;

export async function openDb(dbFile) {
  if (!sqlEnginePromise) {
    sqlEnginePromise = initSqlJs();
  }
  const SQL = await sqlEnginePromise;
  const db = new SQL.Database(new Uint8Array(dbFile));
  // SQLite's LIKE only folds ASCII case and never accents, so searches
  // compare through this instead (see getData.js).
  db.create_function('normalize_search', normalizeForSearch);
  return db;
}
