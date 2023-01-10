import {PTCS} from 'ptcs-library/library.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';
import {setTooltipByFocus} from 'ptcs-behavior-tooltip/ptcs-behavior-tooltip.js';
import './ptcs-focus-overlay.js';

/* eslint-disable no-confusing-arrow */

const _ptcsFocusOverlay = 'ptcs-focus-overlay';

/************************ DelegatedFocus polyfill ************************/
export function tabIndex(el) {
    if (el.tabIndex >= 0) {
        return el.tabIndex;
    }
    switch (el.tagName) {
        case 'INPUT':
        case 'SELECT':
        case 'TEXTAREA':
        case 'BUTTON':
        case 'OBJECT':
            return 0;
        case 'A':
            return el.hasAttribute('href');
            //case 'AREA':
              // area elements are focusable if they:
              // - are inside a named map, and
              // - have an href attribute, and
              // - there is a visible image using the map
              // Ignore for now...
    }
    return -1;
}

function containerOf(el) {
    for (el = el.parentNode; el; el = el.parentNode) {
        if (el.nodeType === 11 && el.host) {
            return el.host;
        }
    }
    return document.body;
}

function focusOf(el) {
    for (; el; el = el.parentNode) {
        if (el.nodeType === 11 && el.host) {
            return el.host.shadowRoot.activeElement;
        }
    }
    return document.activeElement;
}

function selectNextFocus(cntr, el, backwards) {
    // tiCurr used to default to 0, which caused issues when stepping backwards
    // if the next component had a tabindex of 1 or higher...then it was never
    // considered a "candidate"...
    const defaultCurr = backwards ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
    const tiCurr = el ? tabIndex(el) : defaultCurr; // Current value
    let before = el ? true : backwards; // Is looped element before el?
    let elBest;
    let tiBest;

    function candidate(ti, _el) {
        if (backwards) {
            if (ti > tiCurr) {
                // Going backwards. Higher tabindexes are already behind
                return false;
            }
            if (ti === tiCurr && !before) {
                // Same tabindex. Based of DOM order
                return false; // Only a candidate if tested element is before el
            }
        } else {
            if (ti < tiCurr) {
                // Going forwards. Lower tabindexes are already behind
                return false;
            }
            if (ti === tiCurr && before) {
                // Same tabindex. Based of DOM order
                return false; // Only a candidate if tested element is after el
            }
        }
        // Only focus on visible elements
        return (_el.clientWidth > 0 || _el.clientHeight > 0);
    }

    function better(ti) {
        return backwards ? tiBest <= ti : tiBest > ti;
    }

    function loop(e) {
        for (e = e.firstChild; e; e = e.nextSibling) {
            if (e === el) {
                before = false;
            } else {
                const ti = tabIndex(e);
                if (ti >= 0 && candidate(ti, e) && (!elBest || better(ti))) {
                    elBest = e;
                    tiBest = ti;
                }
            }
            loop(e);
        }
    }

    loop(cntr);
    return elBest;
}

function delegateToLast(el) {
    const preventScroll = !!el._preventFocusAutoScroll;

    for (;;) {
        let subEl = selectNextFocus(el.shadowRoot || el, null, true);
        if (!subEl) {
            break;
        }
        el = subEl;
    }
    for (; el; el = containerOf(el)) {
        el.focus({preventScroll});
        const fe = focusOf(el);
        if (fe === el || el.contains(fe)) {
            return true;
        }
        console.warn('Failed to focus on ' + el.tagName + '. Focus on parent');
    }
    return false;
}

export function delegateToPrev(el) {
    const cntr = containerOf(el);
    const prevEl = selectNextFocus(cntr.shadowRoot || cntr, el, true);
    if (prevEl) {
        return delegateToLast(prevEl);
    }
    for (let e = el.parentNode; e; e = e.parentNode) {
        if (e.nodeType === 11 && e.host) {
            if (e.host._isFocusDelegating && e.host._isFocusDelegating()) {
                return delegateToPrev(e.host);
            }
            e.host.focus();
            if (focusOf(e.host) === e.host) {
                return true;
            }
            console.warn('Failed to focus on ' + e.host.tagName);
            return delegateToPrev(e.host);
        }
    }
    return false;
}

export function delegateToNext(element) {
    const parent = e => (e.nodeType === 11 && e.host) ? e.host : e.parentNode;
    const following = e => {
        for (e = parent(e); e; e = parent(e)) {
            if (e.nextElementSibling) {
                return e.nextElementSibling;
            }
        }
        return null;
    };

    let tiBest = -1;
    let elBest;
    let el = element.nextElementSibling || following(element);

    while (el) {
        const ti = tabIndex(el);
        if (ti > tiBest && el.clientHeight > 0) {
            tiBest = ti;
            elBest = el;
        }
        if (el.firstElementChild) {
            el = el.firstElementChild;
        } else if (el.nextElementSibling) {
            el = el.nextElementSibling;
        } else if (elBest) {
            break; // If we have a focusable element in this host, use it
        } else {
            el = following(el);
        }
    }

    if (elBest) {
        elBest.focus();
    }
    return elBest;
}

