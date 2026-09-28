/**
 * Resume Manager - Tracks timestamps when verses are shown during recording
 */

let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let resumeEntries = [];

// Entries are persisted per calendar day (local time) so a service's resume
// survives closing OBS and past days stay available until deleted.
const HISTORY_STORAGE_KEY = 'resumeHistory';
let activeDayKey = getDayKey();

/**
 * Local-time YYYY-MM-DD key for a date
 */
function getDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Human-readable label for a YYYY-MM-DD key
 */
function formatDayLabel(dayKey) {
  if (dayKey === getDayKey()) return 'Today';
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Read the per-day history from localStorage
 * @returns {Object<string, Array>} entries keyed by YYYY-MM-DD
 */
function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  } catch (error) {
    console.error('❌ Failed to read resume history:', error);
    return {};
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('❌ Failed to save resume history:', error);
    showNotification('Failed to save resume history', 'error');
  }
}

/**
 * Write the active day's entries into the history (removing the day when empty)
 */
function persistActiveDay() {
  const history = loadHistory();
  if (resumeEntries.some((entry) => entry.type === 'entry')) {
    history[activeDayKey] = resumeEntries;
  } else {
    delete history[activeDayKey];
  }
  saveHistory(history);
  renderHistoryList();
}

/**
 * Plain-text version of a list of entries, as copied to the clipboard:
 * one line per verse with a blank line between them
 */
function formatEntriesAsText(entries) {
  return entries
    .filter((entry) => entry.type === 'entry')
    .map(formatEntryLine)
    .join('\n\n');
}

/**
 * Format milliseconds to MM:SS, or HH:MM:SS from the first hour on
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => value.toString().padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * One resume line: "49:09 (Génesis 4:6)*Kadosh Israelita|"
 */
function formatEntryLine(entry) {
  return `${entry.timestamp} ${entry.description}`;
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
  const timerDisplay = document.getElementById('resume-timer-display');
  if (timerDisplay && recordingStartTime) {
    const elapsed = Date.now() - recordingStartTime;
    timerDisplay.textContent = formatTime(elapsed);
  }
}

/**
 * Start recording session
 * @param {boolean} fromOBS - If true, started automatically by OBS
 */
function startRecording(fromOBS = false) {
  if (isRecording) return;

  isRecording = true;
  recordingStartTime = Date.now();

  // A recording started on a new day belongs to that day's resume
  const todayKey = getDayKey();
  if (todayKey !== activeDayKey) {
    activeDayKey = todayKey;
    resumeEntries = loadHistory()[todayKey] || [];
    renderResumeList();
  }

  // Add separator if there are previous entries
  if (resumeEntries.length > 0) {
    resumeEntries.push({ type: 'separator' });
  }

  // Update UI
  const startBtn = document.getElementById('resume-start-btn');
  const stopBtn = document.getElementById('resume-stop-btn');
  const statusEl = document.getElementById('resume-status');

  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = fromOBS; // Disable manual stop if auto mode
  if (statusEl) {
    statusEl.textContent = fromOBS ? 'Recording (Auto)' : 'Recording';
    statusEl.className = 'resume-status-recording';
  }

  // Start timer
  timerInterval = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();

  console.log(`🎬 Resume recording started${fromOBS ? ' (by OBS)' : ''}`);
}

/**
 * Stop recording session
 * @param {boolean} fromOBS - If true, stopped automatically by OBS
 */
function stopRecording(fromOBS = false) {
  if (!isRecording) return;

  isRecording = false;

  // Update UI
  const startBtn = document.getElementById('resume-start-btn');
  const stopBtn = document.getElementById('resume-stop-btn');
  const statusEl = document.getElementById('resume-status');

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (statusEl) {
    statusEl.textContent = 'Stopped';
    statusEl.className = 'resume-status-stopped';
  }

  // Stop timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  console.log(`⏹️ Resume recording stopped${fromOBS ? ' (by OBS)' : ''}`);
}

/**
 * Add entry when verse is shown
 * @param {Object} verseInfo - Object with title and versionName
 */
function addEntry(verseInfo) {
  if (!isRecording || !recordingStartTime) return;

  const elapsed = Date.now() - recordingStartTime;
  const timestamp = formatTime(elapsed);

  // Build description from verse info: "(Génesis 4:6)*Kadosh Israelita|"
  let description = '';
  const reference = verseInfo && (verseInfo.reference || verseInfo.title);
  if (reference) {
    const version = verseInfo.versionLabel || verseInfo.versionName || '';
    description = `(${reference})*${version}|`;
  } else {
    description = 'Verse shown';
  }

  const entry = {
    type: 'entry',
    timestamp,
    description,
    rawTime: elapsed,
  };

  resumeEntries.push(entry);
  persistActiveDay();
  renderResumeList();

  console.log(`📝 Resume entry added: ${timestamp} ${description}`);
}

/**
 * Render the resume list in the UI
 */
function renderResumeList() {
  const listContainer = document.getElementById('resume-list');
  if (!listContainer) return;

  if (resumeEntries.length === 0) {
    listContainer.innerHTML =
      '<p class="resume-empty">Press Start and show verses to record timestamps</p>';
    return;
  }

  let html = '';
  resumeEntries.forEach((entry, index) => {
    if (entry.type === 'separator') {
      html += '<div class="resume-separator">--- New recording ---</div>';
    } else {
      html += `
        <div class="resume-entry" data-index="${index}">
          <span class="resume-timestamp">${entry.timestamp}</span>
          <span class="resume-description">${entry.description}</span>
        </div>
      `;
    }
  });

  listContainer.innerHTML = html;

  // Scroll to bottom
  listContainer.scrollTop = listContainer.scrollHeight;
}

