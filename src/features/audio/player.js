/**
 * @fileoverview Fast native audio player with optional queued playback.
 */

import * as Utils from '../../shared/utils.js';
import * as DocumentStore from '../documents/store.js';
import { isAudioDocument } from './types.js';

const PLAYLIST_ENABLED_KEY = 'invisibleSupport.audioPlaylistEnabled';
const LOOP_MODE_KEY = 'invisibleSupport.audioLoopMode';
const LOOP_MODES = new Set(['off', 'track', 'playlist']);

let initialized = false;
let audio = null;
let emptyState = null;
let activeState = null;
let titleEl = null;
let filenameEl = null;
let detailEl = null;
let statusEl = null;
let previousButton = null;
let nextButton = null;
let loopSelect = null;
let playlistToggle = null;
let queuePanel = null;
let queueList = null;
let queueEmpty = null;
let queueCount = null;
let queueClear = null;

let tracks = [];
let queueIds = [];
let currentId = null;
let playlistEnabled = loadBoolean(PLAYLIST_ENABLED_KEY, false);
let loopMode = loadLoopMode();

function loadBoolean(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value === 'true';
    } catch {
        return fallback;
    }
}

function loadLoopMode() {
    try {
        const value = localStorage.getItem(LOOP_MODE_KEY) || 'off';
        return LOOP_MODES.has(value) ? value : 'off';
    } catch {
        return 'off';
    }
}

function persistPreference(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        // Playback remains functional when localStorage is unavailable.
    }
}

function getTrack(id) {
    return tracks.find(track => track.id === id) || null;
}

function getSource(track) {
    return track?.blobUrl || track?.downloadUrl || '';
}

function emitSelectionChange() {
    document.dispatchEvent(new CustomEvent('audioplayerchange', { detail: { id: currentId } }));
}

function emitPlaylistChange() {
    document.dispatchEvent(new CustomEvent('audioplaylistchange', {
        detail: { enabled: playlistEnabled, queueIds: [...queueIds] },
    }));
}

function setStatus(message, state = 'idle') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
}

function updateTrackDetails(track) {
    if (titleEl) titleEl.textContent = track?.title || track?.name || '—';
    if (filenameEl) filenameEl.textContent = track?.name || '—';
    if (detailEl) {
        const parts = [track?.type || 'Audio', Utils.formatBytes(track?.size)].filter(value => value && value !== '—');
        detailEl.textContent = parts.join(' • ') || '—';
    }
}

function getPlaybackOrder() {
    const ids = playlistEnabled ? queueIds : tracks.map(track => track.id);
    return ids.filter(id => Boolean(getTrack(id)));
}

function updateTransport() {
    const order = getPlaybackOrder();
    const index = order.indexOf(currentId);
    const wraps = playlistEnabled && loopMode === 'playlist' && order.length > 0;
    if (previousButton) previousButton.disabled = !currentId || order.length === 0 || (!wraps && index <= 0);
    if (nextButton) nextButton.disabled = !currentId || order.length === 0 || (!wraps && index >= order.length - 1);
    if (playlistToggle) playlistToggle.checked = playlistEnabled;
    if (loopSelect) loopSelect.value = loopMode;
    const playlistOption = loopSelect?.querySelector('option[value="playlist"]');
    if (playlistOption) playlistOption.disabled = !playlistEnabled;
    if (queuePanel) queuePanel.hidden = !playlistEnabled;
    if (queueClear) queueClear.disabled = queueIds.length === 0;
    if (queueCount) queueCount.textContent = `${queueIds.length} queued`;
}

