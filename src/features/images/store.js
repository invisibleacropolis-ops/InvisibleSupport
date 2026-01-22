/**
 * @fileoverview Image store for CRUD operations on images.
 * Manages image persistence via GitHub, EXIF/dimension validation, and subscriptions.
 */

import { t } from '../../shared/localization/index.js';
import * as Utils from '../../shared/utils.js';
import * as Notifications from '../../shared/ui/notifications.js';
import * as GitHubIntegration from '../../shared/services/github.js';
import * as StorageManager from '../../shared/services/storage-manager.js';

const STORAGE_KEY = 'invisibleSupport.images';
const MAX_IMAGE_DIMENSION = 8192;
const SUPPORTED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/svg+xml',
    'image/tiff',
]);

const listeners = new Set();
let images = [];

/**
 * Converts images to serializable format
 */
function toSerializable(items) {
    return items.map(({ blobUrl, ...rest }) => rest);
}

/**
 * Notifies all subscribers
 */
function notify() {
    listeners.forEach((listener) => listener([...images]));
}

/**
 * Persists images to storage
 */
async function persist(nextImages) {
    const serializable = toSerializable(nextImages);
    await StorageManager.persist(STORAGE_KEY, serializable);
}

/**
 * Hydrates images with download URLs
 */
function hydrate(rawImages) {
    return rawImages.map((image) => {
        const downloadUrl = image.downloadUrl || (image.repoPath ? GitHubIntegration.buildRawUrl(image.repoPath) : '');
        const type = image.type || 'image/png';
        return { ...image, type, downloadUrl, blobUrl: downloadUrl };
    });
}

/**
 * Loads images from storage
 */
async function load() {
    try {
        const stored = await StorageManager.read(STORAGE_KEY);
        if (Array.isArray(stored)) {
            images = hydrate(stored).sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        } else {
            images = [];
        }
    } catch (error) {
        if (error?.code !== 'config') {
            console.error('Failed to load stored images', error);
        }
        images = [];
    }
    notify();
}

/**
 * Generates a unique image ID
 */
function generateId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Guesses MIME type from filename
 */
function guessMimeType(name, fallback = 'image/png') {
    if (!name) return fallback;
    const extension = name.split('.').pop()?.toLowerCase();
    const lookup = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        heic: 'image/heic',
        svg: 'image/svg+xml',
    };
    return lookup[extension] || fallback;
}

/**
 * Checks if a MIME type is supported
 */
function isSupportedImageType(type) {
    if (!type) return false;
    const normalized = type.toLowerCase();
    if (SUPPORTED_IMAGE_TYPES.has(normalized)) return true;
    return normalized.startsWith('image/');
}

/**
 * Gets image dimensions from a file
 */
function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            const width = image.naturalWidth || image.width;
            const height = image.naturalHeight || image.height;
            URL.revokeObjectURL(url);
            resolve({ width, height });
        };
        image.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };
        image.src = url;
    });
}

/**
 * Ensures unique image name
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
    while (images.some((image) => image.name === candidate)) {
        candidate = `${base} (${counter})${extension}`;
        counter += 1;
    }
    if (candidate !== trimmed) {
        Notifications.toast(t('notifications.duplicateName'), 'info');
    }
    return candidate;
}

/**
 * Formats EXIF date to ISO string
 */
function formatExifDate(value) {
    if (!value || typeof value !== 'string') return null;
    const cleaned = value.replace(/\0/g, '').trim();
    const match = cleaned.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return cleaned || null;
    const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return cleaned || null;
    return date.toISOString();
}

/**
 * Normalizes a file into an image record
 */
function normalizeImage(file, extras, dimensions, exif) {
    const now = new Date().toISOString();
    const title = extras.title?.trim();
    const alt = extras.alt?.trim();
    const type = file.type || guessMimeType(file.name, 'image/png');
    const capturedAtIso = formatExifDate(exif?.dateTimeOriginal);
    const normalizedName = ensureUniqueName(file.name);
    return {
        id: generateId(),
        name: normalizedName,
        title: title || normalizedName,
        alt: alt || '',
        type,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        updatedAt: now,
        capturedAt: capturedAtIso,
        exif: exif || {},
        repoPath: '',
        sha: '',
        downloadUrl: '',
        blobUrl: '',
    };
}

