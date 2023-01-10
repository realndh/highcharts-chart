import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';
import 'ptcs-icon/ptcs-icon.js';
import 'ptcs-label/ptcs-label.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';
import 'ptcs-behavior-focus/ptcs-behavior-focus.js';
import 'ptcs-behavior-tooltip/ptcs-behavior-tooltip.js';

PTCS.Button = class extends PTCS.BehaviorTooltip(PTCS.BehaviorFocus(PTCS.BehaviorStyleable(PTCS.ThemableMixin(PolymerElement)))) {

    static get template() {
        return html`
      <style>
        :host {
          user-select: none;
          -ms-user-select: none;
          position: relative;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          flex-wrap: nowrap;
          box-sizing: border-box;
        }

        :host([content-align='left']) {
          justify-content: flex-start;
        }

        :host([content-align='center']) {
          align-items: center;
          justify-content: center;
        }

        :host([content-align='right']) {
          justify-content: flex-end;
        }

        :host([aria-disabled="true"]) {
          cursor: auto;
        }

        :host([aria-disabled="false"]) {
          cursor: pointer;
        }

        [part="root"] {
          box-sizing: border-box;
          display: flex;
          align-self: center;
          align-items: center;
        }

        :host([icon-placement="right"]) [part="root"] {
            flex-direction: row-reverse;
        }

        [part="root"] {
          overflow: hidden;
          max-height: 100%;
          justify-content: center;
        }

        :host([mode="icon+label"]:not([icon-placement="right"])) ptcs-icon {
          margin-right: var(--ptcs-button-icon--sep, 8px);
        }

        :host([mode="icon+label"][icon-placement="right"]) ptcs-icon {
          margin-left: var(--ptcs-button-icon--sep, 8px);
        }

        :host([mode="label"]) ptcs-icon {
          display: none;
        }

        [part="label"] {
            min-width: unset;
            min-height: unset;
        }
      </style>
    <div part="root">
      <ptcs-icon exportparts\$="[[_exportparts]]" part="icon"
                 hidden\$="[[_hide(icon, iconSrc, svgIcon)]]"
                 icon="[[_icon(icon, iconSrc, svgIcon)]]"
                 size="[[_iconSize(iconWidth, iconHeight)]]" icon-width="[[iconWidth]]" icon-height="[[iconHeight]]"
                 icon-set\$="[[_iconSet(icon, iconSrc)]]"></ptcs-icon>
      <ptcs-label tooltip="[[tooltip]]" tooltip-icon="[[tooltipIcon]]" disable-tooltip="[[disableTooltip]]" part="label"
      label="[[label]]" multi-line=[[multiLine]] id="label" hidden\$="[[_hide(label)]]" horizontal-alignment="[[contentAlign]]"
      max-height="[[maxHeight]]" max-width="[[buttonMaxWidth]]" disclosure-control="ellipsis"></ptcs-label>
    </div>`;
    }

    static get is() {
        return 'ptcs-button';
    }

    static get properties() {
        return {
            variant: {
                type:               String,
                value:              'primary',
                reflectToAttribute: true
            },

            icon: {
                type:  String,
                value: null
            },

            iconWidth: {
                type: String
            },

            iconHeight: {
                type: String
            },

            iconSrc: {
                type:  String,
                value: null
            },

            svgIcon: {
                type:  String,
                value: null
            },

            iconPlacement: {
                type:               String,
                value:              'left',
                reflectToAttribute: true
            },

            label: {
                type:  String,
                value: null
            },

            contentAlign: {
                type:               String,
                value:              'center',
                reflectToAttribute: true
            },

            buttonMaxWidth: {
                type:     Number,
                observer: '_buttonMaxWidthChanged'
            },

            // Multi-line
            multiLine: {
                type:  Boolean,
                value: false
            },

            // Fixed max-height for multi-line
            maxHeight: {
                type: String
            },

            mode: {
                type:               String,
                computed:           '_computeMode(icon, iconSrc, svgIcon, label)',
                reflectToAttribute: true
            },

            disabled: {
                type:               Boolean,
                value:              false,
                reflectToAttribute: true
            },

            ariaDisabled: {
                type:               String,
                computed:           '_disabled(disabled)',
                reflectToAttribute: true
            },

            // FocusBehavior should simulate a click event when ArrowDown key is pressed. This is (currently)
            // only used in the Grid toolbar 'Display' button
            _arrowDownActivate: {
                type: Boolean
            },

            // FocusBehavior should simulate a click event when enter key is pressed
            _enterActivate: {
                type:     Boolean,
                value:    true,
                readOnly: true
            },

            // FocusBehavior should simulate a click event when space is pressed
            _spaceActivate: {
                type:     Boolean,
                value:    true,
                readOnly: true
            },

            // ARIA attributes

            ariaLabel: {
                type:               String,
                computed:           '_computeAriaLabel(label, tooltip)',
                reflectToAttribute: true
            },

            role: {
                type:               String,
                value:              'button',
                reflectToAttribute: true
            },

            _exportparts: {
                type:     String,
                readOnly: true,
                value:    PTCS.exportparts('icon-', PTCS.Icon)
            }
        };
    }

    _iconSize(iconWidth, iconHeight) {
        if (iconWidth || iconHeight) {
            return 'custom';
        }
        return 'small';
    }

    _buttonMaxWidthChanged(val) {
        if (val) {
            var unitTest = val + '';
            if (unitTest.indexOf('px') === -1) {
                this.style.maxWidth = val + 'px';
            } else {
                this.style.maxWidth = val;
            }
        } else {
            this.style.removeProperty('max-width');
        }
    }

    _hide(arg1, arg2, arg3) {
        return !(arg1 || arg2 || arg3);
    }

    _icon(icon, iconSrc, svgIcon) {
        return icon || iconSrc || svgIcon;
    }

    _iconSet(icon, iconSrc) {
        return icon ? iconSrc : false;
    }

    _monitorTooltip() { // Implements ptcs-button's tooltip behavior on label truncation
        const el = this.shadowRoot.querySelector('[part=label]');

        const tooltip = el.tooltipFunc();

        if (!tooltip || tooltip === this.tooltip) {
            // If we are here it means that the label text is not truncated and it is not included in the tooltip.
            // Give it another chance. Maybe the truncation was not identified by the label because of sub-pixel difference.
            const rootEl = this.shadowRoot.querySelector('[part=root]');
            const elR = el.getBoundingClientRect();

            const paddingLeft = getComputedStyle(rootEl).paddingLeft;
            const paddingRight = getComputedStyle(rootEl).paddingRight;

            if (!paddingLeft && !paddingRight) {
                // No padding to un-restrict the label width
                return tooltip;
            }

            rootEl.style.paddingLeft = 0;
            rootEl.style.paddingRight = 0;

            const elRNew = el.getBoundingClientRect();
            rootEl.style.paddingLeft = '';
            rootEl.style.paddingRight = '';

            // TW-98495: Re-calculate the tooltip if the size *grows* when given more space
            return elRNew.width > elR.width ? el.tooltipFunc(true) : tooltip;
        }

        return tooltip;
    }

    ready() {
        super.ready();
        this.tooltipFunc = this._monitorTooltip.bind(this);
        this.addEventListener('click', this._onClick.bind(this));
    }

    _computeMode(icon, iconSrc, svgIcon, label) {
        const iconLabel = label ? 'icon+label' : 'icon';
        return icon || iconSrc || svgIcon ? iconLabel : 'label';
    }

    _disabled(disabled) {
        return disabled ? 'true' : 'false';
    }

    _onClick(ev) {
        if (PTCS.wrongMouseButton(ev)) {
            return;
        }
        if (!this.disabled) {
            this.dispatchEvent(new CustomEvent('action', {detail: {item: this.item}}));
        }
    }

    // ARIA attributes
    _computeAriaLabel(label, tooltip) {
        return label || tooltip;
    }

    static get $parts() {
        if (!this._$parts) {
            this._$parts = [/*'root', */'icon', 'label', ...PTCS.partnames('icon-', PTCS.Icon)];
        }
        return this._$parts;
    }
};


customElements.define(PTCS.Button.is, PTCS.Button);
