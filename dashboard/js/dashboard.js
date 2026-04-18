/**
 * ReadyCompliant Admin Dashboard
 * Internal administration panel for managing RiteDoc subscriptions,
 * activation keys, support tickets, cartridge updates, and BIAB agencies.
 *
 * Backend: Cloudflare Worker API (readycompliant-api)
 * No Supabase dependency — all data operations go through the Worker.
 */

// ===== CONFIGURATION =====
const CONFIG = {
  // Worker API base URL — update after deploying the Worker
  // Production: https://readycompliant-api.<your-subdomain>.workers.dev
  // Or custom domain: https://api.readycompliant.com
  apiUrl: localStorage.getItem('rc_api_url') || 'https://readycompliant-api.workers.dev',
};

// ===== STATE =====
const dashState = {
  currentSection: 'overview',
  clients: [],
  keys: [],
  tickets: [],
  cartridgeVersions: [],
  agencies: [],
  mobileCodes: [],
  automationLog: [],
  authToken: null,
  isAuthenticated: false,
};

// ===== API CLIENT =====
/**
 * Lightweight Cloudflare Worker API client.
 * Replaces the old Supabase REST wrapper.
 */
class ApiClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const opts = { method, headers };
    if (body !== null) {
      opts.body = JSON.stringify(body);
    }

    const resp = await fetch(url, opts);

    if (resp.status === 401) {
      // Token expired — force logout
      handleLogout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!resp.ok) {
      let errMsg = `${resp.status} ${resp.statusText}`;
      try {
        const err = await resp.json();
        errMsg = err.error || errMsg;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    const text = await resp.text();
    return text ? JSON.parse(text) : null;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  delete(path) { return this.request('DELETE', path); }
}

let api = null;

// ===== TOAST =====
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== LOGIN =====
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('btnLogin');

  errorEl.style.display = 'none';

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const resp = await fetch(`${CONFIG.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Invalid credentials');
    }

    const data = await resp.json();
    dashState.authToken = data.token;
    dashState.isAuthenticated = true;

    localStorage.setItem('rc_auth_token', data.token);
    localStorage.setItem('rc_admin_email', email);

    api = new ApiClient(CONFIG.apiUrl, data.token);

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardShell').style.display = 'flex';

    await loadAllData();
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function handleLogout() {
  localStorage.removeItem('rc_auth_token');
  localStorage.removeItem('rc_admin_email');
  dashState.authToken = null;
  dashState.isAuthenticated = false;
  api = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboardShell').style.display = 'none';
}

// ===== NAVIGATION =====
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));

  const section = document.getElementById(`sec-${sectionId}`);
  if (section) section.classList.add('active');

  const btn = document.querySelector(`.sidebar-btn[data-section="${sectionId}"]`);
  if (btn) btn.classList.add('active');

  document.getElementById('sectionTitle').textContent = getSectionTitle(sectionId);
  dashState.currentSection = sectionId;

  if (sectionId === 'automation') {
    updateAutomationSection();
  }
}

function getSectionTitle(id) {
  const titles = {
    overview: 'Overview',
    clients: 'Client Management',
    keys: 'Activation Keys',
    support: 'Support Tickets',
    cartridges: 'Cartridge Management',
    agencies: 'BIAB Agencies',
    automation: 'Automation & API',
  };
  return titles[id] || id;
}

// ===== DATA LOADING =====
async function loadAllData() {
  if (!api) return;

  try {
    const [clients, keys, tickets, versions, agencies, mobileCodes, stats] = await Promise.all([
      api.get('/api/clients').catch(() => []),
      api.get('/api/keys').catch(() => []),
      api.get('/api/support/tickets').catch(() => []),
      api.get('/api/cartridges/versions').catch(() => []),
      api.get('/api/agencies').catch(() => []),
      api.get('/api/mobile/codes').catch(() => []),
      api.get('/api/stats/overview').catch(() => ({})),
    ]);

    dashState.clients = clients || [];
    dashState.keys = keys || [];
    dashState.tickets = tickets || [];
    dashState.cartridgeVersions = versions || [];
    dashState.agencies = agencies || [];
    dashState.mobileCodes = mobileCodes || [];

    renderOverview(stats);
    renderClients();
    renderKeys();
    renderTickets();
    renderCartridgeVersions();
    renderAgencies();
    renderMobileCodes(stats);

  } catch (e) {
    console.error('Failed to load data:', e);
    showToast('Failed to load data: ' + e.message);
  }
}

// ===== OVERVIEW =====
function renderOverview(stats = {}) {
  document.getElementById('statTotalClients').textContent = stats.total_clients ?? dashState.clients.length;
  document.getElementById('statActiveSubscriptions').textContent = stats.active_clients ?? dashState.clients.filter(c => c.status === 'active').length;
  document.getElementById('statActivatedKeys').textContent = stats.activated_keys ?? dashState.keys.filter(k => k.activated_at).length;
  document.getElementById('statOpenTickets').textContent = stats.open_tickets ?? dashState.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  document.getElementById('statCartridgeVersion').textContent = stats.latest_cartridge_version ?? (dashState.cartridgeVersions.length > 0 ? dashState.cartridgeVersions[0].version : '—');
  document.getElementById('statAgencies').textContent = stats.active_agencies ?? dashState.agencies.length;

  // Recent activity
  const activityEl = document.getElementById('recentActivity');
  const activities = [];

  dashState.keys.slice(0, 5).forEach(k => {
    activities.push({
      dot: k.activated_at ? 'green' : 'orange',
      text: `Key ${(k.key_code || '').substring(0, 14)}... ${k.activated_at ? 'activated' : 'generated'} (${k.subscription_type || 'standard'})`,
      time: formatRelativeTime(k.activated_at || k.created_at),
      date: new Date(k.activated_at || k.created_at),
    });
  });

  dashState.tickets.slice(0, 5).forEach(t => {
    activities.push({
      dot: t.status === 'resolved' ? 'green' : t.status === 'open' ? 'red' : 'orange',
      text: `Ticket: ${t.category || 'general'} — ${truncate(t.description || '', 50)}`,
      time: formatRelativeTime(t.created_at),
      date: new Date(t.created_at),
    });
  });

  activities.sort((a, b) => b.date - a.date);

  if (activities.length === 0) {
    activityEl.innerHTML = '<div class="activity-empty">No recent activity</div>';
  } else {
    activityEl.innerHTML = activities.slice(0, 10).map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.dot}"></div>
        <div class="activity-text">${escapeHtml(a.text)}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    `).join('');
  }
}

