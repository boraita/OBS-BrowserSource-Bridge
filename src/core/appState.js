/**
 * Shared application state
 */

let contentVisible = false;
let onAirVerse = null;
let onAirBibleCode = null;
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
 * Which Bible version the on-air verse was actually sent from — distinct
 * from "currently selected chip", which can change (e.g. the operator
 * browsing another translation) without anything new having been shown yet.
 */
export function setOnAirBibleCode(code) {
  onAirBibleCode = code ? code.toLowerCase() : null;
}

export function getOnAirBibleCode() {
  return onAirBibleCode;
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
