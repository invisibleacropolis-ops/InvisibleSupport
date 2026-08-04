/**
 * @fileoverview Shared queued upload controller for audio and video documents.
 */

import * as Utils from '../../shared/utils.js';
import * as Notifications from '../../shared/ui/notifications.js';
import * as StorageManager from '../../shared/services/storage-manager.js';
import * as DocumentStore from '../documents/store.js';

/**
 * @param {{
 *   kind: 'audio'|'video',
 *   isMediaDocument: (item: object) => boolean,
 *   selectItem: (id: string) => void,
 *   focusItem: (id: string) => void
 * }} config
 */
export function createMediaUpload({ kind, isMediaDocument, selectItem, focusItem }) {
    const displayName = kind === 'audio' ? 'Audio' : 'Video';
    let initialized = false;
    let form = null;
    let fileInput = null;
    let titleInput = null;
    let descriptionInput = null;
    let progressContainer = null;
    let progressBar = null;
    let progressFill = null;
    let progressLabel = null;
    let feedback = null;
    let dropzone = null;
    let queueContainer = null;
    let queueList = null;
    let queueSummary = null;
    let queueEmpty = null;
    let queueClear = null;
    let submitButton = null;
    let resetButton = null;

    const pendingFiles = [];
    const pendingKeys = new Set();
    let isUploading = false;

    function buildFileKey(file) {
        return `${file.name}::${file.size}::${file.lastModified}`;
    }

    function getTotalSize() {
        return pendingFiles.reduce((sum, file) => sum + (Number(file?.size) || 0), 0);
    }

    function resetFeedback() {
        Notifications.inline(feedback, '');
    }

    function showFeedback(message, tone) {
        Notifications.inline(feedback, message, tone);
    }

    function hideProgress() {
        if (!progressContainer || !progressFill || !progressLabel || !progressBar) return;
        progressContainer.hidden = true;
        progressFill.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        progressLabel.textContent = `Waiting for ${kind}…`;
    }

    function updateProgress(percent, label) {
        if (!progressContainer || !progressFill || !progressLabel || !progressBar) return;
        const clamped = Math.max(0, Math.min(100, percent));
        progressContainer.hidden = false;
        progressFill.style.width = `${clamped}%`;
        progressBar.setAttribute('aria-valuenow', String(Math.round(clamped)));
        if (label) progressLabel.textContent = label;
    }

    function renderQueue() {
        if (!queueContainer || !queueList) return;
        queueList.textContent = '';
        const hasFiles = pendingFiles.length > 0;
        queueContainer.hidden = !hasFiles;
        if (queueClear) queueClear.disabled = !hasFiles || isUploading;
        if (queueEmpty) queueEmpty.hidden = hasFiles;
        if (submitButton) submitButton.disabled = isUploading;
        if (resetButton) resetButton.disabled = isUploading;
        if (fileInput) fileInput.disabled = isUploading;

        if (!hasFiles) {
            if (queueSummary) {
                queueSummary.hidden = true;
                queueSummary.textContent = '';
            }
            return;
        }

        if (queueSummary) {
            queueSummary.hidden = false;
            queueSummary.textContent = pendingFiles.length === 1
                ? `${pendingFiles[0].name} · ${Utils.formatBytes(getTotalSize())}`
                : `${pendingFiles.length} files · ${Utils.formatBytes(getTotalSize())}`;
        }

        pendingFiles.forEach(file => {
            const key = buildFileKey(file);
            const item = document.createElement('li');
            item.className = 'upload-card__queue-item';
            item.dataset.key = key;

            const details = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = file.name;
            const meta = document.createElement('p');
            meta.className = 'upload-card__queue-meta';
            meta.textContent = [file.type || displayName, Utils.formatBytes(file.size)].join(' · ');
            details.append(title, meta);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'upload-card__queue-remove';
            remove.dataset.mediaQueueRemove = key;
            remove.textContent = 'Remove';
            remove.disabled = isUploading;

            item.append(details, remove);
            queueList.appendChild(item);
        });
    }

    function clearQueue() {
        pendingFiles.splice(0);
        pendingKeys.clear();
        if (fileInput) fileInput.value = '';
        renderQueue();
    }

    function removeFromQueue(key) {
        if (!key) return;
        const index = pendingFiles.findIndex(file => buildFileKey(file) === key);
        if (index === -1) return;
        pendingFiles.splice(index, 1);
        pendingKeys.delete(key);
        renderQueue();
    }

    function reportUnsupported(files) {
        if (!files.length) return;
        const names = files.slice(0, 3).map(file => file.name).join(', ');
        const suffix = files.length > 3 ? ` and ${files.length - 3} more` : '';
        const message = `${names}${suffix} ${files.length === 1 ? 'is' : 'are'} not supported ${kind}.`;
        showFeedback(message, 'error');
        Notifications.toast(message, 'error');
    }

    function addFiles(fileList) {
        if (isUploading) return 0;
        const candidates = Array.from(fileList ?? []).filter(file => file instanceof File);
        const accepted = candidates.filter(isMediaDocument);
        reportUnsupported(candidates.filter(file => !isMediaDocument(file)));

        let added = 0;
        accepted.forEach(file => {
            const key = buildFileKey(file);
            if (pendingKeys.has(key)) return;
            pendingKeys.add(key);
            pendingFiles.push(file);
            added += 1;
        });
        if (added > 0) {
            resetFeedback();
            renderQueue();
        }
        return added;
    }

    function describeError(file, error) {
        if (error?.code === 'config' || error?.code === 'auth') {
            return 'Configure Supabase storage and sign in before uploading.';
        }
        if (error?.code === 'quota') return 'The upload exceeds the configured storage limit.';

        const status = Number(error?.status || error?.cause?.statusCode || error?.cause?.status || 0);
        const detail = String(error?.message || error?.cause?.message || '').trim();
        if (status === 413 || /too large|maximum.*size|exceeds.*limit|entity too large/i.test(detail)) {
            return `${file?.name || `${displayName} file`} is larger than the Supabase account or bucket upload limit.`;
        }
        if (status === 415 || /mime|content.?type|media type/i.test(detail)) {
            return `${file?.name || `${displayName} file`} has a file type that this Supabase bucket does not allow.`;
        }
        if (status === 409 || /already exists|duplicate/i.test(detail)) {
            return `${file?.name || `${displayName} file`} already exists in storage. Remove it or rename the file before retrying.`;
        }
        if (detail) {
            return `Unable to upload ${file?.name || `${kind} file`}: ${detail}`;
        }
        return `Unable to upload ${file?.name || `${kind} file`}. Check the connection and try again.`;
    }

    async function processFiles(fileList) {
        const files = Array.from(fileList ?? []).filter(file => file instanceof File && isMediaDocument(file));
        if (!files.length) {
            const message = `Choose at least one supported ${kind} file.`;
            showFeedback(message, 'error');
            Notifications.toast(message, 'error');
            return;
        }

        resetFeedback();
        isUploading = true;
        renderQueue();
        let lastRecord = null;
        const baseTitle = titleInput?.value.trim() ?? '';
        const description = descriptionInput?.value.trim() ?? '';
        let warnedLarge = false;

        try {
            for (const [index, file] of files.entries()) {
                const impact = StorageManager.estimateImpact(file.size);
                const snapshot = StorageManager.getSnapshot();
                if (!StorageManager.canStore(impact)) {
                    const message = 'The upload exceeds the configured storage limit.';
                    showFeedback(message, 'error');
                    Notifications.toast(message, 'error');
                    hideProgress();
                    return;
                }

                const ratio = snapshot.limit
                    ? Math.round(((snapshot.used + impact) / snapshot.limit) * 100)
                    : 100;
                if (!warnedLarge && ratio >= 85) {
                    Notifications.toast('This upload will use most of the configured storage budget.', 'info');
                    warnedLarge = true;
                }

                updateProgress((index / files.length) * 100, `Preparing ${file.name}…`);
                try {
                    const createDocument = kind === 'video'
                        ? DocumentStore.createDocumentFromFile
                        : DocumentStore.createDocument;
                    lastRecord = await createDocument(file, {
                        title: baseTitle
                            ? (files.length > 1 ? `${baseTitle} (${index + 1})` : baseTitle)
                            : undefined,
                        description,
                    }, progress => updateProgress(
                        ((index + progress) / files.length) * 100,
                        `Uploading ${file.name} · ${Math.round(progress * 100)}%`
                    ));
                } catch (error) {
                    console.error(`${displayName} upload failed`, error);
                    const message = describeError(file, error);
                    showFeedback(message, 'error');
                    Notifications.toast(message, 'error');
                    hideProgress();
                    return;
                }
            }

            const summary = files.length === 1
                ? `${files[0].name} uploaded.`
                : `${files.length} ${kind} files uploaded.`;
            updateProgress(100, summary);
            showFeedback(summary, 'success');
            Notifications.toast(`${displayName} upload complete.`, 'success');
            if (titleInput) titleInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
            clearQueue();
            setTimeout(() => hideProgress(), 600);
            if (lastRecord) {
                selectItem(lastRecord.id);
                setTimeout(() => focusItem(lastRecord.id), 0);
            }
        } finally {
            isUploading = false;
            renderQueue();
        }
    }

    function init() {
        if (initialized) return;
        form = document.querySelector(`[data-${kind}-upload-form]`);
        if (!form) return;
        fileInput = form.querySelector('[data-media-file-input]');
        titleInput = form.querySelector('[data-media-title]');
        descriptionInput = form.querySelector('[data-media-description]');
        progressContainer = form.querySelector('[data-media-progress]');
        progressBar = progressContainer?.querySelector('.upload-progress__bar');
        progressFill = form.querySelector('[data-media-progress-fill]');
        progressLabel = form.querySelector('[data-media-progress-label]');
        feedback = form.querySelector('[data-media-feedback]');
        dropzone = form.querySelector('[data-media-dropzone]');
        queueContainer = form.querySelector('[data-media-upload-queue]');
        queueList = form.querySelector('[data-media-queue-list]');
        queueSummary = form.querySelector('[data-media-queue-summary]');
        queueEmpty = form.querySelector('[data-media-queue-empty]');
        queueClear = form.querySelector('[data-media-queue-clear]');
        submitButton = form.querySelector('button[type="submit"]');
        resetButton = form.querySelector('button[type="reset"]');

        form.addEventListener('submit', event => {
            event.preventDefault();
            if (isUploading) return;
            const files = pendingFiles.length ? pendingFiles : Array.from(fileInput?.files ?? []);
            processFiles(files);
        });
        form.addEventListener('reset', () => {
            hideProgress();
            resetFeedback();
            clearQueue();
        });
        fileInput?.addEventListener('change', () => addFiles(fileInput?.files ?? []));
        queueClear?.addEventListener('click', () => {
            if (!isUploading) clearQueue();
        });
        queueList?.addEventListener('click', event => {
            const button = event.target.closest('[data-media-queue-remove]');
            if (button && !isUploading) removeFromQueue(button.dataset.mediaQueueRemove);
        });

        if (dropzone) {
            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, event => {
                    event.preventDefault();
                    dropzone.classList.add('is-dragover');
                });
            });
            ['dragleave', 'dragend'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => dropzone.classList.remove('is-dragover'));
            });
            dropzone.addEventListener('drop', event => {
                event.preventDefault();
                dropzone.classList.remove('is-dragover');
                if (isUploading) return;
                if (event.dataTransfer?.files?.length && addFiles(event.dataTransfer.files) > 0) {
                    processFiles(pendingFiles);
                }
            });
        }

        renderQueue();
        initialized = true;
    }

    return { init };
}

export default { createMediaUpload };
