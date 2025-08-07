import { state, youtubePlayerContainer, youtubeQueueList, playPauseBtn } from './config.js';
import { showMessage, showLoadingOverlay, hideLoadingOverlay } from './ui.js'; // เพิ่ม showLoadingOverlay, hideLoadingOverlay
import { getYoutubeApiKey } from './main.js'; // จะต้อง export getYoutubeApiKey จาก main.js

// ตัวแปรสำหรับจัดการสถานะเพลย์ลิสต์
let currentPlaylistVideos = []; // เก็บ [{id: videoId, title: videoTitle}]
let currentPlaylistIndex = -1;
let isShuffleMode = false; // สถานะโหมดสุ่ม

// Elements for player controls and status
const prevSongBtn = document.getElementById('prev-song-btn');
const nextSongBtn = document.getElementById('next-song-btn');
const shufflePlaylistBtn = document.getElementById('shuffle-playlist-btn');
const shuffleStatusSpan = document.getElementById('shuffle-status');
const clearAllSavedPlaylistsBtn = document.getElementById('clear-all-saved-playlists-btn');
const savedPlaylistsList = document.getElementById('saved-playlists-list');

// Constants for Local Storage
const YOUTUBE_PLAYLIST_URL_KEY = 'youtubePlaylistUrl';
const SAVED_PLAYLISTS_KEY = 'savedYoutubePlaylists';

function getPlaylistIdFromUrl(url) {
    try {
        const urlParams = new URLSearchParams(new URL(url).search);
        return urlParams.get('list');
    } catch (e) {
        return null;
    }
}

function getVideoIdFromUrl(url) {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return videoIdMatch && videoIdMatch[1] ? videoIdMatch[1] : null;
}

export function loadYouTubeIframeAPI() {
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        window.onYouTubeIframeAPIReady();
    }
}

window.onYouTubeIframeAPIReady = function() {
    // Initial load will now rely on saved playlists or direct URL load
    const savedUrl = localStorage.getItem(YOUTUBE_PLAYLIST_URL_KEY);
    if (savedUrl) {
        const playlistId = getPlaylistIdFromUrl(savedUrl);
        const videoId = getVideoIdFromUrl(savedUrl);
        if (playlistId) {
            loadAndDisplayPlaylist(playlistId, true); // Load and play playlist
        } else if (videoId) {
            createYouTubePlayer({ 'videoId': videoId });
        } else {
            showInitialPlayerMessage();
        }
    } else {
        showInitialPlayerMessage();
    }
    updateShuffleStatusDisplay(); // แสดงสถานะสุ่มเมื่อโหลดหน้าเว็บ
    renderSavedPlaylists(); // โหลดเพลย์ลิสต์ที่บันทึกไว้
};

function showInitialPlayerMessage() {
    youtubePlayerContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">กรุณาโหลดเพลย์ลิสต์หรือค้นหาเพลง</p>';
}

