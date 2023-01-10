import {PTCS} from 'ptcs-library/library.js';
import {DrawBase} from './ptcs-chart-draw-base';
import {removeChildren} from './ptcs-chart-draw-library';
import {select} from 'd3-selection';

export class DrawBar extends DrawBase {
    constructor(seriesIx, data, allIxs, padding, showValues, valueFormat) {
        super(seriesIx, data, allIxs);
        this._padding = isNaN(padding) ? 0 : padding;
        this._showValues = showValues;
        this._valueFormat = valueFormat;
    }

    get chartType() {
        return 'bar';
    }

    eachY(cb) {
        if (!this._hidden) {
            cb(0); // Add zero for bar charts
            this._xixOrg.forEach(index => cb(this._data[index][1][this._seriesIx]));
        }
    }

    eachVisible(cb) {
        if (!this._hidden) {
            const data = this._data;
            this._xix.forEach(index => {
                const y = data[index][1][this._seriesIx];
                cb(data[index][0], y, index, this._seriesIx, Math.min(y, 0), Math.max(y, 0), this._index);
            });
        }
    }

    setBand(index, numBands) {
        this._index = index;
        this._numBands = numBands;
    }

    setPadding(padding) {
        this._padding = padding;
    }

    _barFunctions(xScale, yScale) {
        const bandwidth = xScale.bandwidth ? Math.max(xScale.bandwidth(), 1) : 0;
        const padding = (Math.min(Math.max(this._padding, 0), 80) / 100) * (bandwidth / this._numBands);
        const barW = Math.max((bandwidth - (this._numBands - 1) * padding) / this._numBands, 1);
        const barX = this._index * (barW + padding);

        const deltaY = yScale.bandwidth ? Math.max(yScale.bandwidth() / 2, 1) : 0;
        const _yScale = deltaY ? value => yScale(value) + deltaY : yScale;

        const data = this._data;

        const xPos = i => xScale(data[i][0]) + barX;
        const yPos = i => _yScale(data[i][1][this._seriesIx]);
        const yPos0 = _yScale(0);

        return {xPos, yPos, yPos0, barW};
    }

    _drawBarFunc(xScale, yScale, flipAxes, selectionMgr, cb) {
        const {xPos, yPos, yPos0, barW} = this._barFunctions(xScale, yScale);

        const legend = this._legend;
        const serieIx = this._seriesIx;

        function setBar(valueIx) {
            this.setAttribute('part', 'bar');
            this.setAttribute('legend', legend);
            if (selectionMgr) {
                PTCS.setbattr(this, 'selected', selectionMgr.isSelected({valueIx, serieIx}));
            }
            if (cb) {
                cb.call(this, {valueIx, serieIx});
            }
        }

        function drawVerticalBar(valueIx) {
            const y = yPos(valueIx);

            this.setAttribute('x', xPos(valueIx));
            this.setAttribute('y', Math.min(y, yPos0));
            this.setAttribute('width', barW);
            this.setAttribute('height', Math.abs(y - yPos0));

            setBar.call(this, valueIx);
        }

        function drawHorizontalBar(valueIx) {
            const y = yPos(valueIx);

            this.setAttribute('x', Math.min(y, yPos0));
            this.setAttribute('y', xPos(valueIx));
            this.setAttribute('width', Math.abs(y - yPos0));
            this.setAttribute('height', barW);

            setBar.call(this, valueIx);
        }

        return flipAxes ? drawHorizontalBar : drawVerticalBar;
    }


    draw({el, xScale, yScale, flipAxes, selectionMgr}) {
        const drawBar = this._drawBarFunc(xScale, yScale, flipAxes, selectionMgr);

        // Root element should only contain rect elements
        removeChildren(el, ':not(rect)');

        const join = select(el)
            .selectAll('rect')
            .data(this._hidden ? [] : this._xix);

        join.enter()
            .append('rect')
            .each(drawBar);

        join.each(drawBar);

        join.exit().remove();
    }

    updateSelection({el, selectionMgr}) {
        const serieIx = this._seriesIx;
        const selected = selectionMgr
            ? valueIx => selectionMgr.isSelected({valueIx, serieIx}) || null
            : false;

        select(el).selectAll('rect').data(this._hidden ? [] : this._xix).attr('selected', selected);
    }

