/**
 * @fileoverview Audio-specific public API over the shared media library.
 */

import { createMediaLibrary } from '../media/library-controller.js';
import * as AudioPlayer from './player.js';
import { isAudioDocument } from './types.js';

const library = createMediaLibrary({
    kind: 'audio',
    isMediaDocument: isAudioDocument,
    player: {
        playItem: AudioPlayer.playTrack,
        enqueue: AudioPlayer.enqueue,
        getSelectedId: AudioPlayer.getSelectedId,
        isPlaylistEnabled: AudioPlayer.isPlaylistEnabled,
        getQueueIds: AudioPlayer.getQueueIds,
    },
});

export const init = library.init;
export const focusItem = library.focusItem;

export default { init, focusItem };
