import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';
import {FlattenedNodesObserver} from '@polymer/polymer/lib/utils/flattened-nodes-observer.js';

PTCS.PageSelect = class extends PolymerElement {
    static get template() {
        return html`
  <style>
    :host {
      flex: 1 1 auto;
      position: relative;
    }

    #root {
      flex: 1 1 auto;
      display: flex;
      justify-content: space-between;
      align-items: stretch;
    }

    div ::slotted(.ps--hide) {
      display: none !important;
    }

    ::slotted(.ps--hide) {
      display: none !important;
    }
  </style>

  <div id="root">
    <slot id="slot"></slot>
  </div>
`;
    }

    static get is() {
        return 'ptcs-page-select';
    }

    static get properties() {
        return {
            disabled: {
                type:  Boolean,
                value: false
            },

            selected: {
                observer:           '_selected',
                reflectToAttribute: true,
                notify:             true
            },

            attrForSelected: {
                type:  String,
                value: null
            },

            fallbackSelection: {
                type:  String,
                value: null
            }
        };
    }

    /**
* Find all nodes in the slot of nodeType 1
* TODO:  Can this be safely memoized?
*/
    _getSlottedElements() {
        let nodes = this.$.slot.assignedNodes({flatten: true});
        return nodes.filter(node => node.nodeType === Node.ELEMENT_NODE);
    }

    _initSelection() {
        const nodes = this._getSlottedElements();
        const sel = this._find_selected(nodes, this.selected);
        nodes.forEach(node => this._select_node(node, node === sel));
    }

    connectedCallback() {
        super.connectedCallback();

        // Watch changes in the slotted content
        if (!this._observer) {
            this._observer = new FlattenedNodesObserver(this.$.slot, () => this._initSelection());
        } else {
            this._observer.connect();
        }

        this._initSelection();
    }

    disconnectedCallback() {
        if (this._observer._connected) {
            this._observer.disconnect();
        }
        super.disconnectedCallback();
    }

    select(selected) {
        this.selected = selected;
    }

    // Not smart and not fast...
    indexOf(el) {
        const nodes = this._getSlottedElements();
        let ix = 0;

        for (let i = 0; i < nodes.length; ++i) {
            let node = nodes[i];

            if (node.nodeName && node.nodeType === 1) {
                if (this._contains_node(nodes[i], el)) {
                    return ix;
                }
                ++ix;
            }
        }
        return -1;
    }

    _contains_node(el1, el2) {
        if (el1 === el2) {
            return true;
        }

        for (el1 = el1.firstChild; el1; el1 = el1.nextSibling) {
            if (this._contains_node(el1, el2)) {
                return true;
            }
        }

        return false;
    }

    _selected(selected, old) {
        const nodes = this._getSlottedElements();
        const sel = (selected || typeof selected === 'number') && this._find_selected(nodes, selected);
        const unsel = (old || typeof old === 'number') && this._find_selected(nodes, old);

        if (unsel) {
            this._select_node(unsel, false);
        }
        if (sel) {
            this._select_node(sel, true);
        }
    }

    // Compute the selected node
    _find_selected(nodes, selected) {
        let found = null;

        if (this.attrForSelected) {
            let fb = null; // fallback node

            nodes.map((node) => {
                const val = node.getAttribute(this.attrForSelected);

                if (val === selected) {
                    found = node;
                }

                if (!fb && val === this.fallbackSelection) {
                    fb = node; // Found a fallback
                }
            });

            return found ? found : fb;
        }

        const sel_ix = Number(selected);
        found = nodes[sel_ix];

        return found;
    }

    // Select or unselect node
    _select_node(node, select) {
        if (node.opened !== undefined) {
            node.opened = select;
        } else if (select) {
            node.classList.remove('ps--hide');
            node.hidden = false;
        } else {
            node.hidden = true;
            node.classList.add('ps--hide');
        }
    }
};

customElements.define(PTCS.PageSelect.is, PTCS.PageSelect);
