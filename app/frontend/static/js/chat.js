var chatPanel = null;
var chatToggle = null;
var chatMessages = null;
var chatInput = null;
var chatSendBtn = null;
var chatAttachBtn = null;
var chatFileInput = null;
var chatFilePreview = null;
var chatFileName = null;
var chatFileSize = null;
var chatFileRemove = null;
var chatResetBtn = null;
var chatStatus = null;
var chatMaximizeBtn = null;

var attachedFile = null;
var isOpen = false;
var isThinking = false;
var isMaximized = false;

const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB


// ─── Toggle / open / close ────────────────────────────────────────────────────

function toggleChat() {
    if (isOpen) closeChat();
    else openChat();
}

function openChat() {
    chatPanel.classList.add('open');
    chatToggle.classList.add('open');
    chatPanel.setAttribute('aria-hidden', 'false');
    isOpen = true;
    setTimeout(() => chatInput.focus(), 200);
}

function closeChat() {
    chatPanel.classList.remove('open');
    chatToggle.classList.remove('open');
    chatPanel.setAttribute('aria-hidden', 'true');
    isOpen = false;
    if (isMaximized) {
        isMaximized = false;
        chatPanel.classList.remove('maximized');
        chatMaximizeBtn.classList.remove('is-maximized');
        chatToggle.classList.remove('is-maximized');
    }
}

function toggleMaximize() {
    isMaximized = !isMaximized;
    chatPanel.classList.toggle('maximized', isMaximized);
    chatMaximizeBtn.classList.toggle('is-maximized', isMaximized);
    chatToggle.classList.toggle('is-maximized', isMaximized);
    chatMaximizeBtn.title = isMaximized ? 'Shrink chat' : 'Expand chat';
    if (isMaximized && !isOpen) openChat();
}


// ─── Message rendering ────────────────────────────────────────────────────────

function appendUserMessage(text, file) {
    let attachmentHTML = '';
    if (file) {
        attachmentHTML = `
            <div class="chat-msg-attachment">
                <div class="chat-msg-attachment-icon">PDF</div>
                <div class="chat-msg-attachment-name">${escapeHTML(file.name)}</div>
                <div class="chat-msg-attachment-size">${formatFileSize(file.size)}</div>
            </div>`;
    }
    const textHTML = text ? `<div>${escapeHTML(text)}</div>` : '';
    chatMessages.insertAdjacentHTML('beforeend', `
        <div class="chat-msg user">
            <div class="chat-bubble">${attachmentHTML}${textHTML}</div>
        </div>`);
    scrollToBottom();
}

function appendBotMessage(html) {
    chatMessages.insertAdjacentHTML('beforeend', `
        <div class="chat-msg bot">
            <div class="chat-bubble">${html}</div>
        </div>`);
    scrollToBottom();
}

function appendErrorMessage(html) {
    chatMessages.insertAdjacentHTML('beforeend', `
        <div class="chat-msg bot error">
            <div class="chat-bubble">${html}</div>
        </div>`);
    scrollToBottom();
}

function showTypingIndicator() {
    if (isThinking) return;
    isThinking = true;
    chatStatus.textContent = 'Thinking...';
    chatStatus.classList.add('thinking');
    chatSendBtn.disabled = true;
    chatInput.disabled = true;
    chatAttachBtn.disabled = true;
    chatMessages.insertAdjacentHTML('beforeend', `
        <div class="chat-msg bot" id="chat-typing-row">
            <div class="chat-bubble">
                <div class="chat-typing"><span></span><span></span><span></span></div>
            </div>
        </div>`);
    scrollToBottom();
}

function hideTypingIndicator() {
    isThinking = false;
    chatStatus.textContent = 'Online';
    chatStatus.classList.remove('thinking');
    chatSendBtn.disabled = false;
    chatInput.disabled = false;
    chatAttachBtn.disabled = false;
    const row = document.getElementById('chat-typing-row');
    if (row) row.remove();
}


// ─── File attachment ──────────────────────────────────────────────────────────

function handleAttachClick() { chatFileInput.click(); }

function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
        appendErrorMessage('<strong>⚠️ Only PDF files are supported.</strong>');
        chatFileInput.value = '';
        return;
    }
    if (file.size > MAX_FILE_SIZE) {
        appendErrorMessage(`<strong>⚠️ File too large.</strong> Max size is ${formatFileSize(MAX_FILE_SIZE)}.`);
        chatFileInput.value = '';
        return;
    }
    attachedFile = file;
    chatFileName.textContent = file.name;
    chatFileSize.textContent = formatFileSize(file.size);
    chatFilePreview.classList.add('show');
}

