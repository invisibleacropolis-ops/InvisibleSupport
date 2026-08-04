/**
 * @fileoverview Supabase-backed asset storage.
 */

import { t } from '../localization/index.js';
import { SUPABASE_CONFIG, isConfigured as hasSupabaseConfig } from '../config/supabase.js?v=20260706-2';
import { getSupabaseClient } from './supabase-client.js?v=20260706-2';

const LEGACY_CONFIG_KEY = 'invisibleSupport.supabaseConfig';
const TUS_CLIENT_URL = 'https://esm.sh/tus-js-client@4.3.1/lib.esm/browser/index.js';
const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 6 * 1024 * 1024;
const RESUMABLE_UPLOAD_CHUNK_BYTES = 6 * 1024 * 1024;
let tusClientPromise = null;

try {
    localStorage.removeItem(LEGACY_CONFIG_KEY);
} catch {
    // Storage access can be unavailable in restricted browser contexts.
}

function mapStorageKeyToKind(keyOrPath) {
    if (String(keyOrPath).includes('image')) return 'image';
    return 'document';
}

function inferMimeType(name, fallback = 'application/octet-stream') {
    const extension = String(name || '').split('.').pop()?.toLowerCase();
    const lookup = {
        aac: 'audio/aac',
        avif: 'image/avif',
        csv: 'text/csv',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        gif: 'image/gif',
        flac: 'audio/flac',
        heic: 'image/heic',
        heif: 'image/heif',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        json: 'application/json',
        log: 'text/plain',
        m4a: 'audio/mp4',
        md: 'text/markdown',
        mp3: 'audio/mpeg',
        oga: 'audio/ogg',
        ogg: 'audio/ogg',
        opus: 'audio/ogg; codecs=opus',
        pdf: 'application/pdf',
        png: 'image/png',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        rtf: 'application/rtf',
        svg: 'image/svg+xml',
        tif: 'image/tiff',
        tiff: 'image/tiff',
        txt: 'text/plain',
        wav: 'audio/wav',
        wave: 'audio/wav',
        weba: 'audio/webm',
        m4v: 'video/x-m4v',
        mov: 'video/quicktime',
        mp4: 'video/mp4',
        ogv: 'video/ogg',
        webm: 'video/webm',
        webp: 'image/webp',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return lookup[extension] || fallback;
}

function decodeBase64ToBlob(base64, type) {
    const binary = atob(base64 || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: type || 'application/octet-stream' });
}

function getTusClient() {
    if (!tusClientPromise) {
        tusClientPromise = import(TUS_CLIENT_URL);
    }
    return tusClientPromise;
}

function getResumableUploadEndpoint() {
    const projectUrl = new URL(SUPABASE_CONFIG.projectUrl);
    const projectId = projectUrl.hostname.split('.')[0];
    return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
}

function createUploadError(error) {
    const response = error?.originalResponse;
    const status = response?.getStatus?.() || error?.statusCode || error?.status || null;
    let message = error?.message || t('errors.supabaseRequestFailed');

    try {
        const body = response?.getBody?.();
        if (body) {
            const parsed = JSON.parse(body);
            message = parsed?.message || parsed?.error || message;
        }
    } catch {
        // Keep the original transport error when the response is not JSON.
    }

    const uploadError = new Error(message);
    uploadError.code = 'request';
    uploadError.status = status;
    uploadError.cause = error;
    return uploadError;
}

async function requireAccessToken(client) {
    const { data, error } = await client.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (error || !accessToken) {
        const authError = new Error(t('errors.supabaseAuthRequired'));
        authError.code = 'auth';
        authError.cause = error;
        throw authError;
    }
    return accessToken;
}

async function uploadResumableFile(file, storagePath, mimeType, client, progressCallback) {
    const [{ Upload }, accessToken] = await Promise.all([
        getTusClient(),
        requireAccessToken(client),
    ]);

    let resolveUpload;
    let rejectUpload;
    const completed = new Promise((resolve, reject) => {
        resolveUpload = resolve;
        rejectUpload = reject;
    });

    const upload = new Upload(file, {
        endpoint: getResumableUploadEndpoint(),
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
            authorization: `Bearer ${accessToken}`,
            apikey: SUPABASE_CONFIG.publishableKey,
            'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: RESUMABLE_UPLOAD_CHUNK_BYTES,
        metadata: {
            bucketName: SUPABASE_CONFIG.bucket,
            objectName: storagePath,
            contentType: mimeType,
            cacheControl: '3600',
        },
        onError: error => rejectUpload(createUploadError(error)),
        onProgress: (bytesUploaded, bytesTotal) => {
            if (typeof progressCallback === 'function' && bytesTotal > 0) {
                progressCallback(bytesUploaded / bytesTotal);
            }
        },
        onSuccess: () => resolveUpload(),
    });

    try {
        upload.start();
        await completed;
    } catch (error) {
        throw error?.code ? error : createUploadError(error);
    }
}

