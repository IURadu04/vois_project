

const API_BASE = 'http://127.0.0.1:8000';

/*dark mode / light mode*/
function updateThemeButton(mode) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  if (mode === 'dark') {
    btn.innerHTML = `<i data-feather="sun"></i> <span class="label">Light</span>`;
  } else {
    btn.innerHTML = `<i data-feather="moon"></i> <span class="label">Dark</span>`;
  }
  if (window.feather) feather.replace();
}

function initThemeToggle() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);

  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeButton(next);
    });
  }
}

/* login / register / verify */
async function tryLoginJSON(username, password) {
  return fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
}
async function tryLoginForm(username, password) {
  return fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password })
  });
}
async function login(username, password) {
  let resp = await tryLoginJSON(username, password);
  if (!resp.ok) resp = await tryLoginForm(username, password);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(txt || 'Autentificare eșuată');
  }
  return resp.json();
}

function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    try {
      const data = await login(username, password);
      const token = data.access_token || data.token;
      if (!token) throw new Error('Lipsește access_token din răspuns.');
      localStorage.setItem('token', token);
      if (typeof data.is_admin !== 'undefined') {
        localStorage.setItem('is_admin', String(!!data.is_admin));
      }
      localStorage.setItem('username', username);
      // Redirect după rol
      const isAdmin = String(localStorage.getItem('is_admin')) === 'true';
      window.location.href = isAdmin ? 'admin.html' : 'employee.html';
    } catch (err) {
      errorEl.textContent = 'Autentificare eșuată: ' + err.message;
    }
  });
}

function initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('newPassword').value;
    const errEl = document.getElementById('registerError');
    errEl.textContent = '';
    try {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      if (!resp.ok) {
        let msg = 'Eroare la înregistrare';
        try { const d = await resp.json(); if (d.detail) msg = d.detail; } catch {}
        throw new Error(msg);
      }
      alert('Cont creat! Verifică email-ul pentru codul de confirmare.');
      window.location.href = 'index.html';
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

function initVerify() {
  const form = document.getElementById('verifyForm');
  if (!form) return;

  // Permite și verificarea prin query params ?username=...&code=...
  const params = new URLSearchParams(location.search);
  const qpUser = params.get('username');
  const qpCode = params.get('code');
  if (qpUser && qpCode) {
    document.getElementById('vUser').value = qpUser;
    document.getElementById('vCode').value = qpCode;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('vUser').value.trim();
    const code = document.getElementById('vCode').value.trim();
    const msgEl = document.getElementById('verifyMsg');
    msgEl.textContent = '';
    try {
      const resp = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code })
      });
      if (!resp.ok) {
        let txt = 'Cod invalid sau eroare la verificare.';
        try { const j = await resp.json(); if (j.detail) txt = j.detail; } catch {}
        throw new Error(txt);
      }
      alert('Email verificat! Așteaptă aprobarea adminului pentru a te autentifica.');
      window.location.href = 'index.html';
    } catch (err) {
      msgEl.textContent = err.message;
    }
  });
}

/*logout*/
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}
window.logout = logout;

/*  ADMIM (Task, Team, Chat, User approval) */
let allTasks = [];
let chats = JSON.parse(localStorage.getItem('chats') || '{}'); // fallback
let currentTeamId = null;