function clearAttachedFile() {
    attachedFile = null;
    chatFileInput.value = '';
    chatFilePreview.classList.remove('show');
}


// ─── Send message ─────────────────────────────────────────────────────────────

function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text && !attachedFile) return;
    if (isThinking) return;

    const fileSnapshot = attachedFile;
    appendUserMessage(text, fileSnapshot);
    chatInput.value = '';
    clearAttachedFile();

    showTypingIndicator();
    sendToBot(text, fileSnapshot)
        .then(reply => {
            hideTypingIndicator();
            appendBotMessage(escapeHTML(reply));
        })
        .catch(err => {
            hideTypingIndicator();
            appendErrorMessage(`<strong>⚠️ Something went wrong.</strong> ${escapeHTML(err.message || 'Please try again.')}`);
        });
}

async function sendToBot(text, file) {
    const formData = new FormData();
    formData.append('message', text);
    if (file) formData.append('file', file);

    // authFetch is defined in base.html — adds Bearer token and handles 401
    const res = await authFetch('/api/chat', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Chat service unavailable');
    const data = await res.json();
    return data.reply;
}


// ─── Reset — calls server to clear DB history ────────────────────────────────

async function handleResetChat() {
    if (!confirm('Clear the conversation? This will erase your full chat history.')) return;

    try {
        await authFetch('/api/chat/clear', { method: 'DELETE' });
    } catch (_) {}

    chatMessages.innerHTML = `
        <div class="chat-msg bot">
            <div class="chat-bubble">Hello! I'm your financial assistant. Ask me about your balance, expenses, or upload a PDF bank statement to analyze.</div>
        </div>`;
    clearAttachedFile();
}


// ─── Load history from DB on open ────────────────────────────────────────────

async function loadHistoryFromServer() {
    try {
        const res = await authFetch('/api/chat/history');
        if (!res.ok) return;
        const data = await res.json();
        const history = data.history || [];

        if (history.length === 0) return;  // keep welcome message

        chatMessages.innerHTML = '';   // clear welcome message
        for (const msg of history) {
            if (msg.role === 'user') {
                chatMessages.insertAdjacentHTML('beforeend', `
                    <div class="chat-msg user">
                        <div class="chat-bubble">${escapeHTML(msg.content)}</div>
                    </div>`);
            } else if (msg.role === 'assistant') {
                chatMessages.insertAdjacentHTML('beforeend', `
                    <div class="chat-msg bot">
                        <div class="chat-bubble">${escapeHTML(msg.content)}</div>
                    </div>`);
            }
        }
        scrollToBottom();
    } catch (_) {
        // Silently fail — welcome message stays visible
    }
}


// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function activateNavLink() {
    const title = document.title.toLowerCase().split(' - ')[0];
    if (title.includes('dashboard'))    document.getElementById('nav-dashboard')?.classList.add('active');
    else if (title.includes('transactions')) document.getElementById('nav-transactions')?.classList.add('active');
    else if (title.includes('budgets'))  document.getElementById('nav-budgets')?.classList.add('active');
}


// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    activateNavLink();

    chatPanel       = document.getElementById('chat-panel');
    chatToggle      = document.getElementById('chat-toggle');
    chatMessages    = document.getElementById('chat-messages');
    chatInput       = document.getElementById('chat-input');
    chatSendBtn     = document.getElementById('chat-send');
    chatAttachBtn   = document.getElementById('chat-attach');
    chatFileInput   = document.getElementById('chat-file-input');
    chatFilePreview = document.getElementById('chat-file-preview');
    chatFileName    = document.getElementById('chat-file-name');
    chatFileSize    = document.getElementById('chat-file-size');
    chatFileRemove  = document.getElementById('chat-file-remove');
    chatResetBtn    = document.getElementById('chat-reset');
    chatStatus      = document.getElementById('chat-status');
    chatMaximizeBtn = document.getElementById('chat-maximize');

    if (!chatPanel) return;

    // Load DB-persisted history (replaces sessionStorage approach)
    loadHistoryFromServer();

    chatToggle.addEventListener('click', toggleChat);
    chatSendBtn.addEventListener('click', handleSendMessage);
    chatAttachBtn.addEventListener('click', handleAttachClick);
    chatFileInput.addEventListener('change', handleFileSelected);
    chatFileRemove.addEventListener('click', clearAttachedFile);
    chatResetBtn.addEventListener('click', handleResetChat);
    chatMaximizeBtn.addEventListener('click', toggleMaximize);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closeChat();
    });
});