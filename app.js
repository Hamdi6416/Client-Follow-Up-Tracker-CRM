// CONFIGURATION
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxm79W-bqEmKqgty9CHM3psc-aozvNpFear6JcmKXfCPpIOsWIrZdnWld7n9rpycsFn/exec";
const HEADERS = [
  "ClientID","CompanyName","ContactPerson","Phone","Email",
  "InitialContact","CurrentStage","NextAction","Deadline",
  "PresSent","MeetingDate","ClientNeeds","QuoteAmount",
  "Status","LastFollowUp","NextFollowUp","Comments",
  "Salesperson","QuotationCount","TotalQuoteAmount"
];

// DOM Elements
const clientTableBody = document.getElementById('clientTableBody');
const clientForm = document.getElementById('clientForm');
const clientModal = document.getElementById('clientModal');
const clientDetailsModal = document.getElementById('clientDetailsModal');
const modalTitle = document.getElementById('modalTitle');
const emailModal = document.getElementById('emailModal');
const hamdiTaskList = document.getElementById('hamdiTaskList');
const dinaTaskList = document.getElementById('dinaTaskList');
const statsGrid = document.getElementById('statsGrid');
const searchInput = document.getElementById('searchClients');
const messageBox = document.getElementById('messageBox');
const themeSwitcher = document.getElementById('themeSwitcher');
const themeIcon = document.getElementById('themeIcon');

// Modals close buttons
document.getElementById('closeClientModal').onclick = closeClientModal;
document.getElementById('closeClientDetailsModal').onclick = closeClientDetailsModal;
document.getElementById('closeEmailModal').onclick = closeEmailModal;

// Modal click outside to close
window.onclick = function(event) {
  [clientModal, clientDetailsModal, emailModal].forEach(modal => {
    if (event.target === modal) modal.style.display = "none";
  });
};

// State
let clients = [];
let editingClient = null;
let selectedTemplate = null;
let currentEmailClient = null;
let currentDetailsClient = null;

// Theme
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('clientTheme', newTheme);
    themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
    lucide.createIcons();
}
function loadTheme() {
    const theme = localStorage.getItem('clientTheme') || 'light';
    document.body.setAttribute('data-theme', theme);
    themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    lucide.createIcons();
}
themeSwitcher.onclick = toggleTheme;

// Notifications
function showMessage(text, type = 'success', timeout = 2000) {
    messageBox.textContent = text;
    messageBox.className = 'message-box visible ' + type;
    setTimeout(() => {
        messageBox.classList.remove('visible');
    }, timeout);
}