async function loadTasks() {
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/tasks/`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) return;
  allTasks = await resp.json();
  const tbody = document.getElementById('tasksTbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  allTasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${task.id}</td>
      <td>${task.title}</td>
      <td>${task.description || ""}</td>
      <td>${task.assigned_to || "-"}</td>
      <td>${task.team_id || "-"}</td>
      <td><progress value="${task.progress}" max="100"></progress> ${task.progress}%</td>
      <td>${task.status}</td>
      <td>${task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}</td>
      <td>
        <button data-id="${task.id}" class="editTaskBtn">Editează</button>
        <button data-id="${task.id}" class="deleteTaskBtn">Șterge</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('.editTaskBtn').forEach(btn => {
    btn.addEventListener('click', () => startEditTask(btn.dataset.id));
  });
  document.querySelectorAll('.deleteTaskBtn').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

async function startEditTask(taskId) {
  const t = allTasks.find(x => x.id == taskId);
  if (!t) return;
  document.getElementById('title').value = t.title;
  document.getElementById('description').value = t.description || "";
  document.getElementById('assigned_to').value = t.assigned_to || "";
  document.getElementById('team_id').value = t.team_id || "";
  document.getElementById('status').value = t.status;
  document.getElementById('progress').value = t.progress;
  document.getElementById('deadline').value = t.deadline ? t.deadline.substring(0,10) : "";
  document.getElementById('taskId').value = t.id;
  document.getElementById('taskFormTitle').innerText = "Editează Task";
  document.getElementById('cancelEdit').style.display = "inline";
}

function resetTaskForm() {
  const f = document.getElementById('taskForm');
  f?.reset();
  const idEl = document.getElementById('taskId'); if (idEl) idEl.value = "";
  const titleEl = document.getElementById('taskFormTitle'); if (titleEl) titleEl.innerText = "Adaugă Task Nou";
  const cancelBtn = document.getElementById('cancelEdit'); if (cancelBtn) cancelBtn.style.display = "none";
}

async function deleteTask(taskId) {
  if (!confirm(`Sigur doriți să ștergeți task-ul #${taskId}?`)) return;
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (resp.ok) await loadTasks(); else alert("Eroare la ștergere");
}

function initTaskForm() {
  const f = document.getElementById('taskForm');
  if (!f) return;
  document.getElementById('cancelEdit')?.addEventListener('click', resetTaskForm);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const data = {
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      assigned_to: document.getElementById('assigned_to').value || null,
      team_id: document.getElementById('team_id').value || null,
      status: document.getElementById('status').value,
      progress: Number(document.getElementById('progress').value) || 0,
      deadline: null
    };
    const deadlineInput = document.getElementById('deadline').value;
    if (deadlineInput) data.deadline = new Date(deadlineInput).toISOString();

    const taskId = document.getElementById('taskId').value;
    const method = taskId ? 'PUT' : 'POST';
    const url = taskId ? `${API_BASE}/tasks/${taskId}` : `${API_BASE}/tasks/`;

    const resp = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(data)
    });
    if (!resp.ok) { alert("Eroare la salvarea task-ului"); return; }
    await loadTasks();
    resetTaskForm();
  });
}

