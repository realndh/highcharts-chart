/* eslint-disable no-confusing-arrow */
import {PTCS} from 'ptcs-library/library.js';
import {drawMarkers, updateMarkerSelection, showValuesSet, drawValues, removeChildren} from './ptcs-chart-draw-library';

export class DrawBase {

    constructor(seriesIx, data, allIxs) {
        this._seriesIx = seriesIx;
        this._data = data;
        this._legend = `L${seriesIx + 1}`;

        const hasYValue = item => item[0] !== undefined && Array.isArray(item[1]) && item[1][seriesIx] !== undefined;

        if (data.some(item => !hasYValue(item))) {
            // Series has gaps: not all x-values has a y-value in this series
            this._xix = data.reduce((acc, item, index) => {
                if (hasYValue(item)) {
                    acc.push(index);
                }
                return acc;
            }, []);
        } else {
            // Series has no gaps: all x-values has a y-value in this series
            this._xix = allIxs();
        }

        this._xixOrg = this._xix;
    }

    get hidden() {
        return this._hidden;
    }

    get chartType() {
        return 'scatter'; // Probably not correct. Derived class will give the correct value
    }

    setSelectedSeries(selectedSeries) {
        this._hidden = !(selectedSeries.indexOf(this._seriesIx) >= 0);
    }

    displaysSeries(seriesIx) {
        return this._seriesIx === seriesIx;
    }

    eachY(cb) {
        if (!this._hidden) {
            this._xixOrg.forEach(index => cb(this._data[index][1][this._seriesIx]));
        }
    }

    eachVisible(cb) {
        if (!this._hidden) {
            const data = this._data;
            this._xix.forEach(index => cb(data[index][0], data[index][1][this._seriesIx], index, this._seriesIx));
        }
    }

    zoom(xScale) {
        const data = this._data;
        this._xix = this._xixOrg.filter(index => xScale(data[index][0]) !== undefined);
    }

    unZoom() {
        this._xix = this._xixOrg;
    }

    _coordinates(xScale, yScale) {
        const deltaX = xScale.bandwidth ? xScale.bandwidth() / 2 : 0;
        const _xScale = deltaX ? value => xScale(value) + deltaX : xScale;
        const deltaY = yScale.bandwidth ? yScale.bandwidth() / 2 : 0;
        const _yScale = deltaY ? value => yScale(value) + deltaY : yScale;
        const xPos = i => _xScale(this._data[i][0]);
        const yPos = i => _yScale(this._data[i][1][this._seriesIx]);

        return {xPos, yPos};
    }

    drawMarkers({el, xScale, yScale, flipAxes, selectionMgr}) {
        const {xPos, yPos} = this._coordinates(xScale, yScale);
        const data = this._hidden ? [] : this._xix;
        const serieIx = this._seriesIx;
        const marker = this._marker;
        const markerSize = this._markerSize;
        const legend = this._legend;
        const selected = selectionMgr
            ? valueIx => selectionMgr.isSelected({valueIx, serieIx}) || null
            : false;
        const hasSel = selection => Array.isArray(selection)
            ? selection.some(s => s.serieIx === serieIx)
            : selection && selection.serieIx === serieIx;

        if ((!marker || marker === 'none') && hasSel(selectionMgr && selectionMgr.selection)) {
            // Only selected markers should be displayed
            drawMarkers({el, flipAxes, markerSize, xPos, yPos, legend,
                marker:   'circle',
                data:     selected ? data.filter(selected) : [],
                selected: true});
        } else {
            drawMarkers({el, flipAxes, marker, markerSize, xPos, yPos, legend: this._legend, data, selected});
        }
    }

    updateMarkerSelection(args) {
        if (!this._marker || this._marker === 'none') {
            this.drawMarkers(args); // Might need to add / remove markers - rewrite
        } else {
            const data = this._hidden ? [] : this._xix;
            const serieIx = this._seriesIx;
            const selected = args.selectionMgr
                ? valueIx => args.selectionMgr.isSelected({valueIx, serieIx}) || null
                : false;
            updateMarkerSelection({el: args.el, marker: this._marker, data, selected});
        }
    }

    drawValues({el, xScale, yScale, flipAxes}) {
        if (this._hidden || !showValuesSet.has(this._showValues)) {
            removeChildren(el);
            return;
        }

        //const _dataValues = this.__sampleValues(_data);
        const {xPos, yPos} = this._coordinates(xScale, yScale);
        const data = this._data;
        const seriesIx = this._seriesIx;
        const formatValue = PTCS.formatValue(this._valueFormat);
        const label = i => formatValue(data[i][1][seriesIx]);
        const legend = this._legend;
        const showValues = this._showValues;
        const marker = this._marker;
        const markerSize = this._markerSize;

        drawValues({el, data: this._xix, label, legend, xPos, yPos, showValues, marker, markerSize, flipAxes});
    }

    _extractSelection(selection, xScale) {
        return (this._hidden || !Array.isArray(selection)) ? [] : selection.reduce((a, d) => {
            if (d.serieIx === this._seriesIx && xScale(this._data[d.valueIx][0]) !== undefined) {
                a.push(d.valueIx);
            }
            return a;
        }, []);
    }

    showSelection({el, xScale, yScale, flipAxes, selection, cb}) {
        const {xPos, yPos} = this._coordinates(xScale, yScale);
        const xix = this._extractSelection(selection, xScale);
        const marker = (this._marker && this._marker !== 'none') ? this._marker : 'circle';
        const markerSize = this._markerSize || 'small';
        const serieIx = this._seriesIx;

        function cb2(d, i) {
            cb.call(this, {valueIx: xix[i], serieIx});
        }

        drawMarkers({el, flipAxes, marker, markerSize, xPos, yPos, legend: this._legend, data: xix, cb: cb && cb2});
    }
}
