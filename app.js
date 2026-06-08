let parsedMessages = [];
let uniqueUsers = new Set();
let currentFontSize = 16;

let matchElements = [];
let currentMatchIndex = -1;

const MONTHS = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

// DOM Node Selectors
const fileInput = document.getElementById('file-input');
const senderSelect = document.getElementById('sender-select');
const viewSelect = document.getElementById('view-select');
const themeSelect = document.getElementById('theme-select');
const searchInput = document.getElementById('search-input');
const matchCounter = document.getElementById('match-counter');
const searchPrev = document.getElementById('search-prev');
const searchNext = document.getElementById('search-next');
const fontDecrease = document.getElementById('font-decrease');
const fontIncrease = document.getElementById('font-increase');
const chatLog = document.getElementById('chat-log');

// View Mode Switcher
viewSelect.addEventListener('change', (e) => {
    if (e.target.value === 'desktop') {
        document.body.classList.add('desktop-mode');
    } else {
        document.body.classList.remove('desktop-mode');
    }
    if (currentMatchIndex !== -1) {
        scrollToMatch(currentMatchIndex);
    } else {
        chatLog.scrollTop = chatLog.scrollHeight;
    }
});

// Theme Switcher
themeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
});

// Font Scaling
function updateFontSize(amount) {
    currentFontSize = Math.max(12, Math.min(30, currentFontSize + amount));
    document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
    if (currentMatchIndex !== -1) {
        scrollToMatch(currentMatchIndex);
    } else {
        chatLog.scrollTop = chatLog.scrollHeight;
    }
}
fontIncrease.addEventListener('click', () => updateFontSize(1));
fontDecrease.addEventListener('click', () => updateFontSize(-1));

// Search Parsing Triggers
searchInput.addEventListener('input', () => {
    renderChat(); 
    initializeMatches(); 
});

searchNext.addEventListener('click', () => navigateMatch(1));
searchPrev.addEventListener('click', () => navigateMatch(-1));

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && matchElements.length > 0) {
        e.preventDefault();
        navigateMatch(e.shiftKey ? -1 : 1);
    }
});

// Handle file upload stream
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        parseChatLog(event.target.result);
        updateSenderDropdown();
        searchInput.disabled = false;
        searchInput.value = '';
        resetSearchState();
        renderChat();
    };
    reader.readAsText(file);
});

/**
 * Format Date string helper
 * Handles:
 * - Format 1 (US-ish): MM/DD/YY or MM/DD/YYYY
 * - Format 2 (ES-ish): DD/MM/YY
 */
