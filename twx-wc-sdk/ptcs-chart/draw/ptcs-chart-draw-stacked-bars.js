import {DrawStack} from './ptcs-chart-draw-stack';
import {removeChildren} from './ptcs-chart-draw-library';
import {select} from 'd3-selection';

/* eslint-disable no-inner-declarations */

const showBarValuesSet = new Set(['outside', 'inside', 'inside-end']);

export class DrawStackedBars extends DrawStack {
    constructor(seriesIxs, data, method, order, padding, showValues, formatValues, showSum) {
        super(seriesIxs, data, method, order);
        this._padding = isNaN(padding) ? 0 : padding;
        this._showValues = showValues;
        this._formatValues = formatValues;
        this._showSum = showSum;
    }

    get chartType() {
        return 'stacked-bars';
    }

    setBand(index, numBands) {
        this._index = index;
        this._numBands = numBands;
    }

    setPadding(padding) {
        this._padding = padding;
    }

    _barPositons(xScale, yScale) {
        const bandwidth = xScale.bandwidth ? Math.max(xScale.bandwidth(), 1) : 0;
        const padding = (Math.min(Math.max(this._padding, 0), 80) / 100) * (bandwidth / this._numBands);
        const barW = Math.max((bandwidth - (this._numBands - 1) * padding) / this._numBands, 1);
        const deltaX = this._index * (barW + padding);
        const xPos = deltaX ? value => xScale(value) + deltaX : xScale;
        const deltaY = yScale.bandwidth ? Math.max(yScale.bandwidth() / 2, 1) : 0;
        const yPos = deltaY ? value => yScale(value) + deltaY : yScale;

        return {xPos, yPos, barW: Math.max(barW, 1)};
    }

    _drawBarFunc(xScale, yScale, flipAxes) {
        const {xPos, yPos, barW} = this._barPositons(xScale, yScale);

        function drawVerticalBar(d) {
            const x = xPos(d.data[0]);
            const y1 = yPos(d[0]);
            const y2 = yPos(d[1]);

            this.setAttribute('part', 'bar');
            this.setAttribute('x', x);
            this.setAttribute('y', Math.min(y1, y2));
            this.setAttribute('width', barW);
            this.setAttribute('height', Math.max(1, Math.abs(y2 - y1)));
        }

        function drawHorizontalBar(d) {
            const x = xPos(d.data[0]);
            const y1 = yPos(d[0]);
            const y2 = yPos(d[1]);

            this.setAttribute('part', 'bar');
            this.setAttribute('x', Math.min(y1, y2));
            this.setAttribute('y', x);
            this.setAttribute('width', Math.max(1, Math.abs(y2 - y1)));
            this.setAttribute('height', barW);
        }

        return flipAxes ? drawHorizontalBar : drawVerticalBar;
    }

    _drawBars(el, data, {xScale, yScale, flipAxes, selectionMgr}) {
        const drawBar = this._drawBarFunc(xScale, yScale, flipAxes);
        const serieIx = data.key;
        const legend = `L${serieIx + 1}`;

        // Find number of zoomed out items - via linear search :-(
        const d0 = data[0].data;
        const i0 = this._fullData.find(row => row.key === serieIx).findIndex(d => d.data === d0);

        const selected = (i0 >= 0 && selectionMgr)
            ? (_, i) => selectionMgr.isSelected({valueIx: this._mapValueIx(i + i0), serieIx}) || null
            : false;

        const join = select(el)
            .selectAll('rect')
            .data(data);

        join.enter()
            .append('rect')
            .attr('legend', legend)
            .attr('selected', selected)
            .each(drawBar);

        join.attr('legend', legend)
            .attr('selected', selected)
            .each(drawBar);

        join.exit().remove();
    }

    draw(options) {
        const that = this;

        function drawBars(d) {
            that._drawBars(this, d, options);
        }

        // Root element should only contain g elements
        removeChildren(options.el, ':not(g)');

        const join = select(options.el)
            .selectAll('g')
            .data(this._data);

        // Enter
        join.enter()
            .append('g')
            .each(drawBars);

        // Update
        join.each(drawBars);

        // Exit
        join.exit().remove();
    }

    updateSelection({el, selectionMgr}) {
        const fullData = this._fullData;
        const map = this._mapValueIx.bind(this);

        function updateSel(d) {
            const serieIx = d.key;

            // Find number of zoomed out items - via linear search :-(
            const d0 = d[0].data;
            const i0 = fullData.find(row => row.key === serieIx).findIndex(_d => _d.data === d0);

            const selected = (i0 >= 0 && selectionMgr)
                ? (_, i) => selectionMgr.isSelected({valueIx: map(i0 + i), serieIx}) || null
                : false;

            select(this).selectAll('rect').data(d).attr('selected', selected);
        }

        select(el).selectAll('g').data(this._data).each(updateSel);
    }

    showSelection({el, xScale, yScale, flipAxes, selection, cb}) {
        const {data, sels} = this.extractSelection(xScale, selection);

        const _drawBar = this._drawBarFunc(xScale, yScale, flipAxes);

        function drawBar(d, i) {
            _drawBar.call(this, d, i);
            this.setAttribute('legend', `L${sels[i].serieIx + 1}`);
            if (cb) {
                cb.call(this, sels[i]);
            }
        }

        removeChildren(el, ':not(rect)');

        const join = select(el)
            .selectAll('rect')
            .data(data);

        join.enter()
            .append('rect')
            .each(drawBar);

        join.each(drawBar);

        join.exit().remove();
    }


