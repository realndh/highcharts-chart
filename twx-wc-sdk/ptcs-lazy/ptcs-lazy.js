import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import '@polymer/polymer/lib/elements/dom-if';
import {PTCS} from 'ptcs-library/library.js';
import {BehaviorLazy} from './ptcs-behavior-lazy.js';

export const Lazy = class extends BehaviorLazy(PolymerElement) {
    static get is() {
        return 'ptcs-lazy';
    }

    static get properties() {
        return {
            mode: {
                type:               String,
                value:              Lazy.LAZY,
                reflectToAttribute: true,
            }
        };
    }

    // /** @type {DomIf} */
    // __domIf;

    get shouldLazyLoad() {
        return this.mode !== Lazy.NONE;
    }

    get shouldReload() {
        return this.mode === Lazy.RELOAD;
    }

    get shouldUnload() {
        return this.mode === Lazy.UNLOAD;
    }

    async init() {
        this._initFromChild(await PTCS.waitForChild(this));
    }

    /**
     *
     * @param {HTMLElement|ChildNode} child
     */
    _initFromChild(child) {
        /* istanbul ignore else: angular */
        if (child.nodeType === Node.ELEMENT_NODE) {
            /* istanbul ignore else: explicit dom-if */
            if (child.tagName === 'TEMPLATE') {
                const template = child;
                child = document.createElement('dom-if');
                child.setAttribute('restamp', 'restamp');
                child.append(template);
                child = this.appendChild(child);
            }

            /* istanbul ignore else: extension */
            if (child.tagName === 'DOM-IF') {
                this._initFromDomIf(/** @type {DomIf} */(child));
            }
        }
    }

    /**
     * @param {HTMLElement} domIf
     */
    _initFromDomIf(domIf) {
        this.__domIf = domIf;
    }

    async realLoad() {
        const p = PTCS.waitForEvent(this, 'dom-change');
        /* istanbul ignore else: angular */
        if (this.__domIf) {
            this.__domIf.if = true;
        }
        await p;
    }

    async realUnload() {
        const p = PTCS.waitForEvent(this, 'dom-change');
        /* istanbul ignore else: angular */
        if (this.__domIf) {
            this.__domIf.if = false;
        }
        await p;
    }
};

Lazy.NONE = 'none';
Lazy.LAZY = 'lazy';
Lazy.RELOAD = 'reload';
Lazy.UNLOAD = 'unload';

PTCS.Lazy = Lazy;

customElements.define(PTCS.Lazy.is, PTCS.Lazy);
