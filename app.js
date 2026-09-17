// Frontend logic for Tira Chat
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

// Update flirt button based on consent
consentCheckbox.addEventListener('change', () => {
    flirtBtn.disabled = !consentCheckbox.checked;
});

// Quick replies
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        sendMessage(btn.dataset.action);
    });
});


sendBtn.addEventListener('click', () => sendMessage(messageInput.value));
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(messageInput.value);
});

function sendMessage(text) {
    if (!text.trim()) return;
    addBubble(text, 'user');
    messageInput.value = '';

 
    fetch('http://localhost:8080/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: text,
            mode: modeSelect.value,
            consent: consentCheckbox.checked,
            rudeness: rudenessSlider.value
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.flagged) {
            addBubble("Sorry, I can't help with that. I can be flirty in a PG way though!", 'tira');
        } else {
            addBubble(data.reply, 'tira', data.mood_tag, data.emojis);
        }
    })
    .catch(err => addBubble('Error connecting to backend.', 'tira'));
}

function addBubble(text, sender, moodTag = '', emojis = '') {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}-bubble`;
    bubble.innerHTML = `
        ${sender === 'tira' ? '<div class="avatar">✨</div>' : ''}
        <div class="bubble-content">
            ${moodTag ? `<strong>${moodTag}</strong><br>` : ''}${text}<br>
            ${emojis ? `<em>${emojis}</em>` : ''}
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Modals
ethicsBtn.addEventListener('click', () => ethicsModal.style.display = 'flex');
document.querySelector('.close-modal').addEventListener('click', () => ethicsModal.style.display = 'none');
feedbackBtn.addEventListener('click', () => {
    // Simple feedback log (in real app, send to server)
    console.log('Feedback reported');
    alert('Feedback logged. Thank you!');
});