// ===== CLIENTS =====
function renderClients() {
  const tbody = document.getElementById('clientsBody');
  if (dashState.clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No clients found</td></tr>';
    return;
  }

  tbody.innerHTML = dashState.clients.map(c => `
    <tr>
      <td><strong>${escapeHtml(c.contact_name || c.business_name || '—')}</strong></td>
      <td>${escapeHtml(c.email || '—')}</td>
      <td>${escapeHtml(c.business_name || '—')}</td>
      <td><span class="badge badge-${c.subscription_tier || 'standard'}">${escapeHtml(c.subscription_tier || '—')}</span></td>
      <td><span class="badge badge-${c.status === 'active' ? 'active' : 'inactive'}">${escapeHtml(c.status || '—')}</span></td>
      <td>${formatDate(c.created_at)}</td>
      <td>
        <button class="btn-sm" onclick="editClient(${c.id})">Edit</button>
      </td>
    </tr>
  `).join('');
}

function filterClients() {
  const q = document.getElementById('clientSearch').value.toLowerCase();
  const rows = document.querySelectorAll('#clientsBody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function showAddClientModal() {
  openModal('Add Client', `
    <div class="form-row">
      <div class="form-group"><label>Contact Name</label><input type="text" id="fClientName" /></div>
      <div class="form-group"><label>Email</label><input type="email" id="fClientEmail" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Phone</label><input type="text" id="fClientPhone" /></div>
      <div class="form-group"><label>Business Name</label><input type="text" id="fClientCompany" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>ABN</label><input type="text" id="fClientAbn" /></div>
      <div class="form-group">
        <label>Subscription Tier</label>
        <select id="fClientSubType">
          <option value="founders">Founders</option>
          <option value="standard">Standard</option>
          <option value="biab">Business in a Box</option>
        </select>
      </div>
    </div>
  `, async () => {
    const data = {
      contact_name: document.getElementById('fClientName').value,
      email: document.getElementById('fClientEmail').value,
      phone: document.getElementById('fClientPhone').value,
      business_name: document.getElementById('fClientCompany').value,
      abn: document.getElementById('fClientAbn').value,
      subscription_tier: document.getElementById('fClientSubType').value,
    };

    try {
      await api.post('/api/clients', data);
      showToast('Client added successfully');
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

async function editClient(id) {
  const client = dashState.clients.find(c => c.id === id);
  if (!client) return;

  openModal('Edit Client', `
    <div class="form-row">
      <div class="form-group"><label>Contact Name</label><input type="text" id="fClientName" value="${escapeAttr(client.contact_name || '')}" /></div>
      <div class="form-group"><label>Email</label><input type="email" id="fClientEmail" value="${escapeAttr(client.email || '')}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Phone</label><input type="text" id="fClientPhone" value="${escapeAttr(client.phone || '')}" /></div>
      <div class="form-group"><label>Business Name</label><input type="text" id="fClientCompany" value="${escapeAttr(client.business_name || '')}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>ABN</label><input type="text" id="fClientAbn" value="${escapeAttr(client.abn || '')}" /></div>
      <div class="form-group">
        <label>Status</label>
        <select id="fClientStatus">
          <option value="active" ${client.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="cancelled" ${client.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          <option value="suspended" ${client.status === 'suspended' ? 'selected' : ''}>Suspended</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Subscription Tier</label>
      <select id="fClientSubType">
        <option value="founders" ${client.subscription_tier === 'founders' ? 'selected' : ''}>Founders</option>
        <option value="standard" ${client.subscription_tier === 'standard' ? 'selected' : ''}>Standard</option>
        <option value="biab" ${client.subscription_tier === 'biab' ? 'selected' : ''}>Business in a Box</option>
      </select>
    </div>
  `, async () => {
    const data = {
      contact_name: document.getElementById('fClientName').value,
      email: document.getElementById('fClientEmail').value,
      phone: document.getElementById('fClientPhone').value,
      business_name: document.getElementById('fClientCompany').value,
      abn: document.getElementById('fClientAbn').value,
      status: document.getElementById('fClientStatus').value,
      subscription_tier: document.getElementById('fClientSubType').value,
    };

    try {
      await api.put(`/api/clients/${id}`, data);
      showToast('Client updated');
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

// ===== ACTIVATION KEYS =====
function renderKeys() {
  const tbody = document.getElementById('keysBody');
  if (dashState.keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No activation keys found</td></tr>';
    return;
  }

  tbody.innerHTML = dashState.keys.map(k => {
    const status = k.deactivated_at ? 'Deactivated' :
                   k.activated_at ? 'Activated' : 'Available';
    const statusClass = k.deactivated_at ? 'inactive' :
                        k.activated_at ? 'active' : 'pending';
    const agencyName = k.agency_name || (k.agency_id ? `Agency #${k.agency_id}` : '—');

    return `
      <tr>
        <td><code style="font-size:12px;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(k.key_code || '')}</code></td>
        <td><span class="badge badge-${k.subscription_type || 'standard'}">${escapeHtml(k.subscription_type || '—')}</span></td>
        <td>${escapeHtml(agencyName)}</td>
        <td><span class="badge badge-${statusClass}">${status}</span></td>
        <td>${formatDate(k.activated_at)}</td>
        <td style="font-size:11px;font-family:monospace;">${k.hardware_fingerprint ? escapeHtml(k.hardware_fingerprint.substring(0, 20)) + '...' : '—'}</td>
        <td>
          ${!k.deactivated_at ? `<button class="btn-danger" onclick="revokeKey(${k.id})">Revoke</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function filterKeys() {
  const q = document.getElementById('keySearch').value.toLowerCase();
  const rows = document.querySelectorAll('#keysBody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function showGenerateKeyModal() {
  openModal('Generate Activation Key', `
    <div class="form-group">
      <label>Subscription Type</label>
      <select id="fKeySubType">
        <option value="founders">Founders</option>
        <option value="standard">Standard</option>
        <option value="biab">Business in a Box</option>
      </select>
    </div>
    <div class="form-group">
      <label>Agency (optional, for BIAB keys)</label>
      <select id="fKeyAgency">
        <option value="">None</option>
        ${dashState.agencies.map(a => `<option value="${a.id}">${escapeHtml(a.agency_name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Number of Keys</label>
      <input type="number" id="fKeyCount" value="1" min="1" max="50" />
    </div>
  `, async () => {
    const subType = document.getElementById('fKeySubType').value;
    const agencyId = document.getElementById('fKeyAgency').value || null;
    const count = parseInt(document.getElementById('fKeyCount').value) || 1;

    try {
      const result = await api.post('/api/keys/generate', {
        subscription_type: subType,
        agency_id: agencyId,
        count,
      });
      showToast(`${result.keys?.length || count} key(s) generated successfully`);
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

async function revokeKey(id) {
  if (!confirm('Are you sure you want to revoke this key? The user will lose access immediately.')) return;

  try {
    await api.put(`/api/keys/${id}/revoke`, {});
    showToast('Key revoked');
    await loadAllData();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

// ===== SUPPORT TICKETS =====
function renderTickets() {
  const tbody = document.getElementById('ticketsBody');
  if (dashState.tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No support tickets</td></tr>';
    return;
  }

  tbody.innerHTML = dashState.tickets.map(t => {
    const clientName = t.client_name || (t.client_id ? `Client #${t.client_id}` : '—');
    const statusClass = t.status === 'resolved' ? 'active' :
                        t.status === 'open' ? 'inactive' : 'pending';

    return `
      <tr data-status="${t.status}">
        <td style="font-size:12px;color:var(--text-muted);">${String(t.id).substring(0, 8)}</td>
        <td>${escapeHtml(clientName)}</td>
        <td>${escapeHtml(t.category || '—')}</td>
        <td>${escapeHtml(truncate(t.description || '', 60))}</td>
        <td><span class="badge badge-${statusClass}">${escapeHtml(t.status)}</span></td>
        <td>${formatDate(t.created_at)}</td>
        <td>
          <button class="btn-sm" onclick="editTicket(${t.id})">Edit</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterTickets(status) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.filter-btn[data-filter="${status}"]`).classList.add('active');

  const rows = document.querySelectorAll('#ticketsBody tr');
  rows.forEach(row => {
    if (status === 'all') {
      row.style.display = '';
    } else {
      row.style.display = row.dataset.status === status ? '' : 'none';
    }
  });
}

function showAddTicketModal() {
  openModal('New Support Ticket', `
    <div class="form-group">
      <label>Client</label>
      <select id="fTicketClient">
        <option value="">Select client...</option>
        ${dashState.clients.map(c => `<option value="${c.id}">${escapeHtml(c.contact_name || c.business_name)} (${escapeHtml(c.email || '')})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Subject</label>
      <input type="text" id="fTicketSubject" placeholder="Brief summary" />
    </div>
    <div class="form-group">
      <label>Category</label>
      <select id="fTicketCategory">
        <option value="activation">Activation Issue</option>
        <option value="billing">Billing</option>
        <option value="technical">Technical Support</option>
        <option value="feature_request">Feature Request</option>
        <option value="general">General</option>
      </select>
    </div>
    <div class="form-group"><label>Description</label><textarea id="fTicketDesc"></textarea></div>
  `, async () => {
    const data = {
      client_id: document.getElementById('fTicketClient').value || null,
      subject: document.getElementById('fTicketSubject').value,
      category: document.getElementById('fTicketCategory').value,
      description: document.getElementById('fTicketDesc').value,
      status: 'open',
    };

    try {
      await api.post('/api/support/tickets', data);
      showToast('Ticket created');
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

async function editTicket(id) {
  const ticket = dashState.tickets.find(t => t.id === id);
  if (!ticket) return;

  openModal('Edit Ticket', `
    <div class="form-group">
      <label>Status</label>
      <select id="fTicketStatus">
        <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
        <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
        <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resolved</option>
      </select>
    </div>
    <div class="form-group"><label>Resolution Notes</label><textarea id="fTicketResolution">${escapeHtml(ticket.resolution || '')}</textarea></div>
    <div class="form-group"><label>Internal Notes</label><textarea id="fTicketNotes">${escapeHtml(ticket.notes || '')}</textarea></div>
  `, async () => {
    const status = document.getElementById('fTicketStatus').value;
    const data = {
      status,
      resolution: document.getElementById('fTicketResolution').value,
      notes: document.getElementById('fTicketNotes').value,
    };

    try {
      await api.put(`/api/support/tickets/${id}`, data);
      showToast('Ticket updated');
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

// ===== CARTRIDGE MANAGEMENT =====
function renderCartridgeVersions() {
  const tbody = document.getElementById('cartridgeVersionsBody');
  if (dashState.cartridgeVersions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No cartridge versions uploaded</td></tr>';
    return;
  }

  tbody.innerHTML = dashState.cartridgeVersions.map(v => {
    const files = (() => {
      try {
        const parsed = JSON.parse(v.files || '[]');
        return Array.isArray(parsed) ? parsed.map(f => f.name || f).join(', ') : v.files;
      } catch { return v.files || '—'; }
    })();

    return `
      <tr>
        <td><strong>${escapeHtml(v.version)}</strong></td>
        <td style="font-size:12px;">${escapeHtml(files)}</td>
        <td>${formatDate(v.uploaded_at)}</td>
        <td>${escapeHtml(v.release_notes || '—')}</td>
        <td>
          ${v.signature ? `<code style="font-size:10px;color:var(--text-muted);">${v.signature.substring(0, 16)}...</code>` : '<span style="color:var(--text-muted);">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Compute the SHA-256 hash of an ArrayBuffer and return it as a lowercase hex string.
 */
async function sha256Hex(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Handle .rsp (Regulation Sync Package) upload.
 *
 * The .rsp file is a JSON file produced by tools/sign_cartridge.js on Aroha.
 * Structure:
 * {
 *   manifest: { version, timestamp, files: [{name, hash, size}], release_notes },
 *   signature: "<hex Ed25519 signature>",
 *   files: { "filename.json": "<base64 content>", ... }
 * }
 *
 * The Worker verifies the signature before storing.
 */
async function handleCartridgeUpload() {
  const rspFile = document.getElementById('uploadRspFile').files[0];
  const statusEl = document.getElementById('cartridgeStatus');

  if (!rspFile) {
    statusEl.className = 'cartridge-status error';
    statusEl.textContent = 'Please select a .rsp package file to upload.';
    statusEl.style.display = 'block';
    return;
  }

  if (!rspFile.name.endsWith('.rsp') && !rspFile.name.endsWith('.json')) {
    statusEl.className = 'cartridge-status error';
    statusEl.textContent = 'Please select a valid .rsp package file (produced by tools/sign_cartridge.js).';
    statusEl.style.display = 'block';
    return;
  }

  statusEl.className = 'cartridge-status info';
  statusEl.textContent = 'Reading package...';
  statusEl.style.display = 'block';

  try {
    const buffer = await readFileAsArrayBuffer(rspFile);
    const text = new TextDecoder().decode(buffer);
    const pkg = JSON.parse(text);

    if (!pkg.manifest || !pkg.signature || !pkg.files) {
      throw new Error('Invalid .rsp package: missing manifest, signature, or files. Use tools/sign_cartridge.js to create packages.');
    }

    const version = pkg.manifest.version;
    statusEl.textContent = `Uploading cartridge v${version}...`;

    const result = await api.post('/api/cartridges/upload', pkg);

    statusEl.className = 'cartridge-status success';
    statusEl.textContent = result.message || `Cartridge v${version} uploaded successfully.`;
    showToast(`Cartridge v${version} uploaded`);

    await loadAllData();
  } catch (e) {
    statusEl.className = 'cartridge-status error';
    statusEl.textContent = 'Upload failed: ' + e.message;
  }
}

async function handleNotifySubscribers() {
  const latestVersion = dashState.cartridgeVersions.length > 0
    ? dashState.cartridgeVersions[0].version : 'latest';

  const activeClients = dashState.clients.filter(c =>
    c.status === 'active' && c.email
  );

  if (activeClients.length === 0) {
    showToast('No active subscribers to notify.');
    return;
  }

  if (!confirm(`Send update notification to ${activeClients.length} active subscriber(s)?`)) return;

  const brevoKey = localStorage.getItem('rc_brevo_api_key') || prompt('Enter Brevo API Key (stored locally):');
  if (!brevoKey) {
    showToast('Brevo API key is required to send notifications.');
    return;
  }
  localStorage.setItem('rc_brevo_api_key', brevoKey);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ReadyCompliant', email: 'updates@readycompliant.com' },
        to: activeClients.map(c => ({ email: c.email, name: c.contact_name || c.business_name || c.email })),
        subject: `RiteDoc Compliance Data Updated — v${latestVersion}`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h1 style="color: #111827; font-size: 24px;">Your Compliance Data Has Been Updated</h1>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              We've just released compliance data update <strong>v${latestVersion}</strong> for RiteDoc.
            </p>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              <strong>No action needed on your end.</strong> The next time you open RiteDoc, it will automatically
              download and install the update in the background. You'll see the updated date in Settings.
            </p>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              This update ensures your progress notes are assessed against the latest NDIS Practice Standards
              and compliance requirements.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 13px;">
              ReadyCompliant &mdash; Notes Done Right<br />
              <a href="mailto:support@readycompliant.com" style="color: #4f46e5;">support@readycompliant.com</a>
            </p>
          </div>
        `,
      }),
    });

    if (response.ok) {
      showToast(`Notification sent to ${activeClients.length} subscriber(s)`);
    } else {
      const err = await response.json();
      showToast('Notification failed: ' + (err.message || response.statusText));
    }
  } catch (e) {
    showToast('Notification error: ' + e.message);
  }
}

// ===== BIAB AGENCIES =====
function renderAgencies() {
  const tbody = document.getElementById('agenciesBody');
  if (dashState.agencies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No agencies found</td></tr>';
    return;
  }

  tbody.innerHTML = dashState.agencies.map(a => {
    const mobileAllocated = a.mobile_seats_allocated || 0;
    const mobileUsed = dashState.mobileCodes.filter(c => c.agency_id === a.id && (c.status === 'active' || c.status === 'redeemed')).length;
    return `
      <tr>
        <td><strong>${escapeHtml(a.agency_name || '—')}</strong></td>
        <td>${escapeHtml(a.contact_name || '—')}</td>
        <td>${escapeHtml(a.contact_email || a.email || '—')}</td>
        <td>${a.seats_purchased || 0}</td>
        <td>${mobileUsed} / ${mobileAllocated}</td>
        <td><span class="badge badge-${a.is_active ? 'active' : 'inactive'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-sm" onclick="editAgency(${a.id})">Edit</button>
          <button class="btn-sm" onclick="showGenerateMobileCodesForAgency(${a.id})" style="margin-left:4px;">Mobile Codes</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAgencies() {
  const q = document.getElementById('agencySearch').value.toLowerCase();
  const rows = document.querySelectorAll('#agenciesBody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function showAddAgencyModal() {
  openModal('Add BIAB Agency', `
    <div class="form-row">
      <div class="form-group"><label>Agency Name</label><input type="text" id="fAgencyName" /></div>
      <div class="form-group"><label>ABN</label><input type="text" id="fAgencyAbn" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Contact Name</label><input type="text" id="fAgencyContact" /></div>
      <div class="form-group"><label>Contact Email</label><input type="email" id="fAgencyEmail" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Contact Phone</label><input type="text" id="fAgencyPhone" /></div>
      <div class="form-group"><label>Desktop Seats</label><input type="number" id="fAgencySeats" value="5" min="1" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Mobile App Seats</label><input type="number" id="fAgencyMobileSeats" value="5" min="0" /></div>
    </div>
  `, async () => {
    const data = {
      agency_name: document.getElementById('fAgencyName').value,
      abn: document.getElementById('fAgencyAbn').value,
      contact_name: document.getElementById('fAgencyContact').value,
      contact_email: document.getElementById('fAgencyEmail').value,
      contact_phone: document.getElementById('fAgencyPhone').value,
      seats_purchased: parseInt(document.getElementById('fAgencySeats').value) || 5,
      mobile_seats_allocated: parseInt(document.getElementById('fAgencyMobileSeats').value) || 0,
    };

    try {
      await api.post('/api/agencies', data);
      showToast('Agency added');
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

async function editAgency(id) {
  const agency = dashState.agencies.find(a => a.id === id);
  if (!agency) return;

  openModal('Edit Agency', `
    <div class="form-row">
      <div class="form-group"><label>Agency Name</label><input type="text" id="fAgencyName" value="${escapeAttr(agency.agency_name || '')}" /></div>
      <div class="form-group"><label>Desktop Seats</label><input type="number" id="fAgencySeats" value="${agency.seats_purchased || 0}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Mobile App Seats</label><input type="number" id="fAgencyMobileSeats" value="${agency.mobile_seats_allocated || 0}" min="0" /></div>
      <div class="form-group"><label>Contact Name</label><input type="text" id="fAgencyContact" value="${escapeAttr(agency.contact_name || '')}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Contact Email</label><input type="email" id="fAgencyEmail" value="${escapeAttr(agency.contact_email || agency.email || '')}" /></div>
      <div class="form-group">
        <label>Status</label>
        <select id="fAgencyStatus">
          <option value="true" ${agency.is_active ? 'selected' : ''}>Active</option>
          <option value="false" ${!agency.is_active ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
    </div>
  `, async () => {
    const data = {
      agency_name: document.getElementById('fAgencyName').value,
      seats_purchased: parseInt(document.getElementById('fAgencySeats').value),
      mobile_seats_allocated: parseInt(document.getElementById('fAgencyMobileSeats').value) || 0,
      contact_name: document.getElementById('fAgencyContact').value,
      contact_email: document.getElementById('fAgencyEmail').value,
      is_active: document.getElementById('fAgencyStatus').value === 'true',
    };

    try {
      await api.put(`/api/agencies/${id}`, data);
      showToast('Agency updated');
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

// ===== MOBILE ACCESS CODES =====
function renderMobileCodes(stats = {}) {
  // Update stats cards
  document.getElementById('statMobileGenerated').textContent = stats.mobile_codes_generated ?? dashState.mobileCodes.length;
  document.getElementById('statMobileRedeemed').textContent = stats.mobile_codes_redeemed ?? dashState.mobileCodes.filter(c => c.status === 'redeemed').length;
  document.getElementById('statMobileActive').textContent = stats.mobile_codes_active ?? dashState.mobileCodes.filter(c => c.status === 'active').length;

  // Populate agency filter dropdown
  const filterEl = document.getElementById('mobileCodesAgencyFilter');
  const currentVal = filterEl.value;
  filterEl.innerHTML = '<option value="">All Agencies</option>' +
    dashState.agencies.map(a => `<option value="${a.id}" ${String(a.id) === currentVal ? 'selected' : ''}>${escapeHtml(a.agency_name)}</option>`).join('');

  // Render codes table
  const tbody = document.getElementById('mobileCodesBody');
  let codes = dashState.mobileCodes;

  if (currentVal) {
    codes = codes.filter(c => c.agency_id === parseInt(currentVal));
  }

  if (codes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No mobile access codes found</td></tr>';
    return;
  }

  tbody.innerHTML = codes.map(c => {
    const statusClass = c.status === 'redeemed' ? 'active' : c.status === 'active' ? 'standard' : 'inactive';
    return `
      <tr>
        <td><code style="font-size:13px;background:#f3f4f6;padding:2px 8px;border-radius:4px;letter-spacing:0.5px;">${escapeHtml(c.code)}</code></td>
        <td>${escapeHtml(c.agency_name || '—')}</td>
        <td><span class="badge badge-${statusClass}">${escapeHtml(c.status)}</span></td>
        <td>${formatDate(c.created_at)}</td>
        <td>${c.redeemed_at ? formatDate(c.redeemed_at) : '—'}</td>
        <td>${escapeHtml(c.redeemed_by || '—')}</td>
        <td>
          ${c.status === 'active' ? `<button class="btn-sm" onclick="revokeMobileCode(${c.id})">Revoke</button>` : ''}
          <button class="btn-sm" onclick="copyToClipboard('${escapeAttr(c.code)}')" style="margin-left:4px;">Copy</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterMobileCodes() {
  renderMobileCodes();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard');
  }).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Copied to clipboard');
  });
}

async function revokeMobileCode(id) {
  if (!confirm('Revoke this mobile access code? This cannot be undone.')) return;

  try {
    await api.put(`/api/mobile/codes/${id}/revoke`);
    showToast('Code revoked');
    await loadAllData();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

function showGenerateMobileCodesModal() {
  const agencyOptions = dashState.agencies
    .filter(a => a.is_active && (a.mobile_seats_allocated || 0) > 0)
    .map(a => {
      const used = dashState.mobileCodes.filter(c => c.agency_id === a.id && (c.status === 'active' || c.status === 'redeemed')).length;
      const remaining = Math.max(0, (a.mobile_seats_allocated || 0) - used);
      return `<option value="${a.id}">${escapeHtml(a.agency_name)} (${remaining} remaining)</option>`;
    }).join('');

  if (!agencyOptions) {
    showToast('No agencies with mobile seat allocation. Edit an agency to set Mobile App Seats first.');
    return;
  }

  openModal('Generate Mobile Access Codes', `
    <div class="form-group">
      <label>Agency</label>
      <select id="fMobileAgency">${agencyOptions}</select>
    </div>
    <div class="form-group">
      <label>Number of Codes</label>
      <input type="number" id="fMobileCount" value="1" min="1" max="50" />
    </div>
    <p style="font-size:13px;color:var(--text-muted);margin-top:8px;">Each code is a one-time use access code for the RiteDoc mobile app. Codes are tied to this agency's allocation.</p>
  `, async () => {
    const agencyId = parseInt(document.getElementById('fMobileAgency').value);
    const count = parseInt(document.getElementById('fMobileCount').value) || 1;

    try {
      const result = await api.post('/api/mobile/codes/generate', { agency_id: agencyId, count });
      closeModal();

      if (result.codes && result.codes.length > 0) {
        const codesHtml = result.codes.map(c => `<code style="display:block;font-size:15px;background:#f3f4f6;padding:8px 12px;border-radius:6px;margin:4px 0;letter-spacing:1px;">${c}</code>`).join('');
        openModal('Generated Mobile Access Codes', `
          <p style="margin-bottom:12px;">Generated <strong>${result.codes.length}</strong> code(s) for <strong>${escapeHtml(result.agency_name)}</strong>. Remaining allocation: <strong>${result.remaining}</strong>.</p>
          <div style="max-height:300px;overflow-y:auto;">${codesHtml}</div>
          <button class="btn-secondary" onclick="copyToClipboard('${result.codes.join('\n')}')" style="margin-top:12px;">Copy All Codes</button>
        `, () => { closeModal(); });
      }

      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

function showGenerateMobileCodesForAgency(agencyId) {
  const agency = dashState.agencies.find(a => a.id === agencyId);
  if (!agency) return;

  const used = dashState.mobileCodes.filter(c => c.agency_id === agencyId && (c.status === 'active' || c.status === 'redeemed')).length;
  const remaining = Math.max(0, (agency.mobile_seats_allocated || 0) - used);

  if (remaining <= 0) {
    showToast(`No remaining mobile allocation for ${agency.agency_name}. Edit the agency to increase Mobile App Seats.`);
    return;
  }

  openModal(`Generate Mobile Codes — ${escapeHtml(agency.agency_name)}`, `
    <div class="stats-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-label">Allocated</div><div class="stat-value">${agency.mobile_seats_allocated || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Used</div><div class="stat-value">${used}</div></div>
      <div class="stat-card"><div class="stat-label">Remaining</div><div class="stat-value">${remaining}</div></div>
    </div>
    <div class="form-group">
      <label>Number of Codes to Generate</label>
      <input type="number" id="fMobileCount" value="1" min="1" max="${remaining}" />
    </div>
  `, async () => {
    const count = parseInt(document.getElementById('fMobileCount').value) || 1;

    try {
      const result = await api.post('/api/mobile/codes/generate', { agency_id: agencyId, count });
      closeModal();

      if (result.codes && result.codes.length > 0) {
        const codesHtml = result.codes.map(c => `<code style="display:block;font-size:15px;background:#f3f4f6;padding:8px 12px;border-radius:6px;margin:4px 0;letter-spacing:1px;">${c}</code>`).join('');
        openModal('Generated Mobile Access Codes', `
          <p style="margin-bottom:12px;">Generated <strong>${result.codes.length}</strong> code(s) for <strong>${escapeHtml(result.agency_name || agency.agency_name)}</strong>. Remaining allocation: <strong>${result.remaining}</strong>.</p>
          <div style="max-height:300px;overflow-y:auto;">${codesHtml}</div>
          <button class="btn-secondary" onclick="copyToClipboard('${result.codes.join('\n')}')" style="margin-top:12px;">Copy All Codes</button>
        `, () => { closeModal(); });
      }

      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

// ===== AUTOMATION LOG =====
async function loadAutomationLog() {
  if (!api) return;

  const tbody = document.getElementById('automationLogBody');
  tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Loading...</td></tr>';

  try {
    const logs = await api.get('/api/automation/log?limit=100');

    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No automation log entries</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const details = typeof l.details_json === 'string'
        ? l.details_json
        : JSON.stringify(l.details_json || '{}');
      return `
        <tr>
          <td>${formatDate(l.performed_at)}</td>
          <td><code style="font-size:12px;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(l.action)}</code></td>
          <td style="font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeAttr(details)}">${escapeHtml(truncate(details, 80))}</td>
          <td>${escapeHtml(l.performed_by || '—')}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Error: ${escapeHtml(e.message)}</td></tr>`;
  }
}

function updateAutomationSection() {
  const apiUrlEl = document.getElementById('apiWorkerUrl');
  if (apiUrlEl) apiUrlEl.textContent = CONFIG.apiUrl;
}

// ===== MODAL SYSTEM =====
let modalSubmitHandler = null;

function openModal(title, bodyHtml, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalOverlay').classList.add('active');

  const submitBtn = document.getElementById('modalSubmit');
  modalSubmitHandler = onSubmit;
  submitBtn.onclick = () => {
    if (modalSubmitHandler) modalSubmitHandler();
  };
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  modalSubmitHandler = null;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
});

// ===== UTILITIES =====
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateStr);
  } catch {
    return '';
  }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('rc_auth_token');

  if (savedToken) {
    // Try to restore session
    dashState.authToken = savedToken;
    dashState.isAuthenticated = true;
    api = new ApiClient(CONFIG.apiUrl, savedToken);

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardShell').style.display = 'flex';

    loadAllData().catch(() => {
      // Token expired or invalid — force re-login
      handleLogout();
    });
  }

  // Enter key on login form
  const pwField = document.getElementById('loginPassword');
  if (pwField) {
    pwField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }
});
