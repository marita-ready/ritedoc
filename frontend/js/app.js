/**
 * RiteDoc — Frontend Application
 * Technology-assisted documentation drafting for NDIS support workers
 * 
 * This file handles all UI logic, screen navigation, and communication
 * with the Tauri backend via invoke commands.
 */

// ===== STATE =====
const state = {
  currentScreen: 's0',
  notes: [],
  processedNotes: [],
  totalNotes: 0,
  processedCount: 0,
  isProcessing: false,
  batchStartTime: null,
  currentMissingNote: null,
  participantProfiles: {},
};

// ===== TAURI API BRIDGE =====
// Detects whether running in Tauri or standalone browser mode
const isTauri = window.__TAURI__ !== undefined;

async function invokeCommand(cmd, args = {}) {
  if (isTauri) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  // Browser fallback — simulate commands for development/testing
  return simulateCommand(cmd, args);
}

// ===== SCREEN NAVIGATION =====
function showScreen(screenId) {
  // Deactivate all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  // Activate target screen
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');
    state.currentScreen = screenId;
  }
  
  // Update nav buttons
  const navBtn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
  if (navBtn) navBtn.classList.add('active');
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== CLIPBOARD =====
async function copyToClipboard(text) {
  try {
    if (isTauri) {
      await window.__TAURI__.clipboardManager.writeText(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    showToast('Copied to clipboard');
  } catch (e) {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard');
  }
}

// ===== FILE HANDLING =====
function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const btnBrowse = document.getElementById('btnBrowse');
  
  // Click to browse
  dropzone.addEventListener('click', (e) => {
    if (e.target !== btnBrowse) {
      fileInput.click();
    }
  });
  
  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });
  
  // Drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
}

async function handleFile(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please select a CSV file');
    return;
  }
  
  // Show processing state
  document.getElementById('dropzone').style.display = 'none';
  document.getElementById('processingCard').style.display = 'block';
  
  state.isProcessing = true;
  state.batchStartTime = Date.now();
  
  try {
    if (isTauri) {
      // In Tauri, use the file dialog result path
      const result = await invokeCommand('parse_csv', { filePath: file.path || file.name });
      state.notes = result.notes;
      state.totalNotes = result.total_count;
      processNotesBatch();
    } else {
      // Browser mode — parse CSV client-side
      const text = await file.text();
      const parsed = parseCSVClientSide(text);
      state.notes = parsed;
      state.totalNotes = parsed.length;
      processNotesBatch();
    }
  } catch (e) {
    showToast('Error reading file: ' + e.message);
    document.getElementById('dropzone').style.display = 'block';
    document.getElementById('processingCard').style.display = 'none';
    state.isProcessing = false;
  }
}

