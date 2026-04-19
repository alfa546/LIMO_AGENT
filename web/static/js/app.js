// Claude/ChatGPT/Gemini Style JavaScript
const markedOptions = {
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
};
marked.setOptions(markedOptions);

let sessionId = localStorage.getItem('limo_session_id');
if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('limo_session_id', sessionId);
}

const chatContainer = document.getElementById('chatContainer');
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('sendBtn');
const chatHistoryContainer = document.getElementById('chatHistory');

let selectedModel = localStorage.getItem('limo_selected_model') || 'openrouter/elephant-alpha';
let isLoading = false;

// Auto-resize textarea
promptEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

promptEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(e);
    }
});

function autoScroll() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function renderMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (role === 'user') {
        contentDiv.textContent = content;
    } else {
        const rawHtml = marked.parse(content);
        contentDiv.innerHTML = DOMPurify.sanitize(rawHtml);
        
        // Highlight code blocks and add copy buttons
        contentDiv.querySelectorAll('pre').forEach((pre, idx) => {
            const code = pre.querySelector('code');
            if (code) {
                const lang = code.className.replace('language-', '') || 'text';
                
                // Create copy button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-code-btn';
                copyBtn.innerHTML = '📋 Copy';
                copyBtn.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #e6edf3;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                `;
                copyBtn.onmouseover = () => copyBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                copyBtn.onmouseout = () => copyBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(code.textContent);
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '✓ Copied';
                    setTimeout(() => copyBtn.innerHTML = originalText, 2000);
                };
                
                // Wrap pre for positioning
                pre.style.position = 'relative';
                pre.style.marginTop = '24px';
                pre.appendChild(copyBtn);
                
                hljs.highlightElement(code);
            }
        });
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    autoScroll();
}

async function api(path, payload) {
    const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return await res.json();
}

async function loadHistory() {
    try {
        const data = await api('/api/session/history', { session_id: sessionId });
        chatContainer.innerHTML = '';
        if (data.history && data.history.length > 0) {
            data.history.forEach(m => renderMessage(m.role, m.content));
        } else {
            chatContainer.innerHTML = '<div class="empty-state"><div class="empty-state-title">How can I help you today?</div></div>';
        }
        autoScroll();
    } catch (e) {
        console.error("LoadHistory Error:", e);
        chatContainer.innerHTML = '<div class="empty-state"><div class="empty-state-title">How can I help you today?</div></div>';
    }
}

async function handleSend(event) {
    if (isLoading) return;
    
    const text = promptEl.value.trim();
    if (!text) return;

    promptEl.value = '';
    promptEl.style.height = 'auto';
    sendBtn.disabled = true;
    isLoading = true;
    
    // Remove empty state
    const empty = chatContainer.querySelector('.empty-state');
    if (empty) empty.remove();

    renderMessage('user', text);

    // AI thinking state
    const thinkingId = 'thinking-' + Date.now();
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message ai loading';
    thinkingDiv.id = thinkingId;
    thinkingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div style="display: flex; gap: 4px; align-items: center;">
                <span>Thinking</span>
                <span class="dot-loader"></span>
            </div>
        </div>
    `;
    chatContainer.appendChild(thinkingDiv);
    autoScroll();

    try {
        const data = await api('/api/chat', { session_id: sessionId, message: text, model: selectedModel });
        document.getElementById(thinkingId).remove();
        renderMessage('ai', data.answer || 'No response received');
        await loadRecentChats();
    } catch (err) {
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) {
            thinkingEl.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content" style="color: #f85149;">
                    <strong>Error:</strong> ${err.message || 'Failed to get response from API'}
                </div>
            `;
        }
    } finally {
        sendBtn.disabled = false;
        isLoading = false;
        promptEl.focus();
    }
}

async function loadRecentChats() {
    try {
        const res = await fetch('/api/recent-chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        chatHistoryContainer.innerHTML = '';
        if (data.chats) {
            data.chats.forEach(chat => {
                const item = document.createElement('div');
                item.className = `chat-item ${chat.session_id === sessionId ? 'active' : ''}`;
                item.textContent = chat.title;
                item.onclick = () => {
                    sessionId = chat.session_id;
                    localStorage.setItem('limo_session_id', sessionId);
                    loadHistory();
                    loadRecentChats();
                };
                chatHistoryContainer.appendChild(item);
            });
        }
    } catch (e) { }
}

function newChat() {
    sessionId = 'sess_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('limo_session_id', sessionId);
    loadHistory();
    loadRecentChats();
}

// Initial load
loadHistory();
loadRecentChats();