function createYouTubePlayer(playerOptions) {
    if (state.player) {
        state.player.destroy();
    }
    youtubePlayerContainer.innerHTML = '';
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-iframe-player';
    youtubePlayerContainer.appendChild(playerDiv);

    const defaultVars = { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 };
    
    state.player = new YT.Player('youtube-iframe-player', {
        height: '100%',
        width: '100%',
        playerVars: { ...defaultVars, ...playerOptions },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
    showMessage("เพลย์ลิสต์/เพลง YouTube โหลดและเริ่มเล่นแล้วครับ!");
    updatePlayPauseButton();
    // updateYoutubeQueueList(); // Call after loadAndDisplayPlaylist has populated currentPlaylistVideos
}

function onPlayerStateChange(event) {
    updatePlayPauseButton();
    if (event.data === YT.PlayerState.ENDED) {
        playNextSong(); // เล่นเพลงถัดไปเมื่อเพลงจบ
    }
    updateCurrentPlayingStatus(state.player.getPlaylistIndex ? state.player.getPlaylistIndex() : 0);
}

function onPlayerError(event) {
    let errorMessage = "เกิดข้อผิดพลาดกับ YouTube Player: ";
    switch (event.data) {
        case 2:
            errorMessage += "ID วิดีโอไม่ถูกต้องหรือวิดีโอถูกลบ/ไม่พร้อมใช้งาน";
            break;
        case 5:
            errorMessage += "เกิดข้อผิดพลาดกับ HTML5 player";
            break;
        case 100:
            errorMessage += "ไม่พบวิดีโอ (อาจถูกลบหรือตั้งค่าส่วนตัว)";
            break;
        case 101:
        case 150:
            errorMessage += "ไม่สามารถเล่นวิดีโอในแบบฝังได้เนื่องจากข้อจำกัดด้านลิขสิทธิ์หรือความเป็นส่วนตัว";
            break;
        default:
            errorMessage += "ข้อผิดพลาดที่ไม่ทราบสาเหตุ";
            break;
    }
    showMessage(errorMessage);
    console.error("YouTube Player Error:", event.data);
    showInitialPlayerMessage();
}

function updatePlayPauseButton() {
    if (state.player && typeof state.player.getPlayerState === 'function') {
        const playerState = state.player.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.BUFFERING) {
            playPauseBtn.textContent = '⏸️ หยุด';
        } else {
            playPauseBtn.textContent = '▶️ เล่น';
        }
    }
}

// ----------------------------------------------------
// ✨ New Feature: YouTube Playlist & Queue Management
// ----------------------------------------------------

// Function to fetch playlist items with titles using YouTube Data API
async function fetchPlaylistItems(playlistId) {
    const youtubeApiKey = getYoutubeApiKey(); // รับ API Key จาก main.js
    if (!youtubeApiKey) {
        showMessage('กรุณาตั้งค่า YouTube Data API Key ก่อนใช้งานฟังก์ชันเพลย์ลิสต์');
        return [];
    }

    showLoadingOverlay('กำลังโหลดเพลย์ลิสต์ YouTube...');
    try {
        let allVideos = [];
        let nextPageToken = null;

        do {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${youtubeApiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'เกิดข้อผิดพลาดในการโหลดเพลย์ลิสต์ YouTube');
            }

            allVideos = allVideos.concat(data.items);
            nextPageToken = data.nextPageToken;

        } while (nextPageToken);

        return allVideos.map(item => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.default ? item.snippet.thumbnails.default.url : ''
        }));
    } catch (error) {
        console.error('Error fetching YouTube playlist items:', error);
        showMessage(`ข้อผิดพลาดในการโหลดเพลย์ลิสต์: ${error.message}`);
        return [];
    } finally {
        hideLoadingOverlay();
    }
}

// Function to load and display a YouTube playlist
export async function loadAndDisplayPlaylist(playlistUrlOrId, isInitialLoad = false) {
    let playlistId = playlistUrlOrId;
    if (playlistUrlOrId.startsWith('http')) {
        playlistId = getPlaylistIdFromUrl(playlistUrlOrId);
    }
    
    if (!playlistId) {
        showMessage("URL เพลย์ลิสต์ YouTube ไม่ถูกต้องหรือไม่พบ ID เพลย์ลิสต์ครับ");
        return;
    }

    const videos = await fetchPlaylistItems(playlistId);
    if (videos.length === 0) {
        youtubeQueueList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">ไม่พบวิดีโอในเพลย์ลิสต์นี้</p>';
        currentPlaylistVideos = [];
        currentPlaylistIndex = -1;
        return;
    }

    currentPlaylistVideos = videos;
    currentPlaylistIndex = 0; // Start with the first video
    localStorage.setItem(YOUTUBE_PLAYLIST_URL_KEY, playlistUrlOrId); // Save the URL for next load

    renderPlaylistQueue();
    createYouTubePlayer({ 'listType': 'playlist', 'list': playlistId, 'index': 0 }); // Play the first video in the playlist
    updateCurrentPlayingStatus(0); // Highlight first song
}

// Function to render the playlist queue in the UI
function renderPlaylistQueue() {
    youtubeQueueList.innerHTML = ''; // Clear existing queue

    if (currentPlaylistVideos.length === 0) {
        youtubeQueueList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">ไม่มีเพลย์ลิสต์ที่โหลดอยู่</p>';
        return;
    }

    currentPlaylistVideos.forEach((video, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('youtube-queue-item');
        itemDiv.dataset.index = index;
        itemDiv.innerHTML = `
            <span class="index">${index + 1}.</span> 
            <span>${video.title}</span>
        `;
        itemDiv.addEventListener('click', () => {
            state.player.playVideoAt(index);
            currentPlaylistIndex = index;
            updateCurrentPlayingStatus(index);
        });
        youtubeQueueList.appendChild(itemDiv);
    });
    updateCurrentPlayingStatus(currentPlaylistIndex); // Ensure current song is highlighted after rendering
}