// ===== CLIENT-SIDE CSV PARSER (Browser Mode) =====
function parseCSVClientSide(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const notes = [];
  
  // Auto-detect columns
  const colMap = detectColumns(headers);
  
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length === 0) continue;
    
    const noteText = colMap.note !== -1 ? fields[colMap.note] : '';
    if (!noteText || !noteText.trim()) continue;
    
    notes.push({
      id: generateId(),
      participant_name: colMap.participant !== -1 ? fields[colMap.participant] || '' : `Participant ${i}`,
      support_worker: colMap.worker !== -1 ? fields[colMap.worker] || '' : '',
      date: colMap.date !== -1 ? fields[colMap.date] || '' : '',
      time: colMap.time !== -1 ? fields[colMap.time] || '' : '',
      duration: colMap.duration !== -1 ? fields[colMap.duration] || '' : '',
      raw_text: noteText.trim(),
      source_platform: 'CSV Import',
      row_index: i,
    });
  }
  
  return notes;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectColumns(headers) {
  const lower = headers.map(h => h.toLowerCase().trim());
  
  const findCol = (candidates) => {
    for (const c of candidates) {
      const idx = lower.indexOf(c.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };
  
  return {
    participant: findCol(['Client Name', 'Participant', 'Client', 'Participant Name', 'Person Supported', 'participant_name', 'Name']),
    worker: findCol(['Carer Name', 'Support Worker', 'Worker', 'Staff Member', 'Staff', 'worker_name', 'Carer']),
    date: findCol(['Shift Date', 'Date', 'Service Date', 'Session Date', 'Appointment Date', 'session_date', 'Date of Service']),
    time: findCol(['Shift Time', 'Time', 'Start Time', 'Service Time', 'Session Time', 'session_time']),
    duration: findCol(['Duration', 'Hours', 'Service Duration', 'session_duration']),
    note: findCol(['Progress Notes', 'Notes', 'Note', 'Progress Note', 'Case Note', 'Session Notes', 'Shift Notes', 'progress_notes', 'progress_note', 'case_note']),
  };
}

function generateId() {
  return 'note_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ===== NOTE PROCESSING =====
async function processNotesBatch() {
  const total = state.notes.length;
  state.processedNotes = [];
  state.processedCount = 0;
  
  updateProcessingUI(0, total);
  
  // Enable results nav
  document.getElementById('navResults').disabled = false;
  
  // Process notes one by one (simulating rolling delivery)
  for (let i = 0; i < total; i++) {
    const rawNote = state.notes[i];
    
    try {
      let processed;
      if (isTauri) {
        const response = await invokeCommand('process_note', { noteJson: JSON.stringify(rawNote) });
        processed = response.note;
        
        // Check for missing data
        if (response.has_missing_data && response.missing_items.length > 0) {
          showMissingDataModal(processed, response.missing_items, i + 1);
          // Wait for modal to be resolved
          await waitForMissingDataResolution();
        }
      } else {
        // Browser simulation
        processed = simulateProcessNote(rawNote);
      }
      
      state.processedNotes.push(processed);
      state.processedCount = i + 1;
      
      updateProcessingUI(i + 1, total);
      
      // Add card to results screen
      addNoteCard(processed);
      updateResultsCounter();
      
      // Small delay for visual effect
      await sleep(100);
      
    } catch (e) {
      console.error('Error processing note:', e);
    }
  }
  
  // Processing complete
  state.isProcessing = false;
  
  // Enable summary nav
  document.getElementById('navSummary').disabled = false;
  
  // Hide rolling progress
  document.getElementById('rollingProgress').style.display = 'none';
  
  // Auto-navigate to results if still on import screen
  if (state.currentScreen === 's1') {
    showScreen('s3');
  }
  
  // Build summary
  buildBatchSummary();
}

function updateProcessingUI(processed, total) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  
  // Import screen progress
  document.getElementById('processingCount').textContent = `${processed} of ${total} complete`;
  document.getElementById('progressBarFill').style.width = `${pct}%`;
  
  const elapsed = Math.round((Date.now() - state.batchStartTime) / 1000);
  const remaining = processed > 0 ? Math.round((elapsed / processed) * (total - processed)) : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  document.getElementById('progressSub').textContent = 
    processed >= total ? 'Processing complete!' :
    `Estimated time remaining: approx. ${mins > 0 ? mins + ' minute' + (mins !== 1 ? 's' : '') + ' ' : ''}${secs} seconds`;
  
  // Rolling progress on results screen
  const rollingProgress = document.getElementById('rollingProgress');
  if (processed < total) {
    rollingProgress.style.display = 'flex';
    document.getElementById('rollingProgressFill').style.width = `${pct}%`;
    document.getElementById('rollingProgressPct').textContent = `${processed} of ${total} complete`;
  } else {
    rollingProgress.style.display = 'none';
  }
}

function updateResultsCounter() {
  document.getElementById('reviewedCount').textContent = state.processedNotes.length;
  document.getElementById('totalNotesCount').textContent = state.totalNotes;
}

// ===== NOTE CARD RENDERING =====
function addNoteCard(note) {
  const container = document.getElementById('noteCardContainer');
  
  // Sort: insert at correct position (RED first, then ORANGE, then GREEN)
  const card = createNoteCard(note);
  
  // Find insertion point
  const existingCards = container.querySelectorAll('.note-card');
  let inserted = false;
  
  const sortOrder = { 'RED': 0, 'ORANGE': 1, 'GREEN': 2 };
  const noteOrder = sortOrder[note.traffic_light] || 2;
  
  for (const existing of existingCards) {
    const existingOrder = sortOrder[existing.dataset.status] || 2;
    if (noteOrder < existingOrder) {
      container.insertBefore(card, existing);
      inserted = true;
      break;
    }
  }
  
  if (!inserted) {
    // Insert before rolling progress
    const rollingProgress = document.getElementById('rollingProgress');
    container.insertBefore(card, rollingProgress);
  }
}

function createNoteCard(note) {
  const card = document.createElement('div');
  const statusClass = note.traffic_light.toLowerCase();
  card.className = `note-card ${statusClass}`;
  card.id = `card-${note.id}`;
  card.dataset.status = note.traffic_light;
  card.dataset.noteId = note.id;
  
  // Banner
  let banner = '';
  if (note.traffic_light === 'RED') {
    banner = '<div class="needs-attention-banner">&#9888; Needs Attention</div>';
  } else if (note.traffic_light === 'ORANGE') {
    banner = '<div class="review-banner">&#9680; Review Required</div>';
  } else {
    banner = '<div class="approve-banner">&#10003; Review and Approve</div>';
  }
  
  // Preview text
  const preview = note.preview || note.rewritten_note.substring(0, 120) + '...';
  
  // Build expanded body content
  let bodyContent = '';
  
  // Red flags
  if (note.red_flags && note.red_flags.length > 0) {
    for (const flag of note.red_flags) {
      bodyContent += `
        <div class="flag-alert">
          <div class="flag-alert-icon">&#128680;</div>
          <div class="flag-alert-text">
            <div class="flag-alert-title">Red Flag Detected: ${escapeHtml(flag.category)}</div>
            ${escapeHtml(flag.description)}${flag.keywords_matched ? ' Keywords matched: ' + flag.keywords_matched.map(k => '"' + escapeHtml(k) + '"').join(', ') + '.' : ''}
          </div>
        </div>`;
      
      // Required forms
      if (flag.required_forms && flag.required_forms.length > 0) {
        bodyContent += `
          <div class="required-docs-section">
            <div class="required-docs-heading">Required Documentation — <span>${flag.required_forms.length} form(s) to file:</span></div>`;
        
        flag.required_forms.forEach((form, fi) => {
          bodyContent += `
            <div class="incident-template">
              <div class="incident-template-title">Form ${fi + 1} of ${flag.required_forms.length} — ${escapeHtml(form.form_name)}</div>`;
          
          if (form.fields) {
            for (const field of form.fields) {
              bodyContent += `
                <div class="incident-field">
                  <div class="incident-field-label">${escapeHtml(field.label)}</div>`;
              if (field.value) {
                bodyContent += `<div class="incident-field-value">${escapeHtml(field.value)}</div>`;
              } else if (field.placeholder) {
                bodyContent += `<div class="incident-field-placeholder">${escapeHtml(field.placeholder)}</div>`;
              } else if (field.is_missing) {
                bodyContent += `<div class="incident-field-placeholder">[${field.label.toUpperCase()} REQUIRED]</div>`;
              }
              bodyContent += '</div>';
            }
          }
          
          bodyContent += `
              <div class="incident-template-actions">
                <button class="btn-copy-form" onclick="copyFormToClipboard(this, '${note.id}', ${fi})">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  Copy Form
                </button>
              </div>
            </div>`;
        });
        
        bodyContent += '</div>';
      }
    }
  }
  
  // Rewritten note text with bracket flags highlighted
  const highlightedNote = highlightBracketFlags(note.rewritten_note);
  bodyContent += `<p>${highlightedNote}</p>`;
  
  // Actions
  bodyContent += `
    <div class="note-actions">
      <button class="btn-copy" onclick="copyNoteToClipboard('${note.id}')">&#128203; Copy to Clipboard</button>
      <button class="btn-done" onclick="toggleDone('${note.id}', this)">
        <input type="checkbox" class="done-checkbox" onclick="event.stopPropagation()" onchange="toggleDone('${note.id}', this.closest('.btn-done'))" /> Mark as Done
      </button>
      <button class="btn-flag-review" onclick="toggleFlagReview('${note.id}')">&#128278; Flag for Review</button>
    </div>`;
  
  card.innerHTML = `
    ${banner}
    <div class="note-card-header" onclick="toggleCardBody('${note.id}')">
      <div class="traffic-dot ${statusClass}"></div>
      <div class="note-card-meta">
        <div class="note-card-name">Participant: ${escapeHtml(note.participant_code)} — ${escapeHtml(note.participant_name)}</div>
        <div class="note-card-preview">${escapeHtml(preview)}</div>
      </div>
      <button class="note-card-expand" id="expand-${note.id}">Expand &#8595;</button>
    </div>
    <div class="note-card-body hidden" id="body-${note.id}">
      ${bodyContent}
    </div>`;
  
  return card;
}

function highlightBracketFlags(text) {
  // Replace bracket flags with styled spans
  return escapeHtml(text).replace(
    /\[([A-Z][A-Z\s\/&]+REQUIRED[^\]]*)\]/g,
    '<span class="bracket-flag">[$1]</span>'
  );
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== CARD INTERACTIONS =====
function toggleCardBody(noteId) {
  const body = document.getElementById(`body-${noteId}`);
  const btn = document.getElementById(`expand-${noteId}`);
  
  if (body.classList.contains('hidden')) {
    body.classList.remove('hidden');
    btn.innerHTML = 'Collapse &#8593;';
  } else {
    body.classList.add('hidden');
    btn.innerHTML = 'Expand &#8595;';
  }
}

function copyNoteToClipboard(noteId) {
  const note = state.processedNotes.find(n => n.id === noteId);
  if (note) {
    // Strip bracket flags for clean copy
    const cleanText = note.rewritten_note.replace(/\[([^\]]+)\]/g, '[$1]');
    copyToClipboard(cleanText);
  }
}

function copyFormToClipboard(btn, noteId, formIndex) {
  const note = state.processedNotes.find(n => n.id === noteId);
  if (!note || !note.red_flags) return;
  
  // Collect all form fields as plain text
  let formText = '';
  for (const flag of note.red_flags) {
    if (flag.required_forms && flag.required_forms[formIndex]) {
      const form = flag.required_forms[formIndex];
      formText += form.form_name + '\n';
      formText += '='.repeat(form.form_name.length) + '\n\n';
      
      if (form.fields) {
        for (const field of form.fields) {
          formText += field.label + ': ';
          formText += field.value || field.placeholder || '[REQUIRED]';
          formText += '\n';
        }
      }
    }
  }
  
  copyToClipboard(formText);
  
  // Visual feedback
  const original = btn.innerHTML;
  btn.textContent = '✓ Copied!';
  btn.style.color = 'var(--green)';
  btn.style.borderColor = 'var(--green-border)';
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.color = '';
    btn.style.borderColor = '';
  }, 1800);
}

