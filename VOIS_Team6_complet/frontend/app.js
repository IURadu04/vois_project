const API_BASE = "http://127.0.0.1:8000";

function svgMoon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function svgSun() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  document.body.setAttribute("data-theme", mode);
  localStorage.setItem("theme", mode);
}

function updateThemeButton() {
  const btn = document.getElementById("themeToggleBtn");
  if (!btn) return;
  const mode = document.documentElement.getAttribute("data-theme") || "light";
  btn.innerHTML = mode === "dark"
    ? `${svgSun()}<span class="label">Light</span>`
    : `${svgMoon()}<span class="label">Dark</span>`;
}

function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  setTheme(saved);
  updateThemeButton();
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.onclick = () => {
      const cur = document.documentElement.getAttribute("data-theme") || "light";
      const next = cur === "dark" ? "light" : "dark";
      setTheme(next);
      updateThemeButton();
    };
  }
}

function initHomeClick() {
  const home = document.getElementById("homeTitle");
  if (!home) return;
  home.addEventListener("click", (e) => {
    e.preventDefault();
    const href = home.getAttribute("href") || (String(localStorage.getItem("is_admin")) === "true" ? "admin.html" : "employee.html");
    const samePage = location.pathname.endsWith(href);
    if (samePage) {
      resetFormsAndReload();
    } else {
      location.href = href;
    }
  });
}

function resetFormsAndReload() {
  document.getElementById("taskForm")?.reset();
  document.getElementById("registerForm")?.reset();
  document.getElementById("loginForm")?.reset();
  document.getElementById("addMemberForm")?.reset();
  location.reload();
}

async function loginRequest(username, password) {
  let r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!r.ok) {
    r = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password })
    });
  }
  if (!r.ok) throw new Error((await r.text()) || "Login failed");
  return r.json();
}

function storeTokenAndUser(data, username) {
  const token = data?.access_token || data?.token;
  if (token) localStorage.setItem("token", token);
  if (username) localStorage.setItem("username", username);
  if (typeof data?.id !== "undefined") localStorage.setItem("user_id", data.id);
  if (typeof data?.is_admin !== "undefined") localStorage.setItem("is_admin", String(!!data.is_admin));
  if (typeof data?.is_employee !== "undefined") localStorage.setItem("is_employee", String(!!data.is_employee));
}

function authHeaders() {
  return { Authorization: "Bearer " + localStorage.getItem("token") };
}

async function ensureEmployeeFlag() {
  const id = localStorage.getItem("user_id");
  if (!id) return;
  const attempts = [
    { m: "PATCH", url: `/users/${id}`, body: { is_employee: true } },
    { m: "PUT",   url: `/users/${id}`, body: { is_employee: true } }
  ];
  for (const a of attempts) {
    try {
      const r = await fetch(`${API_BASE}${a.url}`, {
        method: a.m,
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(a.body)
      });
      if (r.ok) {
        localStorage.setItem("is_employee", "true");
        break;
      }
    } catch {}
  }
}

async function refreshProfile() {
  const candidates = ["/users/me", "/auth/me", "/me"];
  for (const p of candidates) {
    try {
      const r = await fetch(`${API_BASE}${p}`, { headers: authHeaders() });
      if (r.ok) {
        const u = await r.json();
        if (typeof u.id !== "undefined") localStorage.setItem("user_id", u.id);
        if (typeof u.is_admin !== "undefined") localStorage.setItem("is_admin", String(!!u.is_admin));
        if (typeof u.is_employee !== "undefined") localStorage.setItem("is_employee", String(!!u.is_employee));
        if (typeof u.username !== "undefined") localStorage.setItem("username", u.username);
        return u;
      }
    } catch {}
  }
  return null;
}

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  const errEl = document.getElementById("loginError");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    try {
      const data = await loginRequest(username, password);
      storeTokenAndUser(data, username);
      await ensureEmployeeFlag();
      await refreshProfile();
      const isAdmin = localStorage.getItem("is_admin") === "true";
      location.href = isAdmin ? "admin.html" : "employee.html";
    } catch (err) {
      errEl.textContent = "Autentificare eșuată: " + err.message;
    }
  });
}

function initRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  const errEl = document.getElementById("registerError");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passRegex.test(password)) {
      errEl.textContent = "Parola trebuie să conțină literă mică, literă mare, cifră, caracter special și minim 8 caractere.";
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!r.ok) throw new Error("Eroare la înregistrare");
      const loginData = await loginRequest(username, password);
      storeTokenAndUser(loginData, username);
      await ensureEmployeeFlag();
      await refreshProfile();
      const isAdmin = localStorage.getItem("is_admin") === "true";
      location.href = isAdmin ? "admin.html" : "employee.html";
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("is_admin");
  localStorage.removeItem("is_employee");
  localStorage.removeItem("username");
  location.href = "index.html";
}
window.logout = logout;

let allTasks = [];

async function loadTasks() {
  const r = await fetch(`${API_BASE}/tasks/`, { headers: authHeaders() });
  if (!r.ok) return;
  allTasks = await r.json();
  const tb = document.getElementById("tasksTbody");
  if (!tb) return;
  tb.innerHTML = "";
  allTasks.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${t.title}</td>
      <td>${t.description || ""}</td>
      <td>${t.assigned_to || "-"}</td>
      <td>${t.team_id || "-"}</td>
      <td><progress value="${t.progress || 0}" max="100"></progress> ${t.progress || 0}%</td>
      <td>${t.status}</td>
      <td>${t.deadline ? new Date(t.deadline).toLocaleDateString() : "-"}</td>
      <td>
        <div class="actions-inline">
          <button class="editTaskBtn" data-id="${t.id}">Editează</button>
          <button class="deleteTaskBtn btn-secondary" data-id="${t.id}">Șterge</button>
        </div>
      </td>
    `;
    tb.appendChild(tr);
  });
  document.querySelectorAll(".editTaskBtn").forEach((b) => { b.onclick = () => startEditTask(b.dataset.id); });
  document.querySelectorAll(".deleteTaskBtn").forEach((b) => { b.onclick = () => deleteTask(b.dataset.id); });
}

function startEditTask(id) {
  const t = allTasks.find((x) => String(x.id) === String(id));
  if (!t) return;
  document.getElementById("title").value = t.title || "";
  document.getElementById("description").value = t.description || "";
  document.getElementById("assigned_to").value = t.assigned_to || "";
  document.getElementById("team_id").value = t.team_id || "";
  document.getElementById("status").value = t.status || "pending";
  document.getElementById("progress").value = t.progress ?? 0;
  const pv = document.getElementById("progressValue");
  if (pv) pv.textContent = (t.progress ?? 0) + "%";
  document.getElementById("deadline").value = t.deadline ? t.deadline.slice(0, 10) : "";
  document.getElementById("taskId").value = t.id;
  document.getElementById("taskFormTitle").textContent = "Editează Task";
  document.getElementById("cancelEdit").style.display = "inline-flex";
  bindAdminProgressSlider();
}

function resetTaskForm() {
  document.getElementById("taskForm")?.reset();
  document.getElementById("taskId").value = "";
  document.getElementById("taskFormTitle").textContent = "Adaugă Task Nou";
  document.getElementById("cancelEdit").style.display = "none";
  const pv = document.getElementById("progressValue");
  if (pv) pv.textContent = "0%";
}

async function deleteTask(id) {
  if (!confirm(`Ștergi task #${id}?`)) return;
  const r = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (r.ok) {
    loadTasks();
  } else {
    alert("Eroare la ștergere.");
  }
}

