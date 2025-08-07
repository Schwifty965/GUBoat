// --- DOM Element Selections ---
// ไฟล์นี้ทำหน้าที่เลือก DOM elements ทั้งหมดที่ต้องใช้ในโปรแกรม
// แล้ว export ออกไปให้ไฟล์อื่นเรียกใช้
export const themeToggle = document.getElementById('theme-toggle');
export const toggleButton = document.getElementById('toggleButton');
export const output = document.getElementById('output');
export const undoButton = document.getElementById('undoButton');
export const redoButton = document.getElementById('redoButton');
export const clearButton = document.getElementById('clearButton');
export const copyButton = document.getElementById('copyButton');
export const correctTextButton = document.getElementById('correctTextButton');
export const wrongWordInput = document.getElementById('wrong-word-input');
export const correctWordInput = document.getElementById('correct-word-input');
export const addCorrectionBtn = document.getElementById('add-correction-btn');
export const correctionList = document.getElementById('correction-list');
export const charInput = document.getElementById('character-input');
export const addCharBtn = document.getElementById('add-char-btn');
export const shortcutZone = document.getElementById('shortcut-zone');
export const wordCountEl = document.getElementById('word-count');
export const charCountEl = document.getElementById('char-count');
export const fontSelector = document.getElementById('font-selector');
export const fontSizeDownBtn = document.getElementById('font-size-down');
export const fontSizeUpBtn = document.getElementById('font-size-up');
export const fontSizeDisplay = document.getElementById('font-size-display');
export const loadingOverlay = document.getElementById('loading-overlay');
export const apiKeyInput = document.getElementById('api-key-input');
export const saveApiKeyBtn = document.getElementById('save-api-key-btn');
export const proofreadButton = document.getElementById('proofreadButton');
export const rephraseButton = document.getElementById('rephraseButton');
export const titleButton = document.getElementById('titleButton');
export const reviewModalOverlay = document.getElementById('review-modal-overlay');
export const reviewList = document.getElementById('review-list');
export const applyChangesBtn = document.getElementById('apply-changes-btn');
export const cancelReviewBtn = document.getElementById('cancel-review-btn');
export const customAiPromptInput = document.getElementById('custom-ai-prompt-input');
export const sendCustomPromptBtn = document.getElementById('send-custom-prompt-btn');
export const aiHistoryLog = document.getElementById('ai-history-log');
export const clearAiHistoryBtn = document.getElementById('clear-ai-history-btn');
export const youtubePlaylistInput = document.getElementById('youtube-playlist-input');
export const loadYoutubePlaylistBtn = document.getElementById('load-youtube-playlist-btn');
export const youtubePlayerContainer = document.getElementById('youtube-player-container');
export const prevSongBtn = document.getElementById('prev-song-btn');
export const playPauseBtn = document.getElementById('play-pause-btn');
export const nextSongBtn = document.getElementById('next-song-btn');
export const shufflePlaylistBtn = document.getElementById('shuffle-playlist-btn');
export const youtubeSingleSearchInput = document.getElementById('youtube-single-search-input');
export const playSingleSongBtn = document.getElementById('play-single-song-btn');
export const youtubeQueueList = document.getElementById('youtube-queue-list');
export const apiKeyStatus = document.getElementById('api-key-status');
export const messageModalOverlay = document.getElementById('message-modal-overlay');
export const messageContent = document.getElementById('message-content');
export const messageOkBtn = document.getElementById('message-ok-btn');
export const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
export const confirmContent = document.getElementById('confirm-content');
export const confirmYesBtn = document.getElementById('confirm-yes-btn');
export const confirmNoBtn = document.getElementById('confirm-no-btn');

// --- Application State ---
// รวม state ทั้งหมดของแอปไว้ใน object เดียวเพื่อง่ายต่อการจัดการ
export const state = {
    characters: [],
    corrections: {},
    draggedItem: null,
    geminiApiKey: '',
    currentFontSize: 18,
    history: [''], // เริ่มต้นด้วยค่าว่างสำหรับสถานะแรก
    historyIndex: 0,
    MAX_HISTORY_SIZE: 100,
    confirmCallback: null,
    player: null, // ตัวแปรสำหรับ YouTube Player
};
