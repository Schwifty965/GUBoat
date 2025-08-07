// --- Import Modules ---
// Config and State (นำเข้าตัวแปรทั้งหมดที่จำเป็น)
import {
    state,
    themeToggle, output, undoButton, redoButton, clearButton, copyButton,
    correctTextButton, wrongWordInput, correctWordInput, addCorrectionBtn, correctionList,
    charInput, addCharBtn, shortcutZone, wordCountEl, charCountEl, fontSelector,
    fontSizeDownBtn, fontSizeUpBtn, fontSizeDisplay, loadingOverlay, apiKeyInput,
    saveApiKeyBtn, proofreadButton, rephraseButton, titleButton, reviewModalOverlay,
    reviewList, applyChangesBtn, cancelReviewBtn, customAiPromptInput, sendCustomPromptBtn,
    aiHistoryLog, clearAiHistoryBtn, youtubePlaylistInput, loadYoutubePlaylistBtn,
    youtubePlayerContainer, prevSongBtn, playPauseBtn, nextSongBtn, shufflePlaylistBtn,
    youtubeSingleSearchInput, playSingleSongBtn, youtubeQueueList, apiKeyStatus,
    messageModalOverlay, messageContent, messageOkBtn, confirmModalOverlay,
    confirmContent, confirmYesBtn, confirmNoBtn
} from './config.js';

// UI Handlers
import { showMessage, showConfirm, toggleTheme, applySettings, saveSettings, loadSettings, updateStats } from './ui.js';

// Feature Modules
import { saveState, loadState, updateUndoRedoButtons } from './history.js';
import { setupSpeechRecognition } from './speech.js';
import { proofreadWithAI, applyAiChanges, rephraseWithAI, generateTitleWithAI, sendCustomPromptToAI, addAiResponseToHistory } from './gemini.js';
import { loadYouTubeIframeAPI, loadPlaylist, playSingleSong } from './youtube.js';

// --- Local Storage Functions ---
export function saveContent() { localStorage.setItem('scriptContentV4', output.value); }
function loadContent() {
    const savedText = localStorage.getItem('scriptContentV4');
    if (savedText) output.value = savedText;
}
function saveCharacters() { localStorage.setItem('animeCharactersV4', JSON.stringify(state.characters)); }
function loadCharacters() {
    const savedChars = localStorage.getItem('animeCharactersV4');
    if (savedChars) {
        state.characters = JSON.parse(savedChars);
        renderButtons();
    }
}
function saveCorrections() { localStorage.setItem('userCorrectionsV4', JSON.stringify(state.corrections)); }
function loadCorrections() {
    const saved = localStorage.getItem('userCorrectionsV4');
    const defaultCorrections = { "สถานการ": "สถานการณ์", "3ารถ": "สามารถ" };
    state.corrections = saved ? JSON.parse(saved) : defaultCorrections;
    renderCorrections();
}
function loadApiKey() {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) {
        state.geminiApiKey = savedKey;
        console.log("Gemini API Key loaded.");
    }
    updateApiKeyStatus();
}

// --- Character Shortcut Functions ---
function renderButtons() {
    shortcutZone.innerHTML = '<h3>ปุ่มลัดตัวละคร</h3>';
    state.characters.forEach((char, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'char-btn-wrapper';
        wrapper.draggable = true;
        wrapper.dataset.index = index;
        wrapper.innerHTML = `<button class="btn char-btn">${char}</button><button class="delete-btn" title="ลบตัวละครนี้">&times;</button>`;
        wrapper.querySelector('.char-btn').onclick = () => insertCharacter(char);
        wrapper.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteCharacter(index); };
        shortcutZone.appendChild(wrapper);
    });
}
function addCharacter() {
    const newChar = charInput.value.trim();
    if (newChar && !state.characters.includes(newChar)) {
        state.characters.push(newChar);
        charInput.value = '';
        saveCharacters();
        renderButtons();
    }
}
function deleteCharacter(index) {
    state.characters.splice(index, 1);
    saveCharacters();
    renderButtons();
}
function insertCharacter(char) {
    const selectionStart = output.selectionStart;
    const selectionEnd = output.selectionEnd;
    const charText = `${char} `;
    output.value = output.value.substring(0, selectionStart) + charText + output.value.substring(selectionEnd);
    output.selectionStart = output.selectionEnd = selectionStart + charText.length;
    output.focus();
    output.dispatchEvent(new Event('input'));
}

