/**
 * @fileoverview Shared video asset detection for uploads, library, and player.
 */

const VIDEO_EXTENSIONS = new Set([
    'm4v',
    'mov',
    'mp4',
    'ogv',
    'webm',
]);

export function getExtension(name) {
    const parts = String(name || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
}

export function isVideoDocument(documentRecord) {
    const type = String(documentRecord?.type || '').toLowerCase();
    if (type.startsWith('audio/')) return false;
    return type.startsWith('video/') || VIDEO_EXTENSIONS.has(getExtension(documentRecord?.name));
}

export default { getExtension, isVideoDocument };
