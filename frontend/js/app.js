/**
 * RiteDoc — Frontend Application
 * Notes Done Right — for NDIS providers
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
  detectedPlatform: 'Generic CSV',
  batchMissingFields: [],   // Aggregated missing fields across all notes for Screen 3
  onboardingComplete: false,
};

// ===== PLATFORM SECTION DEFINITIONS =====
const PLATFORM_SECTIONS = {
  'ShiftCare':      ['Support Provided', 'Participant Response', 'Observations', 'Follow-up Required'],
  'Brevity':        ['Activity Summary', 'Client Engagement', 'Notes', 'Actions'],
  'Lumary':         ['Service Delivery Notes', 'Participant Feedback', 'Risk/Incidents', 'Next Steps'],
  'Astalty':        ['Session Notes', 'Goals Progress', 'Concerns', 'Plan'],
  'SupportAbility': ['Shift Summary', 'Participant Wellbeing', 'Incidents', 'Recommendations'],
  'CareMaster':     ['Care Notes', 'Response', 'Issues', 'Follow-up'],
};
const GENERIC_SECTIONS = ['Summary', 'Details', 'Observations', 'Actions Required'];

function getSectionsForPlatform(platform) {
  if (!platform) return GENERIC_SECTIONS;
  for (const [key, sections] of Object.entries(PLATFORM_SECTIONS)) {
    if (platform.toLowerCase().includes(key.toLowerCase())) return sections;
  }
  return GENERIC_SECTIONS;
}

// ===== TAURI API BRIDGE =====
const isTauri = window.__TAURI__ !== undefined;

async function invokeCommand(cmd, args = {}) {
  if (isTauri) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  return simulateCommand(cmd, args);
}

// ===== SCREEN NAVIGATION =====
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');
    state.currentScreen = screenId;
  }
  
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
  
  dropzone.addEventListener('click', (e) => {
    if (e.target !== btnBrowse) fileInput.click();
  });
  
  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
  
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
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
}

async function handleFile(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please select a CSV file');
    return;
  }
  
  document.getElementById('dropzone').style.display = 'none';
  document.getElementById('processingCard').style.display = 'block';
  
  state.isProcessing = true;
  state.batchStartTime = Date.now();
  
  try {
    if (isTauri) {
      const result = await invokeCommand('parse_csv', { filePath: file.path || file.name });
      state.notes = result.notes;
      state.totalNotes = result.total_count;
      state.detectedPlatform = result.platform || 'Generic CSV';
      processNotesBatch();
    } else {
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
  const colMap = detectColumns(headers);
  
  // Detect platform from headers
  state.detectedPlatform = detectPlatformFromHeaders(headers);
  
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
      source_platform: state.detectedPlatform,
      row_index: i,
    });
  }
  
  return notes;
}

function detectPlatformFromHeaders(headers) {
  const joined = headers.map(h => h.toLowerCase()).join('|');
  if (joined.includes('carer name') && joined.includes('shift date')) return 'ShiftCare';
  if (joined.includes('staff member') && joined.includes('case note')) return 'Brevity';
  if (joined.includes('service delivery') || joined.includes('ndis number')) return 'Lumary';
  if (joined.includes('session notes') && joined.includes('goals progress')) return 'Astalty';
  if (joined.includes('person supported') && joined.includes('shift summary')) return 'SupportAbility';
  if (joined.includes('care notes') || joined.includes('care type')) return 'CareMaster';
  return 'Generic CSV';
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
  state.batchMissingFields = [];
  
  updateProcessingUI(0, total);
  
  document.getElementById('navResults').disabled = false;
  
  for (let i = 0; i < total; i++) {
    const rawNote = state.notes[i];
    
    try {
      let processed;
      if (isTauri) {
        const response = await invokeCommand('process_note', { noteJson: JSON.stringify(rawNote) });
        processed = response.note;
      } else {
        processed = simulateProcessNote(rawNote);
      }
      
      // Extract missing bracket fields for the batch missing data screen
      extractMissingFields(processed, i);
      
      state.processedNotes.push(processed);
      state.processedCount = i + 1;
      
      updateProcessingUI(i + 1, total);
      addNoteCard(processed);
      updateResultsCounter();
      
      await sleep(100);
      
    } catch (e) {
      console.error('Error processing note:', e);
    }
  }
  
  state.isProcessing = false;
  document.getElementById('navSummary').disabled = false;
  document.getElementById('rollingProgress').style.display = 'none';
  
  // Check if there are missing fields — show Screen 2 (missing data wizard) before results
  if (state.batchMissingFields.length > 0) {
    startMissingDataWizard();
    showScreen('s2');
  } else if (state.currentScreen === 's1') {
    showScreen('s3');
  }
  
  buildBatchSummary();
}

function extractMissingFields(processed, noteIndex) {
  const bracketPattern = /\[MISSING:\s*([^\]]+)\]|\[([A-Z][A-Z\s\/&]+REQUIRED[^\]]*)\]/g;
  let match;
  while ((match = bracketPattern.exec(processed.rewritten_note)) !== null) {
    const fieldName = match[1] || match[2];
    state.batchMissingFields.push({
      noteId: processed.id,
      noteIndex: noteIndex,
      participantName: processed.participant_name,
      participantCode: processed.participant_code,
      date: processed.date,
      fieldName: fieldName.trim(),
      fullMatch: match[0],
      value: '',
    });
  }
  // Also add from missing_data array if present
  if (processed.missing_data && processed.missing_data.length > 0) {
    for (const md of processed.missing_data) {
      const alreadyAdded = state.batchMissingFields.some(
        f => f.noteId === processed.id && f.fieldName === md.field_name
      );
      if (!alreadyAdded) {
        state.batchMissingFields.push({
          noteId: processed.id,
          noteIndex: noteIndex,
          participantName: processed.participant_name,
          participantCode: processed.participant_code,
          date: processed.date,
          fieldName: md.field_name,
          fullMatch: md.placeholder || `[MISSING: ${md.field_name}]`,
          value: '',
        });
      }
    }
  }
}

function updateProcessingUI(processed, total) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  
  document.getElementById('processingCount').textContent = `${processed} of ${total} complete`;
  document.getElementById('progressBarFill').style.width = `${pct}%`;
  
  const elapsed = Math.round((Date.now() - state.batchStartTime) / 1000);
  const remaining = processed > 0 ? Math.round((elapsed / processed) * (total - processed)) : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  document.getElementById('progressSub').textContent = 
    processed >= total ? 'Processing complete!' :
    `Estimated time remaining: approx. ${mins > 0 ? mins + ' minute' + (mins !== 1 ? 's' : '') + ' ' : ''}${secs} seconds`;
  
  const rollingProgress = document.getElementById('rollingProgress');
  if (processed > 0 && processed < total) {
    rollingProgress.style.display = 'block';
    document.getElementById('rollingProgressFill').style.width = `${pct}%`;
    document.getElementById('rollingProgressPct').textContent = `${processed} of ${total} complete`;
  }
}

function updateResultsCounter() {
  document.getElementById('totalNotesCount').textContent = state.totalNotes;
  document.getElementById('reviewedCount').textContent = state.processedNotes.filter(n => n.is_done).length;
}

// ===== NOTE CARD RENDERING (Platform-Aware) =====
function addNoteCard(note) {
  const container = document.getElementById('noteCardContainer');
  const card = createNoteCard(note);
  
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
  
  // ===== COPY FULL NOTE BUTTON (top of note body) =====
  bodyContent += `
    <div class="copy-full-note-bar">
      <button class="btn-copy-full" onclick="copyNoteToClipboard('${note.id}')">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
        Copy Full Note
      </button>
    </div>`;
  
  // ===== PLATFORM-AWARE SECTIONS =====
  const sections = getSectionsForPlatform(state.detectedPlatform);
  const sectionContents = splitNoteIntoSections(note.rewritten_note, sections);
  
  bodyContent += '<div class="platform-sections">';
  bodyContent += `<div class="platform-sections-label">Sections for ${escapeHtml(state.detectedPlatform)}</div>`;
  
  for (let si = 0; si < sections.length; si++) {
    const sectionName = sections[si];
    const sectionText = sectionContents[si] || '';
    const sectionId = `section-${note.id}-${si}`;
    
    bodyContent += `
      <div class="platform-section">
        <div class="platform-section-header">
          <div class="platform-section-title">${escapeHtml(sectionName)}</div>
          <button class="btn-copy-section" onclick="copySectionToClipboard(this, '${sectionId}')">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            Copy
          </button>
        </div>
        <div class="platform-section-content" id="${sectionId}">${highlightBracketFlags(sectionText) || '<span class="text-muted">No content for this section.</span>'}</div>
      </div>`;
  }
  bodyContent += '</div>';
  
  // Actions
  bodyContent += `
    <div class="note-actions">
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

/**
 * Split a rewritten note into platform-specific sections.
 * Looks for section headers in the text (e.g. "Support Provided:" or "**Support Provided**").
 * Falls back to intelligent paragraph splitting if no headers found.
 */
