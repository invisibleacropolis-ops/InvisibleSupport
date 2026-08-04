/**
 * @fileoverview Shared native media player with optional queued playback.
 */

import * as Utils from '../../shared/utils.js';
import * as DocumentStore from '../documents/store.js';

const LOOP_MODES = new Set(['off', 'track', 'playlist']);

function loadBoolean(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value === 'true';
    } catch {
        return fallback;
    }
}

function loadLoopMode(key) {
    try {
        const value = localStorage.getItem(key) || 'off';
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

/**
 * Creates an isolated audio or video player controller.
 * @param {{ kind: 'audio'|'video', isMediaDocument: (item: object) => boolean }} config
 */
export function createMediaPlayer({ kind, isMediaDocument }) {
    const itemName = kind === 'audio' ? 'track' : 'video';
    const displayName = kind === 'audio' ? 'Audio' : 'Video';
    const playlistEnabledKey = `invisibleSupport.${kind}PlaylistEnabled`;
    const loopModeKey = `invisibleSupport.${kind}LoopMode`;

    let initialized = false;
    let media = null;
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

    let items = [];
    let queueIds = [];
    let currentId = null;
    let playlistEnabled = loadBoolean(playlistEnabledKey, false);
    let loopMode = loadLoopMode(loopModeKey);

    function getItem(id) {
        return items.find(item => item.id === id) || null;
    }

    function getSource(item) {
        return item?.blobUrl || item?.downloadUrl || '';
    }

    function emitSelectionChange() {
        document.dispatchEvent(new CustomEvent(`${kind}playerchange`, { detail: { id: currentId } }));
    }

    function emitPlaylistChange() {
        document.dispatchEvent(new CustomEvent(`${kind}playlistchange`, {
            detail: { enabled: playlistEnabled, queueIds: [...queueIds] },
        }));
    }

    function setStatus(message, state = 'idle') {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.dataset.state = state;
    }

    function updateDetails(item) {
        if (titleEl) titleEl.textContent = item?.title || item?.name || '—';
        if (filenameEl) filenameEl.textContent = item?.name || '—';
        if (detailEl) {
            const parts = [item?.type || displayName, Utils.formatBytes(item?.size)]
                .filter(value => value && value !== '—');
            detailEl.textContent = parts.join(' • ') || '—';
        }
    }

    function getPlaybackOrder() {
        const ids = playlistEnabled ? queueIds : items.map(item => item.id);
        return ids.filter(id => Boolean(getItem(id)));
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
        const validIds = queueIds.filter(id => Boolean(getItem(id)));
        if (queueEmpty) queueEmpty.hidden = validIds.length > 0;

        validIds.forEach((id, index) => {
            const itemRecord = getItem(id);
            if (!itemRecord) return;
            const label = itemRecord.title || itemRecord.name;

            const item = document.createElement('li');
            item.className = `audio-queue__item ${kind}-queue__item`;
            item.dataset.id = id;
            item.classList.toggle('is-current', id === currentId);

            const number = document.createElement('span');
            number.className = `audio-queue__number ${kind}-queue__number`;
            number.textContent = String(index + 1).padStart(2, '0');

            const name = document.createElement('button');
            name.type = 'button';
            name.className = `audio-queue__track ${kind}-queue__track`;
            name.textContent = label;
            name.setAttribute('aria-label', `Play ${label}`);
            name.addEventListener('click', () => playItem(id));

            const actions = document.createElement('div');
            actions.className = `audio-queue__actions ${kind}-queue__actions`;

            const up = document.createElement('button');
            up.type = 'button';
            up.className = `audio-queue__action ${kind}-queue__action`;
            up.textContent = '↑';
            up.disabled = index === 0;
            up.setAttribute('aria-label', `Move ${label} earlier`);
            up.addEventListener('click', () => moveQueueItem(id, -1));

            const down = document.createElement('button');
            down.type = 'button';
            down.className = `audio-queue__action ${kind}-queue__action`;
            down.textContent = '↓';
            down.disabled = index === validIds.length - 1;
            down.setAttribute('aria-label', `Move ${label} later`);
            down.addEventListener('click', () => moveQueueItem(id, 1));

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = `audio-queue__action audio-queue__action--remove ${kind}-queue__action ${kind}-queue__action--remove`;
            remove.textContent = '×';
            remove.setAttribute('aria-label', `Remove ${label} from playlist`);
            remove.addEventListener('click', () => removeFromQueue(id));

            actions.append(up, down, remove);
            item.append(number, name, actions);
            queueList.appendChild(item);
        });

        updateTransport();
    }

    function renderEmpty() {
        currentId = null;
        if (media) {
            media.pause();
            media.removeAttribute('src');
            media.removeAttribute('data-media-id');
            media.load();
        }
        if (emptyState) emptyState.hidden = false;
        if (activeState) activeState.hidden = true;
        updateDetails(null);
        setStatus(`Waiting for a ${itemName}`, 'idle');
        renderQueue();
        emitSelectionChange();
    }

    function setLoopMode(nextMode) {
        const normalized = LOOP_MODES.has(nextMode) ? nextMode : 'off';
        loopMode = normalized === 'playlist' && !playlistEnabled ? 'off' : normalized;
        if (media) media.loop = loopMode === 'track';
        persistPreference(loopModeKey, loopMode);
        updateTransport();
    }

    function setPlaylistEnabled(enabled) {
        playlistEnabled = Boolean(enabled);
        if (playlistEnabled && currentId && !queueIds.includes(currentId)) queueIds.push(currentId);
        if (!playlistEnabled && loopMode === 'playlist') setLoopMode('off');
        persistPreference(playlistEnabledKey, playlistEnabled);
        renderQueue();
        emitPlaylistChange();
    }

    function advance(direction, fromEnded = false) {
        const order = getPlaybackOrder();
        if (order.length === 0) return false;

        if (direction < 0 && !fromEnded && media && media.currentTime > 3) {
            media.currentTime = 0;
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

        playItem(order[nextIndex]);
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

    function enqueue(id) {
        if (!playlistEnabled || !getItem(id)) return false;
        if (!queueIds.includes(id)) queueIds.push(id);
        renderQueue();
        emitPlaylistChange();
        return true;
    }

    function removeFromQueue(id) {
        queueIds = queueIds.filter(queueId => queueId !== id);
        renderQueue();
        emitPlaylistChange();
    }

    function clearQueue() {
        queueIds = [];
        renderQueue();
        emitPlaylistChange();
    }

    function playItem(id, { autoplay = true } = {}) {
        const item = getItem(id);
        if (!item) {
            renderEmpty();
            return false;
        }

        const source = getSource(item);
        currentId = item.id;
        if (playlistEnabled && !queueIds.includes(item.id)) queueIds.push(item.id);
        if (emptyState) emptyState.hidden = true;
        if (activeState) activeState.hidden = false;
        updateDetails(item);

        if (media && media.dataset.mediaId !== item.id) {
            if (source) {
                media.src = source;
                media.dataset.mediaId = item.id;
            } else {
                media.removeAttribute('src');
                media.removeAttribute('data-media-id');
            }
            media.load();
        }

        if (!source) {
            setStatus(`${displayName} source unavailable`, 'error');
        } else if (autoplay && media) {
            setStatus('Loading…', 'loading');
            media.play().catch(error => {
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

    function init() {
        if (initialized) return;
        media = document.querySelector(`[data-${kind}-element]`);
        emptyState = document.querySelector(`[data-${kind}-player-empty]`);
        activeState = document.querySelector(`[data-${kind}-player-active]`);
        titleEl = document.querySelector(`[data-${kind}-title]`);
        filenameEl = document.querySelector(`[data-${kind}-filename]`);
        detailEl = document.querySelector(`[data-${kind}-detail]`);
        statusEl = document.querySelector(`[data-${kind}-status]`);
        previousButton = document.querySelector(`[data-${kind}-previous]`);
        nextButton = document.querySelector(`[data-${kind}-next]`);
        loopSelect = document.querySelector(`[data-${kind}-loop]`);
        playlistToggle = document.querySelector(`[data-${kind}-playlist-enabled]`);
        queuePanel = document.querySelector(`[data-${kind}-queue]`);
        queueList = document.querySelector(`[data-${kind}-queue-list]`);
        queueEmpty = document.querySelector(`[data-${kind}-queue-empty]`);
        queueCount = document.querySelector(`[data-${kind}-queue-count]`);
        queueClear = document.querySelector(`[data-${kind}-queue-clear]`);

        previousButton?.addEventListener('click', () => advance(-1));
        nextButton?.addEventListener('click', () => advance(1));
        loopSelect?.addEventListener('change', event => setLoopMode(event.target.value));
        playlistToggle?.addEventListener('change', event => setPlaylistEnabled(event.target.checked));
        queueClear?.addEventListener('click', clearQueue);

        media?.addEventListener('playing', () => setStatus('Playing', 'playing'));
        media?.addEventListener('pause', () => {
            if (media?.ended) return;
            setStatus('Paused', 'idle');
        });
        media?.addEventListener('waiting', () => setStatus('Buffering…', 'loading'));
        media?.addEventListener('error', () => setStatus(`Unable to play this ${kind} source`, 'error'));
        media?.addEventListener('ended', () => {
            if (!playlistEnabled || !advance(1, true)) setStatus('Playback complete', 'idle');
        });

        DocumentStore.subscribe(documents => {
            items = documents.filter(isMediaDocument);
            queueIds = queueIds.filter(id => Boolean(getItem(id)));
            if (currentId && !getItem(currentId)) renderEmpty();
            else {
                const current = getItem(currentId);
                if (current) updateDetails(current);
                renderQueue();
            }
        });

        setLoopMode(loopMode);
        setPlaylistEnabled(playlistEnabled);
        renderEmpty();
        initialized = true;
    }

    return {
        init,
        playItem,
        enqueue,
        removeFromQueue,
        clearQueue,
        getSelectedId: () => currentId,
        isPlaylistEnabled: () => playlistEnabled,
        getQueueIds: () => [...queueIds],
    };
}

export default { createMediaPlayer };
