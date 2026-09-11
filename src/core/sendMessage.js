import { processVerseText } from '../api/getData.js';
import { getBibleMap } from '../config/bibleConfig.js';
import { addEntry, isCurrentlyRecording } from './resumeManager.js';
import { isContentVisible, setOnAirVerse, getOnAirVerse } from './appState.js';

const messageChannel = new BroadcastChannel('myChannel');
const historyButton = document.getElementById('history');
const CLICK_DEBOUNCE_MS = 300;
const BIBLE_MAP = getBibleMap();

let verseHistory = [];
let lastSelectedVerse = null;

/**
 * Sends free-form text message to browser overlay
 * Font size will be pre-calculated automatically on receive
 */
function sendFreeTextMessage() {
  const message = document.getElementById('messageInput').value;
  messageChannel.postMessage(message);
  console.log('📤 Free text sent (font size will be pre-calculated)');
}

const sendButton = document.getElementById('sendButton');
if (sendButton) {
  sendButton.addEventListener('click', sendFreeTextMessage);
}

/**
 * Handles keyboard shortcut for sending message (Ctrl + ArrowDown)
 */
function handleKeyboardShortcut(event) {
  if (event.ctrlKey && event.code === 'ArrowDown') {
    const message = document.getElementById('messageInput').value;
    messageChannel.postMessage(message);
  }
}

/**
 * Creates HTML list from input and sends to browser overlay
 */
function sendListMessage() {
  const listTitle = document.getElementById('listTitle').value;
  const listItems = document.getElementById('listItems').value;
  const itemsArray = listItems.split('\n');

  const listElement = document.createElement('ul');
  itemsArray.forEach((itemText) => {
    const listItem = document.createElement('li');
    listItem.textContent = itemText;
    listElement.appendChild(listItem);
  });

  const message = `<span>${listTitle}</span>\n${listElement.outerHTML}`;
  messageChannel.postMessage(message);
  console.log('📤 List sent (font size will be pre-calculated)');
}

document.getElementById('sendList').addEventListener('click', sendListMessage);
document.addEventListener('keyup', handleKeyboardShortcut, false);

/**
 * Refreshes the "on air" status strip and the highlighted row so an operator
 * can tell what's actually visible on the overlay right now, even after
 * scrolling through a long result list or running a new search.
 */
