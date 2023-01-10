import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import '@polymer/polymer/lib/elements/dom-if.js';

import {PTCS} from 'ptcs-library/library.js';
import {axisBarMin, axisBarMax, axisMin, axisMax, typeIsFullRange, invertScaleRange} from 'ptcs-library/library-chart.js';

import {BehaviorChart} from '../ptcs-behavior-chart.js';
import 'ptcs-behavior-styleable/ptcs-behavior-styleable.js';
import 'ptcs-behavior-focus/ptcs-behavior-focus.js';

import 'ptcs-toolbar/ptcs-toolbar.js';
import 'ptcs-label/ptcs-label.js';
import '../ptcs-chart-layout.js';
import '../ptcs-chart-legend.js';
import '../ptcs-chart-coord.js';
import '../ptcs-chart-icons.js';
import '../axes/ptcs-chart-axis.js';
import '../zoom/ptcs-chart-zoom.js';
import './ptcs-chart-core-combo.js';

import {DrawPlot} from '../draw/ptcs-chart-draw-plot.js';
import {DrawLine} from '../draw/ptcs-chart-draw-line.js';
import {DrawArea} from '../draw/ptcs-chart-draw-area.js';
import {DrawBar} from '../draw/ptcs-chart-draw-bar.js';
import {DrawStackedBars} from '../draw/ptcs-chart-draw-stacked-bars';
import {DrawStackedAreas} from '../draw/ptcs-chart-draw-stacked-areas';
import {markersSet} from '../draw/ptcs-chart-draw-library';

import {
    curveLinear, curveBasis, curveBundle, curveCardinal, curveCatmullRom, curveMonotoneX,
    curveMonotoneY, curveNatural, curveStepBefore, curveStepAfter, curveStep} from 'd3-shape';

/* eslint-disable no-confusing-arrow */

const curveArg = (value, _default) => value !== undefined ? value : _default;

const curve = {
    linear: function() {
        return curveLinear;
    },
    basis: function() {
        return curveBasis;
    },
    bundle: function() {
        return curveBundle.beta(curveArg(this.bundleBeta, 0.5));
    },
    cardinal: function() {
        return curveCardinal.tension(curveArg(this.cardinalTension, 0.5));
    },
    'catmull-rom': function() {
        return curveCatmullRom.alpha(curveArg(this.catmullRomAlpha, 0.5));
    },
    'monotone-x': function() {
        return curveMonotoneX;
    },
    'monotone-y': function() {
        return curveMonotoneY;
    },
    natural: function() {
        return curveNatural;
    },
    step: function() {
        if (this.stepPosition === 'before') {
            return curveStepBefore;
        }
        if (this.stepPosition === 'after') {
            return curveStepAfter;
        }
        return curveStep;
    }
};


