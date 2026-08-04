/**
 * @fileoverview Searchable audio-only view over the document asset store.
 */

import * as Utils from '../../shared/utils.js';
import * as Notifications from '../../shared/ui/notifications.js';
import * as DocumentStore from '../documents/store.js';
import * as AudioPlayer from './player.js';
import { isAudioDocument } from './types.js';

let initialized = false;
let items = null;
let emptyState = null;
let searchInput = null;
let tracks = [];
let query = '';
let pendingFocusId = null;

function matches(track) {
    if (!query) return true;
    return [track.title, track.name, track.type, track.description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
}

function getItemSelector(id) {
    if (!id) return null;
    if (typeof CSS !== 'undefined' && CSS.escape) return `[data-audio-id="${CSS.escape(id)}"]`;
    return `[data-audio-id="${String(id).replace(/"/g, '\\"')}"]`;
}

export function focusItem(id) {
    const selector = getItemSelector(id);
    if (!selector || !items) return;
    items.querySelector(selector)?.focus({ preventScroll: false });
}

function applyPendingFocus() {
    if (!pendingFocusId) return;
    if (pendingFocusId === 'search') searchInput?.focus({ preventScroll: false });
    else focusItem(pendingFocusId);
    pendingFocusId = null;
}

function render() {
    if (!items) return;
    items.textContent = '';
    const filtered = tracks.filter(matches);
    const currentId = AudioPlayer.getSelectedId();
    const queuedIds = new Set(AudioPlayer.getQueueIds());
    const playlistEnabled = AudioPlayer.isPlaylistEnabled();
    if (emptyState) emptyState.hidden = filtered.length > 0;

    filtered.forEach(track => {
        const item = document.createElement('li');
        item.className = 'audio-library__item';
        item.classList.toggle('is-current', track.id === currentId);
        item.dataset.id = track.id;

        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'audio-library__track';
        play.dataset.audioId = track.id;
        play.setAttribute('aria-label', `Play ${track.title || track.name}`);
        if (track.id === currentId) play.setAttribute('aria-current', 'true');

        const marker = document.createElement('span');
        marker.className = 'audio-library__marker';
        marker.textContent = track.id === currentId ? '▶' : '♪';
        marker.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'audio-library__text';
        const title = document.createElement('strong');
        title.textContent = track.title || track.name;
        const meta = document.createElement('span');
        meta.textContent = [track.name, Utils.formatBytes(track.size)].filter(Boolean).join(' • ');
        text.append(title, meta);
        play.append(marker, text);
        play.addEventListener('click', () => AudioPlayer.playTrack(track.id));

        const actions = document.createElement('div');
        actions.className = 'audio-library__actions';

        const queue = document.createElement('button');
        queue.type = 'button';
        queue.className = 'audio-library__action';
        queue.textContent = queuedIds.has(track.id) ? 'Queued' : 'Queue';
        queue.disabled = !playlistEnabled || queuedIds.has(track.id);
        queue.title = playlistEnabled ? 'Add to playlist queue' : 'Turn on Playlist in the Audio Player first';
        queue.addEventListener('click', () => AudioPlayer.enqueue(track.id));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'audio-library__action audio-library__action--remove';
        remove.textContent = 'Delete';
        remove.addEventListener('click', () => {
            const nextId = item.nextElementSibling?.dataset.id || item.previousElementSibling?.dataset.id || 'search';
            pendingFocusId = nextId;
            DocumentStore.removeDocument(track.id)
                .then(() => Notifications.toast('Audio removed from library.', 'info'))
                .catch(error => {
                    console.error('Audio delete failed', error);
                    Notifications.toast('Unable to remove audio.', 'error');
                });
        });

        actions.append(queue, remove);
        item.append(play, actions);
        items.appendChild(item);
    });

    applyPendingFocus();
}

export function init() {
    if (initialized) return;
    items = document.querySelector('[data-audio-library-items]');
    emptyState = document.querySelector('[data-audio-library-empty]');
    searchInput = document.querySelector('[data-audio-search]');

    DocumentStore.subscribe(documents => {
        tracks = documents.filter(isAudioDocument);
        render();
    });
    searchInput?.addEventListener('input', event => {
        query = String(event.target.value || '').trim().toLowerCase();
        render();
    });
    document.addEventListener('audioplayerchange', render);
    document.addEventListener('audioplaylistchange', render);
    initialized = true;
}

export default { init, focusItem };