function toggleDone(noteId, btn) {
  const note = state.processedNotes.find(n => n.id === noteId);
  if (!note) return;
  
  note.is_done = !note.is_done;
  const card = document.getElementById(`card-${noteId}`);
  
  if (note.is_done) {
    card.classList.add('done');
    const checkbox = btn.querySelector('.done-checkbox');
    if (checkbox) checkbox.checked = true;
  } else {
    card.classList.remove('done');
    const checkbox = btn.querySelector('.done-checkbox');
    if (checkbox) checkbox.checked = false;
  }
  
  if (isTauri) {
    invokeCommand('mark_note_done', { noteId, isDone: note.is_done });
  }
}

function toggleFlagReview(noteId) {
  const note = state.processedNotes.find(n => n.id === noteId);
  if (!note) return;
  
  note.is_flagged = !note.is_flagged;
  showToast(note.is_flagged ? 'Note flagged for review' : 'Flag removed');
  
  if (isTauri) {
    invokeCommand('flag_note_review', { noteId, isFlagged: note.is_flagged });
  }
}

// ===== MISSING DATA MODAL =====
let missingDataResolve = null;

function showMissingDataModal(note, missingItems, noteIndex) {
  const modal = document.getElementById('missingDataModal');
  
  document.getElementById('modalTitle').textContent = 
    `The following information is needed for ${note.participant_name}:`;
  document.getElementById('modalSub').textContent = 
    'Please provide what you can. If something is not available, use the button below each item.';
  document.getElementById('modalNoteRef').textContent = `Progress Note #${noteIndex}`;
  
  const container = document.getElementById('missingItemsContainer');
  container.innerHTML = '';
  
  missingItems.forEach((item, idx) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'missing-item';
    itemEl.id = `missing-item-${idx}`;
    itemEl.innerHTML = `
      <div class="missing-item-label">${escapeHtml(item.field_name)}</div>
      <div class="missing-item-reason">${escapeHtml(item.reason)}</div>
      <input class="missing-item-input" type="text" id="missing-input-${idx}" 
             placeholder="e.g. ${getPlaceholderExample(item.field_name)}" />
      <div class="missing-item-actions">
        <button class="btn-submit" onclick="submitMissingItem('${note.id}', ${idx}, '${escapeAttr(item.field_name)}')">Submit</button>
        <div style="position:relative; display:inline-block;">
          <button class="btn-na" onclick="skipMissingItem('${note.id}', ${idx}, '${escapeAttr(item.field_name)}')">
            Not Available At This Time
            <span class="na-tooltip">The note will be written to the highest standard with a placeholder for you to complete later.</span>
          </button>
        </div>
      </div>`;
    container.appendChild(itemEl);
  });
  
  state.currentMissingNote = { note, missingItems, resolved: 0, total: missingItems.length };
  modal.classList.add('active');
}

