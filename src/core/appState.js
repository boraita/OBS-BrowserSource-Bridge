/**
 * Shared application state
 */

let contentVisible = false;
let onAirVerse = null;
let searchMode = 'reference';

export function setContentVisible(visible) {
  contentVisible = visible;
}

export function isContentVisible() {
  return contentVisible;
}

/**
 * Tracks which verse row is currently the one shown on the overlay,
 * so the panel can show a persistent "on air" indicator that survives
 * scrolling through a long result list.
 * @param {{id: string, label: string} | null} verse
 */
export function setOnAirVerse(verse) {
  onAirVerse = verse;
}

export function getOnAirVerse() {
  return onAirVerse;
}

/**
 * Which search mode the operator picked in the panel: 'reference' (book +
 * chapter/verse lookup) or 'text' (keyword search across verse content).
 */
export function setSearchMode(mode) {
  searchMode = mode === 'text' ? 'text' : 'reference';
}

export function getSearchMode() {
  return searchMode;
}
