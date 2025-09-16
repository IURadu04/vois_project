// login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error('Credențiale invalide');
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('is_admin', data.is_admin);
      localStorage.setItem('username', username);
      window.location.href = 'admin.html';
    } catch (err) {
      document.getElementById('loginError').innerText = "Autentificare eșuată: " + err.message;
    }
  });
}

// admin
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// === DARK / LIGHT THEME TOGGLE UNIFICAT ===
window.addEventListener('DOMContentLoaded', () => {
    // iniţializează Feather Icons
    if (window.feather) feather.replace();
  
    // ia tema salvată sau light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  
    // setează corect butonul`
    updateThemeButton(savedTheme);
  
    // ataşează click
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeButton(next);
      });
    }
  });
  
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
  


let allTasks = [];
let chats = JSON.parse(localStorage.getItem('chats') || '{}');
let currentTeamId = null;

async function loadTasks() {
  const token = localStorage.getItem('token');
  const resp = await fetch('http://127.0.0.1:8000/tasks/', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) return;
  allTasks = await resp.json();
  const tbody = document.getElementById('tasksTbody');
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
  const task = allTasks.find(t => t.id == taskId);
  if (!task) return;
  document.getElementById('title').value = task.title;
  document.getElementById('description').value = task.description || "";
  document.getElementById('assigned_to').value = task.assigned_to || "";
  document.getElementById('team_id').value = task.team_id || "";
  document.getElementById('status').value = task.status;
  document.getElementById('progress').value = task.progress;
  document.getElementById('deadline').value = task.deadline ? task.deadline.substring(0,10) : "";
  document.getElementById('taskId').value = task.id;
  document.getElementById('taskFormTitle').innerText = "Editează Task";
  document.getElementById('cancelEdit').style.display = "inline";
}

document.getElementById('cancelEdit')?.addEventListener('click', () => {
  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = "";
  document.getElementById('taskFormTitle').innerText = "Adaugă Task Nou";
  document.getElementById('cancelEdit').style.display = "none";
});

const taskForm = document.getElementById('taskForm');
if (taskForm) {
  taskForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const taskData = {
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      assigned_to: document.getElementById('assigned_to').value || null,
      team_id: document.getElementById('team_id').value || null,
      status: document.getElementById('status').value,
      progress: Number(document.getElementById('progress').value) || 0,
      deadline: null
    };
    const deadlineInput = document.getElementById('deadline').value;
    if (deadlineInput) taskData.deadline = new Date(deadlineInput).toISOString();
    const taskId = document.getElementById('taskId').value;
    const method = taskId ? 'PUT' : 'POST';
    const url = taskId 
        ? `http://127.0.0.1:8000/tasks/${taskId}` 
        : 'http://127.0.0.1:8000/tasks/';
    const resp = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(taskData)
    });
    if (!resp.ok) {
      alert("Eroare la salvarea task-ului");
      return;
    }
    await loadTasks();
    taskForm.reset();
    document.getElementById('taskId').value = "";
    document.getElementById('taskFormTitle').innerText = "Adaugă Task Nou";
    document.getElementById('cancelEdit').style.display = "none";
  });
}

async function deleteTask(taskId) {
  if (!confirm("Sigur doriți să ștergeți task-ul #" + taskId + "?")) return;
  const token = localStorage.getItem('token');
  const resp = await fetch(`http://127.0.0.1:8000/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (resp.ok) {
    await loadTasks();
  } else {
    alert("Eroare la ștergere");
  }
}

async function loadTeams() {
  const token = localStorage.getItem('token');
  const resp = await fetch('http://127.0.0.1:8000/teams/', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) return;
  const teams = await resp.json();
  const teamListUl = document.getElementById('teamList');
  teamListUl.innerHTML = "";
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
    teamListUl.appendChild(li);
  });
}

document.getElementById('teamForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const teamName = document.getElementById('teamName').value;
  const resp = await fetch('http://127.0.0.1:8000/teams/', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ name: teamName })
  });
  if (!resp.ok) {
    alert("Eroare la crearea echipei");
    return;
  }
  document.getElementById('teamName').value = "";
  await loadTeams();
});

async function deleteTeam(teamId) {
  if (!confirm("Sigur doriți să ștergeți echipa?")) return;
  const token = localStorage.getItem('token');
  const resp = await fetch(`http://127.0.0.1:8000/teams/${teamId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (resp.ok) {
    await loadTeams();
  } else {
    alert("Eroare la ștergerea echipei");
  }
}