/* Teams (admin) */
async function loadTeams() {
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/teams/`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) return;
  const teams = await resp.json();
  const ul = document.getElementById('teamList');
  if (!ul) return;
  ul.innerHTML = "";
  teams.forEach(team => {
    const li = document.createElement('li');
    li.textContent = team.name;
    li.style.cursor = "pointer";
    li.addEventListener('click', () => showTeamDetails(team.id, team.name));
    const delBtn = document.createElement('button');
    delBtn.textContent = "Șterge";
    delBtn.style.marginLeft = "10px";
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTeam(team.id);
    });
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
}

async function deleteTeam(teamId) {
  if (!confirm("Sigur doriți să ștergeți echipa?")) return;
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/teams/${teamId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (resp.ok) await loadTeams(); else alert("Eroare la ștergerea echipei");
}

async function showTeamDetails(teamId, teamName) {
  currentTeamId = teamId;
  document.getElementById('teamDetailsName').innerText = `Detalii Echipa "${teamName}"`;
  document.getElementById('teamDetails').style.display = 'block';
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/teams/${teamId}/members`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const ul = document.getElementById('memberList');
  ul.innerHTML = "";
  if (!resp.ok) {
    ul.innerHTML = "<li>Eroare la preluarea membrilor.</li>";
  } else {
    const members = await resp.json();
    if (!members.length) {
      ul.innerHTML = "<li><em>Niciun membru în această echipă.</em></li>";
    } else {
      members.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.name || '(ID '+user.id+')'}`;
        const remBtn = document.createElement('button');
        remBtn.textContent = "Elimină";
        remBtn.style.marginLeft = "5px";
        remBtn.addEventListener('click', () => removeMember(teamId, user.id));
        li.appendChild(remBtn);
        ul.appendChild(li);
      });
    }
  }
  document.getElementById('teamMessage').innerText = "";
  await loadChat(teamId); // admin vede chatul echipei selectate
}

async function removeMember(teamId, userId) {
  if (!confirm("Eliminați utilizatorul din echipă?")) return;
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (resp.ok) {
    const teamName = document.getElementById('teamDetailsName').innerText.match(/"(.*)"/)[1];
    showTeamDetails(teamId, teamName);
  } else {
    alert("Eroare la eliminare membru");
  }
}

function initTeamForms() {
  const addTeamForm = document.getElementById('teamForm');
  if (addTeamForm) {
    addTeamForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      const teamName = document.getElementById('teamName').value;
      const resp = await fetch(`${API_BASE}/teams/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ name: teamName })
      });
      if (!resp.ok) { alert("Eroare la crearea echipei"); return; }
      document.getElementById('teamName').value = "";
      await loadTeams();
    });
  }

  const addMemberForm = document.getElementById('addMemberForm');
  if (addMemberForm) {
    addMemberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentTeamId) return;
      const userId = document.getElementById('memberUserId').value;
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE}/teams/${currentTeamId}/members/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const msgP = document.getElementById('teamMessage');
      if (resp.ok) {
        msgP.style.color = "green";
        const data = await resp.json();
        msgP.innerText = data.message || "Membru adăugat.";
        document.getElementById('memberUserId').value = "";
        const teamName = document.getElementById('teamDetailsName').innerText.replace('Detalii Echipa "', '').replace('"','');
        showTeamDetails(currentTeamId, teamName);
      } else {
        msgP.style.color = "red";
        msgP.innerText = "Eroare la adăugare membru";
      }
    });
  }
}

/*Chat (admin + employee)*/
async function loadChat(teamId) {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.innerHTML = "";
  const token = localStorage.getItem('token');
  try {
    const resp = await fetch(`${API_BASE}/teams/${teamId}/messages`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!resp.ok) throw new Error('noapi');
    const messages = await resp.json();
    if (!messages.length) {
      box.innerHTML = "<em>No messages yet.</em>";
      return;
    }
    messages.forEach(m => {
      const div = document.createElement('div');
      div.className = "chat-message";
      const when = m.time || m.timestamp || '';
      div.innerHTML = `<strong>${m.user || m.username || 'User'}:</strong> ${m.text || m.content} <span class="time">${when}</span>`;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  } catch {
    // Fallback localStorage
    const ls = chats[teamId] || [];
    if (!ls.length) box.innerHTML = "<em>No messages yet.</em>";
    ls.forEach(msg => {
      const div = document.createElement('div');
      div.className = "chat-message";
      div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text} <span class="time">${msg.time}</span>`;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }
}

async function sendChat(teamId, text) {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username') || 'User';
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
  try {
    const resp = await fetch(`${API_BASE}/teams/${teamId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ text })
    });
    if (!resp.ok) throw new Error('noapi');
    await loadChat(teamId);
  } catch {
    // Fallback local
    if (!chats[teamId]) chats[teamId] = [];
    chats[teamId].push({ user: username, text, time: timeStr });
    localStorage.setItem('chats', JSON.stringify(chats));
    await loadChat(teamId);
  }
}

