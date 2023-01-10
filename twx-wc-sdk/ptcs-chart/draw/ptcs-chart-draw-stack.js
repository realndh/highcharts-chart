import {PTCS} from 'ptcs-library/library.js';

import {
    stack, stackOrderNone, stackOrderReverse, stackOrderAppearance, stackOrderAscending, stackOrderDescending,
    stackOrderInsideOut, stackOffsetNone, stackOffsetExpand, stackOffsetDiverging, stackOffsetSilhouette,
    stackOffsetWiggle} from 'd3-shape';

const stackOrders = {
    // Returns the given series order
    auto: stackOrderNone,

    // Returns the reverse of the given series order
    reverse: stackOrderReverse,

    // Returns a series order such that the earliest series
    // (according to the maximum value) is at the bottom.
    appearance: stackOrderAppearance,

    // Returns a series order such that the smallest series
    // (according to the sum of values) is at the bottom.
    ascending: stackOrderAscending,

    // Returns a series order such that the largest series
    // (according to the sum of values) is at the bottom.
    descending: stackOrderDescending,

    // Returns a series order such that the earliest series
    // (according to the maximum value) are on the inside and the later
    // series are on the outside. This order is recommended for
    // streamgraphs in conjunction with the wiggle offset.
    insideout: stackOrderInsideOut
};

const stackOffsets = {
    // Applies a zero baseline
    auto: stackOffsetNone,

    // Applies a zero baseline and normalizes the values for each point such that the
    // topline is always one
    expand: stackOffsetExpand,

    // Positive values are stacked above zero, negative values are stacked below zero,
    // and zero values are stacked at zero
    diverging: stackOffsetDiverging,

    // Shifts the baseline down such that the center of the streamgraph is always at zero
    silhouette: stackOffsetSilhouette,

    // Shifts the baseline so as to minimize the weighted wiggle of layers. This offset is
    // recommended for streamgraphs in conjunction with the inside-out order
    wiggle: stackOffsetWiggle
};

function selectData(data, seriesIxs) {
    const isValue = v => v || v === 0;

    // Do data point have an x-value and at least one y-value?
    const isPoint = item => isValue(item[0]) && seriesIxs.some(seriesIx => isValue(item[1][seriesIx]));

    // Only create a new array if some points has to be filtered out
    if (data.every(isPoint)) {
        return {selectedData: data, mapValueIx: i => i, mapValueIxInv: i => i};
    }

    // Create a data array that only contains actual points - and include a translation table to the original index
    const xlateValueIx = []; // Save original value-indexes

    const selectedData = data.reduce((a, v, i) => {
        if (isPoint(v)) {
            a.push(v);
            xlateValueIx.push(i);
        }
        return a;
    }, []);

    return {
        selectedData,
        mapValueIx:    i => PTCS.binSearch(xlateValueIx, i2 => xlateValueIx[i2] - i),
        mapValueIxInv: i => xlateValueIx[i]
    };
}

export class DrawStack {

    constructor(seriesIxs, data, method, order) {
        this._seriesIxs = seriesIxs;
        this._six = seriesIxs; // Series that are actually visible
        const {selectedData, mapValueIx, mapValueIxInv} = selectData(data, seriesIxs);
        this._orgData = selectedData; // data without unassigned points
        this._mapValueIx = mapValueIx; // Map value index to internal index in _orgData
        this._mapValueIxInv = mapValueIxInv;
        this._method = method;
        this._order = order;
        this._hiddenSeriesIxs = [];
        this._restack();
    }

    _restack() {
        // Hidden?
        if (this.hidden) {
            this._data = this._fullData = [];
            return;
        }

        // TODO?: exclude points with no series values?
        const d3stack = stack()
            .keys(this._six)
            .value((d, key) => d[1][key] || 0)
            .offset(stackOffsets[this._method] || stackOffsetNone);

        const d3order = stackOrders[this._order];
        if (d3order) {
            d3stack.order(d3order);
        }

        this._fullData = d3stack(this._orgData);
        this._restackZoom();
    }

    _restackZoom() {
        if (this._xScaleZoom) {
            const xScale = this._xScaleZoom;
            this._data = this._fullData.reduce((a, v) => {
                const s = v.filter(item => xScale(item.data[0]) !== undefined);
                if (s.length) {
                    s.index = v.index;
                    s.key = v.key;
                    a.push(s);
                }
                return a;
            }, []);

        } else {
            this._data = this._fullData;
        }
    }

    get hidden() {
        return this._six.length === 0;
    }

    setSelectedSeries(selectedSeries) {
        const six = this._seriesIxs.filter(i => selectedSeries.indexOf(i) >= 0);

        if (PTCS.sameArray(six, this._six)) {
            return;
        }

        this._six = six;
        this._restack();
    }

    displaysSeries(seriesIx) {
        return this._seriesIxs.indexOf(seriesIx) >= 0;
    }

    eachY(cb) {
        this._fullData.forEach(seq => seq.forEach(item => {
            cb(item[0]);
            cb(item[1]);
        }));
    }

    eachVisible(cb) {
        if (this.hidden) {
            return;
        }
        this._data.forEach(row => {
            const seriesIx = row.key;

            // Find number of zoomed out items - via linear search :-(
            const d0 = row[0].data;
            const i0 = this._fullData.find(r => r.key === seriesIx).findIndex(d => d.data === d0);

            row.forEach((item, i) => cb(item.data[0], item.data[1][seriesIx], this._mapValueIxInv(i0 + i), seriesIx, item[0], item[1], this._index));
        });
    }

    zoom(xScale) {
        this._xScaleZoom = xScale;
        this._restackZoom();
    }

    unZoom() {
        this._xScaleZoom = undefined;
        this._restackZoom();
    }

    // Extract selected stacked items + corresponding seriesIx
    extractSelection(xScale, selection) {
        // Extract selected bars
        const sels = [];
        const data = [];

        selection.forEach(item => {
            const row = !this.hidden && this.displaysSeries(item.serieIx) && this._fullData.find(d => d.key === item.serieIx);
            const bar = row && row[this._mapValueIx(item.valueIx)];
            if (bar && xScale(bar.data[0]) !== undefined) {
                data.push(bar);
                sels.push(item);
            }
        });

        return {data, sels};
    }

    showSelection({el, xScale, yScale, flipAxes, selection, cb}) {
        console.log({t: 'stacked showSelection', selection});
    }
}
