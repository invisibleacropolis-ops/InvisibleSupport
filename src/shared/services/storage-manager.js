/**
 * @fileoverview Storage quota manager that tracks usage across manifests.
 * Provides quota checking, persistence, and storage usage notifications.
 */

import { t } from '../localization/index.js';
import * as SupabaseStorage from './supabase-storage.js';

// Warning threshold (80% of quota)
const WARNING_THRESHOLD = 0.8;

// Track sizes by storage key
const trackedSizes = new Map();
const manifestMeta = new Map();
const listeners = new Set();

// Map storage keys to asset kinds
const KEY_PATH_MAP = new Map([
    ['invisibleSupport.documents', 'document'],
    ['invisibleSupport.images', 'image'],
]);

/**
 * Calculates total size from an array of items
 */
function calculateSize(value) {
    if (!Array.isArray(value)) return 0;
    return value.reduce((total, item) => total + (Number(item?.size) || 0), 0);
}

/**
 * Resolves a storage key to its manifest path
 */
function resolveKind(key) {
    return KEY_PATH_MAP.get(key) ?? null;
}

/**
 * Builds a storage snapshot
 */
function buildSnapshot(overrideKey, overrideSize) {
    let used = 0;
    trackedSizes.forEach((size, key) => {
        if (overrideKey && key === overrideKey && typeof overrideSize === 'number') {
            used += overrideSize;
        } else {
            used += size;
        }
    });
    if (overrideKey && !trackedSizes.has(overrideKey) && typeof overrideSize === 'number') {
        used += overrideSize;
    }
    const limit = SupabaseStorage.getStorageLimitBytes();
    const ratio = limit > 0 ? used / limit : 0;
    return {
        used,
        limit,
        ratio,
        isWarning: ratio >= WARNING_THRESHOLD && ratio < 1,
        isExceeded: ratio >= 1,
    };
}

/**
 * Notifies all storage listeners
 */
function notify(snapshot = buildSnapshot()) {
    listeners.forEach((listener) => {
        try {
            listener({ ...snapshot });
        } catch (error) {
            console.warn('Storage listener error', error);
        }
    });
}

/**
 * Persists asset metadata to Supabase and updates tracking
 */
export async function persist(key, value) {
    const kind = resolveKind(key);
    if (!kind) {
        console.warn(`No asset kind registered for key: ${key}`);
        return value;
    }
    const size = calculateSize(value);
    const snapshot = buildSnapshot(key, size);
    if (snapshot.isExceeded) {
        const error = new Error(t('errors.quotaExceeded'));
        error.code = 'quota';
        error.snapshot = snapshot;
        throw error;
    }
    try {
        const result = await SupabaseStorage.writeItems(kind, value);
        manifestMeta.set(key, { sha: result.sha });
        trackedSizes.set(key, size);
        notify();
        return value;
    } catch (error) {
        if (error?.code === 'config' || error?.code === 'auth') {
            throw error;
        }
        const persistError = new Error(t('errors.persistFailure'));
        persistError.code = 'persist';
        persistError.cause = error;
        throw persistError;
    }
}

/**
 * Reads asset metadata from Supabase and updates tracking
 */
export async function read(key) {
    const kind = resolveKind(key);
    if (!kind) return null;
    try {
        const items = await SupabaseStorage.readItems(kind);
        manifestMeta.set(key, { sha: null });
        const size = calculateSize(items);
        trackedSizes.set(key, size);
        notify();
        return items;
    } catch (error) {
        if (error?.code === 'config' || error?.code === 'auth') {
            trackedSizes.set(key, 0);
            notify();
            throw error;
        }
        console.error('Failed to read manifest', error);
        trackedSizes.set(key, 0);
        notify();
        return null;
    }
}

/**
 * Clears a specific storage key
 */
export async function clear(key) {
    const kind = resolveKind(key);
    if (!kind) return;
    try {
        await SupabaseStorage.clearItems(kind);
    } catch (error) {
        console.warn('Failed to clear Supabase assets', error);
    }
    manifestMeta.delete(key);
    trackedSizes.set(key, 0);
    notify();
}

/**
 * Clears all storage keys
 */
export async function clearAll() {
    const tasks = Array.from(KEY_PATH_MAP.keys()).map((key) => clear(key));
    await Promise.all(tasks);
}

/**
 * Subscribes to storage changes
 */
export function subscribe(listener) {
    if (typeof listener !== 'function') return () => { };
    listeners.add(listener);
    listener(buildSnapshot());
    return () => listeners.delete(listener);
}

/**
 * Gets the current storage snapshot
 */
export function getSnapshot() {
    return buildSnapshot();
}

/**
 * Estimates the storage impact of additional bytes
 */
export function estimateImpact(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return 0;
    return bytes;
}

/**
 * Gets remaining storage capacity in bytes
 */
export function getRemainingCapacity() {
    const snapshot = buildSnapshot();
    return Math.max(snapshot.limit - snapshot.used, 0);
}

/**
 * Checks if additional bytes can be stored
 */
export function canStore(additionalBytes) {
    if (!Number.isFinite(additionalBytes) || additionalBytes <= 0) return true;
    const snapshot = buildSnapshot();
    return snapshot.used + additionalBytes <= snapshot.limit;
}

// Subscribe to Supabase config changes to update notifications
SupabaseStorage.subscribe(() => {
    notify();
});

// Default export
export default {
    persist,
    read,
    clear,
    clearAll,
    subscribe,
    getSnapshot,
    estimateImpact,
    getRemainingCapacity,
    canStore,
};