// Function to update the 'current-playing' status in the queue
function updateCurrentPlayingStatus(currentIndex) {
    const items = youtubeQueueList.querySelectorAll('.youtube-queue-item');
    items.forEach((item, index) => {
        if (index === currentIndex) {
            item.classList.add('current-playing');
            // Scroll into view if not already visible
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('current-playing');
        }
    });
}

// Player controls functions
export function playPrevSong() {
    if (currentPlaylistVideos.length === 0) return;

    if (isShuffleMode) {
        playRandomSong();
    } else {
        currentPlaylistIndex = (currentPlaylistIndex - 1 + currentPlaylistVideos.length) % currentPlaylistVideos.length;
        state.player.playVideoAt(currentPlaylistIndex);
        updateCurrentPlayingStatus(currentPlaylistIndex);
    }
}

export function playNextSong() {
    if (currentPlaylistVideos.length === 0) return;

    if (isShuffleMode) {
        playRandomSong();
    } else {
        currentPlaylistIndex = (currentPlaylistIndex + 1) % currentPlaylistVideos.length;
        state.player.playVideoAt(currentPlaylistIndex);
        updateCurrentPlayingStatus(currentPlaylistIndex);
    }
}

export function togglePlayPause() {
    if (!state.player) return;
    const playerState = state.player.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.BUFFERING) {
        state.player.pauseVideo();
    } else {
        state.player.playVideo();
    }
}

// Shuffle mode functions
export function toggleShuffleMode() {
    isShuffleMode = !isShuffleMode;
    updateShuffleStatusDisplay();
    showMessage(`โหมดสุ่ม: ${isShuffleMode ? 'เปิด' : 'ปิด'}`);
    if (isShuffleMode && currentPlaylistVideos.length > 0) {
        playRandomSong(); // Play a random song immediately if shuffling is turned on and a playlist is loaded
    }
}

function updateShuffleStatusDisplay() {
    if (shuffleStatusSpan) {
        shuffleStatusSpan.textContent = isShuffleMode ? ' (สุ่ม: เปิด)' : ' (สุ่ม: ปิด)';
    }
}

function playRandomSong() {
    if (currentPlaylistVideos.length === 0) return;
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * currentPlaylistVideos.length);
    } while (randomIndex === currentPlaylistIndex && currentPlaylistVideos.length > 1); // Ensure different song if more than 1
    currentPlaylistIndex = randomIndex;
    state.player.playVideoAt(currentPlaylistIndex);
    updateCurrentPlayingStatus(currentPlaylistIndex);
}

// Single song play export for main.js
export function playSingleSong(youtubeSingleSearchInput) {
    const searchTerm = youtubeSingleSearchInput.value.trim();
    if (!searchTerm) {
        showMessage("กรุณาวาง URL วิดีโอ YouTube ครับ");
        return;
    }
    const videoId = getVideoIdFromUrl(searchTerm);
    if (videoId) {
        currentPlaylistVideos = [{ id: videoId, title: 'เพลงเดี่ยว' }]; // Clear playlist and set as single song
        currentPlaylistIndex = 0;
        youtubeQueueList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">กำลังเล่นเพลงเดี่ยว...</p>';
        createYouTubePlayer({ 'videoId': videoId });
        localStorage.setItem(YOUTUBE_PLAYLIST_URL_KEY, searchTerm);
    } else {
        showMessage("URL วิดีโอ YouTube ไม่ถูกต้องครับ");
    }
}

// ----------------------------------------------------
// ✨ New Feature: Saved Playlists Management
// ----------------------------------------------------

function getSavedPlaylists() {
    const savedPlaylists = localStorage.getItem(SAVED_PLAYLISTS_KEY);
    return savedPlaylists ? JSON.parse(savedPlaylists) : [];
}

function setSavedPlaylists(playlists) {
    localStorage.setItem(SAVED_PLAYLISTS_KEY, JSON.stringify(playlists));
}

