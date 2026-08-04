/**
 * @fileoverview Dedicated audio upload controller.
 */

import { createMediaUpload } from '../media/upload-controller.js';
import * as AudioPlayer from './player.js';
import * as AudioLibrary from './library.js';
import { isAudioDocument } from './types.js';

const upload = createMediaUpload({
    kind: 'audio',
    isMediaDocument: isAudioDocument,
    selectItem: id => AudioPlayer.playTrack(id, { autoplay: false }),
    focusItem: AudioLibrary.focusItem,
});

export const init = upload.init;

export default { init };