// Focus event handler for polyfilled component that delegates focus
function delegatingFocusEv(ev) {
    const el = ev.target;

    // Someone used the keyboard. Make sure focus didn't slip (if Shift-Tab)
    function keyUp(e) {
        if (!el.shadowRoot.activeElement && e.shiftKey && e.key === 'Tab') {
            if (!delegateToPrev(el)) {
                el.blur();
            }
        }
    }

    // Someone clicked on the component. Make sure focus didn't slip
    function mouseUp() {
        if (!el.shadowRoot.activeElement) {
            const subEl = selectNextFocus(el.shadowRoot);
            if (subEl) {
                subEl.focus({preventScroll: !!el._preventFocusAutoScroll});
            }
        }
    }

    el.addEventListener('keyup', keyUp);
    el.addEventListener('mouseup', mouseUp);
    el.addEventListener('blur', () => {
        el.removeEventListener('keyup', keyUp);
        el.removeEventListener('mouseup', mouseUp);
        setTooltipByFocus(); // Just in case this element was stuck with the focus
    }, {once: true});

    // Delegate focus
    if (!el.shadowRoot.activeElement) {
        const subEl = selectNextFocus(el.shadowRoot);
        if (subEl) {
            subEl.focus({preventScroll: !!el._preventFocusAutoScroll});
        }
        if (!el.shadowRoot.activeElement) {
            // Delegating element stuck with focus. Must help tooltip
            setTooltipByFocus();
        }
    }
}

// Replacement for standard focus() when element delegates focus
// If needed, delegates focus to the first focusable element in the shadow dom
function focusFunc() {
    if (!this.shadowRoot.activeElement) {
        for (let el = selectNextFocus(this.shadowRoot); el; el = selectNextFocus(this.shadowRoot, el)) {
            el.focus();
            if (this.shadowRoot.activeElement) {
                return; // Success
            }
            console.warn(this.tagName + ': could not forward focus to ' + el.tagName);
        }
        // Since we can't focus on _any_ sub element, we have to take the focus ourselves...
        Object.getPrototypeOf(this).focus.call(this);
    }
}

/************************ /DelegatedFocus ************************/

function getFocusOverlayElem() {
    let el = document.getElementById(_ptcsFocusOverlay);
    if (!el) {
        el = document.createElement(_ptcsFocusOverlay);
        el.setAttribute('id', _ptcsFocusOverlay);
        document.body.appendChild(el);
    }
    return el;
}

