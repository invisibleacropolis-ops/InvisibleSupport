/**
 * @fileoverview Document store for CRUD operations on documents.
 * Manages document persistence via GitHub and provides subscription model.
 */

import { t } from '../../shared/localization/index.js';
import * as Utils from '../../shared/utils.js';
import * as Notifications from '../../shared/ui/notifications.js';
import * as GitHubIntegration from '../../shared/services/github.js';
import * as StorageManager from '../../shared/services/storage-manager.js';

const STORAGE_KEY = 'invisibleSupport.documents';
const listeners = new Set();
let documents = [];

/**
 * Converts documents to serializable format (removes blob URLs)
 */
function toSerializable(items) {
    return items.map(({ blobUrl, ...rest }) => rest);
}

/**
 * Notifies all subscribers of document changes
 */
function notify() {
    listeners.forEach((listener) => listener([...documents]));
}

/**
 * Persists documents to storage
 */
async function persist(nextDocuments) {
    const serializable = toSerializable(nextDocuments);
    await StorageManager.persist(STORAGE_KEY, serializable);
}

/**
 * Hydrates documents with download URLs
 */
function hydrate(rawDocs) {
    return rawDocs.map((doc) => {
        const downloadUrl = doc.downloadUrl || (doc.repoPath ? GitHubIntegration.buildRawUrl(doc.repoPath) : '');
        return { ...doc, downloadUrl, blobUrl: downloadUrl };
    });
}

/**
 * Loads documents from storage
 */
async function load() {
    try {
        const stored = await StorageManager.read(STORAGE_KEY);
        if (Array.isArray(stored)) {
            documents = hydrate(stored).sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        } else {
            documents = [];
        }
    } catch (error) {
        if (error?.code !== 'config') {
            console.error('Failed to load stored documents', error);
        }
        documents = [];
    }
    notify();
}

/**
 * Generates a unique document ID
 */
function generateId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Guesses MIME type from filename
 */
function guessMimeType(name, fallback = 'application/octet-stream') {
    if (!name) return fallback;
    const extension = name.split('.').pop()?.toLowerCase();
    const lookup = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        txt: 'text/plain',
        rtf: 'application/rtf',
        json: 'application/json',
        log: 'text/plain',
    };
    return lookup[extension] || fallback;
}

/**
 * Ensures unique document name by appending counter
 */
function ensureUniqueName(name) {
    if (!name) return name;
    const trimmed = name.trim();
    if (!trimmed) return trimmed;
    const [base, extension] = (() => {
        const lastDot = trimmed.lastIndexOf('.');
        if (lastDot > 0 && lastDot < trimmed.length - 1) {
            return [trimmed.slice(0, lastDot), trimmed.slice(lastDot)];
        }
        return [trimmed, ''];
    })();
    let candidate = trimmed;
    let counter = 2;
    while (documents.some((doc) => doc.name === candidate)) {
        candidate = `${base} (${counter})${extension}`;
        counter += 1;
    }
    if (candidate !== trimmed) {
        Notifications.toast(t('notifications.duplicateName'), 'info');
    }
    return candidate;
}

/**
 * Normalizes a file into a document record
 */
function normalizeDocument(file, extras) {
    const now = new Date().toISOString();
    const title = extras.title?.trim();
    const description = extras.description?.trim() ?? '';
    const type = file.type || guessMimeType(file.name);
    const normalizedName = ensureUniqueName(file.name);
    return {
        id: generateId(),
        name: normalizedName,
        title: title || normalizedName,
        description,
        type,
        size: file.size,
        updatedAt: now,
        repoPath: '',
        sha: '',
        downloadUrl: '',
        blobUrl: '',
    };
}

/**
 * Adds a document to the store
 */
async function addDocument(doc) {
    const nextDocuments = [doc, ...documents].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    await persist(nextDocuments);
    documents = nextDocuments;
    notify();
}

/**
 * Creates and uploads a new document
 */
export async function createDocument(file, extras = {}, progressCallback) {
    if (!(file instanceof File)) {
        const error = new Error(t('errors.invalidDocument'));
        error.code = 'invalid';
        throw error;
    }
    if (!GitHubIntegration.isConfigured()) {
        const error = new Error(t('errors.githubConfigMissing'));
        error.code = 'config';
        throw error;
    }
    const dataUrl = await Utils.readFileAsDataUrl(file, progressCallback);
    const base64 = Utils.dataUrlToBase64(dataUrl);
    const documentRecord = normalizeDocument(file, extras);
    const repoPath = `uploads/documents/${documentRecord.id}/${encodeURIComponent(documentRecord.name)}`;
    try {
        const upload = await GitHubIntegration.uploadFile(
            repoPath,
            base64,
            `Add document ${documentRecord.name}`
        );
        documentRecord.repoPath = upload.path;
        documentRecord.sha = upload.sha ?? '';
        documentRecord.downloadUrl = upload.downloadUrl ?? '';
        documentRecord.blobUrl = documentRecord.downloadUrl;
        documentRecord.updatedAt = new Date().toISOString();
        await addDocument(documentRecord);
        return documentRecord;
    } catch (error) {
        const failure =
            error?.code === 'config' || error?.code === 'quota' || error?.code === 'persist'
                ? error
                : new Error(t('errors.persistFailure'));
        if (failure !== error) {
            failure.code = 'persist';
            failure.cause = error;
        }
        throw failure;
    }
}

/**
 * Removes a document by ID
 */
export async function removeDocument(id) {
    const doc = documents.find((item) => item.id === id);
    if (!doc) return;
    try {
        if (doc.repoPath) {
            await GitHubIntegration.deleteFile(doc.repoPath, doc.sha, `Remove document ${doc.name}`);
        }
    } catch (error) {
        console.warn('Failed to delete remote document', error);
    }
    if (doc.blobUrl?.startsWith('blob:')) {
        Utils.revokeObjectUrl(doc.blobUrl);
    }
    const nextDocuments = documents.filter((item) => item.id !== id);
    await persist(nextDocuments);
    documents = nextDocuments;
    notify();
}

/**
 * Clears all documents
 */
export async function clearAll() {
    await Promise.all(
        documents.map((doc) => {
            if (!doc.repoPath) return Promise.resolve();
            return GitHubIntegration.deleteFile(doc.repoPath, doc.sha, `Remove document ${doc.name}`).catch((error) => {
                console.warn('Failed to delete remote document', error);
            });
        })
    );
    documents.forEach((doc) => {
        if (doc?.blobUrl?.startsWith('blob:')) {
            Utils.revokeObjectUrl(doc.blobUrl);
        }
    });
    documents = [];
    await StorageManager.clear(STORAGE_KEY);
    notify();
}

/**
 * Subscribes to document changes
 */
export function subscribe(listener) {
    listeners.add(listener);
    listener([...documents]);
    return () => listeners.delete(listener);
}

/**
 * Gets a document by ID
 */
export function getDocument(id) {
    return documents.find((doc) => doc.id === id) ?? null;
}

/**
 * Gets all documents
 */
export function getDocuments() {
    return [...documents];
}

// Initialize: load documents and subscribe to config changes
load();
GitHubIntegration.subscribe(() => {
    load();
});

// Default export
export default {
    subscribe,
    createDocument,
    removeDocument,
    getDocument,
    getDocuments,
    clearAll,
};
