/**
 * @fileoverview Dedicated video upload controller.
 */

import { createMediaUpload } from '../media/upload-controller.js';
import * as VideoPlayer from './player.js';
import * as VideoLibrary from './library.js';
import { isVideoDocument } from './types.js';

const upload = createMediaUpload({
    kind: 'video',
    isMediaDocument: isVideoDocument,
    selectItem: id => VideoPlayer.playVideo(id, { autoplay: false }),
    focusItem: VideoLibrary.focusItem,
});

export const init = upload.init;

export default { init };