/*EMPLOYEE PAGE*/
async function loadEmployeeTasks() {
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/tasks/`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) return;
  let tasks = await resp.json();

  // Dacă backend nu filtrează automat, filtrăm pe client după assigned_to == username
  const username = localStorage.getItem('username');
  if (username) {
    tasks = tasks.filter(t => (t.assigned_to === username) || !t.assigned_to); // sau doar t.assigned_to === username
  }

  const tbody = document.getElementById('employeeTasksTbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${task.id}</td>
      <td>${task.title}</td>
      <td>${task.description || ""}</td>
      <td>${task.assigned_to || "-"}</td>
      <td>${task.team_id || "-"}</td>
      <td><progress value="${task.progress}" max="100"></progress> ${task.progress}%</td>
      <td>${task.status}</td>
      <td>${task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}</td>
      <td>
        <label style="display:inline-flex;align-items:center;gap:6px;">
          <input type="checkbox" class="completeCheckbox" data-id="${task.id}" ${task.status === 'done' ? 'checked' : ''} />
          Finalizat
        </label>
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
          <button class="requestTimeBtn" data-id="${task.id}">Solicită timp</button>
          <button class="requestPeopleBtn" data-id="${task.id}">Solicită personal</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // listeners
  document.querySelectorAll('.completeCheckbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.id;
      const checked = cb.checked;
      await updateTaskCompletion(id, checked);
      await loadEmployeeTasks();
    });
  });
  document.querySelectorAll('.requestTimeBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const days = prompt("Cu câte zile dorești prelungirea termenului?", "2");
      await requestTime(id, days ? Number(days) : null);
    });
  });
  document.querySelectorAll('.requestPeopleBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const note = prompt("Ce fel de ajutor este necesar? (ex: 1 developer backend)");
      await requestPeople(id, note || '');
    });
  });
}

async function updateTaskCompletion(taskId, isDone) {
  const token = localStorage.getItem('token');
  // obținem task-ul curent (din admin allTasks sau refacem cererea)
  let t = (allTasks && allTasks.find(x => x.id == taskId)) || null;
  if (!t) {
    const r = await fetch(`${API_BASE}/tasks/${taskId}`, { headers: { 'Authorization': 'Bearer ' + token }});
    if (r.ok) t = await r.json();
  }
  if (!t) return;
  const updated = {
    title: t.title,
    description: t.description,
    assigned_to: t.assigned_to || null,
    team_id: t.team_id || null,
    status: isDone ? 'done' : 'in_progress',
    progress: isDone ? 100 : Math.min(t.progress ?? 0, 90), // dacă debifează, lasă un progres <100
    deadline: t.deadline || null
  };
  await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(updated)
  });
}

async function requestTime(taskId, days) {
  const token = localStorage.getItem('token');
  try {
    const resp = await fetch(`${API_BASE}/tasks/${taskId}/request_time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ days: days || 1 })
    });
    if (!resp.ok) throw new Error();
    alert('Cererea de prelungire a fost trimisă către admin.');
  } catch {
    // fallback: marchez în descriere
    const r = await fetch(`${API_BASE}/tasks/${taskId}`);
    let t = null; if (r.ok) t = await r.json();
    if (!t) return alert('Nu am putut trimite cererea.');
    t.description = `[REQ_TIME +${days||1}d] ${t.description || ''}`;
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(t)
    });
    alert('Cererea a fost înregistrată (fallback).');
  }
}

