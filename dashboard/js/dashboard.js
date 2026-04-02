/**
 * ReadyCompliant Admin Dashboard
 * Internal administration panel for managing RiteDoc subscriptions,
 * activation keys, support tickets, cartridge updates, and BIAB agencies.
 *
 * Uses Supabase JS client for data operations and Brevo API for notifications.
 */

// ===== CONFIGURATION =====
// These are loaded from localStorage or set during login
const CONFIG = {
  supabaseUrl: localStorage.getItem('rc_supabase_url') || '',
  supabaseAnonKey: localStorage.getItem('rc_supabase_anon_key') || '',
  brevoApiKey: localStorage.getItem('rc_brevo_api_key') || '',
};

// ===== STATE =====
const dashState = {
  currentSection: 'overview',
  clients: [],
  keys: [],
  tickets: [],
  cartridgeVersions: [],
  agencies: [],
  supabaseClient: null,
  isAuthenticated: false,
};

// ===== SUPABASE CLIENT =====
// Lightweight Supabase REST wrapper (no SDK dependency)
class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url.replace(/\/$/, '');
    this.anonKey = anonKey;
    this.authToken = anonKey; // Use anon key for service-level access
  }

  async query(table, { select = '*', filter = '', order = '', limit = null } = {}) {
    let url = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    if (filter) url += `&${filter}`;
    if (order) url += `&order=${order}`;
    if (limit) url += `&limit=${limit}`;

    const resp = await fetch(url, {
      headers: {
        'apikey': this.anonKey,
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) throw new Error(`Query failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async insert(table, data) {
    const url = `${this.url}/rest/v1/${table}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': this.anonKey,
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Insert failed: ${resp.status} — ${text}`);
    }
    return resp.json();
  }

  async update(table, filter, data) {
    const url = `${this.url}/rest/v1/${table}?${filter}`;
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': this.anonKey,
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Update failed: ${resp.status} — ${text}`);
    }
    return resp.json();
  }

  async delete(table, filter) {
    const url = `${this.url}/rest/v1/${table}?${filter}`;
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': this.anonKey,
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (!resp.ok) throw new Error(`Delete failed: ${resp.status}`);
    return true;
  }

  async uploadToStorage(bucket, path, file) {
    const url = `${this.url}/storage/v1/object/${bucket}/${path}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': this.anonKey,
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': file.type || 'application/json',
      },
      body: file,
    });

    if (!resp.ok) {
      // Try upsert
      const resp2 = await fetch(url, {
        method: 'PUT',
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': file.type || 'application/json',
          'x-upsert': 'true',
        },
        body: file,
      });
      if (!resp2.ok) throw new Error(`Upload failed: ${resp2.status}`);
    }
    return true;
  }
}

// ===== TOAST =====
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== LOGIN =====
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  if (!email || !password) {
    errorEl.textContent = 'Please enter your email and password.';
    errorEl.style.display = 'block';
    return;
  }

  // For the admin dashboard, we use a simple credential check
  // In production, this would use Supabase Auth
  // The Supabase URL and key are stored after successful login
  const supabaseUrl = prompt('Enter Supabase Project URL:');
  const supabaseKey = prompt('Enter Supabase Anon Key:');

  if (!supabaseUrl || !supabaseKey) {
    errorEl.textContent = 'Supabase configuration is required.';
    errorEl.style.display = 'block';
    return;
  }

  // Store config
  CONFIG.supabaseUrl = supabaseUrl;
  CONFIG.supabaseAnonKey = supabaseKey;
  localStorage.setItem('rc_supabase_url', supabaseUrl);
  localStorage.setItem('rc_supabase_anon_key', supabaseKey);
  localStorage.setItem('rc_admin_email', email);

  // Initialize client
  dashState.supabaseClient = new SupabaseClient(supabaseUrl, supabaseKey);
  dashState.isAuthenticated = true;

  // Show dashboard
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardShell').style.display = 'flex';

  // Load all data
  loadAllData();
}

function handleLogout() {
  localStorage.removeItem('rc_supabase_url');
  localStorage.removeItem('rc_supabase_anon_key');
  localStorage.removeItem('rc_admin_email');
  dashState.isAuthenticated = false;
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
}

function getSectionTitle(id) {
  const titles = {
    overview: 'Overview',
    clients: 'Client Management',
    keys: 'Activation Keys',
    support: 'Support Tickets',
    cartridges: 'Cartridge Management',
    agencies: 'BIAB Agencies',
  };
  return titles[id] || id;
}

// ===== DATA LOADING =====
async function loadAllData() {
  const sb = dashState.supabaseClient;
  if (!sb) return;

  try {
    // Load all tables in parallel
    const [clients, keys, tickets, versions, agencies] = await Promise.all([
      sb.query('clients', { order: 'created_at.desc' }).catch(() => []),
      sb.query('activation_keys', { order: 'created_at.desc' }).catch(() => []),
      sb.query('support_tickets', { order: 'created_at.desc' }).catch(() => []),
      sb.query('cartridge_versions', { order: 'uploaded_at.desc' }).catch(() => []),
      sb.query('agencies', { order: 'created_at.desc' }).catch(() => []),
    ]);

    dashState.clients = clients;
    dashState.keys = keys;
    dashState.tickets = tickets;
    dashState.cartridgeVersions = versions;
    dashState.agencies = agencies;

    // Render everything
    renderOverview();
    renderClients();
    renderKeys();
    renderTickets();
    renderCartridgeVersions();
    renderAgencies();

  } catch (e) {
    console.error('Failed to load data:', e);
    showToast('Failed to load data. Check Supabase connection.');
  }
}

// ===== OVERVIEW =====
function renderOverview() {
  document.getElementById('statTotalClients').textContent = dashState.clients.length;
  document.getElementById('statActiveSubscriptions').textContent =
    dashState.clients.filter(c => c.subscription_status === 'active').length;
  document.getElementById('statActivatedKeys').textContent =
    dashState.keys.filter(k => k.activated_at).length;
  document.getElementById('statOpenTickets').textContent =
    dashState.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  document.getElementById('statCartridgeVersion').textContent =
    dashState.cartridgeVersions.length > 0 ? dashState.cartridgeVersions[0].version : '—';
  document.getElementById('statAgencies').textContent = dashState.agencies.length;

  // Recent activity
  const activityEl = document.getElementById('recentActivity');
  const activities = [];

  // Recent keys
  dashState.keys.slice(0, 5).forEach(k => {
    activities.push({
      dot: k.activated_at ? 'green' : 'orange',
      text: `Key ${k.key_code.substring(0, 12)}... ${k.activated_at ? 'activated' : 'generated'} (${k.subscription_type})`,
      time: formatRelativeTime(k.activated_at || k.created_at),
      date: new Date(k.activated_at || k.created_at),
    });
  });

  // Recent tickets
  dashState.tickets.slice(0, 5).forEach(t => {
    activities.push({
      dot: t.status === 'resolved' ? 'green' : t.status === 'open' ? 'red' : 'orange',
      text: `Ticket: ${t.category} — ${truncate(t.description, 50)}`,
      time: formatRelativeTime(t.created_at),
      date: new Date(t.created_at),
    });
  });

  // Sort by date
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
      <td><strong>${escapeHtml(c.name || '—')}</strong></td>
      <td>${escapeHtml(c.email || '—')}</td>
      <td>${escapeHtml(c.company_name || '—')}</td>
      <td><span class="badge badge-${c.subscription_type || 'standard'}">${escapeHtml(c.subscription_type || '—')}</span></td>
      <td><span class="badge badge-${c.subscription_status === 'active' ? 'active' : 'inactive'}">${escapeHtml(c.subscription_status || '—')}</span></td>
      <td>${formatDate(c.start_date)}</td>
      <td>
        <button class="btn-sm" onclick="editClient('${c.id}')">Edit</button>
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
      <div class="form-group"><label>Name</label><input type="text" id="fClientName" /></div>
      <div class="form-group"><label>Email</label><input type="email" id="fClientEmail" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Phone</label><input type="text" id="fClientPhone" /></div>
      <div class="form-group"><label>Company</label><input type="text" id="fClientCompany" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>ABN</label><input type="text" id="fClientAbn" /></div>
      <div class="form-group">
        <label>Subscription Type</label>
        <select id="fClientSubType">
          <option value="founders">Founders</option>
          <option value="standard">Standard</option>
          <option value="biab">Business in a Box</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="fClientNotes"></textarea></div>
  `, async () => {
    const data = {
      name: document.getElementById('fClientName').value,
      email: document.getElementById('fClientEmail').value,
      phone: document.getElementById('fClientPhone').value,
      company_name: document.getElementById('fClientCompany').value,
      abn: document.getElementById('fClientAbn').value,
      subscription_type: document.getElementById('fClientSubType').value,
      subscription_status: 'active',
      start_date: new Date().toISOString(),
      notes: document.getElementById('fClientNotes').value,
    };

    try {
      await dashState.supabaseClient.insert('clients', data);
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
      <div class="form-group"><label>Name</label><input type="text" id="fClientName" value="${escapeAttr(client.name || '')}" /></div>
      <div class="form-group"><label>Email</label><input type="email" id="fClientEmail" value="${escapeAttr(client.email || '')}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Phone</label><input type="text" id="fClientPhone" value="${escapeAttr(client.phone || '')}" /></div>
      <div class="form-group"><label>Company</label><input type="text" id="fClientCompany" value="${escapeAttr(client.company_name || '')}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>ABN</label><input type="text" id="fClientAbn" value="${escapeAttr(client.abn || '')}" /></div>
      <div class="form-group">
        <label>Subscription Status</label>
        <select id="fClientStatus">
          <option value="active" ${client.subscription_status === 'active' ? 'selected' : ''}>Active</option>
          <option value="cancelled" ${client.subscription_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          <option value="suspended" ${client.subscription_status === 'suspended' ? 'selected' : ''}>Suspended</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Notes</label><textarea id="fClientNotes">${escapeHtml(client.notes || '')}</textarea></div>
  `, async () => {
    const data = {
      name: document.getElementById('fClientName').value,
      email: document.getElementById('fClientEmail').value,
      phone: document.getElementById('fClientPhone').value,
      company_name: document.getElementById('fClientCompany').value,
      abn: document.getElementById('fClientAbn').value,
      subscription_status: document.getElementById('fClientStatus').value,
      notes: document.getElementById('fClientNotes').value,
    };

    try {
      await dashState.supabaseClient.update('clients', `id=eq.${id}`, data);
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
    const agencyName = k.agency_id ? (dashState.agencies.find(a => a.id === k.agency_id)?.agency_name || k.agency_id.substring(0, 8)) : '—';

    return `
      <tr>
        <td><code style="font-size:12px;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(k.key_code)}</code></td>
        <td><span class="badge badge-${k.subscription_type || 'standard'}">${escapeHtml(k.subscription_type || '—')}</span></td>
        <td>${escapeHtml(agencyName)}</td>
        <td><span class="badge badge-${statusClass}">${status}</span></td>
        <td>${formatDate(k.activated_at)}</td>
        <td style="font-size:11px;font-family:monospace;">${k.hardware_fingerprint ? escapeHtml(k.hardware_fingerprint.substring(0, 20)) : '—'}</td>
        <td>
          ${!k.deactivated_at ? `<button class="btn-danger" onclick="deactivateKey('${k.id}')">Deactivate</button>` : ''}
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
      const keys = [];
      for (let i = 0; i < count; i++) {
        keys.push({
          key_code: generateKeyCode(),
          subscription_type: subType,
          agency_id: agencyId,
          is_active: true,
        });
      }

      await dashState.supabaseClient.insert('activation_keys', keys);
      showToast(`${count} key(s) generated successfully`);
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
}

async function deactivateKey(id) {
  if (!confirm('Are you sure you want to deactivate this key? The user will lose access.')) return;

  try {
    await dashState.supabaseClient.update('activation_keys', `id=eq.${id}`, {
      is_active: false,
      deactivated_at: new Date().toISOString(),
    });

    // Log to audit
    await dashState.supabaseClient.insert('key_audit_log', {
      key_id: id,
      action: 'deactivated',
      reason: 'Admin deactivation via dashboard',
      performed_at: new Date().toISOString(),
    });

    showToast('Key deactivated');
    await loadAllData();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

function generateKeyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

// ===== SUPPORT TICKETS =====
function renderTickets() {
  const tbody = document.getElementById('ticketsBody');
  if (dashState.tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No support tickets</td></tr>';
    return;
  }

  tbody.innerHTML = dashState.tickets.map(t => {
    const clientName = t.client_id ?
      (dashState.clients.find(c => c.id === t.client_id)?.name || 'Unknown') : '—';
    const statusClass = t.status === 'resolved' ? 'active' :
                        t.status === 'open' ? 'inactive' : 'pending';

    return `
      <tr data-status="${t.status}">
        <td style="font-size:12px;color:var(--text-muted);">${escapeHtml(t.id.substring(0, 8))}</td>
        <td>${escapeHtml(clientName)}</td>
        <td>${escapeHtml(t.category || '—')}</td>
        <td>${escapeHtml(truncate(t.description || '', 60))}</td>
        <td><span class="badge badge-${statusClass}">${escapeHtml(t.status)}</span></td>
        <td>${formatDate(t.created_at)}</td>
        <td>
          <button class="btn-sm" onclick="editTicket('${t.id}')">Edit</button>
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
        ${dashState.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.email)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Category</label>
      <select id="fTicketCategory">
        <option value="activation">Activation Issue</option>
        <option value="billing">Billing</option>
        <option value="technical">Technical Support</option>
        <option value="feature_request">Feature Request</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="form-group"><label>Description</label><textarea id="fTicketDesc"></textarea></div>
  `, async () => {
    const data = {
      client_id: document.getElementById('fTicketClient').value || null,
      category: document.getElementById('fTicketCategory').value,
      description: document.getElementById('fTicketDesc').value,
      status: 'open',
    };

    try {
      await dashState.supabaseClient.insert('support_tickets', data);
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
    if (status === 'resolved') {
      data.resolved_at = new Date().toISOString();
    }

    try {
      await dashState.supabaseClient.update('support_tickets', `id=eq.${id}`, data);
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
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No cartridge versions uploaded</td></tr>';
    return;
  }

  tbody.innerHTML = dashState.cartridgeVersions.map(v => `
    <tr>
      <td><strong>${escapeHtml(v.version)}</strong></td>
      <td>${escapeHtml(v.filename || '—')}</td>
      <td>${formatDate(v.uploaded_at)}</td>
      <td>${escapeHtml(v.notes || '—')}</td>
    </tr>
  `).join('');
}

async function handleCartridgeUpload() {
  const version = document.getElementById('cartridgeVersionInput').value.trim();
  const notes = document.getElementById('cartridgeNotesInput').value.trim();
  const statusEl = document.getElementById('cartridgeStatus');

  if (!version) {
    statusEl.className = 'cartridge-status error';
    statusEl.textContent = 'Please enter a version number.';
    statusEl.style.display = 'block';
    return;
  }

  const files = {
    'red_flags_v2.json': document.getElementById('uploadRedFlags').files[0],
    'rubric_v2.json': document.getElementById('uploadRubric').files[0],
    'policies.json': document.getElementById('uploadPolicies').files[0],
    'system_prompts.json': document.getElementById('uploadPrompts').files[0],
  };

  const hasFiles = Object.values(files).some(f => f);
  if (!hasFiles) {
    statusEl.className = 'cartridge-status error';
    statusEl.textContent = 'Please select at least one cartridge file to upload.';
    statusEl.style.display = 'block';
    return;
  }

  statusEl.className = 'cartridge-status info';
  statusEl.textContent = 'Uploading cartridge files...';
  statusEl.style.display = 'block';

  try {
    // Upload each file to Supabase Storage
    let uploadedCount = 0;
    for (const [filename, file] of Object.entries(files)) {
      if (file) {
        const path = `v${version}/${filename}`;
        await dashState.supabaseClient.uploadToStorage('cartridges', path, file);
        uploadedCount++;
      }
    }

    // Create version record in database
    await dashState.supabaseClient.insert('cartridge_versions', {
      version,
      filename: Object.entries(files).filter(([_, f]) => f).map(([n]) => n).join(', '),
      notes,
      uploaded_at: new Date().toISOString(),
    });

    statusEl.className = 'cartridge-status success';
    statusEl.textContent = `Cartridge v${version} uploaded successfully (${uploadedCount} files).`;
    showToast('Cartridge uploaded');

    // Reload versions
    await loadAllData();
  } catch (e) {
    statusEl.className = 'cartridge-status error';
    statusEl.textContent = 'Upload failed: ' + e.message;
  }
}

async function handleNotifySubscribers() {
  const brevoKey = CONFIG.brevoApiKey || prompt('Enter Brevo API Key:');
  if (!brevoKey) {
    showToast('Brevo API key is required to send notifications.');
    return;
  }

  CONFIG.brevoApiKey = brevoKey;
  localStorage.setItem('rc_brevo_api_key', brevoKey);

  const latestVersion = dashState.cartridgeVersions.length > 0
    ? dashState.cartridgeVersions[0].version : 'latest';

  // Get active client emails
  const activeClients = dashState.clients.filter(c =>
    c.subscription_status === 'active' && c.email
  );

  if (activeClients.length === 0) {
    showToast('No active subscribers to notify.');
    return;
  }

  if (!confirm(`Send update notification to ${activeClients.length} active subscriber(s)?`)) return;

  try {
    // Send via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ReadyCompliant', email: 'updates@readycompliant.com' },
        to: activeClients.map(c => ({ email: c.email, name: c.name })),
        subject: `RiteDoc Compliance Update Available — Version ${latestVersion}`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h1 style="color: #111827; font-size: 24px;">Compliance Update Available</h1>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              A new compliance data update (Version ${latestVersion}) is now available for RiteDoc.
            </p>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              To update, open RiteDoc and go to <strong>Settings</strong> &rarr; <strong>Check for Updates</strong> &rarr; <strong>Install Update</strong>.
            </p>
            <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
              This update ensures your progress notes are assessed against the latest NDIS Practice Standards and compliance requirements.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 13px;">
              ReadyCompliant &mdash; Technology-Assisted Documentation Drafting<br />
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
    const seatsUsed = dashState.keys.filter(k => k.agency_id === a.id && k.activated_at).length;
    return `
      <tr>
        <td><strong>${escapeHtml(a.agency_name || '—')}</strong></td>
        <td>${escapeHtml(a.contact_name || '—')}</td>
        <td>${escapeHtml(a.contact_email || '—')}</td>
        <td>${a.seats_purchased || 0}</td>
        <td>${seatsUsed}</td>
        <td><span class="badge badge-${a.is_active ? 'active' : 'inactive'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-sm" onclick="editAgency('${a.id}')">Edit</button>
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
      <div class="form-group"><label>Seats Purchased</label><input type="number" id="fAgencySeats" value="5" min="1" /></div>
    </div>
  `, async () => {
    const data = {
      agency_name: document.getElementById('fAgencyName').value,
      abn: document.getElementById('fAgencyAbn').value,
      contact_name: document.getElementById('fAgencyContact').value,
      contact_email: document.getElementById('fAgencyEmail').value,
      contact_phone: document.getElementById('fAgencyPhone').value,
      seats_purchased: parseInt(document.getElementById('fAgencySeats').value) || 5,
      is_active: true,
    };

    try {
      await dashState.supabaseClient.insert('agencies', data);
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
      <div class="form-group"><label>Seats Purchased</label><input type="number" id="fAgencySeats" value="${agency.seats_purchased || 0}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Contact Name</label><input type="text" id="fAgencyContact" value="${escapeAttr(agency.contact_name || '')}" /></div>
      <div class="form-group"><label>Contact Email</label><input type="email" id="fAgencyEmail" value="${escapeAttr(agency.contact_email || '')}" /></div>
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="fAgencyStatus">
        <option value="true" ${agency.is_active ? 'selected' : ''}>Active</option>
        <option value="false" ${!agency.is_active ? 'selected' : ''}>Inactive</option>
      </select>
    </div>
  `, async () => {
    const data = {
      agency_name: document.getElementById('fAgencyName').value,
      seats_purchased: parseInt(document.getElementById('fAgencySeats').value),
      contact_name: document.getElementById('fAgencyContact').value,
      contact_email: document.getElementById('fAgencyEmail').value,
      is_active: document.getElementById('fAgencyStatus').value === 'true',
    };

    try {
      await dashState.supabaseClient.update('agencies', `id=eq.${id}`, data);
      showToast('Agency updated');
      closeModal();
      await loadAllData();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });
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

// Close modal on overlay click
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ===== UTILITIES =====
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
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
  // Check if already configured
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    dashState.supabaseClient = new SupabaseClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    dashState.isAuthenticated = true;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardShell').style.display = 'flex';
    loadAllData();
  }

  // Enter key on login
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});
