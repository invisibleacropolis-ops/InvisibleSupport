/**
 * @fileoverview Shared searchable media-library view over document assets.
 */

import * as Utils from '../../shared/utils.js';
import * as Notifications from '../../shared/ui/notifications.js';
import * as DocumentStore from '../documents/store.js';

/**
 * @param {{ kind: 'audio'|'video', isMediaDocument: (item: object) => boolean, player: object }} config
 */
export function createMediaLibrary({ kind, isMediaDocument, player }) {
    const displayName = kind === 'audio' ? 'Audio' : 'Video';
    const markerIdle = kind === 'audio' ? '♪' : '▣';
    let initialized = false;
    let items = null;
    let emptyState = null;
    let searchInput = null;
    let records = [];
    let query = '';
    let pendingFocusId = null;

    function matches(item) {
        if (!query) return true;
        return [item.title, item.name, item.type, item.description]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(query));
    }

    function getItemSelector(id) {
        if (!id) return null;
        if (typeof CSS !== 'undefined' && CSS.escape) return `[data-${kind}-id="${CSS.escape(id)}"]`;
        return `[data-${kind}-id="${String(id).replace(/"/g, '\\"')}"]`;
    }

    function focusItem(id) {
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
        const filtered = records.filter(matches);
        const currentId = player.getSelectedId();
        const queuedIds = new Set(player.getQueueIds());
        const playlistEnabled = player.isPlaylistEnabled();
        if (emptyState) emptyState.hidden = filtered.length > 0;

        filtered.forEach(record => {
            const item = document.createElement('li');
            item.className = `audio-library__item ${kind}-library__item`;
            item.classList.toggle('is-current', record.id === currentId);
            item.dataset.id = record.id;

            const play = document.createElement('button');
            play.type = 'button';
            play.className = `audio-library__track ${kind}-library__track`;
            play.dataset[`${kind}Id`] = record.id;
            play.setAttribute('aria-label', `Play ${record.title || record.name}`);
            if (record.id === currentId) play.setAttribute('aria-current', 'true');

            const marker = document.createElement('span');
            marker.className = `audio-library__marker ${kind}-library__marker`;
            marker.textContent = record.id === currentId ? '▶' : markerIdle;
            marker.setAttribute('aria-hidden', 'true');

            const text = document.createElement('span');
            text.className = `audio-library__text ${kind}-library__text`;
            const title = document.createElement('strong');
            title.textContent = record.title || record.name;
            const meta = document.createElement('span');
            meta.textContent = [record.name, Utils.formatBytes(record.size)].filter(Boolean).join(' • ');
            text.append(title, meta);
            play.append(marker, text);
            play.addEventListener('click', () => player.playItem(record.id));

            const actions = document.createElement('div');
            actions.className = `audio-library__actions ${kind}-library__actions`;

            const queue = document.createElement('button');
            queue.type = 'button';
            queue.className = `audio-library__action ${kind}-library__action`;
            queue.textContent = queuedIds.has(record.id) ? 'Queued' : 'Queue';
            queue.disabled = !playlistEnabled || queuedIds.has(record.id);
            queue.title = playlistEnabled ? 'Add to playlist queue' : `Turn on Playlist in the ${displayName} Player first`;
            queue.addEventListener('click', () => player.enqueue(record.id));

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = `audio-library__action audio-library__action--remove ${kind}-library__action ${kind}-library__action--remove`;
            remove.textContent = 'Delete';
            remove.addEventListener('click', () => {
                const nextId = item.nextElementSibling?.dataset.id || item.previousElementSibling?.dataset.id || 'search';
                pendingFocusId = nextId;
                DocumentStore.removeDocument(record.id)
                    .then(() => Notifications.toast(`${displayName} removed from library.`, 'info'))
                    .catch(error => {
                        console.error(`${displayName} delete failed`, error);
                        Notifications.toast(`Unable to remove ${kind}.`, 'error');
                    });
            });

            actions.append(queue, remove);
            item.append(play, actions);
            items.appendChild(item);
        });

        applyPendingFocus();
    }

    function init() {
        if (initialized) return;
        items = document.querySelector(`[data-${kind}-library-items]`);
        emptyState = document.querySelector(`[data-${kind}-library-empty]`);
        searchInput = document.querySelector(`[data-${kind}-search]`);

        DocumentStore.subscribe(documents => {
            records = documents.filter(isMediaDocument);
            render();
        });
        searchInput?.addEventListener('input', event => {
            query = String(event.target.value || '').trim().toLowerCase();
            render();
        });
        document.addEventListener(`${kind}playerchange`, render);
        document.addEventListener(`${kind}playlistchange`, render);
        initialized = true;
    }

    return { init, focusItem };
}

export default { createMediaLibrary };