function formatReadableDate(rawDate, isSpanishFormat = false) {
    // Standardize separators just in case
    const parts = rawDate.split('/');
    if (parts.length !== 3) return rawDate;

    let dayStr, monthStr, yearStr;

    if (isSpanishFormat) {
        // Format 2: DD/MM/YY
        [dayStr, monthStr, yearStr] = parts;
    } else {
        // Format 1: MM/DD/YY
        [monthStr, dayStr, yearStr] = parts;
    }
    
    const monthIndex = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    let year = parseInt(yearStr, 10);

    if (yearStr.length === 2) {
        year = year < 70 ? 2000 + year : 1900 + year; 
    }

    if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${MONTHS[monthIndex]} ${year}`;
    }

    return rawDate;
}

// Parse raw log file supporting multiple formats
function parseChatLog(text) {
    parsedMessages = [];
    uniqueUsers.clear();

    // Regex 1: Original Format -> "5/5/23, 10:12 - user1: message"
    const regexOriginal = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2})\s-\s([^:]+):\s(.*)$/;

    // Regex 2: Spanish 12h Format -> "03/04/26 9:44 a. m. - David: message"
    // Notes: Handles potential spaces/non-breaking spaces before 'a. m.' or 'p. m.'
    const regexSpanish12h = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s(\d{1,2}:\d{2}\s*(?:a\.\s*m\.|p\.\s*m\.))\s-\s([^:]+):\s(.*)$/i;

    const lines = text.split(/\r?\n/);
    let currentMessage = null;

    lines.forEach(line => {
        // Try original format match first
        let match = line.match(regexOriginal);
        let isSpanish = false;

        // If no match, check the Spanish 12-hour layout pattern
        if (!match) {
            match = line.match(regexSpanish12h);
            isSpanish = true;
        }

        if (match) {
            if (currentMessage) parsedMessages.push(currentMessage);

            const [_, date, time, user, messageBody] = match;
            uniqueUsers.add(user.trim());

            // Normalize time typography (remove excess spaces inside a. m. / p. m. for UI display consistency)
            let cleanedTime = time.trim().replace(/\s+/g, ' ');

            currentMessage = {
                date: formatReadableDate(date.trim(), isSpanish), 
                time: cleanedTime,
                user: user.trim(),
                text: messageBody
            };
        } else if (currentMessage) {
            // Continuation line for multi-line messages
            currentMessage.text += '\n' + line;
        }
    });

    if (currentMessage) parsedMessages.push(currentMessage);
}

// Dynamic Sender Assignments
function updateSenderDropdown() {
    senderSelect.innerHTML = '';
    if (uniqueUsers.size === 0) {
        senderSelect.innerHTML = '<option value="">No users found</option>';
        senderSelect.disabled = true;
        return;
    }

    uniqueUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        senderSelect.appendChild(option);
    });
    senderSelect.disabled = false;
}

function resetSearchState() {
    matchElements = [];
    currentMatchIndex = -1;
    matchCounter.textContent = "0/0";
    searchNext.disabled = true;
    searchPrev.disabled = true;
}

function highlightAndEscape(text, searchTerm) {
    const escaped = escapeHTML(text);
    if (!searchTerm) return { html: escaped, hasMatch: false };

    const sanitizedSearch = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${sanitizedSearch})`, 'gi');
    
    const hasMatch = regex.test(escaped);
    const html = escaped.replace(regex, '<mark class="chat-match">$1</mark>');
    
    return { html, hasMatch };
}

// Primary DOM Injection Renderer
function renderChat() {
    chatLog.innerHTML = '';
    const selectedSender = senderSelect.value;
    const searchTerm = searchInput.value.trim();

    parsedMessages.forEach(msg => {
        const row = document.createElement('div');
        row.classList.add('message-row');
        
        if (msg.user === selectedSender) {
            row.classList.add('sender');
        } else {
            row.classList.add('receiver');
        }

        const parseResult = highlightAndEscape(msg.text, searchTerm);

        row.innerHTML = `
            <div class="bubble">
                <span class="user-name">${escapeHTML(msg.user)}</span>
                <div class="text-content">${parseResult.html}</div>
                <div class="meta">${msg.date} • ${msg.time}</div>
            </div>
        `;
        chatLog.appendChild(row);
    });

    if (!searchTerm) {
        chatLog.scrollTop = chatLog.scrollHeight;
        resetSearchState();
    }
}

// Selection Query Indexing
function initializeMatches() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) return;

    matchElements = Array.from(chatLog.querySelectorAll('mark.chat-match'));

    if (matchElements.length > 0) {
        currentMatchIndex = 0;
        searchNext.disabled = false;
        searchPrev.disabled = false;
        updateMatchUI();
        scrollToMatch(currentMatchIndex);
    } else {
        resetSearchState();
    }
}

function navigateMatch(direction) {
    if (matchElements.length === 0) return;

    matchElements[currentMatchIndex].classList.remove('active-match');
    matchElements[currentMatchIndex].closest('.message-row').classList.remove('has-active-match');

    currentMatchIndex = (currentMatchIndex + direction + matchElements.length) % matchElements.length;

    updateMatchUI();
    scrollToMatch(currentMatchIndex);
}

function updateMatchUI() {
    matchCounter.textContent = `${currentMatchIndex + 1}/${matchElements.length}`;
    
    const targetMark = matchElements[currentMatchIndex];
    targetMark.classList.add('active-match');
    targetMark.closest('.message-row').classList.add('has-active-match');
}

function scrollToMatch(index) {
    const element = matchElements[index];
    if (!element) return;

    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

senderSelect.addEventListener('change', () => {
    renderChat();
    initializeMatches();
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
