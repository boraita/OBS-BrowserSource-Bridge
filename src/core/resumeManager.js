/**
 * Resume Manager - Tracks timestamps when verses are shown during recording
 */

let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let resumeEntries = [];

/**
 * Format milliseconds to MM:SS
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

  // Build description from verse info
  let description = '';
  if (verseInfo && verseInfo.title) {
    description = verseInfo.title;
    if (verseInfo.versionName) {
      description += ` - ${verseInfo.versionName}`;
    }
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
  if (resumeEntries.length === 0) {
    showNotification('No entries to copy', 'info');
    return;
  }

  let text = '';
  resumeEntries.forEach((entry) => {
    if (entry.type === 'separator') {
      text += '\n--- New recording ---\n\n';
    } else {
      text += `${entry.timestamp} ${entry.description}\n`;
    }
  });

  navigator.clipboard
    .writeText(text.trim())
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
  renderResumeList();

  // Reset timer display
  const timerDisplay = document.getElementById('resume-timer-display');
  if (timerDisplay) {
    timerDisplay.textContent = '00:00';
  }

  showNotification('🗑️ Resume cleared', 'info');
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

  if (startBtn) startBtn.addEventListener('click', startRecording);
  if (stopBtn) stopBtn.addEventListener('click', stopRecording);
  if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
  if (clearBtn) clearBtn.addEventListener('click', clearEntries);

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