function initTaskForm() {
  const f = document.getElementById("taskForm");
  if (!f) return;
  const cancel = document.getElementById("cancelEdit");
  cancel.style.display = "none";
  cancel.onclick = resetTaskForm;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById("title").value,
      description: document.getElementById("description").value || null,
      assigned_to: document.getElementById("assigned_to").value ? Number(document.getElementById("assigned_to").value) : null,
      team_id: document.getElementById("team_id").value ? Number(document.getElementById("team_id").value) : null,
      status: document.getElementById("status").value,
      progress: Number(document.getElementById("progress").value) || 0,
      deadline: document.getElementById("deadline").value ? new Date(document.getElementById("deadline").value).toISOString() : null
    };
    const id = document.getElementById("taskId").value;
    const url = id ? `${API_BASE}/tasks/${id}` : `${API_BASE}/tasks/`;
    const method = id ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      alert("Eroare la salvare task");
      return;
    }
    await loadTasks();
    resetTaskForm();
  });
}

let currentTeamId = null;
let allUsers = [];

async function loadTeams() {
  const r = await fetch(`${API_BASE}/teams/`, { headers: authHeaders() });
  if (!r.ok) return;
  const teams = await r.json();
  const ul = document.getElementById("teamList");
  if (ul) {
    ul.innerHTML = "";
    teams.forEach((t) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${t.id} - ${t.name}</span>`;
      const del = document.createElement("button");
      del.textContent = "Șterge";
      del.className = "btn-secondary";
      del.onclick = (ev) => {
        ev.stopPropagation();
        deleteTeam(t.id);
      };
      li.onclick = () => showTeamDetails(t.id, t.name);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }
  const selTeam = document.getElementById("team_id");
  if (selTeam) {
    selTeam.innerHTML = `<option value="">(selectează echipă)</option>`;
    teams.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = `${t.id} - ${t.name}`;
      selTeam.appendChild(o);
    });
  }
  return teams;
}

async function deleteTeam(id) {
  if (!confirm("Ștergi echipa?")) return;
  const r = await fetch(`${API_BASE}/teams/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (r.ok) {
    loadTeams();
  } else {
    alert("Eroare la ștergere echipă.");
  }
}

async function showTeamDetails(id, name) {
  currentTeamId = id;
  const details = document.getElementById("teamDetails");
  details.style.display = "block";
  document.getElementById("teamDetailsName").textContent = `Detalii Echipa "${name}"`;
  const r = await fetch(`${API_BASE}/teams/${id}/members`, { headers: authHeaders() });
  const ul = document.getElementById("memberList");
  ul.innerHTML = "";
  if (r.ok) {
    const members = await r.json();
    if (!members.length) {
      ul.innerHTML = "<li><em>Fără membri</em></li>";
    } else {
      members.forEach((m) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${m.username} (ID ${m.id})</span>`;
        const rem = document.createElement("button");
        rem.textContent = "Elimină";
        rem.className = "btn-secondary";
        rem.onclick = () => removeMember(id, m.id, name);
        li.appendChild(rem);
        ul.appendChild(li);
      });
    }
  } else {
    ul.innerHTML = "<li>Eroare la preluarea membrilor</li>";
  }
  await loadChat(id);
  bindChatSend();
}

async function removeMember(teamId, userId, teamName) {
  if (!confirm("Elimini din echipă?")) return;
  const r = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (r.ok) {
    showTeamDetails(teamId, teamName);
  } else {
    alert("Eroare la eliminare.");
  }
}

function initTeamForms() {
  const tf = document.getElementById("teamForm");
  if (tf) {
    tf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("teamName").value.trim();
      if (!name) return;
      const r = await fetch(`${API_BASE}/teams/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!r.ok) {
        alert("Eroare la creare echipă");
        return;
      }
      document.getElementById("teamName").value = "";
      loadTeams();
    });
  }
  const addMember = document.getElementById("addMemberForm");
  if (addMember) {
    addMember.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentTeamId) return;
      const uid = document.getElementById("memberUserId").value;
      const r = await fetch(`${API_BASE}/teams/${currentTeamId}/members/${uid}`, {
        method: "POST",
        headers: authHeaders()
      });
      const msg = document.getElementById("teamMessage");
      if (r.ok) {
        msg.style.color = "green";
        msg.textContent = "Membru adăugat";
        document.getElementById("memberUserId").value = "";
        const name = document.getElementById("teamDetailsName").textContent.replace('Detalii Echipa "', "").replace('"', "");
        showTeamDetails(currentTeamId, name);
      } else {
        msg.style.color = "red";
        msg.textContent = "Eroare la adăugare membru";
      }
    });
  }
}