/**
 * Copy resume to clipboard
 */
function copyToClipboard() {
  copyEntries(resumeEntries);
}

/**
 * Copy a list of entries to clipboard
 */
function copyEntries(entries) {
  if (!entries.some((entry) => entry.type === 'entry')) {
    showNotification('No entries to copy', 'info');
    return;
  }

  navigator.clipboard
    .writeText(formatEntriesAsText(entries))
    .then(() => {
      showNotification('📋 Copied to clipboard!', 'success');
    })
    .catch((err) => {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy', 'error');
    });
}

/**
 * Clear all entries
 */
function clearEntries() {
  resumeEntries = [];
  persistActiveDay();
  renderResumeList();

  // Reset timer display
  const timerDisplay = document.getElementById('resume-timer-display');
  if (timerDisplay) {
    timerDisplay.textContent = '00:00';
  }

  showNotification('🗑️ Resume cleared', 'info');
}

/**
 * Delete one day from the history
 */
function deleteHistoryDay(dayKey) {
  const history = loadHistory();
  delete history[dayKey];
  saveHistory(history);

  if (dayKey === activeDayKey) {
    resumeEntries = [];
    renderResumeList();
  }

  renderHistoryList();
  showNotification(`🗑️ ${formatDayLabel(dayKey)} deleted`, 'info');
}

/**
 * Button that asks for a second click before running a destructive action
 */
function createConfirmButton(label, onConfirm) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'resume-btn secondary-btn resume-history-btn';
  button.textContent = label;

  let resetTimer = null;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (button.dataset.confirming === 'true') {
      clearTimeout(resetTimer);
      onConfirm();
      return;
    }

    button.dataset.confirming = 'true';
    button.textContent = 'Confirm?';
    resetTimer = setTimeout(() => {
      button.dataset.confirming = 'false';
      button.textContent = label;
    }, 3000);
  });

  return button;
}

/**
 * Render the per-day history list
 */
function renderHistoryList() {
  const historyContainer = document.getElementById('resume-history-list');
  if (!historyContainer) return;

  const history = loadHistory();
  const dayKeys = Object.keys(history).sort().reverse();

  historyContainer.replaceChildren();

  if (dayKeys.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'resume-empty';
    empty.textContent = 'No saved days yet';
    historyContainer.appendChild(empty);
    return;
  }

  dayKeys.forEach((dayKey) => {
    const entries = Array.isArray(history[dayKey]) ? history[dayKey] : [];
    const verseCount = entries.filter((entry) => entry.type === 'entry').length;

    const day = document.createElement('details');
    day.className = 'resume-history-day';

    const summary = document.createElement('summary');

    const label = document.createElement('span');
    label.className = 'resume-history-label';
    label.textContent = formatDayLabel(dayKey);

    const count = document.createElement('span');
    count.className = 'resume-history-count';
    count.textContent = `${verseCount} ${verseCount === 1 ? 'verse' : 'verses'}`;

    const actions = document.createElement('span');
    actions.className = 'resume-history-actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'resume-btn secondary-btn resume-history-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      copyEntries(entries);
    });

    actions.append(
      copyBtn,
      createConfirmButton('🗑️ Delete', () => deleteHistoryDay(dayKey))
    );
    summary.append(label, count, actions);
    day.appendChild(summary);

    const list = document.createElement('div');
    list.className = 'resume-list resume-history-entries';
    entries.forEach((entry) => {
      if (entry.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'resume-separator';
        separator.textContent = '--- New recording ---';
        list.appendChild(separator);
        return;
      }

      const row = document.createElement('div');
      row.className = 'resume-entry';
      const timestamp = document.createElement('span');
      timestamp.className = 'resume-timestamp';
      timestamp.textContent = entry.timestamp;
      const description = document.createElement('span');
      description.className = 'resume-description';
      description.textContent = entry.description;
      row.append(timestamp, description);
      list.appendChild(row);
    });
    day.appendChild(list);

    historyContainer.appendChild(day);
  });
}

/**
 * Show notification (reuse from control_app or create simple one)
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'obs-notification';
  notification.textContent = message;

  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3',
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${colors[type] || colors.info};
    color: white;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Initialize resume manager
 */
function initResumeManager() {
  console.log('📋 Initializing Resume Manager...');

  const startBtn = document.getElementById('resume-start-btn');
  const stopBtn = document.getElementById('resume-stop-btn');
  const copyBtn = document.getElementById('resume-copy-btn');
  const clearBtn = document.getElementById('resume-clear-btn');

  // Wrapped so the click event isn't passed as the `fromOBS` flag
  if (startBtn) startBtn.addEventListener('click', () => startRecording());
  if (stopBtn) stopBtn.addEventListener('click', () => stopRecording());
  if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
  if (clearBtn) clearBtn.addEventListener('click', clearEntries);

  // Restore today's resume and the saved days
  resumeEntries = loadHistory()[activeDayKey] || [];
  renderResumeList();
  renderHistoryList();

  console.log('✅ Resume Manager initialized');
}

/**
 * Check if currently recording
 */
function isCurrentlyRecording() {
  return isRecording;
}

export {
  initResumeManager,
  startRecording,
  stopRecording,
  addEntry,
  isCurrentlyRecording,
  copyToClipboard,
  clearEntries,
};
