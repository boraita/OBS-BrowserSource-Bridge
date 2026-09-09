/**
 * Progressive-enhancement wrapper for the Settings tab: turns the existing
 * `.settings-section` blocks into native <details> accordions with a live
 * one-line summary, and shows a persistent on-air pill. Deliberately does
 * NOT touch any control's id/wiring in settings.js — it only moves each
 * section's existing children into a <details> body, so every getElementById
 * lookup and event listener already set up elsewhere keeps working.
 */
import { isContentVisible } from './appState.js';

const SECTIONS = [
  { id: 'textSettings', openByDefault: true, summarize: summarizeTextSettings },
  { id: 'backgroundSettings', openByDefault: false, summarize: summarizeBackgroundSettings },
  { id: 'titleSettings', openByDefault: false, summarize: summarizeTitleSettings },
  { id: 'animationSettings', openByDefault: false, summarize: summarizeAnimationSettings },
];

function wrapSectionInAccordion(section, openByDefault) {
  const heading = section.querySelector(':scope > h3');
  if (!heading) return null;

  const headingText = heading.textContent;
  heading.remove();

  const details = document.createElement('details');
  details.className = 'settings-accordion-item';
  details.open = !!openByDefault;

  const summary = document.createElement('summary');
  summary.className = 'settings-accordion-summary';
  summary.innerHTML =
    `<span class="settings-accordion-title">${headingText}</span>` +
    `<span class="settings-accordion-state" id="${section.id}-state"></span>`;
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'settings-accordion-body';
  while (section.firstChild) {
    body.appendChild(section.firstChild);
  }
  details.appendChild(body);
  section.appendChild(details);

  return document.getElementById(`${section.id}-state`);
}

function fieldValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : null;
}

function isChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function isBold(id) {
  const el = document.getElementById(id);
  return !!el && el.style.fontWeight === 'bold';
}

const ANIMATION_LABELS = {
  none: 'Ninguna',
  fadeIn: 'Fade In',
  slideInFromLeft: 'Desde izquierda',
  slideInFromRight: 'Desde derecha',
  slideInFromTop: 'Desde arriba',
  slideInFromBottom: 'Desde abajo',
  zoomIn: 'Zoom',
  typewriter: 'Máquina de escribir',
  illuminate: 'Illuminate',
};

function summarizeTextSettings() {
  const font = fieldValue('fontStyle');
  const styleFlags = [
    isBold('bold') && 'negrita',
    isBold('italic') && 'cursiva',
    isBold('underline') && 'subrayado',
  ].filter(Boolean);
  return [font, styleFlags.join('/')].filter(Boolean).join(' · ') || 'Sin configurar';
}

function summarizeBackgroundSettings() {
  const type = fieldValue('backgroundType');
  const color = fieldValue('bgColor');
  return [type, color].filter(Boolean).join(' · ') || 'Sin configurar';
}

function summarizeTitleSettings() {
  const enabled = isChecked('titleBoxEnabled');
  const alignment = fieldValue('titleAlignment');
  return enabled ? `Con caja · ${alignment || 'izquierda'}` : `Sin caja · ${alignment || 'izquierda'}`;
}

function summarizeAnimationSettings() {
  const type = fieldValue('textAnimation');
  const duration = fieldValue('animationDuration');
  const label = ANIMATION_LABELS[type] || type || 'Ninguna';
  return duration ? `${label} · ${duration}s` : label;
}

function refreshSummaries(stateElements) {
  SECTIONS.forEach(({ id, summarize }) => {
    const el = stateElements[id];
    if (el) el.textContent = summarize();
  });
}

function refreshOnAirPill(pillEl) {
  if (!pillEl) return;
  if (isContentVisible()) {
    pillEl.className = 'on-air-pill is-live';
    pillEl.innerHTML = '<span class="on-air-dot"></span>En aire — los cambios se ven en vivo';
  } else {
    pillEl.className = 'on-air-pill is-off';
    pillEl.textContent = 'Fuera de aire — los cambios se aplican al mostrar el próximo texto';
  }
}

function initSettingsAccordion() {
  const setBg = document.getElementById('setBg');
  if (!setBg) return;

  const quickSettings = document.getElementById('quickSettings');
  const pill = document.createElement('div');
  pill.id = 'on-air-pill';
  if (quickSettings && quickSettings.parentNode) {
    quickSettings.parentNode.insertBefore(pill, quickSettings);
  }
  refreshOnAirPill(pill);

  const stateElements = {};
  SECTIONS.forEach(({ id, openByDefault }) => {
    const section = document.getElementById(id);
    if (section) {
      stateElements[id] = wrapSectionInAccordion(section, openByDefault);
    }
  });
  refreshSummaries(stateElements);

  // One delegated listener covers every current and future control inside
  // the settings tab, instead of touching each of settings.js's own handlers.
  setBg.addEventListener('input', () => refreshSummaries(stateElements));
  setBg.addEventListener('change', () => refreshSummaries(stateElements));

  // The existing "quick settings" nav links jump to a section by id — that
  // section may now be a collapsed <details>, so open it explicitly rather
  // than relying on the browser's (version-dependent) anchor auto-expand.
  document.querySelectorAll('.settings-map-item').forEach((link) => {
    link.addEventListener('click', () => {
      const targetId = link.getAttribute('href')?.slice(1);
      const target = targetId && document.getElementById(targetId);
      const details = target && target.querySelector('details');
      if (details) details.open = true;
    });
  });

  window.refreshOnAirPill = () => refreshOnAirPill(pill);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsAccordion);
} else {
  initSettingsAccordion();
}
