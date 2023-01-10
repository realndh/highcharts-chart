export function checkTooltip(lines, notitle = false) {
    const tEl = document.getElementById('ptcs-tooltip-overlay');
    expect(window.getComputedStyle(tEl).visibility).to.not.eql('hidden', 'tooltip should be visible');

    const tElRoot = document.getElementById('ptcs-tooltip-overlay').shadowRoot;

    if (!Array.isArray(lines)) {
        lines = [lines];
    }

    if (!notitle) {
        const title = tElRoot.querySelector('[part=title]');
        expect(title.textContent).to.be.eql(lines[0]);
    }

    const textLines = tElRoot.querySelectorAll('[part=text]');
    for (let i = 0; i < textLines.length; i++) {
        expect(textLines[i].textContent).to.be.eql(lines[notitle ? i : i + 1]);
    }
}

export function getBaseURL(component) {
    return `/base/src/components/${component}`;
}
