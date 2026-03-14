/**
 * @fileoverview Split-pane component for drag-to-resize panel layouts.
 * Each split pane contains two child panels separated by a draggable handle.
 * The handle updates a CSS custom property on the container to control the split ratio.
 */

const STORAGE_KEY_PREFIX = 'splitPane:';
const MIN_PANEL_PX = 200;
const HANDLE_WIDTH = 6;

/** @type {Map<HTMLElement, { cleanup: () => void }>} */
const instances = new Map();

/**
 * Persist the split position for a given pane ID.
 */
function save(id, pct) {
    try { localStorage.setItem(STORAGE_KEY_PREFIX + id, String(pct)); } catch { /* quota */ }
}

/**
 * Load persisted split position, or return null.
 */
function load(id) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PREFIX + id);
        if (raw !== null) {
            const n = parseFloat(raw);
            if (Number.isFinite(n) && n >= 15 && n <= 85) return n;
        }
    } catch { /* private browsing */ }
    return null;
}

/**
 * Initialize a single split-pane container.
 */
function initPane(container) {
    const handle = container.querySelector('[data-split-handle]');
    if (!handle || instances.has(container)) return;

    const paneId = container.dataset.splitId || '';
    const saved = paneId ? load(paneId) : null;
    if (saved !== null) {
        container.style.setProperty('--split-left', saved + '%');
    }

    let dragging = false;

    function onMove(e) {
        if (!dragging) return;
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const containerW = rect.width;

        const minPct = (MIN_PANEL_PX / containerW) * 100;
        const maxPct = ((containerW - MIN_PANEL_PX - HANDLE_WIDTH) / containerW) * 100;
        const pct = Math.max(minPct, Math.min(maxPct, (x / containerW) * 100));
        const rounded = Math.round(pct * 10) / 10;

        container.style.setProperty('--split-left', rounded + '%');
        handle.setAttribute('aria-valuenow', String(Math.round(rounded)));
    }

    function onUp() {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);

        if (paneId) {
            const val = parseFloat(container.style.getPropertyValue('--split-left'));
            if (Number.isFinite(val)) save(paneId, Math.round(val * 10) / 10);
        }
    }

    function onDown(e) {
        if (e.button && e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        handle.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
    }

    function onKeydown(e) {
        const step = e.shiftKey ? 5 : 1;
        const currentVal = parseFloat(container.style.getPropertyValue('--split-left')) || 50;
        let next = currentVal;

        if (e.key === 'ArrowLeft') { next = Math.max(15, currentVal - step); }
        else if (e.key === 'ArrowRight') { next = Math.min(85, currentVal + step); }
        else if (e.key === 'Home') { next = 15; }
        else if (e.key === 'End') { next = 85; }
        else return;

        e.preventDefault();
        container.style.setProperty('--split-left', next + '%');
        handle.setAttribute('aria-valuenow', String(Math.round(next)));
        if (paneId) save(paneId, Math.round(next * 10) / 10);
    }

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
    handle.addEventListener('keydown', onKeydown);

    instances.set(container, {
        cleanup() {
            handle.removeEventListener('mousedown', onDown);
            handle.removeEventListener('touchstart', onDown);
            handle.removeEventListener('keydown', onKeydown);
            onUp();
        }
    });
}

/**
 * Initialize all split-pane containers on the page.
 */
export function init() {
    document.querySelectorAll('.split-pane').forEach(initPane);
}

export default { init };