export async function addSavedPlaylist(playlistUrlInput) {
    const playlistUrl = playlistUrlInput.value.trim();
    if (!playlistUrl) {
        showMessage('กรุณาวาง URL เพลย์ลิสต์ YouTube ที่นี่เพื่อบันทึก');
        return;
    }

    const playlistId = getPlaylistIdFromUrl(playlistUrl);
    if (!playlistId) {
        showMessage('URL เพลย์ลิสต์ไม่ถูกต้อง หรือไม่สามารถดึง ID เพลย์ลิสต์ได้');
        return;
    }

    const savedPlaylists = getSavedPlaylists();
    if (savedPlaylists.some(p => p.id === playlistId)) {
        showMessage('เพลย์ลิสต์นี้ถูกบันทึกไว้แล้ว');
        return;
    }

    showLoadingOverlay('กำลังบันทึกเพลย์ลิสต์...');
    try {
        // Fetch playlist title from YouTube Data API
        const youtubeApiKey = getYoutubeApiKey();
        if (!youtubeApiKey) {
            showMessage('กรุณาตั้งค่า YouTube Data API Key ก่อนบันทึกเพลย์ลิสต์');
            return;
        }

        const response = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${youtubeApiKey}`);
        const data = await response.json();

        if (data.error || data.items.length === 0) {
            throw new Error(data.error ? data.error.message : 'ไม่พบข้อมูลเพลย์ลิสต์สำหรับ ID นี้');
        }

        const playlistTitle = data.items[0].snippet.title;

        savedPlaylists.push({ id: playlistId, url: playlistUrl, title: playlistTitle });
        setSavedPlaylists(savedPlaylists);
        renderSavedPlaylists();
        showMessage(`บันทึกเพลย์ลิสต์ "${playlistTitle}" แล้ว`);
    } catch (error) {
        console.error('Error saving YouTube playlist:', error);
        showMessage(`ข้อผิดพลาดในการบันทึกเพลย์ลิสต์: ${error.message}`);
    } finally {
        hideLoadingOverlay();
    }
}

export function deleteSavedPlaylist(playlistId) {
    let savedPlaylists = getSavedPlaylists();
    savedPlaylists = savedPlaylists.filter(p => p.id !== playlistId);
    setSavedPlaylists(savedPlaylists);
    renderSavedPlaylists();
    showMessage('ลบเพลย์ลิสต์ที่บันทึกไว้แล้ว');
}

export function clearAllSavedPlaylists() {
    if (confirm('คุณแน่ใจหรือไม่ที่ต้องการล้างเพลย์ลิสต์ที่บันทึกทั้งหมด?')) {
        localStorage.removeItem(SAVED_PLAYLISTS_KEY);
        renderSavedPlaylists();
        showMessage('ล้างเพลย์ลิสต์ที่บันทึกไว้ทั้งหมดแล้ว');
    }
}

export function renderSavedPlaylists() {
    savedPlaylistsList.innerHTML = '';
    const playlists = getSavedPlaylists();

    if (playlists.length === 0) {
        savedPlaylistsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">ยังไม่มีเพลย์ลิสต์ที่บันทึกไว้</p>';
        return;
    }

    playlists.forEach(playlist => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('saved-playlist-item');
        itemDiv.innerHTML = `
            <span class="title">${playlist.title}</span>
            <div class="actions">
                <button class="btn play-saved-playlist-btn" data-playlist-id="${playlist.id}">▶️ เล่น</button>
                <button class="btn delete-saved-playlist-btn" data-playlist-id="${playlist.id}">🗑️ ลบ</button>
            </div>
        `;
        savedPlaylistsList.appendChild(itemDiv);
    });

    // Add event listeners after elements are rendered
    savedPlaylistsList.querySelectorAll('.play-saved-playlist-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const playlistId = event.target.dataset.playlistId;
            loadAndDisplayPlaylist(playlistId);
        });
    });

    savedPlaylistsList.querySelectorAll('.delete-saved-playlist-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const playlistId = event.target.dataset.playlistId;
            deleteSavedPlaylist(playlistId);
        });
    });
}

// ----------------------------------------------------
// Event Listeners (ensure they are attached once)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for player controls
    if (prevSongBtn) {
        prevSongBtn.addEventListener('click', playPrevSong);
    }
    if (nextSongBtn) {
        nextSongBtn.addEventListener('click', playNextSong);
    }
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
    if (shufflePlaylistBtn) {
        shufflePlaylistBtn.addEventListener('click', toggleShuffleMode);
    }
    if (clearAllSavedPlaylistsBtn) {
        clearAllSavedPlaylistsBtn.addEventListener('click', clearAllSavedPlaylists);
    }
});
