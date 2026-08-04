/**
 * @fileoverview Shared audio asset detection for the library and player.
 */

const AUDIO_EXTENSIONS = new Set([
    'aac',
    'flac',
    'm4a',
    'mp3',
    'oga',
    'ogg',
    'opus',
    'wav',
    'wave',
    'weba',
]);

export function getExtension(name) {
    const parts = String(name || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
}

export function isAudioDocument(documentRecord) {
    const type = String(documentRecord?.type || '').toLowerCase();
    if (type.startsWith('video/')) return false;
    return type.startsWith('audio/') || AUDIO_EXTENSIONS.has(getExtension(documentRecord?.name));
}

export default { getExtension, isAudioDocument };
