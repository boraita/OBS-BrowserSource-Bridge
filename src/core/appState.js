/**
 * Shared application state
 */

let contentVisible = false;
let onAirVerse = null;
let onAirBibleCode = null;
let onAirSearchContext = null;
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
 * The search (query + mode) that was active when the on-air verse was
 * clicked, so "ir" can reconstruct that exact list after the operator has
 * browsed away to a different Bible/query while live — not just switch the
 * Bible back, but bring the same result row back into the DOM to scroll to.
 * @param {{query: string, mode: string} | null} context
 */
export function setOnAirSearchContext(context) {
  onAirSearchContext = context;
}

export function getOnAirSearchContext() {
  return onAirSearchContext;
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