// --- Dictionary Functions ---
function renderCorrections() {
    correctionList.innerHTML = '';
    for (const wrong in state.corrections) {
        const correct = state.corrections[wrong];
        const item = document.createElement('li');
        item.className = 'correction-item';
        item.innerHTML = `<span>'${wrong}' → '${correct}'</span><button class="delete-btn" title="ลบคำผิดนี้">&times;</button>`;
        item.querySelector('.delete-btn').onclick = () => deleteCorrection(wrong);
        correctionList.appendChild(item);
    }
}
function addCorrection() {
    const wrong = wrongWordInput.value.trim();
    const correct = correctWordInput.value.trim();
    if (wrong && correct) {
        state.corrections[wrong] = correct;
        wrongWordInput.value = '';
        correctWordInput.value = '';
        saveCorrections();
        renderCorrections();
    }
}
function deleteCorrection(wrongWord) {
    delete state.corrections[wrongWord];
    saveCorrections();
    renderCorrections();
}
function applyCorrections() {
    let text = output.value;
    let changesMade = [];
    for (const wrongWord in state.corrections) {
        const correctWord = state.corrections[wrongWord];
        const regex = new RegExp(wrongWord, "g");
        if (text.match(regex)) {
            const count = text.match(regex).length;
            text = text.replace(regex, correctWord);
            changesMade.push(`'${wrongWord}' → '${correctWord}' (${count} ครั้ง)`);
        }
    }
    if (changesMade.length > 0) {
        output.value = text;
        output.dispatchEvent(new Event('input'));
        showMessage("รายการที่แก้ไข:\n\n" + changesMade.join("\n"));
    } else {
        showMessage("ไม่พบคำผิดที่อยู่ในพจนานุกรมครับ");
    }
}

// --- Other Helper Functions ---
function updateApiKeyStatus() {
    if (state.geminiApiKey) {
        apiKeyStatus.textContent = "สถานะ: API Key ตั้งค่าแล้ว ✅";
        apiKeyStatus.className = "set";
    } else {
        apiKeyStatus.textContent = "สถานะ: ยังไม่ได้ตั้งค่า API Key ❌";
        apiKeyStatus.className = "unset";
    }
}

// --- Core Application Logic ---
function handleUndo() {
    if (state.historyIndex > 0) {
        loadState(state.historyIndex - 1);
        updateUndoRedoButtons();
        updateStats();
        saveContent();
    }
}
function handleRedo() {
    if (state.historyIndex < state.history.length - 1) {
        loadState(state.historyIndex + 1);
        updateUndoRedoButtons();
        updateStats();
        saveContent();
    }
}