    // Bar charts don't use markers
    drawMarkers({el}) {
        removeChildren(el);
    }

    updateMarkerSelection() {
        // Do nothing
    }

    drawValues({el, xScale, yScale, flipAxes}) {
        const {xPos, yPos, yPos0, barW} = this._barFunctions(xScale, yScale);
        const _xPos = i => xPos(i) + barW / 2;
        const _barW = barW + 6; // Add some pixels to adjust for label padding
        const legend = this._legend;
        const seriesIx = this._seriesIx;
        const data = this._data;
        const formatValue = PTCS.formatValue(this._valueFormat);
        const value = index => formatValue(data[index][1][seriesIx]);
        const range = yScale.range();
        const reverse = range[0] > range[1];
        let tooWide = false; // Is any label too wide?
        let rotated = false; // Rotate labels because some of them are too wide (hide label it still doesn't fit)

        const selectTransform = () => {
            const f = (x, y) => `translate(${x}px,${y}px)`;

            switch (this._showValues) {
                case 'outside':
                    if (flipAxes) {
                        return reverse
                            ? (x, y, w, h) => f(y - w, x - h / 2)
                            : (x, y, w, h) => f(y, x - h / 2);
                    }
                    return reverse
                        ? (x, y, w, h) => f(x - w / 2, y)
                        : (x, y, w, h) => f(x - w / 2, y - h);

                case 'inside':
                    if (flipAxes) {
                        return reverse
                            ? (x, y, w, h) => f(yPos0 - w, x - h / 2)
                            : (x, y, w, h) => f(yPos0, x - h / 2);
                    }
                    return reverse
                        ? (x, y, w, h) => f(x - w / 2, yPos0)
                        : (x, y, w, h) => f(x - w / 2, yPos0 - h);

                case 'inside-end':
                    if (flipAxes) {
                        return reverse
                            ? (x, y, w, h) => f(Math.min(yPos0 - w, y), x - h / 2)
                            : (x, y, w, h) => f(Math.max(yPos0, y - w), x - h / 2);
                    }
                    return reverse
                        ? (x, y, w, h) => f(x - w / 2, Math.max(yPos0, y - h))
                        : (x, y, w, h) => f(x - w / 2, Math.min(yPos0 - h, y));
            }
            return null;
        };

        const transform = selectTransform();

        function drawValue(index) {
            this.style.display = '';

            const {clientWidth, clientHeight} = this;
            if (clientWidth > _barW) {
                tooWide = true;
                if (rotated) {
                    this.style.display = 'none';
                }
            }

            this.style.display = clientWidth > barW && rotated ? 'none' : '';
            this.style.transform = transform(_xPos(index), yPos(index), clientWidth, clientHeight);
        }

        el.removeAttribute('rotate-values');

        // Root element should only contain values
        removeChildren(el, ':not(ptcs-label[part=value])');

        const join = select(el)
            .selectAll('ptcs-label[part=value]')
            .data(transform && !this._hidden ? this._xix : []);

        join.enter()
            .append('ptcs-label')
            .attr('part', 'value')
            .attr('variant', 'label')
            .property('horizontalAlignment', 'center')
            .attr('legend', legend)
            .property('label', value)
            .each(drawValue);

        join.attr('legend', 'legend')
            .property('label', value)
            .each(drawValue);

        join.exit().remove();

        // Rotate labels?
        if (tooWide) {
            rotated = true;

            el.setAttribute('rotate-values', '');

            select(el)
                .selectAll('ptcs-label[part=value]')
                .data(transform && !this._hidden ? this._xix : [])
                .each(drawValue);
        }
    }

    showSelection({el, xScale, yScale, flipAxes, selection, cb}) {
        const drawBar = this._drawBarFunc(xScale, yScale, flipAxes, undefined, cb);
        const xix = this._extractSelection(selection, xScale);

        // Root element should only contain rect elements
        removeChildren(el, ':not(rect)');

        const join = select(el)
            .selectAll('rect')
            .data(xix);

        join.enter()
            .append('rect')
            .each(drawBar);

        join.each(drawBar);

        join.exit().remove();
    }
}
