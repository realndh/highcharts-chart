// data-viewer UI for IMAGELINK

import {assignHeightMinusCellPadding} from './gv-text';
import 'ptcs-image/ptcs-image';

function setMinH(img, minHeight) {
    img.style.minHeight = minHeight + 'px';
}

function setMaxH(img, maxHeight) {
    img.style.maxHeight = maxHeight + 'px';
}

function createImagelink(cell, config) {
    const img = document.createElement('ptcs-image');
    img.setAttribute('part', 'cell-image');

    if (config) {
        img.position = config.position ? config.position : config.valign;
        if (config.size) {
            img.size = config.size;
        }
        assignHeightMinusCellPadding(img, config.minHeightRow, config.maxHeightRow, setMinH, setMaxH);
    }
    return img;
}

function updateImagelink(el, value) {
    el.noPlaceholder = !value; // Don't show placeholder if there is no image
    el.src = value;
}

export function uiImagelink(config) {
    return {create: cell => createImagelink(cell, config), assign: updateImagelink};
}