// eslint-disable-next-line no-unused-vars
const ChartCombo = class extends BehaviorChart(PTCS.BehaviorFocus(
    PTCS.BehaviorStyleable(PTCS.ThemableMixin(PolymerElement)))) {

    static get template() {
        return html`
        <style>
        :host {
            display: block;
        }

        :host([disabled]) {
            pointer-events: none;
        }

        .yaxis-container:not([flip-axes]) {
            display: flex;
            flex-direction: row;
            height: 100%;
        }

        .yaxis-container[flip-axes] {
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        :host([dragging]) :is(ptcs-chart-legend, ptcs-toolbar, ptcs-chart-zoom, ptcs-label, ptcs-axis)  {
            pointer-events: none;
            user-select: none;
        }
        </style>
        <ptcs-chart-layout id="chart-layout" style="height:100%" part="chart-layout"
                           disabled="[[disabled]]"
                           title-pos="[[titlePos]]" hide-title="[[!titleLabel]]"
                           notes-pos="[[notesPos]]" notes-align="[[notesAlign]]" hide-notes="[[_hideNotes(notesLabel, hideNotes)]]"
                           legend-pos="[[legendPos]]" hide-legend="[[_hideLegend(hideLegend, legend)]]"
                           eff-legend-pos="{{_effLegendPos}}"
                           x-zoom="[[_showZoomX(noXZoom, xZoomRange, xZoomInterval, xZoomSlider, xZoomDrag, xZoomSelect, flipAxes, yZoomSlider)]]"
                           y-zoom="[[_showZoomY(noYZoom, yZoomRange, yZoomInterval, yZoomSlider, yZoomDrag, yZoomSelect, flipAxes, xZoomSlider)]]"
                           flip-axes="[[flipAxes]]"
                           flip-x-axis="[[flipXAxis]]"
                           flip-y-axis="[[flipYAxes]]"
                           spark-view="[[sparkView]]"
                           x-axis="[[!hideXAxis]]"
                           x-axis2="[[_isXReferenceLines]]"
                           y-axis="[[!hideY1Axis]]"
                           y-axis2="[[_showY2Axis(hideY2Axis, _secondaryYAxes.length, _isYReferenceLines)]]"
                           action-bar="[[_actionBar(actionBar, _hideToolbar)]]">
            <div part="title-area" slot="title" style\$="text-align:[[_getHorizontalAlignment(titlePos, titleAlign)]]">
                <ptcs-label part="title-label" label="[[titleLabel]]" variant="[[titleVariant]]"
                    horizontal-alignment="[[_getHorizontalAlignment(titlePos, titleAlign)]]" multi-line></ptcs-label>
            </div>
            <div part="notes-area" slot="notes" style\$="text-align:[[_getHorizontalAlignment(notesPos, notesAlign)]];">
                <ptcs-label part="notes-label" label="[[notesLabel]]" variant="label"
                    horizontal-alignment="[[_getHorizontalAlignment(notesPos, notesAlign)]]" multi-line></ptcs-label>
            </div>
            <ptcs-chart-coord slot="chart" part="chart"
                flip-axes="[[flipAxes]]"
                flip-x-axis="[[flipXAxis]]"
                flip-y-axis="[[flipYAxes]]"
                x-ticks="[[_xTicks]]"
                x2-ticks="[[_xReferenceLines]]"
                y-ticks="[[_yTicks]]"
                y-scale="[[_yScale]]"
                y2-ticks="[[_if(_isYReferenceLines, _yReferenceLines, _y2Ticks)]]"
                y2-scale="[[_y2Scale]]"
                show-x-rulers="[[showXRulers]]"
                show-x2-rulers="[[_isXReferenceLines]]"
                has-y2="[[_showY2Axis(hideY2Axis, _secondaryYAxes.length, _isYReferenceLines)]]"
                show-y-rulers="[[_showYRulers(showYRulers, yAxisRulerAlignment, hideY2Axis)]]"
                show-y2-rulers="[[_showY2Rulers(_isYReferenceLines, showYRulers, yAxisRulerAlignment, hideY2Axis)]]"
                is-reference-lines="[[_or(_isXReferenceLines, _isYReferenceLines)]]"
                y-axis-ruler-alignment="[[yAxisRulerAlignment]]"
                front-rulers="[[frontRulers]]"
                hide-zero-ruler="[[hideZeroRuler]]"
                graph-width="{{_graphWidth}}"
                graph-height="{{_graphHeight}}"
                spark-view="[[sparkView]]">
                <ptcs-chart-core-combo slot="chart" id="chart" part="core-chart" style="pointer-events: auto"
                    tabindex\$="[[_delegatedFocus]]"
                    disabled="[[disabled]]"
                    data="[[data]]"
                    drawables="[[_drawables]]"
                    legend="[[legend]]"
                    selected-legend="[[_selectedLegend]]"
                    x-scale="[[_xScale]]"
                    y-scales="[[_ayScale]]"
                    flip-axes="[[flipAxes]]"
                    zoom-select="[[_zoomSelect(xZoomSelect, noXZoom, yZoomSelect, noYZoom)]]"
                    zoom-drag-x="[[_zoomDrag(xZoomDrag, noXZoom)]]"
                    zoom-drag-y="[[_zoomDrag(yZoomDrag, noYZoom)]]"
                    dragging="{{dragging}}"
                    selection-mode="[[selectionMode]]"
                    on-chart-selection="_onSelectionChanged"
                    on-zoom-selection="_onZoomSelection"></ptcs-chart-core-combo>
            </ptcs-chart-coord>
            <div part="action-bar-area" slot="action-bar">
                <ptcs-toolbar id="toolbar" tabindex\$="[[_gcTabindex(_delegatedFocus, _hideToolbar)]]"
                    part="action-bar" disabled="[[disabled]]" variant="secondary" hide-filter on-activated="_toolbarAction">
                </ptcs-toolbar>
            </div>
            <div part="legend-area" slot="legend">
                <ptcs-chart-legend
                    tabindex\$="[[_delegatedFocus]]"
                    id="legend"
                    part="legend"
                    items="[[_legend]]"
                    shape="[[legendShape]]"
                    filter="[[filterLegend]]"
                    horizontal="[[_horizLegend(_effLegendPos)]]"
                    max-width="[[legendMaxWidth]]"
                    align="[[legendAlign]]"
                    disabled="[[disabled]]"
                    selected="{{_selectedLegend$}}"></ptcs-chart-legend>
            </div>
            <ptcs-chart-zoom slot="xzoom" id="zoomX" part="zoom-xaxis"
                tabindex\$="[[_delegatedFocus]]"
                disabled="[[disabled]]"
                type="[[_xType]]"
                side="[[_xSide(flipXAxis, flipAxes)]]"
                hidden\$="[[noXZoom]]"
                hide-reset
                axis-length="[[_xSize(_graphWidth, _graphHeight, flipAxes)]]"
                min-value="[[_xMin]]"
                max-value="[[_xMax]]"
                zoom-start="{{xZoomStart}}"
                zoom-end="{{xZoomEnd}}"
                range-picker="[[xZoomRange]]"
                interval="[[xZoomInterval]]"
                interval-label="[[xZoomIntervalLabel]]"
                interval-control="[[xZoomIntervalControl]]"
                interval-origin="[[xZoomIntervalOrigin]]"
                show-interval-anchor="[[xShowIntervalAnchor]]"
                slider="[[xZoomSlider]]"
                slider-label="[[xZoomSliderLabel]]"
                slider-min-label="[[xZoomSliderMinLabel]]"
                slider-max-label="[[xZoomSliderMaxLabel]]"
                range-start-label="[[xZoomRangeStartLabel]]"
                range-end-label="[[xZoomRangeEndLabel]]"
                reverse-slider="[[reverseXAxis]]"
                reset-label="[[resetLabel]]"
                interval-from-label="[[xZoomIntervalFromLabel]]"
                interval-to-label="[[xZoomIntervalToLabel]]"></ptcs-chart-zoom>
            <ptcs-chart-axis slot="xaxis" id="xaxis" part="xaxis" style="pointer-events: auto"
                tabindex\$="[[_delegatedFocus]]"
                type="[[_xType]]"
                disabled="[[disabled]]"
                spec-min="[[_specValue(specXMin, xZoomStart, noXZoom)]]"
                spec-max="[[_specValue(specXMax, xZoomEnd, noXZoom)]]"
                side="[[_xSide(flipXAxis, flipAxes)]]"
                label="[[xAxisLabel]]"
                align-label="[[xAxisAlign]]"
                min-value="[[_xMin]]"
                max-value="[[_xMax]]"
                size="[[_xSize(_graphWidth, _graphHeight, flipAxes)]]"
                max-size="[[_if(flipAxes, verticalAxisMaxWidth, horizontalAxisMaxHeight)]]"
                ticks="{{_xTicks}}"
                ticks-rotation="[[horizontalTicksRotation]]"
                tick-format="[[xAxisTickFormat]]"
                reverse="[[reverseXAxis]]"
                scale="{{_xScale}}"
                hidden\$="[[hideXAxis]]"
                outer-padding="[[outerPadding]]"
                inner-padding="[[innerPadding]]"></ptcs-chart-axis>
            <template is="dom-if" if="[[_isXReferenceLines]]">
                <ptcs-chart-axis id="xaxis2" slot="xaxis2" part="xaxis2" style="pointer-events: auto"
                    tabindex\$="[[_delegatedFocus]]"
                    type="[[_xType]]"
                    disabled="[[disabled]]"
                    spec-min="[[_specValue(specXMin, xZoomStart, noXZoom)]]"
                    spec-max="[[_specValue(specXMax, xZoomEnd, noXZoom)]]"
                    side="[[_x2Side(flipXAxis, flipAxes)]]"
                    min-value="[[_xMin]]"
                    max-value="[[_xMax]]"
                    size="[[_xSize(_graphWidth, _graphHeight, flipAxes)]]"
                    max-size="[[_if(flipAxes, verticalAxisMaxWidth, horizontalAxisMaxHeight)]]"
                    ticks="{{_xTicks}}"
                    ticks-rotation="[[horizontalTicksRotation]]"
                    reverse="[[reverseXAxis]]"
                    scale="{{_xScale}}"
                    reference-lines="[[_xAxisReferenceLines]]"
                    eff-reference-lines="{{_xReferenceLines}}"
                    is-reference-lines="[[_isXReferenceLines]]"></ptcs-chart-axis>
            </template>
            <ptcs-chart-zoom slot="yzoom" id="zoomY" part="zoom-yaxis"
                tabindex\$="[[_delegatedFocus]]"
                disabled="[[disabled]]"
                type="number"
                side="[[_ySide(flipYAxes, flipAxes)]]"
                hidden\$="[[noYZoom]]"
                hide-reset
                axis-length="[[_if(flipAxes, _graphWidth, _graphHeight)]]"
                min-value="0"
                max-value="100"
                zoom-start="{{yZoomStart}}"
                zoom-end="{{yZoomEnd}}"
                range-picker="[[yZoomRange]]"
                interval="[[yZoomInterval]]"
                interval-label="[[yZoomIntervalLabel]]"
                interval-control="[[yZoomIntervalControl]]"
                interval-origin="[[yZoomIntervalOrigin]]"
                show-interval-anchor="[[yShowIntervalAnchor]]"
                slider="[[yZoomSlider]]"
                slider-label="[[yZoomSliderLabel]]"
                slider-min-label="[[yZoomSliderMinLabel]]"
                slider-max-label="[[yZoomSliderMaxLabel]]"
                range-start-label="[[yZoomRangeStartLabel]]"
                range-end-label="[[yZoomRangeEndLabel]]"
                reverse-slider="[[reverseYAxis]]"
                reset-label="[[resetLabel]]"
                interval-from-label="[[yZoomIntervalFromLabel]]"
                interval-to-label="[[yZoomIntervalToLabel]]"></ptcs-chart-zoom>
            <div slot="yaxis" class="yaxis-container" flip-axes\$="[[flipAxes]]">
                <template is="dom-repeat" items="{{_primaryYAxes}}">
                    <ptcs-chart-axis part="yaxis" style="pointer-events: auto"
                        tabindex\$="[[_delegatedFocus]]"
                        hidden\$="[[_isHiddenAxis(item._minValue, item._maxValue, item.hide)]]"
                        axis-id="[[item.id]]"
                        disabled="[[disabled]]"
                        type="[[item._type]]"
                        spec-min="[[_yAxisMin(item._minValue, item._maxValue, item._type, item.specMin, item.specMax, yZoomStart)]]"
                        spec-max="[[_yAxisMax(item._minValue, item._maxValue, item._type, item.specMax, item.specMin, yZoomEnd)]]"
                        side="[[_ySide(flipYAxes, flipAxes)]]"
                        label="[[item.label]]"
                        align-label="[[item.align]]"
                        min-value="[[item._minValue]]"
                        max-value="[[item._maxValue]]"
                        size="[[_if(flipAxes, _graphWidth, _graphHeight)]]"
                        max-size="[[_if(flipAxes, horizontalAxisMaxHeight, verticalAxisMaxWidth)]]"
                        ticks-rotation="[[horizontalTicksRotation]]"
                        reverse="[[_reverseY(item.reverse, reverseYAxis)]]"
                        tick-format="[[item.tickFormat]]"
                        on-ticks-changed="_primaryYTicksChanged"
                        on-scale-changed="_primaryYScaleChanged"></ptcs-chart-axis>
                </template>
            </div>
            <div slot="yaxis2" class="yaxis-container" flip-axes\$="[[flipAxes]]" id="yaxis-container2">
                <template is="dom-if" if="[[_isYReferenceLines]]">
                    <ptcs-chart-axis part="yaxis2" is-reflines style="pointer-events: auto"
                        tabindex\$="[[_delegatedFocus]]"
                        disabled="[[disabled]]"
                        scale="[[_yScaleReferenceLines]]"
                        side="[[_y2Side(flipYAxes, flipAxes)]]"
                        size="[[_if(flipAxes, _graphWidth, _graphHeight)]]"
                        max-size="[[_if(flipAxes, horizontalAxisMaxHeight, verticalAxisMaxWidth)]]"
                        ticks-rotation="[[horizontalTicksRotation]]"
                        reference-lines="[[_yAxisReferenceLines]]"
                        eff-reference-lines="{{_yReferenceLines}}"
                        is-reference-lines="[[_isYReferenceLines]]"></ptcs-chart-axis>
                </template>
                <template is="dom-repeat" items="{{_secondaryYAxes}}">
                    <ptcs-chart-axis part="yaxis2" style="pointer-events: auto"
                        tabindex\$="[[_delegatedFocus]]"
                        hidden\$="[[_isHiddenAxis(item._minValue, item._maxValue, item.hide)]]"
                        disabled="[[disabled]]"
                        axis-id="[[item.id]]"
                        type="[[item._type]]"
                        spec-min="[[_yAxisMin(item._minValue, item._maxValue, item._type, item.specMin, item.specMax, yZoomStart)]]"
                        spec-max="[[_yAxisMax(item._minValue, item._maxValue, item._type, item.specMax, item.specMin, yZoomEnd)]]"
                        side="[[_y2Side(flipYAxes, flipAxes)]]"
                        label="[[item.label]]"
                        align-label="[[item.align]]"
                        min-value="[[item._minValue]]"
                        max-value="[[item._maxValue]]"
                        size="[[_if(flipAxes, _graphWidth, _graphHeight)]]"
                        max-size="[[_if(flipAxes, horizontalAxisMaxHeight, verticalAxisMaxWidth)]]"
                        reverse="[[_reverseY(item.reverse, reverseYAxis)]]"
                        tick-format="[[item.tickFormat]]"
                        ticks-rotation="[[horizontalTicksRotation]]"
                        on-ticks-changed="_secondaryYTicksChanged"
                        on-scale-changed="_secondaryYScaleChanged"></ptcs-chart-axis>
                </template>
            </div>
        </ptcs-chart-layout>`;
    }

    static get is() {
        return 'ptcs-chart-combo';
    }

    static get properties() {
        return {
            disabled: {
                type:               Boolean,
                reflectToAttribute: true
            },

            // Title label
            titleLabel: {
                type: String
            },

            // [top] || bottom || left || right
            titlePos: {
                type: String
            },

            // Title label variant
            titleVariant: {
                type:  String,
                value: 'header'
            },

            // Title alignment: left || center || right
            titleAlign: {
                type: String
            },

            hideNotes: {
                type:  Boolean,
                value: false
            },

            // Notes label
            notesLabel: {
                type: String
            },

            // top || [bottom] || left || right
            notesPos: {
                type: String
            },

            notesAlign: {
                type: String
            },

            // X-axis label
            xAxisLabel: {
                type: String
            },

            xAxisAlign: {
                type: String
            },

            xAxisTickFormat: {
                type: String
            },

            hideXAxis: {
                type:     Boolean,
                observer: '_hideXAxisChanged'
            },

            // [{id, type, label, position, align, reverse, hide, min, max, tickFormat}, ...]
            yAxes: {
                type: Array,
            },

            _primaryYAxes: {
                type:  Array,
                value: []
            },

            _secondaryYAxes: {
                type:  Array,
                value: []
            },

            _ayScale: {
                type:  Object,
                value: () => ({})
            },

            // _yAxesValues holds the min and max values for each y-axis, as computed from the data
            // {axisId: [minValue, maxValue]}
            _yAxesValues: {
                type:  Object,
                value: () => ({})
            },

            // {bar: [], area: [], line: [], axisMap: Map }
            _drawables: {
                type:  Object,
                value: {bar: [], area: [], line: [], axisMap: new Map()}
            },

            // [{id, method, order, curve}]
            stacks: {
                type: Array
            },

            hideY1Axis: {
                type:     Boolean,
                observer: '_hideY1AxisChanged'
            },

            hideLegend: {
                type:   Boolean,
                notify: true // Can be toggled via button
            },

            // Names of legends, if legends should be visible
            legend: {
                type: Array
            },

            // Same as legend, but with icons
            _legend: {
                type: Array
            },

            // top || bottom || left || [right]
            legendPos: {
                type: String
            },

            // Same as legendPos, unless chart size limitations forces legend to a different place
            _effLegendPos: {
                type: String
            },

            legendAlign: {
                type: String
            },

            // square || circle || none
            legendShape: {
                type: String
            },

            // Filter chart using the legend?
            filterLegend: {
                type: Boolean
            },

            // Selected legends from legend component
            _selectedLegend$: {
                type: Array
            },

            // Legends currently selected in the legend component
            _selectedLegend: {
                type:     Array,
                computed: '_computeSelectedLegend(_selectedLegend$, legend)',
                observer: '_selectedLegendChanged'
            },

            // top || bottom
            actionBar: {
                type: String
            },

            sparkView: {
                type:  Boolean,
                value: false
            },

            // Flip x- and y-axes
            flipAxes: {
                type:  Boolean,
                value: false
            },

            // Flip x-axis side
            flipXAxis: {
                type: Boolean
            },

            // Flip y-axes sides
            flipYAxes: {
                type: Boolean
            },

            // Connects ticks from x-axis to chart
            _xTicks: {
                type: Array
            },

            // Connects ticks from y-axis to chart
            _yTicks: {
                type: Array
            },

            // Show rulers for X-axis
            showXRulers: {
                type: Boolean
            },

            // Show rulers for Y-axis
            showYRulers: {
                type: Boolean
            },

            // Show rulers for the Y-axis: 'primary' or 'secondary'
            yAxisRulerAlignment: {
                type:     String,
                observer: '_yAxisRulerAlignmentChanged'
            },

            // Put rulers on top of chart
            frontRulers: {
                type: Boolean
            },

            // Reference lines (a.k.a. threshold lines) raw data
            referenceLines: {
                type:     Array,
                observer: 'referenceLinesChanged'
            },

            _yScaleReferenceLines: {
                type: Function
            },

            // Is at least one y-reference line mapped to an axis with a value?
            _isXReferenceLines: {
                type: Boolean
            },

            // Reference lines for y-axes
            _xAxisReferenceLines: {
                type: Array
            },

            // Sorted & filtered reference lines from xaxis2 ptcs-chart-axis
            _xReferenceLines: {
                type: Array
            },

            // Is at least one y-reference line mapped to an axis with a value?
            _isYReferenceLines: {
                type: Boolean
            },

            // Reference lines for y-axes
            _yAxisReferenceLines: {
                type: Array
            },

            // Sorted & filtered secondary y-axis data from ptcs-chart-axis
            _yReferenceLines: {
                type: Array
            },

            // Watches for resizes
            _graphWidth: {
                type: Number
            },

            // Watches for resizes
            _graphHeight: {
                type: Number
            },

            // x-axis type: number || date || label || [string]
            xType: {
                type: Object
            },

            // x-axis type: number || date || [string]
            _xType: {
                type: Object
            },

            // Reverse direction of x-axis
            reverseXAxis: {
                type: Boolean
            },

            // Reverse direction of y-axis
            reverseYAxis: {
                type: Boolean
            },

            // Minimun x value in data
            _xMin: {
                type: Object
            },

            // Maximum x value in data
            _xMax: {
                type: Object
            },

            // y type - for zooming
            _yType: {
                value:    'number',
                readOnly: true
            },

            // Minimun y value in data - for zooming
            _yMin: {
                value:    0,
                readOnly: true
            },

            // Maximum y value in data - for zooming
            _yMax: {
                value:    100,
                readOnly: true
            },

            // Specified x-min-value: baseline || auto || Number
            specXMin: {
                type: Object
            },

            // Specified x-max-value: auto || Number
            specXMax: {
                type: Object
            },

            // Specified y-min-value: baseline || auto || Number
            specYMin: {
                type: Object
            },

            // Specified y-max-value: auto || Number
            specYMax: {
                type: Object
            },

            // Move x-scale from x-axis to chart
            _xScale: {
                type:     Function,
                observer: '_xScaleChanged'
            },

            // Move y-scale from y-axis to chart
            _yScale: {
                type: Function
            },

            // Disable X-axis zooming
            noXZoom: {
                type: Boolean
            },

            // Zooming based on properties
            xZoomStart: {
                type: Object
            },

            xZoomEnd: {
                type: Object
            },

            // Show zoom range UI control
            xZoomRange: {
                type: Boolean
            },

            // X-Axis Zoom Range Start Label
            xZoomRangeStartLabel: {
                type: String
            },

            // X-Axis Zoom Range End Label
            xZoomRangeEndLabel: {
                type: String
            },

            // Specify zoom interval
            xZoomInterval: {
                type: Object
            },

            xZoomIntervalLabel: {
                type: String
            },

            // 'dropdown' || 'radio' || 'textfield'
            xZoomIntervalControl: {
                type: String
            },

            // 'start' || 'end'
            xZoomIntervalOrigin: {
                type: String
            },

            // Allow interval control to manipulate origin?
            xShowIntervalAnchor: {
                type: Boolean
            },

            // Show zoom slider
            xZoomSlider: {
                type: Boolean
            },

            xZoomSliderMaxLabel: {
                type: String
            },

            xZoomSliderMinLabel: {
                type: String
            },

            // X-zoom by selecting two elements
            xZoomSelect: {
                type: Boolean
            },

            // X-zoom by dragging the mouse over the chart
            xZoomDrag: {
                type: Boolean
            },

            // Disable Y-axis zooming
            noYZoom: {
                type: Boolean
            },

            // Zooming based on properties
            // yZoomStart and yZoomEnd zooms all y-axes. The values are percentages which scales the y-axes
            yZoomStart: {
                type: Number
            },

            yZoomEnd: {
                type: Number
            },

            // Show zoom range UI control
            yZoomRange: {
                type: Boolean
            },

            yZoomRangeStartLabel: {
                type: String
            },

            yZoomRangeEndLabel: {
                type: String
            },

            // Specify zoom interval
            yZoomInterval: {
                type: Object
            },

            yZoomIntervalLabel: {
                type: String
            },

            // 'dropdown' || 'radio' || 'textfield'
            yZoomIntervalControl: {
                type: String
            },

            // 'start' || 'end'
            yZoomIntervalOrigin: {
                type: String
            },

            // Allow interval control to manipulate origin?
            yShowIntervalAnchor: {
                type: Boolean
            },

            // Show zoom slider
            yZoomSlider: {
                type: Boolean
            },

            yZoomSliderLabel: {
                type: String
            },

            yZoomSliderMaxLabel: {
                type: String
            },

            yZoomSliderMinLabel: {
                type: String
            },

            // Y-zoom by selecting two elements
            yZoomSelect: {
                type: Boolean
            },

            // Y-zoom by dragging the mouse over the chart
            yZoomDrag: {
                type: Boolean
            },

            // When mouse is dragging on the chart
            dragging: {
                type:               Boolean,
                reflectToAttribute: true
            },

            xZoomIntervalFromLabel: {
                type: String
            },

            xZoomIntervalToLabel: {
                type: String
            },

            yZoomIntervalFromLabel: {
                type: String
            },

            yZoomIntervalToLabel: {
                type: String
            },

            legendMaxWidth: {
                type: Number
            },

            verticalAxisMaxWidth: {
                type: Number
            },

            horizontalAxisMaxHeight: {
                type: Number
            },

            horizontalTicksRotation: {
                type: Number
            },

            // The chart data
            data: {
                type: Array
            },

            hideZeroRuler: {
                type: Boolean
            },

            outerPadding: {
                type: String
            },

            innerPadding: {
                type: String
            },

            groupPadding: {
                type:     String,
                observer: '_groupPaddingChanged'
            },

            // Secondary y-axis
            hideY2Axis: {
                type:     Boolean,
                observer: '_hideY2AxisChanged'
            },

            _y2Scale: {
                type: Function,
            },

            _delegatedFocus: String,

            // 'none' || 'single' || 'multiple'
            selectionMode: {
                type: String
            },

            // Current selection in chart
            _chartSelection: {
                type: Object
            },

            // For the toolbar
            _isZoomable$tb: {
                // eslint-disable-next-line max-len
                computed: '_isZoomable(noXZoom, noYZoom, xZoomRange, yZoomRange, xZoomInterval, yZoomInterval, xZoomSlider, yZoomSlider, xZoomDrag, yZoomDrag, xZoomSelect, yZoomSelect, flipAxes, showZoomButtons)'
            },

            _resetButtonEnabled$tb: {
                computed: '_enableZoomReset(_xType, _xMin, _xMax, xZoomStart, xZoomEnd, _yMin, _yMax, yZoomStart, yZoomEnd, specYMin, specYMax)'
            }
        };
    }

    static get observers() {
        return [
            '_dataChanged(data, xType)',
            '_yAxesChanged(yAxes.*)',
            '_chartChanged(yAxes.*, data, legend, stacks)'
        ];
    }

    ready() {
        super.ready();

        this._yScaleReferenceLines = this.__yScaleReferenceLines.bind(this);

        if (this.hideXAxis === undefined) {
            this.hideXAxis = false;
        }
        if (this.hideY1Axis === undefined) {
            this.hideY1Axis = false;
        }
        if (this.hideY2Axis === undefined) {
            this.hideY2Axis = false;
        }
    }

    _gcTabindex(_delegatedFocus, _hideToolbar) {
        return _hideToolbar ? false : _delegatedFocus;
    }

    _tabindex(filterLegend, _delegatedFocus) {
        return filterLegend ? _delegatedFocus : false;
    }

    _reverseY(reverse1, reverse2) {
        return reverse1 ? !reverse2 : reverse2;
    }

    _isZoomable(noXZoom, noYZoom, xZoomRange, yZoomRange, xZoomInterval, yZoomInterval, xZoomSlider, yZoomSlider, xZoomDrag, yZoomDrag,
        xZoomSelect, yZoomSelect, flipAxes, showZoomButtons) {
        return this._showZoom(noXZoom, xZoomRange, xZoomInterval, xZoomSlider, xZoomDrag, xZoomSelect, !flipAxes, yZoomSlider, showZoomButtons) ||
            this._showZoom(noYZoom, yZoomRange, yZoomInterval, yZoomSlider, yZoomDrag, yZoomSelect, flipAxes, xZoomSlider, showZoomButtons);
    }

    _enableZoomReset(_xType, _xMin, _xMax, xZoomStart, xZoomEnd, _yMin, _yMax, yZoomStart, yZoomEnd, specYMin, specYMax) {
        return this._enabled(_xType, _xMin, _xMax, xZoomStart, xZoomEnd) ||
            this._yEnabled(_yMin, _yMax, yZoomStart, yZoomEnd, specYMin, specYMax);
    }

    _zoomSelect(xZoomSelect, noXZoom, yZoomSelect, noYZoom) {
        return (!noXZoom && xZoomSelect) || (!noYZoom && yZoomSelect);
    }

    _zoomDrag(drag, noZoom) {
        return !noZoom && drag;
    }

    _getHorizontalAlignment(pos, align) {
        if (pos === 'top' || pos === 'bottom') {
            return align;
        }

        return 'start';
    }

    _hideNotes(nodesLabel, hideNotes) {
        return !nodesLabel || hideNotes;
    }

    _hideLegend(hideLegend, legend) {
        return hideLegend || !(legend instanceof Array) || !(legend.length > 0);
    }

    _horizLegend(_effLegendPos) {
        return _effLegendPos === 'top' || _effLegendPos === 'bottom';
    }

    _xSide(flipXAxis, flipAxes) {
        // eslint-disable-next-line no-nested-ternary
        return flipAxes ? (flipXAxis ? 'right' : 'left') : (flipXAxis ? 'top' : 'bottom');
    }

    _x2Side(flipXAxis, flipAxes) {
        // eslint-disable-next-line no-nested-ternary
        return flipAxes ? (flipXAxis ? 'right' : 'left') : (flipXAxis ? 'bottom' : 'top');
    }

    _ySide(flipYAxes, flipAxes) {
        // eslint-disable-next-line no-nested-ternary
        return flipAxes ? (flipYAxes ? 'top' : 'bottom') : (flipYAxes ? 'right' : 'left');
    }

    _y2Side(flipYAxes, flipAxes) {
        // eslint-disable-next-line no-nested-ternary
        return flipAxes ? (flipYAxes ? 'bottom' : 'top') : (flipYAxes ? 'left' : 'right');
    }

    _xSize(_graphWidth, _graphHeight, flipAxes) {
        return flipAxes ? _graphHeight : _graphWidth;
    }

    /*
    _ySize(_graphWidth, _graphHeight, flipAxes) {
        return flipAxes ? _graphWidth : _graphHeight;
    }*/

    _actionBar(actionBar, hideToolbar) {
        if (hideToolbar) {
            return null;
        }

        return actionBar || 'top';
    }

    _showYRulers(showYRulers, yAxisRulerAlignment, hideY2Axis) {
        return showYRulers && (hideY2Axis || yAxisRulerAlignment !== 'secondary');
    }

    _showY2Rulers(_isYReferenceLines, showYRulers, yAxisRulerAlignment, hideY2Axis) {
        return _isYReferenceLines || (showYRulers && !hideY2Axis && yAxisRulerAlignment === 'secondary');
    }

    _showY2Axis(hideY2Axis, numY2Axes, _isYReferenceLines) {
        return !hideY2Axis && (numY2Axes || _isYReferenceLines);
    }

    _showZoom(noZoom, zoomRange, zoomInterval, zoomSlider, zoomDrag, zoomSelect, horzAxis, sliderAlt, showZoomButtons) {
        if (noZoom) {
            return false;
        }
        return zoomRange || zoomInterval || zoomSlider || zoomDrag || zoomSelect || (horzAxis && sliderAlt) || showZoomButtons;
    }

    _showZoomX(noXZoom, xZoomRange, xZoomInterval, xZoomSlider, xZoomDrag, xZoomSelect, flipAxes, yZoomSlider) {
        return this._showZoom(noXZoom, xZoomRange, xZoomInterval, xZoomSlider, xZoomDrag, xZoomSelect, !flipAxes, yZoomSlider);
    }

    _showZoomY(noYZoom, yZoomRange, yZoomInterval, yZoomSlider, yZoomDrag, yZoomSelect, flipAxes, xZoomSlider) {
        return this._showZoom(noYZoom, yZoomRange, yZoomInterval, yZoomSlider, yZoomDrag, yZoomSelect, flipAxes, xZoomSlider);
    }

    _specValue(spec, zoom, noZoom) {
        if (noZoom || zoom === undefined || zoom === '' || zoom === null) {
            return spec;
        }
        return zoom;
    }

    _yZoomMin(_yMin, _yMax, specYMin, specYMax) {
        return axisBarMin(_yMin, _yMax, specYMin, specYMax);
    }

    _yZoomMax(_yMin, _yMax, specYMax, specYMin) {
        return axisBarMax(_yMin, _yMax, specYMin, specYMax);
    }

    _yAxisMin(_yMin, _yMax, yType, specYMin, specYMax, yZoomStart) {
        const min = axisMin(_yMin, _yMax, yType, specYMin, specYMax);
        if (yZoomStart > 0) {
            const max = axisMax(_yMin, _yMax, yType, specYMax, specYMin);
            if (yType === 'number') {
                return min + Math.min(yZoomStart, 100) * (max - min) / 100;
            }
            if (yType === 'date' && min instanceof Date && max instanceof Date) {
                return new Date(min.getTime() + Math.min(yZoomStart, 100) * (max.getTime() - min.getTime()) / 100);
            }
        }
        return min;
    }

    _yAxisMax(_yMin, _yMax, yType, specYMax, specYMin, yZoomEnd) {
        const max = axisMax(_yMin, _yMax, yType, specYMax, specYMin);
        if (yZoomEnd < 100) {
            const min = axisMin(_yMin, _yMax, yType, specYMin, specYMax);
            if (yType === 'number') {
                return max - Math.max(0, 100 - yZoomEnd) * (max - min) / 100;
            }
            if (yType === 'date' && max instanceof Date && min instanceof Date) {
                return new Date(max.getTime() - Math.max(0, 100 - yZoomEnd) * (max.getTime() - min.getTime()) / 100);
            }
        }
        return max;
    }

    _enabled(type, minValue, maxValue, zoomStart, zoomEnd) {
        return !typeIsFullRange(type, minValue, maxValue, zoomStart, zoomEnd);
    }

    _yEnabled(_yMin, _yMax, yZoomStart, yZoomEnd, specYMin, specYMax) {
        return this._enabled(
            'number',
            this._yZoomMin(_yMin, _yMax, specYMin, specYMax),
            this._yZoomMax(_yMin, _yMax, specYMax, specYMin),
            yZoomStart, yZoomEnd);
    }

    get selectedData() {
        return this._chartSelection;
    }

    set selectedData(selection) {
        this.$.chart.selectData(selection);
    }

    // The core chart has changed the selection
    _onSelectionChanged(ev) {
        this._chartSelection = ev.detail.selection;
    }

    _onZoomSelection(ev) {
        // The combo chart simulates an y-scale from 0 to 100 that specifies the current zooming
        const invertYscale = v => {
            const [y1, y2] = [this.yZoomStart || 0, this.yZoomEnd || 100];
            const d1 = this.flipAxes ? this._graphWidth : this._graphHeight;
            const d2 = Math.abs(y2 - y1);
            return y1 + d2 * (d1 - v) / d1;
        };

        const xScale = this._xScale;
        const yScale = {invert: invertYscale};
        let reverseXAxis = this.reverseXAxis;
        let reverseYAxis = this.reverseYAxis;
        let d = ev.detail;
        if (this.flipAxes) {
            d = {x: d.y, y: d.x, w: d.h, h: d.w};
            reverseXAxis = !reverseXAxis;
            reverseYAxis = !reverseYAxis;
        }
        if (this.xZoomDrag || this.xZoomSelect) {
            [this.xZoomStart, this.xZoomEnd] = reverseXAxis
                ? invertScaleRange(xScale, d.x + d.w, d.x) : invertScaleRange(xScale, d.x, d.x + d.w);
        }
        if (this.yZoomDrag || this.yZoomSelect) {
            const [start, end] = reverseYAxis // default y-axis is reversed
                ? invertScaleRange(yScale, d.y, d.y + d.h) : invertScaleRange(yScale, d.y + d.h, d.y);
            this.yZoomStart = start > 0 ? start : undefined;
            this.yZoomEnd = end < 100 ? end : undefined;
        }
    }

    refreshData() {
        this.$.chart.refreshData();
    }

    _resetToDefaultValues() {
        this.$.legend._resetToDefaultValues();
        this.$.zoomX._resetToDefaultValues();
        this.$.zoomY._resetToDefaultValues();
    }

    _dataChanged(data, xType) {
        if (!Array.isArray(data)) {
            this._xType = this._xMin = this._xMax = undefined;
            return;
        }
        try {
            if (xType === 'label' || !xType) {
                this._xType = [...new Set(data.map(item => item[0]))];
                this._xMin = this._xType[0];
                this._xMax = this._xType[this._xType.length - 1];
            } else if (xType === 'number') {
                const ax = data.map(item => item[0]);
                this._xType = xType;
                this._xMin = Math.min(...ax);
                this._xMax = Math.max(...ax);
            } else if (xType === 'date') {
                const ax = data.map(item => item[0].getTime());
                this._xType = xType;
                this._xMin = new Date(Math.min(...ax));
                this._xMax = new Date(Math.max(...ax));
            } else if (Array.isArray(xType) && xType.every(tick => typeof tick === 'string')) {
                this._xType = [...new Set(xType)];
                this._xMin = this._xType[0];
                this._xMax = this._xType[this._xType.length - 1];
            } else {
                this._xType = this._xMin = this._xMax = undefined;
                console.warn('Unknown xType: ' + xType);
            }
        } catch (e) {
            this._xType = this._xMin = this._xMax = undefined;
        }
    }

    // Inform drawables about x-zoom factor (filter out unmapped x-values)
    _setXZoom() {
        const zoomStart = this.xZoomStart !== undefined && this.xZoomStart !== null && this.xZoomStart !== this._xMin;
        const zoomEnd = this.xZoomEnd !== undefined && this.xZoomEnd !== null && this.xZoomEnd !== this._xMax;
        if (zoomStart || zoomEnd) {
            const xScale = this._xScale;
            [...this._drawables.bar, ...this._drawables.line, ...this._drawables.area].forEach(drawable => drawable.zoom(xScale));
        } else {
            [...this._drawables.bar, ...this._drawables.line, ...this._drawables.area].forEach(drawable => drawable.unZoom());
        }
    }

    _xScaleChanged() {
        this._setXZoom();
    }

    _hideXAxisChanged(hide) {
        if (!hide) {
            this.$.xaxis.refresh();
        }
    }

    _isHiddenAxis(_minValue, _maxValue, hide) {
        return (_minValue === null && _maxValue === null) || hide;
    }

    _curve(series) {
        const f = curve[series.curve];
        return f ? f.call(series) : curveLinear;
    }

    // Update minimum and maximum value for y-axis
    _setYRange(axisId, yMin, yMax, yValues) {
        this._yAxesValues[axisId] = yValues ? [yMin, yMax, yValues] : [yMin, yMax];

        // TODO: axis has changed if the yValues changes, even if yMin and yMax is unchanged
        const changed = axis => axis._minValue !== yMin || axis._maxValue !== yMax;

        let index = this._primaryYAxes.findIndex(axis => axis.id === axisId);
        if (index >= 0) {
            if (changed(this._primaryYAxes[index])) {
                this.set(`_primaryYAxes.${index}._type`, yValues || this._primaryYAxes[index].type);
                this.set(`_primaryYAxes.${index}._minValue`, yMin);
                this.set(`_primaryYAxes.${index}._maxValue`, yMax);
                this.$.chart.refresh();
            }
        } else {
            index = this._secondaryYAxes.findIndex(axis => axis.id === axisId);
            if (index >= 0 && changed(this._secondaryYAxes[index])) {
                this.set(`_secondaryYAxes.${index}._type`, yValues || this._secondaryYAxes[index].type);
                this.set(`_secondaryYAxes.${index}._minValue`, yMin);
                this.set(`_secondaryYAxes.${index}._maxValue`, yMax);
                this.$.chart.refresh();
            }
        }
    }

    _updateYRanges() {
        // Compute min / max
        if (!Array.isArray(this.yAxes)) {
            return;
        }

        const axisMap = this._drawables.axisMap;
        const drawables = [...this._drawables.bar, ...this._drawables.line, ...this._drawables.area];

        this.yAxes.forEach(axis => {
            let yMin = null;
            let yMax = null;
            let ySet = null;

            const drawList = drawables.filter(d => axis.id === axisMap.get(d));

            switch (axis.type) {
                case 'number':
                case 'date': {
                    drawList.forEach(drawObj => drawObj.eachY(y => {
                        if (yMin > y || yMin === null) {
                            yMin = y;
                        }
                        if (yMax < y || yMax === null) {
                            yMax = y;
                        }
                    }));
                    break;
                }

                case 'label': {
                    if (!ySet) {
                        ySet = new Set();
                    }
                    drawList.forEach(drawObj => drawObj.eachY(y => ySet.add(typeof y === 'string' ? y : `${y}`)));
                    break;
                }

                default:
                    if (Array.isArray(axis.type) && axis.type.every(tick => typeof tick === 'string')) {
                        console.error('LIST OF TICK STRINGS axis');
                    } else {
                        console.error('Unknown axis type');
                    }
            }

            if (ySet) {
                const yValues = [...ySet];
                const v = index => yValues[index] !== undefined ? yValues[index] : null;

                this._setYRange(axis.id, v(0), v(yValues.length - 1), yValues);
            } else {
                this._setYRange(axis.id, yMin, yMax);
            }
        });
    }

    _yAxesChanged(cr) {
        const sepName = {primary: 'primary', secondary: 'secondary'};
        const sepAxes = {primary: [], secondary: []};
        if (Array.isArray(this.yAxes)) {
            this.yAxes.forEach((axis, index) => {
                const minMax = this._yAxesValues[axis.id] || [null, null];
                const where = sepName[axis.position] || (index ? 'secondary' : 'primary');
                sepAxes[where].push({...axis, _minValue: minMax[0], _maxValue: minMax[1], _type: axis.type});
            });
        }
        this.__yAxesTicks = {};
        this._primaryYAxes = sepAxes.primary;
        this._secondaryYAxes = sepAxes.secondary;
    }

    _chartChanged(/*yAxes.*, data, legend, stacks*/) {
        if (this.__chartChangedDebounce) {
            return;
        }
        this.__chartChangedDebounce = true;
        requestAnimationFrame(() => {
            this.__chartChangedDebounce = undefined;
            this.__chartChanged();
        });
    }

    __chartChanged() {
        const legend = Array.isArray(this.legend) ? this.legend : [];
        const data = Array.isArray(this.data) ? this.data : [];
        const alwaysNull = () => null;
        const id2yAxis = Array.isArray(this.yAxes) ? id => this.yAxes.find(axis => axis.id === id) : alwaysNull;
        const id2stack = Array.isArray(this.stacks) ? id => this.stacks.find(_stack => _stack.id === id) : alwaysNull;

        // Index to every x-value: [0, 1, ..., N - 1];
        let _allIxs;

        // Don't duplicate _allIxs array
        const allIxs = () => {
            if (!_allIxs) {
                _allIxs = Array.from(data, (_, index) => index);
            }
            return _allIxs;
        };

        const drawables = {bar: [], area: [], line: [], axisMap: new Map()};

        const mapStack = new Map();

        // Bind Drawable / Chart graph to yAxis
        const bindToYAxis = (drawable, yAxis) => {
            drawable.setSelectedSeries(this._selectedLegend);

            if (drawable && yAxis.id) {
                drawables.axisMap.set(drawable, yAxis.id);
            }
            return drawable;
        };

        // Process series (map to axes or stacks)
        legend.forEach((series, seriesIx) => {
            const renderOnStack = id2stack(series.renderOn);
            const renderOnYAxis = !renderOnStack && id2yAxis(series.renderOn);

            if (renderOnStack) {
                const stackList = mapStack.get(renderOnStack);
                if (stackList) {
                    stackList.push(seriesIx);
                } else {
                    mapStack.set(renderOnStack, [seriesIx]);
                }
            } else if (renderOnYAxis) {
                const valueFormat = series.showValues && (series.valueFormat || id2yAxis(series.renderOn).tickFormat);
                if (series.curve === 'bar') {
                    drawables.bar.push(bindToYAxis(
                        new DrawBar(seriesIx, data, allIxs, +this.groupPadding, series.showValues, valueFormat),
                        renderOnYAxis));
                } else if (series.showArea) {
                    drawables.area.push(bindToYAxis(new DrawArea(
                        seriesIx, data, allIxs, this._curve(series), series.showLine,
                        series.marker, series.markerSize, series.showValues, series.valueFormat, valueFormat), renderOnYAxis));
                } else if (series.showLine) {
                    drawables.line.push(bindToYAxis(new DrawLine(
                        seriesIx, data, allIxs, this._curve(series),
                        series.marker, series.markerSize, series.showValues, valueFormat), renderOnYAxis));
                } else if (markersSet.has(series.marker)) {
                    drawables.line.push(bindToYAxis(new DrawPlot(
                        seriesIx, data, allIxs,
                        series.marker, series.markerSize, series.showValues, valueFormat), renderOnYAxis));
                }
            }
        });

        // Create stacked data
        mapStack.forEach((seriesIxs, stackOn) => {
            const renderOnYAxis = id2yAxis(stackOn.yaxis);
            if (!renderOnYAxis || renderOnYAxis.type !== 'number') {
                console.error('Data can only be stacked on numeric y-axis: ' + stackOn.yaxis);
                return;
            }

            const showValues = seriesIxs.map(i => legend[i].showValues);
            const formatValues = seriesIxs.map(i => PTCS.formatValue(legend[i].valueFormat || renderOnYAxis.tickFormat));

            if (stackOn.curve === 'bar') {
                drawables.bar.push(bindToYAxis(new DrawStackedBars(
                    seriesIxs, data, stackOn.method, stackOn.order, +this.groupPadding, showValues, formatValues, stackOn.showSum), renderOnYAxis));
            } else {
                const markers = seriesIxs.map(i => [legend[i].marker, legend[i].markerSize]);
                drawables.area.push(bindToYAxis(new DrawStackedAreas(
                    seriesIxs, data, stackOn.method, stackOn.order, this._curve(stackOn), markers, showValues, formatValues), renderOnYAxis));
            }
        });

        // Assign legend icons
        const allDrawables = [...drawables.bar, ...drawables.area, ...drawables.line];

        this._legend = legend.map((series, seriesIx) => {
            const drawable = allDrawables.find(d => d.displaysSeries(seriesIx));
            return drawable ? {...series, icon: `chart-icons:${drawable && drawable.chartType}`} : series;
        });

        // Inform bars about their available bandwidth
        drawables.bar.filter(bar => !bar.hidden).forEach((bar, index, a) => bar.setBand(index, a.length));

        // Publish new drawables
        this._drawables = drawables;

        // Compute min / max for all y-axes
        this._updateYRanges();

        // Adjust the zoom factor (filter out unmapped x-values)
        this._setXZoom();
    }

    _computeSelectedLegend(_selectedLegend$, legend) {
        if (Array.isArray(_selectedLegend$)) {
            return _selectedLegend$;
        }
        if (Array.isArray(legend)) {
            return legend.map((_, i) => i);
        }
        return [];
    }

    _selectedLegendChanged(_selectedLegend) {
        const selectedSeries = Array.isArray(_selectedLegend) ? _selectedLegend : [];

        // Inform all drawables about the new legend filter
        [...this._drawables.bar, ...this._drawables.line, ...this._drawables.area]
            .forEach(d => d.setSelectedSeries(selectedSeries));

        // Inform bars about their available bandwidth
        this._drawables.bar.filter(bar => !bar.hidden).forEach((bar, index, a) => bar.setBand(index, a.length));

        // Adapt y-axis ranges
        this._updateYRanges();

        // Make sure the changes are displayed
        this.$.chart.refresh();
    }

    _groupPaddingChanged(groupPadding) {
        if (this._drawables.bar.length) {
            this._drawables.bar.forEach(drawable => drawable.setPadding(+groupPadding));
            this.$.chart.refresh();
        }
    }

    // This function simulates a scale function for the reference lines
    // The value argument is an index into _yAxisReferenceLines
    // The return value is the current scale value of the reference lines
    __yScaleReferenceLines(value) {
        try {
            const line = Array.isArray(this._yAxisReferenceLines) && this._yAxisReferenceLines[value];
            if (!line || !(this._primaryYAxes.some(a => a.id === line.axis) || this._secondaryYAxes.some(a => a.id === line.axis))) {
                return undefined; // Axis is not in use
            }
            const scale = this._ayScale[line.axis];
            const d = scale.domain()[0];

            if (typeof d === 'number') {
                return scale(typeof line._value === 'number' ? line._value : Number(line._value));
            }
            if (d instanceof Date) {
                return scale(line._value instanceof Date ? line._value : new Date(line._value));
            }
            return scale(line._value);
        } catch (e) {
            // Ignore error. Many things can go wrong above...
        }
        return undefined;
    }

    // Request to recompute _isYReferenceLines
    _updateIsYReferenceLines() {
        if (this._computeIsReferenceLines) {
            return;
        }
        this._computeIsReferenceLines = true;
        requestAnimationFrame(() => {
            this._computeIsReferenceLines = undefined;
            this._isYReferenceLines = Array.isArray(this._yAxisReferenceLines) &&
                this._yAxisReferenceLines.some(item => item._value !== undefined && item.axis);

            // Update scale, so axis is updated
            const reflinesEl = this.$['yaxis-container2'].querySelector(':scope > [is-reflines]');
            if (reflinesEl) {
                reflinesEl.refresh();
            }
        });
    }

    referenceLinesChanged(referenceLines) {
        const reset = v => v ? undefined : v; // Keep old value, if falsy

        if (!Array.isArray(referenceLines)) {
            this._xAxisReferenceLines = reset(this._xAxisReferenceLines);
            this._yAxisReferenceLines = reset(this._yAxisReferenceLines);
            this._isXReferenceLines = reset(this._isXReferenceLines);
            this._isYReferenceLines = reset(this._isYReferenceLines);
            return;
        }

        const xAxisReferenceLines = [];
        const yAxisReferenceLines = [];

        this.referenceLines.forEach((line, index) => {
            if (line.axis === 'xaxis') {
                if (this._xType === 'number') {
                    if (!isNaN(line.value)) {
                        xAxisReferenceLines.push(line);
                    }
                } else if (this._xType === 'date') {
                    const d = line.value instanceof Date ? line.value : new Date(line.value);
                    if (!isNaN(d)) {
                        xAxisReferenceLines.push({...line, value: d});
                    }
                }
            } else {
                yAxisReferenceLines.push({label: line.label, _value: line.value, axis: line.axis, value: yAxisReferenceLines.length});
            }
        });

        this._xAxisReferenceLines = xAxisReferenceLines.length && xAxisReferenceLines;
        this._yAxisReferenceLines = yAxisReferenceLines.length && yAxisReferenceLines;
        this._isXReferenceLines = xAxisReferenceLines.length > 0;
        this._updateIsYReferenceLines();
    }

    // The scale for axisId has changed
    _updateYReferenceValues(axisId) {
        if (!Array.isArray(this._yAxisReferenceLines)) {
            return;
        }
        if (this._yAxisReferenceLines.some(line => line.axis === axisId)) {
            // Need to recalculate _isYReferenceLines
            this._updateIsYReferenceLines();
        }
    }

    _yAxisRulerAlignmentChanged() {
        if (this.__yAxisRulerAlignment$) {
            return;
        }
        this.__yAxisRulerAlignment$ = true;
        requestAnimationFrame(() => {
            this.__yAxisRulerAlignment$ = undefined;

            if (!this.__yAxesTicks || !this._primaryYAxes || !this._secondaryYAxes) {
                this._yTicks = this._y2Ticks = undefined;
                this._yScale = this._y2Scale = undefined;
            } else if (this._primaryYAxes.find(axis => axis.id === this.yAxisRulerAlignment)) {
                this._yTicks = this.__yAxesTicks[this.yAxisRulerAlignment];
                this._yScale = this._ayScale[this.yAxisRulerAlignment];
                this._y2Ticks = undefined;
                this._y2Scale = undefined;
            } else if (this._secondaryYAxes.find(axis => axis.id === this.yAxisRulerAlignment)) {
                this._yTicks = undefined;
                this._yScale = undefined;
                this._y2Ticks = this.__yAxesTicks[this.yAxisRulerAlignment];
                this._y2Scale = this._ayScale[this.yAxisRulerAlignment];
            } else if ((this.yAxisRulerAlignment === 'primary' || !this.yAxisRulerAlignment) && this._primaryYAxes.length > 0) {
                this._yTicks = this.__yAxesTicks[this._primaryYAxes[0].id];
                this._yScale = this._ayScale[this._primaryYAxes[0].id];
                this._y2Ticks = undefined;
                this._y2Scale = undefined;
            } else if (this.yAxisRulerAlignment === 'secondary' && this._secondaryYAxes.length > 0) {
                this._yTicks = undefined;
                this._yScale = undefined;
                this._y2Ticks = this.__yAxesTicks[this._secondaryYAxes[0].id];
                this._y2Scale = this._ayScale[this._secondaryYAxes[0].id];
            } else {
                this._yTicks = this._y2Ticks = undefined;
                this._yScale = this._y2Scale = undefined;
            }
        });
    }

    _primaryYTicksChanged(ev) {
        if (ev.target.axisId && this.__yAxesTicks) {
            this.__yAxesTicks[ev.target.axisId] = ev.detail.value;
            if (this.yAxisRulerAlignment === ev.target.axisId || this.yAxisRulerAlignment === 'primary' || !this.yAxisRulerAlignment) {
                this._yAxisRulerAlignmentChanged();
            }
        }
    }

    _primaryYScaleChanged(ev) {
        this._ayScale[ev.target.axisId] = ev.detail.value;
        this._updateYReferenceValues(ev.target.axisId);
        this.$.chart.refresh();
    }

    _secondaryYTicksChanged(ev) {
        if (ev.target.axisId && this.__yAxesTicks) {
            this.__yAxesTicks[ev.target.axisId] = ev.detail.value;
            if (this.yAxisRulerAlignment === ev.target.axisId || this.yAxisRulerAlignment === 'secondary') {
                this._yAxisRulerAlignmentChanged();
            }
        }
    }

    _secondaryYScaleChanged(ev) {
        this._ayScale[ev.target.axisId] = ev.detail.value;
        this._updateYReferenceValues(ev.target.axisId);
        this.$.chart.refresh();
    }

    _hideY1AxisChanged(hideY1Axis) {
        if (!hideY1Axis) {
            this.shadowRoot.querySelectorAll('[part=yaxis]').forEach(yaxis => yaxis.refresh());
        }
    }

    _hideY2AxisChanged(hideY2Axis) {
        if (!hideY2Axis) {
            this.shadowRoot.querySelectorAll('[part=yaxis2]').forEach(yaxis => yaxis.refresh());
        }
    }
};

// customElements.define(PTCS.ChartCombo.is, PTCS.ChartCombo);