function splitNoteIntoSections(noteText, sectionNames) {
  if (!noteText) return sectionNames.map(() => '');
  
  // Try to find explicit section markers
  const results = [];
  let remaining = noteText;
  let foundExplicit = false;
  
  for (let i = 0; i < sectionNames.length; i++) {
    const name = sectionNames[i];
    // Look for patterns like "Section Name:" or "**Section Name**" or "## Section Name"
    const patterns = [
      new RegExp(`(?:^|\\n)\\s*\\*\\*${escapeRegex(name)}\\*\\*[:\\s]*`, 'i'),
      new RegExp(`(?:^|\\n)\\s*##?\\s*${escapeRegex(name)}[:\\s]*`, 'i'),
      new RegExp(`(?:^|\\n)\\s*${escapeRegex(name)}\\s*:[\\s]*`, 'i'),
    ];
    
    let sectionStart = -1;
    let matchLen = 0;
    for (const pat of patterns) {
      const m = pat.exec(remaining);
      if (m) {
        sectionStart = m.index + m[0].length;
        matchLen = m[0].length;
        foundExplicit = true;
        break;
      }
    }
    
    if (sectionStart >= 0) {
      // Find the end — next section or end of text
      let sectionEnd = remaining.length;
      for (let j = i + 1; j < sectionNames.length; j++) {
        const nextName = sectionNames[j];
        const nextPatterns = [
          new RegExp(`(?:^|\\n)\\s*\\*\\*${escapeRegex(nextName)}\\*\\*`, 'i'),
          new RegExp(`(?:^|\\n)\\s*##?\\s*${escapeRegex(nextName)}`, 'i'),
          new RegExp(`(?:^|\\n)\\s*${escapeRegex(nextName)}\\s*:`, 'i'),
        ];
        for (const np of nextPatterns) {
          const nm = np.exec(remaining.substring(sectionStart));
          if (nm) {
            sectionEnd = Math.min(sectionEnd, sectionStart + nm.index);
            break;
          }
        }
      }
      results.push(remaining.substring(sectionStart, sectionEnd).trim());
    } else {
      results.push('');
    }
  }
  
  // If no explicit sections found, split by paragraphs/sentences
  if (!foundExplicit) {
    const sentences = noteText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    const perSection = Math.max(1, Math.ceil(sentences.length / sectionNames.length));
    
    for (let i = 0; i < sectionNames.length; i++) {
      const start = i * perSection;
      const end = Math.min(start + perSection, sentences.length);
      results[i] = sentences.slice(start, end).join(' ').trim();
    }
  }
  
  return results;
}

