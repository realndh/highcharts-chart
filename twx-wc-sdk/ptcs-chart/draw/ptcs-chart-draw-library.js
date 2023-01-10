import {select} from 'd3-selection';
import {curveStepBefore, curveStepAfter, curveStep} from 'd3-shape';

export const markersSet = new Set(['circle', 'square', 'diamond', 'triangle', 'plus', 'cross']);

export const showValuesSet = new Set(['above', 'below', 'on']);

export const steps = new Set([curveStepBefore, curveStepAfter, curveStep]);

export const markerScale = markerSize => {
    switch (markerSize) {
        case 'small':
            return 0.5;
        case undefined:
        case null:
        case '':
        case 'medium':
            return 1;
        case 'large':
            return 1.5;
        case 'xlarge':
            return 2;
        default: {
            const v = +markerSize;
            if (!isNaN(v) && v > 0) {
                return v / 16;
            }
        }
    }
    return 1;
};

export function removeChildren(el, selector) {
    if (typeof selector === 'string') {
        [...el.querySelectorAll(`:scope > ${selector}`)].forEach(e => e.remove());
    } else {
        while (el.firstChild) {
            el.removeChild(el.lastChild);
        }
    }
}

export function drawMarkers({el, flipAxes, marker, markerSize, xPos, yPos, legend, data, selected, cb}) {
    const _marker = `#ptc-${marker}-wb`;

    const markerPosFunc = () => {
        const scale = markerScale(markerSize);

        if (scale === 1) {
            return flipAxes
                ? (d, i) => `translate(${yPos(d, i)}px,${xPos(d, i)}px)`
                : (d, i) => `translate(${xPos(d, i)}px,${yPos(d, i)}px)`;
        }

        return flipAxes
            ? (d, i) => `translate(${yPos(d, i)}px,${xPos(d, i)}px) scale(${scale})`
            : (d, i) => `translate(${xPos(d, i)}px,${yPos(d, i)}px) scale(${scale})`;
    };

    const setPos = markerPosFunc();

    function showMarker(d, i) {
        this.setAttribute('part', 'marker');
        this.setAttribute('legend', typeof legend === 'function' ? legend(d, i) : legend);
        this.setAttribute('href', _marker);

        //this.setAttribute('state-key', `${this._parent._index + 1}`);
        //this.setAttribute('x-index', pointIx)
        //this.setAttribute('selected', selected);
        //this._depfield = depfield

        this.style.transform = setPos(d, i);

        if (cb) {
            cb.call(this, d, i);
        }
    }

    // Root element should only contain basic markers
    removeChildren(el, ':not(use[part=marker])');

    const join = select(el)
        .selectAll('use[part=marker]')
        .data((marker && marker !== 'none') ? data : []);

    join.enter()
        .append('use')
        .attr('selected', selected)
        .each(showMarker);

    join.attr('selected', selected)
        .each(showMarker);

    join.exit().remove();
}


export function updateMarkerSelection({el, marker, data, selected}) {
    select(el)
        .selectAll('use[part=marker]')
        .data((marker && marker !== 'none') ? data : [])
        .attr('selected', selected);
}


function setLabelPosFunc(showValues, marker, markerSize, flipAxes) {
    const hasMarker = markersSet.has(marker);
    const dy = 8 * markerScale(markerSize);
    const f = (x, y) => `translate(${x}px,${y}px)`;

    if (showValues === 'above' && hasMarker) {
        return flipAxes
            ? (x, y, w, h) => f(y - w / 2, x - dy - h)
            : (x, y, w, h) => f(x - w / 2, y - dy - h);
    }

    if (showValues === 'below' && hasMarker) {
        return flipAxes
            ? (x, y, w, _) => f(y - w / 2, x + dy)
            : (x, y, w, _) => f(x - w / 2, y + dy);
    }

    return flipAxes
        ? (x, y, w, h) => f(y - w / 2, x - h / 2)
        : (x, y, w, h) => f(x - w / 2, y - h / 2);
}

export function drawValues({el, data, label, legend, xPos, yPos, showValues, marker, markerSize, flipAxes}) {
    const setPos = setLabelPosFunc(showValues, marker, markerSize, flipAxes);

    function showLabel(d) {
        this.setAttribute('legend', legend);
        this.label = label(d);
        this.style.transform = setPos(xPos(d), yPos(d), this.clientWidth, this.clientHeight);
    }

    removeChildren(el, ':not(ptcs-label[part=value])');

    const join = select(el)
        .selectAll('ptcs-label[part=value]')
        .data(data);

    join.enter()
        .append('ptcs-label')
        .attr('part', 'value')
        .attr('variant', 'label')
        .property('horizontalAlignment', 'center')
        .each(showLabel);

    join.each(showLabel);

    join.exit().remove();
}
