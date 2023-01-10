import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';
import 'ptcs-behavior-focus/ptcs-behavior-focus.js';
import 'ptcs-behavior-tooltip/ptcs-behavior-tooltip.js';
import 'ptcs-label/ptcs-label.js';
import 'ptcs-accordion/ptcs-accordion.js';
import './ptcs-menu-item.js';
import './ptcs-menu-submenu.js';
import './ptcs-menu-flyout.js';
import './ptcs-menu-header.js';
import './ptcs-menu-footer.js';
import 'ptcs-icons/cds-icons.js';

PTCS.Menubar = class extends PTCS.BehaviorTooltip(PTCS.BehaviorFocus(PTCS.BehaviorStyleable(PTCS.ThemableMixin(PolymerElement)))) {
    static get template() {
        return html`
      <style>
        :host {
          cursor: default;
          display: inline-flex;
          flex-wrap: nowrap;

          height: 100%;

          box-sizing: border-box;

          white-space: nowrap;
          overflow: hidden;
          outline: none;
        }

        :host([hidden]) {
          display: none;
        }

        :host([disabled]) {
            cursor: default;
        }

        [part=root] {
            display: flex;
            flex-direction: row;
            box-sizing: border-box;
            width: 100%;
            position: relative;
        }

        [part=expand] {
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            box-sizing: border-box;
            height: 100%;
        }

        [part=handle][hidden] {
            display: none;
        }

        [part=handle]:not([disabled]) {
            cursor: ew-resize;
        }

        [part=handle]:not([hidden]) {
            display: flex;
            position: absolute;
            flex-shrink: 0;
            flex-direction: row;
            align-items: center;
        }

        [part=handle]:not([hidden]):before {
            position: absolute;
            content: '';
            top: -20px;
            right: -10px;
            left: 0px;
            bottom: -20px;
        }

        [part=header-icon]:not([disabled]) {
            cursor: pointer;
        }

        [part=main-area] {
            height: 100%;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
        }

        [part=header] {
            display: flex;
            flex-direction: row;
            box-sizing: border-box;
            align-items: center;
            flex-grow: 0;
            flex-shrink: 0;
        }

        [part=header][hidden] {
            display: none;
        }

        [part=footer] {
            flex-grow: 0;
            flex-shrink: 0;
            box-sizing: border-box;
        }

        [part=items-area] {
            height: 100%;
            box-sizing: border-box;
            overflow: hidden auto;
        }

        [part=flyout] {
            width: 100%;
        }

        [part=items-area]::-webkit-scrollbar {
            width: 6px;
        }

        [part=items-area]::-webkit-scrollbar-thumb {
            width: 6px;
            background-color: #909090;
            border-radius: 3px;
        }

        [part=accordion][hidden] {
            display: none;
        }

      </style>

      <div id="root" part="root">
        <div id="mainarea" part="main-area">
          <ptcs-menu-header id="header" part="header" hidden$="[[_hideHeader(alwaysOpen)]]" display-icons="true"
            icon-width="[[iconWidth]]" icon-height="[[iconHeight]]" compact-mode="[[compactMode]]" icon="cds:icon_hamburger"
            disabled="[[disabled]]" ignore-click tabindex\$="[[_delegatedFocus]]">
          </ptcs-menu-header>
          <div id="itemsarea" part="items-area">
            <template is="dom-if" if="[[_isFlyout(menuType)]]">
              <ptcs-menu-flyout
                id="flyout"
                icon-width="[[iconWidth]]"
                icon-height="[[iconHeight]]"
                part="flyout"
                items="[[items]]"
                items2="[[items2]]"
                allow-missing-icons="[[allowMissingIcons]]"
                display-icons-in-upper-region="[[displayIconsInUpperRegion]]"
                display-icons-in-lower-region="[[displayIconsInLowerRegion]]"
                compact-mode="[[compactMode]]"
                more-items-icon="[[moreItemsIcon]]"
                more-items-label="[[moreItemsLabel]]"
                max-menu-items="[[maxMenuItems]]"
                max-submenu-items="[[maxSubmenuItems]]"
                menu-max-width="[[menuMaxWidth]]"
                menu-min-width="[[menuMinWidth]]"
                disabled="[[disabled]]"
                tabindex\$="[[_delegatedFocus]]"></ptcs-menu-flyout>
            </template>
            <template is="dom-if" if="[[_isAccordion(menuType)]]">
              <ptcs-accordion
                id="accordion"
                icon-width="[[iconWidth]]"
                icon-height="[[iconHeight]]"
                part="accordion"
                variant="menu"
                items="[[_mergeItems(items, items2)]]"
                multiple-open-items="true"
                trigger-can-collapse="true"
                trigger-type="plus/minus"
                allow-missing-icons="[[allowMissingIcons]]"
                display-icons="[[displayIconsInUpperRegion]]"
                disabled="[[disabled]]"
                hidden$="[[_hideIfCompactMode(compactMode)]]"
                tabindex\$="[[_delegatedFocus]]"></ptcs-accordion>
            </template>
          </div>
          <ptcs-menu-footer id="footer" part="footer" compact-mode="[[compactMode]]" item="[[brandingItem]]" tabindex\$="[[_delegatedFocus]]"
            text="[[brandingItem.label]]" icon="[[brandingItem.icon]]" logo="[[brandingItem.logo]]" disabled="[[brandingItem.disabled]]"
            hidden$="[[_hideBrandingArea(hideBrandingArea, item)]]"></ptcs-menu-footer>
        </div>
        <div id="expand" part="expand">
          <div part="handle" id="handle" hidden$="[[_hideIfCompactMode(compactMode, preventResize)]]" disabled$="[[disabled]]">
            <ptcs-icon part="handle-icon" icon="cds:icon_drag"></ptcs-icon>
          </div>
        </div>
      </div>`;
    }

    static get is() {
        return 'ptcs-menubar';
    }

    static get properties() {
        return {
            menuType: {
                type:  String,
                value: 'flyout'
            },

            items: {
                type:  Array,
                value: () => []
            },

            items2: {
                type:  Array,
                value: () => []
            },

            maxMenuItems: {
                type: Number
            },

            maxSubmenuItems: {
                type: Number
            },

            moreItemsIcon: {
                type:  String,
                value: 'cds:icon_more_horizontal'
            },

            moreItemsLabel: {
                type:  String,
                value: 'More...'
            },

            hideBrandingArea: {
                type: Boolean
            },

            brandingItem: {
                type:  Object,
                value: null
            },

            iconWidth: {
                type: String
            },

            iconHeight: {
                type: String
            },

            allowMissingIcons: {
                type:     Boolean,
                observer: '_updateFillMissingIcons'
            },

            fillMissingIcons: {
                type:     Boolean,
                value:    false,
                observer: '_updateAllowMissingIcons'
            },

            stayOpenAfterSelection: {
                type:  Boolean,
                value: false
            },

            alwaysOpen: {
                type:  Boolean,
                value: false
            },

            preventResize: {
                type:  Boolean,
                value: false
            },

            displayIconsInUpperRegion: {
                type:  Boolean,
                value: false
            },

            displayIconsInLowerRegion: {
                type:  Boolean,
                value: false
            },

            compactMode: {
                type:               Boolean,
                observer:           '_updateDisableCompactMode',
                reflectToAttribute: true
            },

            disableCompactMode: {
                type:     Boolean,
                value:    false,
                observer: '_updateCompactMode'
            },

            resizeHandleHidden: {
                type:               Boolean,
                computed:           '_hideIfCompactMode(compactMode, preventResize)',
                readOnly:           true,
                reflectToAttribute: true
            },

            minWidth: {
                type:     String,
                observer: '_minWidthChanged'
            },

            maxWidth: {
                type:     String,
                observer: '_maxWidthChanged'
            },

            compactWidth: {
                type: String
            },

            menuMaxWidth: {
                type: String
            },

            menuMinWidth: {
                type: String
            },

            matchSelectorF: {
                // Function that determines if a given menu item matches a 'selectedKey' string---this allows
                // the user to use any property in the item, not just matching e.g. the title
                type: Function
            },

            selectedKey: {
                // The 'key' to select (interpreted by the matchSelectorF function)
                type: String
            },

            selectedIndexesPrimary: {
                type:   Array,
                notify: true,
                value:  () => []
            },

            selectedIndexesSecondary: {
                type:   Array,
                notify: true,
                value:  () => []
            },

            disabled: {
                type:               Boolean,
                value:              false,
                reflectToAttribute: true
            },

            _delegatedFocus: {
                type:  String,
                value: null
            }
        };
    }

    static get observers() {
        return ['_selectedKeyChanged(selectedKey, matchSelectorF)'];
    }

    ready() {
        super.ready();

        // The new "reveal" icon should also toggle the compact mode...
        this.$.header.addEventListener('click', ev => this._toggleCompactMode());

        // For keyboard navigation / managing focus
        this.$.header.addEventListener('keydown', ev => {
            if (ev.key === ' ' || ev.key === 'Enter') {
                this._toggleCompactMode();
            }
        });

        this.addEventListener('action', ev => this._selectionMade(ev));

        this.$.handle.addEventListener('touchstart', ev => this._mouseDown(ev, true));
        this.$.handle.addEventListener('mousedown', ev => this._mouseDown(ev));
    }

    connectedCallback() {
        super.connectedCallback();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    _hideBrandingArea(hideBrandingArea, item) {
        return hideBrandingArea || (item && !item.label && !item.icon && !item.logo);
    }

    _isFlyout(menuType) {
        return menuType === 'flyout';
    }

    _isAccordion(menuType) {
        return menuType === 'nested';
    }

    _minWidthChanged(minWidth) {
        if (this.compactMode) {
            // In compactMode, the min-width is temporarily disabled---so store it for later use
            this.__previousMinWidth = minWidth;
            return;
        }
        const v = PTCS.cssDecodeSize(minWidth);
        this.style.minWidth = v > 0 ? `${v}px` : '';
    }

    _maxWidthChanged(maxWidth) {
        if (this.compactMode) {
            // In compactMode, the max-width is temporarily disabled---so store it for later use
            this.__previousMaxWidth = maxWidth;
            return;
        }
        const v = PTCS.cssDecodeSize(maxWidth);
        this.style.maxWidth = v > 0 ? `${v}px` : '';
    }

    _adjustWidth(compactMode) {
        // The compactMode has changed, so adjust the width(s) accordingly
        if (compactMode) {
            // Store the width values (if any) in the previous "expanded" mode
            this.__previousWidth = this.style.width;
            this.__previousMinWidth = this.minWidth;
            this.__previousMaxWidth = this.maxWidth;

            // Set the width and temporarily disable the max/min widths while we are in compact mode
            const v = PTCS.cssDecodeSize(this.compactWidth);
            this.style.width = v > 0 ? `${v}px` : '';
            this.style.minWidth = this.style.maxWidth = 'unset';
        } else {
            // Reset the values to what they were before (or to what they were updated to while in compactMode)
            this.style.width = this.__previousWidth;
            this._minWidthChanged(this.__previousMinWidth);
            this._maxWidthChanged(this.__previousMaxWidth);
        }
    }

    _selectedKeyChanged(selectedKey, matchSelectorF) {
        if (selectedKey && typeof matchSelectorF === 'function') {
            if (this.menuType === 'flyout') {
                const flyoutEl = this.shadowRoot.querySelector('[part=flyout]');
                if (!flyoutEl.selectKey(selectedKey, matchSelectorF)) {
                    // Not found, clear selection
                    flyoutEl._setSelectedItem();
                    // Clear any "top-level" selection as well
                    if (flyoutEl._selectedTopLevelItem) {
                        flyoutEl._selectedTopLevelItem.selected = false;
                        flyoutEl._selectedTopLevelItem = null;
                    }
                }
            } else if (this.menuType === 'nested') {
                const accordionEl = this.shadowRoot.querySelector('[part=accordion]');
                if (!accordionEl.selectKey(selectedKey, matchSelectorF)) {
                    // Not found, clear selection
                    accordionEl._clearSelection();
                }
            }
        }
    }

    _selectionMade(ev) {
        // Clear any previous "manual" selection
        this.selectedKey = '';

        // Intercept all menu selections and "collapse" the menu (if so configured)
        if (this.menuType === 'nested' && !this.stayOpenAfterSelection && !this.alwaysOpen) {
            this.compactMode = true;
        }
    }

    _hideHeader(alwaysOpen) {
        if (alwaysOpen) {
            this.compactMode = false;
        }
        return !!alwaysOpen;
    }

    _hideIfCompactMode(compactMode, preventResize) {
        if (preventResize) {
            return true;
        }
        return !!compactMode;
    }

    __getXPosFromEvent(ev) {
        let posX;
        if (ev.clientX) {
            posX = ev.clientX;
        } else if (ev.targetTouches) {
            posX = ev.targetTouches[0].clientX;
            // Prevent default behavior
            ev.preventDefault();
        }

        return posX;
    }

    _resize(ev, initialPosX, initialWidth) {
        const posX = this.__getXPosFromEvent(ev);
        const delta = posX - initialPosX;
        this.style.width = `${initialWidth + delta}px`;
        ev.preventDefault();
    }

    _mouseDown(ev, touch = false) {
        if (this.disabled) {
            return;
        }

        const posX = this.__getXPosFromEvent(ev);

        // Get the inital Width of the menu
        const cs = getComputedStyle(this);
        const widthStr = cs.getPropertyValue('width');
        const initialWidth = Number(widthStr.substr(0, widthStr.indexOf('px'))) || 0;

        const mouseMoveEv = touch ? 'touchmove' : 'mousemove';
        const mouseUpEv = touch ? 'touchend' : 'mouseup';

        let mmv = ev1 => this._resize(ev1, posX, initialWidth);

        let mup = () => {
            // Done resizing
            window.removeEventListener(mouseMoveEv, mmv);
            window.removeEventListener(mouseUpEv, mup);
        };

        window.addEventListener(mouseMoveEv, mmv);
        window.addEventListener(mouseUpEv, mup);
    }

    _mergeItems(items, items2) {
        return [...items, ...items2];
    }

    _toggleCompactMode() {
        if (this.disabled) {
            // Disable the handle as well
            return;
        }

        // In case the current item was showing a tooltip, close it...
        this._tooltipClose();

        this.compactMode = !this.compactMode;
    }

    _updateFillMissingIcons(v) {
        this.fillMissingIcons = !v;
    }

    _updateAllowMissingIcons(v) {
        this.allowMissingIcons = !v;
    }

    _updateDisableCompactMode(v) {
        this.disableCompactMode = !v;
    }

    _updateCompactMode(v) {
        this.compactMode = !v;

        this._adjustWidth(this.compactMode);
    }
};

customElements.define(PTCS.Menubar.is, PTCS.Menubar);