function renderQueue() {
    if (!queueList) {
        updateTransport();
        return;
    }

    queueList.textContent = '';
    const validIds = queueIds.filter(id => Boolean(getTrack(id)));
    if (queueEmpty) queueEmpty.hidden = validIds.length > 0;

    validIds.forEach((id, index) => {
        const track = getTrack(id);
        if (!track) return;

        const item = document.createElement('li');
        item.className = 'audio-queue__item';
        item.dataset.id = id;
        item.classList.toggle('is-current', id === currentId);

        const number = document.createElement('span');
        number.className = 'audio-queue__number';
        number.textContent = String(index + 1).padStart(2, '0');

        const name = document.createElement('button');
        name.type = 'button';
        name.className = 'audio-queue__track';
        name.textContent = track.title || track.name;
        name.setAttribute('aria-label', `Play ${track.title || track.name}`);
        name.addEventListener('click', () => playTrack(id));

        const actions = document.createElement('div');
        actions.className = 'audio-queue__actions';

        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'audio-queue__action';
        up.textContent = '↑';
        up.disabled = index === 0;
        up.setAttribute('aria-label', `Move ${track.title || track.name} earlier`);
        up.addEventListener('click', () => moveQueueItem(id, -1));

        const down = document.createElement('button');
        down.type = 'button';
        down.className = 'audio-queue__action';
        down.textContent = '↓';
        down.disabled = index === validIds.length - 1;
        down.setAttribute('aria-label', `Move ${track.title || track.name} later`);
        down.addEventListener('click', () => moveQueueItem(id, 1));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'audio-queue__action audio-queue__action--remove';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${track.title || track.name} from playlist`);
        remove.addEventListener('click', () => removeFromQueue(id));

        actions.append(up, down, remove);
        item.append(number, name, actions);
        queueList.appendChild(item);
    });

    updateTransport();
}

function renderEmpty() {
    currentId = null;
    if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.removeAttribute('data-track-id');
        audio.load();
    }
    if (emptyState) emptyState.hidden = false;
    if (activeState) activeState.hidden = true;
    updateTrackDetails(null);
    setStatus('Waiting for a track', 'idle');
    renderQueue();
    emitSelectionChange();
}

function setLoopMode(nextMode) {
    const normalized = LOOP_MODES.has(nextMode) ? nextMode : 'off';
    loopMode = normalized === 'playlist' && !playlistEnabled ? 'off' : normalized;
    if (audio) audio.loop = loopMode === 'track';
    persistPreference(LOOP_MODE_KEY, loopMode);
    updateTransport();
}

function setPlaylistEnabled(enabled) {
    playlistEnabled = Boolean(enabled);
    if (playlistEnabled && currentId && !queueIds.includes(currentId)) queueIds.push(currentId);
    if (!playlistEnabled && loopMode === 'playlist') setLoopMode('off');
    persistPreference(PLAYLIST_ENABLED_KEY, playlistEnabled);
    renderQueue();
    emitPlaylistChange();
}

function advance(direction, fromEnded = false) {
    const order = getPlaybackOrder();
    if (order.length === 0) return false;

    if (direction < 0 && !fromEnded && audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return true;
    }

    const index = order.indexOf(currentId);
    let nextIndex = index + direction;
    const canWrap = playlistEnabled && loopMode === 'playlist';
    if (index < 0) nextIndex = direction > 0 ? 0 : order.length - 1;
    if (nextIndex < 0 || nextIndex >= order.length) {
        if (!canWrap) {
            if (fromEnded) setStatus('Playlist complete', 'idle');
            updateTransport();
            return false;
        }
        nextIndex = nextIndex < 0 ? order.length - 1 : 0;
    }

    playTrack(order[nextIndex]);
    return true;
}

function moveQueueItem(id, offset) {
    const from = queueIds.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= queueIds.length) return;
    [queueIds[from], queueIds[to]] = [queueIds[to], queueIds[from]];
    renderQueue();
    emitPlaylistChange();
}

export function enqueue(id) {
    if (!playlistEnabled || !getTrack(id)) return false;
    if (!queueIds.includes(id)) queueIds.push(id);
    renderQueue();
    emitPlaylistChange();
    return true;
}

export function removeFromQueue(id) {
    queueIds = queueIds.filter(queueId => queueId !== id);
    renderQueue();
    emitPlaylistChange();
}

export function clearQueue() {
    queueIds = [];
    renderQueue();
    emitPlaylistChange();
}

export function playTrack(id, { autoplay = true } = {}) {
    const track = getTrack(id);
    if (!track) {
        renderEmpty();
        return false;
    }

    const source = getSource(track);
    currentId = track.id;
    if (playlistEnabled && !queueIds.includes(track.id)) queueIds.push(track.id);
    if (emptyState) emptyState.hidden = true;
    if (activeState) activeState.hidden = false;
    updateTrackDetails(track);

    if (audio && audio.dataset.trackId !== track.id) {
        if (source) {
            audio.src = source;
            audio.dataset.trackId = track.id;
        } else {
            audio.removeAttribute('src');
            audio.removeAttribute('data-track-id');
        }
        audio.load();
    }

    if (!source) {
        setStatus('Audio source unavailable', 'error');
    } else if (autoplay && audio) {
        setStatus('Loading…', 'loading');
        audio.play().catch(error => {
            if (error?.name !== 'AbortError') setStatus('Ready — press Play', 'idle');
        });
    } else {
        setStatus('Ready', 'idle');
    }

    renderQueue();
    emitSelectionChange();
    emitPlaylistChange();
    return true;
}

export function init() {
    if (initialized) return;
    audio = document.querySelector('[data-audio-element]');
    emptyState = document.querySelector('[data-audio-player-empty]');
    activeState = document.querySelector('[data-audio-player-active]');
    titleEl = document.querySelector('[data-audio-title]');
    filenameEl = document.querySelector('[data-audio-filename]');
    detailEl = document.querySelector('[data-audio-detail]');
    statusEl = document.querySelector('[data-audio-status]');
    previousButton = document.querySelector('[data-audio-previous]');
    nextButton = document.querySelector('[data-audio-next]');
    loopSelect = document.querySelector('[data-audio-loop]');
    playlistToggle = document.querySelector('[data-audio-playlist-enabled]');
    queuePanel = document.querySelector('[data-audio-queue]');
    queueList = document.querySelector('[data-audio-queue-list]');
    queueEmpty = document.querySelector('[data-audio-queue-empty]');
    queueCount = document.querySelector('[data-audio-queue-count]');
    queueClear = document.querySelector('[data-audio-queue-clear]');

    previousButton?.addEventListener('click', () => advance(-1));
    nextButton?.addEventListener('click', () => advance(1));
    loopSelect?.addEventListener('change', event => setLoopMode(event.target.value));
    playlistToggle?.addEventListener('change', event => setPlaylistEnabled(event.target.checked));
    queueClear?.addEventListener('click', clearQueue);

    audio?.addEventListener('playing', () => setStatus('Playing', 'playing'));
    audio?.addEventListener('pause', () => {
        if (audio?.ended) return;
        setStatus('Paused', 'idle');
    });
    audio?.addEventListener('waiting', () => setStatus('Buffering…', 'loading'));
    audio?.addEventListener('error', () => setStatus('Unable to play this audio source', 'error'));
    audio?.addEventListener('ended', () => {
        if (!playlistEnabled || !advance(1, true)) setStatus('Playback complete', 'idle');
    });

    DocumentStore.subscribe(documents => {
        tracks = documents.filter(isAudioDocument);
        queueIds = queueIds.filter(id => Boolean(getTrack(id)));
        if (currentId && !getTrack(currentId)) renderEmpty();
        else {
            const current = getTrack(currentId);
            if (current) updateTrackDetails(current);
            renderQueue();
        }
    });

    setLoopMode(loopMode);
    setPlaylistEnabled(playlistEnabled);
    renderEmpty();
    initialized = true;
}

export function getSelectedId() {
    return currentId;
}

export function isPlaylistEnabled() {
    return playlistEnabled;
}

export function getQueueIds() {
    return [...queueIds];
}

export default {
    init,
    playTrack,
    enqueue,
    removeFromQueue,
    clearQueue,
    getSelectedId,
    isPlaylistEnabled,
    getQueueIds,
};
