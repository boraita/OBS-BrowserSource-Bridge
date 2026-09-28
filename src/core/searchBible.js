import { searchCharacters, searchInBibleText } from '../api/getData';
import { displayBible, updateOnAirStatusUI } from './sendMessage';
import { getSearchMode } from './appState.js';
import { accentInsensitivePattern } from '../utils/normalizeText.js';

/**
 * A verse's `name` is always "<book> <chapter>:<verse>" (see getData.js).
 * The book name may itself contain spaces ("1 Corintios", "S. Mateo"), but
 * "<chapter>:<verse>" is always the final token, so splitting on the last
 * space reliably separates the two regardless of book name length.
 */
function getBookChapterKey(name) {
  const lastSpace = name.lastIndexOf(' ');
  if (lastSpace === -1) return name;
  const book = name.slice(0, lastSpace);
  const chapter = name.slice(lastSpace + 1).split(':')[0];
  return `${book} ${chapter}`;
}

/**
 * Wraps every occurrence of `term` in `text` with a <mark>, so a text-search
 * match is visible at a glance in the result list (reference lookups never
 * pass a term here — the whole chapter is the point, not a match to spot).
 */
function highlightMatches(text, term) {
  if (!term) return text;
  const pattern = accentInsensitivePattern(term.trim());
  if (!pattern) return text;
  return text.replace(new RegExp(`(${pattern})`, 'ig'), '<mark class="verse-highlight">$1</mark>');
}

function createVerseElement(verse, { grouped, highlightTerm } = {}) {
  const cleanedName = verse.name.replace(/:/g, '-').replace(/\s/g, '').toLowerCase();

  const pElement = document.createElement('p');
  pElement.id = cleanedName;
  // Original-case reference (e.g. "Génesis 4:6") for the Resume tab
  pElement.dataset.reference = verse.name;

  const verseHtml = highlightTerm ? highlightMatches(verse.verse, highlightTerm) : verse.verse;

  // Verse text always lives in its own .verse-text span so sendMessage.js
  // can read it directly (querySelector('.verse-text')) instead of falling
  // back to stripping the title out of the row's full text content — that
  // fallback would otherwise pick up the verse-number badge below too.
  if (grouped) {
    // The reference is already shown once in the group header. The full
    // <span> stays in the DOM (sendMessage.js reads its textContent as the
    // overlay title) but is visually hidden in favor of a compact verse
    // number badge, via CSS (#bible-verse p.grouped span { display: none }).
    pElement.classList.add('grouped');
    const verseNumber = verse.name.split(':').pop();
    pElement.innerHTML = `<span>${verse.name.toUpperCase()}</span><span class="verse-num-badge">${verseNumber}</span><div class="verse-text">${verseHtml}</div>`;
  } else {
    pElement.innerHTML = `<span>${verse.name.toUpperCase()}</span><div class="verse-text">${verseHtml}</div>`;
  }

  return pElement;
}

function createGroupHeader(bookChapterKey) {
  const header = document.createElement('div');
  header.className = 'verse-group-header';
  header.textContent = bookChapterKey.toUpperCase();
  return header;
}

/**
 * Renders search results. When several consecutive results share the same
 * book+chapter (the common case for a reference lookup like "Salmos 23"),
 * they're grouped under one header instead of repeating the full reference
 * on every row, so an operator can scan a whole chapter faster.
 */
function renderVersicles(container, versicles, { highlightTerm } = {}) {
  let index = 0;
  while (index < versicles.length) {
    const key = getBookChapterKey(versicles[index].name);
    let runEnd = index + 1;
    while (runEnd < versicles.length && getBookChapterKey(versicles[runEnd].name) === key) {
      runEnd++;
    }
    const runLength = runEnd - index;
    const isGroup = runLength > 1;

    if (isGroup) {
      container.appendChild(createGroupHeader(key));
    }

    for (let i = index; i < runEnd; i++) {
      const verseElement = createVerseElement(versicles[i], { grouped: isGroup, highlightTerm });
      container.appendChild(verseElement);
      displayBible(verseElement, i);
    }

    index = runEnd;
  }
}

function updateResultCount(mode, count, query) {
  const el = document.getElementById('search-result-count');
  if (!el) return;

  if (mode !== 'text') {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.textContent = `${count} resultado${count === 1 ? '' : 's'} «${query}»`;
}

async function searchBible(query) {
  const bblVerseDiv = document.getElementById('bible-verse');
  const mode = getSearchMode();
  bblVerseDiv.innerHTML = '';
  bblVerseDiv.classList.add('loading');

  try {
    const versicles = await filterVersicles(query.toLowerCase());
    bblVerseDiv.innerHTML = '';
    renderVersicles(bblVerseDiv, versicles, { highlightTerm: mode === 'text' ? query : null });
    updateResultCount(mode, versicles.length, query);
    updateOnAirStatusUI();
  } catch (error) {
    console.error('❌ Error searching bible:', error);
    bblVerseDiv.innerHTML = '';
  } finally {
    bblVerseDiv.classList.remove('loading');
  }
}

async function filterVersicles(query) {
  return getSearchMode() === 'text'
    ? await searchInBibleText(query)
    : await searchCharacters(query);
}

async function handleSearch(event) {
  if (event) {
    event.preventDefault();
  }

  const inputField = document.getElementById('bible-input');
  const searchQuery = inputField.value.trim();

  if (searchQuery) {
    await searchBible(searchQuery);
  }
}

const submitButton = document.getElementById('bible-submit');
if (submitButton) {
  submitButton.addEventListener('click', handleSearch);
}

const inputField = document.getElementById('bible-input');
if (inputField) {
  inputField.addEventListener('keydown', async function (event) {
    if (event.key === 'Enter') {
      await handleSearch(event);
    }
  });
}

export { searchBible };