async function requestPeople(taskId, note) {
  const token = localStorage.getItem('token');
  try {
    const resp = await fetch(`${API_BASE}/tasks/${taskId}/request_people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ note })
    });
    if (!resp.ok) throw new Error();
    alert('Cererea de personal suplimentar a fost trimisă către admin.');
  } catch {
    // fallback: marchez în descriere
    const r = await fetch(`${API_BASE}/tasks/${taskId}`);
    let t = null; if (r.ok) t = await r.json();
    if (!t) return alert('Nu am putut trimite cererea.');
    t.description = `[REQ_PEOPLE] ${note || ''} :: ${t.description || ''}`;
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(t)
    });
    alert('Cererea a fost înregistrată (fallback).');
  }
}

async function initEmployeePage() {
  // determină echipa curentă (prima echipă returnată / din primul task)
  const token = localStorage.getItem('token');
  try {
    const r = await fetch(`${API_BASE}/teams/`, { headers: { 'Authorization': 'Bearer ' + token }});
    if (r.ok) {
      const teams = await r.json();
      if (teams && teams.length) currentTeamId = teams[0].id;
    }
  } catch {}
  if (!currentTeamId) {
    // deduc din task-uri
    const r2 = await fetch(`${API_BASE}/tasks/`, { headers: { 'Authorization': 'Bearer ' + token }});
    if (r2.ok) {
      const ts = await r2.json();
      const username = localStorage.getItem('username');
      const mine = ts.filter(t => t.assigned_to === username);
      if (mine.length && mine[0].team_id) currentTeamId = mine[0].team_id;
    }
  }
  await loadEmployeeTasks();
  if (currentTeamId) {
    await loadChat(currentTeamId);
    const sendBtn = document.getElementById('sendChatBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;
        await sendChat(currentTeamId, text);
        input.value = '';
      });
    }
  }
}

/*user approval (admin) */
async function loadPendingUsers() {
  const ul = document.getElementById('pendingUsers');
  if (!ul) return;
  ul.innerHTML = '<li>Încărcare...</li>';
  const token = localStorage.getItem('token');
  try {
    const resp = await fetch(`${API_BASE}/admin/pending_users`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!resp.ok) throw new Error();
    const users = await resp.json();
    ul.innerHTML = '';
    if (!users.length) {
      ul.innerHTML = '<li><em>Niciun utilizator în așteptare.</em></li>';
      return;
    }
    users.forEach(u => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${u.username} <small style="color:var(--muted)">(${u.email || 'fără email'})</small></span>
        <div style="display:flex;gap:8px;">
          <button class="approveUserBtn" data-id="${u.id}">Aprobă</button>
          <button class="rejectUserBtn" data-id="${u.id}" style="background:var(--danger)">Șterge</button>
        </div>
      `;
      ul.appendChild(li);
    });
    ul.querySelectorAll('.approveUserBtn').forEach(btn => {
      btn.addEventListener('click', () => approveUser(btn.dataset.id));
    });
    ul.querySelectorAll('.rejectUserBtn').forEach(btn => {
      btn.addEventListener('click', () => deleteUser(btn.dataset.id));
    });
  } catch {
    ul.innerHTML = '<li style="color:var(--danger)">Endpoint-ul de pending users nu este disponibil.</li>';
  }
}

async function approveUser(userId) {
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/admin/approve_user/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (resp.ok) {
    alert('Utilizator aprobat.');
    loadPendingUsers();
  } else {
    alert('Eroare la aprobare.');
  }
}

async function deleteUser(userId) {
  if (!confirm('Sigur ștergi acest utilizator?')) return;
  const token = localStorage.getItem('token');
  const resp = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (resp.ok) {
    alert('Utilizator șters.');
    loadPendingUsers();
  } else {
    alert('Eroare la ștergere.');
  }
}

/*boot */
window.addEventListener('DOMContentLoaded', () => {
  if (window.feather) feather.replace();
  initThemeToggle();
  initLogin();
  initRegister();
  initVerify();

  // Admin page?
  const isAdminPage = !!document.getElementById('tasksTbody');
  if (isAdminPage) {
    // Protecție: dacă is_admin !== true => redirect la employee
    const isAdmin = String(localStorage.getItem('is_admin')) === 'true';
    if (!isAdmin) window.location.href = 'employee.html';

    initTaskForm();
    initTeamForms();
    loadTasks();
    loadTeams();
    loadPendingUsers();
  }

  // Employee page?
  const isEmployeePage = !!document.getElementById('employeeTasksTbody');
  if (isEmployeePage) {
    initEmployeePage();
  }
});