function updateOnAirStatusUI() {
  const statusEl = document.getElementById('on-air-status');
  if (!statusEl) return;

  const onAir = getOnAirVerse();
  const visible = isContentVisible();

  document.querySelectorAll('#bible-verse p.on-air-row').forEach((el) => {
    el.classList.remove('on-air-row');
  });

  if (!onAir) {
    statusEl.className = 'on-air-status is-empty';
    statusEl.textContent = 'Ningún versículo mostrado todavía';
    return;
  }

  if (visible) {
    statusEl.className = 'on-air-status is-live';
    const rowEl = document.getElementById(onAir.id);
    const previewText = rowEl?.querySelector('.verse-text')?.textContent.trim() || '';
    const preview =
      previewText.length > 60 ? `${previewText.slice(0, 60).trim()}…` : previewText;

    statusEl.innerHTML = `
      <span class="on-air-dot"></span>
      <span class="on-air-label">EN DIRECTO</span>
      <span class="on-air-ref">${onAir.label}</span>
      <span class="on-air-preview">${preview}</span>
      <button type="button" class="on-air-jump" id="on-air-jump">ir ↓</button>
    `;

    if (rowEl) {
      rowEl.classList.add('on-air-row');
      document
        .getElementById('on-air-jump')
        ?.addEventListener('click', () => rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  } else {
    statusEl.className = 'on-air-status is-ready';
    statusEl.textContent = `Listo para mostrar: ${onAir.label}`;
  }
}

/**
 * Updates visual selection state of verses in the panel
 * Highlights the selected verse and deselects all others
 */
function updateVerseSelection(selectedVerse, selectedIndex) {
  const bibleVerseContainer = document.getElementById('bible-verse');
  const allVerses = bibleVerseContainer.querySelectorAll('p');

  allVerses.forEach((verse, index) => {
    verse.classList.remove('selected');
    if (index !== selectedIndex) {
      verse.style.backgroundColor = '#222222';
    }
  });

  selectedVerse.classList.add('selected');
  selectedVerse.style.backgroundColor = '#222255';

  console.log(`✨ Verse selected: ${selectedVerse.id}`);
}

/**
 * Attaches click event handler to a verse element
 * Sends the verse to the browser overlay when clicked
 */
function displayBible(verse, index) {
  let lastClickTime = 0;

  verse.addEventListener('click', (event) => {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < CLICK_DEBOUNCE_MS) {
      console.log('⏭️ Click ignored (too rapid)');
      return;
    }
    lastClickTime = currentTime;

    const clickedVerse = event.target.tagName === 'P' ? event.target : event.target.closest('p');

    if (!clickedVerse) return;

    console.log(`📖 Verse selected: ${clickedVerse.id}`);

    const bibleVersionSelect = document.getElementById('bible-version');
    const versionCode = bibleVersionSelect ? bibleVersionSelect.value.toLowerCase() : '';
    const versionName =
      versionCode && BIBLE_MAP[versionCode] ? BIBLE_MAP[versionCode].name.toUpperCase() : '';

    const titleSpan = clickedVerse.querySelector('span');
    const verseTextDiv = clickedVerse.querySelector('.verse-text');
    const title = titleSpan ? titleSpan.textContent : '';

    let verseText = '';
    if (verseTextDiv) {
      verseText = verseTextDiv.textContent;
    } else {
      const fullText = clickedVerse.textContent;
      verseText = title ? fullText.replace(title, '').trim() : fullText;
    }

    const cleanedText = processVerseText(verseText);

    let messageHtml = '';
    if (title) {
      messageHtml += `<span>${title}${versionName ? ' - ' + versionName : ''}</span>`;
    }
    messageHtml += cleanedText;

    clickedVerse.classList.add('clicked');
    setTimeout(() => clickedVerse.classList.remove('clicked'), 300);

    // Store last selected verse for resume feature
    lastSelectedVerse = {
      title: title,
      versionName: versionName,
      text: verseText,
    };

    // Add to resume if recording AND content is visible
    if (isCurrentlyRecording() && isContentVisible()) {
      addEntry({
        title: title,
        versionName: versionName,
      });
    }

    messageChannel.postMessage(messageHtml);
    console.log(`📚 Sending verse with version: ${versionName}`);
    console.log('ℹ️ Font size will be pre-calculated automatically');

    updateVerseSelection(clickedVerse, index);

    setOnAirVerse({ id: clickedVerse.id, label: title || versionName || 'Versículo' });
    updateOnAirStatusUI();

    addToHistory(clickedVerse.id, messageHtml);
  });

  verse.setAttribute('role', 'button');
  verse.setAttribute('tabindex', '0');
  verse.setAttribute('aria-label', `Select verse ${verse.textContent.substring(0, 50)}...`);

  verse.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      verse.click();
    }
  });
}

/**
 * Adds a verse to the history with size limit
 */
function addToHistory(verseName, verseText) {
  const MAX_HISTORY_SIZE = 20;

  verseHistory.push({
    name: verseName,
    verse: verseText,
  });

  if (verseHistory.length > MAX_HISTORY_SIZE) {
    verseHistory.shift();
  }
}

/**
 * Displays verse history when history button is clicked
 */
function showHistory() {
  const verseContainer = document.getElementById('bible-verse');
  verseContainer.innerHTML = '';

  verseHistory.forEach((entry, index) => {
    const verseElement = document.createElement('p');
    verseElement.id = entry.name;
    verseElement.innerHTML = entry.verse;
    verseContainer.appendChild(verseElement);
    displayBible(verseElement, index);
  });
}

historyButton.addEventListener('click', showHistory);

/**
 * Get last selected verse info for resume
 */
function getLastSelectedVerse() {
  return lastSelectedVerse;
}

export { displayBible, getLastSelectedVerse, updateOnAirStatusUI };