/**
 * Adds an image to the store
 */
async function addImage(image) {
    const nextImages = [image, ...images].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    await persist(nextImages);
    images = nextImages;
    notify();
}

/**
 * Creates and uploads a new image
 */
export async function createImage(file, extras = {}, progressCallback) {
    if (!(file instanceof File)) {
        const error = new Error(t('errors.invalidImage'));
        error.code = 'invalid';
        throw error;
    }
    const mimeType = file.type || guessMimeType(file.name, 'image/png');
    if (!isSupportedImageType(mimeType)) {
        const error = new Error(t('errors.unsupportedImageType'));
        error.code = 'type';
        throw error;
    }

    let dimensions;
    try {
        dimensions = await getImageDimensions(file);
    } catch (error) {
        const dimensionError = new Error(t('errors.imageDimensions'));
        dimensionError.code = 'dimensions';
        throw dimensionError;
    }

    if (!dimensions || dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
        const sizeError = new Error(t('errors.imageTooLarge'));
        sizeError.code = 'max-dimensions';
        sizeError.details = dimensions;
        throw sizeError;
    }

    const dataUrl = await Utils.readFileAsDataUrl(file, progressCallback);

    // Note: EXIF parsing removed for simplicity - can be added back if needed
    const exif = {};

    if (!GitHubIntegration.isConfigured()) {
        const error = new Error(t('errors.githubConfigMissing'));
        error.code = 'config';
        throw error;
    }

    const base64 = Utils.dataUrlToBase64(dataUrl);
    const imageRecord = normalizeImage(file, extras, dimensions, exif);
    const repoPath = `uploads/images/${imageRecord.id}/${encodeURIComponent(imageRecord.name)}`;

    try {
        const upload = await GitHubIntegration.uploadFile(repoPath, base64, `Add image ${imageRecord.name}`);
        imageRecord.repoPath = upload.path;
        imageRecord.sha = upload.sha ?? '';
        imageRecord.downloadUrl = upload.downloadUrl ?? '';
        imageRecord.blobUrl = imageRecord.downloadUrl;
        imageRecord.updatedAt = new Date().toISOString();
        await addImage(imageRecord);
        return imageRecord;
    } catch (error) {
        if (error?.code === 'config' || error?.code === 'quota' || error?.code === 'persist') {
            throw error;
        }
        const failure = new Error(t('errors.persistFailure'));
        failure.code = 'persist';
        failure.cause = error;
        throw failure;
    }
}

/**
 * Removes an image by ID
 */
export async function removeImage(id) {
    const image = images.find((item) => item.id === id);
    if (!image) return;
    try {
        if (image.repoPath) {
            await GitHubIntegration.deleteFile(image.repoPath, image.sha, `Remove image ${image.name}`);
        }
    } catch (error) {
        console.warn('Failed to delete remote image', error);
    }
    if (image?.blobUrl?.startsWith('blob:')) {
        Utils.revokeObjectUrl(image.blobUrl);
    }
    const nextImages = images.filter((item) => item.id !== id);
    await persist(nextImages);
    images = nextImages;
    notify();
}

/**
 * Subscribes to image changes
 */
export function subscribe(listener) {
    listeners.add(listener);
    listener([...images]);
    return () => listeners.delete(listener);
}

/**
 * Gets an image by ID
 */
export function getImage(id) {
    return images.find((image) => image.id === id) ?? null;
}

/**
 * Gets all images
 */
export function getImages() {
    return [...images];
}

/**
 * Clears all images
 */
export async function clearAll() {
    await Promise.all(
        images.map((image) => {
            if (!image.repoPath) return Promise.resolve();
            return GitHubIntegration.deleteFile(image.repoPath, image.sha, `Remove image ${image.name}`).catch((error) => {
                console.warn('Failed to delete remote image', error);
            });
        })
    );
    images.forEach((image) => {
        if (image?.blobUrl?.startsWith('blob:')) {
            Utils.revokeObjectUrl(image.blobUrl);
        }
    });
    images = [];
    await StorageManager.clear(STORAGE_KEY);
    notify();
}

// Initialize
load();
GitHubIntegration.subscribe(() => {
    load();
});

// Default export
export default {
    subscribe,
    createImage,
    removeImage,
    getImage,
    getImages,
    clearAll,
};
