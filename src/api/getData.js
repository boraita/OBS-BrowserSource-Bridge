import { openDb } from './connectDb.js';
import { requiresTagCleaning, getBibleMap } from '../config/bibleConfig.js';

const BIBLE_MAP = getBibleMap();
const DEFAULT_BIBLE = 'kdsh';

export let openedDb = null;
export let selectedBibleName = null;
let selectedBibleCode = null;

export async function selectBible(name) {
  const bibleName = name?.toLowerCase() || DEFAULT_BIBLE;

  if (openedDb && selectedBibleCode === bibleName) {
    return openedDb;
  }

  if (openedDb) {
    try {
      openedDb.close();
    } catch (error) {
      console.warn('⚠️ Error closing previous database:', error);
    }
  }

  const resolvedCode = BIBLE_MAP[bibleName] ? bibleName : DEFAULT_BIBLE;
  const bible = BIBLE_MAP[resolvedCode];

  try {
    console.log(`📥 Loading bible: ${resolvedCode.toUpperCase()}...`);
    const bibleModule = await bible.loader();
    const bibleFile = bibleModule.default;

    openedDb = await openDb(bibleFile);
    selectedBibleName = bible.name;
    selectedBibleCode = resolvedCode;
    console.log(`✅ Bible loaded: ${selectedBibleCode.toUpperCase()}`);
    return openedDb;
  } catch (error) {
    console.error(`❌ Error opening bible ${bibleName}:`, error);
    throw error;
  }
}

export function closeDb() {
  if (!openedDb) return;

  try {
    openedDb.close();
    console.log('🔒 Database closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}

async function ensureDbOpen(bibleName = null) {
  if (!openedDb || (bibleName && bibleName !== selectedBibleName)) {
    await selectBible(bibleName || selectedBibleName || DEFAULT_BIBLE);
  }
  return openedDb;
}

export async function getBibleAsJson(bibleName) {
  const db = await ensureDbOpen(bibleName);

  if (!db) {
    console.error('❌ Could not open database');
    return [];
  }

  try {
    const query = `
      SELECT 
        books.book_number || ':' || verses.chapter || ':' || verses.verse as ari,
        books.long_name || ' ' || verses.chapter || ':' || verses.verse as name,
        verses.text as verse 
      FROM books 
      INNER JOIN verses ON books.book_number = verses.book_number 
      ORDER BY books.book_number, verses.chapter, verses.verse 
      LIMIT 10
    `;

    const result = db.exec(query);

    if (!result || result.length === 0) {
      return [];
    }

    return result[0].values.map((item) => ({
      ari: item[0],
      name: item[1],
      verse: processVerseText(item[2]),
    }));
  } catch (error) {
    console.error('❌ Error in getBibleAsJson:', error);
    return [];
  }
}

export async function getBibleChapterBooksList() {
  const db = await ensureDbOpen();

  if (!db) {
    console.error('❌ Could not open database');
    return [];
  }

  try {
    const query = `
      SELECT DISTINCT books.long_name || ' ' || verses.chapter as bookVerse
      FROM books
      INNER JOIN verses ON books.book_number = verses.book_number
      GROUP BY books.book_number, verses.chapter
      ORDER BY books.book_number, verses.chapter
    `;

    const result = db.exec(query);
    return result?.[0]?.values.flatMap((row) => row[0]) ?? [];
  } catch (error) {
    console.error('❌ Error in getBibleChapterBooksList:', error);
    return [];
  }
}

function normalizeBookName(bookName) {
  if (!bookName) return '';
  const trimmed = bookName.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export async function searchCharacters(chapterBook) {
  const db = await ensureDbOpen();

  if (!db) {
    console.error('❌ Could not open database');
    return [];
  }

  if (!chapterBook || typeof chapterBook !== 'string') {
    console.error('❌ Invalid search:', chapterBook);
    return [];
  }

  try {
    const parts = chapterBook.trim().split(' ');
    const lastPart = parts[parts.length - 1];
    const hasChapterNumber = !isNaN(Number(lastPart));

    const bookName = hasChapterNumber
      ? normalizeBookName(parts.slice(0, -1).join(' '))
      : normalizeBookName(parts.join(' '));

    const chapterNumber = hasChapterNumber ? Number(lastPart) : null;

    const sql =
      chapterNumber !== null
        ? `SELECT verses.chapter, verses.verse, verses.text, books.long_name
           FROM books
           INNER JOIN verses ON books.book_number = verses.book_number
           WHERE books.long_name LIKE ?
             AND verses.chapter = ?
           ORDER BY verses.chapter, verses.verse`
        : `SELECT verses.chapter, verses.verse, verses.text, books.long_name
           FROM books
           INNER JOIN verses ON books.book_number = verses.book_number
           WHERE books.long_name LIKE ?
           ORDER BY verses.chapter, verses.verse`;

    const stmt = db.prepare(sql);
    stmt.bind(chapterNumber !== null ? [bookName, chapterNumber] : [bookName]);

    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        name: `${row.long_name} ${row.chapter}:${row.verse}`,
        verse: processVerseText(row.text),
      });
    }
    stmt.free();

    if (results.length === 0) {
      console.log(`ℹ️ No verses found for: ${chapterBook}`);
    }
    return results;
  } catch (error) {
    console.error('❌ Error in searchCharacters:', error);
    return [];
  }
}

export async function searchInBibleText(text) {
  const db = await ensureDbOpen();

  if (!db) {
    console.error('❌ Could not open database');
    return [];
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.error('❌ Invalid search text:', text);
    return [];
  }

  try {
    console.log(`🔍 Searching: "${text}" in ${selectedBibleCode?.toUpperCase()}`);

    const stmt = db.prepare(`
      SELECT verses.chapter, verses.verse, verses.text, books.long_name
      FROM books
      INNER JOIN verses ON books.book_number = verses.book_number
      WHERE verses.text LIKE ?
      ORDER BY books.book_number, verses.chapter, verses.verse
    `);
    stmt.bind([`%${text}%`]);

    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        name: `${row.long_name} ${row.chapter}:${row.verse}`,
        verse: processVerseText(row.text),
      });
    }
    stmt.free();

    if (results.length === 0) {
      console.log(`ℹ️ No results found for: "${text}"`);
    } else {
      console.log(`✅ Found ${results.length} verses`);
    }
    return results;
  } catch (error) {
    console.error('❌ Error in searchInBibleText:', error);
    return [];
  }
}

function removeTags(str) {
  if (!str || str === '') return '';

  const text = str.toString();
  return text.replace(/<(?!\/?i>)(?!i>).*?<\/(?!\/?i>)(?!i>).*?>|<i>|<\/i>/g, '');
}

/**
 * Central function to clean and normalize verse text.
 * This is the single source of truth for text cleaning.
 * Removes: HTML tags (conditional), line breaks, special chars, extra spaces
 * @param {string} text - Raw text from database
 * @returns {string} - Clean, normalized text ready for display
 */
export function processVerseText(text) {
  if (!text) return '';

  const textWithoutTags = requiresTagCleaning(selectedBibleCode) ? removeTags(text) : text;

  return textWithoutTags
    .replace(/<\/?br\s*\/?>/gi, ' ') // HTML line breaks
    .replace(/[\r\n•°]+|\\['"][0-9a-fA-F]{2}|\[\d+†?\]/g, '') // Line breaks, bullets, degrees, hex codes, footnotes
    .replace(/\s{2,}/g, ' ') // Multiple spaces to single
    .trim();
}