// --- Event Listeners Setup ---
function addEventListeners() {
    themeToggle.onclick = () => toggleTheme(themeToggle);
    undoButton.onclick = handleUndo;
    redoButton.onclick = handleRedo;
    copyButton.onclick = () => { output.select(); document.execCommand('copy'); showMessage("คัดลอกข้อความทั้งหมดแล้วครับ!"); };
    clearButton.onclick = () => {
        showConfirm("คุณต้องการล้างข้อความทั้งหมดหรือไม่?", confirmed => {
            if (confirmed) {
                output.value = '';
                output.dispatchEvent(new Event('input'));
            }
        });
    };
    correctTextButton.onclick = applyCorrections;
    output.addEventListener('input', () => { updateStats(); saveContent(); saveState(); });
    output.addEventListener('paste', () => { setTimeout(saveState, 0); });
    fontSelector.onchange = () => { applySettings(fontSelector.value, state.currentFontSize); saveSettings(fontSelector.value, state.currentFontSize); };
    fontSizeUpBtn.onclick = () => { state.currentFontSize += 2; applySettings(fontSelector.value, state.currentFontSize); saveSettings(fontSelector.value, state.currentFontSize); };
    fontSizeDownBtn.onclick = () => { if (state.currentFontSize > 10) { state.currentFontSize -= 2; applySettings(fontSelector.value, state.currentFontSize); saveSettings(fontSelector.value, state.currentFontSize); } };
    addCharBtn.onclick = addCharacter;
    charInput.onkeyup = e => { if (e.key === "Enter") addCharacter(); };
    shortcutZone.addEventListener("dragstart", e => { state.draggedItem = e.target.closest('.char-btn-wrapper'); });
    shortcutZone.addEventListener("dragend", () => { if (!state.draggedItem) return; const newOrder = Array.from(shortcutZone.querySelectorAll(".char-btn")).map(btn => btn.textContent); state.characters = newOrder; saveCharacters(); renderButtons(); state.draggedItem = null; });
    shortcutZone.addEventListener("dragover", e => { e.preventDefault(); if (!state.draggedItem) return; const afterElement = [...shortcutZone.querySelectorAll('.char-btn-wrapper:not(.dragging)')].reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = e.clientX - box.left - box.width / 2; if (offset < 0 && offset > closest.offset) return { offset: offset, element: child }; else return closest; }, { offset: Number.NEGATIVE_INFINITY }).element; if (afterElement == null) { shortcutZone.appendChild(state.draggedItem); } else { shortcutZone.insertBefore(state.draggedItem, afterElement); } });
    addCorrectionBtn.onclick = addCorrection;
    saveApiKeyBtn.onclick = () => { const key = apiKeyInput.value.trim(); if (key) { localStorage.setItem('geminiApiKey', key); state.geminiApiKey = key; updateApiKeyStatus(); showMessage("API Key ถูกบันทึกแล้ว!"); } else { showMessage("กรุณาใส่ API Key ครับ"); } };
    proofreadButton.onclick = proofreadWithAI;
    rephraseButton.onclick = rephraseWithAI;
    titleButton.onclick = generateTitleWithAI;
    sendCustomPromptBtn.onclick = () => sendCustomPromptToAI(customAiPromptInput);
    clearAiHistoryBtn.onclick = () => { showConfirm("คุณต้องการล้างประวัติการตอบกลับ AI ทั้งหมดหรือไม่?", confirmed => { if (confirmed) { aiHistoryLog.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">ไม่มีประวัติการตอบกลับ AI</p>'; showMessage("ล้างประวัติการตอบกลับ AI แล้วครับ!"); } }); };
    reviewList.addEventListener('click', e => { if (e.target.classList.contains('action-btn')) { const item = e.target.closest('.review-item'); if (e.target.classList.contains('accept')) { item.dataset.status = 'accepted'; item.classList.remove('rejected'); } else if (e.target.classList.contains('reject')) { item.dataset.status = 'rejected'; item.classList.add('rejected'); } } });
    applyChangesBtn.onclick = applyAiChanges;
    cancelReviewBtn.onclick = () => { reviewModalOverlay.style.display = 'none'; };
    loadYoutubePlaylistBtn.onclick = () => loadPlaylist(youtubePlaylistInput);
    playSingleSongBtn.onclick = () => playSingleSong(youtubeSingleSearchInput);
    prevSongBtn.onclick = () => { if (state.player && typeof state.player.previousVideo === 'function') state.player.previousVideo(); };
    playPauseBtn.onclick = () => { if (state.player && typeof state.player.getPlayerState === 'function') { const playerState = state.player.getPlayerState(); if (playerState === YT.PlayerState.PLAYING) state.player.pauseVideo(); else state.player.playVideo(); } };
    nextSongBtn.onclick = () => { if (state.player && typeof state.player.nextVideo === 'function') state.player.nextVideo(); };
    shufflePlaylistBtn.onclick = () => { if (state.player && typeof state.player.setShuffle === 'function') { const currentShuffle = state.player.getShuffle(); state.player.setShuffle(!currentShuffle); showMessage(`โหมดสุ่ม: ${!currentShuffle ? 'เปิด' : 'ปิด'}`); } };
    messageOkBtn.onclick = () => { messageModalOverlay.style.display = 'none'; };
    confirmYesBtn.onclick = () => { if (state.confirmCallback) state.confirmCallback(true); confirmModalOverlay.style.display = 'none'; };
    confirmNoBtn.onclick = () => { if (state.confirmCallback) state.confirmCallback(false); confirmModalOverlay.style.display = 'none'; };
}

// --- Initialization ---
function initializeApp() {
    loadContent();
    loadCharacters();
    loadSettings();
    loadCorrections();
    loadApiKey();
    updateStats();
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) { document.documentElement.setAttribute('data-theme', currentTheme); if (currentTheme === 'dark') themeToggle.textContent = '☀️'; }
    addEventListeners();
    setupSpeechRecognition();
    loadYouTubeIframeAPI();
    updateUndoRedoButtons();
    console.log("Application Initialized Successfully!");
}

// --- Start Application ---
initializeApp();
