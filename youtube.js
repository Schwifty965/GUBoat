import { state, youtubePlayerContainer, youtubeQueueList, playPauseBtn } from './config.js';
import { showMessage } from './ui.js';

let currentPlaylistForQueue = [];
let currentPlaylistIndexForQueue = -1;

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
    const savedUrl = localStorage.getItem('youtubePlaylistUrl');
    if (savedUrl) {
        const playlistId = getPlaylistIdFromUrl(savedUrl);
        const videoId = getVideoIdFromUrl(savedUrl);
        if (playlistId) {
            createYouTubePlayer({ 'listType': 'playlist', 'list': playlistId });
        } else if (videoId) {
            createYouTubePlayer({ 'videoId': videoId });
        } else {
            showInitialPlayerMessage();
        }
    } else {
        showInitialPlayerMessage();
    }
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
    updateYoutubeQueueList();
}

function onPlayerStateChange(event) {
    updatePlayPauseButton();
    if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.ENDED) {
        updateYoutubeQueueList();
    }
}

function onPlayerError(event) {
    let errorMessage = "เกิดข้อผิดพลาดกับ YouTube Player: ";
    // ... (error handling logic remains the same)
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

export function loadPlaylist(youtubePlaylistInput) {
    const url = youtubePlaylistInput.value.trim();
    if (!url) return showMessage("กรุณาวาง URL เพลย์ลิสต์ YouTube ก่อนครับ");
    const playlistId = getPlaylistIdFromUrl(url);
    if (playlistId) {
        createYouTubePlayer({ 'listType': 'playlist', 'list': playlistId });
        localStorage.setItem('youtubePlaylistUrl', url);
    } else {
        showMessage("URL เพลย์ลิสต์ YouTube ไม่ถูกต้องหรือไม่พบ ID เพลย์ลิสต์ครับ");
    }
}

export function playSingleSong(youtubeSingleSearchInput) {
    const searchTerm = youtubeSingleSearchInput.value.trim();
    if (!searchTerm) return showMessage("กรุณาวาง URL วิดีโอ YouTube หรือพิมพ์ชื่อเพลงที่ต้องการค้นหาครับ");
    const videoId = getVideoIdFromUrl(searchTerm);
    if (videoId) {
        createYouTubePlayer({ 'videoId': videoId });
        localStorage.setItem('youtubePlaylistUrl', searchTerm);
    } else {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
        window.open(searchUrl, '_blank');
        showMessage("ไม่สามารถเล่นเพลงเดี่ยวจากชื่อเพลงโดยตรงได้ครับ กรุณาวาง URL วิดีโอ YouTube หรือค้นหาในแท็บใหม่แล้วคัดลอก URL มาวางครับ");
    }
}

function updateYoutubeQueueList() {
    youtubeQueueList.innerHTML = '';
    if (state.player && typeof state.player.getPlaylist === 'function' && state.player.getPlaylist()) {
        const playlist = state.player.getPlaylist();
        const currentIndex = state.player.getPlaylistIndex();
        if (playlist.length > 0) {
            playlist.forEach((videoId, index) => {
                const listItem = document.createElement('div');
                listItem.className = 'youtube-queue-item';
                if (index === currentIndex) {
                    listItem.classList.add('current-playing');
                }
                listItem.dataset.index = index;
                // Note: Getting video titles requires YouTube Data API, which is complex.
                // We'll just show Video IDs for now.
                listItem.innerHTML = `<span class="index">${index + 1}.</span> <span>Video ID: ${videoId}</span>`;
                listItem.onclick = () => {
                    state.player.playVideoAt(parseInt(listItem.dataset.index));
                };
                youtubeQueueList.appendChild(listItem);
            });
            const currentItem = youtubeQueueList.querySelector('.current-playing');
            if (currentItem) {
                currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            showQueueEmptyMessage();
        }
    } else {
        showQueueEmptyMessage();
    }
}

function showQueueEmptyMessage() {
     youtubeQueueList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">ไม่มีเพลย์ลิสต์ที่โหลดอยู่</p>';
}
