// DOM REFERENCES
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const modeSelect = document.getElementById('mode-select');
const rudenessSlider = document.getElementById('rudeness-slider');
const consentCheckbox = document.getElementById('consent-checkbox');
const flirtBtn = document.getElementById('flirt-btn');
const ethicsBtn = document.getElementById('ethics-btn');
const ethicsModal = document.getElementById('ethics-modal');
const feedbackBtn = document.getElementById('feedback-btn');

// STATE
const STORAGE_KEY = 'tira-conversation';
const PREFERENCES_KEY = 'tira-preferences';
const MAX_HISTORY = 20;
const state = {
    history: [],
    currentMode: modeSelect ? modeSelect.value : 'friendly',
    rudeness: rudenessSlider ? Number(rudenessSlider.value) || 5 : 5,
    flirtyConsent: Boolean(consentCheckbox && consentCheckbox.checked),
    isGenerating: false,
    requestId: 0,
    controller: null,
    typingElement: null
};

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ mode: state.currentMode, rudeness: state.rudeness }));
    } catch (_) { /* Storage may be unavailable in private browsing. */ }
}

function loadState() {
    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        state.history = Array.isArray(history) ? history.filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-MAX_HISTORY) : [];
        const preferences = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
        if (modeSelect && typeof preferences.mode === 'string' && [...modeSelect.options].some(option => option.value === preferences.mode)) modeSelect.value = preferences.mode;
        if (rudenessSlider && Number.isFinite(Number(preferences.rudeness))) rudenessSlider.value = String(preferences.rudeness);
    } catch (_) {
        state.history = [];
        try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PREFERENCES_KEY); } catch (__) { /* ignore */ }
    }
    state.currentMode = modeSelect ? modeSelect.value : state.currentMode;
    state.rudeness = rudenessSlider ? Number(rudenessSlider.value) || 5 : state.rudeness;
}

// MESSAGE RENDERING
function addBubble(text, sender, moodTag = '', emojis = '') {
    if (!chatContainer) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}-bubble`;
    if (sender === 'tira') {
        const avatar = document.createElement('div');
        avatar.className = 'avatar'; avatar.textContent = '✨'; bubble.appendChild(avatar);
    }
    const content = document.createElement('div'); content.className = 'bubble-content';
    if (moodTag) { const mood = document.createElement('strong'); mood.textContent = moodTag; content.appendChild(mood); content.appendChild(document.createElement('br')); }
    content.appendChild(document.createTextNode(String(text)));
    content.appendChild(document.createElement('br'));
    if (emojis) { const emoji = document.createElement('em'); emoji.textContent = emojis; content.appendChild(emoji); }
    const timestamp = document.createElement('div'); timestamp.className = 'timestamp'; timestamp.textContent = new Date().toLocaleTimeString(); content.appendChild(timestamp);
    bubble.appendChild(content); chatContainer.appendChild(bubble); scrollToLatest();
}

function renderHistory() {
    if (!chatContainer) return;
    chatContainer.querySelectorAll('.chat-bubble').forEach(element => element.remove());
    state.history.forEach(message => addBubble(message.content, message.role === 'user' ? 'user' : 'tira'));
}

function scrollToLatest() {
    if (chatContainer && chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 160) chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTyping() {
    if (!chatContainer || state.typingElement) return;
    state.typingElement = document.createElement('div'); state.typingElement.className = 'chat-bubble tira-bubble typing-indicator'; state.typingElement.textContent = 'TIRA is typing…'; state.typingElement.setAttribute('aria-live', 'polite'); chatContainer.appendChild(state.typingElement); scrollToLatest();
}
function hideTyping() { if (state.typingElement) { state.typingElement.remove(); state.typingElement = null; } }

// CHAT / API
async function sendMessage(rawText) {
    if (state.isGenerating || typeof rawText !== 'string') return;
    const text = rawText.trim(); if (!text) return;
    state.isGenerating = true; updateControls();
    state.history.push({ role: 'user', content: text }); state.history = state.history.slice(-MAX_HISTORY); saveState(); addBubble(text, 'user');
    if (messageInput) { messageInput.value = ''; messageInput.focus(); }
    showTyping();
    const requestId = ++state.requestId; state.controller = new AbortController();
    const timeout = setTimeout(() => state.controller.abort(), 30000);
    try {
        const response = await fetch('http://localhost:8080/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: state.controller.signal, body: JSON.stringify({ message: text, mode: state.currentMode, consent: state.flirtyConsent, rudeness: state.rudeness, history: state.history.slice(-MAX_HISTORY) }) });
        if (requestId !== state.requestId) return;
        if (!response.ok) throw new Error('server');
        const data = await response.json();
        if (!data || (typeof data.reply !== 'string' && !data.flagged)) throw new Error('invalid');
        const reply = data.flagged ? "Sorry, I can't help with that. I can be flirty in a PG way though!" : data.reply;
        state.history.push({ role: 'assistant', content: reply }); state.history = state.history.slice(-MAX_HISTORY); saveState(); addBubble(reply, 'tira', data.mood_tag, data.emojis);
    } catch (error) {
        if (requestId !== state.requestId) return;
        const message = error.name === 'AbortError' ? 'TIRA took too long to respond. Please try again.' : error.message === 'invalid' ? 'TIRA returned an unexpected response.' : error.message === 'server' ? 'TIRA’s backend returned an error.' : 'TIRA could not connect to the server.';
        addBubble(message, 'tira');
    } finally { clearTimeout(timeout); if (requestId === state.requestId) { hideTyping(); state.isGenerating = false; state.controller = null; updateControls(); if (messageInput) messageInput.focus(); } }
}

function updateControls() { if (sendBtn) sendBtn.disabled = state.isGenerating || !messageInput || !messageInput.value.trim(); if (flirtBtn) flirtBtn.disabled = !state.flirtyConsent; }
function clearConversation() { state.history = []; state.requestId++; if (state.controller) state.controller.abort(); hideTyping(); state.isGenerating = false; try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ } if (chatContainer) chatContainer.querySelectorAll('.chat-bubble').forEach(element => element.remove()); updateControls(); }

// MODALS AND EVENTS
function closeModal() { if (ethicsModal) ethicsModal.style.display = 'none'; }
if (consentCheckbox) consentCheckbox.addEventListener('change', () => { state.flirtyConsent = consentCheckbox.checked; updateControls(); });
if (modeSelect) modeSelect.addEventListener('change', () => { state.currentMode = modeSelect.value; saveState(); });
if (rudenessSlider) rudenessSlider.addEventListener('input', () => { state.rudeness = Number(rudenessSlider.value) || 0; saveState(); });
if (sendBtn) sendBtn.addEventListener('click', () => sendMessage(messageInput && messageInput.value));
if (messageInput) { messageInput.addEventListener('input', updateControls); messageInput.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(messageInput.value); } }); }
document.querySelectorAll('.quick-btn').forEach(button => button.addEventListener('click', () => sendMessage(button.dataset.action || '')));
if (ethicsBtn) ethicsBtn.addEventListener('click', () => { if (ethicsModal) ethicsModal.style.display = 'flex'; });
document.querySelectorAll('.close-modal').forEach(button => button.addEventListener('click', closeModal));
if (ethicsModal) ethicsModal.addEventListener('click', event => { if (event.target === ethicsModal) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
if (feedbackBtn) feedbackBtn.addEventListener('click', () => alert('Feedback is available in the interface, but no feedback server is configured.'));

// INITIALIZATION
loadState(); renderHistory(); updateControls();