// Compute visible rect of element. Visibility is determined by the elementFromPoint() function
function __getVisibleRect(el, enabledPointerEvents) {
    const r = el.getBoundingClientRect();
    const width = r.right - r.left;
    const height = r.bottom - r.top;

    // Compute offsets to corners, taking border radius into account
    const cs = getComputedStyle(el);
    const d = prop => {
        const x = PTCS.cssDecodeSize(cs[prop], el);
        return isNaN(x) ? 0 : x;
    };
    // eslint-disable-next-line max-len
    const radius = Math.max(d('border-top-left-radius'), d('border-top-right-radius'), d('border-bottom-left-radius'), d('border-bottom-right-radius'));
    const x1 = r.left + radius + 1;
    const x2 = r.right - radius - 2;
    const y1 = r.top + radius + 1;
    const y2 = r.bottom - radius - 2;

    // Test if el is visible at specific position
    const root = el.getRootNode();
    const pick = (x, y) => {
        const e = root.elementFromPoint && root.elementFromPoint(x, y);
        return e === el || el.contains(e);
    };
    const p1 = pick(x1, y1); // left top corner
    const p2 = pick(x2, y1); // right top corner
    const p3 = pick(x1, y2); // left bottom corner
    const p4 = pick(x2, y2); // right bottom corner

    if (p1 && p2 && p3 && p4) {
        // All corners are visible
        return {x: r.left, y: r.top, w: width, h: height};
    }
    if (!p1 && !p2 && !p3 && !p4) {
        // No corners are visible
        if (enabledPointerEvents) {
            return null;
        }
        // Try again, with pointer-events turned on
        let result = null;
        const pe = el.style.pointerEvents;
        try {
            el.style.pointerEvents = 'auto';
            result = __getVisibleRect(el, true);
        } finally {
            el.style.pointerEvents = pe;
        }
        return result;
    }

    if (el.focusNoClipping) {
        // Show whole focus rectangle, even if element is not fully visible
        return {x: r.left, y: r.top, w: width, h: height};
    }

    // Use binary search to find clipping line
    // - length: number of pixels where clip line can occur
    // - cmp: index:[0, length - 1] => {-1 if clip line is before i, 1 if clip line is after i}
    const find = (length, cmp) => -1 - PTCS.binSearch({length}, cmp);

    if (p1 && p2) {
        // Top side is visible
        const h = find(height, i => pick(x1, r.top + i) ? -1 : 1);
        return {x: r.left, y: r.top, w: width, h, hide: {bottom: height > h}};
    }
    if (p3 && p4) {
        // Bottom side is visible
        const y = find(height, i => pick(x1, r.top + i) ? 1 : -1);
        return {x: r.left, y: r.top + y, w: width, h: height - y, hide: {top: y > 0}};
    }
    if (p1 && p3) {
        // Left side is visible
        const w = find(width, i => pick(r.left + i, y1) ? -1 : 1);
        return {x: r.left, y: r.top, w, h: height, hide: {right: width > w}};
    }
    if (p2 && p4) {
        // Right is visible
        const x = find(width, i => pick(r.left + i, y1) ? 1 : -1);
        return {x: r.left + x, y: r.top, w: width - x, h: height, hide: {left: x > 0}};
    }
    if (p1) {
        // Top left corner is visible
        const x = find(width, i => pick(r.left + i, y1) ? -1 : 1);
        const y = find(height, i => pick(x1, r.top + i) ? -1 : 1);
        return {x: r.left, y: r.top, w: x, h: y, hide: {right: width > x, bottom: height > y}};
    }
    if (p2) {
        // Top right corner is visible
        const x = find(width, i => pick(r.left + i, y1) ? 1 : -1);
        const y = find(height, i => pick(x2, r.top + i) ? -1 : 1);
        return {x: r.left + x, y: r.top, w: width - x, h: y, hide: {left: x > 0, bottom: height > y}};
    }
    if (p3) {
        // Bottom left corner is visible
        const x = find(width, i => pick(r.left + i, y2) ? -1 : 1);
        const y = find(height, i => pick(x1, r.top + i) ? 1 : -1);
        return {x: r.left, y: r.top + y, w: x, h: height - y, hide: {top: y > 0, right: width > x}};
    }
    if (p4) {
        // Bottom right corner is visible
        const x = find(width, i => pick(r.left + i, y2) ? 1 : -1);
        const y = find(height, i => pick(x2, r.top + i) ? 1 : -1);
        return {x: r.left + x, y: r.top + y, w: width - x, h: height - y, hide: {left: x > 0, top: y > 0}};
    }

    // Unreachable
    return null;
}

function getVisibleRect(el) {
    const r = __getVisibleRect(el);
    if (r) {
        const b = document.documentElement.getBoundingClientRect();
        r.x -= b.left;
        r.y -= b.top;
    }
    return r;
}

export function getFocusHiliteEl(e) {
    if (!e.__elHilite) {
        return e;
    }
    if (typeof e.__elHilite === 'function') {
        return e.__elHilite();
    }
    return e.__elHilite;
}


// Show focus border for focused element
function trackFocusWindow(el, preBoundHilite) {
    if (el !== PTCS.BehaviorFocus._focusEl) {
        return; // el has lost focus
    }

    const hiliteEl = getFocusHiliteEl(el);
    const boundHilite = hiliteEl && getVisibleRect(hiliteEl);
    if (boundHilite) {
        boundHilite.__hiliteEl = hiliteEl;
        // Has element moved since we last drew a focus border?
        if (boundHilite.__hiliteEl !== preBoundHilite.__hiliteEl ||
                boundHilite.x !== preBoundHilite.x || boundHilite.y !== preBoundHilite.y ||
                boundHilite.w !== preBoundHilite.w || boundHilite.h !== preBoundHilite.h) {
            getFocusOverlayElem().show(hiliteEl, boundHilite);
            // Notify the tooltip behavior that a new element is hilited
            setTooltipByFocus(hiliteEl);
        }
        requestAnimationFrame(() => trackFocusWindow(el, boundHilite));
    } else {
        getFocusOverlayElem().hide();
        requestAnimationFrame(() => trackFocusWindow(el, {}));
    }
}

// Callback for focus event
function focusEv(ev) {
    const el = ev.target;

    if (el.shadowRoot && el.shadowRoot.activeElement) {
        // This element got a focus event, but a sub-element already has focus. Confusing. Ignore it.
        return;
    }

    setTooltipByFocus();

    PTCS.BehaviorFocus._focusEl = el;

    if (typeof el._notifyFocus === 'function') {
        el._notifyFocus();
    }

    trackFocusWindow(el, {});
}