    // Bar charts don't use markers
    drawMarkers({el}) {
        removeChildren(el);
    }

    updateMarkerSelection() {
        // Do nothing
    }


    drawValues({el, xScale, yScale, flipAxes}) {
        if (this._hidden || !Array.isArray(this._showValues) || this._showValues.every(showValues => !showBarValuesSet.has(showValues))) {
            // Hide all values
            removeChildren(el);
            return;
        }

        const {xPos, yPos, barW} = this._barPositons(xScale, yScale);
        const deltaX = barW / 2;
        const _x = d => xPos(d.data[0]) + deltaX;
        const data = this._data;

        // Collect series that should show values
        const ixs = this._six.reduce((a, seriesIx, index) => {
            const ix = this._seriesIxs.indexOf(seriesIx);
            if (showBarValuesSet.has(this._showValues[ix])) {
                a.push([index, seriesIx, this._showValues[ix], this._formatValues[ix]]);
            }
            return a;
        }, []);

        const multiBar = this._six.length > 1;
        const range = yScale.range();
        const reverse = range[0] > range[1];
        let tooWide = false; // Is any label too wide?

        const selectTransform = (showValues) => {
            const f = (x, y) => `translate(${x}px,${y}px)`;

            switch (showValues) {
                case 'outside':
                    if (flipAxes) {
                        return reverse
                            ? (x, y0, y1, w, h) => f(y1 - w, x - h / 2)
                            : (x, y0, y1, w, h) => f(y1, x - h / 2);
                    }
                    return reverse
                        ? (x, y0, y1, w, h) => f(x - w / 2, y1)
                        : (x, y0, y1, w, h) => f(x - w / 2, y1 - h);

                case 'inside':
                    if (flipAxes) {
                        return reverse
                            ? (x, y0, y1, w, h) => f(y0 - w, x - h / 2)
                            : (x, y0, y1, w, h) => f(y0, x - h / 2);
                    }
                    return reverse
                        ? (x, y0, y1, w, h) => f(x - w / 2, y0)
                        : (x, y0, y1, w, h) => f(x - w / 2, y0 - h);

                case 'inside-end':
                    if (flipAxes) {
                        return reverse
                            ? (x, y0, y1, w, h) => f(Math.min(y0 - w, y1), x - h / 2)
                            : (x, y0, y1, w, h) => f(Math.max(y0, y1 - w), x - h / 2);
                    }
                    return reverse
                        ? (x, y0, y1, w, h) => f(x - w / 2, Math.max(y0, y1 - h))
                        : (x, y0, y1, w, h) => f(x - w / 2, Math.min(y0 - h, y1));
            }
            return null;
        };

        function drawSeriesValues([index, seriesIx, showValues, formatValue]) {
            const legend = `L${data[index].key + 1}`;
            const label = d => formatValue(d.data[1][seriesIx]);
            const transform = selectTransform(showValues === 'outside' && multiBar ? 'inside-end' : showValues);

            function drawValue(d) {
                this.style.display = '';

                const {clientWidth, clientHeight} = this;
                const y0 = yPos(d[0]);
                const y1 = yPos(d[1]);
                const barH = Math.abs(y1 - y0);

                if (flipAxes) {
                    if (clientHeight > barW || (clientHeight > barH && multiBar)) {
                        // This value cannot be shown
                        this.style.display = 'none';
                        return;
                    }
                } else if (clientWidth > barW) {
                    if (clientHeight > barW) {
                        // This value cannot be shown, even if it is rotated
                        this.style.display = 'none';
                        return;
                    }
                    tooWide = true; // Request rotation
                } else if (clientHeight > barH && multiBar) {
                    // This value is too high for the bar
                    this.style.display = 'none';
                    return;
                }

                this.style.transform = transform(_x(d), y0, y1, clientWidth, clientHeight);
            }

            el.removeAttribute('rotate-values');

            const join = select(this)
                .selectAll('ptcs-label')
                .data(data[index]);

            join.enter()
                .append('ptcs-label')
                .attr('part', 'value')
                .attr('variant', 'label')
                .attr('legend', legend)
                .property('horizontalAlignment', 'center')
                .property('label', label)
                .each(drawValue);

            join.attr('legend', legend)
                .property('label', label)
                .each(drawValue);

            join.exit().remove();
        }

        removeChildren(el, ':not(div.multi-bar-value)');

        const join = select(el)
            .selectAll('div.multi-bar-value')
            .data(ixs);

        join.enter()
            .append('div')
            .attr('class', 'multi-bar-value')
            .each(drawSeriesValues);

        join.each(drawSeriesValues);

        join.exit().remove();

        // Rotate labels?
        if (tooWide) {

            function rotateSeriesValues([index, seriesIx, showValues]) {
                const transform = selectTransform(showValues === 'outside' && multiBar ? 'inside-end' : showValues);

                function rotateValue(d) {
                    const {clientWidth, clientHeight} = this;
                    const y0 = yPos(d[0]);
                    const y1 = yPos(d[1]);
                    const barH = Math.abs(y1 - y0);

                    if (clientWidth > barW || (clientHeight > barH && multiBar)) {
                        this.style.display = 'none';
                    }

                    this.style.transform = transform(_x(d), y0, y1, clientWidth, clientHeight);
                }

                select(this)
                    .selectAll('ptcs-label')
                    .data(data[index])
                    .each(rotateValue);
            }

            el.setAttribute('rotate-values', '');

            select(el)
                .selectAll('div.multi-bar-value')
                .data(ixs)
                .each(rotateSeriesValues);
        }
    }
}