function getPlaceholderExample(fieldName) {
  const examples = {
    'Participant Goal': 'Goal 2: Increase independence with daily living tasks',
    'Date and Time': '17 March 2026, 9:00 AM',
    'Support Start Time': '9:00 AM',
    'Support End Time': '11:00 AM',
    'Duration': '2 hours',
  };
  return examples[fieldName] || 'Enter information here';
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function submitMissingItem(noteId, itemIndex, fieldName) {
  const input = document.getElementById(`missing-input-${itemIndex}`);
  const value = input.value.trim();
  
  if (!value) {
    input.style.borderColor = 'var(--red)';
    setTimeout(() => input.style.borderColor = '', 2000);
    return;
  }
  
  // Update the note
  const note = state.processedNotes.find(n => n.id === noteId) || 
               (state.currentMissingNote && state.currentMissingNote.note);
  
  if (note && note.missing_data) {
    const item = note.missing_data.find(md => md.field_name === fieldName);
    if (item) {
      item.submitted_value = value;
      note.rewritten_note = note.rewritten_note.replace(item.placeholder, value);
    }
  }
  
  // Save goal if it's a participant goal
  if (fieldName.toLowerCase().includes('goal') && note) {
    saveParticipantGoal(note.participant_name, value);
  }
  
  // Mark item as resolved visually
  const itemEl = document.getElementById(`missing-item-${itemIndex}`);
  itemEl.style.opacity = '0.5';
  itemEl.innerHTML = `
    <div class="missing-item-label" style="color: var(--green);">&#10003; ${escapeHtml(fieldName)} — Submitted</div>
    <div class="missing-item-reason" style="color: var(--green);">${escapeHtml(value)}</div>`;
  
  if (isTauri) {
    invokeCommand('submit_missing_data', { noteId, fieldName, value });
  }
  
  checkMissingDataComplete();
}

function skipMissingItem(noteId, itemIndex, fieldName) {
  const itemEl = document.getElementById(`missing-item-${itemIndex}`);
  itemEl.style.opacity = '0.5';
  itemEl.innerHTML = `
    <div class="missing-item-label" style="color: var(--orange);">&#9680; ${escapeHtml(fieldName)} — Not Available At This Time</div>
    <div class="missing-item-reason" style="color: var(--text-muted);">A placeholder has been included in the note for you to complete later.</div>`;
  
  checkMissingDataComplete();
}

function checkMissingDataComplete() {
  if (!state.currentMissingNote) return;
  
  state.currentMissingNote.resolved++;
  
  if (state.currentMissingNote.resolved >= state.currentMissingNote.total) {
    // Close modal after brief delay
    setTimeout(() => {
      document.getElementById('missingDataModal').classList.remove('active');
      state.currentMissingNote = null;
      if (missingDataResolve) {
        missingDataResolve();
        missingDataResolve = null;
      }
    }, 500);
  }
}

function waitForMissingDataResolution() {
  return new Promise(resolve => {
    missingDataResolve = resolve;
  });
}

// Modal close button
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('missingDataModal').classList.remove('active');
  if (state.currentMissingNote) {
    state.currentMissingNote = null;
  }
  if (missingDataResolve) {
    missingDataResolve();
    missingDataResolve = null;
  }
});