function copySectionToClipboard(btn, sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  const text = el.textContent || el.innerText;
  copyToClipboard(text);
  
  const original = btn.innerHTML;
  btn.innerHTML = '<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Copied';
  btn.style.color = 'var(--green)';
  btn.style.borderColor = 'var(--green-border)';
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.color = '';
    btn.style.borderColor = '';
  }, 1800);
}

function highlightBracketFlags(text) {
  return escapeHtml(text).replace(
    /\[([A-Z][A-Z\s\/&]+REQUIRED[^\]]*)\]/g,
    '<span class="bracket-flag">[$1]</span>'
  ).replace(
    /\[MISSING:\s*([^\]]+)\]/g,
    '<span class="bracket-flag">[MISSING: $1]</span>'
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
  if (!body || !btn) return;
  
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
    const cleanText = note.rewritten_note.replace(/\[([^\]]+)\]/g, '[$1]');
    copyToClipboard(cleanText);
  }
}

function copyFormToClipboard(btn, noteId, formIndex) {
  const note = state.processedNotes.find(n => n.id === noteId);
  if (!note || !note.red_flags) return;
  
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
  
  updateResultsCounter();
  
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

// ===== MISSING DATA WIZARD (One Note at a Time, One Field at a Time) =====
let wizardIndex = 0; // current position in the flat batchMissingFields array

function startMissingDataWizard() {
  wizardIndex = 0;
  showWizardField();
}

function showWizardField() {
  if (wizardIndex >= state.batchMissingFields.length) {
    // All fields done — finalize and go to results
    finalizeMissingDataWizard();
    return;
  }
  
  const field = state.batchMissingFields[wizardIndex];
  
  // Count unique notes and figure out which note/field we're on
  const noteIds = [...new Set(state.batchMissingFields.map(f => f.noteId))];
  const currentNoteIdx = noteIds.indexOf(field.noteId) + 1;
  const totalNotes = noteIds.length;
  const fieldsForThisNote = state.batchMissingFields.filter(f => f.noteId === field.noteId);
  const fieldIdxInNote = fieldsForThisNote.indexOf(field) + 1;
  const totalFieldsInNote = fieldsForThisNote.length;
  
  // Update progress
  document.getElementById('missingWizardProgress').textContent = 
    `Note ${currentNoteIdx} of ${totalNotes} — Field ${fieldIdxInNote} of ${totalFieldsInNote}`;
  
  // Update note header
  document.getElementById('missingWizardNoteHeader').innerHTML = 
    `<strong>${escapeHtml(field.participantCode)}</strong> — ${escapeHtml(field.participantName)}` +
    (field.date ? ` <span style="color: var(--text-muted); margin-left: 8px;">${escapeHtml(field.date)}</span>` : '');
  
  // Update prompt
  document.getElementById('missingWizardPrompt').textContent = 
    `This note is missing: ${field.fieldName}`;
  
  // Clear and focus input
  const input = document.getElementById('missingWizardInput');
  input.value = '';
  input.placeholder = `Enter ${field.fieldName.toLowerCase()}...`;
  setTimeout(() => input.focus(), 100);
}

function handleWizardUpdate() {
  const input = document.getElementById('missingWizardInput');
  const value = input.value.trim();
  
  if (!value) {
    input.style.borderColor = 'var(--red)';
    setTimeout(() => input.style.borderColor = '', 2000);
    return;
  }
  
  const field = state.batchMissingFields[wizardIndex];
  const note = state.processedNotes.find(n => n.id === field.noteId);
  
  if (note) {
    // Replace the bracket placeholder with the filled value
    note.rewritten_note = note.rewritten_note.replace(field.fullMatch, value);
    field.value = value;
    field.resolved = 'filled';
    
    // Save goal if applicable
    if (field.fieldName.toLowerCase().includes('goal')) {
      saveParticipantGoal(note.participant_name, value);
    }
    
    // Update missing_data array if present
    if (note.missing_data) {
      const md = note.missing_data.find(m => m.field_name === field.fieldName);
      if (md) md.submitted_value = value;
    }
  }
  
  wizardIndex++;
  showWizardField();
}

function handleWizardSkip() {
  const field = state.batchMissingFields[wizardIndex];
  field.resolved = 'skipped';
  
  wizardIndex++;
  showWizardField();
}

function finalizeMissingDataWizard() {
  // Re-evaluate traffic lights for all notes
  for (const note of state.processedNotes) {
    const hasBrackets = /\[MISSING:|REQUIRED\]/.test(note.rewritten_note);
    const hasRedFlags = note.red_flags && note.red_flags.length > 0;
    
    if (hasRedFlags) {
      note.traffic_light = 'RED';
    } else if (hasBrackets || (note.missing_data && note.missing_data.some(md => !md.submitted_value))) {
      note.traffic_light = 'ORANGE';
    } else {
      note.traffic_light = 'GREEN';
    }
  }
  
  // Rebuild note cards
  const container = document.getElementById('noteCardContainer');
  const rollingEl = document.getElementById('rollingProgress');
  container.innerHTML = '';
  container.appendChild(rollingEl);
  
  for (const note of state.processedNotes) {
    addNoteCard(note);
  }
  
  buildBatchSummary();
  
  const filledCount = state.batchMissingFields.filter(f => f.resolved === 'filled').length;
  const skippedCount = state.batchMissingFields.filter(f => f.resolved === 'skipped').length;
  showToast(`${filledCount} field${filledCount !== 1 ? 's' : ''} updated, ${skippedCount} skipped.`);
  showScreen('s3');
}

// ===== MISSING DATA MODAL (per-note, during processing) =====
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
      <input class="missing-item-input" type="text" id="missing-input-modal-${idx}" 
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
  const input = document.getElementById(`missing-input-modal-${itemIndex}`);
  const value = input.value.trim();
  
  if (!value) {
    input.style.borderColor = 'var(--red)';
    setTimeout(() => input.style.borderColor = '', 2000);
    return;
  }
  
  const note = state.processedNotes.find(n => n.id === noteId) || 
               (state.currentMissingNote && state.currentMissingNote.note);
  
  if (note && note.missing_data) {
    const item = note.missing_data.find(md => md.field_name === fieldName);
    if (item) {
      item.submitted_value = value;
      note.rewritten_note = note.rewritten_note.replace(item.placeholder, value);
    }
  }
  
  if (fieldName.toLowerCase().includes('goal') && note) {
    saveParticipantGoal(note.participant_name, value);
  }
  
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
    `Processing completed in ${timeStr}. Platform: ${state.detectedPlatform}. All notes have been prepared to audit-ready standard.`;
  
  document.getElementById('summaryTally').innerHTML = `
    <div class="tally-chip green"><div class="tally-dot green"></div> ${greenCount} Ready to Approve</div>
    <div class="tally-chip orange"><div class="tally-dot orange"></div> ${orangeCount} Review Required</div>
    <div class="tally-chip red"><div class="tally-dot red"></div> ${redCount} Needs Attention</div>`;
  
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

// ===== BATCH SUMMARY EXPORT (Printable HTML) =====
function exportBatchSummary() {
  const notes = state.processedNotes;
  const greenCount = notes.filter(n => n.traffic_light === 'GREEN').length;
  const orangeCount = notes.filter(n => n.traffic_light === 'ORANGE').length;
  const redCount = notes.filter(n => n.traffic_light === 'RED').length;
  
  const batchDate = new Date().toLocaleDateString('en-AU', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  const elapsed = Math.round((Date.now() - state.batchStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RiteDoc Batch Summary — ${batchDate}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #111827; padding: 24px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .meta-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-value { font-size: 18px; font-weight: 600; margin-top: 2px; }
    .tally { display: flex; gap: 16px; margin-bottom: 24px; }
    .tally-item { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-green { background: #22c55e; }
    .dot-orange { background: #f59e0b; }
    .dot-red { background: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; font-size: 12px; }
    tr:nth-child(even) { background: #fafafa; }
    .status-green { color: #16a34a; font-weight: 600; }
    .status-orange { color: #d97706; font-weight: 600; }
    .status-red { color: #dc2626; font-weight: 600; }
    .note-text { max-width: 400px; word-wrap: break-word; }
    .flags { color: #dc2626; font-size: 11px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; text-align: center; }
    @media print {
      body { padding: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>RiteDoc — Batch Processing Summary</h1>
  <div class="subtitle">Generated ${batchDate} | Platform: ${escapeHtml(state.detectedPlatform)} | ${notes.length} notes processed in ${mins}m ${secs}s</div>
  
  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">Total Notes</div>
      <div class="meta-value">${notes.length}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Platform Source</div>
      <div class="meta-value">${escapeHtml(state.detectedPlatform)}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Processing Time</div>
      <div class="meta-value">${mins}m ${secs}s</div>
    </div>
  </div>
  
  <div class="tally">
    <div class="tally-item"><div class="dot dot-green"></div> ${greenCount} Ready to Approve</div>
    <div class="tally-item"><div class="dot dot-orange"></div> ${orangeCount} Review Required</div>
    <div class="tally-item"><div class="dot dot-red"></div> ${redCount} Needs Attention</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Participant</th>
        <th>Date</th>
        <th>Status</th>
        <th>Flags</th>
        <th>Rewritten Summary</th>
      </tr>
    </thead>
    <tbody>`;
  
  notes.forEach((note, i) => {
    const statusClass = note.traffic_light === 'GREEN' ? 'status-green' : 
                        note.traffic_light === 'ORANGE' ? 'status-orange' : 'status-red';
    const statusText = note.traffic_light === 'GREEN' ? 'Ready' : 
                       note.traffic_light === 'ORANGE' ? 'Review' : 'Attention';
    const flags = (note.red_flags || []).map(rf => rf.category).join(', ') || '—';
    const summary = (note.rewritten_note || '').substring(0, 200) + (note.rewritten_note.length > 200 ? '...' : '');
    
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(note.participant_code)}</td>
        <td>${escapeHtml(note.date || '—')}</td>
        <td class="${statusClass}">${statusText}</td>
        <td class="flags">${escapeHtml(flags)}</td>
        <td class="note-text">${escapeHtml(summary)}</td>
      </tr>`;
  });
  
  html += `
    </tbody>
  </table>
  
  <div class="footer">
    <strong style="font-size: 13px; color: #374151;">RiteDoc</strong><br>
    <span style="font-size: 10px; color: #9ca3af;">by ReadyCompliant</span><br>
    Notes Done Right<br>
    This document is generated for internal admin records and audit trail purposes.
  </div>
  
  <div class="no-print" style="text-align: center; margin-top: 16px;">
    <button onclick="window.print()" style="padding: 8px 24px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">Print / Save as PDF</button>
  </div>
</body>
</html>`;
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
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

document.getElementById('btnExportBatchSummary').addEventListener('click', () => {
  exportBatchSummary();
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

// ===== ONBOARDING FIRST-RUN EXPERIENCE =====
function checkOnboarding() {
  const completed = localStorage.getItem('ritedoc_onboarding_complete');
  if (completed === 'true') {
    state.onboardingComplete = true;
    return false; // Don't show
  }
  return true; // Show onboarding
}

function showOnboarding() {
  document.getElementById('onboardingOverlay').style.display = 'flex';
  showOnboardingStep(1);
}

function showOnboardingStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
  const stepEl = document.getElementById(`onboarding-step-${step}`);
  if (stepEl) stepEl.classList.add('active');
  
  // Update dots
  document.querySelectorAll('.onboarding-dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === step);
  });
}

function nextOnboardingStep(current) {
  if (current < 3) {
    showOnboardingStep(current + 1);
  }
}

function completeOnboarding() {
  localStorage.setItem('ritedoc_onboarding_complete', 'true');
  state.onboardingComplete = true;
  document.getElementById('onboardingOverlay').style.display = 'none';
}

function skipOnboarding() {
  completeOnboarding();
}

// ===== BROWSER SIMULATION =====
function simulateProcessNote(rawNote) {
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
  
  const missingData = [];
  
  if (!rawNote.date) {
    missingData.push({
      field_name: 'Date and Time',
      reason: 'This note does not include a date or time.',
      placeholder: '[MISSING: date and time]',
      submitted_value: null,
    });
  }
  
  if (!textLower.includes('goal') && !textLower.includes('plan') && !textLower.includes('objective')) {
    missingData.push({
      field_name: 'Participant Goal',
      reason: `This note does not reference a goal from ${rawNote.participant_name}'s NDIS plan.`,
      placeholder: '[MISSING: participant goal]',
      submitted_value: null,
    });
  }
  
  if (!textLower.includes('said') && !textLower.includes('chose') && !textLower.includes('preferred') && 
      !textLower.includes('asked') && !textLower.includes('wanted') && !textLower.includes('expressed') &&
      !textLower.includes('stated') && !textLower.includes('requested') && !textLower.includes('enjoyed')) {
    missingData.push({
      field_name: 'Participant Response',
      reason: "Document the participant's observable response.",
      placeholder: "[MISSING: participant response]",
      submitted_value: null,
    });
  }
  
  let trafficLight = 'GREEN';
  if (detectedFlags.length > 0) {
    trafficLight = 'RED';
  } else if (missingData.length > 0) {
    trafficLight = 'ORANGE';
  }
  
  // Generate platform-aware rewritten note with section headers
  const sections = getSectionsForPlatform(state.detectedPlatform);
  const dateStr = rawNote.date || '[MISSING: date and time]';
  const workerStr = rawNote.support_worker || '[MISSING: support worker]';
  
  let rewritten = `**${sections[0]}**\nOn ${dateStr}, support worker ${workerStr} attended ${rawNote.participant_name}'s residence. ${rawNote.raw_text}\n\n`;
  rewritten += `**${sections[1]}**\n`;
  
  if (textLower.includes('said') || textLower.includes('chose') || textLower.includes('enjoyed')) {
    rewritten += `The participant engaged positively during the session.\n\n`;
  } else {
    rewritten += `[MISSING: participant response]\n\n`;
  }
  
  rewritten += `**${sections[2]}**\n`;
  if (detectedFlags.length > 0) {
    rewritten += detectedFlags.map(f => f.description).join(' ') + '\n\n';
  } else {
    rewritten += 'No incidents, medication events, or safety concerns were observed or reported during this session.\n\n';
  }
  
  rewritten += `**${sections[3]}**\n`;
  if (!textLower.includes('goal') && !textLower.includes('plan')) {
    rewritten += '[MISSING: participant goal] — specify the NDIS plan goal this activity supports.\n';
  } else {
    rewritten += 'Continue with current support plan. No changes required.\n';
  }
  
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
          { label: 'Type of Practice', value: null, placeholder: '[TYPE OF PRACTICE REQUIRED]', is_missing: true },
          { label: 'Duration', value: null, placeholder: '[DURATION REQUIRED]', is_missing: true },
          { label: 'Authorisation Status', value: null, placeholder: '[AUTHORISATION STATUS REQUIRED]', is_missing: true },
          { label: 'Staff Identifier', value: rawNote.support_worker || null, placeholder: '[STAFF CODE REQUIRED]', is_missing: !rawNote.support_worker },
        ],
      },
    ],
    'Medication Error / Missed Medication': [
      {
        form_name: 'Medication Incident Report',
        fields: [
          { label: 'Date of Incident', value: rawNote.date || null, placeholder: '[DATE REQUIRED]', is_missing: !rawNote.date },
          { label: 'Participant', value: rawNote.participant_name, is_missing: false },
          { label: 'Incident Type', value: 'Medication Error', is_missing: false },
          { label: 'Medication Name', value: null, placeholder: '[MEDICATION NAME REQUIRED]', is_missing: true },
          { label: 'Outcome', value: null, placeholder: '[OUTCOME REQUIRED]', is_missing: true },
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
  if (cmd === 'check_activation') {
    return Promise.resolve({ is_activated: true, key_code: 'DEMO-KEY', hardware_fingerprint: 'RDOC-DEMO', subscription_type: 'founders', activated_at: new Date().toISOString() });
  }
  if (cmd === 'get_cartridge_version') {
    return Promise.resolve('current');
  }
  if (cmd === 'silent_update_cartridges') {
    return Promise.resolve('current');
  }
  if (cmd === 'get_hardware_fingerprint') {
    return Promise.resolve('RDOC-BROWSER-DEMO');
  }
  return Promise.resolve(null);
}

// ===== ACTIVATION =====
async function checkActivationStatus() {
  try {
    const result = await invokeCommand('check_activation');
    if (result && result.is_activated) {
      document.getElementById('activationOverlay').style.display = 'none';
      document.getElementById('appShell').style.display = 'flex';
      document.getElementById('settingsActivationStatus').textContent = 'Activated';
      document.getElementById('settingsActivationStatus').style.color = 'var(--green)';
      document.getElementById('settingsSubscriptionType').textContent = formatSubscriptionType(result.subscription_type);
      const fp = await invokeCommand('get_hardware_fingerprint');
      document.getElementById('settingsFingerprint').textContent = fp || '—';
      return result;
    } else {
      document.getElementById('activationOverlay').style.display = 'flex';
      document.getElementById('appShell').style.display = 'none';
      return null;
    }
  } catch (e) {
    console.error('Activation check error:', e);
    document.getElementById('activationOverlay').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
    return null;
  }
}

async function handleActivation() {
  const input = document.getElementById('activationKeyInput');
  const keyCode = input.value.trim();
  const errorEl = document.getElementById('activationError');
  const spinner = document.getElementById('activationSpinner');
  const btn = document.getElementById('btnActivate');

  if (!keyCode) {
    input.classList.add('error');
    errorEl.textContent = 'Please enter your activation key.';
    errorEl.style.display = 'block';
    return;
  }

  input.classList.remove('error');
  errorEl.style.display = 'none';
  btn.disabled = true;
  spinner.style.display = 'flex';

  try {
    const result = await invokeCommand('activate_key', { keyCode });

    if (result && result.success) {
      spinner.querySelector('span').textContent = 'Activation successful! Loading RiteDoc...';
      await sleep(1000);
      document.getElementById('activationOverlay').style.display = 'none';
      document.getElementById('appShell').style.display = 'flex';
      document.getElementById('settingsActivationStatus').textContent = 'Activated';
      document.getElementById('settingsActivationStatus').style.color = 'var(--green)';
      document.getElementById('settingsSubscriptionType').textContent = formatSubscriptionType(result.subscription_type);
      const fp = await invokeCommand('get_hardware_fingerprint');
      document.getElementById('settingsFingerprint').textContent = fp || '—';
      showToast(result.message);
      
      // Show onboarding after first activation
      if (checkOnboarding()) {
        showOnboarding();
      }
    } else {
      input.classList.add('error');
      errorEl.textContent = result ? result.message : 'Activation failed. Please try again.';
      errorEl.style.display = 'block';
    }
  } catch (e) {
    input.classList.add('error');
    errorEl.textContent = 'An error occurred during activation. Please check your internet connection and try again.';
    errorEl.style.display = 'block';
    console.error('Activation error:', e);
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
  }
}

function formatSubscriptionType(type) {
  const types = {
    'founders': 'Founders Edition',
    'standard': 'Standard',
    'biab': 'Business in a Box',
  };
  return types[type] || type || '—';
}

// ===== CARTRIDGE UPDATES =====
async function runSilentCartridgeUpdate() {
  if (!isTauri) return;
  try {
    const dateDisplay = await invokeCommand('silent_update_cartridges');
    const dateEl = document.getElementById('settingsCartridgeVersion');
    if (dateEl && dateDisplay) {
      dateEl.textContent = dateDisplay;
    }
  } catch (e) {
    // Silent
  }
}

async function loadSettingsData() {
  try {
    const dateDisplay = await invokeCommand('get_cartridge_version');
    const dateEl = document.getElementById('settingsCartridgeVersion');
    if (dateEl) {
      dateEl.textContent = dateDisplay || 'current';
    }

    const badge = document.getElementById('hwBadge');
    const modeEl = document.getElementById('settingsProcessingMode');
    if (modeEl && badge) {
      modeEl.textContent = badge.textContent;
    }
  } catch (e) {
    console.error('Settings load error:', e);
  }
}

// ===== UTILITY =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  initDropzone();

  const activationState = await checkActivationStatus();

  // Set hardware mode badge
  if (isTauri) {
    try {
      const hw = await invokeCommand('get_hardware_profile');
      if (hw) {
        const badge = document.getElementById('hwBadge');
        badge.textContent = hw.mode === 'Turbo' ? 'Turbo Mode' : 'Standard Mode';
      }
    } catch (e) {
      console.log('Hardware detection fallback:', e);
    }
  } else {
    const cores = navigator.hardwareConcurrency || 4;
    const badge = document.getElementById('hwBadge');
    badge.textContent = cores >= 8 ? 'Performance Mode' : 'Standard Mode';
  }

  await loadSettingsData();

  if (activationState && activationState.is_activated) {
    runSilentCartridgeUpdate(); // fire and forget
    
    // Show onboarding if first run (and not just activated — that's handled in handleActivation)
    if (checkOnboarding()) {
      showOnboarding();
    }
  }

  // Enter key for activation
  const activationInput = document.getElementById('activationKeyInput');
  if (activationInput) {
    activationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleActivation();
    });
  }
});
