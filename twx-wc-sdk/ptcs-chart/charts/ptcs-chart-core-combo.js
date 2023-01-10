import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {PTCS} from 'ptcs-library/library.js';
import {invertScalePoint} from 'ptcs-library/library-chart.js';
import {SelectionMgr} from '../selection/chart-selection.js';
import {removeChildren} from '../draw/ptcs-chart-draw-library';
import {select} from 'd3-selection';

import 'ptcs-icon/ptcs-icon.js'; // Needed in tooltip

//import {numberLabel, sampleArray, getChartTooltip} from 'ptcs-library/library-chart.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';
import {getTooltipOverlayElem} from 'ptcs-behavior-tooltip/ptcs-behavior-tooltip.js';
import 'ptcs-behavior-focus/ptcs-behavior-focus.js';
import 'ptcs-style-unit/ptcs-part-observer.js';


/* eslint-disable no-confusing-arrow, no-inner-declarations */

function compareSelectionObjects(sel1, sel2) {
    if (sel1.valueIx !== sel2.valueIx) {
        return sel1.valueIx - sel2.valueIx;
    }
    return sel1.serieIx - sel2.serieIx;
}

// eslint-disable-next-line no-unused-vars
const ChartCoreCombo = class extends PTCS.BehaviorTooltip(PTCS.BehaviorFocus(PTCS.BehaviorStyleable(PTCS.ThemableMixin(PolymerElement)))) {

    static get template() {
        return html`
        <style>
        :host {
            display: block;
            position: relative;
            width: 100%;
            height: 100%;
            --ptcs-tooltip-start-delay: 100;
        }

        :host(:not(:focus)) [part][need-focus] {
            display: none;
        }

        #chart {
            height: 100%;
        }

        svg {
            height: 100%;
            width: 100%;
        }

        ptcs-label[part=value] {
            position: absolute;
            left: 0;
            top: 0;
            min-width: unset;
            box-sizing: border-box;
            pointer-events: none;
        }

        [rotate-values] ptcs-label[part=value] {
            writing-mode: vertical-lr;
        }

        :host(:not([banded])) #hovrect {
            display: none !important;
        }

        [part=drag-rect] {
            display: none;
        }
        </style>

        <div id="chart" ondragstart="return false">
            <ptcs-part-observer>
            <svg id="svg" on-mousedown="_dragStart" on-mousemove="_moveOverChart" on-mouseleave="_mouseLeaveChart">
                <defs>
                    <circle id="ptc-circle" cx="0" cy="0" r="8"/>
                    <rect id="ptc-square" x="-8" y="-8" width="16" height="16"/>
                    <rect id="ptc-diamond" x="-8" y="-8" width="16" height="16" transform="rotate(45)"/>
                    <polygon id="ptc-triangle" points="-9,6.364 0,-6.364 9,6.364"/>
                    <polygon id="ptc-plus" points="-9,3 -9,-3 -3,-3 -3,-9 3,-9, 3,-3, 9,-3 9,3 3,3 3,9 -3,9 -3,3"/>
                    <use id="ptc-cross" href="#ptc-plus" transform="rotate(45)"/>
                    <!-- Symbols on white background -->
                    <g id="ptc-circle-wb"><use href="#ptc-circle" fill="#FFFFFF"/><use href="#ptc-circle"/></g>
                    <g id="ptc-square-wb"><use href="#ptc-square" fill="#FFFFFF"/><use href="#ptc-square"/></g>
                    <g id="ptc-diamond-wb"><use href="#ptc-diamond" fill="#FFFFFF"/><use href="#ptc-diamond"/></g>
                    <g id="ptc-triangle-wb"><use href="#ptc-triangle" fill="#FFFFFF"/><use href="#ptc-triangle"/></g>
                    <g id="ptc-plus-wb"><use href="#ptc-plus" fill="#FFFFFF"/><use href="#ptc-plus"/></g>
                    <g id="ptc-cross-wb"><use href="#ptc-cross" fill="#FFFFFF"/><use href="#ptc-cross"/></g>
                </defs>
                <rect id="hovrect" part="hover-rect" cx="10" cy="10" width="40" height="40"></rect>
                <g id="bars"></g>
                <g id="areas"></g>
                <g id="lines"></g>
                <g id="markers"></g>
                <g id="focus" style="pointer-events: none"></g>
                <g id="hover"></g>
                <rect id="dragrect" part="drag-rect"></rect>
            </svg>
            </ptcs-part-observer>
            <div id="values"></div>
        </div>`;
    }

    static get is() {
        return 'ptcs-chart-core-combo';
    }

    static get properties() {
        return {
            disabled: {
                type:               Boolean,
                reflectToAttribute: true
            },

            // The original data
            data: {
                type:     Array,
                observer: '_dataChanged'
            },

            // {bar: [], area: [], line: [], axesMap: Map }
            drawables: {
                type:     Object,
                observer: 'refresh'
            },

            // Scale that maps x-positions to x-axis
            xScale: {
                type:     Function,
                observer: 'refresh'
            },

            flipAxes: {
                type:     Boolean,
                observer: 'refresh'
            },

            // Report when mouse is dragging (to prevent selections)
            dragging: {
                type:   Boolean,
                notify: true
            },

            // X-zoom by dragging the mouse over the chart
            zoomDragX: {
                type: Boolean
            },

            // Y-zoom by dragging the mouse over the chart
            zoomDragY: {
                type: Boolean
            },

            // zoom by selecting two elements
            zoomSelect: {
                type: Boolean
            },

            legend: {
                type: Array
            },

            // Indices of selected (visible) series (legends)
            selectedLegend: {
                type:     Array,
                observer: '_selectedLegendChanged'
            },

            // Items that is hovered
            _hoverItems: {
                type:     Array,
                observer: '_hoverItemsChanged'
            },

            // Focused data point: {valueIx, serieIx}
            _focus: {
                type:     Object,
                observer: '_focusChanged'
            },

            // 'none' || 'single' || 'mutiple'
            selectionMode: {
                type: String
            },

            _selectionMgr: {
                type:  SelectionMgr,
                value: () => new SelectionMgr(compareSelectionObjects)
            },

            banded: {
                type:               Boolean,
                computed:           '_computeBanded(xScale)',
                reflectToAttribute: true
            }
        };
    }
    static get observers() {
        return [
            '_selectionModeChanged(selectionMode, zoomSelect)'
        ];
    }

    ready() {
        super.ready();

        this._selectionMgr.observe(this);

        // Keyboard navigation
        this.addEventListener('keydown', ev => this._keyDown(ev));
    }

    get _allDrawables() {
        return [...this.drawables.area, ...this.drawables.bar, ...this.drawables.line];
    }

    _dataChanged() {
        this._selectionMgr.selection = null;
    }

    _computeBanded(xScale) {
        return xScale && typeof xScale.bandwidth === 'function';
    }

    refresh() {
        if (this.__refreshDebounce) {
            return;
        }
        this.__refreshDebounce = true;
        requestAnimationFrame(() => {
            this.__refreshDebounce = undefined;
            this.__refresh();
        });
    }

    __refresh() {
        const xScale = this.xScale;
        if (!xScale) {
            return;
        }

        const flipAxes = this.flipAxes;
        const axisMap = this.drawables.axisMap;
        const yScales = this.yScales;
        const selectionMgr = this._selectionMgr;
        const {bar, area, line} = this.drawables;

        function draw(drawable) {
            const yScale = yScales[axisMap.get(drawable)];
            if (yScale) {
                drawable.draw({el: this, xScale, yScale, flipAxes, selectionMgr});
            } else {
                removeChildren(this);
            }
        }

        // Hower rect
        if (this.xScale.bandwidth) {
            const bw = Math.max(this.xScale.bandwidth(), 1);
            this.$.hovrect.setAttribute('width', flipAxes ? this.clientHeight : bw);
            this.$.hovrect.setAttribute('height', flipAxes ? bw : this.clientWidth);
            this.$.hovrect.setAttribute('y', '0');
            this.$.hovrect.setAttribute('x', '0');
        }
        // Don't show until we have a "hover" event
        this.$.hovrect.style.display = 'none';

        // Lines
        {
            const join = select(this.$.lines)
                .selectAll('g.line')
                .data(line);

            // Enter
            join.enter()
                .append('g')
                .attr('class', 'line')
                .each(draw);

            // Update
            join.each(draw);

            // Exit
            join.exit().remove();
        }

        // Bars
        {
            const join = select(this.$.bars)
                .selectAll('g.bar')
                .data(bar);

            // Enter
            join.enter()
                .append('g')
                .attr('class', 'bar')
                .each(draw);

            // Update
            join.each(draw);

            // Exit
            join.exit().remove();
        }

        // Areas
        {
            const join = select(this.$.areas)
                .selectAll('g.area')
                .data(area);

            // Enter
            join.enter()
                .append('g')
                .attr('class', 'area')
                .each(draw);

            // Update
            join.each(draw);

            // Exit
            join.exit().remove();
        }

        // Markers
        {
            function drawMarkers(drawable) {
                const yScale = yScales[axisMap.get(drawable)];
                if (yScale) {
                    drawable.drawMarkers({el: this, xScale, yScale, flipAxes, selectionMgr});
                } else {
                    removeChildren(this);
                }
            }

            const join = select(this.$.markers)
                .selectAll('g.marker')
                .data([...area, ...line]); // Exclude ...bar

            // Enter
            join.enter()
                .append('g')
                .attr('class', 'marker')
                .each(drawMarkers);

            // Update
            join.attr('index', (d, i) => i).each(drawMarkers);

            // Exit
            join.exit().remove();
        }

        // Values
        {
            function drawValues(drawable) {
                const yScale = yScales[axisMap.get(drawable)];
                if (yScale) {
                    drawable.drawValues({el: this, xScale, yScale, flipAxes});
                } else {
                    removeChildren(this);
                }
            }

            const join = select(this.$.values)
                .selectAll('div.values')
                .data(this._allDrawables);

            // Enter
            join.enter()
                .append('div')
                .attr('class', 'values')
                .each(drawValues);

            // Update
            join.each(drawValues);

            // Exit
            join.exit().remove();
        }

        this._refreshFocus();

        // If focused element has become hidden
        if (this._focus && this.selectedLegend.indexOf(this._focus.serieIx) === -1) {
            this._focus = this._firstFocusable;
        }
    }

    _refreshSelection() {
        const xScale = this.xScale;
        if (!xScale) {
            return;
        }

        const flipAxes = this.flipAxes;
        const axisMap = this.drawables.axisMap;
        const yScales = this.yScales;
        const selectionMgr = this._selectionMgr;
        const {bar, area, line} = this.drawables;

        function updateSelection(drawable) {
            const yScale = yScales[axisMap.get(drawable)];
            if (yScale) {
                drawable.updateSelection({el: this, xScale, yScale, flipAxes, selectionMgr});
            }
        }

        function updateMarkerSelection(drawable) {
            const yScale = yScales[axisMap.get(drawable)];
            if (yScale) {
                drawable.updateMarkerSelection({el: this, xScale, yScale, flipAxes, selectionMgr});
            }
        }

        // Lines
        select(this.$.lines).selectAll('g.line').data(line).each(updateSelection);

        // Bars
        select(this.$.bars).selectAll('g.bar').data(bar).each(updateSelection);

        // Areas
        select(this.$.areas).selectAll('g.area').data(area).each(updateSelection);

        // Markers
        select(this.$.markers).selectAll('g.marker').data([...area, ...line]).each(updateMarkerSelection);
    }


    _refreshHover(selection) {
        const {xScale, yScales, flipAxes, _selectionMgr, _focus} = this;
        const axisMap = this.drawables.axisMap;

        function cb(sel) {
            this.setAttribute('hover', '');
            PTCS.setbattr(this, 'focus', _focus && compareSelectionObjects(_focus, sel) === 0);
            PTCS.setbattr(this, 'selected', _selectionMgr.isSelected(sel));
        }

        function showHover(d) {
            const yScale = yScales[axisMap.get(d)];
            if (yScale) {
                d.showSelection({el: this, xScale, yScale, flipAxes, selection, cb});
            } else {
                removeChildren(this);
            }
        }

        const join = select(this.$.hover)
            .selectAll('g')
            .data(this._allDrawables);

        // Enter
        join.enter()
            .append('g')
            .each(showHover);

        // Update
        join.each(showHover);

        // Exit
        join.exit().remove();
    }

    _pickHover(el) {
        const g = el && el.closest('#hover > g');
        if (!g) {
            return null;
        }

        const drawable = this._allDrawables[PTCS.getChildIndex(g)];
        const index = PTCS.getChildIndex([...g.querySelectorAll(':scope > *')].find(e => e.contains(el)));
        return index >= 0 && drawable && this._hoverItems.filter(item => drawable.displaysSeries(item.serieIx))[index];
    }

    _refreshFocus() {
        const {xScale, yScales, flipAxes, _selectionMgr} = this;
        const drawable = this._focus && this._allDrawables.find(d => d.displaysSeries(this._focus.serieIx) && !d.hidden);
        const axisMap = this.drawables.axisMap;

        function cb(sel) {
            this.setAttribute('need-focus', ''); // Only show when chart has focus
            this.setAttribute('focus', '');
            PTCS.setbattr(this, 'selected', _selectionMgr.isSelected(sel));
        }

        function showFocus(d) {
            const yScale = yScales[axisMap.get(drawable)];
            if (yScale) {
                drawable.showSelection({el: this, xScale, yScale, flipAxes, selection: [d], cb});
            } else {
                removeChildren(this);
            }
        }

        const join = select(this.$.focus)
            .selectAll('g')
            .data(drawable ? [this._focus] : []);

        // Enter
        join.enter()
            .append('g')
            .each(showFocus);

        // Update
        join.each(showFocus);

        // Exit
        join.exit().remove();
    }

    _hoverItemsChanged(_hoverItems, old) {
        if (!PTCS.sameArray(_hoverItems, old, (a, b) => a.valueIx === b.valueIx && a.serieIx === b.serieIx)) {
            // Show hovered data points
            this._refreshHover(_hoverItems);

            // Display corresponding tooltips
            this._updateTooltips();
        }
    }

    _updateTooltips() {
        function focusOf(el) {
            for (; el; el = el.parentNode) {
                if (el.nodeType === 11 && el.host) {
                    return el.host.shadowRoot.activeElement;
                }
            }
            return document.activeElement;
        }

        let tooltips, x, y;

        if (this._hoverItems && this._hoverItems.length > 0) {
            tooltips = this._hoverItems;
            x = this._movingMouse.x;
            y = this._movingMouse.y;
        } else {
            const fe = focusOf(this);
            const f = (fe === this || this.contains(fe)) && this._focus;
            const el = f && this.$.focus.querySelector('[need-focus]');
            const bb = el && el.getBoundingClientRect();
            if (bb && bb.width && bb.height) {
                const chartType = this._allDrawables.find(d => d.displaysSeries(f.serieIx)).chartType;
                const bb0 = this.getBoundingClientRect();
                x = bb.left - bb0.left + bb.width / 2;
                y = bb.top - bb0.top + bb.height / 2;
                tooltips = [{...f, x: this.data[f.valueIx][0], y: this.data[f.valueIx][1][f.serieIx], chartType}];
            } else {
                tooltips = [];
            }
        }

        if (PTCS.sameArray(this._tooltips, tooltips, (a, b) => a.valueIx === b.valueIx && a.serieIx === b.serieIx)) {
            return;
        }

        this._tooltips = tooltips;
        this._showTooltip(tooltips, x, y);
    }

    _showTooltip(tooltips, x, y) {
        // Stop tooltip timer, if running
        if (this.__tooltipTimeout) {
            clearTimeout(this.__tooltipTimeout);
            this.__tooltipTimeout = undefined;
        }

        // Hide tooltip, if not data points
        if (tooltips.length === 0) {
            getTooltipOverlayElem().hide();
            this.__tooltipVisible = undefined;
            return;
        }

        const displayNow = () => {
            const defaultLegend = seriesIx => `Series ${seriesIx + 1}`;

            const legend = Array.isArray(this.legend)
                ? seriesIx => (this.legend[seriesIx] && this.legend[seriesIx].label) || defaultLegend(seriesIx)
                : defaultLegend;

            const extractTooltip = item => ({icon: `chart-icons:${item.chartType}`, text: `${legend(item.serieIx)}: ${item.y}`});

            const tooltip = tooltips.map(extractTooltip);

            const bb = this.$.svg.getBoundingClientRect();

            // TODO: tooltip behavior should support:
            //   - place tooltip at x, y position
            //   - place tooltip to the left / right of the position
            getTooltipOverlayElem().show(this.$.svg, tooltip, {
                mx: Math.max(bb.left, Math.min(bb.right, bb.left + x)),
                y:  Math.max(bb.top, Math.min(bb.bottom, bb.top + y)),
                w:  16,
                h:  16
            });
            //this._tooltipEnter(this.$.svg, bb.left + x, bb.top + y, tooltip, {});

            this.__tooltipVisible = true;
        };

        if (this.__tooltipVisible) {
            displayNow(); // Tooltip already visible, replace content now
        } else {
            // Wait a little before showing tooltip
            this.__tooltipTimeout = setTimeout(() => {
                this.__tooltipTimeout = undefined;
                displayNow();
            }, 250);
        }
    }


    // The mouse moves over the chart...
    _moveOverChart(ev) {
        if (this.disabled) {
            return;
        }
        // Remember mouse position
        this._movingMouse = {x: ev.offsetX, y: ev.offsetY};

        if (!this.xScale) {
            return;
        }
        if (this.dragging) {
            return;
        }

        // Update hover rect
        if (this.flipAxes) {
            const p = this.xScale(invertScalePoint(this.xScale, ev.offsetY));
            this.$.hovrect.setAttribute('y', p);
            this.$.hovrect.style.display = ev.offsetY + 2 >= p ? '' : 'none';
        } else {
            const p = this.xScale(invertScalePoint(this.xScale, ev.offsetX));
            this.$.hovrect.setAttribute('x', p);
            this.$.hovrect.style.display = ev.offsetX + 2 >= p ? '' : 'none';
        }

        // What items are below the mouse?
        this._hoverItems = this._pickPoints(ev.offsetX, ev.offsetY);
    }

    _mouseLeaveChart() {
        // Close "decorations"
        this._hoverItems = [];
        this.$.hovrect.style.display = 'none';
    }

    _pickPoints(x, y) {
        let currBand = 1;

        // TODO: Need to fix this when x-scale can be "number" or "date"
        const xMatchFunc = () => {
            if (this.xScale.bandwidth) {
                const xPick = invertScalePoint(this.xScale, x);
                const x0 = this.xScale(xPick);
                if (x + 2 < x0) {
                    return null; // x is in bar padding area. Nothing matches...
                }
                const numBand = this.drawables.bar.reduce((n, item) => n + (item.hidden ? 0 : 1), 0);
                const bandwidth = this.xScale.bandwidth ? Math.max(this.xScale.bandwidth(), 1) : 1;
                currBand = Math.floor(((x - this.xScale(xPick)) / bandwidth) * numBand);
                return xValue => xValue === xPick;
            }

            // XAxis is not a label
            const a = invertScalePoint(this.xScale, x - 4);
            const b = invertScalePoint(this.xScale, x + 4);
            const xPick1 = Math.min(a, b);
            const xPick2 = Math.max(a, b);
            return xValue => xPick1 <= xValue && xValue <= xPick2;
        };

        const xMatch = xMatchFunc();
        if (!xMatch) {
            return []; // Nothing matches
        }

        const yScaleOf = drawable => this.yScales[this.drawables.axisMap.get(drawable)];

        // Collect all points that are in scope of the mouse position
        const pick = this._allDrawables.reduce((r, drawable) => {
            if (drawable.hidden) {
                return r;
            }
            const yScale = yScaleOf(drawable);
            if (!yScale) {
                return r;
            }
            const yPick = invertScalePoint(yScale, y);

            const yMatchFunc = () => {
                if (yScale.invert) {
                    const a = yScale.invert(y - 4);
                    const b = yScale.invert(y + 4);
                    const y1 = Math.min(a, b);
                    const y2 = Math.max(a, b);
                    return _y => y1 <= _y && _y <= y2;
                }
                const iy = invertScalePoint(yScale, y);
                return _y => _y === iy;
            };
            const yMatch = yMatchFunc();

            drawable.eachVisible((xValue, yValue, valueIx, serieIx, y1, y2, band) => {
                if (!xMatch(xValue)) {
                    return;
                }
                const hit = (y1 !== undefined && y2 !== undefined)
                    ? (Math.min(y1, y2) <= yPick && yPick <= Math.max(y1, y2) && (band === undefined || band === currBand))
                    : yMatch(yValue);
                r.push({hit, x: xValue, y: yValue, valueIx, serieIx, y1, y2, chartType: drawable.chartType});
            });
            return r;
        }, [])
            .sort((a, b) => a.seriesIx - b.seriesIx);

        // If any items are "under the mouse" (hit), then return only them
        return pick.some(item => item.hit) ? pick.filter(item => item.hit) : pick;
    }

    _mouseDown(ev) {
        const point = this._pickHover(ev.target);
        if (point) {
            this._focus = point;
        }

        return point;
    }

    _coordinates({serieIx, x, y, y1, y2}) {
        const drawable = this._allDrawables.find(d => d.displaysSeries(serieIx));
        const _yScale = drawable && this.yScales[this.drawables.axisMap.get(drawable)];
        if (!_yScale) {
            throw Error('Invalid data point');
        }
        const ybw = _yScale.bandwidth ? _yScale.bandwidth() / 2 : 0;
        const yScale = ybw ? v => _yScale(v) + ybw : _yScale;
        const xbw = this.xScale.bandwidth ? this.xScale.bandwidth() / 2 : 0;
        const xScale = xbw ? v => this.xScale(v) + xbw : this.xScale;
        const a = xScale(x);

        if (y1 === undefined || y2 === undefined) {
            const t = yScale(y);
            return [a - xbw, a + xbw, t - ybw, t + ybw];
        }
        const t1 = yScale(y1);
        const t2 = yScale(y2);
        return [a - xbw, a + xbw, Math.min(t1, t2) - ybw, Math.max(t1, t2) + ybw];
    }

    _selectPoint(point) {
        if (!point) {
            if (this._selectionMgr.selectMethod !== 'multiple') {
                this._selectionMgr.selection = null;
            }
            return;
        }

        const {serieIx, valueIx, x, y, y1, y2} = point;

        this._selectionMgr.select({serieIx, valueIx, x, y, y1, y2});

        this.dispatchEvent(new CustomEvent('series-click', {
            bubbles:  true,
            composed: true,
            detail:   {serieIx, valueIx, x, y}
        }));

        // Has a zoom range been selected?
        if (!this.zoomSelect) {
            if (this._hoverItems.length) {
                this._refreshHover(this._hoverItems);
            }
            return; // Not in zoom selection mode
        }
        if (!this._selectionMgr.selection || this._selectionMgr.selection.length < 2) {
            return; // Don't have two selected bars
        }

        // Zoom in
        const sel1 = this._selectionMgr.selection[0];
        const sel2 = this._selectionMgr.selection[1];
        this._selectionMgr.selection = null;

        // Resolve coordinates
        const [x11, x12, y11, y12] = this._coordinates(sel1);
        const [x21, x22, y21, y22] = this._coordinates(sel2);

        // Report selected area
        this.dispatchEvent(new CustomEvent('zoom-selection', {detail: {
            x: Math.min(x11, x21),
            y: Math.min(y11, y21),
            w: Math.max(x12, x22) - Math.min(x11, x21),
            h: Math.max(y12, y22) - Math.min(y11, y21)}
        }));
    }

    _dragStart(ev) {
        if (this.disabled) {
            return;
        }

        const point = this._mouseDown(ev);

        if ((!this.zoomDragX && !this.zoomDragY)) {
            // Zoom selection is not enabled
            this._selectPoint(point);
            return;
        }

        const x = ev.clientX;
        const y = ev.clientY;

        this._movedMouse = 0;
        const mmv = ev1 => this._mouseDrag(ev1, x, y);

        const mup = () => {
            this.dragging = false;
            window.removeEventListener('mousemove', mmv);
            this._mouseUp(point);
        };

        window.addEventListener('mousemove', mmv);
        window.addEventListener('mouseup', mup, {once: true});
    }

    _mouseDrag(ev, x0, y0) {
        const cntr = this.$.chart.getBoundingClientRect();
        const el = this.$.dragrect;
        const [dragX, dragY] = this.flipAxes
            ? [this.zoomDragY, this.zoomDragX]
            : [this.zoomDragX, this.zoomDragY];

        el.setAttribute('x', dragX ? Math.min(x0, ev.clientX) - cntr.left : 0);
        el.setAttribute('y', dragY ? Math.min(y0, ev.clientY) - cntr.top : 0);
        el.setAttribute('width', dragX ? Math.abs(x0 - ev.clientX) : cntr.width);
        el.setAttribute('height', dragY ? Math.abs(y0 - ev.clientY) : cntr.height);
        if (!this._movedMouse) {
            this.dragging = true;

            // Close "decorations"
            this._hoverItems = [];
            this.$.hovrect.style.display = 'none';

            this._movedMouse = Date.now();
            el.style.display = 'block';
        }
    }

    _mouseUp(point) {
        const dragrect = this.$.dragrect;
        dragrect.style.display = '';

        if (this.disabled) {
            return;
        }

        if (!this._movedMouse || Date.now() - this._movedMouse < 150) {
            // Dragged for less than 150ms. Ignore
            this._selectPoint(point);
            return;
        }

        const x = +dragrect.getAttribute('x');
        const y = +dragrect.getAttribute('y');
        const w = +dragrect.getAttribute('width');
        const h = +dragrect.getAttribute('height');

        const [dragX, dragY] = this.flipAxes ? [this.zoomDragY, this.zoomDragX] : [this.zoomDragX, this.zoomDragY];

        if ((!dragX || w < 3) && (!dragY || h < 3)) {
            // Dragged less than 3px. Ignore
            this._selectPoint(point);
            return;
        }

        // Clear selection and report range
        /* this._selected = null; */

        this.dispatchEvent(new CustomEvent('zoom-selection', {
            bubbles:  true,
            composed: true,
            detail:   {x, y, w, h}
        }));
    }

    _zoomSelectPoint(point) {
        if (!this.zoomSelect) {
            this._selectionMgr.select(point);
            return;
        }
        // Zoom selection needs a lot of additional paramters...
        const drawable = this._allDrawables.find(d => !d.hidden && d.displaysSeries(point.serieIx));
        if (!drawable) {
            return;
        }

        drawable.eachVisible((x, y, valueIx, serieIx, y1, y2) => {
            if (valueIx === point.valueIx && serieIx === point.serieIx) {
                this._selectPoint({x, y, valueIx, serieIx, y1, y2, chartType: drawable.chartType});
            }
        });
    }

    _focusChanged() {
        this._refreshFocus();
        this._updateTooltips();
    }

    get _firstFocusable() {
        if (Array.isArray(this.data)) {
            for (let valueIx = 0; valueIx < this.data.length; valueIx++) {
                const ya = this.data[valueIx][1];
                const serieIx = ya && this.selectedLegend.find(six => ya[six] !== undefined);
                if (serieIx >= 0) {
                    return {valueIx, serieIx};
                }
            }
        }
        return null;
    }

    _findFocusable(sel, next) {
        for (; sel; sel = next(sel)) {
            if (this.data[sel.valueIx][0] !== undefined && this.data[sel.valueIx][1] && this.data[sel.valueIx][1][sel.serieIx] !== undefined) {
                return sel;
            }
        }
        return null;
    }

    _notifyFocus() {
        // Make sure a chart item has focus, if possible
        if (!this._focus) {
            this._focus = this._firstFocusable;
        } else {
            this._updateTooltips();
        }
    }

    _notifyBlur() {
        this._updateTooltips();
    }

    _keyDown(ev) {
        if (!this._focus || this.disabled) {
            return;
        }

        const prevValue = sel => sel.valueIx > 0 && {valueIx: sel.valueIx - 1, serieIx: sel.serieIx};

        const nextValue = sel => sel.valueIx + 1 < this.data.length && {valueIx: sel.valueIx + 1, serieIx: sel.serieIx};

        const prevSeries = sel => {
            const i = this.selectedLegend.indexOf(sel.serieIx);
            return i >= 1 && {valueIx: sel.valueIx, serieIx: this.selectedLegend[i - 1]};
        };

        const nextSeries = sel => {
            const i = this.selectedLegend.indexOf(sel.serieIx);
            return i >= 0 && i + 1 < this.selectedLegend.length && {valueIx: sel.valueIx, serieIx: this.selectedLegend[i + 1]};
        };

        let focus = this._focus;

        switch (ev.key) {
            case 'ArrowLeft':
                focus = this._findFocusable(prevValue(focus), prevValue);
                break;
            case 'ArrowRight':
                focus = this._findFocusable(nextValue(focus), nextValue);
                break;
            case 'ArrowUp':
                focus = this._findFocusable(prevSeries(focus), prevSeries);
                break;
            case 'ArrowDown':
                focus = this._findFocusable(nextSeries(focus), nextSeries);
                break;
            case 'PageUp':
                focus = this._findFocusable({valueIx: focus.valueIx, serieIx: this.selectedLegend[0]}, nextSeries);
                break;
            case 'PageDown':
                focus = this._findFocusable({valueIx: focus.valueIx, serieIx: this.selectedLegend[this.selectedLegend.length - 1]}, prevSeries);
                break;
            case 'Home':
                focus = this._findFocusable({valueIx: 0, serieIx: focus.serieIx}, nextValue);
                break;
            case 'End':
                focus = this._findFocusable({valueIx: this.data.length - 1, serieIx: focus.serieIx}, prevValue);
                break;
            case 'Enter':
            case ' ':
                this._zoomSelectPoint(focus);
                break;
            default:
                // Not handled
                return;
        }

        if (!focus || (focus.valueIx === this._focus.valueIx && focus.serieIx === this._focus.serieIx)) {
            return;
        }

        // We consumed this keyboard event. Don't propagate
        ev.preventDefault();

        this._focus = focus;

        /*
        this._focusOn(focus);
        this._focus.el.scrollIntoViewIfNeeded();
        this._mouseTooltip({target: focus.el});
        */
    }


    // Selections
    _selectionModeChanged(selectionMode, zoomSelect) {
        this._selectionMgr.selection = null;
        this._selectionMgr.selectMethod = zoomSelect ? 'multiple' : selectionMode;
    }

    selectionChanged(selection) {
        //console.log('%c|' + selection.map(a => [a.valueIx, a.serieIx]).join('|') + '|', 'color: blue; font-weight: bold;');
        this._refreshSelection();
        this._refreshFocus();

        this.dispatchEvent(new CustomEvent('chart-selection', {
            bubbles:  true,
            composed: true,
            detail:   {selection}
        }));
    }

    // Legend filter have changed. Adjust selection
    _selectedLegendChanged(selectedLegend) {
        if (!this._selectionMgr.selection) {
            return; // Nothing to adjust
        }
        const filterSet = Array.isArray(selectedLegend) && new Set(selectedLegend);
        const isVisible = filterSet ? i => filterSet.has(i) : () => true;
        if (Array.isArray(this._selectionMgr.selection)) {
            if (this._selectionMgr.selection.some(sel => !isVisible(sel.serieIx))) { // Only refilter if needed
                this._selectionMgr.selection = this._selectionMgr.selection.filter(sel => isVisible(sel.serieIx));
            }
        } else if (!isVisible(this._selectionMgr.selection.serieIx)) {
            this._selectionMgr.selection = null;
        }
    }

    /*selectedChanged(sel, selected) {
        console.log('selected changed: ' + JSON.stringify(sel) + ': ' + selected);
    }*/

    selectData(selection) {
        // Verify selection
        if (selection !== null) {
            const verify = s => typeof s === 'object' &&
                                typeof s.valueIx === 'number' && typeof s.serieIx === 'number' &&
                                s.hasOwnProperty('x') && s.hasOwnProperty('y');

            if (Array.isArray(selection)) {
                if (selection.some(s => !verify(s))) {
                    return; // Invalid selection
                }
            } else if (!verify(selection)) {
                return;
            }
        }

        // Accept selection
        this._selectionMgr.selection = selection;
    }

    selectAll() {
        if (Array.isArray(this.selectedLegend) && Array.isArray(this.data)) {
            this._selectionMgr.selection = this.data.reduce((a, item, valueIx) => {
                if (item[0] !== undefined) {
                    this.selectedLegend.forEach(serieIx => {
                        if (item[1][serieIx] !== undefined) {
                            a.push({valueIx, serieIx, x: item[0], y: item[1][serieIx]});
                        }
                    });
                }
                return a;
            }, []);
        } else {
            this._selectionMgr.selection = null;
        }
    }

    unselectAll() {
        this._selectionMgr.selection = null;
    }
};

// customElements.define(PTCS.ChartCoreCombo.is, PTCS.ChartCoreCombo);