async function requireUser(client) {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user?.id) {
        const authError = new Error(t('errors.supabaseAuthRequired'));
        authError.code = 'auth';
        authError.cause = error;
        throw authError;
    }
    return data.user;
}

function parseLegacyUploadPath(path) {
    const parts = String(path || '').split('/').filter(Boolean);
    const uploadsIndex = parts.indexOf('uploads');
    const kindSegment = uploadsIndex >= 0 ? parts[uploadsIndex + 1] : parts[0];
    const id = uploadsIndex >= 0 ? parts[uploadsIndex + 2] : parts[1];
    const encodedName = uploadsIndex >= 0 ? parts.slice(uploadsIndex + 3).join('/') : parts.slice(2).join('/');
    const kind = kindSegment === 'images' || kindSegment === 'image' ? 'image' : 'document';
    const name = decodeURIComponent(encodedName || 'upload.bin');
    return { kind, id, name };
}

function parseAssetIdFromStoragePath(path) {
    const parts = String(path || '').split('/').filter(Boolean);
    return parts[2] || '';
}

async function signedUrlFor(client, path) {
    if (!path) return '';
    const { data, error } = await client.storage
        .from(SUPABASE_CONFIG.bucket)
        .createSignedUrl(path, SUPABASE_CONFIG.signedUrlExpiresInSeconds);
    if (error) {
        console.warn('Failed to create signed URL', error);
        return '';
    }
    return data?.signedUrl || '';
}

function itemToRow(item, kind, ownerId) {
    const now = new Date().toISOString();
    return {
        id: item.id,
        owner_id: ownerId,
        kind,
        name: item.name || '',
        title: item.title || item.name || '',
        description: item.description || '',
        alt: item.alt || '',
        mime_type: item.type || 'application/octet-stream',
        size_bytes: Number(item.size) || 0,
        storage_path: item.repoPath || '',
        width: Number.isFinite(Number(item.width)) ? Number(item.width) : null,
        height: Number.isFinite(Number(item.height)) ? Number(item.height) : null,
        captured_at: item.capturedAt || null,
        exif: item.exif || {},
        updated_at: item.updatedAt || now,
    };
}

async function rowToItem(client, row) {
    const downloadUrl = await signedUrlFor(client, row.storage_path);
    return {
        id: row.id,
        name: row.name || '',
        title: row.title || row.name || '',
        description: row.description || '',
        alt: row.alt || '',
        type: row.mime_type || 'application/octet-stream',
        size: Number(row.size_bytes) || 0,
        width: row.width ?? undefined,
        height: row.height ?? undefined,
        capturedAt: row.captured_at || null,
        exif: row.exif || {},
        updatedAt: row.updated_at || row.created_at || '',
        repoPath: row.storage_path || '',
        sha: '',
        downloadUrl,
        blobUrl: downloadUrl,
    };
}

function makeStoragePath(userId, kind, id, name) {
    const folder = kind === 'image' ? 'images' : 'documents';
    const safeName = encodeURIComponent(name || 'upload.bin');
    return `${userId}/${folder}/${id}/${safeName}`;
}

export function getConfig() {
    return {
        projectUrl: SUPABASE_CONFIG.projectUrl,
        bucket: SUPABASE_CONFIG.bucket,
        assetsTable: SUPABASE_CONFIG.assetsTable,
        configured: hasSupabaseConfig(),
    };
}

export function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listener(getConfig());
    return () => {};
}

export function isConfigured() {
    return hasSupabaseConfig();
}

export async function readItems(kind) {
    const client = await getSupabaseClient();
    await requireUser(client);
    const { data, error } = await client
        .from(SUPABASE_CONFIG.assetsTable)
        .select('*')
        .eq('kind', kind)
        .order('updated_at', { ascending: false });
    if (error) {
        const requestError = new Error(error.message || t('errors.supabaseRequestFailed'));
        requestError.code = 'request';
        requestError.cause = error;
        throw requestError;
    }
    return Promise.all((data || []).map((row) => rowToItem(client, row)));
}

export async function writeItems(kind, items) {
    const client = await getSupabaseClient();
    const user = await requireUser(client);
    const rows = (items || []).map((item) => itemToRow(item, kind, user.id));
    if (rows.length === 0) return { items: [], sha: null };
    const { error } = await client
        .from(SUPABASE_CONFIG.assetsTable)
        .upsert(rows, { onConflict: 'id' });
    if (error) {
        const requestError = new Error(error.message || t('errors.supabaseRequestFailed'));
        requestError.code = 'request';
        requestError.cause = error;
        throw requestError;
    }
    return { items, sha: null };
}

