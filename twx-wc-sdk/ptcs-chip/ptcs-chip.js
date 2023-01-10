import {html} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';
import 'ptcs-behavior-binary/ptcs-behavior-binary.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';
import 'ptcs-behavior-focus/ptcs-behavior-focus.js';
import 'ptcs-behavior-tooltip/ptcs-behavior-tooltip.js';
import 'ptcs-label/ptcs-label.js';
import 'ptcs-icon/ptcs-icon.js';
import 'ptcs-icons/cds-icons.js';

PTCS.Chip = class extends PTCS.BehaviorTooltip(PTCS.BehaviorFocus(PTCS.BehaviorStyleable(
    PTCS.ThemableMixin(PTCS.BehaviorBinary), ['disabled', 'checked']))) {
    static get template() {
        return html`
    <style>
      :host {
        display: inline-flex;
        flex-direction: row;
        justify-content: center;
        align-items: baseline;
        box-sizing: border-box;
        overflow: hidden;
        cursor: pointer;
        user-select: none;
      }

      :host([disabled]) {
        cursor: auto;
      }

      :host([labelalign=right]) {
        flex-direction: row-reverse;
      }

      :host([no-label]) [part=label] {
        display: none;
      }

      :host(:not([checked])) [part=icon] {
        display: none;
      }

      :host([hide-icon]) [part=icon] {
        display: none;
      }

    </style>

    <ptcs-label part="label" label="[[label]]" no-label\$="[[!label]]"
        max-width="[[labelMaxWidth]]" horizontal-alignment="[[_alignLabel(hideIcon, labelalign)]]"></ptcs-label>
    <ptcs-icon id="icon" part="icon" size="[[_iconSize(iconWidth, iconHeight)]]" icon-width="[[iconWidth]]" icon-height="[[iconHeight]]"
        icon="[[icon]]"></ptcs-icon>`;
    }

    static get is() {
        return 'ptcs-chip';
    }

    static get properties() {
        return {
            label: {
                type:  String,
                value: ''
            },

            icon: {
                type: String
            },

            iconWidth: {
                type: String
            },

            iconHeight: {
                type: String
            },

            hideIcon: {
                type:               Boolean,
                reflectToAttribute: true
            },

            labelalign: {
                type:               String,
                reflectToAttribute: true
            },

            labelMaxWidth: {
                type: String
            },

            // FocusBehavior should simulate a click event when space is pressed
            _spaceActivate: {
                type:     Boolean,
                value:    true,
                readOnly: true
            },

            // FocusBehavior should simulate a click event when enter key is pressed
            _enterActivate: {
                type:     Boolean,
                value:    true,
                readOnly: true
            },

            // ARIA attributes

            role: {
                type:               String,
                value:              'checkbox',
                reflectToAttribute: true
            },

            // aria-pressed with role button *should* be used for toggle buttons per WAI-ARIA
            // but Windows Narrator doesn't say the state out loud using that combination...
            // aria-checked with role checkbox works in Chromium Edge, Narrator says the checked
            // state when button is focused or toggled - so using that.
            ariaChecked: {
                type:               String,
                computed:           '_compute_ariaChecked(checked)',
                reflectToAttribute: true
            },

            ariaDisabled: {
                type:               String,
                computed:           '_compute_ariaDisabled(disabled)',
                reflectToAttribute: true
            },
        };
    }

    ready() {
        super.ready();
        this.addEventListener('click', this._onClick.bind(this));
        if (this.icon === undefined) {
            this.icon = 'cds:icon_ok_circle';
        }
        if (this.labelalign === undefined) {
            this.labelalign = 'left';
        }

        // Use boilerplate function in ptcs-behavior-tooltip
        this.tooltipFunc = this.hideIfTooltipEqualsLabel;
    }

    _iconSize(iconWidth, iconHeight) {
        if (iconWidth || iconHeight) {
            return 'custom';
        }
        return 'small';
    }

    _alignLabel(hideIcon, labelalign) {
        return hideIcon ? 'center' : labelalign;
    }

    _onClick() {
        if (!this.disabled && !this.isIDE) {
            this.checked = !this.checked;
        }
    }

    // ARIA

    _compute_ariaChecked(checked) {
        return checked ? 'true' : false;
    }

    _compute_ariaDisabled(disabled) {
        return disabled ? 'true' : false;
    }
};

customElements.define(PTCS.Chip.is, PTCS.Chip);
