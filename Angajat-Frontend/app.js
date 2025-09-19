// Minimal behavior: update progress bar, simulate requests, basic chat append.
// Replace fetch placeholders with real API endpoints.

function updateProgress() {
  const checks = Array.from(document.querySelectorAll(".task-check"));
  if (!checks.length) return;
  const done = checks.filter(c => c.checked).length;
  const total = checks.length;
  const percent = Math.round((done / total) * 100);
  const fill = document.querySelector(".progress-fill");
  const label = document.querySelector(".progress-label");
  if (fill) fill.style.width = percent + "%";
  if (label) label.textContent = `${percent}% completat`;
  const bar = document.querySelector(".progress-bar");
  if (bar) {
    bar.setAttribute("aria-valuenow", String(percent));
  }
}

function wireTasks() {
  document.querySelectorAll(".task-check").forEach(cb => {
    cb.addEventListener("change", () => {
      // Placeholder: notify backend about completion state
      const taskEl = cb.closest(".task");
      const id = taskEl?.dataset.taskid;
      const completed = cb.checked;
      // Example fetch (uncomment and adapt):
      // fetch(`/api/tasks/${id}/status`, {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ completed })
      // });
      updateProgress();
    });
  });

  document.querySelectorAll(".task-actions .btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const taskEl = btn.closest(".task");
      const id = taskEl?.dataset.taskid;
      const type = btn.dataset.action; // "people" | "time"
      const reason = prompt(`Cerere suplimentară pentru task #${id}\nIntroduceți motivul:`);
      if (!reason) return;

      // Example fetch to backend (uncomment and adapt):
      // fetch(`/api/tasks/${id}/requests`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ type, reason })
      // }).then(r => r.ok ? alert("Cerere trimisă!") : alert("Eroare la trimitere."));

      alert(`Cerere '${type}' pentru task #${id} trimisă.\nMotiv: ${reason}`);
    });
  });
}

function wireChat() {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatMessage");
  const win = document.getElementById("chatWindow");

  const appendMsg = (author, text, mine=false) => {
    const wrap = document.createElement("div");
    wrap.className = "msg" + (mine ? " mine" : "");
    wrap.innerHTML = `
      <div class="msg-author">${author}</div>
      <div class="msg-text"></div>
      <div class="msg-time">${new Date().toLocaleTimeString().slice(0,5)}</div>
    `;
    wrap.querySelector(".msg-text").textContent = text;
    win.appendChild(wrap);
    win.scrollTop = win.scrollHeight;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    // Placeholder: send to backend
    // fetch("/api/chat/messages", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ text }) });
    appendMsg("Tu", text, true);
    input.value = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireTasks();
  wireChat();
  updateProgress();
});
