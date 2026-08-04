/**
 * @fileoverview Video-specific public API over the shared media library.
 */

import { createMediaLibrary } from '../media/library-controller.js';
import * as VideoPlayer from './player.js';
import { isVideoDocument } from './types.js';

const library = createMediaLibrary({
    kind: 'video',
    isMediaDocument: isVideoDocument,
    player: {
        playItem: VideoPlayer.playVideo,
        enqueue: VideoPlayer.enqueue,
        getSelectedId: VideoPlayer.getSelectedId,
        isPlaylistEnabled: VideoPlayer.isPlaylistEnabled,
        getQueueIds: VideoPlayer.getQueueIds,
    },
});

export const init = library.init;
export const focusItem = library.focusItem;

export default { init, focusItem };
