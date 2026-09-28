import initSqlJs from '../lib/sql-asm.js';

let sqlEnginePromise = null;

export async function openDb(dbFile) {
  if (!sqlEnginePromise) {
    sqlEnginePromise = initSqlJs();
  }
  const SQL = await sqlEnginePromise;
  return new SQL.Database(new Uint8Array(dbFile));
}
