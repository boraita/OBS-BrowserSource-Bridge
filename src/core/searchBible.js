import { searchCharacters, searchInBibleText } from '../api/getData';
import { displayBible, updateOnAirStatusUI } from './sendMessage';

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

function createVerseElement(verse, { grouped } = {}) {
  const cleanedName = verse.name.replace(/:/g, '-').replace(/\s/g, '').toLowerCase();

  const pElement = document.createElement('p');
  pElement.id = cleanedName;

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
    pElement.innerHTML = `<span>${verse.name.toUpperCase()}</span><span class="verse-num-badge">${verseNumber}</span><div class="verse-text">${verse.verse}</div>`;
  } else {
    pElement.innerHTML = `<span>${verse.name.toUpperCase()}</span><div class="verse-text">${verse.verse}</div>`;
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
function renderVersicles(container, versicles) {
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
      const verseElement = createVerseElement(versicles[i], { grouped: isGroup });
      container.appendChild(verseElement);
      displayBible(verseElement, i);
    }

    index = runEnd;
  }
}

async function searchBible(query) {
  const bblVerseDiv = document.getElementById('bible-verse');
  bblVerseDiv.innerHTML = '';
  bblVerseDiv.classList.add('loading');

  try {
    const versicles = await filterVersicles(query.toLowerCase());
    bblVerseDiv.innerHTML = '';
    renderVersicles(bblVerseDiv, versicles);
    updateOnAirStatusUI();
  } catch (error) {
    console.error('❌ Error searching bible:', error);
    bblVerseDiv.innerHTML = '';
  } finally {
    bblVerseDiv.classList.remove('loading');
  }
}

async function filterVersicles(query) {
  return /\d/.test(query) ? await searchCharacters(query) : await searchInBibleText(query);
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
