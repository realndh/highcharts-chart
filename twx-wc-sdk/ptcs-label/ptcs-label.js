import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';
import 'ptcs-behavior-focus/ptcs-behavior-focus.js';
import 'ptcs-behavior-tooltip/ptcs-behavior-tooltip.js';
import {closeTooltip} from 'ptcs-behavior-tooltip/ptcs-behavior-tooltip.js';

PTCS.Label = class extends PTCS.BehaviorTooltip(PTCS.BehaviorFocus(PTCS.BehaviorStyleable(PTCS.ThemableMixin(PolymerElement)))) {
    static get template() {
        return html`
    <style>
      :host {
        display: inline-flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 34px;
        min-height: 13px;
        box-sizing: border-box;
      }

      :host([disabled]) {
        cursor: auto;
        pointer-events: none;
      }

      :host(:not([disabled]))  [part=text-link] {
        cursor: pointer;
        }

     :host(:not([disabled]))  [part=text-link]::before {
        pointer-events: auto;
        cursor: pointer;
        }

      :host([hidden]) {
        display: none;
        visibility: hidden;
      }

      [part=root] {
        display: inline-block;
        width: 100%;
        height: 100%;
      }

      [part=root].sl {
        display: inline-flex;
      }

      .ml {
        position: relative;
      }

      .sl [part=label] {
        display: block;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        width: 100%;
        text-decoration: inherit;
      }

      .ml [part=label] {
        display: flex;
        flex-wrap: nowrap;
        flex-direction: column;
        overflow: auto;
        height: 100%;
        transition: max-height 100ms;
        word-wrap: break-word;
      }

      .ml.overflow_showmore [part=label] {
        overflow: hidden;
      }

      :host([vertical-alignment=center]) .ml [part=label] {
        justify-content: center;
      }

      :host([vertical-alignment=flex-end]) .ml [part=label] {
        justify-content: flex-end;
      }

      :host([vertical-alignment=center]) [part=root].sl {
        align-items: center;
      }

      :host([vertical-alignment=flex-end]) [part=root].sl {
        align-items: flex-end;
      }

      .overflow_showmore [part=show-button] {
        display: block;
        position: absolute;
        padding-bottom: 3px;
      }

      .overflow_showmore[show-all] [part=show-button] {
        position: static;
        padding-right: 0px;
        background-color: transparent;
        box-shadow: none;
      }

      .overflow_showmore[show-all][static-pos] {
          overflow-y: auto;
      }

      .overflow_showmore:not([show-all])[static-pos] {
          overflow-y: hidden;
      }

      [part=show-button] {
        display: none;
        left: 0px;
        right: 0px;
        bottom: 0px;
        width: 100%;
      }

      [part=text-link]::before {
        content: var(--ptcs-label-show-button--more, "Show More");
        pointer-events: auto;
      }

      [part=show-button][show-all] [part=text-link]::before {
        content: var(--ptcs-label-show-button--less, "Show Less");
        pointer-events: auto;
      }

      /* Hack for multiline labels that only fits on a single line */
      .forced-single-line {
        display: block !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
        overflow: hidden !important;
      }

      :host([preserve-white-space]) .ml [part=label] {
        white-space: break-spaces;
      }

      :host([preserve-white-space]) .sl [part=label] {
        white-space: pre;
      }

    </style>
    <div id="root" part="root" show-all\$="[[_showAll]]" static-pos\$="[[_staticPositioning]]"
    class\$="[[_class(multiLine, _overflow, disclosureControl, disScrollOnEllipsMultiLine)]]">
      <div id="label" part="label">[[_labelTruncated]]</div>
    </div>
`;
    }

    static get is() {
        return 'ptcs-label';
    }

    static get properties() {
        return {
            // Label value
            label: {
                type:     String,
                observer: '_checkHeight'
            },

            // Variant (for theming)
            variant: {
                type:               String,
                value:              'label',
                reflectToAttribute: true
            },

            // Multi-line string?
            multiLine: {
                type:     Boolean,
                value:    false,
                observer: '__debounceCheckHeight'
            },

            // Fixed max-height for multi-line?
            maxHeight: {
                type:     String,
                observer: '_maxHeightChanged'
            },

            // the unitless value of maxHeight
            _maxHeight: {},

            // maximum width?
            maxWidth: {
                type:     String,
                observer: '_maxWidthChanged'
            },

            // Support white space in labelText
            preserveWhiteSpace: {
                type:               Boolean,
                reflectToAttribute: true
            },

            // Support disabled (this is now hidden in widgets.json)
            disabled: {
                type:               Boolean,
                reflectToAttribute: true
            },

            // Horizontal Alignment
            horizontalAlignment: {
                type:     String,
                observer: '_horizontalAlignmentChanged'
            },

            // Vertical Alignment
            verticalAlignment: {
                type:               String,
                reflectToAttribute: true
            },

            // select if multiline and maxHeight are set and label-text is long, select if display showMore or text Ellipsis
            disclosureControl: {
                type:     String,
                // Don't assign a default value, because that results in an unnecessary callbacks
                // value:    'show-more',
                observer: '_checkHeight'
            },

            disScrollOnEllipsMultiLine: {
                type: Boolean
            },

            //
            _labelTruncated: {
                type: String
                // Don't assign a default value, because that results in an unnecessary DOM builing
                // value: 'Label'
            },

            // Is the text overflowing?
            _overflow: {
                type: Boolean
                // Don't assign a default value, because that results in an unnecessary callbacks
            },

            // Show all text?
            _showAll: {
                type:     Boolean,
                observer: '_showAllChanged'
                // Don't assign a default value, because that results in an unnecessary callbacks
            },

            // this.$.root.style.maxHeight
            _styleMaxHeight: {
                type:     String,
                observer: '_styleMaxHeightChanged',
                computed: '_computeStyleMaxHeight(maxHeight, disclosureControl, _showAll, _staticPositioning)'
            },

            _staticPositioning: {
                type:  Boolean,
                value: false
            },

            showMoreLabel: {
                type:     String,
                observer: '_showMoreLabelChanged'
            },

            showLessLabel: {
                type:     String,
                observer: '_showLessLabelChanged'
            }
        };
    }

    static get observers() {
        return [
            '_createShowButton(multiLine, _overflow, disclosureControl)'
        ];
    }

    ready() {
        super.ready();
        this.tooltipFunc = this._monitorTooltip.bind(this);
    }

    // Has label been truncated?
    // NOTE: this is a public function used by aggregating components
    isTruncated() {
        const el = this.$.label;
        if (!el) {
            return false;
        }
        // Truncated label to be added to tooltip?
        if (this.disclosureControl === 'ellipsis' && this._labelTruncated !== this.label) {
            return true;
        }
        const b = el.getBoundingClientRect();
        // Remaining tests applied on other browsers than MS Edge
        if (el.offsetWidth < el.scrollWidth) {
            return true;
        }
        if (el.offsetHeight < el.scrollHeight && (getComputedStyle(el)['writingMode'] === 'vertical-rl' || this.maxHeight)) {
            // Only if maxHeight is defined the label is truncated otherwise we have a scrollbar
            return true;
        }
        // NOTE: This code is not 100% reliable. It misses some cases
        // NOTE: At most a sub-pixel will overflow if we reach here
        // PROBLEM:
        // - getBoundingClientRect includes fractions (sub-pixels) for the client area.
        // - there is no way to get sub-pixel info for scrollWidth / scrollHeight
        // HENCE: Some overflow cases are impossible to determine
        // FIX:   This code tells ptcs-label to expand itself fully, and if it gets any bigger
        //        this way we know some part of it was previousy hidden (or maybe line broken...)
        // HOWEVER: Sometimes some other element puts the size restriction of the label, in some way,
        //          and those restrictions are practically difficult (impossible) to find and loosen
        const maxWidth = this.style.maxWidth;
        const maxHeight = this.style.maxHeight;
        if (!maxWidth && !maxHeight) {
            // No max dimensions to un-restrict on the label itself
            return false;
        }
        this.style.maxWidth = 'max-content';
        this.style.maxHeight = 'max-content';
        const b2 = el.getBoundingClientRect();
        this.style.maxWidth = maxWidth;
        this.style.maxHeight = maxHeight;

        // TW-75329: Only set the item as truncated if the size *grows* when styled
        // to its maximum width---on Firefox this value sometimes shrinks (!)
        return b2.width > b.width || b2.height > b.height;
    }

    // Tooltip behavior on label truncation
    _monitorTooltip(truncated = false) {
        if (this.isTruncated() || truncated) {
            if (!this.tooltip) {
                // No tooltip, but truncated label. Use label as tooltip
                return this.label;
            }
            if (this.tooltip !== this.label) {
                // If label is not same as tooltip, show both:
                return this.label + '\n\n' + this.tooltip;
            }
        } else if (this.tooltip === this.label) {
            // Label is not truncated. Don't show tooltip if identical to label.
            return '';
        }
        // Only show explicit tooltip
        return this.tooltip || '';
    }

    _createShowButton(multiLine, _overflow, disclosureControl) {
        // Show More button exists only when multiLine is true, we have an overflow condition, and disclosureControl is not 'ellipsis'
        if (multiLine && _overflow && disclosureControl !== 'ellipsis') { // disclosureControl is undefined or 'showmore'
            let el = this.$.root.querySelector('[part=show-button]');
            if (!el) { // We need to create the Show More DIV and add it to part=root
                let show = document.createElement('div');
                show.setAttribute('id', 'show');
                show.setAttribute('part', 'show-button');
                this._setbattr(show, 'show-all', this._showAll); // Initialization, this would normally be false
                let txtLink = document.createElement('span');
                txtLink.setAttribute('part', 'text-link');
                txtLink.addEventListener('click', ev => this._clickShow(ev));
                show.appendChild(txtLink);
                this.$.root.appendChild(show);
                /*
                 <div id="show" part="show-button"><div part="text-link"></div></div>
                */
            }
        }
    }

    _class(multiLine, overflow, disclosureControl, disScrollOnEllipsMultiLine) {
        if (multiLine) {
            if (disclosureControl === 'ellipsis') {
                return disScrollOnEllipsMultiLine ? 'ml overflow_showmore' : 'ml';
            }
            return overflow ? 'ml overflow_showmore' : 'ml';
        }
        return 'sl';
    }

    _showAllChanged(val) {
        let el = this.$.root.querySelector('[part=show-button]');
        if (el) { // we have created the Show More button
            this._setbattr(el, 'show-all', val);
        }
    }

    _maxWidthChanged(maxWidth) {
        const mw = parseInt(maxWidth);
        this.$.root.style.maxWidth = mw > 0 ? mw + 'px' : '';
        requestAnimationFrame(() => this._checkHeight());
    }

    _maxHeightChanged(value) {
        // Only change if effective boolean value has changed
        if (this._overflow) {
            this._showAll = false;
        }

        this._maxHeight = PTCS.cssDecodeSize(value);

        requestAnimationFrame(() => this._checkHeight());
    }

    _horizontalAlignmentChanged(horizontalAlignment) {
        this.$.root.style.textAlign = horizontalAlignment || '';
    }

    // Value for this.$.root.style.maxHeight has changed
    _styleMaxHeightChanged(styleMaxHeight) {
        this.$.root.style.maxHeight = styleMaxHeight;
    }

    // Compute value for this.$.root.style.maxHeight
    _computeStyleMaxHeight(maxHeight, disclosureControl, _showAll, _staticPositioning) {
        if (maxHeight && ((disclosureControl === 'ellipsis') || !_showAll || (_showAll && _staticPositioning))) {
            const mh = parseInt(maxHeight);
            if (mh > 0) {
                return mh + 'px';
            }
        }

        return '';
    }

    __debounceCheckHeight() {
        // Debounce checkHeight computations
        clearTimeout(this.__checkHeightTimeoutId);
        this.__checkHeightTimeoutId = setTimeout(() => {
            requestAnimationFrame(() => this._checkHeight());
        }, 50);
    }

    // Monitor the label height
    _checkHeight() {
        let v = {};
        this._labelTruncated = this.label;
        this.$.label.classList.remove('forced-single-line');
        if (this.maxHeight) {
            this._handleResizeEvent(true);
            if (this.disclosureControl === 'ellipsis') {
                if (this.$.label.scrollHeight > this._maxHeight) {
                    let searchLow = 0;
                    let searchHigh = Math.max(this._labelTruncated.length - 1, 0);
                    let middle;
                    while ((searchLow !== searchHigh) && (searchLow !== searchHigh - 1)) {
                        middle = Math.floor((searchLow + searchHigh) / 2);
                        this._labelTruncated = this.label.substring(0, middle);
                        if (this.$.label.scrollHeight > this.maxHeight) {
                            searchHigh = middle;
                        } else {
                            searchLow = middle;
                        }
                    }
                    if (searchLow !== middle) {
                        this._labelTruncated = this.label.substring(0, searchLow);
                    }
                    // removing four characters to make room for Unicode horizontal ellipsis
                    this._labelTruncated = this._labelTruncated.slice(0, -4) + '\u2026';

                    if (this.$.label.clientHeight < 2 * PTCS.cssDecodeSize(getComputedStyle(this.$.label).fontSize, this.$.label, true)) {
                        // The result is a single line. Now need to enter a special mode so the
                        // ptcs-label gets resize events if the label gets more available space
                        this.$.label.classList.add('forced-single-line');
                        this._labelTruncated = this.label;
                    }
                }
                return; // ----> EXIT
            }
            v._overflow = this._showAll || (this.$.root.offsetHeight < this.$.label.scrollHeight);
        } else {
            // maxHeight is not specified so don't show "show more" button

            // Only change these values if the effective boolean value has changed.
            // If they are changed from undefined to false they will invoke callbacks
            if (this._overflow) {
                v._overflow = false;
            }
            if (this._showAll) {
                v._showAll = false;
            }
            this._handleResizeEvent(false);
        }
        this.setProperties(v);
    }

    _clickShow() {
        this._showAll = !this._showAll;
        requestAnimationFrame(closeTooltip);
        if (this._staticPositioning && !this._showAll) {
            this.$.root.scrollTop = 0;
        }
    }

    _handleResizeEvent(observe) {
        if (this._resizeObserver) {
            if (!observe) {
                this._resizeObserver.unobserve(this);
                this._resizeObserver = undefined;
            }
        } else if (observe) {
            this._resizeObserver = new ResizeObserver(() => this.__debounceCheckHeight());
            this._resizeObserver.observe(this);
        }
    }

    // Set boolean attribute
    _setbattr(el, attr, value) {
        if (value) {
            el.setAttribute(attr, '');
        } else {
            el.removeAttribute(attr);
        }
    }

    _showMoreLabelChanged(showMoreLabel) {
        this.style.setProperty('--ptcs-label-show-button--more', `"${showMoreLabel}"`);
    }

    _showLessLabelChanged(showLessLabel) {
        this.style.setProperty('--ptcs-label-show-button--less', `"${showLessLabel}"`);
    }

    static get $parts() {
        return [/*'root', */'label', 'show-button', 'text-link'];
    }
};

customElements.define(PTCS.Label.is, PTCS.Label);
