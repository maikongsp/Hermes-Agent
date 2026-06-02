/* global marked, hljs */

// ── Marked configuration ──────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

const renderer = new marked.Renderer();
renderer.code = (code, lang) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  let highlighted;
  try {
    highlighted = hljs.highlight(code, { language }).value;
  } catch {
    highlighted = hljs.highlightAuto(code).value;
  }
  return `
    <pre>
      <div class="code-header">
        <span>${language}</span>
        <button class="copy-btn" onclick="copyCode(this)">Copiar</button>
      </div>
      <code class="hljs language-${language}">${highlighted}</code>
    </pre>`;
};
marked.use({ renderer });

// ── State ─────────────────────────────────────────────────
const state = {
  sessionId: null,
  sessions: [],          // [{id, title}]
  isLoading: false,
};

// ── DOM refs ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const messagesEl   = $('messages');
const inputEl      = $('user-input');
const sendBtn      = $('send-btn');
const sessionsList = $('sessions-list');
const sessionTitle = $('session-title');
const welcome      = $('welcome');
const sidebar      = $('sidebar');
const overlay      = $('overlay');

// ── Helpers ───────────────────────────────────────────────
function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function saveState() {
  localStorage.setItem('hermes_sessions', JSON.stringify(state.sessions));
  localStorage.setItem('hermes_current', state.sessionId || '');
}

function loadState() {
  try {
    state.sessions = JSON.parse(localStorage.getItem('hermes_sessions') || '[]');
    state.sessionId = localStorage.getItem('hermes_current') || null;
  } catch {
    state.sessions = [];
  }
}

function renderSidebar() {
  sessionsList.innerHTML = '';
  if (!state.sessions.length) {
    sessionsList.innerHTML = '<div style="padding:12px 16px;font-size:12px;color:var(--text-muted)">Nenhuma conversa ainda</div>';
    return;
  }
  [...state.sessions].reverse().forEach(s => {
    const el = document.createElement('div');
    el.className = 'session-item' + (s.id === state.sessionId ? ' active' : '');
    el.innerHTML = `<span class="session-icon">💬</span><span style="overflow:hidden;text-overflow:ellipsis">${s.title}</span>`;
    el.onclick = () => switchSession(s.id);
    sessionsList.appendChild(el);
  });
}

// ── Session management ────────────────────────────────────
function newChat() {
  state.sessionId = null;
  welcome.style.display = 'flex';
  // Remove all messages except welcome
  [...messagesEl.children].forEach(c => { if (c !== welcome) c.remove(); });
  sessionTitle.textContent = 'Hermes Agent';
  renderSidebar();
  closeSidebar();
  inputEl.focus();
}

async function switchSession(id) {
  state.sessionId = id;
  const s = state.sessions.find(s => s.id === id);
  sessionTitle.textContent = s ? s.title : 'Conversa';
  welcome.style.display = 'none';
  [...messagesEl.children].forEach(c => { if (c !== welcome) c.remove(); });
  saveState();
  renderSidebar();
  closeSidebar();

  // Load history from server
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) {
      const data = await res.json();
      data.messages.forEach(msg => {
        appendMessage(msg.role, msg.content, false);
      });
      scrollToBottom();
    }
  } catch { /* session may not exist on server restart */ }
}

// ── Message rendering ─────────────────────────────────────
function appendMessage(role, text, animate = true) {
  if (welcome.style.display !== 'none') {
    welcome.style.display = 'none';
  }

  const wrap = document.createElement('div');
  wrap.className = 'message-wrap';

  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const avatarEl = document.createElement('div');
  avatarEl.className = `avatar ${role}`;
  avatarEl.textContent = role === 'user' ? '👤' : '🪁';

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';

  if (role === 'assistant') {
    contentEl.innerHTML = marked.parse(text || '');
  } else {
    contentEl.textContent = text;
  }

  msg.appendChild(avatarEl);
  msg.appendChild(contentEl);
  wrap.appendChild(msg);
  messagesEl.appendChild(wrap);

  if (animate) scrollToBottom();
  return contentEl;
}

function appendStreamingMessage() {
  if (welcome.style.display !== 'none') {
    welcome.style.display = 'none';
  }

  const wrap = document.createElement('div');
  wrap.className = 'message-wrap';
  wrap.id = 'streaming-msg';

  const msg = document.createElement('div');
  msg.className = 'message assistant';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'avatar assistant';
  avatarEl.textContent = '🪁';

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';

  // Typing indicator while waiting
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typing-dots';
  typing.innerHTML = '<span></span><span></span><span></span>';
  contentEl.appendChild(typing);

  msg.appendChild(avatarEl);
  msg.appendChild(contentEl);
  wrap.appendChild(msg);
  messagesEl.appendChild(wrap);
  scrollToBottom();

  return { wrap, contentEl };
}