// Google Sheets Sync
async function syncToGoogleSheets() {
    try {
        showMessage("Syncing to Google Sheets...", "info", 2500);
        const res = await fetch(SHEET_URL, {
            method: "POST",
            body: JSON.stringify(clients),
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (data.success) {
            showMessage("Data synced to Google Sheets!", "success");
        } else {
            showMessage("Google Sheets sync FAILED: " + data.message, "error", 5000);
        }
    } catch (err) {
        showMessage("Google Sheets sync ERROR: " + err.message, "error", 5000);
    }
}

// Fetch all rows from Google Sheet
async function fetchClientsFromGoogleSheets() {
    try {
        showMessage("Loading clients...", "info", 1500);
        const res = await fetch(SHEET_URL);
        const data = await res.json();
        if (data.success && Array.isArray(data.clients)) {
            clients = data.clients.map(c => ({...c}));
            saveClients();
            renderAll();
            showMessage("Loaded from Google Sheets!", "success");
        } else {
            showMessage("Failed to load data: " + data.message, "error", 4000);
        }
    } catch (err) {
        showMessage("Failed to load: " + err.message, "error", 4000);
    }
}

// Local Storage Fallback
function loadClients() {
    const saved = localStorage.getItem('clientTracker_clients');
    clients = saved ? JSON.parse(saved) : [];
}
function saveClients() {
    localStorage.setItem('clientTracker_clients', JSON.stringify(clients));
}

// Render functions
function renderClients(filter = '') {
    let filtered = clients;
    if (filter) {
        const f = filter.toLowerCase();
        filtered = clients.filter(c =>
            (c.CompanyName||'').toLowerCase().includes(f) ||
            (c.ContactPerson||'').toLowerCase().includes(f) ||
            (c.Email||'').toLowerCase().includes(f) ||
            (c.Salesperson||'').toLowerCase().includes(f)
        );
    }
    clientTableBody.innerHTML = filtered.map(client => `
        <tr>
            <td>${client.ClientID}</td>
            <td>${client.CompanyName}</td>
            <td>${client.ContactPerson}</td>
            <td>${client.Salesperson||''}</td>
            <td>${client.NextAction||client.NextAction||''}</td>
            <td>${client.NextFollowUp||''}</td>
            <td>${client.CurrentStage||client.Status||''}</td>
            <td class="client-actions">
                <button class="action-btn" title="Details" onclick="openClientDetailsModal('${client.ClientID}')"><i data-lucide="info"></i></button>
                <button class="action-btn" title="Edit" onclick="openClientModal('edit','${client.ClientID}')"><i data-lucide="edit"></i></button>
                <button class="action-btn" title="Delete" onclick="deleteClient('${client.ClientID}')"><i data-lucide="trash"></i></button>
                <button class="action-btn" title="Email" onclick="openEmailModal('${client.ClientID}')"><i data-lucide="mail"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}
window.openClientDetailsModal = openClientDetailsModal;
window.openClientModal = openClientModal;
window.deleteClient = deleteClient;
window.openEmailModal = openEmailModal;

function renderStats() {
    // Example stats (customize as needed)
    let dueToday = 0, meetings = 0, calls = 0, active = 0, won = 0, quotations = 0, quotationsSum = 0;
    const today = new Date().toISOString().slice(0,10);
    const month = (new Date()).getMonth();
    clients.forEach(c => {
        if ((c.NextFollowUp||'').slice(0,10) === today) dueToday++;
        if ((c.CurrentStage||c.Status||'').toLowerCase().includes('meeting')) meetings++;
        if ((c.NextAction||'').toLowerCase().includes('call')) calls++;
        if ((c.CurrentStage||c.Status||'').toLowerCase().includes('won')) won++;
        if ((c.CurrentStage||c.Status||'').toLowerCase().includes('active')) active++;
        if (c.QuoteAmount) {
            quotations++;
            quotationsSum += parseFloat(c.QuoteAmount) || 0;
        }
    });
    document.getElementById('statDueToday').textContent = dueToday;
    document.getElementById('statMeetingsThisWeek').textContent = meetings;
    document.getElementById('statPendingCalls').textContent = calls;
    document.getElementById('statActiveClients').textContent = active;
    document.getElementById('statWonThisMonth').textContent = won;
    document.getElementById('statTotalQuotations').textContent = `${quotations} ($${quotationsSum.toFixed(2)})`;
}
function renderTasks() {
    let hamdi = clients.filter(c => (c.Salesperson||'').toLowerCase() === 'hamdi');
    let dina = clients.filter(c => (c.Salesperson||'').toLowerCase() === 'dina');
    hamdiTaskList.innerHTML = hamdi.map(c => `
        <div class="task-item high">
            <div class="task-info">
                <div class="task-title">${c.CompanyName}</div>
                <div class="task-meta">${c.NextAction||''} | Next: ${c.NextFollowUp||''}</div>
            </div>
        </div>
    `).join('');
    dinaTaskList.innerHTML = dina.map(c => `
        <div class="task-item medium">
            <div class="task-info">
                <div class="task-title">${c.CompanyName}</div>
                <div class="task-meta">${c.NextAction||''} | Next: ${c.NextFollowUp||''}</div>
            </div>
        </div>
    `).join('');
}
function renderAll() {
    renderClients(searchInput.value);
    renderStats();
    renderTasks();
}

// Modal controls
function openClientModal(mode, clientId = null) {
    clientModal.style.display = 'flex';
    if (mode === 'edit' && clientId) {
        editingClient = clients.find(c => c.ClientID == clientId);
        modalTitle.textContent = 'Edit Client';
        populateClientForm(editingClient);
    } else {
        editingClient = null;
        modalTitle.textContent = 'Add New Client';
        clientForm.reset();
        document.getElementById('clientId').value = '';
    }
}
function closeClientModal() {
    clientModal.style.display = 'none';
    editingClient = null;
}
document.getElementById('addClientBtn').onclick = () => openClientModal('add');

function populateClientForm(client) {
    document.getElementById('clientId').value = client.ClientID || '';
    document.getElementById('companyName').value = client.CompanyName || '';
    document.getElementById('contactPerson').value = client.ContactPerson || '';
    document.getElementById('email').value = client.Email || '';
    document.getElementById('phone').value = client.Phone || '';
    document.getElementById('Salesperson').value = client.Salesperson || '';
    document.getElementById('currentStage').value = client.CurrentStage || client.Status || '';
    document.getElementById('nextAction').value = client.NextAction || '';
    document.getElementById('nextFollowUp').value = client.NextFollowUp || '';
    document.getElementById('QuoteAmount').value = client.QuoteAmount || '';
}

clientForm.onsubmit = function(e) {
    e.preventDefault();
    const id = document.getElementById('clientId').value || generateClientId();
    const clientObj = {};
    HEADERS.forEach(h => clientObj[h] = '');
    clientObj.ClientID = id;
    clientObj.CompanyName = document.getElementById('companyName').value;
    clientObj.ContactPerson = document.getElementById('contactPerson').value;
    clientObj.Email = document.getElementById('email').value;
    clientObj.Phone = document.getElementById('phone').value;
    clientObj.Salesperson = document.getElementById('Salesperson').value;
    clientObj.CurrentStage = document.getElementById('currentStage').value;
    clientObj.Status = document.getElementById('currentStage').value;
    clientObj.NextAction = document.getElementById('nextAction').value;
    clientObj.NextFollowUp = document.getElementById('nextFollowUp').value;
    clientObj.QuoteAmount = document.getElementById('QuoteAmount').value;

    if (editingClient) {
        const idx = clients.findIndex(c => c.ClientID == id);
        clients[idx] = clientObj;
        showMessage('Client updated!', 'success', 1800);
    } else {
        clients.push(clientObj);
        showMessage('Client added!', 'success', 1800);
    }
    saveClients();
    renderAll();
    closeClientModal();
};

function generateClientId() {
    const maxId = clients.length > 0 ? Math.max(...clients.map(c => parseInt(c.ClientID || '0', 10) || 0)) : 0;
    return String(maxId + 1);
}
function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    clients = clients.filter(c => c.ClientID != clientId);
    saveClients();
    renderAll();
    showMessage('Client deleted.', 'warning', 1800);
}

function openClientDetailsModal(clientId) {
    currentDetailsClient = clients.find(c => c.ClientID == clientId);
    document.getElementById('detailsModalTitle').textContent = currentDetailsClient.CompanyName;
    document.getElementById('clientDetailsContent').innerHTML = `
        <div class="client-details">
            <div class="detail-item"><label>Contact:</label><div class="value">${currentDetailsClient.ContactPerson}</div></div>
            <div class="detail-item"><label>Email:</label><div class="value">${currentDetailsClient.Email}</div></div>
            <div class="detail-item"><label>Phone:</label><div class="value">${currentDetailsClient.Phone}</div></div>
            <div class="detail-item"><label>Salesperson:</label><div class="value">${currentDetailsClient.Salesperson}</div></div>
            <div class="detail-item"><label>Stage:</label><div class="value">${currentDetailsClient.CurrentStage||currentDetailsClient.Status}</div></div>
            <div class="detail-item"><label>Next Action:</label><div class="value">${currentDetailsClient.NextAction}</div></div>
            <div class="detail-item"><label>Next Follow-Up:</label><div class="value">${currentDetailsClient.NextFollowUp}</div></div>
            <div class="detail-item"><label>Quotation:</label><div class="value">${currentDetailsClient.QuoteAmount}</div></div>
        </div>
    `;
    document.getElementById('clientNotes').value = currentDetailsClient.Comments || '';
    clientDetailsModal.style.display = 'flex';
}
function closeClientDetailsModal() {
    clientDetailsModal.style.display = 'none';
    currentDetailsClient = null;
}
document.getElementById('saveNotesBtn').onclick = function() {
    if (!currentDetailsClient) return;
    currentDetailsClient.Comments = document.getElementById('clientNotes').value;
    const idx = clients.findIndex(c => c.ClientID == currentDetailsClient.ClientID);
    clients[idx] = currentDetailsClient;
    saveClients();
    showMessage('Notes saved.', 'success');
};
document.getElementById('editFromDetailsBtn').onclick = function() {
    if (!currentDetailsClient) return;
    closeClientDetailsModal();
    openClientModal('edit', currentDetailsClient.ClientID);
};

// Email Modal
function openEmailModal(clientId) {
    currentEmailClient = clients.find(c => c.ClientID == clientId);
    emailModal.style.display = 'flex';
    Array.from(document.querySelectorAll('.email-template-btn')).forEach(btn => {
        btn.classList.remove('selected');
    });
    selectedTemplate = null;
}
function closeEmailModal() {
    emailModal.style.display = 'none';
    currentEmailClient = null;
    selectedTemplate = null;
}
document.querySelectorAll('.email-template-btn').forEach(btn => {
    btn.onclick = function() {
        document.querySelectorAll('.email-template-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        selectedTemplate = this.getAttribute('data-template');
    };
});
document.getElementById('sendEmailBtn').onclick = function() {
    if (!currentEmailClient || !selectedTemplate) {
        showMessage('Select a template.', 'error');
        return;
    }
    let subject = '';
    let body = '';
    if (selectedTemplate === 'initial') {
        subject = `Initial Contact with ${currentEmailClient.CompanyName}`;
        body = `Hi ${currentEmailClient.ContactPerson},\n\nI'm reaching out regarding our recent conversation...`;
    } else if (selectedTemplate === 'followUp') {
        subject = `Follow-Up: ${currentEmailClient.CompanyName}`;
        body = `Hi ${currentEmailClient.ContactPerson},\n\nJust following up...`;
    } else if (selectedTemplate === 'proposal') {
        subject = `Proposal for ${currentEmailClient.CompanyName}`;
        body = `Dear ${currentEmailClient.ContactPerson},\n\nPlease find attached our proposal...`;
    }
    window.open(`mailto:${currentEmailClient.Email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    closeEmailModal();
};

// Search
searchInput.oninput = function() {
    renderClients(this.value);
};

// Sync Button
document.getElementById('syncBtn').onclick = async function() {
    await syncToGoogleSheets();
    // After sync, reload from sheet to reflect any changes from other users
    await fetchClientsFromGoogleSheets();
};

// Initial Load
async function init() {
    loadTheme();
    await fetchClientsFromGoogleSheets();
    renderAll();
    lucide.createIcons();
}
window.onload = init;
