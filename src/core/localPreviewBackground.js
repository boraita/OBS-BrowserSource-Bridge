/**
 * Dev-only: lets a plain browser tab preview the transparent overlay over a
 * real photo, since a normal tab has no video feed behind it like OBS does.
 * Completely inert unless ?previewBg=<url> is in the page URL, so the real
 * Browser Source in OBS (whose URL never has this param) is unaffected.
 */
const previewBg = new URLSearchParams(window.location.search).get('previewBg');

if (previewBg) {
  document.body.style.backgroundImage = `url('${previewBg}')`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  console.log(`🖼️ Local preview background active: ${previewBg}`);
}