let streamBuffer = '';

function removeTypingDots() {
  const dots = document.getElementById('typing-dots');
  if (dots) dots.remove();
}

function appendToolCard(name, input) {
  const icons = { web_search: '🔍', calculator: '🧮', get_datetime: '🕐', fetch_webpage: '🌐' };
  const labels = { web_search: 'Buscando na web', calculator: 'Calculando', get_datetime: 'Obtendo data/hora', fetch_webpage: 'Lendo página' };

  const card = document.createElement('div');
  card.className = 'tool-card message-wrap';

  const inputStr = typeof input === 'object' ? JSON.stringify(input, null, 2) : String(input);

  card.innerHTML = `
    <div class="tool-header">
      <span class="tool-icon">${icons[name] || '🔧'}</span>
      <span>${labels[name] || name}</span>
      <div class="tool-status">
        <div class="spinner" id="spinner-${name}"></div>
        <span id="status-${name}">Em andamento...</span>
      </div>
    </div>
    <div class="tool-body" id="tool-body-${name}">${escHtml(inputStr)}</div>`;

  messagesEl.appendChild(card);
  scrollToBottom();
  return card;
}

function updateToolCard(name, result) {
  const spinner = document.getElementById(`spinner-${name}`);
  const status  = document.getElementById(`status-${name}`);
  const body    = document.getElementById(`tool-body-${name}`);

  if (spinner) spinner.remove();
  if (status)  status.textContent = 'Concluído ✓';
  if (body)    body.textContent = result;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// ── Copy code ─────────────────────────────────────────────
window.copyCode = function(btn) {
  const code = btn.closest('pre').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copiado!';
    setTimeout(() => (btn.textContent = 'Copiar'), 2000);
  });
};

// ── Send message ──────────────────────────────────────────
async function sendMessage(text) {
  text = text.trim();
  if (!text || state.isLoading) return;

  state.isLoading = true;
  sendBtn.disabled = true;
  inputEl.value = '';
  inputEl.style.height = 'auto';

  // If no session, create one
  if (!state.sessionId) {
    state.sessionId = genId();
    const title = text.length > 40 ? text.slice(0, 40) + '…' : text;
    state.sessions.push({ id: state.sessionId, title });
    sessionTitle.textContent = title;
    renderSidebar();
    saveState();
  }

  appendMessage('user', text);

  const { wrap: streamWrap, contentEl } = appendStreamingMessage();
  streamBuffer = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: state.sessionId }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';
    let firstText = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let evt;
        try { evt = JSON.parse(line.slice(6)); } catch { continue; }

        if (evt.type === 'text') {
          if (firstText) { removeTypingDots(); firstText = false; }
          streamBuffer += evt.content;
          contentEl.innerHTML = marked.parse(streamBuffer);
          scrollToBottom();

        } else if (evt.type === 'tool_start') {
          appendToolCard(evt.name, evt.input);
          scrollToBottom();

        } else if (evt.type === 'tool_result') {
          updateToolCard(evt.name, evt.result);

        } else if (evt.type === 'error') {
          removeTypingDots();
          contentEl.innerHTML = `<span style="color:var(--error)">Erro: ${escHtml(evt.message)}</span>`;

        } else if (evt.type === 'done') {
          removeTypingDots();
          if (!streamBuffer) {
            contentEl.innerHTML = '<em style="color:var(--text-muted)">Sem resposta</em>';
          }
        }
      }
    }
  } catch (err) {
    removeTypingDots();
    contentEl.innerHTML = `<span style="color:var(--error)">Erro de conexão: ${escHtml(String(err))}</span>`;
  } finally {
    state.isLoading = false;
    sendBtn.disabled = false;
    inputEl.focus();
    scrollToBottom();
  }
}

// ── Input events ──────────────────────────────────────────
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(inputEl.value);
  }
});

inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + 'px';
});

sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
$('btn-new-chat').addEventListener('click', newChat);

// Capability cards click
document.querySelectorAll('.cap-card').forEach(card => {
  card.addEventListener('click', () => {
    inputEl.value = card.dataset.prompt;
    inputEl.dispatchEvent(new Event('input'));
    inputEl.focus();
  });
});

// Mobile sidebar
$('hamburger').addEventListener('click', () => {
  sidebar.classList.add('open');
  overlay.classList.add('active');
});
overlay.addEventListener('click', closeSidebar);

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

// ── Init ──────────────────────────────────────────────────
loadState();
renderSidebar();
inputEl.focus();
