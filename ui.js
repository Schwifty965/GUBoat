import { state, output, fontSelector, fontSizeDisplay, wordCountEl, charCountEl, messageModalOverlay, messageContent, confirmModalOverlay, confirmContent, loadingOverlay } from './config.js';

// --- Modal Functions ---
export function showMessage(message) {
    messageContent.textContent = message;
    messageModalOverlay.style.display = 'flex';
}

export function showConfirm(message, callback) {
    confirmContent.textContent = message;
    state.confirmCallback = callback;
    confirmModalOverlay.style.display = 'flex';
}

export function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// --- Theme and View Functions ---
export function toggleTheme(themeToggle) {
    let theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = '☀️';
    }
}

export function applySettings(font, size) {
    output.style.fontFamily = font;
    output.style.fontSize = `${size}px`;
    fontSizeDisplay.textContent = size;
}

export function saveSettings(font, size) {
    localStorage.setItem('editorFontFamily', font);
    localStorage.setItem('editorFontSize', size);
}

export function loadSettings() {
    const savedFont = localStorage.getItem('editorFontFamily') || "'Sarabun', -apple-system, sans-serif";
    const savedSize = parseInt(localStorage.getItem('editorFontSize')) || 18;
    state.currentFontSize = savedSize;
    fontSelector.value = savedFont;
    applySettings(savedFont, savedSize);
}

// --- Stats Update ---
export function updateStats() {
    const text = output.value;
    charCountEl.textContent = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    wordCountEl.textContent = words;
}
