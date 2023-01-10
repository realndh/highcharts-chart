import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';

// This component uses BehaviorStyleable, so it informs the Style Aggregator about its precence
PTCS.Div = class extends PTCS.BehaviorStyleable(PolymerElement) {
    static get is() {
        return 'ptcs-div';
    }
};

customElements.define(PTCS.Div.is, PTCS.Div);