function roleLabel(u) {
  if (u.is_admin) return "Admin";
  return "Utilizator";
}

async function loadUsers() {
  const r = await fetch(`${API_BASE}/users/`, { headers: authHeaders() });
  if (!r.ok) return;
  allUsers = await r.json();
  const selUser = document.getElementById("assigned_to");
  if (selUser) {
    selUser.innerHTML = `<option value="">(selectează user)</option>`;
    allUsers.forEach((u) => {
      const o = document.createElement("option");
      o.value = u.id;
      o.textContent = `${u.id} - ${u.username}`;
      selUser.appendChild(o);
    });
  }
  const tb = document.getElementById("usersTbody");
  if (!tb) return;
  tb.innerHTML = "";
  allUsers.forEach((u) => {
    let actionsHtml = "";
    if (u.is_admin) {
      actionsHtml += `<button class="demoteBtn" data-id="${u.id}">Revocă admin</button>`;
    } else {
      actionsHtml += `<button class="promoteBtn" data-id="${u.id}">Fă admin</button>`;
    }
    actionsHtml += `<button class="deleteUserBtn btn-secondary" data-id="${u.id}">Șterge</button>`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.team_id || "-"}</td>
      <td>${roleLabel(u)}</td>
      <td class="ta-right"><div class="actions-inline">${actionsHtml}</div></td>
    `;
    tb.appendChild(tr);
  });
  document.querySelectorAll(".promoteBtn").forEach((b) => { b.onclick = () => changeRole(b.dataset.id, true); });
  document.querySelectorAll(".demoteBtn").forEach((b) => { b.onclick = () => changeRole(b.dataset.id, false); });
  document.querySelectorAll(".deleteUserBtn").forEach((b) => { b.onclick = () => deleteUser(b.dataset.id); });
}

/* ===== Rezolvare definitivă: Fă admin / Revocă admin (autodetect + fallback) ===== */

function interpolateId(url, id) {
  return url.replace("{id}", String(id)).replace("{user_id}", String(id));
}

function parseAllow(header) {
  if (!header) return [];
  return header.split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
}

async function tryOptions(url) {
  try {
    const r = await fetch(`${API_BASE}${url}`, { method: "OPTIONS", headers: authHeaders() });
    if (!r.ok) return [];
    return parseAllow(r.headers.get("Allow"));
  } catch {
    return [];
  }
}

async function tryCall(method, url, body) {
  const hasBody = body !== undefined && body !== null;
  const headers = hasBody ? { ...authHeaders(), "Content-Type": "application/json" } : { ...authHeaders() };
  const r = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : null
  });
  return r;
}

const ROLE_ENDPOINT_CANDIDATES = [
  "/users/{id}",
  "/users/{user_id}",
  "/users/{id}/role",
  "/admin/users/{id}/promote",
  "/admin/users/{id}/demote",
  "/users/make-admin/{id}",
  "/users/remove-admin/{id}",
  "/users/{id}/admin",
  "/admin/role/{id}",
  "/role/users/{id}",
  "/users/role/{id}"
];

let endpointsCache = null;

async function detectRoleEndpoints() {
  if (endpointsCache) return endpointsCache;
  endpointsCache = { promote: [], demote: [] };
  try {
    const r = await fetch(`${API_BASE}/openapi.json`, { headers: authHeaders() });
    if (r.ok) {
      const spec = await r.json();
      const paths = spec.paths || {};
      Object.keys(paths).forEach((p) => {
        const low = p.toLowerCase();
        const ops = Object.keys(paths[p] || {});
        ops.forEach((m) => {
          const M = m.toUpperCase();
          if (low.includes("/users/") && (low.includes("role") || low.includes("admin"))) {
            endpointsCache.promote.push({ method: M, url: p, type: "toggle_admin" });
            endpointsCache.demote.push({ method: M, url: p, type: "toggle_admin" });
          }
          if (low.match(/\/users\/\{?(id|user_id)\}?$/)) {
            const schema = ((((paths[p][m] || {}).requestBody || {}).content || {})["application/json"] || {});
            const json = JSON.stringify(schema);
            if (json.includes("is_admin")) {
              endpointsCache.promote.push({ method: M, url: p, type: "flags" });
              endpointsCache.demote.push({ method: M, url: p, type: "flags" });
            }
          }
        });
      });
    }
  } catch {}
  if (!endpointsCache.promote.length || !endpointsCache.demote.length) {
    const fallback = ROLE_ENDPOINT_CANDIDATES.map(url => ({ method: "POST", url, type: "guess" }));
    if (!endpointsCache.promote.length) endpointsCache.promote = fallback;
    if (!endpointsCache.demote.length) endpointsCache.demote = fallback;
  }
  return endpointsCache;
}

async function changeRole(userId, makeAdmin) {
  const ep = await detectRoleEndpoints();
  const attempts = ep[makeAdmin ? "promote" : "demote"];
  let lastDetail = "Not Found";
  for (const a of attempts) {
    const baseUrl = interpolateId(a.url, userId);
    let body = null;
    if (a.type === "flags") body = { is_admin: !!makeAdmin };
    if (a.type === "toggle_admin") body = { role: makeAdmin ? "admin" : "employee" };
    if (a.type === "guess") body = { is_admin: !!makeAdmin, role: makeAdmin ? "admin" : "employee" };
    try {
      let r = await tryCall(a.method, baseUrl, body);
      if (r.ok) { await loadUsers(); return; }
      if (r.status === 405) {
        const allowHeader = parseAllow(r.headers.get("Allow"));
        const allowOpt = allowHeader.length ? allowHeader : await tryOptions(baseUrl);
        const tryMethods = allowOpt.length ? allowOpt : ["PATCH", "PUT", "POST"];
        for (const m of tryMethods) {
          let r2 = await tryCall(m, baseUrl, body);
          if (!r2.ok) r2 = await tryCall(m, baseUrl, null);
          if (!r2.ok && m === "POST") r2 = await tryCall("POST", `${baseUrl}?action=${makeAdmin ? "promote" : "demote"}`, null);
          if (r2.ok) { await loadUsers(); return; }
          lastDetail = await r2.text();
        }
      } else if (r.status === 404) {
      } else {
        lastDetail = await r.text();
      }
    } catch (e) {
      lastDetail = e.message;
    }
  }
  alert("Nu am putut modifica rolul. Detalii: " + lastDetail);
}

/* ====== Chat, progres angajat ====== */

const LOCAL_CHAT_KEY = "teamChatLocal";

function readLocalChat(teamId) {
  const all = JSON.parse(localStorage.getItem(LOCAL_CHAT_KEY) || "{}");
  return all[teamId] || [];
}

function writeLocalChat(teamId, messages) {
  const all = JSON.parse(localStorage.getItem(LOCAL_CHAT_KEY) || "{}");
  all[teamId] = messages;
  localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(all));
}

async function loadChat(teamId) {
  const box = document.getElementById("chatMessages");
  if (!box) return;
  box.innerHTML = "";
  if (!teamId) {
    box.innerHTML = "<em>Selectează o echipă pentru a vedea chat-ul.</em>";
    return;
  }
  try {
    const r = await fetch(`${API_BASE}/teams/${teamId}/messages`, { headers: authHeaders() });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const msgs = await r.json();
    if (!Array.isArray(msgs) || !msgs.length) {
      const localMsgs = readLocalChat(teamId);
      if (!localMsgs.length) {
        box.innerHTML = "<em>Nu există mesaje.</em>";
      } else {
        localMsgs.forEach(renderChatMessage);
      }
      return;
    }
    box.innerHTML = "";
    msgs.forEach((m) => {
      renderChatMessage({ user: m.user || m.username || "User", text: m.text || m.content || "", time: m.time || m.timestamp || "" });
    });
    writeLocalChat(teamId, msgs.map((m) => ({ user: m.user || m.username || "User", text: m.text || m.content || "", time: m.time || m.timestamp || "" })));
    box.scrollTop = box.scrollHeight;
  } catch {
    const localMsgs = readLocalChat(teamId);
    if (!localMsgs.length) {
      box.innerHTML = "<em>Eroare la preluarea mesajelor și nu există mesaje locale.</em>";
    } else {
      localMsgs.forEach(renderChatMessage);
    }
  }
}

function renderChatMessage(m) {
  const box = document.getElementById("chatMessages");
  const d = document.createElement("div");
  d.className = "chat-message";
  const when = m.time || "";
  d.innerHTML = `<strong>${m.user}:</strong> ${m.text} <span class="time">${when}</span>`;
  box.appendChild(d);
}

async function sendChat(teamId, text) {
  if (!teamId) {
    alert("Nu este selectată nicio echipă.");
    return;
  }
  if (!text) return;
  const username = localStorage.getItem("username") || "User";
  const now = new Date();
  const timeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  let ok = false;
  try {
    const r = await fetch(`${API_BASE}/teams/${teamId}/messages`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    ok = r.ok;
  } catch {
    ok = false;
  }
  if (!ok) {
    const cur = readLocalChat(teamId);
    cur.push({ user: username, text, time: timeStr });
    writeLocalChat(teamId, cur);
  }
  await loadChat(teamId);
}

function bindChatSend() {
  const btn = document.getElementById("sendChatBtn");
  const input = document.getElementById("chatInput");
  if (!btn || !input) return;
  btn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;
    await sendChat(currentTeamId, text);
    input.value = "";
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      btn.click();
    }
  };
}

function bindAdminProgressSlider() {
  const sl = document.getElementById("progress");
  const out = document.getElementById("progressValue");
  if (!sl || !out) return;
  out.textContent = sl.value + "%";
  sl.oninput = () => { out.textContent = sl.value + "%"; };
}

async function loadEmployeeTasks() {
  const r = await fetch(`${API_BASE}/tasks/`, { headers: authHeaders() });
  if (!r.ok) return;
  let tasks = await r.json();
  const userId = Number(localStorage.getItem("user_id"));
  if (userId) tasks = tasks.filter((t) => t.assigned_to === userId);
  tasks = tasks.filter((t) => t.status !== "done");
  const tb = document.getElementById("employeeTasksTbody");
  if (!tb) return;
  tb.innerHTML = "";
  tasks.forEach((t) => {
    const tr = document.createElement("tr");
    const pct = Number(t.progress || 0);
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${t.title}</td>
      <td>${t.description || ""}</td>
      <td>
        <div class="stack">
          <input type="range" min="0" max="100" value="${pct}" class="progressSlider" data-id="${t.id}" />
          <div><strong>${pct}%</strong></div>
        </div>
      </td>
      <td>${t.status}</td>
      <td>${t.deadline ? new Date(t.deadline).toLocaleDateString() : "-"}</td>
      <td>
        <div class="actions-inline">
          <button class="saveProgressBtn">Salvează %</button>
          <button class="finalizeBtn btn-secondary">Finalizează</button>
        </div>
      </td>
    `;
    const saveBtn = tr.querySelector(".saveProgressBtn");
    const finBtn = tr.querySelector(".finalizeBtn");
    const slider = tr.querySelector(".progressSlider");
    slider.oninput = () => {
      const strong = tr.querySelector("strong");
      if (strong) strong.textContent = slider.value + "%";
    };
    saveBtn.onclick = async () => {
      await updateTaskProgressAsEmployee(t.id, Number(slider.value || 0));
      await loadEmployeeTasks();
    };
    finBtn.onclick = async () => {
      await markTaskDoneAndHide(t.id);
      await loadEmployeeTasks();
    };
    tb.appendChild(tr);
  });
}