export async function clearItems(kind) {
    const client = await getSupabaseClient();
    await requireUser(client);
    const { error } = await client
        .from(SUPABASE_CONFIG.assetsTable)
        .delete()
        .eq('kind', kind);
    if (error) {
        console.warn('Failed to clear Supabase asset rows', error);
    }
}

export async function readManifest(path) {
    return { items: await readItems(mapStorageKeyToKind(path)), sha: null };
}

export async function writeManifest(path, items) {
    return writeItems(mapStorageKeyToKind(path), items);
}

export async function deleteManifest(path) {
    return clearItems(mapStorageKeyToKind(path));
}

export async function uploadFile(path, base64Content) {
    const client = await getSupabaseClient();
    const user = await requireUser(client);
    const parsed = parseLegacyUploadPath(path);
    const mimeType = inferMimeType(parsed.name);
    const storagePath = makeStoragePath(user.id, parsed.kind, parsed.id, parsed.name);
    const blob = decodeBase64ToBlob(base64Content, mimeType);
    const { data, error } = await client.storage
        .from(SUPABASE_CONFIG.bucket)
        .upload(storagePath, blob, {
            contentType: mimeType,
            upsert: false,
        });
    if (error) {
        const uploadError = new Error(error.message || t('errors.supabaseRequestFailed'));
        uploadError.code = 'request';
        uploadError.cause = error;
        throw uploadError;
    }
    return {
        path: data?.path || storagePath,
        sha: '',
        downloadUrl: await signedUrlFor(client, data?.path || storagePath),
    };
}

/**
 * Uploads a browser File/Blob without base64 expansion. Files above Supabase's
 * recommended standard-upload threshold use TUS so interrupted transfers can resume.
 */
export async function uploadFileObject(path, file, progressCallback) {
    if (!(file instanceof Blob)) {
        const invalidError = new Error('A File or Blob is required for direct upload.');
        invalidError.code = 'invalid';
        throw invalidError;
    }

    const client = await getSupabaseClient();
    const user = await requireUser(client);
    const parsed = parseLegacyUploadPath(path);
    const mimeType = file.type || inferMimeType(parsed.name);
    const storagePath = makeStoragePath(user.id, parsed.kind, parsed.id, parsed.name);

    if (typeof progressCallback === 'function') progressCallback(0);

    if (file.size > RESUMABLE_UPLOAD_THRESHOLD_BYTES) {
        await uploadResumableFile(file, storagePath, mimeType, client, progressCallback);
    } else {
        const { error } = await client.storage
            .from(SUPABASE_CONFIG.bucket)
            .upload(storagePath, file, {
                contentType: mimeType,
                upsert: false,
            });
        if (error) throw createUploadError(error);
        if (typeof progressCallback === 'function') progressCallback(1);
    }

    return {
        path: storagePath,
        sha: '',
        downloadUrl: await signedUrlFor(client, storagePath),
    };
}

export async function deleteFile(path) {
    if (!path) return;
    const client = await getSupabaseClient();
    await requireUser(client);
    await client.storage.from(SUPABASE_CONFIG.bucket).remove([path]);
    const id = parseAssetIdFromStoragePath(path);
    if (id) {
        await client.from(SUPABASE_CONFIG.assetsTable).delete().eq('id', id);
    }
}

export async function downloadFile(path) {
    const client = await getSupabaseClient();
    await requireUser(client);
    const { data, error } = await client.storage
        .from(SUPABASE_CONFIG.bucket)
        .download(path);
    if (error) {
        const downloadError = new Error(error.message || t('errors.supabaseRequestFailed'));
        downloadError.code = 'request';
        downloadError.cause = error;
        throw downloadError;
    }
    return {
        arrayBuffer: await data.arrayBuffer(),
        contentType: data.type || '',
    };
}

export async function testConnection() {
    const client = await getSupabaseClient();
    await requireUser(client);
    const { error } = await client
        .from(SUPABASE_CONFIG.assetsTable)
        .select('id')
        .limit(1);
    if (error) {
        const requestError = new Error(error.message || t('errors.supabaseRequestFailed'));
        requestError.code = 'request';
        requestError.cause = error;
        throw requestError;
    }
    return true;
}

export function buildRawUrl() {
    return '';
}

export function looksLikePat() {
    return false;
}

export default {
    getConfig,
    subscribe,
    isConfigured,
    readManifest,
    writeManifest,
    deleteManifest,
    uploadFile,
    uploadFileObject,
    deleteFile,
    testConnection,
    buildRawUrl,
    downloadFile,
    looksLikePat,
};
