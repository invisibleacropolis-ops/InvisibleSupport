/**
 * @fileoverview Video-specific public API over the shared native media player.
 */

import { createMediaPlayer } from '../media/player-controller.js';
import { isVideoDocument } from './types.js';

const player = createMediaPlayer({ kind: 'video', isMediaDocument: isVideoDocument });

export const init = player.init;
export const playVideo = player.playItem;
export const enqueue = player.enqueue;
export const removeFromQueue = player.removeFromQueue;
export const clearQueue = player.clearQueue;
export const getSelectedId = player.getSelectedId;
export const isPlaylistEnabled = player.isPlaylistEnabled;
export const getQueueIds = player.getQueueIds;

export default {
    init,
    playVideo,
    enqueue,
    removeFromQueue,
    clearQueue,
    getSelectedId,
    isPlaylistEnabled,
    getQueueIds,
};