async function updateTaskProgressAsEmployee(taskId, pct) {
  const g = await fetch(`${API_BASE}/tasks/${taskId}`, { headers: authHeaders() });
  if (!g.ok) return;
  const t = await g.json();
  const status = pct >= 100 ? "done" : t.status || "pending";
  const payload = {
    title: t.title,
    description: t.description,
    assigned_to: t.assigned_to || null,
    team_id: t.team_id || null,
    status,
    progress: Math.max(0, Math.min(100, pct)),
    deadline: t.deadline || null
  };
  await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function markTaskDoneAndHide(taskId) {
  const g = await fetch(`${API_BASE}/tasks/${taskId}`, { headers: authHeaders() });
  if (!g.ok) return;
  const t = await g.json();
  const payload = {
    title: t.title,
    description: t.description,
    assigned_to: t.assigned_to || null,
    team_id: t.team_id || null,
    status: "done",
    progress: 100,
    deadline: t.deadline || null
  };
  await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function deleteUser(id) {
  if (!confirm(`Ștergi utilizatorul #${id}?`)) return;
  const r = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!r.ok) {
    alert("Eroare la ștergere user");
    return;
  }
  await loadUsers();
}

window.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initHomeClick();
  initLogin();
  initRegister();
  const isAdminPage = !!document.getElementById("tasksTbody");
  const isEmployeePage = !!document.getElementById("employeeTasksTbody");
  if (isAdminPage) {
    if (!localStorage.getItem("token")) {
      location.href = "index.html";
      return;
    }
    await refreshProfile();
    if (localStorage.getItem("is_admin") !== "true") {
      location.href = "employee.html";
      return;
    }
    initTaskForm();
    bindAdminProgressSlider();
    initTeamForms();
    await loadUsers();
    await loadTeams();
    await loadTasks();
    bindChatSend();
  }
  if (isEmployeePage) {
    if (!localStorage.getItem("token")) {
      location.href = "index.html";
      return;
    }
    await refreshProfile();
    try {
      const t = await fetch(`${API_BASE}/teams/`, { headers: authHeaders() });
      if (t.ok) {
        const teams = await t.json();
        if (teams && teams.length) currentTeamId = teams[0].id;
      }
    } catch {}
    if (!currentTeamId) {
      try {
        const r = await fetch(`${API_BASE}/tasks/`, { headers: authHeaders() });
        if (r.ok) {
          const all = await r.json();
          const meId = Number(localStorage.getItem("user_id"));
          const mine = all.filter((x) => x.assigned_to === meId && x.team_id);
          if (mine.length) currentTeamId = mine[0].team_id;
        }
      } catch {}
    }
    await loadEmployeeTasks();
    if (currentTeamId) {
      await loadChat(currentTeamId);
      const info = document.getElementById("chatInfo");
      if (info) info.textContent = "";
    } else {
      const box = document.getElementById("chatMessages");
      if (box) box.innerHTML = "<em>Nu ești asignat unei echipe. Cere unui admin să te adauge într-o echipă pentru a folosi chat-ul.</em>";
      const info = document.getElementById("chatInfo");
      if (info) info.textContent = "Chat-ul necesită să fii membru într-o echipă.";
    }
    bindChatSend();
  }
});