function saveParticipantGoal(participantName, goal) {
  if (!state.participantProfiles[participantName]) {
    state.participantProfiles[participantName] = { goals: [] };
  }
  if (!state.participantProfiles[participantName].goals.includes(goal)) {
    state.participantProfiles[participantName].goals.push(goal);
  }
  
  if (isTauri) {
    invokeCommand('save_participant_goal', { participantName, goal });
  }
}

// ===== BATCH SUMMARY =====
function buildBatchSummary() {
  const notes = state.processedNotes;
  const greenCount = notes.filter(n => n.traffic_light === 'GREEN').length;
  const orangeCount = notes.filter(n => n.traffic_light === 'ORANGE').length;
  const redCount = notes.filter(n => n.traffic_light === 'RED').length;
  
  const elapsed = Math.round((Date.now() - state.batchStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins} minutes ${secs} seconds`;
  
  document.getElementById('summaryTitle').textContent = 
    `Batch Complete — ${notes.length} notes processed`;
  document.getElementById('summarySub').textContent = 
    `Processing completed in ${timeStr}. All notes have been prepared to audit-ready standard.`;
  
  document.getElementById('summaryTally').innerHTML = `
    <div class="tally-chip green"><div class="tally-dot green"></div> ${greenCount} Ready to Approve</div>
    <div class="tally-chip orange"><div class="tally-dot orange"></div> ${orangeCount} Review Required</div>
    <div class="tally-chip red"><div class="tally-dot red"></div> ${redCount} Needs Attention</div>`;
  
  // Unresolved red flags
  const redNotes = notes.filter(n => n.traffic_light === 'RED');
  if (redNotes.length > 0) {
    document.getElementById('unresolvedSection').style.display = 'block';
    const unresolvedContainer = document.getElementById('unresolvedItems');
    unresolvedContainer.innerHTML = '';
    
    for (const note of redNotes) {
      const desc = note.red_flags.map(rf => rf.description).join('. ');
      const forms = note.red_flags.flatMap(rf => 
        (rf.required_forms || []).map(f => f.form_name)
      ).join(', ');
      
      const item = document.createElement('div');
      item.className = 'unresolved-item';
      item.innerHTML = `
        <div class="unresolved-name">${escapeHtml(note.participant_code)} — ${escapeHtml(note.participant_name)}</div>
        <div class="unresolved-desc">${escapeHtml(desc)}${forms ? ' Required forms: ' + escapeHtml(forms) + '.' : ''}</div>`;
      unresolvedContainer.appendChild(item);
    }
  } else {
    document.getElementById('unresolvedSection').style.display = 'none';
  }
}

// ===== EXPORT =====
document.getElementById('btnExport').addEventListener('click', async () => {
  try {
    let csvContent;
    if (isTauri) {
      csvContent = await invokeCommand('export_csv');
    } else {
      csvContent = generateCSVExport();
    }
    
    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ritedoc_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('CSV exported successfully');
  } catch (e) {
    showToast('Export error: ' + e.message);
  }
});

document.getElementById('btnCopyGreen').addEventListener('click', () => {
  const greenNotes = state.processedNotes
    .filter(n => n.traffic_light === 'GREEN')
    .map(n => n.rewritten_note)
    .join('\n\n---\n\n');
  
  if (greenNotes) {
    copyToClipboard(greenNotes);
    showToast(`${state.processedNotes.filter(n => n.traffic_light === 'GREEN').length} green notes copied`);
  } else {
    showToast('No green notes to copy');
  }
});

function generateCSVExport() {
  const headers = ['Participant', 'Participant Code', 'Support Worker', 'Date', 'Time', 'Status', 'Rewritten Note', 'Red Flags', 'Missing Data', 'Original Note'];
  
  const rows = state.processedNotes.map(note => {
    const status = note.traffic_light === 'RED' ? 'Needs Attention' :
                   note.traffic_light === 'ORANGE' ? 'Review Required' : 'Ready to Approve';
    const redFlags = (note.red_flags || []).map(rf => `${rf.category}: ${rf.description}`).join('; ');
    const missing = (note.missing_data || []).map(md => md.field_name).join('; ');
    
    return [
      note.participant_name,
      note.participant_code,
      note.support_worker,
      note.date,
      note.time,
      status,
      note.rewritten_note,
      redFlags,
      missing,
      note.raw_text,
    ].map(field => `"${(field || '').replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

// ===== BROWSER SIMULATION (when not running in Tauri) =====
function simulateProcessNote(rawNote) {
  // PII scrubbing simulation
  let scrubbed = rawNote.raw_text;
  const piiMappings = [];
  
  if (rawNote.participant_name) {
    const parts = rawNote.participant_name.split(' ');
    for (const part of parts) {
      if (part.length > 2 && scrubbed.includes(part)) {
        scrubbed = scrubbed.replace(new RegExp(escapeRegex(part), 'g'), '[Participant]');
        piiMappings.push({ original: part, tag: '[Participant]', category: 'name' });
      }
    }
  }
  
  if (rawNote.support_worker) {
    const parts = rawNote.support_worker.split(' ');
    for (const part of parts) {
      if (part.length > 2 && scrubbed.includes(part)) {
        scrubbed = scrubbed.replace(new RegExp(escapeRegex(part), 'g'), '[Support Worker]');
        piiMappings.push({ original: part, tag: '[Support Worker]', category: 'worker' });
      }
    }
  }
  
  // Detect red flags
  const redFlagKeywords = {
    'Unauthorised Restrictive Practice': ['physically guided', 'restraint', 'restrained', 'seclusion', 'held down', 'grabbed', 'forced'],
    'Medication Error / Missed Medication': ['wrong dose', 'missed medication', 'medication error', 'wrong medication', 'labelling mix-up', 'forgot medication'],
    'Injury / Fall / Medical Emergency': ['fell', 'fall', 'injured', 'injury', 'ambulance', 'hospital', 'seizure', 'bleeding'],
    'Abuse / Neglect / Exploitation indicators': ['yelled at', 'threatened', 'hit', 'struck', 'afraid', 'neglected', 'exploited'],
    'Behavioural Incident requiring reporting': ['aggressive', 'self-harm', 'absconded', 'ran away', 'hit worker'],
    'Worker Safety / WHS concerns': ['worker injured', 'unsafe environment', 'threatened worker'],
  };
  
  const detectedFlags = [];
  const textLower = rawNote.raw_text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(redFlagKeywords)) {
    const matched = keywords.filter(kw => textLower.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      detectedFlags.push({
        category,
        description: `${category} detected in this progress note. Keywords matched: ${matched.map(k => '"' + k + '"').join(', ')}.`,
        keywords_matched: matched,
        severity: 'HIGH',
        required_forms: getRequiredForms(category, rawNote),
      });
    }
  }
  
  // Detect missing data
  const missingData = [];
  
  if (!rawNote.date) {
    missingData.push({
      field_name: 'Date and Time',
      reason: 'This note does not include a date or time. A date and time are required for audit-prepared documentation.',
      placeholder: '[DATE AND TIME REQUIRED — confirm the date and time of this session]',
      submitted_value: null,
    });
  }
  
  if (!textLower.includes('goal') && !textLower.includes('plan') && !textLower.includes('objective')) {
    missingData.push({
      field_name: 'Participant Goal',
      reason: `This note does not reference a goal from ${rawNote.participant_name}'s NDIS plan. Which goal did this session support?`,
      placeholder: '[GOAL LINK REQUIRED — specify the NDIS plan goal this activity supports]',
      submitted_value: null,
    });
  }
  
  if (!textLower.includes('said') && !textLower.includes('chose') && !textLower.includes('preferred') && 
      !textLower.includes('asked') && !textLower.includes('wanted') && !textLower.includes('expressed') &&
      !textLower.includes('stated') && !textLower.includes('requested') && !textLower.includes('enjoyed')) {
    missingData.push({
      field_name: 'Participant Response',
      reason: "Document the participant's observable response to the session.",
      placeholder: "[PARTICIPANT RESPONSE REQUIRED — document participant's observable response to the session]",
      submitted_value: null,
    });
  }
  
  // Determine traffic light
  let trafficLight = 'GREEN';
  if (detectedFlags.length > 0) {
    trafficLight = 'RED';
  } else if (missingData.length > 0) {
    trafficLight = 'ORANGE';
  }
  
  // Generate rewritten note
  const dateStr = rawNote.date || '[DATE AND TIME REQUIRED — confirm the date and time of this session]';
  const workerStr = rawNote.support_worker || '[STAFF CODE REQUIRED]';
  
  let rewritten = `On ${dateStr}, support worker ${workerStr} attended ${rawNote.participant_name}'s residence. `;
  rewritten += rawNote.raw_text;
  
  if (!textLower.includes('goal') && !textLower.includes('plan')) {
    rewritten += ' [GOAL LINK REQUIRED — specify the NDIS plan goal this activity supports].';
  }
  
  if (!textLower.includes('incident') && !textLower.includes('safety') && !textLower.includes('concern') && detectedFlags.length === 0) {
    rewritten += ' No incidents, medication events, or safety concerns were observed or reported during this session.';
  }
  
  // Generate participant code
  const nameParts = rawNote.participant_name.split(' ');
  const initials = nameParts.length >= 2 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : rawNote.participant_name.substring(0, 2).toUpperCase();
  const code = `${initials}-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`;
  
  return {
    id: rawNote.id,
    participant_name: rawNote.participant_name,
    participant_code: code,
    support_worker: rawNote.support_worker,
    date: rawNote.date,
    time: rawNote.time,
    raw_text: rawNote.raw_text,
    rewritten_note: rewritten,
    traffic_light: trafficLight,
    red_flags: detectedFlags,
    missing_data: missingData,
    pillar_scores: [],
    is_done: false,
    is_flagged: false,
    preview: rewritten.substring(0, 120) + '...',
  };
}

function getRequiredForms(category, rawNote) {
  const formTemplates = {
    'Unauthorised Restrictive Practice': [
      {
        form_name: 'Restrictive Practice Notification Form',
        fields: [
          { label: 'Date', value: rawNote.date || null, placeholder: '[DATE REQUIRED]', is_missing: !rawNote.date },
          { label: 'Participant', value: rawNote.participant_name, is_missing: false },
          { label: 'Type of Practice', value: null, placeholder: '[TYPE OF PRACTICE REQUIRED — describe the restrictive practice used]', is_missing: true },
          { label: 'Duration', value: null, placeholder: '[DURATION REQUIRED — how long was the practice applied?]', is_missing: true },
          { label: 'Authorisation Status', value: null, placeholder: '[AUTHORISATION STATUS REQUIRED — is this practice listed in the participant\'s Behaviour Support Plan?]', is_missing: true },
          { label: 'Staff Identifier', value: rawNote.support_worker || null, placeholder: '[STAFF CODE REQUIRED]', is_missing: !rawNote.support_worker },
        ],
      },
      {
        form_name: 'Behaviour Support Plan Review Request',
        fields: [
          { label: 'Date of Request', value: rawNote.date || null, placeholder: '[DATE REQUIRED]', is_missing: !rawNote.date },
          { label: 'Participant', value: rawNote.participant_name, is_missing: false },
          { label: 'Reason for Review', value: 'Restrictive practice recorded in progress note without documented authorisation. BSP review required.', is_missing: false },
          { label: 'Current BSP Reference Number', value: null, placeholder: '[BSP REFERENCE REQUIRED — check participant file]', is_missing: true },
          { label: 'Behaviour Specialist Assigned', value: null, placeholder: '[SPECIALIST NAME REQUIRED]', is_missing: true },
        ],
      },
    ],
    'Medication Error / Missed Medication': [
      {
        form_name: 'Incident Report Form',
        fields: [
          { label: 'Date of Incident', value: rawNote.date || null, placeholder: '[DATE REQUIRED]', is_missing: !rawNote.date },
          { label: 'Participant', value: rawNote.participant_name, is_missing: false },
          { label: 'Incident Type', value: 'Medication Error', is_missing: false },
          { label: 'Medication Name', value: null, placeholder: '[MEDICATION NAME REQUIRED — specify drug involved]', is_missing: true },
          { label: 'Prescribed Dose', value: null, placeholder: '[PRESCRIBED DOSE REQUIRED]', is_missing: true },
          { label: 'Dose Administered', value: null, placeholder: '[ACTUAL DOSE REQUIRED — what was given?]', is_missing: true },
          { label: 'Immediate Actions Taken', value: null, placeholder: '[RESPONSE REQUIRED — was a nurse, GP, or Poisons Information contacted?]', is_missing: true },
        ],
      },
      {
        form_name: 'Medication Incident Report',
        fields: [
          { label: 'Date', value: rawNote.date || null, placeholder: '[DATE REQUIRED]', is_missing: !rawNote.date },
          { label: 'Participant', value: rawNote.participant_name, is_missing: false },
          { label: 'Type of Medication Incident', value: null, placeholder: '[INCIDENT TYPE REQUIRED]', is_missing: true },
          { label: 'Outcome for Participant', value: null, placeholder: '[OUTCOME REQUIRED — describe any observed effects]', is_missing: true },
          { label: 'Notified Parties', value: null, placeholder: '[NOTIFICATION REQUIRED — list who was notified]', is_missing: true },
          { label: 'Corrective Action Taken', value: null, placeholder: '[CORRECTIVE ACTION REQUIRED]', is_missing: true },
        ],
      },
    ],
  };
  
  return formTemplates[category] || [{
    form_name: 'Incident Report Form',
    fields: [
      { label: 'Date', value: rawNote.date || null, placeholder: '[DATE REQUIRED]', is_missing: !rawNote.date },
      { label: 'Participant', value: rawNote.participant_name, is_missing: false },
      { label: 'Description', value: null, placeholder: '[DESCRIPTION REQUIRED]', is_missing: true },
    ],
  }];
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function simulateCommand(cmd, args) {
  // Fallback simulation for browser mode
  return Promise.resolve(null);
}

// ===== UTILITY =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initDropzone();
  
  // Set hardware mode badge
  const cores = navigator.hardwareConcurrency || 4;
  const badge = document.getElementById('hwBadge');
  badge.textContent = cores >= 8 ? 'Performance Mode' : 'Standard Mode';
});
