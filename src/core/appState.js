/**
 * Shared application state
 */

let contentVisible = false;

export function setContentVisible(visible) {
  contentVisible = visible;
}

export function isContentVisible() {
  return contentVisible;
}
