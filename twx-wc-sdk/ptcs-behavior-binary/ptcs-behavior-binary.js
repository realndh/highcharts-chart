import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';

PTCS.BehaviorBinary = class extends PolymerElement {
    static get is() {
        return 'ptcs-behavior-binary';
    }

    static get properties() {
        return {
            checked:
                {
                    type:               Boolean,
                    value:              false,
                    notify:             true,
                    reflectToAttribute: true,
                    observer:           '_checkedChanged'
                },

            state:
                {
                    type:     Boolean,
                    value:    false,
                    observer: '_stateChanged'
                },

            disabled:
                {
                    type:               Boolean,
                    reflectToAttribute: true,
                    value:              false
                },

            // The variable controlled by this checkbox control
            variable:
                {
                    notify:   true,
                    observer: '_variableChanged'
                },

            valueOn: // @value-on
                {
                    value: true
                },

            valueOff: // @value-off
                {
                    value: false
                }
        };
    }

    _variableChanged(variable) {
        if (variable === this.valueOn) {
            if (!this.checked) {
                this.checked = true;
            }
        } else if (variable === this.valueOff) {
            if (this.checked) {
                this.checked = false;
            }
        } else {
            console.error('Checkbox value is unknown: ' + variable);
        }
    }

    _checkedChanged(checked) {
    // Update status of checked property
        this.variable = checked ? this.valueOn : this.valueOff;
        this.state = checked;
    }

    _stateChanged(state) {
    // Update status of checked property
        this.variable = state ? this.valueOn : this.valueOff;
        this.checked = state;
    }
};

customElements.define(PTCS.BehaviorBinary.is, PTCS.BehaviorBinary);
