/**
 * Shared application state
 */

let contentVisible = false;
let onAirVerse = null;

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
