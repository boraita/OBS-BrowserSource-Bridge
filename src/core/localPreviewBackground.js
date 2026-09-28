/**
 * Dev-only: lets a plain browser tab preview the transparent overlay over
 * real photos, since a normal tab has no video feed behind it like OBS
 * does. Completely inert unless ?previewBg=<url> is in the page URL, so the
 * real Browser Source in OBS (whose URL never has this param) is unaffected.
 */
const previewParams = new URLSearchParams(window.location.search);
const previewBg = previewParams.get('previewBg');
const previewBgHidden = previewParams.get('previewBgHidden');

if (previewBg) {
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  console.log(
    `🖼️ Local preview background active: ${previewBg}${previewBgHidden ? ` (hidden: ${previewBgHidden})` : ''}`
  );

  // Tracks the same "Mostrar"/"Ocultar" state as #bg-container: previewBg
  // (e.g. the live camera feed) shows while presenting, previewBgHidden
  // (e.g. a "starting soon" slide) shows while hidden — or nothing if it
  // wasn't given, same as before.
  const setPreviewImage = (visible) => {
    const url = visible ? previewBg : previewBgHidden;
    document.body.style.backgroundImage = url ? `url('${url}')` : 'none';
  };

  setPreviewImage(false);
  const visibilityChannel = new BroadcastChannel('bgContent');
  visibilityChannel.onmessage = (event) => setPreviewImage(event.data === 'shown');

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
