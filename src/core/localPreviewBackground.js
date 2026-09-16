/**
 * Dev-only: lets a plain browser tab preview the transparent overlay over a
 * real photo, since a normal tab has no video feed behind it like OBS does.
 * Completely inert unless ?previewBg=<url> is in the page URL, so the real
 * Browser Source in OBS (whose URL never has this param) is unaffected.
 */
const previewBg = new URLSearchParams(window.location.search).get('previewBg');

if (previewBg) {
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  console.log(`🖼️ Local preview background active: ${previewBg}`);

  // Tracks the same "Mostrar"/"Ocultar" state as #bg-container, so the
  // stand-in photo only appears while actually presenting — matching what
  // this preview is for (checking the look while live), instead of always
  // sitting there regardless of show/hide.
  document.body.style.backgroundImage = 'none';
  const visibilityChannel = new BroadcastChannel('bgContent');
  visibilityChannel.onmessage = (event) => {
    document.body.style.backgroundImage = event.data === 'shown' ? `url('${previewBg}')` : 'none';
  };

  // This module is imported LAST in browser.ts (after load_settings.js),
  // so this line runs after that file's own "no bgColor saved yet → default
  // to opaque white" logic — otherwise that default would immediately
  // overwrite this and hide the photo the moment "Mostrar" reveals the
  // container. A real settingsChannel/CustomEvent message from the panel
  // (e.g. via "Reenviar al overlay") arrives later/async and correctly
  // overrides this with the operator's actual configured look.
  const bgContainer = document.getElementById('bg-container');
  if (bgContainer) {
    bgContainer.style.backgroundColor = 'transparent';
  }
}