// Callback for blur event
function blurEv(ev) {
    const el = ev.target;

    if (el.shadowRoot && el.shadowRoot.activeElement) {
        // This should *never* happen - but is here just in case (mirrors focusEv, where something similar sometimes *do* happen)
        return;
    }

    PTCS.BehaviorFocus._focusEl = null;

    setTooltipByFocus();

    getFocusOverlayElem().hide();

    if (typeof el._notifyBlur === 'function') {
        el._notifyBlur();
    }
}

function tabindexChanged(tabindex) {
    switch (typeof tabindex) {
        case 'number':
            this._delegatedFocus = `${tabindex}`;
            break;
        case 'string':
            this._delegatedFocus = tabindex;
            break;
        case 'boolean':
            this._delegatedFocus = tabindex ? '0' : undefined;
            break;
        default:
            this._delegatedFocus = undefined;
    }
}

// behaviour that uses the ptcs-focus-overlay
PTCS.BehaviorFocus = superClass => {
    return class extends superClass {
        static get properties() {
            return {
                // Watch changes to the tabindex attribute
                tabindex: {
                    type: String
                }
            };
        }

        // Should this component delegate focus?
        _isFocusDelegating() {
            const properties = this.constructor.properties;
            return !!(properties && properties._delegatedFocus);
        }

        // Try to use Chromium delegatesFocus feature for focus delegating components
        /*
        _attachDom(dom) {
            if (this._isFocusDelegating() && dom && this.attachShadow && !this.shadowRoot) {
                this.attachShadow({mode: 'open', delegatesFocus: true});
                this.shadowRoot.appendChild(dom);
            }
            return super._attachDom(dom);
        }
        */

        // Track focus on el and put the focus border around elHilite
        _trackFocus(el, elHilite) {
            if (elHilite && elHilite !== el) {
                el.__elHilite = elHilite;
            }
            el.addEventListener('focus', focusEv);
            el.addEventListener('blur', blurEv);
        }

        _untrackFocus(el) {
            el.removeEventListener('focus', focusEv);
            el.removeEventListener('blur', blurEv);
        }

        _setupDelegateFocus() {
            // tabindex
            this.$__tabindexChanged = tabindexChanged;
            this._createMethodObserver('$__tabindexChanged(tabindex)', false);

            if (this.tabindex !== undefined) {
                this.$__tabindexChanged(this.tabindex);
            }

            // Need polyfill for delegatesFocus?
            if (!this.shadowRoot.delegatesFocus) {
                this.addEventListener('focus', delegatingFocusEv);

                // Replace focus function
                this.focus = focusFunc;
            }
        }

        ready() {
            super.ready();

            // Setup component
            if (this._isFocusDelegating()) {
                // This component delegates its focus
                this._setupDelegateFocus();
            } else if (typeof this._initTrackFocus === 'function') {
                // This component wants to initialize the focus tracking itself
                this._initTrackFocus();
            } else {
                // This component uses the default focus tracking
                this._trackFocus(this);
            }

            // Listen to <space> or <enter> key?
            if (this._spaceActivate || this._enterActivate || this._arrowDownActivate) {
                // ARIA mandates keydown event for Enter / Space key handling
                this.addEventListener('keydown', ev => {
                    if (this.disabled) {
                        return; // Don't engage the click event if the element is disabled
                    }
                    const key = ev.which || ev.keyCode || ev.key; // ev.which and ev.keyCode are deprecated
                    if (((key === 32 || key === ' ' || key === 'Space') && this._spaceActivate) ||
                        ((key === 13 || key === 'Enter') && this._enterActivate) ||
                        ((key === 40 || key === 'ArrowDown') && this._arrowDownActivate)) {
                        this.click();
                        ev.preventDefault();
                    }
                });
            }
        }

        // Workaround for special focus problem (no focus event when focus moves from shadow-sub-item to self)
        _trackMyFocus() {
            if (PTCS.BehaviorFocus._focusEl === this) {
                return;
            }
            for (let ae = document.activeElement; ae; ae = ae.shadowRoot && ae.shadowRoot.activeElement) {
                if (ae === this) {
                    if (ae.shadowRoot && ae.shadowRoot.activeElement) {
                        // This element does not have direct focus - so it should not be tracked
                        return;
                    }
                    PTCS.BehaviorFocus._focusEl = this;
                    trackFocusWindow(this, {});
                }
            }
        }
    };
};

// Global focus
PTCS.BehaviorFocus._focusEl = null;