async function showTeamDetails(teamId, teamName) {
  currentTeamId = teamId;
  document.getElementById('teamDetailsName').innerText = `Detalii Echipa "${teamName}"`;
  document.getElementById('teamDetails').style.display = 'block';
  const token = localStorage.getItem('token');
  const resp = await fetch(`http://127.0.0.1:8000/teams/${teamId}/members`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const memberListUl = document.getElementById('memberList');
  memberListUl.innerHTML = "";
  if (!resp.ok) {
    memberListUl.innerHTML = "<li>Eroare la preluarea membrilor.</li>";
  } else {
    const members = await resp.json();
    if (members.length === 0) {
      memberListUl.innerHTML = "<li><em>Niciun membru în această echipă.</em></li>";
    } else {
      members.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.name || '(ID '+user.id+')'}`;
        const remBtn = document.createElement('button');
        remBtn.textContent = "Elimină";
        remBtn.style.marginLeft = "5px";
        remBtn.addEventListener('click', () => removeMember(teamId, user.id));
        li.appendChild(remBtn);
        memberListUl.appendChild(li);
      });
    }
  }
  document.getElementById('teamMessage').innerText = "";
  loadChat(teamId);
}

document.getElementById('addMemberForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentTeamId) return;
  const userId = document.getElementById('memberUserId').value;
  const token = localStorage.getItem('token');
  const resp = await fetch(`http://127.0.0.1:8000/teams/${currentTeamId}/members/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const msgP = document.getElementById('teamMessage');
  if (resp.ok) {
    msgP.style.color = "green";
    const data = await resp.json();
    msgP.innerText = data.message || "Membru adăugat.";
    document.getElementById('memberUserId').value = "";
    showTeamDetails(currentTeamId, document.getElementById('teamDetailsName').innerText.replace('Detalii Echipa "', '').replace('"',''));
  } else {
    msgP.style.color = "red";
    msgP.innerText = "Eroare la adăugare membru";
  }
});

async function removeMember(teamId, userId) {
  if (!confirm("Eliminați utilizatorul din echipă?")) return;
  const token = localStorage.getItem('token');
  const resp = await fetch(`http://127.0.0.1:8000/teams/${teamId}/members/${userId}`, {
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

// chat simulation
function loadChat(teamId) {
  const chatBox = document.getElementById('chatMessages');
  chatBox.innerHTML = "";
  if (chats[teamId]) {
    chats[teamId].forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = "chat-message";
      msgDiv.innerHTML = `<strong>${msg.user}:</strong> ${msg.text} <span class="time">${msg.time}</span>`;
      chatBox.appendChild(msgDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  } else {
    chatBox.innerHTML = "<em>No messages yet.</em>";
  }
}

document.getElementById('sendChatBtn')?.addEventListener('click', () => {
  if (!currentTeamId) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (text === "") return;
  const userName = localStorage.getItem('username') || "Admin";
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2,'0') + ":" + now.getMinutes().toString().padStart(2,'0');
  const message = { user: userName, text: text, time: timeStr };
  if (!chats[currentTeamId]) chats[currentTeamId] = [];
  chats[currentTeamId].push(message);
  localStorage.setItem('chats', JSON.stringify(chats));
  loadChat(currentTeamId);
  input.value = "";
});

// init admin page
if (document.getElementById('tasksTbody')) {
  window.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTeams();
  });
}
